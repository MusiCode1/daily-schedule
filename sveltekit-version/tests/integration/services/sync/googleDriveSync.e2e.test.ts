/**
 * בדיקות E2E לסנכרון Google Drive
 *
 * הגישה: FakeRemote — SyncProvider שמחזיק "remote" בזיכרון.
 * מכשירים שונים משתמשים באותו FakeRemote → מדמה מצב ענן אמיתי.
 * ה-orchestrator נבדק כ-black-box: נותנים לו state ומוודאים תוצאות.
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
import { SyncError } from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';
import { pull, push, type SyncDb, type DeviceInfo } from '$lib/services/sync/syncOrchestrator';

// ─── FakeRemote ──────────────────────────────────────────────────────────────

/**
 * מדמה "ענן" משותף בין מכשירים.
 * כל device משתמש באותו instance → ראיית state עקבית.
 */
class FakeRemote implements SyncProvider {
	readonly id = 'fake';

	private content: SyncContent | null = null;
	private progress: SyncProgress | null = null;
	private history: SyncHistory | null = null;
	private assets: SyncAssetsIndex | null = null;
	private blobs = new Map<string, Blob>();
	private manifest: SyncManifest | null = null;

	/** לבדיקות — כמה פעמים כל שיטה נקראה */
	readonly calls = {
		initialize: 0,
		checkRemote: 0,
		writeContent: 0,
		writeProgress: 0,
		writeHistory: 0,
		writeAssets: 0,
		commit: 0
	};

	async initialize(): Promise<void> {
		this.calls.initialize++;
	}

	async isAvailable(): Promise<boolean> {
		return true;
	}

	async checkRemote(): Promise<RemoteMetadata | null> {
		this.calls.checkRemote++;
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
		return this.content;
	}
	async pullProgress(): Promise<SyncProgress | null> {
		return this.progress;
	}
	async pullHistory(): Promise<SyncHistory | null> {
		return this.history;
	}
	async pullAssets(): Promise<SyncAssetsIndex | null> {
		return this.assets;
	}

	async downloadMissingAsset(hash: string): Promise<Blob> {
		const blob = this.blobs.get(hash);
		if (!blob) throw new Error(`Asset not found in remote: ${hash}`);
		return blob;
	}

	async writeContent(payload: SyncContent): Promise<void> {
		this.calls.writeContent++;
		this.content = payload;
	}
	async writeProgress(payload: SyncProgress): Promise<void> {
		this.calls.writeProgress++;
		this.progress = payload;
	}
	async writeHistory(h: SyncHistory): Promise<void> {
		this.calls.writeHistory++;
		this.history = JSON.parse(JSON.stringify(h)); // deep clone
	}
	async writeAssets(index: SyncAssetsIndex, newBlobs: Map<string, Blob>): Promise<void> {
		this.calls.writeAssets++;
		// מדמה: Drive מעלה כל blob חדש ורושם fileId פיקטיבי ב-hashToFile
		for (const [hash, blob] of newBlobs) {
			index.hashToFile[hash as Sha256] = {
				fileId: `fake-file-${hash.slice(0, 12)}`,
				mimeType: blob.type || 'application/octet-stream',
				size: blob.size
			};
			this.blobs.set(hash, blob);
		}
		this.assets = index;
	}
	async commit(m: SyncManifest): Promise<void> {
		this.calls.commit++;
		this.manifest = m;
	}

	/** עזר לבדיקות: האם יש נתונים ב-remote? */
	hasData(): boolean {
		return this.manifest !== null;
	}

	/** עזר לבדיקות: writeId הנוכחי ב-remote */
	getWriteId(): string | null {
		return this.manifest?.syncMetadata.writeId ?? null;
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

function makeDb(blobs: Map<string, Blob> = new Map()): SyncDb {
	const store = new Map<string, Blob>(blobs);
	return {
		getImage: async (id) => store.get(id) ?? null,
		saveImage: async (blob, id) => {
			store.set(id, blob);
		},
		saveSyncHistory: async () => {},
		getSyncHistory: async () => null,
		deleteSyncHistory: async () => {}
	};
}

function makeDevice(id: string, name: string = id): DeviceInfo {
	return { deviceId: id, deviceName: name };
}

/** clone עמוק של state — לדמות שינוי בלי לשנות את המקור */
function cloneState(s: AppState): AppState {
	return JSON.parse(JSON.stringify(s));
}

// ─── תרחישים ─────────────────────────────────────────────────────────────────

describe('Google Drive Sync E2E', () => {
	let remote: FakeRemote;

	beforeEach(() => {
		remote = new FakeRemote();
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 1: סנכרון ראשון — אין Remote
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 1: סנכרון ראשון (אין remote)', () => {
		it('pull מחזיר את localState ללא שינוי', async () => {
			const state = makeState();
			const result = await pull(remote, state, null, makeDb());

			expect(result.state).toBe(state);
			expect(result.remoteWriteId).toBeNull();
			expect(result.merged).toBe(false);
		});

		it('push יוצר snapshot ומעדכן את הremote', async () => {
			const state = makeState();
			const device = makeDevice('dev-a', 'Phone A');

			const { writeId } = await push(remote, state, null, null, device, makeDb(), {
				forceSnapshot: true,
				now: 1000,
				generateWriteId: () => 'w1'
			});

			expect(writeId).toBe('w1');
			expect(remote.getWriteId()).toBe('w1');
			expect(remote.hasData()).toBe(true);
			expect(remote.calls.writeContent).toBe(1);
			expect(remote.calls.writeHistory).toBe(1);
			expect(remote.calls.commit).toBe(1);
		});

		it('אחרי push ראשון, checkRemote מחזיר writeId נכון', async () => {
			const state = makeState();
			await push(remote, state, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'first-write'
			});

			const meta = await remote.checkRemote();
			expect(meta?.writeId).toBe('first-write');
			expect(meta?.deviceId).toBe('dev-a');
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 2: אין שינויים — אותו מכשיר, אותו writeId
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 2: אין שינויים (writeIds תואמים)', () => {
		it('pull מחזיר מיד — לא מוריד קבצים', async () => {
			const state = makeState();
			await push(remote, state, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			const beforePull = remote.calls.checkRemote;
			const result = await pull(remote, state, 'w1', makeDb());

			expect(result.state).toBe(state);
			expect(result.merged).toBe(false);
			// checkRemote נקרא, אבל pullContent לא (writeIds תואמים)
			expect(remote.calls.checkRemote).toBe(beforePull + 1);
			expect(remote.calls.writeContent).toBe(1); // רק מה-push הראשון
		});

		it('push עם אותו state זורק "No changes to backup"', async () => {
			const state = makeState();
			await push(remote, state, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// ניסיון push ללא שינוי (delta ריק)
			await expect(
				push(remote, state, state, 'w1', makeDevice('dev-a'), makeDb(), {
					now: 2000
				})
			).rejects.toThrow('No changes to backup');
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 3: מכשיר חדש מסתנכרן בפעם הראשונה
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 3: Device B מסתנכרן בפעם הראשונה', () => {
		it('pull מחזיר את state המרוחק ללא merge', async () => {
			// Device A פש
			const stateA = makeState();
			await push(remote, stateA, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// Device B pull (אין localState, אין localWriteId)
			const result = await pull(remote, null, null, makeDb());

			expect(result.merged).toBe(false);
			expect(result.remoteWriteId).toBe('w1');
			expect(result.state.settings.currentUserId).toBe('u1');
		});

		it('אחרי pull, Device B יכול לדחוף state חדש', async () => {
			const stateA = makeState();
			await push(remote, stateA, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// Device B: pull → state מרוחק → push עם שינוי
			const pullResult = await pull(remote, null, null, makeDb());
			const stateB = cloneState(pullResult.state);
			stateB.lists['u1']['list1'].tasks['t1'].name = 'Brush teeth well';

			const pushResult = await push(
				remote, stateB, pullResult.state, pullResult.remoteWriteId,
				makeDevice('dev-b'), makeDb(), { generateWriteId: () => 'w2' }
			);

			expect(pushResult.writeId).toBe('w2');
			expect(remote.getWriteId()).toBe('w2');
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 4: שני מכשירים שינו — 3-way merge
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 4: סנכרון מתחרה — 3-way merge', () => {
		it('שינויים שלא מתנגשים ממוזגים בהצלחה', async () => {
			const baseState = makeState();

			// ─ Device A: push snapshot w1 (מצב בסיס)
			await push(remote, baseState, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// ─ Device B: pull → קולט w1
			const bPull1 = await pull(remote, null, null, makeDb());
			expect(bPull1.remoteWriteId).toBe('w1');
			const stateB = cloneState(bPull1.state);

			// ─ Device A: משנה שם הרשימה → push w2
			const stateA2 = cloneState(baseState);
			stateA2.lists['u1']['list1'].name = 'Evening Routine';
			await push(remote, stateA2, baseState, 'w1', makeDevice('dev-a'), makeDb(), {
				generateWriteId: () => 'w2'
			});
			expect(remote.getWriteId()).toBe('w2');

			// ─ Device B: שינה שם משימה (בלי לדעת על Device A)
			stateB.lists['u1']['list1'].tasks['t1'].name = 'Brush teeth carefully';

			// ─ Device B: pull → remote=w2, local=w1, merge נדרש
			const bPull2 = await pull(remote, stateB, 'w1', makeDb());

			expect(bPull2.merged).toBe(true);
			expect(bPull2.remoteWriteId).toBe('w2');

			// שינוי של Device A (שם רשימה) שרד
			expect(bPull2.state.lists['u1']['list1'].name).toBe('Evening Routine');
			// שינוי של Device B (שם משימה) שרד
			expect(bPull2.state.lists['u1']['list1'].tasks['t1'].name).toBe('Brush teeth carefully');
		});

		it('אחרי merge, push מייצר snapshot חדש עם שני השינויים', async () => {
			const baseState = makeState();

			await push(remote, baseState, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			const stateA2 = cloneState(baseState);
			stateA2.lists['u1']['list1'].name = 'Evening Routine';
			await push(remote, stateA2, baseState, 'w1', makeDevice('dev-a'), makeDb(), {
				generateWriteId: () => 'w2'
			});

			const stateB = cloneState(baseState);
			stateB.taskProgress['t2'] = true;
			const mergeResult = await pull(remote, stateB, 'w1', makeDb());

			// push את המצב הממוזג → forceSnapshot (כי זה אחרי merge)
			const { writeId } = await push(
				remote, mergeResult.state, null, mergeResult.remoteWriteId,
				makeDevice('dev-b'), makeDb(), {
					forceSnapshot: true,
					generateWriteId: () => 'w3'
				}
			);

			expect(writeId).toBe('w3');
			expect(remote.getWriteId()).toBe('w3');

			// בדיקת תוכן ה-remote שהועלה
			const content = await remote.pullContent();
			const listName = (content?.lists['u1'] as any)?.['list1']?.name;
			expect(listName).toBe('Evening Routine');
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 5: שגיאת אימות (Auth)
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 5: שגיאת אימות', () => {
		it('pull זורק SyncError עם category=auth כשאין token', async () => {
			// Object.create: inherits all prototype methods, overrides initialize
			const authFailProvider = Object.create(remote) as SyncProvider;
			authFailProvider.initialize = async () => {
				throw new Error('Not authenticated');
			};

			await expect(pull(authFailProvider, makeState(), null, makeDb())).rejects.toSatisfy(
				(e: any) => e instanceof SyncError && e.category === 'auth'
			);
		});

		it('push זורק SyncError עם category=auth כשאין token', async () => {
			const authFailProvider = Object.create(remote) as SyncProvider;
			authFailProvider.initialize = async () => {
				throw new Error('Not authenticated');
			};

			await expect(
				push(authFailProvider, makeState(), null, null, makeDevice('dev-a'), makeDb(), {
					forceSnapshot: true
				})
			).rejects.toSatisfy((e: any) => e instanceof SyncError && e.category === 'auth');
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 6: שגיאת רשת
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 6: שגיאת רשת', () => {
		it('push זורק SyncError עם category=network כשwrite נכשל', async () => {
			const networkFailProvider = Object.create(remote) as SyncProvider;
			networkFailProvider.writeContent = async () => {
				throw new Error('Upload failed: 503 Service Unavailable');
			};

			await expect(
				push(networkFailProvider, makeState(), null, null, makeDevice('dev-a'), makeDb(), {
					forceSnapshot: true
				})
			).rejects.toSatisfy((e: any) => e instanceof SyncError && e.category === 'network');
		});

		it('pull זורק SyncError עם category=network כשdownload נכשל', async () => {
			// הכן remote עם נתונים
			const state = makeState();
			await push(remote, state, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true, generateWriteId: () => 'w1'
			});

			const networkFailProvider = Object.create(remote) as SyncProvider;
			networkFailProvider.pullContent = async () => {
				throw new Error('Download failed: 500');
			};

			await expect(
				pull(networkFailProvider, null, null, makeDb())
			).rejects.toSatisfy((e: any) => e instanceof SyncError && e.category === 'network');
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 7: סנכרון עם assets (תמונות)
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 7: assets — תמונות', () => {
		it('push מעלה blob חדש ב-writeAssets', async () => {
			const imageBlob = new Blob(['fake-image-data'], { type: 'image/png' });
			const idbId = 'idb:img-task-t1';

			const state = makeState();
			(state.lists['u1']['list1'].tasks['t1'] as any).imageSrc = idbId;

			const db = makeDb(new Map([[idbId, imageBlob]]));

			await push(remote, state, null, null, makeDevice('dev-a'), db, {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			expect(remote.calls.writeAssets).toBe(1);
			// remote מכיל asset
			const assetsIndex = await remote.pullAssets();
			expect(assetsIndex?.idToHash[idbId]).toBeDefined();
		});

		it('pull מוריד asset חסר לlocal db', async () => {
			const imageBlob = new Blob(['image-bytes'], { type: 'image/png' });
			const idbId = 'idb:img-task-t1';

			// Device A: push עם תמונה
			const stateA = makeState();
			(stateA.lists['u1']['list1'].tasks['t1'] as any).imageSrc = idbId;
			const dbA = makeDb(new Map([[idbId, imageBlob]]));
			await push(remote, stateA, null, null, makeDevice('dev-a'), dbA, {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// Device B: pull — ה-db ריק, אמור להוריד את התמונה
			const downloadedBlobs = new Map<string, Blob>();
			const dbB: SyncDb = {
				getImage: async (id) => downloadedBlobs.get(id) ?? null,
				saveImage: async (blob, id) => { downloadedBlobs.set(id, blob); },
				saveSyncHistory: async () => {},
				getSyncHistory: async () => null,
				deleteSyncHistory: async () => {}
			};

			await pull(remote, null, null, dbB);

			expect(downloadedBlobs.has(idbId)).toBe(true);
		});

		it('push שני לא מעלה asset שכבר קיים ב-remote', async () => {
			const imageBlob = new Blob(['image-bytes'], { type: 'image/png' });
			const idbId = 'idb:img-task-t1';

			const state = makeState();
			(state.lists['u1']['list1'].tasks['t1'] as any).imageSrc = idbId;
			const db = makeDb(new Map([[idbId, imageBlob]]));

			// push ראשון → מעלה blob
			await push(remote, state, null, null, makeDevice('dev-a'), db, {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});
			expect(remote.calls.writeAssets).toBe(1);

			// שינוי קטן (שם משימה) ו-push שני
			const state2 = cloneState(state);
			state2.lists['u1']['list1'].tasks['t1'].name = 'Updated name';
			await push(remote, state2, state, 'w1', makeDevice('dev-a'), db, {
				generateWriteId: () => 'w2'
			});

			// writeAssets נקרא בשני הpushים
			expect(remote.calls.writeAssets).toBe(2);
			// hashToFile מכיל בדיוק 1 entry — הblob הועלה פעם אחת בלבד
			const assets = await remote.pullAssets();
			const hashCount = Object.keys(assets?.hashToFile ?? {}).length;
			expect(hashCount).toBe(1);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 8: מחזור סנכרון מלא (3 push-pull סבבים)
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 8: מחזור חיים מלא', () => {
		it('שני מכשירים מסנכרנים מספר פעמים ברצף', async () => {
			const dbA = makeDb();
			const dbB = makeDb();
			const devA = makeDevice('dev-a', 'Phone A');
			const devB = makeDevice('dev-b', 'Phone B');

			// ─── סבב 1: A push ראשון
			const stateA1 = makeState();
			let wA = 'w-a1';
			await push(remote, stateA1, null, null, devA, dbA, {
				forceSnapshot: true,
				generateWriteId: () => wA
			});

			// ─── סבב 1: B pull → מקבל state של A
			const bPull1 = await pull(remote, null, null, dbB);
			expect(bPull1.remoteWriteId).toBe(wA);
			let stateB = bPull1.state;
			let wB = bPull1.remoteWriteId!;

			// ─── סבב 2: B שינה ו-push
			stateB = cloneState(stateB);
			stateB.lists['u1']['list1'].tasks['t2'].name = "B's task";
			wB = 'w-b1';
			await push(remote, stateB, bPull1.state, bPull1.remoteWriteId, devB, dbB, {
				generateWriteId: () => wB
			});
			expect(remote.getWriteId()).toBe(wB);

			// ─── סבב 2: A pull → מקבל שינוי של B (writeIds שונים, merge)
			const aPull2 = await pull(remote, stateA1, wA, dbA);
			expect(aPull2.remoteWriteId).toBe(wB);
			// merged=true כי localWriteId ('w-a1') ≠ remoteWriteId ('w-b1')
			expect(aPull2.merged).toBe(true);

			// ─── סבב 3: A push את המצב הממוזג
			wA = 'w-a2';
			await push(remote, aPull2.state, null, aPull2.remoteWriteId, devA, dbA, {
				forceSnapshot: true,
				generateWriteId: () => wA
			});
			expect(remote.getWriteId()).toBe(wA);

			// ─── סבב 3: B pull → writeIds תואמים? לא — אבל אין שינוי ל-B
			const bPull3 = await pull(remote, stateB, wB, dbB);
			// remote=w-a2, local=w-b1 → merge
			expect(bPull3.remoteWriteId).toBe(wA);
			// שינוי של B עדיין קיים בstate הממוזג
			expect(bPull3.state.lists['u1']['list1'].tasks['t2'].name).toBe("B's task");
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// תרחיש 9: שינויי progress בלבד (isDone)
	// ──────────────────────────────────────────────────────────────────────────
	describe('תרחיש 9: שינויי progress בלבד (isDone)', () => {
		it('push עם isDone בלבד מצליח ולא מוסיף delta entry להיסטוריה', async () => {
			const state = makeState();
			const device = makeDevice('dev-a');

			// push ראשון — snapshot
			await push(remote, state, null, null, device, makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// שינוי isDone בלבד
			const stateWithDone = cloneState(state);
			stateWithDone.taskProgress['t1'] = true;

			// push שני — delta path (progress-only reuses writeId)
			const result = await push(
				remote, stateWithDone, state, 'w1', device, makeDb(),
				{ generateWriteId: () => 'w2' }
			);

			// progress-only: writeId ממוחזר (לא חדש)
			expect(result.writeId).toBe('w1');
			expect(remote.getWriteId()).toBe('w1');

			// היסטוריה — רק ה-snapshot הראשון, ללא delta entry חדש
			const history = await remote.pullHistory();
			expect(history!.entries.length).toBe(1);
			expect(history!.entries[0].type).toBe('snapshot');

			// progress — isDone עודכן
			const progress = await remote.pullProgress();
			expect((progress as any).taskDone['t1']).toBe(true);
		});

		it('push ללא שום שינוי (לא content ולא progress) זורק "No changes to backup"', async () => {
			const state = makeState();

			await push(remote, state, null, null, makeDevice('dev-a'), makeDb(), {
				forceSnapshot: true,
				generateWriteId: () => 'w1'
			});

			// אותו state בדיוק — אין שינוי
			await expect(
				push(remote, state, state, 'w1', makeDevice('dev-a'), makeDb())
			).rejects.toThrow('No changes to backup');
		});
	});
});
