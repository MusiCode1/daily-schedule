/**
 * בדיקת סנכרון בין 2 מכשירים על אותו אחסון משותף (in-memory).
 *
 * הרעיון: InMemorySyncProvider מדמה "תיקייה" משותפת.
 * שני מופעים (deviceA, deviceB) קוראים/כותבים לאותו store,
 * בדיוק כמו שני מכשירים שניגשים לאותו Google Drive.
 */
import { describe, expect, it } from 'vitest';
import type { AppState } from '$lib/types';
import type { SyncProvider } from '$lib/services/sync/syncProvider';
import type { SyncContent, SyncProgress, SyncAssetsIndex, SyncManifest, RemoteMetadata, Sha256 } from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';
import { pull, push, type SyncDb, type DeviceInfo, type PullResult, type PushResult } from '$lib/services/sync/syncOrchestrator';

// ─── אחסון משותף בזיכרון ──────────────────────────────────────────────────

type SharedStorage = {
	content: SyncContent | null;
	progress: SyncProgress | null;
	history: SyncHistory | null;
	assets: SyncAssetsIndex | null;
	manifest: SyncManifest | null;
	assetBlobs: Map<string, Blob>;
};

function createSharedStorage(): SharedStorage {
	return {
		content: null,
		progress: null,
		history: null,
		assets: null,
		manifest: null,
		assetBlobs: new Map()
	};
}

// ─── InMemorySyncProvider ─────────────────────────────────────────────────

function createInMemoryProvider(storage: SharedStorage, providerId: string): SyncProvider {
	return {
		id: providerId,

		async initialize() { /* no-op */ },
		async isAvailable() { return true; },

		async checkRemote(): Promise<RemoteMetadata | null> {
			if (!storage.manifest) return null;
			const m = storage.manifest;
			return {
				writeId: m.syncMetadata.writeId,
				parentWriteId: m.syncMetadata.parentWriteId ?? null,
				contentHash: m.hashes.contentHash,
				progressHash: m.hashes.progressHash,
				assetsHash: m.hashes.assetsHash,
				timestamp: m.syncMetadata.lastModified,
				deviceId: m.syncMetadata.lastModifiedByDeviceId
			};
		},

		async pullContent() { return storage.content ? structuredClone(storage.content) : null; },
		async pullProgress() { return storage.progress ? structuredClone(storage.progress) : null; },
		async pullHistory() { return storage.history ? structuredClone(storage.history) : null; },
		async pullAssets() { return storage.assets ? structuredClone(storage.assets) : null; },

		async downloadMissingAsset(hash: string): Promise<Blob> {
			const blob = storage.assetBlobs.get(hash);
			if (!blob) throw new Error(`Asset not found: ${hash}`);
			return blob;
		},

		async writeContent(payload: SyncContent, _hash: string) {
			storage.content = structuredClone(payload);
		},
		async writeProgress(payload: SyncProgress, _hash: string) {
			storage.progress = structuredClone(payload);
		},
		async writeHistory(history: SyncHistory) {
			storage.history = structuredClone(history);
		},
		async writeAssets(index: SyncAssetsIndex, newBlobs: Map<string, Blob>) {
			storage.assets = structuredClone(index);
			for (const [hash, blob] of newBlobs) {
				storage.assetBlobs.set(hash, blob);
			}
		},
		async commit(manifest: SyncManifest) {
			storage.manifest = structuredClone(manifest);
		}
	};
}

// ─── Mock DB (ללא תמונות) ────────────────────────────────────────────────

function createMockDb(): SyncDb {
	return {
		async getImage() { return null; },
		async saveImage() { },
		async saveSyncHistory() { },
		async getSyncHistory() { return null; },
		async deleteSyncHistory() { }
	};
}

// ─── יצירת AppState ──────────────────────────────────────────────────────

let writeCounter = 0;

function makeState(overrides?: Partial<AppState>): AppState {
	return {
		version: 16,
		users: { u1: { id: 'u1', name: 'ילד', gender: 'boy', avatar: '', themeColor: '#3b82f6' } },
		people: {},
		lists: {
			u1: {
				list1: {
					id: 'list1',
					name: 'לוח יומי',
					tasks: {
						t1: { id: 't1', name: 'ארוחת בוקר', imageSrc: null, order: 0 },
						t2: { id: 't2', name: 'צחצוח שיניים', imageSrc: null, order: 1 },
						t3: { id: 't3', name: 'לבישת בגדים', imageSrc: null, order: 2 }
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

function nextWriteId(): string {
	return `w-${++writeCounter}`;
}

// ─── ישות "מכשיר" — עוטפת state + writeId ──────────────────────────────

type Device = {
	info: DeviceInfo;
	provider: SyncProvider;
	db: SyncDb;
	state: AppState;
	writeId: string | null;
	previousState: AppState | null;
};

function createDevice(name: string, storage: SharedStorage, initialState: AppState): Device {
	return {
		info: { deviceId: `device-${name}`, deviceName: name },
		provider: createInMemoryProvider(storage, `mem-${name}`),
		db: createMockDb(),
		state: structuredClone(initialState),
		writeId: null,
		previousState: null
	};
}

/** מכשיר מבצע pull — מעדכן את ה-state המקומי שלו */
async function devicePull(device: Device): Promise<PullResult> {
	const result = await pull(
		device.provider,
		device.state,
		device.writeId,
		device.db
	);

	device.previousState = structuredClone(result.state);
	device.state = result.state;
	if (result.remoteWriteId) {
		device.writeId = result.remoteWriteId;
	}
	return result;
}

/** מכשיר מבצע push — מעלה את ה-state שלו */
async function devicePush(device: Device, forceSnapshot = false): Promise<PushResult> {
	const result = await push(
		device.provider,
		device.state,
		device.previousState,
		device.writeId,
		device.info,
		device.db,
		{
			forceSnapshot: forceSnapshot || device.writeId === null,
			now: Date.now(),
			generateWriteId: nextWriteId
		}
	);

	device.writeId = result.writeId;
	device.previousState = structuredClone(device.state);
	return result;
}

/** pull + push מלא (סנכרון שלם) — מדלג על push אם אין שינויים מקומיים */
async function deviceSync(device: Device): Promise<{ pull: PullResult; push: PushResult | null }> {
	const pullResult = await devicePull(device);
	try {
		const pushResult = await devicePush(device, pullResult.merged);
		return { pull: pullResult, push: pushResult };
	} catch (e) {
		if (e instanceof Error && e.message === 'No changes to backup') {
			return { pull: pullResult, push: null };
		}
		throw e;
	}
}

// ─── Helper: קריאת שם משימה ─────────────────────────────────────────────

function getTaskName(state: AppState, taskId: string): string | undefined {
	return (state.lists.u1?.list1?.tasks?.[taskId] as any)?.name;
}

function getTaskDone(state: AppState, taskId: string): boolean {
	return state.taskProgress[taskId] ?? false;
}

function getTaskIds(state: AppState): string[] {
	return Object.keys(state.lists.u1?.list1?.tasks ?? {});
}

// ─── הבדיקות ─────────────────────────────────────────────────────────────

describe('סנכרון בין 2 מכשירים (integration)', () => {
	it('מכשיר A כותב, מכשיר B מושך — B מקבל את הנתונים', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// A כותב לאחסון
		await devicePush(deviceA, true);

		// B מושך
		const pullResult = await devicePull(deviceB);

		expect(pullResult.merged).toBe(false);
		expect(getTaskName(deviceB.state, 't1')).toBe('ארוחת בוקר');
		expect(getTaskName(deviceB.state, 't2')).toBe('צחצוח שיניים');
		expect(getTaskName(deviceB.state, 't3')).toBe('לבישת בגדים');
		expect(getTaskIds(deviceB.state).length).toBe(3);
	});

	it('A משנה שם משימה, B מושך ורואה את השינוי', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני — A כותב
		await devicePush(deviceA, true);

		// B מושך ומסנכרן כדי שיהיה לו writeId
		await deviceSync(deviceB);

		// A משנה שם משימה
		(deviceA.state.lists.u1.list1.tasks.t1 as any).name = 'ארוחת בוקר מזינה';
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B מושך ורואה את השינוי
		await devicePull(deviceB);

		expect(getTaskName(deviceB.state, 't1')).toBe('ארוחת בוקר מזינה');
	});

	it('A מסמן משימה כבוצעה (isDone) עם שינוי תוכן, B מושך ורואה', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני
		await devicePush(deviceA, true);
		await deviceSync(deviceB);

		// A מסמן taskProgress + שינוי תוכן (שניהם ביחד — תרחיש ריאליסטי)
		deviceA.state.taskProgress['t2'] = true;
		(deviceA.state.lists.u1.list1.tasks.t2 as any).name = 'צחצוח שיניים בקפידה';
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B מושך
		await devicePull(deviceB);

		expect(getTaskDone(deviceB.state, 't2')).toBe(true);
		expect(getTaskName(deviceB.state, 't2')).toBe('צחצוח שיניים בקפידה');
		// שאר המשימות נשארות false
		expect(getTaskDone(deviceB.state, 't1')).toBe(false);
		expect(getTaskDone(deviceB.state, 't3')).toBe(false);
	});

	it('A מסמן isDone בלבד (progress-only), B מושך ורואה', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני
		await devicePush(deviceA, true);
		await deviceSync(deviceB);

		// A מסמן taskProgress בלבד (ללא שינוי תוכן)
		deviceA.state.taskProgress['t2'] = true;
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B מושך — writeIds תואמים, progress מתעדכן דרך progressHash
		const pullResult = await devicePull(deviceB);

		expect(pullResult.merged).toBe(false); // לא צריך merge — writeIds תואמים
		expect(getTaskDone(deviceB.state, 't2')).toBe(true);
		// שאר המשימות נשארות false
		expect(getTaskDone(deviceB.state, 't1')).toBe(false);
		expect(getTaskDone(deviceB.state, 't3')).toBe(false);
	});

	it('progress הלוך-חזור: A מסמן t1, B מושך, B מסמן t2, A מושך — שניהם רואים הכל', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני
		await devicePush(deviceA, true);
		await deviceSync(deviceB);

		// A מסמן t1
		deviceA.state.taskProgress['t1'] = true;
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B מושך — רואה t1 מסומן
		await devicePull(deviceB);
		expect(getTaskDone(deviceB.state, 't1')).toBe(true);

		// B מסמן t2
		deviceB.state.taskProgress['t2'] = true;
		deviceB.state.localDevice.lastModified = Date.now();
		await devicePush(deviceB);

		// A מושך — רואה t2 מסומן (ו-t1 שלו נשאר)
		await devicePull(deviceA);
		expect(getTaskDone(deviceA.state, 't1')).toBe(true);
		expect(getTaskDone(deviceA.state, 't2')).toBe(true);
	});

	it('A מוסיף משימה, B מוסיף משימה אחרת — merge מצליח', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני
		await devicePush(deviceA, true);
		await deviceSync(deviceB);

		// A מוסיף משימה t4
		(deviceA.state.lists.u1.list1.tasks as any).t4 = {
			id: 't4', name: 'שיעורי בית', imageSrc: null, isDone: false, order: 3
		};
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B מוסיף משימה t5 (עדיין לא ראה את t4)
		(deviceB.state.lists.u1.list1.tasks as any).t5 = {
			id: 't5', name: 'אמבטיה', imageSrc: null, isDone: false, order: 3
		};
		deviceB.state.localDevice.lastModified = Date.now();

		// B מסנכרן — pull יזהה שינוי מרוחק ויבצע merge
		await deviceSync(deviceB);

		// B צריך לראות גם t4 (של A) וגם t5 (שלו)
		expect(getTaskName(deviceB.state, 't4')).toBe('שיעורי בית');
		expect(getTaskName(deviceB.state, 't5')).toBe('אמבטיה');
		expect(getTaskIds(deviceB.state).length).toBe(5); // t1-t5
	});

	it('A משנה שם משימה t1, B משנה שם משימה t2 — merge ללא קונפליקט', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני
		await devicePush(deviceA, true);
		await deviceSync(deviceB);

		// A משנה t1
		(deviceA.state.lists.u1.list1.tasks.t1 as any).name = 'ארוחה בריאה';
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B משנה t2 (עדיין לא ראה את שינויי A)
		(deviceB.state.lists.u1.list1.tasks.t2 as any).name = 'צחצוח שיניים בזהירות';
		deviceB.state.localDevice.lastModified = Date.now();

		// B מסנכרן
		await deviceSync(deviceB);

		// B רואה את שני השינויים
		expect(getTaskName(deviceB.state, 't1')).toBe('ארוחה בריאה');
		expect(getTaskName(deviceB.state, 't2')).toBe('צחצוח שיניים בזהירות');

		// A מושך ורואה גם את שינויי B
		await deviceSync(deviceA);
		expect(getTaskName(deviceA.state, 't2')).toBe('צחצוח שיניים בזהירות');
		expect(getTaskName(deviceA.state, 't1')).toBe('ארוחה בריאה');
	});

	it('מעבר הלוך-חזור: A→B→A→B — הנתונים עקביים', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// 1. A כותב ראשוני
		await devicePush(deviceA, true);

		// 2. B מושך ומסנכרן
		await deviceSync(deviceB);

		// 3. B משנה
		(deviceB.state.lists.u1.list1.tasks.t1 as any).name = 'שלב B-1';
		deviceB.state.localDevice.lastModified = Date.now();
		await devicePush(deviceB);

		// 4. A מושך — רואה את השינוי של B
		await devicePull(deviceA);
		expect(getTaskName(deviceA.state, 't1')).toBe('שלב B-1');

		// 5. A משנה
		(deviceA.state.lists.u1.list1.tasks.t1 as any).name = 'שלב A-2';
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// 6. B מושך — רואה את השינוי של A
		await devicePull(deviceB);
		expect(getTaskName(deviceB.state, 't1')).toBe('שלב A-2');
	});

	it('A מוחק משימה, B לא שינה — B רואה את המחיקה', async () => {
		const storage = createSharedStorage();
		const baseState = makeState();

		const deviceA = createDevice('A', storage, baseState);
		const deviceB = createDevice('B', storage, baseState);

		// סנכרון ראשוני
		await devicePush(deviceA, true);
		await deviceSync(deviceB);

		// A מוחק t3
		delete (deviceA.state.lists.u1.list1.tasks as any).t3;
		deviceA.state.localDevice.lastModified = Date.now();
		await devicePush(deviceA);

		// B מושך
		await devicePull(deviceB);

		expect(getTaskIds(deviceB.state)).not.toContain('t3');
		expect(getTaskIds(deviceB.state).length).toBe(2);
	});

	it('שני מכשירים מתחילים ריקים — הראשון שכותב קובע baseline', async () => {
		const storage = createSharedStorage();
		const emptyState = makeState({
			lists: { u1: { list1: { id: 'list1', name: 'לוח יומי', tasks: {} } } }
		} as any);

		const deviceA = createDevice('A', storage, emptyState);
		const deviceB = createDevice('B', storage, structuredClone(emptyState));

		// A כותב ראשון
		await devicePush(deviceA, true);

		// B מושך — מקבל state ריק של A
		await devicePull(deviceB);

		expect(getTaskIds(deviceB.state).length).toBe(0);

		// B מוסיף משימה
		(deviceB.state.lists.u1.list1.tasks as any).t10 = {
			id: 't10', name: 'משימה חדשה', imageSrc: null, isDone: false, order: 0
		};
		deviceB.state.localDevice.lastModified = Date.now();
		await devicePush(deviceB, true);

		// A מושך — רואה את המשימה החדשה
		await devicePull(deviceA);
		expect(getTaskName(deviceA.state, 't10')).toBe('משימה חדשה');
	});
});
