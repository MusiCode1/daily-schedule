import { googleAuthService } from './googleAuthService';
import { driveFilesApi } from './driveFilesApi';

function requireAuthToken(): string {
	const token = googleAuthService.getAccessToken();
	if (!token) throw new Error('Not authenticated');
	return token;
}

/**
 * לקוח HTTP ישיר ל-Google Drive — העלאות והורדות עם דיווח התקדמות.
 * משתמש ב-XMLHttpRequest במקום gapi.client כדי לתמוך ב-progress events.
 */
export const driveHttpClient = {
	/**
	 * מעלה מחרוזת JSON לקובץ קיים ב-Drive.
	 * @param fileId - מזהה הקובץ לעדכון
	 * @param json - מחרוזת JSON להעלאה
	 * @param onProgress - callback לדיווח אחוז התקדמות (0-100)
	 * @returns Promise שמסתיים בסיום ההעלאה
	 * @throws {Error} אם המשתמש לא מאומת או ההעלאה נכשלה
	 */
	uploadJson(fileId: string, json: string, onProgress?: (p: number) => void): Promise<void> {
		const token = requireAuthToken();
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('PATCH', `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`);
			xhr.setRequestHeader('Authorization', `Bearer ${token}`);
			xhr.setRequestHeader('Content-Type', 'application/json');

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable && onProgress) {
					const percent = Math.round((e.loaded / e.total) * 100);
					onProgress(percent);
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) resolve();
				else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
			};
			xhr.onerror = () => reject(new Error('Network error during upload'));
			xhr.send(json);
		});
	},

	/**
	 * מעלה Blob לקובץ קיים ב-Drive.
	 * @param fileId - מזהה הקובץ לעדכון
	 * @param blob - תוכן בינארי להעלאה
	 * @param mimeType - סוג MIME של התוכן
	 * @param onProgress - callback לדיווח אחוז התקדמות (0-100)
	 * @returns Promise שמסתיים בסיום ההעלאה
	 * @throws {Error} אם המשתמש לא מאומת או ההעלאה נכשלה
	 */
	uploadBlob(
		fileId: string,
		blob: Blob,
		mimeType: string,
		onProgress?: (p: number) => void
	): Promise<void> {
		const token = requireAuthToken();
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('PATCH', `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`);
			xhr.setRequestHeader('Authorization', `Bearer ${token}`);
			xhr.setRequestHeader('Content-Type', mimeType);

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable && onProgress) {
					const percent = Math.round((e.loaded / e.total) * 100);
					onProgress(percent);
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) resolve();
				else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
			};
			xhr.onerror = () => reject(new Error('Network error during upload'));
			xhr.send(blob);
		});
	},

	/**
	 * מורידה קובץ JSON מ-Drive ומפרסרת אותו.
	 * @param fileId - מזהה הקובץ להורדה
	 * @param onProgress - callback לדיווח אחוז התקדמות (0-100)
	 * @returns האובייקט שפורסר מה-JSON
	 * @throws {Error} אם ההורדה נכשלה או ה-JSON לא תקין
	 */
	async downloadJson(fileId: string, onProgress?: (p: number) => void): Promise<any> {
		const token = requireAuthToken();

		let fileSize = 0;
		try {
			const meta = await driveFilesApi.getFileMetadata(fileId, 'size');
			if (meta.size) fileSize = Number(meta.size);
		} catch {
			/* ignore */
		}

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
			xhr.setRequestHeader('Authorization', `Bearer ${token}`);
			xhr.responseType = 'text';

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
					} catch {
						reject(new Error('Failed to parse downloaded JSON'));
					}
				} else {
					reject(new Error(`Download failed: ${xhr.status} ${xhr.statusText}`));
				}
			};

			xhr.onerror = () => reject(new Error('Network error during download'));
			xhr.send();
		});
	},

	/**
	 * מורידה קובץ מ-Drive כ-Blob בינארי.
	 * @param fileId - מזהה הקובץ להורדה
	 * @param onProgress - callback לדיווח אחוז התקדמות (0-100)
	 * @returns Blob עם תוכן הקובץ
	 * @throws {Error} אם ההורדה נכשלה
	 */
	async downloadBlob(fileId: string, onProgress?: (p: number) => void): Promise<Blob> {
		const token = requireAuthToken();

		let fileSize = 0;
		try {
			const meta = await driveFilesApi.getFileMetadata(fileId, 'size');
			if (meta.size) fileSize = Number(meta.size);
		} catch {
			/* ignore */
		}

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
			xhr.setRequestHeader('Authorization', `Bearer ${token}`);
			xhr.responseType = 'blob';

			xhr.onprogress = (e) => {
				const total = e.lengthComputable ? e.total : fileSize;
				if (total > 0 && onProgress) {
					const percent = Math.round((e.loaded / total) * 100);
					onProgress(percent);
				}
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(xhr.response);
				} else {
					reject(new Error(`Download failed: ${xhr.status} ${xhr.statusText}`));
				}
			};

			xhr.onerror = () => reject(new Error('Network error during download'));
			xhr.send();
		});
	}
};
