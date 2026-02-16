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
import type { Sha256 } from './types';
import type { SyncHistory } from '$lib/services/sync/types';

function toAssetFileName(hash: Sha256): string {
	// sha256:<hex> -> sha256_<hex>
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

export type DriveStructureIds = {
	backupFolderId: string;
	assetsFolderId: string;
	manifestFileId: string;
	contentFileId: string;
	progressFileId: string;
	assetsIndexFileId: string;
	historyFileId: string;
};

export const dailyScheduleBackupRepo = {
	async findBackupFolderId(): Promise<string> {
		// השם הוא מקור האמת. זה גם “חיפוש לפי שם” וגם create אם חסר.
		// אנחנו עושים create כאן כדי לא להיתקע על מצבים שבהם המשתמש רוצה להתחיל גיבוי חדש.
		const cache = deviceState.load().drive.v2Cache || {};
		let backupFolderId = cache.backupFolderId;
		if (!(await safeExists(backupFolderId))) {
			backupFolderId = await driveFilesApi.findOrCreateFolder(DRIVE_BACKUP_FOLDER_NAME);
			deviceState.update((draft) => {
				draft.drive.v2Cache.backupFolderId = backupFolderId;
			});
		}
		return backupFolderId!;
	},

	async ensureStructure(): Promise<DriveStructureIds> {
		const cache = deviceState.load().drive.v2Cache || {};

		// 1) תיקיית גיבוי
		let backupFolderId: string | undefined = cache.backupFolderId;
		if (!(await safeExists(backupFolderId))) {
			backupFolderId = await driveFilesApi.findOrCreateFolder(DRIVE_BACKUP_FOLDER_NAME);
		}
		if (!backupFolderId) throw new Error('Failed to resolve backup folder id');

		// 2) תיקיית assets בתוך תיקיית הגיבוי
		let assetsFolderId: string | undefined = cache.assetsFolderId;
		if (!(await safeExists(assetsFolderId))) {
			assetsFolderId = await driveFilesApi.findOrCreateFolder(DRIVE_ASSETS_FOLDER_NAME, backupFolderId);
		}
		if (!assetsFolderId) throw new Error('Failed to resolve assets folder id');

		// 3) קבצי JSON
		const ensureJsonFile = async (cachedId: string | undefined, name: string): Promise<string> => {
			if (await safeExists(cachedId)) return cachedId!;
			const existing = await driveFilesApi.findFileByNameInFolder(name, backupFolderId);
			if (existing?.id) return existing.id;
			return await driveFilesApi.createFile({
				name,
				mimeType: 'application/json',
				parents: [backupFolderId]
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

		deviceState.update((draft) => {
			draft.drive.v2Cache.backupFolderId = ids.backupFolderId;
			draft.drive.v2Cache.assetsFolderId = ids.assetsFolderId;
			draft.drive.v2Cache.manifestFileId = ids.manifestFileId;
			draft.drive.v2Cache.contentFileId = ids.contentFileId;
			draft.drive.v2Cache.progressFileId = ids.progressFileId;
			draft.drive.v2Cache.assetsIndexFileId = ids.assetsIndexFileId;
			draft.drive.v2Cache.historyFileId = ids.historyFileId;
		});

		return ids;
	},

	async findV2ManifestMeta() {
		const cache = deviceState.load().drive.v2Cache || {};
		const backupFolderId = await this.findBackupFolderId();

		// נסיון מהיר לפי ID cache
		if (await safeExists(cache.manifestFileId)) {
			return await driveFilesApi.getFileMetadata(
				cache.manifestFileId!,
				'id, name, modifiedTime, appProperties'
			);
		}

		// fallback: חיפוש לפי שם (מקור האמת)
		const found = await driveFilesApi.findFileByNameInFolder(DRIVE_MANIFEST_FILE_NAME, backupFolderId);
		if (!found?.id) return null;

		deviceState.update((draft) => {
			draft.drive.v2Cache.manifestFileId = found.id!;
		});

		return found;
	},

	async findLegacyV1BackupMeta() {
		const backupFolderId = await this.findBackupFolderId();
		const found = await driveFilesApi.findFileByNameInFolder('daily_schedule_backup.json', backupFolderId);
		return found?.id ? found : null;
	},

	async readJson(fileId: string, onProgress?: (p: number) => void) {
		return await driveHttpClient.downloadJson(fileId, onProgress);
	},

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

	async readHistoryJson(historyFileId: string, onProgress?: (p: number) => void): Promise<SyncHistory> {
		return await this.readJson(historyFileId, onProgress) as SyncHistory;
	},

	async writeHistoryJson(
		historyFileId: string,
		history: SyncHistory,
		onProgress?: (p: number) => void
	): Promise<void> {
		await this.writeJson(historyFileId, history, { onProgress });
	},

	async uploadAsset(params: {
		hash: Sha256;
		blob: Blob;
		mimeType: string;
		assetsFolderId: string;
	}): Promise<{ fileId: string; size: number }> {
		const name = toAssetFileName(params.hash);

		// נסיון למצוא לפי שם כדי לעשות dedupe גם אם ה-index לא עודכן עדיין
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

	async downloadAsset(fileId: string, onProgress?: (p: number) => void): Promise<Blob> {
		return await driveHttpClient.downloadBlob(fileId, onProgress);
	}
};
