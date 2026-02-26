import { deviceState } from '$lib/stores/deviceState';
import {
	DRIVE_ASSETS_FOLDER_NAME,
	DRIVE_ASSETS_INDEX_FILE_NAME,
	DRIVE_BACKUP_FOLDER_NAME,
	DRIVE_CONTENT_FILE_NAME,
	DRIVE_MANIFEST_FILE_NAME,
	DRIVE_PROGRESS_FILE_NAME,
	DRIVE_HISTORY_FILE_NAME
} from './constants';
import { driveFilesApi } from './driveFilesApi';
import { driveHttpClient } from './driveHttpClient';
import type { Sha256 } from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';

function toAssetFileName(hash: Sha256): string {
	return `sha256_${hash.slice('sha256:'.length)}`;
}

async function safeExists(fileId: string | undefined): Promise<boolean> {
	if (!fileId) return false;
	try {
		await driveFilesApi.getFileMetadata(fileId, 'id');
		return true;
	} catch {
		return false;
	}
}

/**
 * מזהי הקבצים והתיקיות של מבנה הגיבוי ב-Google Drive.
 * מוחזר מ-{@link dailyScheduleBackupRepo.ensureStructure}.
 */
export type DriveStructureIds = {
	backupFolderId: string;
	assetsFolderId: string;
	manifestFileId: string;
	contentFileId: string;
	progressFileId: string;
	assetsIndexFileId: string;
	historyFileId: string;
};

/** קורא את ה-cache מ-providers['google-drive'] (עם fallback ל-v2Cache הישן) */
function getCache() {
	const ds = deviceState.load();
	return ds.providers['google-drive'] || ds.drive.v2Cache || {};
}

/** שומר שדות cache ב-providers['google-drive'] */
function updateCache(updates: Partial<ReturnType<typeof getCache>>) {
	deviceState.update((draft) => {
		if (!draft.providers['google-drive']) {
			draft.providers['google-drive'] = {};
		}
		Object.assign(draft.providers['google-drive']!, updates);
		// סנכרון ל-v2Cache הישן לתאימות לאחור
		Object.assign(draft.drive.v2Cache, updates);
	});
}

/**
 * Repository לניהול מבנה הגיבוי של DailySchedule ב-Google Drive.
 * אחראי על יצירת/מציאת תיקיות וקבצים, קריאה/כתיבה של JSON ונכסים בינאריים.
 * משתמש ב-cache מקומי ({@link deviceState}) למניעת קריאות API מיותרות.
 */
export const dailyScheduleBackupRepo = {
	/**
	 * מוצאת (או יוצרת) את תיקיית הגיבוי הראשית ב-Drive.
	 * @returns מזהה התיקייה
	 */
	async findBackupFolderId(): Promise<string> {
		const cache = getCache();
		let backupFolderId = cache.backupFolderId;
		if (!(await safeExists(backupFolderId))) {
			backupFolderId = await driveFilesApi.findOrCreateFolder(DRIVE_BACKUP_FOLDER_NAME);
			updateCache({ backupFolderId });
		}
		return backupFolderId!;
	},

	/**
	 * מוודאת שכל מבנה הגיבוי קיים ב-Drive (תיקיות + קבצי JSON).
	 * יוצרת קבצים/תיקיות חסרים ומעדכנת את ה-cache המקומי.
	 * @returns אובייקט עם כל מזהי הקבצים והתיקיות
	 */
	async ensureStructure(): Promise<DriveStructureIds> {
		const cache = getCache();

		let backupFolderId: string | undefined = cache.backupFolderId;
		if (!(await safeExists(backupFolderId))) {
			backupFolderId = await driveFilesApi.findOrCreateFolder(DRIVE_BACKUP_FOLDER_NAME);
		}
		if (!backupFolderId) throw new Error('Failed to resolve backup folder id');

		let assetsFolderId: string | undefined = cache.assetsFolderId;
		if (!(await safeExists(assetsFolderId))) {
			assetsFolderId = await driveFilesApi.findOrCreateFolder(DRIVE_ASSETS_FOLDER_NAME, backupFolderId);
		}
		if (!assetsFolderId) throw new Error('Failed to resolve assets folder id');

		const ensureJsonFile = async (cachedId: string | undefined, name: string): Promise<string> => {
			if (await safeExists(cachedId)) return cachedId!;
			const existing = await driveFilesApi.findFileByNameInFolder(name, backupFolderId!);
			if (existing?.id) return existing.id;
			return await driveFilesApi.createFile({
				name,
				mimeType: 'application/json',
				parents: [backupFolderId!]
			});
		};

		const manifestFileId = await ensureJsonFile(cache.manifestFileId, DRIVE_MANIFEST_FILE_NAME);
		const contentFileId = await ensureJsonFile(cache.contentFileId, DRIVE_CONTENT_FILE_NAME);
		const progressFileId = await ensureJsonFile(cache.progressFileId, DRIVE_PROGRESS_FILE_NAME);
		const assetsIndexFileId = await ensureJsonFile(cache.assetsIndexFileId, DRIVE_ASSETS_INDEX_FILE_NAME);
		const historyFileId = await ensureJsonFile(cache.historyFileId, DRIVE_HISTORY_FILE_NAME);

		const ids: DriveStructureIds = {
			backupFolderId,
			assetsFolderId,
			manifestFileId,
			contentFileId,
			progressFileId,
			assetsIndexFileId,
			historyFileId
		};

		updateCache({
			backupFolderId: ids.backupFolderId,
			assetsFolderId: ids.assetsFolderId,
			manifestFileId: ids.manifestFileId,
			contentFileId: ids.contentFileId,
			progressFileId: ids.progressFileId,
			assetsIndexFileId: ids.assetsIndexFileId,
			historyFileId: ids.historyFileId
		});

		return ids;
	},

	/**
	 * מחפשת את המטא-דאטה של קובץ ה-manifest ב-Drive.
	 * @returns אובייקט קובץ עם appProperties, או null אם לא נמצא
	 */
	async findManifestMeta() {
		const cache = getCache();
		const backupFolderId = await this.findBackupFolderId();

		if (await safeExists(cache.manifestFileId)) {
			return await driveFilesApi.getFileMetadata(
				cache.manifestFileId!,
				'id, name, modifiedTime, appProperties'
			);
		}

		const found = await driveFilesApi.findFileByNameInFolder(DRIVE_MANIFEST_FILE_NAME, backupFolderId);
		if (!found?.id) return null;

		updateCache({ manifestFileId: found.id! });

		return found;
	},

	/**
	 * מחפשת קובץ גיבוי ישן (V1) לצורך מיגרציה.
	 * @returns אובייקט קובץ של הגיבוי הישן, או null אם לא קיים
	 */
	async findLegacyV1BackupMeta() {
		const backupFolderId = await this.findBackupFolderId();
		const found = await driveFilesApi.findFileByNameInFolder('daily_schedule_backup.json', backupFolderId);
		return found?.id ? found : null;
	},

	/**
	 * קוראת קובץ JSON מ-Drive.
	 * @param fileId - מזהה הקובץ
	 * @param onProgress - callback לדיווח אחוז התקדמות
	 * @returns האובייקט שפורסר
	 */
	async readJson(fileId: string, onProgress?: (p: number) => void) {
		return await driveHttpClient.downloadJson(fileId, onProgress);
	},

	/**
	 * כותבת אובייקט כ-JSON לקובץ קיים ב-Drive.
	 * @param fileId - מזהה הקובץ לעדכון
	 * @param data - אובייקט לסריאליזציה ל-JSON
	 * @param options - אפשרויות נוספות
	 * @param options.appProperties - מטא-דאטה אפליקטיבית לעדכון על הקובץ
	 * @param options.onProgress - callback לדיווח אחוז התקדמות
	 */
	async writeJson(
		fileId: string,
		data: any,
		options?: { appProperties?: Record<string, string>; onProgress?: (p: number) => void }
	) {
		const json = JSON.stringify(data);
		await driveHttpClient.uploadJson(fileId, json, options?.onProgress);
		if (options?.appProperties) {
			await driveFilesApi.updateFileMetadata(fileId, { appProperties: options.appProperties });
		}
	},

	/**
	 * קוראת את קובץ היסטוריית הסנכרון מ-Drive.
	 * @param historyFileId - מזהה קובץ ההיסטוריה
	 * @param onProgress - callback לדיווח אחוז התקדמות
	 * @returns אובייקט היסטוריית סנכרון
	 */
	async readHistoryJson(historyFileId: string, onProgress?: (p: number) => void): Promise<SyncHistory> {
		return await this.readJson(historyFileId, onProgress) as SyncHistory;
	},

	/**
	 * כותבת את היסטוריית הסנכרון לקובץ ב-Drive.
	 * @param historyFileId - מזהה קובץ ההיסטוריה
	 * @param history - אובייקט היסטוריית סנכרון לכתיבה
	 * @param onProgress - callback לדיווח אחוז התקדמות
	 */
	async writeHistoryJson(
		historyFileId: string,
		history: SyncHistory,
		onProgress?: (p: number) => void
	): Promise<void> {
		await this.writeJson(historyFileId, history, { onProgress });
	},

	/**
	 * מעלה נכס (תמונה/קובץ) לתיקיית הנכסים ב-Drive.
	 * אם קובץ עם אותו hash כבר קיים — מעדכן אותו במקום ליצור חדש.
	 * @param params - פרמטרי העלאה
	 * @param params.hash - hash SHA-256 של הנכס
	 * @param params.blob - תוכן בינארי
	 * @param params.mimeType - סוג MIME
	 * @param params.assetsFolderId - מזהה תיקיית הנכסים
	 * @returns מזהה הקובץ וגודלו
	 */
	async uploadAsset(params: {
		hash: Sha256;
		blob: Blob;
		mimeType: string;
		assetsFolderId: string;
	}): Promise<{ fileId: string; size: number }> {
		const name = toAssetFileName(params.hash);

		const existing = await driveFilesApi.findFileByNameInFolder(name, params.assetsFolderId);
		let fileId = existing?.id || null;

		if (!fileId) {
			fileId = await driveFilesApi.createFile({
				name,
				mimeType: params.mimeType,
				parents: [params.assetsFolderId]
			});
		}

		await driveHttpClient.uploadBlob(fileId, params.blob, params.mimeType);
		return { fileId, size: params.blob.size };
	},

	/**
	 * מורידה נכס מ-Drive כ-Blob.
	 * @param fileId - מזהה הקובץ
	 * @param onProgress - callback לדיווח אחוז התקדמות
	 * @returns Blob עם תוכן הנכס
	 */
	async downloadAsset(fileId: string, onProgress?: (p: number) => void): Promise<Blob> {
		return await driveHttpClient.downloadBlob(fileId, onProgress);
	}
};
