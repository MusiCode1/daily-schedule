import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AppState } from '$lib/types';
import type { SyncProvider } from '$lib/services/sync/syncProvider';
import type { RemoteMetadata } from '$lib/services/sync/syncTypes';
import { pull, push, type SyncDb } from '$lib/services/sync/syncOrchestrator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeState(overrides?: Partial<AppState>): AppState {
	return {
		version: 15,
		users: { u1: { id: 'u1', name: 'Test', gender: 'boy', avatar: '', themeColor: '#000' } },
		people: {},
		lists: {
			u1: {
				list1: {
					id: 'list1',
					name: 'List',
					tasks: {
						t1: { id: 't1', name: 'Task 1', imageSrc: null, isDone: false, order: 0 }
					}
				}
			}
		},
		images: {},
		activeListId: { u1: 'list1' },
		currentUserId: 'u1',
		settings: { lastActiveTime: 1000, childLockEnabled: false },
		lastModified: 1000,
		syncMetadata: { writeId: 'w1', lastModified: 1000, lastModifiedByDeviceId: 'd1', lastModifiedByDeviceName: 'Dev' },
		...overrides
	} as AppState;
}

function makeRemoteMeta(writeId: string): RemoteMetadata {
	return {
		writeId,
		parentWriteId: null,
		contentHash: 'sha256:abc' as any,
		progressHash: 'sha256:def' as any,
		assetsHash: 'sha256:ghi' as any,
		timestamp: Date.now(),
		deviceId: 'remote-device'
	};
}

function makeDb(): SyncDb {
	return {
		getImage: async () => null,
		saveImage: async () => {}
	};
}

/** יוצר SyncProvider mock מינימלי */
function makeMockProvider(overrides: Partial<SyncProvider> = {}): SyncProvider {
	return {
		id: 'mock',
		initialize: vi.fn(async () => {}),
		isAvailable: vi.fn(async () => true),
		checkRemote: vi.fn(async () => null),
		pullContent: vi.fn(async () => null),
		pullProgress: vi.fn(async () => null),
		pullHistory: vi.fn(async () => null),
		pullAssets: vi.fn(async () => null),
		downloadMissingAsset: vi.fn(async () => new Blob()),
		writeContent: vi.fn(async () => {}),
		writeProgress: vi.fn(async () => {}),
		writeHistory: vi.fn(async () => {}),
		writeAssets: vi.fn(async () => {}),
		commit: vi.fn(async () => {}),
		...overrides
	};
}

// ─── Pull tests ──────────────────────────────────────────────────────────────

describe('syncOrchestrator.pull', () => {
	it('should return localState when no remote exists', async () => {
		const localState = makeState();
		const provider = makeMockProvider({ checkRemote: vi.fn(async () => null) });

		const result = await pull(provider, localState, null, makeDb());

		expect(result.state).toBe(localState);
		expect(result.remoteWriteId).toBeNull();
		expect(result.merged).toBe(false);
		expect(provider.initialize).toHaveBeenCalled();
	});

	it('should return localState when writeIds match', async () => {
		const localState = makeState();
		const remoteMeta = makeRemoteMeta('w1');
		const provider = makeMockProvider({ checkRemote: vi.fn(async () => remoteMeta) });

		const result = await pull(provider, localState, 'w1', makeDb());

		expect(result.state).toBe(localState);
		expect(result.remoteWriteId).toBe('w1');
		expect(result.merged).toBe(false);
		expect(provider.pullContent).not.toHaveBeenCalled();
	});

	it('should download remote state when no localWriteId', async () => {
		const remoteMeta = makeRemoteMeta('w-remote');
		const remoteContent = {
			backupSchemaVersion: 2,
			appStateVersion: 15,
			users: [{ id: 'u2', name: 'Remote User', gender: 'girl', avatar: '', themeColor: '#fff' }],
			people: [],
			lists: {},
			images: {},
			activeListId: {},
			currentUserId: 'u2',
			settings: {}
		};

		const provider = makeMockProvider({
			checkRemote: vi.fn(async () => remoteMeta),
			pullContent: vi.fn(async () => remoteContent as any),
			pullProgress: vi.fn(async () => ({ backupSchemaVersion: 2, taskDone: {} })),
			pullAssets: vi.fn(async () => ({ backupSchemaVersion: 2, idToHash: {}, hashToFile: {} }))
		});

		const result = await pull(provider, null, null, makeDb());

		expect(result.remoteWriteId).toBe('w-remote');
		expect(result.merged).toBe(false);
		expect(result.state.currentUserId).toBe('u2');
	});

	it('should keep localState when remote is newer but no history for merge', async () => {
		const localState = makeState({ lastModified: 2000 });
		const remoteMeta = makeRemoteMeta('w-remote');
		const remoteContent = {
			backupSchemaVersion: 2, appStateVersion: 15,
			users: [], people: [], lists: {}, images: {}, activeListId: {}, currentUserId: null, settings: {}
		};

		const provider = makeMockProvider({
			checkRemote: vi.fn(async () => remoteMeta),
			pullContent: vi.fn(async () => remoteContent as any),
			pullProgress: vi.fn(async () => ({ backupSchemaVersion: 2, taskDone: {} })),
			pullAssets: vi.fn(async () => ({ backupSchemaVersion: 2, idToHash: {}, hashToFile: {} })),
			pullHistory: vi.fn(async () => null)
		});

		const result = await pull(provider, localState, 'w-local', makeDb());

		expect(result.merged).toBe(true);
		expect(result.state).toBe(localState);
	});
});

// ─── Push tests ──────────────────────────────────────────────────────────────

describe('syncOrchestrator.push', () => {
	const device = { deviceId: 'd1', deviceName: 'Dev 1' };

	it('should call initialize, writeContent, writeProgress, writeAssets, writeHistory, commit', async () => {
		const state = makeState();
		const provider = makeMockProvider({
			pullHistory: vi.fn(async () => null),
			pullAssets: vi.fn(async () => null)
		});

		const result = await push(
			provider, state, null, null, device, makeDb(),
			{ forceSnapshot: true, now: 1000, generateWriteId: () => 'write-test-1' }
		);

		expect(provider.initialize).toHaveBeenCalled();
		expect(provider.writeContent).toHaveBeenCalled();
		expect(provider.writeProgress).toHaveBeenCalled();
		expect(provider.writeAssets).toHaveBeenCalled();
		expect(provider.writeHistory).toHaveBeenCalled();
		expect(provider.commit).toHaveBeenCalled();
		expect(result.writeId).toBe('write-test-1');
	});

	it('should throw "No changes to backup" when delta is empty and no snapshot needed', async () => {
		const state = makeState();
		const { createEmptyHistory } = await import('$lib/services/sync/engine/historyManager');

		// history עם 5 entries → לא צריך snapshot (פחות מ-20)
		const history = createEmptyHistory();
		for (let i = 0; i < 5; i++) {
			history.entries.push({
				type: 'snapshot',
				writeId: `w${i}`,
				parentWriteId: i === 0 ? null : `w${i - 1}`,
				timestamp: 1000,
				deviceId: 'd1',
				deviceName: 'Dev',
				state
			});
		}
		// הוסף 1 delta (עדיין לא 20) כדי שלא ייצור snapshot
		history.entries.push({
			type: 'delta',
			writeId: 'w-delta',
			parentWriteId: 'w4',
			timestamp: 2000,
			deviceId: 'd1',
			deviceName: 'Dev',
			delta: {}
		});

		const provider = makeMockProvider({
			pullHistory: vi.fn(async () => history),
			pullAssets: vi.fn(async () => null)
		});

		// previousState זהה ל-state → delta ריק → throw
		await expect(
			push(provider, state, state, 'w-delta', device, makeDb(), { now: 2000 })
		).rejects.toThrow('No changes to backup');
	});

	it('should create snapshot when forceSnapshot=true', async () => {
		const state = makeState();
		const provider = makeMockProvider({
			pullHistory: vi.fn(async () => null),
			pullAssets: vi.fn(async () => null)
		});

		await push(provider, state, null, null, device, makeDb(), {
			forceSnapshot: true,
			generateWriteId: () => 'snap-1'
		});

		const historyArg = vi.mocked(provider.writeHistory).mock.calls[0][0];
		expect(historyArg.entries[0].type).toBe('snapshot');
		expect(historyArg.entries[0].writeId).toBe('snap-1');
	});

	it('manifest should contain correct writeId and hashes', async () => {
		const state = makeState();
		const provider = makeMockProvider({
			pullHistory: vi.fn(async () => null),
			pullAssets: vi.fn(async () => null)
		});

		await push(provider, state, null, null, device, makeDb(), {
			forceSnapshot: true,
			now: 5000,
			generateWriteId: () => 'commit-wid'
		});

		const commitArg = vi.mocked(provider.commit).mock.calls[0][0];
		expect(commitArg.syncMetadata.writeId).toBe('commit-wid');
		expect(commitArg.syncMetadata.lastModified).toBe(5000);
		expect(commitArg.hashes.contentHash).toMatch(/^sha256:/);
		expect(commitArg.hashes.progressHash).toMatch(/^sha256:/);
	});

	it('progress-only push should reuse lastKnownWriteId', async () => {
		const state = makeState();
		const previousState = structuredClone(state);
		// שינוי isDone בלבד — ללא שינוי תוכן
		(state.lists.u1.list1.tasks.t1 as any).isDone = true;

		const { createEmptyHistory, appendToHistory } = await import('$lib/services/sync/engine/historyManager');
		const history = createEmptyHistory();
		appendToHistory(history, {
			type: 'snapshot',
			writeId: 'existing-w1',
			parentWriteId: null,
			timestamp: 1000,
			deviceId: 'd1',
			deviceName: 'Dev',
			state: previousState
		});

		const provider = makeMockProvider({
			pullHistory: vi.fn(async () => history),
			pullAssets: vi.fn(async () => null)
		});

		const result = await push(
			provider, state, previousState, 'existing-w1', device, makeDb(),
			{ now: 2000, generateWriteId: () => 'should-not-be-used' }
		);

		// writeId צריך להישאר זהה (שימוש חוזר)
		expect(result.writeId).toBe('existing-w1');

		// היסטוריה לא צריכה לגדול (אין entry חדש)
		const historyArg = vi.mocked(provider.writeHistory).mock.calls[0][0];
		expect(historyArg.entries.length).toBe(1); // רק ה-snapshot המקורי
	});
});

describe('syncOrchestrator.pull — progress detection', () => {
	it('should detect progress change when writeIds match', async () => {
		const localState = makeState();
		// progress מקומי: t1.isDone = false
		const { sha256String, stableStringify } = await import('$lib/services/sync/crypto');
		const { buildProgressPayload } = await import('$lib/services/sync/payloads');

		const localProgressHash = await sha256String(stableStringify(buildProgressPayload(localState)));

		// remote יש progressHash שונה (מרמז על שינוי isDone)
		const remoteMeta = makeRemoteMeta('w1');
		remoteMeta.progressHash = 'sha256:different-progress' as any;

		const remoteProgress = { backupSchemaVersion: 2, taskDone: { t1: true } };

		const provider = makeMockProvider({
			checkRemote: vi.fn(async () => remoteMeta),
			pullProgress: vi.fn(async () => remoteProgress as any)
		});

		const result = await pull(provider, localState, 'w1', makeDb());

		expect(result.merged).toBe(false);
		expect(result.remoteWriteId).toBe('w1');
		// progress הוחל — t1 צריך להיות true
		expect((result.state.lists.u1?.list1?.tasks?.t1 as any)?.isDone).toBe(true);
		expect(provider.pullProgress).toHaveBeenCalled();
	});

	it('should not download progress when progressHash matches', async () => {
		const localState = makeState();
		const { sha256String, stableStringify } = await import('$lib/services/sync/crypto');
		const { buildProgressPayload } = await import('$lib/services/sync/payloads');

		const localProgressHash = await sha256String(stableStringify(buildProgressPayload(localState)));

		const remoteMeta = makeRemoteMeta('w1');
		remoteMeta.progressHash = localProgressHash as any;

		const provider = makeMockProvider({
			checkRemote: vi.fn(async () => remoteMeta)
		});

		const result = await pull(provider, localState, 'w1', makeDb());

		expect(result.merged).toBe(false);
		expect(provider.pullProgress).not.toHaveBeenCalled();
	});
});
