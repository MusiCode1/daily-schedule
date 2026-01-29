/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />
/// <reference types="gapi.auth2" />

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, BACKUP_FILE_NAME, BACKUP_FOLDER_NAME } from '../config';
import { migrationService, type GoogleAuthStorage } from './migration';

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
	private refreshTimer: any = null; // Timer for auto-refresh

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
				},
				error_callback: (error: any) => {
					console.error('Google Auth Error:', error);
					// במקום לנתק מיד, מפעילים Smart Retry
					this.handleRefreshFailure();
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
		this.isTokenExpired = false; // איפוס דגל תפוגה
		const expiresIn = tokenResponse.expires_in || 3599;
		const expiryTime = Date.now() + expiresIn * 1000;

		// בניית אובייקט האחסון החדש
		const storageData: GoogleAuthStorage = {
			accessToken: this.accessToken!,
			expiresAt: expiryTime,
			issuedAt: Date.now()
			// User info will be prioritized from existing storage or fetched separately if needed
			// For now, we store what we have. If we have a user object in memory, we could persist it.
		};

		// נסיון לשמר מידע משתמש קיים אם יש
		const existing = localStorage.getItem('google_auth_storage');
		if (existing) {
			try {
				const oldData = JSON.parse(existing) as GoogleAuthStorage;
				if (oldData.user) {
					storageData.user = oldData.user;
				}
			} catch (e) {
				/* ignore */
			}
		}

		if (this.accessToken) {
			localStorage.setItem('google_auth_storage', JSON.stringify(storageData));
			// localStorage.setItem('gdrive_token', this.accessToken); // Deprecated
			// localStorage.setItem('gdrive_expiry', expiryTime.toString()); // Deprecated
		}

		if (window.gapi && window.gapi.client && this.accessToken) {
			window.gapi.client.setToken({ access_token: this.accessToken });
		}

		// בקשת פרטי משתמש (כולל permissionId) אם חסרים
		if (!storageData.user) {
			this.getUserInfo().then((user) => {
				if (user && this.accessToken) {
					// לוודא שלא התנתקנו בינתיים
					// עדכון האחסון עם פרטי המשתמש
					const currentStore = localStorage.getItem('google_auth_storage');
					if (currentStore) {
						const data = JSON.parse(currentStore) as GoogleAuthStorage;
						data.user = {
							id: user.permissionId || '',
							displayName: user.displayName || '',
							email: user.emailAddress || '',
							photoLink: user.photoLink || ''
						};
						localStorage.setItem('google_auth_storage', JSON.stringify(data));
					}
				}
			});
		}

		this.scheduleTokenRefresh(expiresIn);
		this.status = 'authenticated';
	}

	private restoreSession() {
		// ניסיון קריאה מהפורמט החדש
		const storageJson = localStorage.getItem('google_auth_storage');

		// ניסיון קריאה מהפורמט הישן (לצורך מיגרציה)
		const legacyToken = localStorage.getItem('gdrive_token');
		const legacyExpiry = localStorage.getItem('gdrive_expiry');

		let storage: GoogleAuthStorage | null = null;

		if (storageJson) {
			try {
				storage = JSON.parse(storageJson);
			} catch (e) {
				console.error('Failed to parse auth storage', e);
			}
		} else if (legacyToken) {
			// ביצוע מיגרציה
			storage = migrationService.migrateAuthStorage(legacyToken, legacyExpiry);
			if (storage) {
				console.log('Migration successful, saving new storage format.');
				localStorage.setItem('google_auth_storage', JSON.stringify(storage));
				// ניקוי מפתחות ישנים
				localStorage.removeItem('gdrive_token');
				localStorage.removeItem('gdrive_expiry');
			}
		}

		if (storage && storage.accessToken) {
			if (Date.now() < storage.expiresAt) {
				this.accessToken = storage.accessToken;

				// שחזור הטוקן ל-gapi
				if (window.gapi && window.gapi.client) {
					window.gapi.client.setToken({ access_token: this.accessToken });
				}

				// חישוב זמן שנותר לחידוש
				const remainingSeconds = (storage.expiresAt - Date.now()) / 1000;
				this.scheduleTokenRefresh(remainingSeconds);

				this.status = 'authenticated';
			} else {
				console.log('Token expired in storage, attempting silent refresh...');
				// לא מנקים מיד! מנסים לחדש
				this.refreshTokenSilently();
			}
		}
	}

	private isTokenExpired = false;

	private scheduleTokenRefresh(expiresInSeconds: number) {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		// חידוש 5 דקות לפני הזמן (או מיד אם נשאר פחות מ-5 דקות)
		const refreshTime = (expiresInSeconds - 300) * 1000;

		if (refreshTime <= 0) {
			console.log('Token expiring soon, refreshing now...');
			this.refreshTokenSilently();
		} else {
			console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000)} seconds.`);
			this.refreshTimer = setTimeout(() => {
				this.refreshTokenSilently();
			}, refreshTime);
		}
	}

	private refreshTokenSilently() {
		if (!this.tokenClient) return;

		console.log('Attempting silent token refresh...');
		// prompt: '' מנסה לחדש ללא אינטראקציה
		try {
			this.tokenClient.requestAccessToken({ prompt: '' });
		} catch (e) {
			console.error('Silent refresh failed synchronously:', e);
			this.handleRefreshFailure();
		}
	}

	private handleRefreshFailure() {
		console.warn('Silent refresh failed (likely blocked). Setting up Smart Retry.');
		this.isTokenExpired = true;
		this.setupSmartRetry();
	}

	private setupSmartRetry() {
		const retryHandler = () => {
			console.log('User interaction detected! Retrying token refresh...');
			// הסרת המאזינים כדי שזה יקרה רק פעם אחת
			document.removeEventListener('click', retryHandler);
			document.removeEventListener('keydown', retryHandler);
			document.removeEventListener('touchstart', retryHandler);

			// ניסיון חוזר - הפעם זה נחשב User Gesture
			this.refreshTokenSilently();
		};

		// האזנה לאירועים גלובליים
		document.addEventListener('click', retryHandler);
		document.addEventListener('keydown', retryHandler);
		document.addEventListener('touchstart', retryHandler);
	}

	private clearSession() {
		this.accessToken = null;
		this.isTokenExpired = false;
		if (this.refreshTimer) clearTimeout(this.refreshTimer);

		localStorage.removeItem('google_auth_storage');
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
				fields: 'files(id, name, createdTime, modifiedTime, appProperties)',
				spaces: 'drive'
			});
			return response.result.files || [];
		} catch (e) {
			console.error('Error listing files', e);
			throw e;
		}
	}

	// יצירה או עדכון של גיבוי
	async backup(
		data: string,
		folderName = 'DailyScheduleBackup',
		onProgress?: (p: number) => void
	): Promise<void> {
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
				await this.updateFile(fileId, data, onProgress);
				const meta = JSON.parse(data).syncMetadata;
				await this.updateFileMetadata(fileId, { appProperties: this.sanitizeAppProperties(meta) });
			}
		} else {
			// יצירת קובץ חדש בתיקייה
			metadata.parents = [folderId];
			const meta = JSON.parse(data).syncMetadata;
			metadata.appProperties = this.sanitizeAppProperties(meta); // Initialize appProperties on creation
			await this.createFile(metadata, data, onProgress);
		}
	}

	// פעולה 1: יצירת הקובץ (Metadata בלבד) ע"י שימוש ב-SDK הרשמי
	private async createFile(
		metadata: any,
		data: string,
		onProgress?: (p: number) => void
	): Promise<void> {
		// שלב 1: יצירת הקובץ עם המידע המתאר (Metadata)
		const createRes = await window.gapi.client.drive.files.create({
			resource: metadata,
			fields: 'id'
		});

		const fileId = createRes.result.id;
		if (!fileId) throw new Error('Failed to create file ID');

		// שלב 2: העלאת התוכן
		await this.updateFile(fileId, data, onProgress);
	}

	// פעולה 2: עדכון תוכן הקובץ (XHR for Progress)
	private updateFile(
		fileId: string,
		data: string,
		onProgress?: (p: number) => void
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open(
				'PATCH',
				`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
			);
			xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
			xhr.setRequestHeader('Content-Type', 'application/json');

			// Progress Event
			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable && onProgress) {
					const percent = Math.round((e.loaded / e.total) * 100);
					onProgress(percent);
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve();
				} else {
					reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
				}
			};

			xhr.onerror = () => reject(new Error('Network error during upload'));
			xhr.send(data);
		});
	}

	// שחזור (הורדת תוכן) - XHR for Progress
	async restore(fileId: string, onProgress?: (p: number) => void): Promise<any> {
		if (!this.accessToken) throw new Error('Not authenticated');

		// שליפת גודל הקובץ תחילה כדי לאפשר חישוב אחוזים
		let fileSize = 0;
		try {
			const meta = await window.gapi.client.drive.files.get({
				fileId: fileId,
				fields: 'size'
			});
			if (meta.result.size) {
				fileSize = Number(meta.result.size);
			}
		} catch (e) {
			console.warn('Failed to get file size for progress', e);
		}

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
			xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

			// Progress Event
			xhr.onprogress = (e) => {
				const total = e.lengthComputable ? e.total : fileSize;
				if (total > 0 && onProgress) {
					const percent = Math.round((e.loaded / total) * 100);
					onProgress(percent);
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						resolve(JSON.parse(xhr.responseText));
					} catch (e) {
						reject(new Error('Failed to parse downloaded JSON'));
					}
				} else {
					reject(new Error(`Download failed: ${xhr.status} ${xhr.statusText}`));
				}
			};

			xhr.onerror = () => reject(new Error('Network error during download'));
			xhr.send();
		});
	}

	async getUserInfo() {
		if (!this.accessToken) return null;
		// נסיון שליפת פרטי משתמש בסיסיים דרך about
		try {
			const res = await window.gapi.client.drive.about.get({
				fields: 'user(displayName, emailAddress, photoLink, permissionId)'
			});
			return res.result.user;
		} catch (e) {
			console.warn('Could not get user info', e);
			return null;
		}
	}

	// עדכון מטאדטה (כולל appProperties)
	public async updateFileMetadata(fileId: string, metadata: any): Promise<void> {
		if (metadata.appProperties) {
			metadata.appProperties = this.sanitizeAppProperties(metadata.appProperties);
		}
		await window.gapi.client.drive.files.update({
			fileId: fileId,
			resource: metadata
		});
	}

	// שליפת מטאדטה בלבד (עבור בדיקת קונפליקטים)
	async getFileMetadata(fileId: string): Promise<gapi.client.drive.File> {
		if (!this.accessToken) throw new Error('Not authenticated');

		const response = await window.gapi.client.drive.files.get({
			fileId: fileId,
			fields: 'id, name, modifiedTime, appProperties'
		});

		return response.result;
	}

	// המרת כל הערכים ב-appProperties למחרוזות (חובה לפי ה-API)
	private sanitizeAppProperties(props: any): any {
		if (!props) return null;
		const sanitized: any = {};
		for (const key in props) {
			if (props[key] !== undefined && props[key] !== null) {
				sanitized[key] = String(props[key]);
			}
		}
		return sanitized;
	}
}

export const googleDriveService = new GoogleDriveService();
