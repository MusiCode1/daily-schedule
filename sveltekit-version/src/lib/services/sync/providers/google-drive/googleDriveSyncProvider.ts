import { googleAuthService } from './googleAuthService';
import { driveFilesApi } from './driveFilesApi';
import { driveHttpClient } from './driveHttpClient';
import { deviceState } from '$lib/stores/deviceState';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '$lib/services/sync/constants';
import type {
	SyncContent,
	SyncProgress,
	SyncAssetsIndex,
	SyncManifest,
	RemoteMetadata,
	Sha256
} from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';
import type { SyncProvider } from '$lib/services/sync/syncProvider';
import { dailyScheduleBackupRepo } from './dailyScheduleBackupRepo';

const TAG = '[GoogleDriveSyncProvider]';

/** משך תוקף הנעילה — 30 שניות */
const LOCK_TTL_MS = 30_000;

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

/**
 * ספק סנכרון ראשי — מממש את {@link SyncProvider} עבור Google Drive.
 *
 * אחראי על קריאה/כתיבה של כל חלקי הגיבוי (manifest, content, progress, assets, history)
 * דרך {@link dailyScheduleBackupRepo}, עם cache אינקרמנטלי למניעת העלאות מיותרות.
 */
class GoogleDriveSyncProvider implements SyncProvider {
	readonly id = 'google-drive';

	private initialized = false;
	private structureIds: Awaited<ReturnType<typeof dailyScheduleBackupRepo.ensureStructure>> | null = null;

	/** אתחול הספק — יוצר את מבנה הקבצים ב-Drive אם לא קיים */
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

	/** בודק אם הספק זמין — כלומר, יש access token פעיל */
	async isAvailable(): Promise<boolean> {
		return !!googleAuthService.getAccessToken();
	}

	/**
	 * בודק את מצב הגיבוי המרוחק — קורא את ה-appProperties מקובץ ה-manifest.
	 * @returns מטא-דאטה מרוחקת, או null אם אין manifest או שהוא ריק
	 */
	async checkRemote(): Promise<RemoteMetadata | null> {
		console.log(TAG, 'checkRemote...');
		const meta = await dailyScheduleBackupRepo.findManifestMeta();
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

	/** מושך את תוכן המשימות מ-Drive */
	async pullContent(): Promise<SyncContent | null> {
		const ids = await this.getIds();
		try {
			return (await dailyScheduleBackupRepo.readJson(ids.contentFileId)) as SyncContent;
		} catch (e) {
			console.warn(TAG, 'pullContent failed', e);
			return null;
		}
	}

	/** מושך את מצב ההתקדמות מ-Drive */
	async pullProgress(): Promise<SyncProgress | null> {
		const ids = await this.getIds();
		try {
			return (await dailyScheduleBackupRepo.readJson(ids.progressFileId)) as SyncProgress;
		} catch (e) {
			console.warn(TAG, 'pullProgress failed', e);
			return null;
		}
	}

	/** מושך את היסטוריית הסנכרון מ-Drive */
	async pullHistory(): Promise<SyncHistory | null> {
		const ids = await this.getIds();
		try {
			return await dailyScheduleBackupRepo.readHistoryJson(ids.historyFileId);
		} catch (e) {
			console.warn(TAG, 'pullHistory failed', e);
			return null;
		}
	}

	/** מושך את אינדקס הנכסים מ-Drive */
	async pullAssets(): Promise<SyncAssetsIndex | null> {
		const ids = await this.getIds();
		try {
			return (await dailyScheduleBackupRepo.readJson(ids.assetsIndexFileId)) as SyncAssetsIndex;
		} catch (e) {
			console.warn(TAG, 'pullAssets failed', e);
			return null;
		}
	}

	/**
	 * מוריד נכס חסר מ-Drive לפי hash.
	 * @param hash - hash SHA-256 של הנכס
	 * @returns Blob עם תוכן הנכס
	 * @throws {Error} אם הנכס לא נמצא באינדקס
	 */
	async downloadMissingAsset(hash: string): Promise<Blob> {
		// חיפוש ה-fileId מה-assetsIndex
		const assetsIndex = await this.pullAssets();
		const fileId = assetsIndex?.hashToFile?.[hash as Sha256]?.fileId;
		if (!fileId) throw new Error(`Asset not found in index: ${hash}`);
		return await dailyScheduleBackupRepo.downloadAsset(fileId);
	}

	/**
	 * כותב תוכן משימות ל-Drive. מדלג אם ה-hash לא השתנה.
	 * @param payload - תוכן הסנכרון
	 * @param hash - hash של התוכן לזיהוי שינויים
	 */
	async writeContent(payload: SyncContent, hash: string): Promise<void> {
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

	/**
	 * כותב מצב התקדמות ל-Drive. מדלג אם ה-hash לא השתנה.
	 * @param payload - נתוני ההתקדמות
	 * @param hash - hash של ההתקדמות לזיהוי שינויים
	 */
	async writeProgress(payload: SyncProgress, hash: string): Promise<void> {
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

	/**
	 * כותב היסטוריית סנכרון ל-Drive.
	 * @param history - אובייקט היסטוריה לכתיבה
	 */
	async writeHistory(history: SyncHistory): Promise<void> {
		const ids = await this.getIds();
		await dailyScheduleBackupRepo.writeHistoryJson(ids.historyFileId, history);
		console.log(TAG, 'writeHistory done');
	}

	/**
	 * כותב נכסים חדשים ל-Drive ומעדכן את אינדקס הנכסים.
	 * מעלה רק blobs חדשים ומדלג על אינדקס ללא שינוי.
	 * @param index - אינדקס הנכסים המעודכן
	 * @param newBlobs - מפה של hash → Blob להעלאה
	 */
	async writeAssets(index: SyncAssetsIndex, newBlobs: Map<string, Blob>): Promise<void> {
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

	/**
	 * מבצע commit — כותב את ה-manifest עם appProperties (writeId, hashes וכו').
	 * זהו השלב האחרון בפעולת push שמסיים את הכתיבה האטומית.
	 * @param manifest - אובייקט ה-manifest לכתיבה
	 */
	async commit(manifest: SyncManifest): Promise<void> {
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

	// ─── Lock ────────────────────────────────────────────────────────────────

	/**
	 * נעילת הענן לכתיבה — שומרת lock כ-appProperties על קובץ ה-manifest.
	 * אם כבר קיימת נעילה תקפה של מכשיר אחר (TTL 30 שניות) — מחזירה acquired=false.
	 * אם הנעילה פגה או שייכת לאותו מכשיר — כותבת נעילה חדשה.
	 * @param device - מזהה ושם המכשיר הנועל
	 * @returns acquired=true אם הנעילה הצליחה, nonce לזיהוי הנעילה; holder=שם המכשיר שמחזיק אם נכשל
	 */
	async acquireLock(device: { deviceId: string; deviceName: string }): Promise<{
		acquired: boolean;
		nonce?: string;
		holder?: string;
	}> {
		console.log(TAG, 'acquireLock', device);

		const meta = await dailyScheduleBackupRepo.findManifestMeta();
		const ap = (meta?.appProperties ?? {}) as Record<string, string>;

		// בדיקה אם יש נעילה תקפה של מכשיר אחר
		const lockTimestamp = Number(ap.syncLockTimestamp) || 0;
		const now = Date.now();
		const isLockValid = lockTimestamp + LOCK_TTL_MS > now;
		const isOtherDevice = ap.syncLockDeviceId && ap.syncLockDeviceId !== device.deviceId;

		if (isLockValid && isOtherDevice) {
			console.log(TAG, 'acquireLock: held by another device', ap.syncLockDeviceName);
			return { acquired: false, holder: ap.syncLockDeviceName || ap.syncLockDeviceId };
		}

		// נעילה פגה או שלנו — כותבים נעילה חדשה
		const newNonce = crypto.randomUUID();
		const ids = await this.getIds();

		await driveFilesApi.updateFileMetadata(ids.manifestFileId, {
			appProperties: {
				...ap,
				syncLockDeviceId: device.deviceId,
				syncLockDeviceName: device.deviceName,
				syncLockTimestamp: String(now),
				syncLockNonce: newNonce
			}
		});

		console.log(TAG, 'acquireLock: acquired', { nonce: newNonce });
		return { acquired: true, nonce: newNonce };
	}

	/**
	 * אימות שהנעילה שרכשנו עדיין בתוקף — קורא את ה-appProperties מה-manifest
	 * ומוודא שה-nonce תואם.
	 * @param nonce - ה-nonce שחזר מ-acquireLock
	 * @returns true אם הנעילה עדיין שלנו
	 */
	async verifyLock(nonce: string): Promise<boolean> {
		console.log(TAG, 'verifyLock', { nonce });

		const meta = await dailyScheduleBackupRepo.findManifestMeta();
		const ap = (meta?.appProperties ?? {}) as Record<string, string>;

		const isValid = ap.syncLockNonce === nonce;
		console.log(TAG, 'verifyLock:', isValid ? 'valid' : 'invalid');
		return isValid;
	}

	/**
	 * שחרור הנעילה — כותב ערכים ריקים לשדות ה-lock ב-appProperties.
	 * appProperties של Drive לא תומך במחיקת שדות, לכן כותבים מחרוזות ריקות.
	 * כישלון בשחרור לא זורק שגיאה — רק warning.
	 */
	async releaseLock(): Promise<void> {
		console.log(TAG, 'releaseLock');
		try {
			const ids = await this.getIds();

			// קריאת appProperties הנוכחיים כדי לשמר שדות אחרים
			const meta = await dailyScheduleBackupRepo.findManifestMeta();
			const ap = (meta?.appProperties ?? {}) as Record<string, string>;

			await driveFilesApi.updateFileMetadata(ids.manifestFileId, {
				appProperties: {
					...ap,
					syncLockDeviceId: '',
					syncLockDeviceName: '',
					syncLockTimestamp: '',
					syncLockNonce: ''
				}
			});

			console.log(TAG, 'releaseLock: done');
		} catch (e) {
			console.warn(TAG, 'releaseLock failed (non-fatal)', e);
		}
	}
}

/** singleton של ספק הסנכרון ל-Google Drive */
export const googleDriveSyncProvider = new GoogleDriveSyncProvider();
