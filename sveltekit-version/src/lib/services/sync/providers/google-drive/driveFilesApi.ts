/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />

import { googleAuthService } from './googleAuthService';

/** טיפוס קובץ של Google Drive API — עוטף את gapi.client.drive.File */
export type GFile = gapi.client.drive.File;

const TAG = '[DriveFilesApi]';

function requireAuth() {
	if (!googleAuthService.getAccessToken()) {
		console.error(`${TAG} Not authenticated`);
		throw new Error('Not authenticated');
	}
}

/**
 * שכבת API נמוכה לגישה ל-Google Drive Files.
 * עוטפת את gapi.client.drive.files עם ניהול אימות וטיפול בשגיאות.
 */
export const driveFilesApi = {
	/**
	 * מחזירה רשימת קבצים מ-Drive לפי שאילתה.
	 * @param params - פרמטרי חיפוש
	 * @param params.q - שאילתת חיפוש בתחביר Google Drive query
	 * @param params.fields - שדות לכלול בתשובה (תחביר fields של Drive API)
	 * @param params.spaces - מרחב חיפוש (ברירת מחדל: 'drive')
	 * @returns רשימת קבצים תואמים
	 * @throws {Error} אם המשתמש לא מאומת
	 */
	async listFiles(params: { q: string; fields: string; spaces?: string }): Promise<GFile[]> {
		console.log(`${TAG} listFiles`, params);
		requireAuth();
		try {
			const res = await window.gapi.client.drive.files.list({
				q: params.q,
				fields: params.fields,
				spaces: params.spaces || 'drive'
			});
			console.log(`${TAG} listFiles result:`, res.result.files?.length || 0, 'files');
			return res.result.files || [];
		} catch (e) {
			console.error(`${TAG} listFiles failed`, e);
			throw e;
		}
	},

	/**
	 * מוצאת תיקייה קיימת לפי שם, או יוצרת חדשה אם לא נמצאה.
	 * @param folderName - שם התיקייה לחיפוש/יצירה
	 * @param parentId - מזהה תיקיית-אב (אופציונלי)
	 * @returns מזהה התיקייה שנמצאה או נוצרה
	 * @throws {Error} אם המשתמש לא מאומת או היצירה נכשלה
	 */
	async findOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
		console.log(`${TAG} findOrCreateFolder`, { folderName, parentId });
		requireAuth();

		let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
		if (parentId) {
			q += ` and '${parentId}' in parents`;
		}

		try {
			const files = await this.listFiles({ q, fields: 'files(id)' });
			if (files.length > 0 && files[0].id) {
				console.log(`${TAG} Found existing folder`, files[0].id);
				return files[0].id;
			}

			console.log(`${TAG} Creating new folder...`);
			const metadata: any = {
				name: folderName,
				mimeType: 'application/vnd.google-apps.folder'
			};
			if (parentId) metadata.parents = [parentId];

			const createRes = await window.gapi.client.drive.files.create({
				resource: metadata,
				fields: 'id'
			});

			if (!createRes.result.id) throw new Error('Failed to create folder');
			console.log(`${TAG} Created folder`, createRes.result.id);
			return createRes.result.id;
		} catch (e) {
			console.error(`${TAG} findOrCreateFolder failed`, e);
			throw e;
		}
	},

	/**
	 * מחפשת קובץ לפי שם בתוך תיקייה נתונה.
	 * @param fileName - שם הקובץ לחיפוש
	 * @param folderId - מזהה התיקייה שבה לחפש
	 * @returns הקובץ שנמצא, או null אם לא נמצא
	 * @throws {Error} אם המשתמש לא מאומת
	 */
	async findFileByNameInFolder(fileName: string, folderId: string): Promise<GFile | null> {
		console.log(`${TAG} findFileByNameInFolder`, { fileName, folderId });
		requireAuth();
		try {
			const q = `name = '${fileName}' and trashed = false and '${folderId}' in parents`;
			const files = await this.listFiles({
				q,
				fields: 'files(id, name, createdTime, modifiedTime, appProperties, mimeType, size)'
			});
			const result = files.length > 0 ? files[0] : null;
			console.log(`${TAG} findFileByNameInFolder result`, result ? result.id : 'null');
			return result;
		} catch (e) {
			console.error(`${TAG} findFileByNameInFolder failed`, e);
			throw e;
		}
	},

	/**
	 * יוצרת קובץ חדש (ריק) ב-Drive.
	 * @param params - פרמטרי יצירה
	 * @param params.name - שם הקובץ
	 * @param params.mimeType - סוג MIME
	 * @param params.parents - מזהי תיקיות-אב (אופציונלי)
	 * @param params.appProperties - מטא-דאטה אפליקטיבית (אופציונלי)
	 * @returns מזהה הקובץ שנוצר
	 * @throws {Error} אם המשתמש לא מאומת או היצירה נכשלה
	 */
	async createFile(params: {
		name: string;
		mimeType: string;
		parents?: string[];
		appProperties?: Record<string, string>;
	}): Promise<string> {
		console.log(`${TAG} createFile`, { name: params.name, mimeType: params.mimeType });
		requireAuth();
		try {
			const resource: any = {
				name: params.name,
				mimeType: params.mimeType
			};
			if (params.parents) resource.parents = params.parents;
			if (params.appProperties) resource.appProperties = params.appProperties;

			const createRes = await window.gapi.client.drive.files.create({
				resource,
				fields: 'id'
			});
			if (!createRes.result.id) throw new Error('Failed to create file');
			console.log(`${TAG} Created file`, createRes.result.id);
			return createRes.result.id;
		} catch (e) {
			console.error(`${TAG} createFile failed`, e);
			throw e;
		}
	},

	/**
	 * מעדכנת מטא-דאטה של קובץ קיים (appProperties וכו').
	 * @param fileId - מזהה הקובץ
	 * @param metadata - אובייקט מטא-דאטה לעדכון
	 * @throws {Error} אם המשתמש לא מאומת
	 */
	async updateFileMetadata(fileId: string, metadata: { appProperties?: Record<string, string> }) {
		console.log(`${TAG} updateFileMetadata`, {
			fileId,
			keys: Object.keys(metadata.appProperties || {})
		});
		requireAuth();
		try {
			await window.gapi.client.drive.files.update({
				fileId,
				resource: metadata
			});
			console.log(`${TAG} updateFileMetadata success`);
		} catch (e) {
			console.error(`${TAG} updateFileMetadata failed`, e);
			throw e;
		}
	},

	/**
	 * קוראת מטא-דאטה של קובץ לפי מזהה.
	 * @param fileId - מזהה הקובץ
	 * @param fields - שדות לכלול בתשובה (תחביר fields של Drive API)
	 * @returns אובייקט קובץ עם השדות המבוקשים
	 * @throws {Error} אם המשתמש לא מאומת
	 */
	async getFileMetadata(fileId: string, fields: string): Promise<GFile> {
		console.log(`${TAG} getFileMetadata`, { fileId, fields });
		requireAuth();
		try {
			const res = await window.gapi.client.drive.files.get({
				fileId,
				fields
			});
			console.log(`${TAG} getFileMetadata success`);
			return res.result;
		} catch (e) {
			console.error(`${TAG} getFileMetadata failed`, e);
			throw e;
		}
	}
};
