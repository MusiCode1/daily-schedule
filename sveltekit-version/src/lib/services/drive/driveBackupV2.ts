import type { AppState } from '$lib/types';
import { db as defaultDb } from '$lib/services/db';
import { buildContentPayload, buildProgressPayload, collectAssetIds } from './backupPayloads';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './constants';
import type { AssetsIndexV2, ManifestV2, Sha256 } from './types';
import { sha256Blob, sha256String, stableStringify } from './crypto';

export type BackupV2Cache = {
	lastUploadedContentHash?: Sha256;
	lastUploadedProgressHash?: Sha256;
	lastUploadedAssetsHash?: Sha256;
};

export type BackupV2DeviceInfo = {
	deviceId: string;
	deviceName: string;
};

export type BackupV2Repo = {
	ensureStructure(): Promise<{
		backupFolderId: string;
		assetsFolderId: string;
		manifestFileId: string;
		contentFileId: string;
		progressFileId: string;
		assetsIndexFileId: string;
	}>;
	readJson(fileId: string): Promise<any>;
	writeJson(
		fileId: string,
		data: any,
		options?: { appProperties?: Record<string, string>; onProgress?: (p: number) => void }
	): Promise<void>;
	uploadAsset(params: {
		hash: Sha256;
		blob: Blob;
		mimeType: string;
		assetsFolderId: string;
	}): Promise<{ fileId: string; size: number }>;
	downloadAsset(fileId: string): Promise<Blob>;
};

export type BackupV2Db = Pick<typeof defaultDb, 'getImage' | 'saveImage'>;

function createEmptyAssetsIndex(): AssetsIndexV2 {
	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		idToHash: {},
		hashToFile: {}
	};
}

export async function backupToDriveV2(params: {
	state: AppState;
	repo: BackupV2Repo;
	db: BackupV2Db;
	device: BackupV2DeviceInfo;
	lastKnownWriteId: string | null;
	cache: BackupV2Cache;
	// ניתן להזרקה בבדיקות
	now?: number;
	generateWriteId?: () => string;
}): Promise<{
	writeId: string;
	manifest: ManifestV2;
	hashes: { contentHash: Sha256; progressHash: Sha256; assetsHash: Sha256 };
	cache: BackupV2Cache;
}> {
	const now = params.now ?? Date.now();
	const generateWriteId = params.generateWriteId ?? (() => crypto.randomUUID());

	const ids = await params.repo.ensureStructure();

	const contentPayload = buildContentPayload(params.state);
	const progressPayload = buildProgressPayload(params.state);

	const contentHash = await sha256String(stableStringify(contentPayload));
	const progressHash = await sha256String(stableStringify(progressPayload));

	// assets index
	let assetsIndex = createEmptyAssetsIndex();
	try {
		const remote = await params.repo.readJson(ids.assetsIndexFileId);
		if (remote && typeof remote === 'object') {
			assetsIndex = {
				backupSchemaVersion:
					typeof remote.backupSchemaVersion === 'number'
						? remote.backupSchemaVersion
						: CURRENT_BACKUP_SCHEMA_VERSION,
				idToHash: typeof remote.idToHash === 'object' && remote.idToHash ? remote.idToHash : {},
				hashToFile: typeof remote.hashToFile === 'object' && remote.hashToFile ? remote.hashToFile : {}
			};
		}
	} catch {
		// מתחילים מאפס אם אין קובץ/לא תקין
	}

	assetsIndex.backupSchemaVersion = CURRENT_BACKUP_SCHEMA_VERSION;

	const assetIds = collectAssetIds(params.state);
	let assetsIndexChanged = false;

	for (const idbId of assetIds) {
		const existingHash = assetsIndex.idToHash[idbId] as Sha256 | undefined;
		if (existingHash && assetsIndex.hashToFile[existingHash]) continue;

		const blob = await params.db.getImage(idbId);
		if (!blob) continue;

		const hash = await sha256Blob(blob);
		if (assetsIndex.idToHash[idbId] !== hash) {
			assetsIndex.idToHash[idbId] = hash;
			assetsIndexChanged = true;
		}

		if (!assetsIndex.hashToFile[hash]) {
			const uploaded = await params.repo.uploadAsset({
				hash,
				blob,
				mimeType: blob.type || 'application/octet-stream',
				assetsFolderId: ids.assetsFolderId
			});
			assetsIndex.hashToFile[hash] = {
				fileId: uploaded.fileId,
				mimeType: blob.type || 'application/octet-stream',
				size: uploaded.size
			};
			assetsIndexChanged = true;
		}
	}

	const assetsHash = await sha256String(stableStringify(assetsIndex));

	const nextCache: BackupV2Cache = { ...params.cache };

	// כתיבות אינקרמנטליות
	if (assetsIndexChanged || nextCache.lastUploadedAssetsHash !== assetsHash) {
		await params.repo.writeJson(ids.assetsIndexFileId, assetsIndex);
		nextCache.lastUploadedAssetsHash = assetsHash;
	}

	if (nextCache.lastUploadedContentHash !== contentHash) {
		await params.repo.writeJson(ids.contentFileId, contentPayload);
		nextCache.lastUploadedContentHash = contentHash;
	}

	if (nextCache.lastUploadedProgressHash !== progressHash) {
		await params.repo.writeJson(ids.progressFileId, progressPayload);
		nextCache.lastUploadedProgressHash = progressHash;
	}

	// manifest אחרון
	const writeId = generateWriteId();
	const manifest: ManifestV2 = {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		generatedAt: now,
		syncMetadata: {
			writeId,
			parentWriteId: params.lastKnownWriteId || undefined,
			lastModified: now,
			lastModifiedByDeviceId: params.device.deviceId,
			lastModifiedByDeviceName: params.device.deviceName
		},
		hashes: { contentHash, progressHash, assetsHash },
		files: {
			content: { name: 'daily_schedule_content.json', fileId: ids.contentFileId },
			progress: { name: 'daily_schedule_progress.json', fileId: ids.progressFileId },
			assetsIndex: { name: 'daily_schedule_assets.json', fileId: ids.assetsIndexFileId },
			assetsFolder: { name: 'assets', folderId: ids.assetsFolderId }
		}
	};

	const appProperties: Record<string, string> = {
		backupSchemaVersion: String(CURRENT_BACKUP_SCHEMA_VERSION),
		writeId,
		lastModified: String(now),
		lastModifiedByDeviceId: params.device.deviceId,
		lastModifiedByDeviceName: params.device.deviceName,
		contentHash,
		progressHash,
		assetsHash
	};
	if (params.lastKnownWriteId) appProperties.parentWriteId = params.lastKnownWriteId;

	await params.repo.writeJson(ids.manifestFileId, manifest, { appProperties: appProperties });

	return {
		writeId,
		manifest,
		hashes: { contentHash, progressHash, assetsHash },
		cache: nextCache
	};
}

export async function restoreFromDriveV2(params: {
	manifestFileId: string;
	repo: BackupV2Repo;
	db: BackupV2Db;
	now?: number;
}): Promise<{ state: AppState; manifest: ManifestV2 }> {
	const now = params.now ?? Date.now();

	const manifest = (await params.repo.readJson(params.manifestFileId)) as ManifestV2;
	if (
		!manifest ||
		typeof manifest.backupSchemaVersion !== 'number' ||
		!manifest.files?.content?.fileId ||
		!manifest.files?.progress?.fileId ||
		!manifest.files?.assetsIndex?.fileId
	) {
		throw new Error('Invalid manifest file');
	}

	if (manifest.backupSchemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
		throw new Error(
			`Backup schema version ${manifest.backupSchemaVersion} is newer than supported ${CURRENT_BACKUP_SCHEMA_VERSION}`
		);
	}

	const content = await params.repo.readJson(manifest.files.content.fileId);
	const progress = await params.repo.readJson(manifest.files.progress.fileId);
	const assetsIndex = await params.repo.readJson(manifest.files.assetsIndex.fileId);

	const contentObj = content as any;
	const restored: AppState = {
		version: contentObj.appStateVersion ?? contentObj.version ?? 14,
		users: contentObj.users || [],
		people: contentObj.people || [],
		lists: contentObj.lists || {},
		images: contentObj.images || {},
		activeListId: contentObj.activeListId || {},
		currentUserId: contentObj.currentUserId ?? null,
		settings: { lastActiveTime: now },
		lastModified: manifest.syncMetadata.lastModified,
		syncMetadata: manifest.syncMetadata
	};

	const taskDone: Record<string, boolean> = (progress as any)?.taskDone || {};
	for (const userId of Object.keys(restored.lists || {})) {
		for (const list of restored.lists[userId] || []) {
			for (const task of list.tasks || []) {
				task.isDone = !!taskDone[task.id];
			}
		}
	}

	const neededIdbIds = collectAssetIds(restored);
	const idToHash = (assetsIndex as any)?.idToHash || {};
	const hashToFile = (assetsIndex as any)?.hashToFile || {};

	for (const idbId of neededIdbIds) {
		const existing = await params.db.getImage(idbId);
		if (existing) continue;

		const hash = idToHash[idbId] as Sha256 | undefined;
		const fileId = hash && hashToFile[hash] ? hashToFile[hash].fileId : null;
		if (!hash || !fileId) continue;

		const blob = await params.repo.downloadAsset(fileId);
		await params.db.saveImage(blob, idbId);
	}

	return { state: restored, manifest };
}

