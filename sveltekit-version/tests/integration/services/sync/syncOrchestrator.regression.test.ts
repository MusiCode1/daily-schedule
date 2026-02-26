/**
 * בדיקות רגרסיה — syncOrchestrator
 *
 * מטרה: לוודא שהבאגים מ-postmortem sync-bug-2026-02-22 לא חוזרים.
 *
 * ## הבאגים שמכוסים:
 *
 * ### כשל #1 — תנאי רחב מדי ב-syncController
 *   בעיה: `if (!merged)` ירה גם כשwriteIds תואמים, מה שגרם ל-previousState
 *   להתאפס ל-localState → delta=null → push מדולג.
 *   תיקון: הענף מופעל רק כש-`shouldApplyRemoteState=true`.
 *
 * ### כשל #2 — previousState=localState על loadLocalState
 *   בעיה: `previousState = cloneAppState(globalState.state)` → אותו state
 *   כמו stateForUpload → delta=null → push מדולג לכל הנצח.
 *   תיקון:
 *   - `previousState = null` ב-`loadLocalState`
 *   - `pull(needsBaseline=true)` → מוריד remoteState גם כשwriteIds תואמים
 *   - `previousState = remoteState` → delta(remoteState, localState) מזהה שינויים
 *
 * ## קבצים רלוונטיים:
 *   - `src/lib/services/sync/syncOrchestrator.ts` — pull() עם needsBaseline
 *   - `src/lib/logic/syncController.svelte.ts` — loadLocalState, sync()
 *   - `docs/plans/sync-bug-postmortem-2026-02-22.md` — תיעוד מלא של הבאגים
 *   - `tests/integration/services/sync/googleDriveSync.e2e.test.ts` — FakeRemote ועזרים
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState } from '$lib/types';
import type { SyncProvider } from '$lib/services/sync/syncProvider';
import type {
	SyncContent,
	SyncProgress,
	SyncAssetsIndex,
	SyncManifest,
	RemoteMetadata,
	Sha256
} from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';
import {
	pull,
	push,
	toHistoryContent,
	type SyncDb,
	type DeviceInfo
} from '$lib/services/sync/syncOrchestrator';
import { calculateDelta } from '$lib/services/sync/engine/syncEngine';
import { buildProgressPayload } from '$lib/services/sync/payloads';

// ─── FakeRemote ──────────────────────────────────────────────────────────────

/**
 * מדמה ענן בזיכרון.
 * pullContent_calls מאפשר לבדוק האם הורדה בוצעה (needsBaseline).
 */
class FakeRemote implements SyncProvider {
	readonly id = 'fake';

	private content: SyncContent | null = null;
	private progress: SyncProgress | null = null;
	private history: SyncHistory | null = null;
	private assets: SyncAssetsIndex | null = null;
	private manifest: SyncManifest | null = null;

	readonly calls = {
		pullContent: 0,
		pullHistory: 0,
		writeContent: 0,
		commit: 0
	};

	/** שגיאה זמנית לדמות כשלון */
	failOnNext: { pullContent?: boolean; commit?: boolean } = {};

	async initialize(): Promise<void> {}
	async isAvailable(): Promise<boolean> { return true; }

	async checkRemote(): Promise<RemoteMetadata | null> {
		if (!this.manifest) return null;
		const m = this.manifest;
		return {
			writeId: m.syncMetadata.writeId,
			parentWriteId: m.syncMetadata.parentWriteId ?? null,
			contentHash: m.hashes.contentHash,
			progressHash: m.hashes.progressHash,
			assetsHash: m.hashes.assetsHash,
			timestamp: m.generatedAt,
			deviceId: m.syncMetadata.lastModifiedByDeviceId
		};
	}

	async pullContent(): Promise<SyncContent | null> {
		this.calls.pullContent++;
		if (this.failOnNext.pullContent) {
			this.failOnNext.pullContent = false;
			throw new Error('Network error: pullContent failed');
		}
		return this.content;
	}

	async pullProgress(): Promise<SyncProgress | null> {
		return this.progress;
	}

	async pullHistory(): Promise<SyncHistory | null> {
		this.calls.pullHistory++;
		return this.history;
	}

	async pullAssets(): Promise<SyncAssetsIndex | null> {
		return this.assets ?? { backupSchemaVersion: 2, idToHash: {}, hashToFile: {} };
	}

	async downloadMissingAsset(hash: string): Promise<Blob> {
		throw new Error(`Asset not found: ${hash}`);
	}

	async writeContent(payload: SyncContent): Promise<void> {
		this.calls.writeContent++;
		this.content = payload;
	}

	async writeProgress(payload: SyncProgress): Promise<void> {
		this.progress = payload;
	}

	async writeHistory(h: SyncHistory): Promise<void> {
		this.history = JSON.parse(JSON.stringify(h));
	}

	async writeAssets(index: SyncAssetsIndex): Promise<void> {
		this.assets = index;
	}

	async commit(m: SyncManifest): Promise<void> {
		this.calls.commit++;
		if (this.failOnNext.commit) {
			this.failOnNext.commit = false;
			throw new Error('Network error: commit failed');
		}
		this.manifest = m;
	}

	getWriteId(): string | null {
		return this.manifest?.syncMetadata.writeId ?? null;
	}

	hasData(): boolean {
		return this.manifest !== null;
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<AppState> = {}): AppState {
	return {
		version: 16,
		users: { u1: { id: 'u1', name: 'Alice', gender: 'girl', avatar: '', themeColor: '#f00' } },
		people: {},
		lists: {
			u1: {
				list1: {
					id: 'list1',
					name: 'Morning Routine',
					tasks: {
						t1: { id: 't1', name: 'Brush teeth', imageSrc: null, order: 0 },
						t2: { id: 't2', name: 'Get dressed', imageSrc: null, order: 1 }
					}
				}
			}
		},
		images: {},
		taskProgress: {},
		settings: {
			activeListId: { u1: 'list1' },
			currentUserId: 'u1',
			childLockEnabled: false
		},
		localDevice: {
			lastModified: 1000,
			lastActiveTime: 1000
		},
		...overrides
	} as AppState;
}

/** מוסיף task חדש ל-list — מדמה שינוי מקומי */
function addTask(state: AppState, taskId: string, taskName: string): AppState {
	const s = JSON.parse(JSON.stringify(state)) as AppState;
	(s.lists as any).u1.list1.tasks[taskId] = {
		id: taskId,
		name: taskName,
		imageSrc: null,
		order: Object.keys((s.lists as any).u1.list1.tasks).length
	};
	s.localDevice.lastModified = Date.now();
	return s;
}

function makeDb(): SyncDb {
	return {
		getImage: async () => null,
		saveImage: async () => {},
		saveSyncHistory: async () => {},
		getSyncHistory: async () => null,
		deleteSyncHistory: async () => {}
	};
}

function makeDevice(id: string = 'dev-a'): DeviceInfo {
	return { deviceId: id, deviceName: `Device ${id}` };
}

function cloneState(s: AppState): AppState {
	return JSON.parse(JSON.stringify(s));
}

// ─── סיפורי-pull: needsBaseline ──────────────────────────────────────────────

describe('pull() — needsBaseline', () => {
	let remote: FakeRemote;

	beforeEach(async () => {
		remote = new FakeRemote();
		// מבצעים push ראשון כדי ליצור state ב-remote
		const state = makeState();
		await push(remote, state, null, null, makeDevice(), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w-remote-1'
		});
	});

	it('needsBaseline=true כשwriteIds תואמים → pullContent נקרא ו-remoteState מוחזר', async () => {
		const localState = makeState();
		const remoteWriteId = remote.getWriteId()!;

		const result = await pull(remote, localState, remoteWriteId, makeDb(), {
			needsBaseline: true
		});

		// pullContent אמור להיקרא (הורדת remoteState)
		expect(remote.calls.pullContent).toBeGreaterThan(0);
		// remoteState מוחזר
		expect(result.remoteState).toBeDefined();
		// state = localState (אין merge)
		expect(result.merged).toBe(false);
		expect(result.remoteWriteId).toBe(remoteWriteId);
	});

	it('needsBaseline=false (ברירת מחדל) כשwriteIds תואמים → pullContent לא נקרא', async () => {
		const localState = makeState();
		const remoteWriteId = remote.getWriteId()!;

		const callsBefore = remote.calls.pullContent;
		const result = await pull(remote, localState, remoteWriteId, makeDb(), {
			needsBaseline: false
		});

		// לא הורידו content
		expect(remote.calls.pullContent).toBe(callsBefore);
		// אין remoteState
		expect(result.remoteState).toBeUndefined();
		expect(result.merged).toBe(false);
	});

	it('needsBaseline=false (ברירת מחדל) כשwriteIds תואמים → ללא needsBaseline', async () => {
		const localState = makeState();
		const remoteWriteId = remote.getWriteId()!;

		const callsBefore = remote.calls.pullContent;
		const result = await pull(remote, localState, remoteWriteId, makeDb());
		// ללא options בכלל — גם כן לא מוריד
		expect(remote.calls.pullContent).toBe(callsBefore);
		expect(result.remoteState).toBeUndefined();
	});

	it('needsBaseline=true כשאין remote כלל → לא נופל, remoteState=undefined', async () => {
		const emptyRemote = new FakeRemote();
		const localState = makeState();

		const result = await pull(emptyRemote, localState, null, makeDb(), {
			needsBaseline: true
		});

		// first-sync: remoteWriteId=null, state=localState
		expect(result.remoteWriteId).toBeNull();
		expect(result.remoteState).toBeUndefined();
		expect(result.state).toBe(localState);
	});

	it('needsBaseline=true כשwriteIds שונים → merge רגיל (needsBaseline לא משנה)', async () => {
		const localState = makeState();
		// localState עם task חדש שהremote לא יודע עליו
		const localWithChanges = addTask(localState, 't3', 'New task');

		// writeId ישן מוגדר (ידוע ל-remote)
		const remoteWriteId = remote.getWriteId()!;
		// אבל אנחנו מעמידים פנים שה-local כותבה מ-writeId ישן יותר
		const result = await pull(remote, localWithChanges, 'old-write-id', makeDb(), {
			needsBaseline: true
		});

		// writeIds שונים → merge path (לא early return)
		expect(result.remoteWriteId).toBe(remoteWriteId);
		// merged=true (אין common ancestor → fallback)
		expect(result.merged).toBe(true);
	});

	it('needsBaseline=true, pullContent נכשל → ממשיך ללא remoteState (graceful fallback)', async () => {
		const localState = makeState();
		const remoteWriteId = remote.getWriteId()!;

		remote.failOnNext.pullContent = true;

		// לא אמור לזרוק
		const result = await pull(remote, localState, remoteWriteId, makeDb(), {
			needsBaseline: true
		});

		expect(result.remoteState).toBeUndefined();
		expect(result.merged).toBe(false);
		expect(result.state).toBe(localState);
	});
});

// ─── רגרסיה: postmortem כשל #2 ──────────────────────────────────────────────

describe('רגרסיה postmortem כשל #2: previousState=localState → delta אפסי', () => {
	/**
	 * מדמה את ה-sync loop של SyncController.
	 *
	 * SyncController שומר:
	 *   - lastKnownWriteId: מה push/pull אחרון עדכן
	 *   - previousState: ה-baseline לזיהוי שינויים
	 *
	 * הבאג: previousState=localState → delta(localState,localState)=null → לא מעלה.
	 * התיקון: previousState=null → pull(needsBaseline=true) → previousState=remoteState.
	 */
	interface SyncControllerState {
		lastKnownWriteId: string | null;
		previousState: AppState | null; // null = לא אותחל (כמו בתיקון)
	}

	async function runSyncCycle(
		remote: FakeRemote,
		currentLocalState: AppState,
		ctrl: SyncControllerState,
		device: DeviceInfo
	): Promise<{ uploaded: boolean; newWriteId: string | null }> {
		const db = makeDb();
		const needsBaseline = ctrl.previousState === null;

		// PULL
		const pullResult = await pull(remote, currentLocalState, ctrl.lastKnownWriteId, db, {
			needsBaseline
		});

		const remoteWriteId = pullResult.remoteWriteId;
		const mergedFromRemote = pullResult.merged;

		const shouldApplyRemoteState =
			mergedFromRemote || !ctrl.lastKnownWriteId || ctrl.lastKnownWriteId !== remoteWriteId;

		const stateForUpload = pullResult.state;

		if (remoteWriteId) {
			ctrl.lastKnownWriteId = remoteWriteId;
		}

		// עדכון previousState — כמו ב-syncController
		if (!mergedFromRemote && shouldApplyRemoteState) {
			ctrl.previousState = cloneState(stateForUpload);
		} else if (!mergedFromRemote && !shouldApplyRemoteState && pullResult.remoteState) {
			// baseline מה-remote: מנרמלים שדות per-device (lastModified, settings)
			// כי pullAndBuildState מחזיר lastModified=now ו-settings={} → delta פנטום
			const baseline = cloneState(pullResult.remoteState);
			baseline.localDevice.lastModified = stateForUpload.localDevice.lastModified;
			baseline.settings = cloneState(stateForUpload).settings;
			ctrl.previousState = baseline;
		}

		// החלטת upload — כמו ב-syncController: בודקים content + progress
		const hasContentChanges = ctrl.previousState
			? !!calculateDelta(toHistoryContent(ctrl.previousState), toHistoryContent(stateForUpload))
			: true;
		const hasProgressChanges = ctrl.previousState
			? !!calculateDelta(buildProgressPayload(ctrl.previousState), buildProgressPayload(stateForUpload))
			: false;
		const hasLocalChanges = hasContentChanges || hasProgressChanges;
		const shouldUpload = !remoteWriteId || mergedFromRemote || hasLocalChanges;

		if (!shouldUpload) {
			ctrl.previousState = cloneState(stateForUpload);
			return { uploaded: false, newWriteId: null };
		}

		// PUSH
		const pushResult = await push(
			remote,
			stateForUpload,
			ctrl.previousState,
			ctrl.lastKnownWriteId,
			device,
			db,
			{ forceSnapshot: mergedFromRemote || !ctrl.previousState }
		);

		ctrl.lastKnownWriteId = pushResult.writeId;
		ctrl.previousState = cloneState(stateForUpload);

		return { uploaded: true, newWriteId: pushResult.writeId };
	}

	it('תרחיש הבאג: writeIds תואמים + שינויים מקומיים → push מתבצע', async () => {
		const remote = new FakeRemote();
		const device = makeDevice('dev-a');

		// ── הכנה: push ראשוני (בדפדפן אחר/סשן אחר) ──
		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-x'), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});
		const remoteWriteId = remote.getWriteId(); // 'w-base'

		// ── מצב הבאג: loadLocalState עם previousState=localState ──
		// המשתמש פתח את האפליקציה, הנתונים כוללים את baseState
		// אבל גם שינויים מקומיים שלא הועלו (task חדש)
		const localStateWithChanges = addTask(baseState, 't-new', 'New local task');

		// SyncController עם previousState=null (כמו בתיקון)
		const ctrl: SyncControllerState = {
			lastKnownWriteId: remoteWriteId, // מסונכרן ל-w-base
			previousState: null // תיקון: null, לא localState!
		};

		const writeContentBefore = remote.calls.writeContent;
		const result = await runSyncCycle(remote, localStateWithChanges, ctrl, device);

		// push אמור להתבצע!
		expect(result.uploaded).toBe(true);
		expect(remote.calls.writeContent).toBeGreaterThan(writeContentBefore);
		expect(remote.getWriteId()).not.toBe('w-base'); // writeId חדש ב-remote
	});

	it('הבאג הישן: previousState=localState → push לא מתבצע (לוודא שהפיקסצ׳ הכרחי)', async () => {
		const remote = new FakeRemote();
		const device = makeDevice('dev-a');

		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-x'), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});
		const remoteWriteId = remote.getWriteId()!;

		const localStateWithChanges = addTask(baseState, 't-new', 'New local task');

		// BAD: כמו הבאג הישן — previousState=localState
		const ctrlBuggy: SyncControllerState = {
			lastKnownWriteId: remoteWriteId,
			previousState: cloneState(localStateWithChanges) // ← הבאג
		};

		const writeContentBefore = remote.calls.writeContent;
		const result = await runSyncCycle(remote, localStateWithChanges, ctrlBuggy, device);

		// ה-BUG: לא מעלה כי delta(localState, localState) = null
		expect(result.uploaded).toBe(false);
		expect(remote.calls.writeContent).toBe(writeContentBefore);
		// ← זה מוכיח שהתיקון (previousState=null) הכרחי!
	});

	it('writeIds תואמים + אין שינויים מקומיים → לא מעלה (נכון)', async () => {
		const remote = new FakeRemote();
		const device = makeDevice('dev-a');

		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-x'), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});
		const remoteWriteId = remote.getWriteId()!;

		// לוקאל = remote (אותו state בדיוק)
		const ctrl: SyncControllerState = {
			lastKnownWriteId: remoteWriteId,
			previousState: null // needsBaseline יפעל
		};

		const writeContentBefore = remote.calls.writeContent;
		const result = await runSyncCycle(remote, baseState, ctrl, device);

		// אין שינויים → לא מעלה
		expect(result.uploaded).toBe(false);
		expect(remote.calls.writeContent).toBe(writeContentBefore);
		expect(remote.getWriteId()).toBe('w-base'); // writeId ב-remote לא השתנה
	});

	it('לחיצות חוזרות על sync עם שינויים → כולן מזהות שינויים', async () => {
		const remote = new FakeRemote();
		const device = makeDevice('dev-a');

		// push בסיסי
		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-x'), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});

		const localStateWithChanges = addTask(baseState, 't-new', 'New local task');
		const ctrl: SyncControllerState = {
			lastKnownWriteId: remote.getWriteId()!,
			previousState: null
		};

		// לחיצה 1
		const result1 = await runSyncCycle(remote, localStateWithChanges, ctrl, device);
		expect(result1.uploaded).toBe(true);
		const writeId1 = result1.newWriteId!;

		// הוספת שינוי נוסף
		const localStateWithMoreChanges = addTask(localStateWithChanges, 't-new2', 'Another task');

		// לחיצה 2
		const result2 = await runSyncCycle(remote, localStateWithMoreChanges, ctrl, device);
		expect(result2.uploaded).toBe(true);

		// writeIds שונים אחרי כל push
		expect(remote.getWriteId()).not.toBe(writeId1);
	});

	it('אחרי push ראשון, ctrl.previousState מעודכן → delta הבא מזהה רק שינויים חדשים', async () => {
		const remote = new FakeRemote();
		const device = makeDevice('dev-a');

		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-x'), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});

		const localWithTask1 = addTask(baseState, 't-a', 'Task A');
		const ctrl: SyncControllerState = {
			lastKnownWriteId: remote.getWriteId()!,
			previousState: null
		};

		// push ראשון
		await runSyncCycle(remote, localWithTask1, ctrl, device);
		const writeContentAfterFirst = remote.calls.writeContent;

		// sync שני — אותו state, אין שינויים חדשים
		const result2 = await runSyncCycle(remote, localWithTask1, ctrl, device);
		expect(result2.uploaded).toBe(false);
		// content לא הועלה שוב
		expect(remote.calls.writeContent).toBe(writeContentAfterFirst);
	});
});

// ─── רגרסיה: postmortem כשל #1 ──────────────────────────────────────────────

describe('רגרסיה postmortem כשל #1: !merged רחב מדי', () => {
	/**
	 * כשל #1: `if (!merged)` ירה גם כשwriteIds תואמים ו-shouldApplyRemoteState=false.
	 * זה גרם ל-previousState להתאפס ל-localState.
	 * התיקון: `if (!merged && shouldApplyRemoteState)`.
	 */

	it('writeIds תואמים: pull מחזיר remoteState (עם needsBaseline=true)', async () => {
		const remote = new FakeRemote();
		const baseState = makeState();

		await push(remote, baseState, null, null, makeDevice(), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w1'
		});

		// local = base (אין שינויים) — עדיין צריך remoteState לbaseline
		const result = await pull(remote, baseState, 'w1', makeDb(), { needsBaseline: true });

		expect(result.merged).toBe(false);
		expect(result.remoteWriteId).toBe('w1');
		// remoteState מוחזר ← זה מה שאפשר את כשל #1 לא לחזור
		expect(result.remoteState).toBeDefined();
	});

	it('writeIds שונים: merged=true, pull מחזיר remoteState', async () => {
		const remote = new FakeRemote();
		const baseState = makeState();

		await push(remote, baseState, null, null, makeDevice(), makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'w1'
		});

		// localWriteId ישן → writeIds שונים → pull path רגיל
		const localWithChanges = addTask(baseState, 't-local', 'Local only');
		const result = await pull(remote, localWithChanges, 'old-id', makeDb());

		expect(result.merged).toBe(true);
		expect(result.remoteWriteId).toBe('w1');
	});

	it('לאחר שינויי remote ו-local: merge מחזיר שני הצדדים', async () => {
		const remote = new FakeRemote();
		const device1 = makeDevice('dev-1');
		const device2 = makeDevice('dev-2');
		const db = makeDb();

		// שניהם מתחילים מ-base
		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-0'), db, {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});

		// dev-1 מוסיף task ומעלה
		const stateAfterDev1 = addTask(baseState, 't-dev1', 'Dev1 task');
		await push(remote, stateAfterDev1, baseState, 'w-base', device1, db, {
			generateWriteId: () => 'w-dev1'
		});

		// dev-2 עשה שינוי משלו (לא ידע על dev-1)
		const stateAfterDev2Local = addTask(baseState, 't-dev2', 'Dev2 task');

		// dev-2 מעלה — localWriteId='w-base', remoteWriteId='w-dev1' → merge
		const result = await pull(remote, stateAfterDev2Local, 'w-base', db);

		expect(result.merged).toBe(true);
		// המיזוג צריך להכיל את שני ה-tasks
		const mergedTasks = Object.values((result.state.lists as any).u1.list1.tasks);
		const taskIds = mergedTasks.map((t: any) => t.id);
		expect(taskIds).toContain('t-dev1');
		expect(taskIds).toContain('t-dev2');
	});
});

// ─── תרחיש משולב: מחזור חיים מלא ────────────────────────────────────────────

describe('מחזור חיים מלא — שני דפדפנים', () => {
	it('Browser1 שינה, Browser2 מקבל — גם אחרי רענון דף (previousState=null)', async () => {
		const remote = new FakeRemote();
		const deviceA = makeDevice('dev-a');
		const deviceB = makeDevice('dev-b');
		const db = makeDb();

		// ── שלב 1: Push ראשוני מ-dev-a ──
		const initialState = makeState();
		await push(remote, initialState, null, null, deviceA, db, {
			forceSnapshot: true,
			generateWriteId: () => 'w0'
		});

		// ── שלב 2: Dev-a מוסיף task, מסנכרן (כמו syncController עם previousState=null) ──
		const stateWithNewTask = addTask(initialState, 't-new', 'Task from A');
		const ctrlA: { lastKnownWriteId: string | null; previousState: AppState | null } = {
			lastKnownWriteId: 'w0',
			previousState: null // ← כמו בתיקון
		};

		// pull (needsBaseline=true כי previousState=null)
		const pullA = await pull(remote, stateWithNewTask, ctrlA.lastKnownWriteId, db, {
			needsBaseline: true
		});
		// writeIds תואמים → remoteState מוחזר
		expect(pullA.remoteState).toBeDefined();
		// previousState = remoteState
		ctrlA.previousState = cloneState(pullA.remoteState!);

		// delta מזהה שינוי
		const delta = calculateDelta(ctrlA.previousState, stateWithNewTask);
		expect(delta).not.toBeNull();

		// push
		const pushA = await push(
			remote,
			stateWithNewTask,
			ctrlA.previousState,
			ctrlA.lastKnownWriteId,
			deviceA,
			db,
			{ generateWriteId: () => 'w1' }
		);
		ctrlA.lastKnownWriteId = pushA.writeId;
		ctrlA.previousState = cloneState(stateWithNewTask);
		expect(remote.getWriteId()).toBe('w1');

		// ── שלב 3: Dev-b פותח את האפליקציה (lastKnownWriteId='w0', previousState=null) ──
		const ctrlB: { lastKnownWriteId: string | null; previousState: AppState | null } = {
			lastKnownWriteId: 'w0', // מסונכרן לפני שינוי A
			previousState: null
		};

		// pull של B (writeIds שונים: 'w0' vs 'w1')
		const pullB = await pull(remote, initialState, ctrlB.lastKnownWriteId, db, {
			needsBaseline: true
		});

		expect(pullB.remoteWriteId).toBe('w1');
		// B מקבל state מרוחק עם task החדש
		const tasksInPulledState = Object.values((pullB.state.lists as any).u1.list1.tasks);
		const taskIds = tasksInPulledState.map((t: any) => t.id);
		expect(taskIds).toContain('t-new'); // ← השינוי של A הגיע ל-B!
	});

	it('push נכשל ב-commit → lastKnownWriteId לא מתעדכן, retry יצליח', async () => {
		const remote = new FakeRemote();
		const device = makeDevice('dev-a');
		const db = makeDb();

		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-x'), db, {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});

		const localWithChanges = addTask(baseState, 't-new', 'New task');
		let lastKnownWriteId: string | null = 'w-base';

		// ניסיון 1 — commit נכשל
		remote.failOnNext.commit = true;
		let pushError: Error | null = null;
		try {
			await push(remote, localWithChanges, baseState, lastKnownWriteId, device, db, {
				forceSnapshot: true,
				generateWriteId: () => 'w-attempt1'
			});
		} catch (e) {
			pushError = e as Error;
		}
		expect(pushError).not.toBeNull(); // push זרק שגיאה
		expect(remote.getWriteId()).toBe('w-base'); // remote לא השתנה

		// ניסיון 2 — מצליח
		await push(remote, localWithChanges, baseState, lastKnownWriteId, device, db, {
			forceSnapshot: true,
			generateWriteId: () => 'w-attempt2'
		});
		expect(remote.getWriteId()).toBe('w-attempt2'); // remote עודכן
	});

	it('שלושה מכשירים: שינויים מקבילים → merge מביא הכל', async () => {
		const remote = new FakeRemote();
		const db = makeDb();

		// ── Push בסיסי ──
		const baseState = makeState();
		await push(remote, baseState, null, null, makeDevice('dev-0'), db, {
			forceSnapshot: true,
			generateWriteId: () => 'w-base'
		});

		// ── Dev-A מוסיף task ומעלה ──
		const stateA = addTask(baseState, 't-a', 'Task A');
		await push(remote, stateA, baseState, 'w-base', makeDevice('dev-a'), db, {
			generateWriteId: () => 'w-a'
		});

		// ── Dev-B מוסיף task אחר (לא ידע על A) ──
		const stateB = addTask(baseState, 't-b', 'Task B');
		const pullB = await pull(remote, stateB, 'w-base', db);
		expect(pullB.merged).toBe(true); // merge עם שינוי A
		await push(remote, pullB.state, stateB, 'w-a', makeDevice('dev-b'), db, {
			forceSnapshot: true,
			generateWriteId: () => 'w-b'
		});

		// ── Dev-C מוריד — צריך לקבל את כולם ──
		const pullC = await pull(remote, baseState, null, db);
		const tasks = Object.values((pullC.state.lists as any).u1.list1.tasks);
		const taskIds = tasks.map((t: any) => t.id);
		expect(taskIds).toContain('t-a');
		expect(taskIds).toContain('t-b');
	});
});
