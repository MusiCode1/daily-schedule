import type { AppState } from '$lib/types';
import type { SyncProvider } from './syncProvider';
import type { SyncHistory, SnapshotEntry, DeltaEntry } from './engine/types';
import type { ManifestV2, Sha256 } from './syncTypes';
import { SyncError } from './syncTypes';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './constants';
import {
	calculateDelta,
	threeWayMerge
} from './engine/syncEngine';
import {
	createEmptyHistory,
	shouldCreateSnapshot,
	appendToHistory,
	findCommonAncestor
} from './engine/historyManager';
import { buildContentPayload, buildProgressPayload, collectAssetIds } from './payloads';
import { sha256String, sha256Blob, stableStringify } from './crypto';

const TAG = '[SyncOrchestrator]';

/**
 * ממיר AppState ל-historyContent — מפשיט שדות אפמריים (isDone, lastModified, syncMetadata)
 * כדי שההיסטוריה תכיל רק נתונים מבניים (בהתאם לתכנון המקורי עם ContentV2).
 */
export function toHistoryContent(state: AppState): Record<string, any> {
	const content: Record<string, any> = {
		version: state.version,
		users: state.users,
		people: state.people,
		lists: {},
		images: state.images,
		activeListId: state.activeListId,
		currentUserId: state.currentUserId,
		settings: { childLockEnabled: state.settings?.childLockEnabled ?? false }
	};
	// העתקת lists ללא isDone
	for (const userId of Object.keys(state.lists || {})) {
		content.lists[userId] = {};
		for (const [listId, list] of Object.entries(state.lists[userId] || {})) {
			const tasks: Record<string, any> = {};
			for (const [taskId, task] of Object.entries((list as any).tasks || {})) {
				const { isDone, ...rest } = task as any;
				tasks[taskId] = rest;
			}
			content.lists[userId][listId] = { ...list, tasks };
		}
	}
	return content;
}

/**
 * מחיל isDone מ-source state על target state (last-write-wins)
 */
function applyProgressToState(target: AppState, source: AppState): void {
	for (const userId of Object.keys(source.lists || {})) {
		const sourceLists = source.lists[userId] || {};
		const targetLists = target.lists[userId] || {};
		for (const [listId, sourceList] of Object.entries(sourceLists)) {
			const targetList = targetLists[listId] as any;
			if (!targetList) continue;
			for (const [taskId, sourceTask] of Object.entries((sourceList as any).tasks || {})) {
				const targetTask = targetList.tasks?.[taskId];
				if (targetTask) {
					targetTask.isDone = (sourceTask as any).isDone;
				}
			}
		}
	}
}

export type DeviceInfo = {
	deviceId: string;
	deviceName: string;
};

export type PullResult = {
	state: AppState;
	remoteWriteId: string | null;
	merged: boolean;
	/** State מרוחק לפני merge — לשימוש ב-previousState baseline */
	remoteState?: AppState;
};

export type PushResult = {
	writeId: string;
	manifest: ManifestV2;
};

// ─── Normalization (extracted from driveBackupV2.ts) ────────────────────────

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
	return {
		lastActiveTime:
			rawSettings && typeof rawSettings.lastActiveTime === 'number'
				? rawSettings.lastActiveTime
				: now,
		childLockEnabled:
			rawSettings && typeof rawSettings.childLockEnabled === 'boolean'
				? rawSettings.childLockEnabled
				: false
	};
}

// ─── DB interface ────────────────────────────────────────────────────────────

export type SyncDb = {
	getImage(id: string): Promise<Blob | null>;
	saveImage(blob: Blob, id: string): Promise<string | void>;
};

// ─── Pull ────────────────────────────────────────────────────────────────────

/**
 * שלב Pull + Merge.
 * בודק מה יש בענן, מוריד, ומבצע 3-way merge אם נדרש.
 *
 * @returns PullResult עם state הסופי ומידע על merge
 */
export async function pull(
	provider: SyncProvider,
	localState: AppState | null,
	localWriteId: string | null,
	db: SyncDb,
	options?: { now?: number; needsBaseline?: boolean }
): Promise<PullResult> {
	console.log(TAG, 'pull started', { localWriteId, needsBaseline: options?.needsBaseline });
	const now = options?.now ?? Date.now();

	try {
		await provider.initialize();

		// 1. בדיקה מה יש בענן (זול — metadata בלבד)
		const remote = await provider.checkRemote();

		if (!remote) {
			console.log(TAG, 'pull: no remote — first backup');
			return { state: localState!, remoteWriteId: null, merged: false };
		}

		const remoteWriteId = remote.writeId;

		// 2. writeIds זהים → אין שינויים מרוחקים
		// אבל אם needsBaseline=true (סנכרון ראשון בסשן) — מורידים remoteState
		// כדי שה-syncController יוכל לזהות שינויים מקומיים שטרם הועלו
		if (localWriteId && localWriteId === remoteWriteId) {
			if (options?.needsBaseline) {
				console.log(TAG, 'pull: writeIds match, downloading remoteState for baseline');
				try {
					const remoteState = await pullAndBuildState(provider, db, now);
					return { state: localState!, remoteWriteId, merged: false, remoteState };
				} catch (e) {
					console.warn(TAG, 'pull: failed to download baseline remoteState, continuing without', e);
				}
			}
			console.log(TAG, 'pull: writeIds match, no changes');
			return { state: localState!, remoteWriteId, merged: false };
		}

		// 3. הורדת state מרוחק
		const remoteState = await pullAndBuildState(provider, db, now);

		// 4. אין state מקומי → השתמש ב-remote
		if (!localState || !localWriteId) {
			console.log(TAG, 'pull: no local state, using remote');
			return { state: remoteState, remoteWriteId, merged: false };
		}

		// 5. יש שניהם → 3-way merge
		console.log(TAG, 'pull: different writeIds, performing merge...');

		let history: SyncHistory | null = null;
		try {
			history = await provider.pullHistory();
		} catch (e) {
			console.warn(TAG, 'pull: cannot load history, keeping local state', e);
			return { state: localState, remoteWriteId, merged: true };
		}

		if (!history) {
			console.warn(TAG, 'pull: no history found, keeping local state');
			return { state: localState, remoteWriteId, merged: true };
		}

		const ancestor = findCommonAncestor(history, localWriteId, remoteWriteId);

		if (!ancestor.found || !ancestor.state) {
			console.warn(TAG, 'pull: no common ancestor, keeping local state');
			return { state: localState, remoteWriteId, merged: true };
		}

		console.log(TAG, 'pull: common ancestor found', { writeId: ancestor.writeId });

		// merge על historyContent (ללא isDone, lastModified, syncMetadata)
		const mergedContent = threeWayMerge(
			ancestor.state,                    // כבר historyContent (מההיסטוריה)
			toHistoryContent(localState),
			toHistoryContent(remoteState)
		);
		// שחזור ל-AppState מלא
		const mergedState: AppState = {
			...localState,                     // basis: per-device fields
			...(mergedContent as any),
			settings: localState.settings,     // per-device
			lastModified: Math.max(localState.lastModified, remoteState.lastModified),
			syncMetadata: remoteState.syncMetadata
		};
		// החזרת isDone מ-progress (last-write-wins: remote)
		applyProgressToState(mergedState, remoteState);

		console.log(TAG, 'pull: 3-way merge completed');
		return { state: mergedState, remoteWriteId, merged: true, remoteState };
	} catch (e) {
		const category =
			e instanceof Error && e.message.includes('Not authenticated') ? 'auth' : 'network';
		throw new SyncError(`Pull failed: ${e instanceof Error ? e.message : e}`, category, e);
	}
}

/** הורדת content + progress + assets ובניית AppState */
async function pullAndBuildState(
	provider: SyncProvider,
	db: SyncDb,
	now: number
): Promise<AppState> {
	console.log(TAG, 'downloading remote state...');

	const [content, progress, assetsIndex] = await Promise.all([
		provider.pullContent(),
		provider.pullProgress(),
		provider.pullAssets()
	]);

	if (!content) throw new Error('Remote content is missing');

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
		lastModified: now,
		syncMetadata: contentObj.syncMetadata
	};

	// החלת progress
	const taskDone: Record<string, boolean> = (progress as any)?.taskDone || {};
	for (const userId of Object.keys(restored.lists || {})) {
		const userLists = restored.lists[userId] || {};
		for (const list of Object.values(userLists)) {
			for (const task of Object.values((list as any).tasks || {})) {
				(task as any).isDone = !!taskDone[(task as any).id];
			}
		}
	}

	// הורדת assets חסרים
	const neededIdbIds = collectAssetIds(restored);
	const idToHash = (assetsIndex as any)?.idToHash || {};
	const hashToFile = (assetsIndex as any)?.hashToFile || {};

	let restoredCount = 0;
	for (const idbId of neededIdbIds) {
		const existing = await db.getImage(idbId);
		if (existing) continue;

		const hash = idToHash[idbId] as Sha256 | undefined;
		if (!hash || !hashToFile[hash]) {
			console.warn(TAG, 'asset missing in remote index', idbId);
			continue;
		}

		const blob = await provider.downloadMissingAsset(hash);
		await db.saveImage(blob, idbId);
		restoredCount++;
	}

	console.log(TAG, 'remote state downloaded', { assetsRestored: restoredCount });
	return restored;
}

// ─── Push ────────────────────────────────────────────────────────────────────

/**
 * שלב Push.
 * בונה payload, מעדכן history, מעלה לספק, ומבצע commit.
 */
export async function push(
	provider: SyncProvider,
	state: AppState,
	previousState: AppState | null,
	lastKnownWriteId: string | null,
	device: DeviceInfo,
	db: SyncDb,
	options?: {
		forceSnapshot?: boolean;
		now?: number;
		generateWriteId?: () => string;
	}
): Promise<PushResult> {
	console.log(TAG, 'push started', { lastKnownWriteId, forceSnapshot: options?.forceSnapshot });
	const now = options?.now ?? Date.now();
	const generateWriteId = options?.generateWriteId ?? (() => crypto.randomUUID());

	try {
		await provider.initialize();

		// 1. קריאת history (או יצירת ריק)
		let history: SyncHistory;
		try {
			history = (await provider.pullHistory()) ?? createEmptyHistory();
			console.log(TAG, 'history loaded', { entries: history.entries.length });
		} catch (e) {
			console.log(TAG, 'no history found, creating empty');
			history = createEmptyHistory();
		}

		// 2. החלטה: snapshot או delta
		const isSnapshot = options?.forceSnapshot || shouldCreateSnapshot(history);
		console.log(TAG, `entry type: ${isSnapshot ? 'snapshot' : 'delta'}`);

		const writeId = generateWriteId();

		// 3. יצירת history entry (על historyContent — ללא isDone, lastModified, syncMetadata)
		const historyContent = toHistoryContent(state);

		if (isSnapshot) {
			const entry: SnapshotEntry = {
				type: 'snapshot',
				writeId,
				parentWriteId: lastKnownWriteId,
				timestamp: now,
				deviceId: device.deviceId,
				deviceName: device.deviceName,
				state: historyContent
			};
			appendToHistory(history, entry);
		} else {
			if (!previousState) {
				throw new Error('previousState required for delta entry');
			}
			const delta = calculateDelta(toHistoryContent(previousState), historyContent);
			if (!delta) {
				console.log(TAG, 'no changes detected, skipping push');
				throw new Error('No changes to backup');
			}
			const entry: DeltaEntry = {
				type: 'delta',
				writeId,
				parentWriteId: lastKnownWriteId!,
				timestamp: now,
				deviceId: device.deviceId,
				deviceName: device.deviceName,
				delta
			};
			appendToHistory(history, entry);
		}

		// 4. בניית payloads + hashes
		const contentPayload = buildContentPayload(state);
		const progressPayload = buildProgressPayload(state);
		const contentHash = await sha256String(stableStringify(contentPayload));
		const progressHash = await sha256String(stableStringify(progressPayload));

		console.log(TAG, 'hashes calculated', { contentHash, progressHash });

		// 5. טיפול ב-assets
		const currentAssetsIndex = (await provider.pullAssets()) ?? createEmptyAssetsIndex();
		currentAssetsIndex.backupSchemaVersion = CURRENT_BACKUP_SCHEMA_VERSION;

		const assetIds = collectAssetIds(state);
		const newBlobs = new Map<string, Blob>();

		for (const idbId of assetIds) {
			const existingHash = currentAssetsIndex.idToHash[idbId] as Sha256 | undefined;
			if (existingHash && currentAssetsIndex.hashToFile[existingHash]) continue;

			const blob = await db.getImage(idbId);
			if (!blob) {
				console.warn(TAG, 'image missing in local DB', idbId);
				continue;
			}

			const hash = await sha256Blob(blob);
			currentAssetsIndex.idToHash[idbId] = hash;

			if (!currentAssetsIndex.hashToFile[hash]) {
				newBlobs.set(hash, blob);
			}
		}

		const assetsHash = await sha256String(stableStringify(currentAssetsIndex));
		console.log(TAG, `assets: ${newBlobs.size} new blobs`);

		// 6. כתיבות — הספק מחליט פנימית אם צריך network call
		await provider.writeContent(contentPayload, contentHash);
		await provider.writeProgress(progressPayload, progressHash);
		await provider.writeAssets(currentAssetsIndex, newBlobs);
		await provider.writeHistory(history);

		// 7. manifest + commit (תמיד אחרון!)
		const manifest: ManifestV2 = {
			backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
			generatedAt: now,
			syncMetadata: {
				writeId,
				parentWriteId: lastKnownWriteId || undefined,
				lastModified: now,
				lastModifiedByDeviceId: device.deviceId,
				lastModifiedByDeviceName: device.deviceName
			},
			hashes: { contentHash, progressHash, assetsHash },
			files: {
				content: { name: 'daily_schedule_content.json', fileId: '' },
				progress: { name: 'daily_schedule_progress.json', fileId: '' },
				assetsIndex: { name: 'daily_schedule_assets.json', fileId: '' },
				assetsFolder: { name: 'assets', folderId: '' }
			}
		};

		await provider.commit(manifest);

		console.log(TAG, 'push completed', { writeId });
		return { writeId, manifest };
	} catch (e) {
		if (e instanceof Error && e.message === 'No changes to backup') throw e;
		const category =
			e instanceof Error && e.message.includes('Not authenticated') ? 'auth' : 'network';
		throw new SyncError(`Push failed: ${e instanceof Error ? e.message : e}`, category, e);
	}
}

function createEmptyAssetsIndex() {
	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		idToHash: {} as Record<string, Sha256>,
		hashToFile: {} as Record<Sha256, { fileId: string; mimeType: string; size: number }>
	};
}
