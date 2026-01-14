/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />
/// <reference types="gapi.auth2" />

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, BACKUP_FILE_NAME, BACKUP_FOLDER_NAME } from '../config';

// שימוש בטיפוסים הרשמיים
type GFile = gapi.client.drive.File;

declare global {
	interface Window {
		// gapi & google are added by the scripts
		gapi: typeof gapi;
		google: any;
	}
}

export type DriveStatus =
	| 'uninitialized'
	| 'loading'
	| 'authenticated'
	| 'unauthenticated'
	| 'error';

class GoogleDriveService {
	private tokenClient: any;
	private accessToken: string | null = null;
	private gapiInited = false;
	private gisInited = false;

	// מאזינים לשינויי סטטוס (Observer pattern פשוט)
	private statusListeners: ((status: DriveStatus) => void)[] = [];
	private _status: DriveStatus = 'uninitialized';

	get status() {
		return this._status;
	}

	set status(newStatus: DriveStatus) {
		this._status = newStatus;
		this.notifyListeners();
	}

	subscribe(listener: (status: DriveStatus) => void) {
		this.statusListeners.push(listener);
		listener(this.status);
		return () => {
			this.statusListeners = this.statusListeners.filter((l) => l !== listener);
		};
	}

	private notifyListeners() {
		this.statusListeners.forEach((l) => l(this.status));
	}

	// טעינת הסקריפטים של גוגל
	async initialize(clientIdOverride?: string): Promise<void> {
		if ((this.status as string) === 'authenticated') return;

		this.status = 'loading';
		const clientId = clientIdOverride || GOOGLE_CLIENT_ID;

		if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
			console.warn('Google Client ID is missing');
			this.status = 'error';
			return;
		}

		try {
			await Promise.all([this.loadGapi(), this.loadGis()]);

			// אתחול הלקוח של זהויות (GIS)
			this.tokenClient = window.google.accounts.oauth2.initTokenClient({
				client_id: clientId,
				scope: GOOGLE_SCOPES,
				callback: (tokenResponse: any) => {
					if (tokenResponse && tokenResponse.access_token) {
						this.setSession(tokenResponse);
					} else {
						this.status = 'unauthenticated';
					}
				}
			});

			// נסיון שחזור סשן
			this.restoreSession();

			if ((this.status as string) !== 'authenticated') {
				this.status = 'unauthenticated';
			}
		} catch (error) {
			console.error('Failed to initialize Google Drive:', error);
			this.status = 'error';
		}
	}

	private setSession(tokenResponse: any) {
		this.accessToken = tokenResponse.access_token;
		const expiresIn = tokenResponse.expires_in || 3599;
		const expiryTime = Date.now() + expiresIn * 1000;

		if (this.accessToken) {
			localStorage.setItem('gdrive_token', this.accessToken);
			localStorage.setItem('gdrive_expiry', expiryTime.toString());
		}

		// חשוב: הגדרת הטוקן עבור gapi.client כדי שקריאות ל-API יכללו את ההרשאה
		// חשוב: הגדרת הטוקן עבור gapi.client כדי שקריאות ל-API יכללו את ההרשאה
		if (window.gapi && window.gapi.client && this.accessToken) {
			window.gapi.client.setToken({ access_token: this.accessToken });
		}

		this.status = 'authenticated';
	}

	private restoreSession() {
		const token = localStorage.getItem('gdrive_token');
		const expiry = localStorage.getItem('gdrive_expiry');

		if (token && expiry) {
			if (Date.now() < parseInt(expiry)) {
				this.accessToken = token;

				// שחזור הטוקן ל-gapi
				if (window.gapi && window.gapi.client) {
					window.gapi.client.setToken({ access_token: this.accessToken });
				}

				this.status = 'authenticated';
			} else {
				this.clearSession();
			}
		}
	}

	private clearSession() {
		this.accessToken = null;
		localStorage.removeItem('gdrive_token');
		localStorage.removeItem('gdrive_expiry');

		if (window.gapi && window.gapi.client) {
			window.gapi.client.setToken(null);
		}

		this.status = 'unauthenticated';
	}

	private loadGapi(): Promise<void> {
		return new Promise((resolve) => {
			if (window.gapi) {
				this.gapiInited = true;
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://apis.google.com/js/api.js';
			script.onload = () => {
				window.gapi.load('client', async () => {
					await window.gapi.client.init({
						// apiKey: API_KEY, // לא חובה ל-Drive API בפעולות משתמש
						discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
					});
					this.gapiInited = true;
					resolve();
				});
			};
			document.body.appendChild(script);
		});
	}

	private loadGis(): Promise<void> {
		return new Promise((resolve) => {
			if (window.google) {
				this.gisInited = true;
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://accounts.google.com/gsi/client';
			script.onload = () => {
				this.gisInited = true;
				resolve();
			};
			document.body.appendChild(script);
		});
	}

	// כניסה והרשאה
	signIn() {
		if (!this.tokenClient) return;

		// אם כבר יש טוקן בתוקף, נשתמש בו (בדיקה פשוטה, ה-GIS יטפל בזה)
		// נבקש גישה
		this.tokenClient.requestAccessToken({ prompt: 'consent' });
	}

	signOut() {
		if (this.accessToken) {
			window.google.accounts.oauth2.revoke(this.accessToken, () => {
				this.clearSession();
			});
		} else {
			this.clearSession(); // נקה בכל מקרה
		}
	}

	// --- פעולות קבצים ---

	// --- פעולות קבצים ---

	// מציאת או יצירת תיקייה
	async findOrCreateFolder(folderName: string): Promise<string> {
		if (!this.accessToken) throw new Error('Not authenticated');

		// חיפוש תיקייה קיימת
		const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
		const response = await window.gapi.client.drive.files.list({
			q: q,
			fields: 'files(id)',
			spaces: 'drive'
		});

		if (response.result.files && response.result.files.length > 0 && response.result.files[0].id) {
			return response.result.files[0].id;
		}

		// יצירת תיקייה חדשה
		const metadata = {
			name: folderName,
			mimeType: 'application/vnd.google-apps.folder'
		};

		const createRes = await window.gapi.client.drive.files.create({
			resource: metadata,
			fields: 'id'
		});

		if (!createRes.result.id) throw new Error('Failed to create folder');
		return createRes.result.id;
	}

	// בדיקה אם קיים קובץ גיבוי בתיקייה הייעודית
	async listBackups(folderId?: string): Promise<gapi.client.drive.File[]> {
		if (!this.accessToken) throw new Error('Not authenticated');

		let q = `name = '${BACKUP_FILE_NAME}' and trashed = false`;
		if (folderId) {
			q += ` and '${folderId}' in parents`;
		}

		try {
			const response = await window.gapi.client.drive.files.list({
				q: q,
				fields: 'files(id, name, createdTime, modifiedTime)',
				spaces: 'drive'
			});
			return response.result.files || [];
		} catch (e) {
			console.error('Error listing files', e);
			throw e;
		}
	}

	// יצירה או עדכון של גיבוי
	async backup(data: string, folderName = 'DailyScheduleBackup'): Promise<void> {
		if (!this.accessToken) throw new Error('Not authenticated');

		// קבלת מזהה התיקייה
		const folderId = await this.findOrCreateFolder(folderName);

		const files = await this.listBackups(folderId);
		// אנו מעבירים את המחרוזת ישירות, אין צורך ב-Blob בפונקציות החדשות

		const metadata: any = {
			name: BACKUP_FILE_NAME,
			mimeType: 'application/json'
		};

		if (files.length > 0) {
			// עדכון קובץ קיים (לוקחים את הראשון)
			const fileId = files[0].id;
			if (fileId) {
				await this.updateFile(fileId, data);
			}
		} else {
			// יצירת קובץ חדש בתיקייה
			metadata.parents = [folderId];
			await this.createFile(metadata, data);
		}
	}

	// פעולה 1: יצירת הקובץ (Metadata בלבד) ע"י שימוש ב-SDK הרשמי
	private async createFile(metadata: any, data: string): Promise<void> {
		// שלב 1: יצירת הקובץ עם המידע המתאר (Metadata)
		const createRes = await window.gapi.client.drive.files.create({
			resource: metadata,
			fields: 'id'
		});

		const fileId = createRes.result.id;
		if (!fileId) throw new Error('Failed to create file ID');

		// שלב 2: העלאת התוכן
		await this.updateFile(fileId, data);
	}

	// פעולה 2: עדכון תוכן הקובץ
	private async updateFile(fileId: string, data: string): Promise<void> {
		// שימוש ב-gapi.client.request כדי לבצע uploadType=media (שהוא הדרך היעילה להעלאת תוכן)
		// הספרייה הרשמית gapi.client.drive.files.update מתמקדת לרוב ב-Metadata,
		// ולכן שימוש ב-request הישיר הוא הדרך ה"רשמית" להעלאת מדיה בדפדפן.

		await window.gapi.client.request({
			path: `/upload/drive/v3/files/${fileId}`,
			method: 'PATCH',
			params: {
				uploadType: 'media'
			},
			headers: {
				'Content-Type': 'application/json'
			},
			body: data
		});
	}

	// שחזור (הורדת תוכן)
	async restore(fileId: string): Promise<any> {
		if (!this.accessToken) throw new Error('Not authenticated');

		const response = await window.gapi.client.drive.files.get({
			fileId: fileId,
			alt: 'media'
		});

		return response.result;
	}

	async getUserInfo() {
		if (!this.accessToken) return null;
		// נסיון שליפת פרטי משתמש בסיסיים דרך about
		try {
			const res = await window.gapi.client.drive.about.get({
				fields: 'user(displayName, emailAddress, photoLink)'
			});
			return res.result.user;
		} catch (e) {
			console.warn('Could not get user info', e);
			return null;
		}
	}
}

export const googleDriveService = new GoogleDriveService();
