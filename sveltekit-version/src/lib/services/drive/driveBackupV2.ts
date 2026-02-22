import type { AppState } from '$lib/types';
import { db as defaultDb } from '$lib/services/db';
import { buildContentPayload, buildProgressPayload, collectAssetIds } from './backupPayloads';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './constants';
import type { AssetsIndexV2, ManifestV2, Sha256 } from './types';
import { sha256Blob, sha256String, stableStringify } from './crypto';
import type { SyncHistory, SnapshotEntry, DeltaEntry } from '$lib/services/sync/types';
import {
	createEmptyHistory,
	shouldCreateSnapshot,
	appendToHistory,
	findCommonAncestor
} from '$lib/services/sync/historyManager';
import { calculateDelta, threeWayMerge } from '$lib/services/sync/syncEngine';

const TAG = '[BackupV2]';

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
		historyFileId: string;
	}>;
	readJson(fileId: string): Promise<any>;
	writeJson(
		fileId: string,
		data: any,
		options?: { appProperties?: Record<string, string>; onProgress?: (p: number) => void }
	): Promise<void>;
	readHistoryJson(historyFileId: string, onProgress?: (p: number) => void): Promise<SyncHistory>;
	writeHistoryJson(
		historyFileId: string,
		history: SyncHistory,
		onProgress?: (p: number) => void
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

function normalizeUsersMap(rawUsers: any): AppState['users'] {
	const usersMap: AppState['users'] = {};
	const usersArray = Array.isArray(rawUsers)
		? rawUsers
		: rawUsers && typeof rawUsers === 'object'
			? Object.values(rawUsers)
			: [];

	for (const user of usersArray) {
		if (!user || typeof user !== 'object' || typeof (user as any).id !== 'string') continue;
		usersMap[(user as any).id] = user as any;
	}

	return usersMap;
}

function normalizePeopleMap(rawPeople: any): AppState['people'] {
	const peopleMap: AppState['people'] = {};
	const peopleArray = Array.isArray(rawPeople)
		? rawPeople
		: rawPeople && typeof rawPeople === 'object'
			? Object.values(rawPeople)
			: [];

	for (const person of peopleArray) {
		if (!person || typeof person !== 'object' || typeof (person as any).id !== 'string') continue;
		peopleMap[(person as any).id] = person as any;
	}

	return peopleMap;
}

function normalizeTasksMap(rawTasks: any): Record<string, any> {
	const tasksMap: Record<string, any> = {};
	const tasksArray = Array.isArray(rawTasks)
		? rawTasks
		: rawTasks && typeof rawTasks === 'object'
			? Object.values(rawTasks)
			: [];

	tasksArray.forEach((task: any, index: number) => {
		if (!task || typeof task !== 'object') return;
		const taskId = typeof task.id === 'string' ? task.id : crypto.randomUUID();
		tasksMap[taskId] = {
			...task,
			id: taskId,
			order: typeof task.order === 'number' ? task.order : index
		};
	});

	return tasksMap;
}

function normalizeListsMap(rawLists: any): AppState['lists'] {
	const listsMap: AppState['lists'] = {};
	if (!rawLists || typeof rawLists !== 'object') return listsMap;

	for (const userId of Object.keys(rawLists)) {
		const userListsRaw = rawLists[userId];
		const userListsArray = Array.isArray(userListsRaw)
			? userListsRaw
			: userListsRaw && typeof userListsRaw === 'object'
				? Object.values(userListsRaw)
				: [];

		const userListsMap: Record<string, any> = {};
		for (const list of userListsArray) {
			if (!list || typeof list !== 'object' || typeof (list as any).id !== 'string') continue;
			userListsMap[(list as any).id] = {
				...list,
				tasks: normalizeTasksMap((list as any).tasks)
			};
		}

		listsMap[userId] = userListsMap;
	}

	return listsMap;
}

function normalizeSettings(rawSettings: any, now: number): AppState['settings'] {
	const lastActiveTime =
		rawSettings && typeof rawSettings.lastActiveTime === 'number'
			? rawSettings.lastActiveTime
			: now;
	const childLockEnabled =
		rawSettings && typeof rawSettings.childLockEnabled === 'boolean'
			? rawSettings.childLockEnabled
			: false;

	return {
		lastActiveTime,
		childLockEnabled
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
	console.log(`${TAG} backupToDriveV2 started`, {
		device: params.device,
		lastKnownWriteId: params.lastKnownWriteId
	});
	const now = params.now ?? Date.now();
	const generateWriteId = params.generateWriteId ?? (() => crypto.randomUUID());

	try {
		console.log(`${TAG} ensuring structure...`);
		const ids = await params.repo.ensureStructure();
		console.log(`${TAG} structure ensured`, ids);

		const contentPayload = buildContentPayload(params.state);
		const progressPayload = buildProgressPayload(params.state);

		const contentHash = await sha256String(stableStringify(contentPayload));
		const progressHash = await sha256String(stableStringify(progressPayload));
		console.log(`${TAG} hashes calculated`, { contentHash, progressHash });

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
					hashToFile:
						typeof remote.hashToFile === 'object' && remote.hashToFile ? remote.hashToFile : {}
				};
				console.log(`${TAG} remote assets index loaded`, {
					entries: Object.keys(assetsIndex.idToHash).length,
					files: Object.keys(assetsIndex.hashToFile).length
				});
			}
		} catch (e) {
			console.warn(`${TAG} failed to read assets index (starting fresh)`, e);
		}

		assetsIndex.backupSchemaVersion = CURRENT_BACKUP_SCHEMA_VERSION;

		const assetIds = collectAssetIds(params.state);
		console.log(`${TAG} collected asset IDs from state`, assetIds.length);
		let assetsIndexChanged = false;

		for (const idbId of assetIds) {
			const existingHash = assetsIndex.idToHash[idbId] as Sha256 | undefined;
			if (existingHash && assetsIndex.hashToFile[existingHash]) continue;

			const blob = await params.db.getImage(idbId);
			if (!blob) {
				console.warn(`${TAG} image missing in local DB`, idbId);
				continue;
			}

			const hash = await sha256Blob(blob);
			if (assetsIndex.idToHash[idbId] !== hash) {
				assetsIndex.idToHash[idbId] = hash;
				assetsIndexChanged = true;
			}

			if (!assetsIndex.hashToFile[hash]) {
				console.log(`${TAG} uploading new asset`, { idbId, hash, size: blob.size });
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
		console.log(`${TAG} assets processed. Changed? ${assetsIndexChanged}. Hash: ${assetsHash}`);

		const nextCache: BackupV2Cache = { ...params.cache };

		// כתיבות אינקרמנטליות
		if (assetsIndexChanged || nextCache.lastUploadedAssetsHash !== assetsHash) {
			console.log(`${TAG} writing assets index...`);
			await params.repo.writeJson(ids.assetsIndexFileId, assetsIndex);
			nextCache.lastUploadedAssetsHash = assetsHash;
		} else {
			console.log(`${TAG} assets index skipped (no change)`);
		}

		if (nextCache.lastUploadedContentHash !== contentHash) {
			console.log(`${TAG} writing content...`);
			await params.repo.writeJson(ids.contentFileId, contentPayload);
			nextCache.lastUploadedContentHash = contentHash;
		} else {
			console.log(`${TAG} content skipped (no change)`);
		}

		if (nextCache.lastUploadedProgressHash !== progressHash) {
			console.log(`${TAG} writing progress...`);
			await params.repo.writeJson(ids.progressFileId, progressPayload);
			nextCache.lastUploadedProgressHash = progressHash;
		} else {
			console.log(`${TAG} progress skipped (no change)`);
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

		console.log(`${TAG} writing manifest...`, { writeId, appProperties });
		await params.repo.writeJson(ids.manifestFileId, manifest, { appProperties: appProperties });
		console.log(`${TAG} backup completed successfully`);

		return {
			writeId,
			manifest,
			hashes: { contentHash, progressHash, assetsHash },
			cache: nextCache
		};
	} catch (e) {
		console.error(`${TAG} backup failed`, e);
		throw e;
	}
}

/**
 * גיבוי עם תמיכה מלאה בהיסטוריה ו-sync
 */
export async function backupWithHistory(params: {
	state: AppState;
	repo: BackupV2Repo;
	db: BackupV2Db;
	device: BackupV2DeviceInfo;
	lastKnownWriteId: string | null;
	previousState: AppState | null; // State קודם מקומי (לחישוב delta)
	forceSnapshot?: boolean;
	cache: BackupV2Cache;
	now?: number;
	generateWriteId?: () => string;
}): Promise<{
	writeId: string;
	manifest: ManifestV2;
	hashes: { contentHash: Sha256; progressHash: Sha256; assetsHash: Sha256 };
	cache: BackupV2Cache;
	history: SyncHistory;
}> {
	console.log(`${TAG} backupWithHistory started`);
	const now = params.now ?? Date.now();
	const generateWriteId = params.generateWriteId ?? (() => crypto.randomUUID());

	try {
		const ids = await params.repo.ensureStructure();

		// 1. קרא את ההיסטוריה הנוכחית (או צור ריקה)
		let history: SyncHistory;
		try {
			history = await params.repo.readHistoryJson(ids.historyFileId);
			console.log(`${TAG} history loaded`, { entries: history.entries.length });
		} catch (e) {
			console.log(`${TAG} no history found, creating empty`, e);
			history = createEmptyHistory();
		}

		// 2. החלט אם ליצור snapshot או delta
		const isSnapshot = params.forceSnapshot || shouldCreateSnapshot(history);
		console.log(`${TAG} entry type: ${isSnapshot ? 'snapshot' : 'delta'}`);

		const writeId = generateWriteId();

		// 3. צור את ה-entry המתאים
		if (isSnapshot) {
			// Snapshot מלא
			const entry: SnapshotEntry = {
				type: 'snapshot',
				writeId,
				parentWriteId: params.lastKnownWriteId,
				timestamp: now,
				deviceId: params.device.deviceId,
				deviceName: params.device.deviceName,
				state: params.state
			};
			appendToHistory(history, entry);
		} else {
			// Delta - צריך state קודם
			if (!params.previousState) {
				throw new Error('previousState required for delta entry');
			}

			const delta = calculateDelta(params.previousState, params.state);
			if (!delta) {
				console.log(`${TAG} no changes detected, skipping backup`);
				throw new Error('No changes to backup');
			}

			const entry: DeltaEntry = {
				type: 'delta',
				writeId,
				parentWriteId: params.lastKnownWriteId!,
				timestamp: now,
				deviceId: params.device.deviceId,
				deviceName: params.device.deviceName,
				delta
			};
			appendToHistory(history, entry);
		}

		// 4. גיבוי רגיל (קבצים)
		const backupResult = await backupToDriveV2({
			state: params.state,
			repo: params.repo,
			db: params.db,
			device: params.device,
			lastKnownWriteId: params.lastKnownWriteId,
			cache: params.cache,
			now,
			generateWriteId: () => writeId // שימוש באותו writeId!
		});

		// 5. שמור את ההיסטוריה המעודכנת
		console.log(`${TAG} saving history...`);
		await params.repo.writeHistoryJson(ids.historyFileId, history);

		console.log(`${TAG} backupWithHistory completed successfully`);
		return {
			...backupResult,
			history
		};
	} catch (e) {
		console.error(`${TAG} backupWithHistory failed`, e);
		throw e;
	}
}

export async function restoreFromDriveV2(params: {
	manifestFileId: string;
	repo: BackupV2Repo;
	db: BackupV2Db;
	now?: number;
}): Promise<{ state: AppState; manifest: ManifestV2 }> {
	console.log(`${TAG} restoreFromDriveV2 started`, { manifestFileId: params.manifestFileId });
	const now = params.now ?? Date.now();

	try {
		const manifest = (await params.repo.readJson(params.manifestFileId)) as ManifestV2;
		console.log(`${TAG} manifest loaded`, {
			schemaVer: manifest?.backupSchemaVersion,
			generatedAt: manifest?.generatedAt,
			writeId: manifest?.syncMetadata?.writeId
		});

		if (
			!manifest ||
			typeof manifest.backupSchemaVersion !== 'number' ||
			!manifest.files?.content?.fileId ||
			!manifest.files?.progress?.fileId ||
			!manifest.files?.assetsIndex?.fileId
		) {
			console.error(`${TAG} invalid manifest structure`, manifest);
			throw new Error('Invalid manifest file');
		}

		if (manifest.backupSchemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
			throw new Error(
				`Backup schema version ${manifest.backupSchemaVersion} is newer than supported ${CURRENT_BACKUP_SCHEMA_VERSION}`
			);
		}

		console.log(`${TAG} downloading parts...`);
		const content = await params.repo.readJson(manifest.files.content.fileId);
		const progress = await params.repo.readJson(manifest.files.progress.fileId);
		const assetsIndex = await params.repo.readJson(manifest.files.assetsIndex.fileId);
		console.log(`${TAG} parts downloaded`);

		const contentObj = content as any;
		const restored: AppState = {
			version: contentObj.appStateVersion ?? contentObj.version ?? 14,
			users: normalizeUsersMap(contentObj.users),
			people: normalizePeopleMap(contentObj.people),
			lists: normalizeListsMap(contentObj.lists),
			images: contentObj.images || {},
			activeListId: contentObj.activeListId || {},
			currentUserId: contentObj.currentUserId ?? null,
			settings: normalizeSettings(contentObj.settings, now),
			lastModified: manifest.syncMetadata.lastModified,
			syncMetadata: manifest.syncMetadata
		};

		const taskDone: Record<string, boolean> = (progress as any)?.taskDone || {};
		for (const userId of Object.keys(restored.lists || {})) {
			const userLists = restored.lists[userId] || {};
			for (const list of Object.values(userLists)) {
				for (const task of Object.values(list.tasks || {})) {
					task.isDone = !!taskDone[task.id];
				}
			}
		}

		const neededIdbIds = collectAssetIds(restored);
		const idToHash = (assetsIndex as any)?.idToHash || {};
		const hashToFile = (assetsIndex as any)?.hashToFile || {};
		console.log(`${TAG} restoring assets`, { needed: neededIdbIds.length });

		let restoredCount = 0;
		for (const idbId of neededIdbIds) {
			const existing = await params.db.getImage(idbId);
			if (existing) continue;

			const hash = idToHash[idbId] as Sha256 | undefined;
			const fileId = hash && hashToFile[hash] ? hashToFile[hash].fileId : null;
			if (!hash || !fileId) {
				console.warn(`${TAG} asset missing in remote index`, idbId);
				continue;
			}

			// console.log(`${TAG} downloading asset`, { idbId, fileId }); // Verbose
			const blob = await params.repo.downloadAsset(fileId);
			await params.db.saveImage(blob, idbId);
			restoredCount++;
		}
		console.log(`${TAG} assets restored`, { count: restoredCount });

		return { state: restored, manifest };
	} catch (e) {
		console.error(`${TAG} restore failed`, e);
		throw e;
	}
}

/**
 * שחזור עם 3-way merge אוטומטי
 */
export async function restoreWithMerge(params: {
	manifestFileId: string;
	repo: BackupV2Repo;
	db: BackupV2Db;
	localState: AppState | null; // State מקומי נוכחי
	localWriteId: string | null; // writeId מקומי אחרון
	now?: number;
}): Promise<{ state: AppState; manifest: ManifestV2; merged: boolean; remoteState?: AppState }> {
	console.log(`${TAG} restoreWithMerge started`, {
		manifestFileId: params.manifestFileId,
		hasLocalState: !!params.localState,
		localWriteId: params.localWriteId
	});

	try {
		const ids = await params.repo.ensureStructure();

		// 1. שחזר את הגרסה המרוחקת (restore רגיל)
		const { state: remoteState, manifest: remoteManifest } = await restoreFromDriveV2({
			manifestFileId: params.manifestFileId,
			repo: params.repo,
			db: params.db,
			now: params.now
		});

		const remoteWriteId = remoteManifest.syncMetadata.writeId;
		console.log(`${TAG} remote state restored`, { remoteWriteId });

		// 2. אם אין local state - פשוט החזר את ה-remote
		if (!params.localState || !params.localWriteId) {
			console.log(`${TAG} no local state, using remote as-is`);
			return { state: remoteState, manifest: remoteManifest, merged: false };
		}

		// 3. אם ה-writeIds זהים - אין שינויים
		if (params.localWriteId === remoteWriteId) {
			console.log(`${TAG} writeIds match, no changes`);
			return { state: params.localState, manifest: remoteManifest, merged: false, remoteState };
		}

		// 4. צריך merge - קרא את ההיסטוריה
		let history: SyncHistory;
		try {
			history = await params.repo.readHistoryJson(ids.historyFileId);
			console.log(`${TAG} history loaded for merge`, { entries: history.entries.length });
		} catch (e) {
			console.warn(`${TAG} no history found, cannot perform 3-way merge. Keeping local state.`, e);
			return { state: params.localState!, manifest: remoteManifest, merged: true };
		}

		// 5. מצא common ancestor
		const ancestor = findCommonAncestor(history, params.localWriteId, remoteWriteId);

		if (!ancestor.found || !ancestor.state) {
			console.warn(`${TAG} no common ancestor found, keeping local state`);
			return { state: params.localState!, manifest: remoteManifest, merged: true };
		}

		console.log(`${TAG} common ancestor found`, { writeId: ancestor.writeId });

		// 6. בצע 3-way merge
		console.log(`${TAG} performing 3-way merge...`);
		const mergedState = threeWayMerge(ancestor.state, params.localState, remoteState);

		// עדכן metadata
		mergedState.lastModified = Math.max(
			params.localState.lastModified,
			remoteState.lastModified
		);
		mergedState.syncMetadata = remoteManifest.syncMetadata;

		console.log(`${TAG} 3-way merge completed successfully`);
		return { state: mergedState, manifest: remoteManifest, merged: true };
	} catch (e) {
		console.error(`${TAG} restoreWithMerge failed`, e);
		throw e;
	}
}
