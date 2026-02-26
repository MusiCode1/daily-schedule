import type { AppState } from '$lib/types';
import type { SyncProvider } from './syncProvider';
import type { SyncHistory, SnapshotEntry, DeltaEntry } from './engine/types';
import type { SyncManifest, SyncProgress, Sha256 } from './syncTypes';
import { SyncError } from './syncTypes';
import { CURRENT_BACKUP_SCHEMA_VERSION, INITIAL_WRITE_ID } from './constants';
import {
	calculateDelta,
	threeWayMerge
} from './engine/syncEngine';
import {
	createEmptyHistory,
	shouldCreateSnapshot,
	appendToHistory,
	findCommonAncestor,
	mergeHistories
} from './engine/historyManager';
import { buildContentPayload, buildProgressPayload, collectAssetIds } from './payloads';
import { sha256String, sha256Blob, stableStringify } from './crypto';

const TAG = '[SyncOrchestrator]';

/**
 * ממיר AppState ל-historyContent — מפשיט שדות device-local (lastModified, syncMetadata)
 * כדי שההיסטוריה תכיל רק נתונים מבניים (בהתאם לתכנון עם SyncContent).
 * @param state - מצב האפליקציה המלא
 * @returns אובייקט תוכן מבני ללא שדות ספציפיים למכשיר
 */
export function toHistoryContent(state: AppState): Record<string, any> {
	return {
		version: state.version,
		users: state.users,
		people: state.people,
		lists: state.lists,
		images: state.images,
		settings: {
			activeListId: state.settings?.activeListId ?? {},
			currentUserId: state.settings?.currentUserId ?? null,
			childLockEnabled: state.settings?.childLockEnabled ?? false
		}
	};
}

/**
 * מחיל progress מ-source state על target state (last-write-wins)
 */
function applyProgressToState(target: AppState, source: AppState): void {
	target.taskProgress = { ...target.taskProgress, ...source.taskProgress };
}

/** מחילה progress מרוחק (SyncProgress.taskDone) על AppState — last-write-wins */
function applyRemoteProgress(state: AppState, progress: SyncProgress): void {
	const taskDone: Record<string, boolean> = progress.taskDone || {};
	state.taskProgress = { ...state.taskProgress, ...taskDone };
}

/** מידע מזהה על המכשיר המבצע את הסנכרון */
export type DeviceInfo = {
	/** מזהה ייחודי של המכשיר */
	deviceId: string;
	/** שם תצוגה של המכשיר */
	deviceName: string;
};

/**
 * תוצאת פעולת Pull — מכילה את ה-state הסופי ומטא-דאטה על תהליך הסנכרון.
 */
export type PullResult = {
	/** ה-state הסופי לאחר pull (לאחר merge אם בוצע) */
	state: AppState;
	/** מזהה הכתיבה המרוחק, או null אם אין גיבוי בענן */
	remoteWriteId: string | null;
	/** האם בוצע merge בין state מקומי למרוחק */
	merged: boolean;
	/** State מרוחק לפני merge — לשימוש כ-previousState baseline בפעולת push הבאה */
	remoteState?: AppState;
	/** סוג קונפליקט — 'no-ancestor' כאשר אין common ancestor בהיסטוריה */
	conflictType?: 'no-ancestor';
};

/**
 * תוצאת פעולת Push — מכילה את מזהה הכתיבה החדש וה-manifest שנוצר.
 */
export type PushResult = {
	/** מזהה הכתיבה שנוצר עבור ה-push */
	writeId: string;
	/** ה-manifest שנכתב לענן, כולל hashes ומטא-דאטה */
	manifest: SyncManifest;
};

// ─── Normalization ──────────────────────────────────────────────────────────

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

function normalizeSettings(rawSettings: any): AppState['settings'] {
	// תמיכה בפורמט ישן (activeListId/currentUserId ב-top-level של content) ובפורמט חדש (בתוך settings)
	return {
		activeListId:
			rawSettings && typeof rawSettings.activeListId === 'object'
				? rawSettings.activeListId
				: {},
		currentUserId:
			rawSettings && 'currentUserId' in rawSettings
				? rawSettings.currentUserId
				: null,
		childLockEnabled:
			rawSettings && typeof rawSettings.childLockEnabled === 'boolean'
				? rawSettings.childLockEnabled
				: false
	};
}

// ─── DB interface ────────────────────────────────────────────────────────────

/**
 * ממשק לגישה למסד הנתונים המקומי (IndexedDB).
 * משמש את ה-orchestrator לקריאה וכתיבה של assets והיסטוריית סנכרון.
 */
export type SyncDb = {
	/** שליפת תמונה לפי מזהה IDB */
	getImage(id: string): Promise<Blob | null>;
	/** שמירת תמונה במסד הנתונים המקומי */
	saveImage(blob: Blob, id: string): Promise<string | void>;
	/** שמירת היסטוריית סנכרון מקומית */
	saveSyncHistory(history: SyncHistory): Promise<void>;
	/** קריאת היסטוריית סנכרון מקומית */
	getSyncHistory(): Promise<SyncHistory | null>;
	/** מחיקת היסטוריית סנכרון מקומית */
	deleteSyncHistory(): Promise<void>;
};

// ─── Pull ────────────────────────────────────────────────────────────────────

/**
 * שלב Pull + Merge.
 * בודק מה יש בענן, מוריד את ה-state המרוחק, ומבצע 3-way merge אם נדרש.
 * כולל אופטימיזציות: דילוג כש-writeIds זהים, הורדת progress בלבד כשרק הוא השתנה.
 *
 * @param provider - ספק הסנכרון (למשל Google Drive)
 * @param localState - ה-state המקומי הנוכחי, או null אם אין
 * @param localWriteId - מזהה הכתיבה המקומי האחרון, או null
 * @param db - ממשק מסד נתונים מקומי לגישה לתמונות
 * @param options - אפשרויות נוספות: now (timestamp), needsBaseline (לטעינת remoteState כ-baseline)
 * @returns תוצאת Pull עם ה-state הסופי ומידע על merge
 * @throws {SyncError} בעת שגיאת רשת או אימות
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

		// 2. writeIds זהים → אין שינויי תוכן מרוחקים
		if (localWriteId && localWriteId === remoteWriteId) {
			// בדיקת progress: האם ה-progressHash השתנה?
			const localPH = await sha256String(stableStringify(buildProgressPayload(localState!)));
			if (localPH !== remote.progressHash) {
				console.log(TAG, 'pull: writeIds match but progressHash differs, downloading progress');
				const progress = await provider.pullProgress();
				if (progress) {
					applyRemoteProgress(localState!, progress);
				}
			}

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

		// 3. אופטימיזציה: שני מכשירים חדשים — ענן מכיל רק מצב ברירת מחדל
		if (!localWriteId && remoteWriteId === INITIAL_WRITE_ID) {
			console.log(TAG, 'pull: remote is INITIAL_WRITE_ID, local is fresh — skipping download');
			return { state: localState!, remoteWriteId, merged: false };
		}

		// 4. הורדת state מרוחק
		const remoteState = await pullAndBuildState(provider, db, now);

		// 5. אין state מקומי → השתמש ב-remote
		if (!localState || !localWriteId) {
			console.log(TAG, 'pull: no local state, using remote');
			return { state: remoteState, remoteWriteId, merged: false };
		}

		// 6. יש שניהם → 3-way merge
		console.log(TAG, 'pull: different writeIds, performing merge...');

		// 6a. טעינת היסטוריה — remote + local, מיזוג
		let remoteHistory: SyncHistory | null = null;
		try {
			remoteHistory = await provider.pullHistory();
		} catch (e) {
			console.warn(TAG, 'pull: cannot load remote history', e);
		}

		let localHistory: SyncHistory | null = null;
		try {
			localHistory = await db.getSyncHistory();
		} catch (e) {
			console.warn(TAG, 'pull: cannot load local history', e);
		}

		// מיזוג: remote + local
		let history: SyncHistory | null = null;
		if (remoteHistory && localHistory) {
			history = mergeHistories(localHistory, remoteHistory);
		} else {
			history = remoteHistory ?? localHistory;
		}

		if (!history) {
			console.warn(TAG, 'pull: no history found, keeping local state');
			return { state: localState, remoteWriteId, merged: true, conflictType: 'no-ancestor' };
		}

		// שמירת ההיסטוריה המאוחדת מקומית
		try {
			await db.saveSyncHistory(history);
		} catch (e) {
			console.warn(TAG, 'pull: failed to save merged history locally', e);
		}

		const ancestor = findCommonAncestor(history, localWriteId, remoteWriteId);

		if (!ancestor.found || !ancestor.state) {
			console.warn(TAG, 'pull: no common ancestor, keeping local state');
			return { state: localState, remoteWriteId, merged: true, conflictType: 'no-ancestor' };
		}

		console.log(TAG, 'pull: common ancestor found', { writeId: ancestor.writeId });

		// merge על historyContent (ללא device-local fields)
		const mergedContent = threeWayMerge(
			ancestor.state,
			toHistoryContent(localState),
			toHistoryContent(remoteState)
		);
		// שחזור ל-AppState מלא
		const mergedState: AppState = {
			...(mergedContent as any),
			taskProgress: { ...localState.taskProgress, ...remoteState.taskProgress },
			localDevice: {
				lastModified: Math.max(
					localState.localDevice.lastModified,
					remoteState.localDevice.lastModified
				),
				lastActiveTime: localState.localDevice.lastActiveTime,
				syncMetadata: remoteState.localDevice.syncMetadata
			}
		};

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

	// תמיכה בפורמט ישן: activeListId/currentUserId ב-top-level ← העברה ל-settings
	const settingsSource = contentObj.settings || {};
	if (contentObj.activeListId && !settingsSource.activeListId) {
		settingsSource.activeListId = contentObj.activeListId;
	}
	if ('currentUserId' in contentObj && !('currentUserId' in settingsSource)) {
		settingsSource.currentUserId = contentObj.currentUserId;
	}

	const taskDone: Record<string, boolean> = (progress as any)?.taskDone || {};

	const restored: AppState = {
		version: contentObj.appStateVersion ?? contentObj.version ?? 14,
		users: normalizeUsersMap(contentObj.users),
		people: normalizePeopleMap(contentObj.people),
		lists: normalizeListsMap(contentObj.lists),
		images: contentObj.images || {},
		taskProgress: taskDone,
		settings: normalizeSettings(settingsSource),
		localDevice: {
			lastModified: now,
			lastActiveTime: now,
			syncMetadata: contentObj.syncMetadata
		}
	};

	// הורדת assets חסרים
	const neededIdbIds = collectAssetIds(restored);
	const idToHash = (assetsIndex as any)?.idToHash || {};
	const hashToFile = (assetsIndex as any)?.hashToFile || {};

	console.log(TAG, 'assets restore:', {
		needed: neededIdbIds.length,
		idToHashKeys: Object.keys(idToHash).length,
		hashToFileKeys: Object.keys(hashToFile).length
	});

	let restoredCount = 0;
	let skippedExisting = 0;
	let skippedMissing = 0;
	for (const idbId of neededIdbIds) {
		const existing = await db.getImage(idbId);
		if (existing) {
			skippedExisting++;
			continue;
		}

		const hash = idToHash[idbId] as Sha256 | undefined;
		if (!hash || !hashToFile[hash]) {
			skippedMissing++;
			console.warn(TAG, 'asset missing in remote index', idbId, { hash, inHashToFile: !!hashToFile[hash!] });
			continue;
		}

		const blob = await provider.downloadMissingAsset(hash);
		await db.saveImage(blob, idbId);
		restoredCount++;
	}

	console.log(TAG, 'remote state downloaded', { assetsRestored: restoredCount, skippedExisting, skippedMissing });
	return restored;
}

// ─── Import (ללא merge — בניית state ישירה מספק) ─────────────────────────────

/**
 * ייבוא state מספק סנכרון — ללא merge, בונה AppState חדש מה-provider.
 * שימוש: file import, שחזור מגיבוי.
 */
export async function importFromProvider(
	provider: SyncProvider,
	db: SyncDb,
	options?: { now?: number }
): Promise<AppState> {
	const now = options?.now ?? Date.now();
	return pullAndBuildState(provider, db, now);
}

// ─── Push ────────────────────────────────────────────────────────────────────

/**
 * שלב Push — העלאת state מקומי לענן.
 * בונה payload (content + progress + assets), מעדכן את ההיסטוריה ברשומה חדשה
 * (snapshot או delta לפי הצורך), מעלה הכל לספק הסנכרון, ומבצע commit עם manifest.
 *
 * @param provider - ספק הסנכרון (למשל Google Drive)
 * @param state - ה-state המקומי הנוכחי להעלאה
 * @param previousState - ה-state הקודם (נדרש ליצירת delta), או null
 * @param lastKnownWriteId - מזהה הכתיבה האחרון הידוע, או null
 * @param device - מידע מזהה על המכשיר המבצע את הסנכרון
 * @param db - ממשק מסד נתונים מקומי לגישה לתמונות
 * @param options - אפשרויות: forceSnapshot (כפיית snapshot), now (timestamp), generateWriteId (פונקציית יצירת מזהה)
 * @returns תוצאת Push עם writeId ו-manifest
 * @throws {Error} אם אין שינויים לגבות ("No changes to backup")
 * @throws {SyncError} בעת שגיאת רשת או אימות
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

		// 0. נעילה (אם הספק תומך)
		let lockNonce: string | undefined;
		if (provider.acquireLock) {
			console.log(TAG, 'acquiring lock...');
			const lockResult = await provider.acquireLock(device);
			if (!lockResult.acquired) {
				throw new SyncError(
					`Push blocked: locked by "${lockResult.holder || 'unknown'}"`,
					'conflict'
				);
			}
			lockNonce = lockResult.nonce;

			// write-then-verify: ודא שהנעילה עדיין שלנו
			if (provider.verifyLock && lockNonce) {
				const verified = await provider.verifyLock(lockNonce);
				if (!verified) {
					throw new SyncError('Push blocked: lock was overridden', 'conflict');
				}
			}
			console.log(TAG, 'lock acquired', { nonce: lockNonce });
		}

		try {
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

		// 3. יצירת history entry (על historyContent — ללא device-local fields)
		const historyContent = toHistoryContent(state);

		let writeId: string;

		if (isSnapshot) {
			writeId = generateWriteId();
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
			const contentDelta = calculateDelta(toHistoryContent(previousState), historyContent);

			if (contentDelta) {
				writeId = generateWriteId();
				const entry: DeltaEntry = {
					type: 'delta',
					writeId,
					parentWriteId: lastKnownWriteId!,
					timestamp: now,
					deviceId: device.deviceId,
					deviceName: device.deviceName,
					delta: contentDelta
				};
				appendToHistory(history, entry);
			} else {
				// אין שינויי תוכן — בדיקת progress
				const progressDelta = calculateDelta(
					buildProgressPayload(previousState),
					buildProgressPayload(state)
				);
				if (!progressDelta) {
					console.log(TAG, 'no changes detected, skipping push');
					throw new Error('No changes to backup');
				}
				// progress-only: שימוש חוזר ב-writeId הקיים
				if (lastKnownWriteId) {
					writeId = lastKnownWriteId;
				} else {
					writeId = generateWriteId();
					const entry: SnapshotEntry = {
						type: 'snapshot',
						writeId,
						parentWriteId: null,
						timestamp: now,
						deviceId: device.deviceId,
						deviceName: device.deviceName,
						state: historyContent
					};
					appendToHistory(history, entry);
				}
				console.log(TAG, 'progress-only changes, reusing writeId:', writeId);
			}
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

		// 6. כתיבות
		await provider.writeContent(contentPayload, contentHash);
		await provider.writeProgress(progressPayload, progressHash);
		await provider.writeAssets(currentAssetsIndex, newBlobs);
		await provider.writeHistory(history);

		// 6b. שמירת היסטוריה מקומית (fallback למצב offline)
		try {
			await db.saveSyncHistory(history);
		} catch (e) {
			console.warn(TAG, 'failed to save history locally (non-fatal)', e);
		}

		// 7. manifest + commit (תמיד אחרון!)
		const manifest: SyncManifest = {
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
		} finally {
			// שחרור lock (גם אם push נכשל)
			if (provider.releaseLock && lockNonce) {
				try {
					await provider.releaseLock();
					console.log(TAG, 'lock released');
				} catch (lockErr) {
					console.warn(TAG, 'failed to release lock (non-fatal)', lockErr);
				}
			}
		}
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

// ─── Delete History API ──────────────────────────────────────────────────────

/**
 * מחיקת היסטוריית סנכרון — מקומית ומרוחקת.
 * לאחר מחיקה, מכשירים אחרים יקבלו conflictType: 'no-ancestor' בסנכרון הבא.
 * @param provider - ספק הסנכרון
 * @param db - ממשק מסד נתונים מקומי
 */
export async function deleteHistory(provider: SyncProvider, db: SyncDb): Promise<void> {
	console.log(TAG, 'deleteHistory: clearing local + remote history');

	// מחיקה מקומית
	try {
		await db.deleteSyncHistory();
	} catch (e) {
		console.warn(TAG, 'deleteHistory: failed to clear local history', e);
	}

	// מחיקה מרוחקת — כתיבת היסטוריה ריקה
	try {
		await provider.initialize();
		await provider.writeHistory(createEmptyHistory());
	} catch (e) {
		console.warn(TAG, 'deleteHistory: failed to clear remote history', e);
	}

	console.log(TAG, 'deleteHistory: done');
}
