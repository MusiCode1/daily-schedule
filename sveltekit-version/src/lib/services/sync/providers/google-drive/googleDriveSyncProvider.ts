import { googleAuthService } from './googleAuthService';
import { driveFilesApi } from './driveFilesApi';
import { driveHttpClient } from './driveHttpClient';
import { deviceState } from '$lib/stores/deviceState';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '$lib/services/sync/constants';
import type {
	ContentV2,
	ProgressV2,
	AssetsIndexV2,
	ManifestV2,
	RemoteMetadata,
	Sha256
} from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';
import type { SyncProvider } from '$lib/services/sync/syncProvider';
import { dailyScheduleBackupRepo } from './dailyScheduleBackupRepo';

const TAG = '[GoogleDriveSyncProvider]';

function toAssetFileName(hash: string): string {
	return `sha256_${hash.slice('sha256:'.length)}`;
}

/** קורא את hashes מ-cache הפנימי */
function getCachedHashes() {
	const ds = deviceState.load();
	const cache = ds.providers['google-drive'] || ds.drive.v2Cache || {};
	return {
		content: cache.lastUploadedContentHash,
		progress: cache.lastUploadedProgressHash,
		assets: cache.lastUploadedAssetsHash
	};
}

/** עדכון hashes ב-cache */
function updateCachedHashes(updates: {
	content?: string;
	progress?: string;
	assets?: string;
}) {
	deviceState.update((draft) => {
		if (!draft.providers['google-drive']) draft.providers['google-drive'] = {};
		const cache = draft.providers['google-drive']!;
		if (updates.content !== undefined) {
			cache.lastUploadedContentHash = updates.content;
			draft.drive.v2Cache.lastUploadedContentHash = updates.content;
		}
		if (updates.progress !== undefined) {
			cache.lastUploadedProgressHash = updates.progress;
			draft.drive.v2Cache.lastUploadedProgressHash = updates.progress;
		}
		if (updates.assets !== undefined) {
			cache.lastUploadedAssetsHash = updates.assets;
			draft.drive.v2Cache.lastUploadedAssetsHash = updates.assets;
		}
	});
}

class GoogleDriveSyncProvider implements SyncProvider {
	readonly id = 'google-drive';

	private initialized = false;
	private structureIds: Awaited<ReturnType<typeof dailyScheduleBackupRepo.ensureStructure>> | null = null;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		console.log(TAG, 'initialize: ensureStructure...');
		this.structureIds = await dailyScheduleBackupRepo.ensureStructure();
		this.initialized = true;
		console.log(TAG, 'initialize: done', this.structureIds);
	}

	private async getIds() {
		if (!this.structureIds) {
			this.structureIds = await dailyScheduleBackupRepo.ensureStructure();
		}
		return this.structureIds;
	}

	async isAvailable(): Promise<boolean> {
		return !!googleAuthService.getAccessToken();
	}

	async checkRemote(): Promise<RemoteMetadata | null> {
		console.log(TAG, 'checkRemote...');
		const meta = await dailyScheduleBackupRepo.findV2ManifestMeta();
		if (!meta?.appProperties) return null;

		const ap = meta.appProperties as Record<string, string>;
		if (!ap.writeId) return null;

		return {
			writeId: ap.writeId,
			parentWriteId: ap.parentWriteId ?? null,
			contentHash: ap.contentHash as Sha256,
			progressHash: ap.progressHash as Sha256,
			assetsHash: ap.assetsHash as Sha256,
			timestamp: Number(ap.lastModified) || 0,
			deviceId: ap.lastModifiedByDeviceId || ''
		};
	}

	async pullContent(): Promise<ContentV2 | null> {
		const ids = await this.getIds();
		try {
			return (await dailyScheduleBackupRepo.readJson(ids.contentFileId)) as ContentV2;
		} catch (e) {
			console.warn(TAG, 'pullContent failed', e);
			return null;
		}
	}

	async pullProgress(): Promise<ProgressV2 | null> {
		const ids = await this.getIds();
		try {
			return (await dailyScheduleBackupRepo.readJson(ids.progressFileId)) as ProgressV2;
		} catch (e) {
			console.warn(TAG, 'pullProgress failed', e);
			return null;
		}
	}

	async pullHistory(): Promise<SyncHistory | null> {
		const ids = await this.getIds();
		try {
			return await dailyScheduleBackupRepo.readHistoryJson(ids.historyFileId);
		} catch (e) {
			console.warn(TAG, 'pullHistory failed', e);
			return null;
		}
	}

	async pullAssets(): Promise<AssetsIndexV2 | null> {
		const ids = await this.getIds();
		try {
			return (await dailyScheduleBackupRepo.readJson(ids.assetsIndexFileId)) as AssetsIndexV2;
		} catch (e) {
			console.warn(TAG, 'pullAssets failed', e);
			return null;
		}
	}

	async downloadMissingAsset(hash: string): Promise<Blob> {
		// חיפוש ה-fileId מה-assetsIndex
		const assetsIndex = await this.pullAssets();
		const fileId = assetsIndex?.hashToFile?.[hash as Sha256]?.fileId;
		if (!fileId) throw new Error(`Asset not found in index: ${hash}`);
		return await dailyScheduleBackupRepo.downloadAsset(fileId);
	}

	async writeContent(payload: ContentV2, hash: string): Promise<void> {
		const cached = getCachedHashes();
		if (cached.content === hash) {
			console.log(TAG, 'writeContent skipped (no change)');
			return;
		}
		const ids = await this.getIds();
		await dailyScheduleBackupRepo.writeJson(ids.contentFileId, payload);
		updateCachedHashes({ content: hash });
		console.log(TAG, 'writeContent done');
	}

	async writeProgress(payload: ProgressV2, hash: string): Promise<void> {
		const cached = getCachedHashes();
		if (cached.progress === hash) {
			console.log(TAG, 'writeProgress skipped (no change)');
			return;
		}
		const ids = await this.getIds();
		await dailyScheduleBackupRepo.writeJson(ids.progressFileId, payload);
		updateCachedHashes({ progress: hash });
		console.log(TAG, 'writeProgress done');
	}

	async writeHistory(history: SyncHistory): Promise<void> {
		const ids = await this.getIds();
		await dailyScheduleBackupRepo.writeHistoryJson(ids.historyFileId, history);
		console.log(TAG, 'writeHistory done');
	}

	async writeAssets(index: AssetsIndexV2, newBlobs: Map<string, Blob>): Promise<void> {
		const ids = await this.getIds();

		// העלאת blobs חדשים
		for (const [hash, blob] of newBlobs) {
			const sha256Hash = hash as Sha256;
			const name = toAssetFileName(hash);
			const existing = await driveFilesApi.findFileByNameInFolder(name, ids.assetsFolderId);
			let fileId = existing?.id || null;

			if (!fileId) {
				fileId = await driveFilesApi.createFile({
					name,
					mimeType: blob.type || 'application/octet-stream',
					parents: [ids.assetsFolderId]
				});
			}

			await driveHttpClient.uploadBlob(fileId, blob, blob.type || 'application/octet-stream');

			// עדכון index עם fileId שהתקבל
			index.hashToFile[sha256Hash] = {
				fileId,
				mimeType: blob.type || 'application/octet-stream',
				size: blob.size
			};

			console.log(TAG, 'asset uploaded', { hash, fileId });
		}

		// חישוב hash של האינדקס המעודכן וכתיבתו
		const { stableStringify, sha256String } = await import('$lib/services/sync/crypto');
		const assetsHash = await sha256String(stableStringify(index));

		const cached = getCachedHashes();
		if (cached.assets !== assetsHash) {
			await dailyScheduleBackupRepo.writeJson(ids.assetsIndexFileId, index);
			updateCachedHashes({ assets: assetsHash });
			console.log(TAG, 'writeAssets index written');
		} else {
			console.log(TAG, 'writeAssets index skipped (no change)');
		}
	}

	async commit(manifest: ManifestV2): Promise<void> {
		const ids = await this.getIds();

		const appProperties: Record<string, string> = {
			backupSchemaVersion: String(CURRENT_BACKUP_SCHEMA_VERSION),
			writeId: manifest.syncMetadata.writeId,
			lastModified: String(manifest.syncMetadata.lastModified),
			lastModifiedByDeviceId: manifest.syncMetadata.lastModifiedByDeviceId,
			lastModifiedByDeviceName: manifest.syncMetadata.lastModifiedByDeviceName,
			contentHash: manifest.hashes.contentHash,
			progressHash: manifest.hashes.progressHash,
			assetsHash: manifest.hashes.assetsHash
		};
		if (manifest.syncMetadata.parentWriteId) {
			appProperties.parentWriteId = manifest.syncMetadata.parentWriteId;
		}

		await dailyScheduleBackupRepo.writeJson(ids.manifestFileId, manifest, {
			appProperties
		});

		// איפוס initialized כדי שאתחול הבא יקרא ensureStructure שוב אם צריך
		// (לא מאפסים כי הIDs עדיין תקפים)
		console.log(TAG, 'commit done', { writeId: manifest.syncMetadata.writeId });
	}
}

export const googleDriveSyncProvider = new GoogleDriveSyncProvider();
