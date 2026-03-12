import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '$lib/data/defaults';
import type { SyncHistory, SnapshotEntry, DeltaEntry, HistoryEntry } from '$lib/services/sync/types';
import type { AppState } from '$lib/types';
import { calculateDelta } from '$lib/services/sync/syncEngine';
import {
	reconstructState,
	createEmptyHistory,
	appendToHistory,
	shouldCreateSnapshot,
	findEntryByWriteId,
	findCommonAncestor,
	mergeHistories
} from '$lib/services/sync/historyManager';

function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function getFirstIds(state: any) {
	const userId = Object.keys(state.users)[0];
	const listId = Object.keys(state.lists[userId])[0];
	const taskId = Object.keys(state.lists[userId][listId].tasks)[0];
	return { userId, listId, taskId };
}

describe('historyManager.reconstructState', () => {
	it('should reconstruct only by parent chain in branched history', () => {
		const base = deepClone(INITIAL_STATE);
		const { userId, listId, taskId } = getFirstIds(base);

		const state1 = deepClone(base);
		state1.lists[userId][listId].tasks[taskId].name = 'state-1';

		const state2a = deepClone(state1);
		state2a.lists[userId][listId].tasks[taskId].name = 'branch-a';

		const state2b = deepClone(state1);
		state2b.lists[userId][listId].tasks[taskId].name = 'branch-b';

		const delta1 = calculateDelta(base as any, state1 as any);
		const delta2a = calculateDelta(state1 as any, state2a as any);
		const delta2b = calculateDelta(state1 as any, state2b as any);

		expect(delta1).toBeTruthy();
		expect(delta2a).toBeTruthy();
		expect(delta2b).toBeTruthy();

		const history: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				{
					type: 'snapshot',
					writeId: 'w0',
					parentWriteId: null,
					timestamp: 1,
					deviceId: 'dev',
					deviceName: 'device',
					state: base as any
				},
				{
					type: 'delta',
					writeId: 'w1',
					parentWriteId: 'w0',
					timestamp: 2,
					deviceId: 'dev',
					deviceName: 'device',
					delta: delta1 as any
				},
				{
					type: 'delta',
					writeId: 'w2a',
					parentWriteId: 'w1',
					timestamp: 3,
					deviceId: 'dev',
					deviceName: 'device',
					delta: delta2a as any
				},
				{
					type: 'delta',
					writeId: 'w2b',
					parentWriteId: 'w1',
					timestamp: 4,
					deviceId: 'dev',
					deviceName: 'device',
					delta: delta2b as any
				}
			]
		};

		const restored = reconstructState(history, 'w2b');
		expect(restored).toBeTruthy();
		expect(restored!.lists[userId][listId].tasks[taskId].name).toBe('branch-b');
	});

	it('should return null when history chain contains a cycle', () => {
		const base = deepClone(INITIAL_STATE);
		const history: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				{
					type: 'snapshot',
					writeId: 'w0',
					parentWriteId: null,
					timestamp: 1,
					deviceId: 'dev',
					deviceName: 'device',
					state: base as any
				},
				{
					type: 'delta',
					writeId: 'loop',
					parentWriteId: 'loop',
					timestamp: 2,
					deviceId: 'dev',
					deviceName: 'device',
					delta: {} as any
				}
			]
		};

		expect(reconstructState(history, 'loop')).toBeNull();
	});

	it('should return snapshot state directly', () => {
		const base = deepClone(INITIAL_STATE);
		const history: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				{
					type: 'snapshot',
					writeId: 'w0',
					parentWriteId: null,
					timestamp: 1,
					deviceId: 'dev',
					deviceName: 'device',
					state: base as any
				}
			]
		};

		const result = reconstructState(history, 'w0');
		expect(result).toEqual(base);
	});

	it('should apply a single delta on top of snapshot', () => {
		const base = deepClone(INITIAL_STATE);
		const { userId, listId, taskId } = getFirstIds(base);

		const modified = deepClone(base);
		modified.lists[userId][listId].tasks[taskId].name = 'changed';

		const delta = calculateDelta(base as any, modified as any)!;
		expect(delta).toBeTruthy();

		const history: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				{
					type: 'snapshot',
					writeId: 'w0',
					parentWriteId: null,
					timestamp: 1,
					deviceId: 'dev',
					deviceName: 'device',
					state: base as any
				},
				{
					type: 'delta',
					writeId: 'w1',
					parentWriteId: 'w0',
					timestamp: 2,
					deviceId: 'dev',
					deviceName: 'device',
					delta
				}
			]
		};

		const result = reconstructState(history, 'w1');
		expect(result).toBeTruthy();
		expect(result!.lists[userId][listId].tasks[taskId].name).toBe('changed');
	});

	it('should reconstruct through a chain of 5 deltas', () => {
		const base = deepClone(INITIAL_STATE);
		const { userId, listId, taskId } = getFirstIds(base);

		const entries: HistoryEntry[] = [
			{
				type: 'snapshot',
				writeId: 'w0',
				parentWriteId: null,
				timestamp: 1,
				deviceId: 'dev',
				deviceName: 'device',
				state: base as any
			}
		];

		let prev = deepClone(base);
		for (let i = 1; i <= 5; i++) {
			const next = deepClone(prev);
			next.lists[userId][listId].tasks[taskId].name = `step-${i}`;
			const delta = calculateDelta(prev as any, next as any)!;
			expect(delta).toBeTruthy();

			entries.push({
				type: 'delta',
				writeId: `w${i}`,
				parentWriteId: `w${i - 1}`,
				timestamp: i + 1,
				deviceId: 'dev',
				deviceName: 'device',
				delta
			});
			prev = next;
		}

		const history: SyncHistory = { backupSchemaVersion: 3, entries };
		const result = reconstructState(history, 'w5');
		expect(result).toBeTruthy();
		expect(result!.lists[userId][listId].tasks[taskId].name).toBe('step-5');
	});

	it('should return null for unknown writeId', () => {
		const base = deepClone(INITIAL_STATE);
		const history: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				{
					type: 'snapshot',
					writeId: 'w0',
					parentWriteId: null,
					timestamp: 1,
					deviceId: 'dev',
					deviceName: 'device',
					state: base as any
				}
			]
		};

		expect(reconstructState(history, 'nonexistent')).toBeNull();
	});

	it('should return null when delta chain has no snapshot', () => {
		const history: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				{
					type: 'delta',
					writeId: 'w1',
					parentWriteId: 'missing',
					timestamp: 1,
					deviceId: 'dev',
					deviceName: 'device',
					delta: {}
				}
			]
		};

		expect(reconstructState(history, 'w1')).toBeNull();
	});
});

// ─── Helpers for new tests ──────────────────────────────────

function createMinimalState(overrides?: Partial<AppState>): AppState {
	return {
		version: 16,
		users: {
			u1: { id: 'u1', name: 'user', gender: 'boy', avatar: '', themeColor: '#000' }
		},
		lists: {
			u1: {
				l1: {
					id: 'l1',
					name: 'list',
					tasks: {
						t1: { id: 't1', name: 'task', imageSrc: null, order: 0 }
					}
				}
			}
		},
		images: {},
		people: {},
		taskProgress: {},
		settings: {
			activeListId: { u1: 'l1' },
			currentUserId: 'u1',
			childLockEnabled: false,
			websiteShortcuts: []
		},
		localDevice: {
			lastModified: 1000,
			lastActiveTime: 1000
		},
		...overrides
	};
}

function makeSnapshot(
	writeId: string,
	parentWriteId: string | null,
	timestamp: number,
	state: AppState
): SnapshotEntry {
	return { type: 'snapshot', writeId, parentWriteId, timestamp, deviceId: 'd', deviceName: 'dev', state };
}

function makeDelta(
	writeId: string,
	parentWriteId: string,
	timestamp: number,
	delta: object
): DeltaEntry {
	return { type: 'delta', writeId, parentWriteId, timestamp, deviceId: 'd', deviceName: 'dev', delta };
}

// ─── createEmptyHistory ─────────────────────────────────────

describe('historyManager.createEmptyHistory', () => {
	it('should return history with version 3 and empty entries', () => {
		const h = createEmptyHistory();
		expect(h.backupSchemaVersion).toBe(3);
		expect(h.entries).toEqual([]);
	});
});

// ─── appendToHistory ────────────────────────────────────────

describe('historyManager.appendToHistory', () => {
	it('should append a snapshot entry', () => {
		const h = createEmptyHistory();
		const entry = makeSnapshot('w0', null, 1, createMinimalState());
		appendToHistory(h, entry);

		expect(h.entries).toHaveLength(1);
		expect(h.entries[0].writeId).toBe('w0');
	});

	it('should append a delta entry', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 1, createMinimalState()));
		appendToHistory(h, makeDelta('w1', 'w0', 2, { some: 'delta' }));

		expect(h.entries).toHaveLength(2);
		expect(h.entries[1].type).toBe('delta');
	});

	it('should preserve chronological order', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 1, createMinimalState()));
		appendToHistory(h, makeDelta('w1', 'w0', 2, {}));
		appendToHistory(h, makeDelta('w2', 'w1', 3, {}));

		expect(h.entries.map((e) => e.writeId)).toEqual(['w0', 'w1', 'w2']);
	});
});

// ─── shouldCreateSnapshot ───────────────────────────────────

describe('historyManager.shouldCreateSnapshot', () => {
	it('should return true for empty history (genesis)', () => {
		expect(shouldCreateSnapshot(createEmptyHistory())).toBe(true);
	});

	it('should return true when there is no snapshot at all', () => {
		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [makeDelta('w1', 'w0', 1, {})]
		};
		expect(shouldCreateSnapshot(h)).toBe(true);
	});

	it('should return false when fewer than 20 deltas since last snapshot', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 0, createMinimalState()));
		for (let i = 1; i <= 19; i++) {
			appendToHistory(h, makeDelta(`w${i}`, `w${i - 1}`, i, {}));
		}

		expect(shouldCreateSnapshot(h)).toBe(false);
	});

	it('should return true when exactly 20 deltas since last snapshot', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 0, createMinimalState()));
		for (let i = 1; i <= 20; i++) {
			appendToHistory(h, makeDelta(`w${i}`, `w${i - 1}`, i, {}));
		}

		expect(shouldCreateSnapshot(h)).toBe(true);
	});

	it('should return true when more than 20 deltas since last snapshot', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 0, createMinimalState()));
		for (let i = 1; i <= 25; i++) {
			appendToHistory(h, makeDelta(`w${i}`, `w${i - 1}`, i, {}));
		}

		expect(shouldCreateSnapshot(h)).toBe(true);
	});

	it('should count from the most recent snapshot', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 0, createMinimalState()));
		for (let i = 1; i <= 25; i++) {
			appendToHistory(h, makeDelta(`w${i}`, `w${i - 1}`, i, {}));
		}
		// second snapshot resets the counter
		appendToHistory(h, makeSnapshot('w26', 'w25', 26, createMinimalState()));
		appendToHistory(h, makeDelta('w27', 'w26', 27, {}));

		expect(shouldCreateSnapshot(h)).toBe(false);
	});
});

// ─── findEntryByWriteId ─────────────────────────────────────

describe('historyManager.findEntryByWriteId', () => {
	it('should return the entry when writeId exists', () => {
		const h = createEmptyHistory();
		const entry = makeSnapshot('w0', null, 1, createMinimalState());
		appendToHistory(h, entry);

		expect(findEntryByWriteId(h, 'w0')).toBe(entry);
	});

	it('should return null when writeId does not exist', () => {
		const h = createEmptyHistory();
		appendToHistory(h, makeSnapshot('w0', null, 1, createMinimalState()));

		expect(findEntryByWriteId(h, 'nonexistent')).toBeNull();
	});
});

// ─── findCommonAncestor ─────────────────────────────────────

describe('historyManager.findCommonAncestor', () => {
	it('should find ancestor in a linear chain (local ahead of remote)', () => {
		const state = createMinimalState();
		const modified = deepClone(state);
		modified.lists.u1.l1.tasks.t1.name = 'changed';
		const delta = calculateDelta(state as any, modified as any)!;

		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				makeSnapshot('w0', null, 1, state),
				makeDelta('w1', 'w0', 2, delta),
				makeDelta('w2', 'w1', 3, delta)
			]
		};

		const result = findCommonAncestor(h, 'w2', 'w1');
		expect(result.found).toBe(true);
		expect(result.writeId).toBe('w1');
	});

	it('should find ancestor in branched history', () => {
		const state = createMinimalState();
		const modified = deepClone(state);
		modified.localDevice.lastModified = 999;
		const delta = calculateDelta(state as any, modified as any)!;

		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				makeSnapshot('w0', null, 1, state),
				makeDelta('w1', 'w0', 2, delta),
				makeDelta('w2a', 'w1', 3, delta),
				makeDelta('w2b', 'w1', 4, delta)
			]
		};

		const result = findCommonAncestor(h, 'w2a', 'w2b');
		expect(result.found).toBe(true);
		expect(result.writeId).toBe('w1');
	});

	it('should return found=false when local writeId is missing', () => {
		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [makeSnapshot('w0', null, 1, createMinimalState())]
		};

		const result = findCommonAncestor(h, 'missing', 'w0');
		expect(result.found).toBe(false);
	});

	it('should return found=false when remote writeId is missing', () => {
		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [makeSnapshot('w0', null, 1, createMinimalState())]
		};

		const result = findCommonAncestor(h, 'w0', 'missing');
		expect(result.found).toBe(false);
	});

	it('should handle same writeId for local and remote', () => {
		const state = createMinimalState();
		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [makeSnapshot('w0', null, 1, state)]
		};

		const result = findCommonAncestor(h, 'w0', 'w0');
		expect(result.found).toBe(true);
		expect(result.writeId).toBe('w0');
	});

	it('should reconstruct ancestor state from snapshot', () => {
		const state = createMinimalState();
		const h: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [makeSnapshot('w0', null, 1, state)]
		};

		const result = findCommonAncestor(h, 'w0', 'w0');
		expect(result.state).toEqual(state);
	});
});

// ─── mergeHistories ─────────────────────────────────────────

describe('historyManager.mergeHistories', () => {
	it('should add entries from remote that local does not have', () => {
		const state = createMinimalState();

		const local: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [makeSnapshot('w0', null, 1, state)]
		};

		const remote: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				makeSnapshot('w0', null, 1, state),
				makeDelta('w1', 'w0', 2, {})
			]
		};

		const merged = mergeHistories(local, remote);
		expect(merged.entries).toHaveLength(2);
		expect(merged.entries.map((e) => e.writeId)).toContain('w1');
	});

	it('should not duplicate entries with the same writeId', () => {
		const state = createMinimalState();
		const entry = makeSnapshot('w0', null, 1, state);

		const local: SyncHistory = { backupSchemaVersion: 3, entries: [entry] };
		const remote: SyncHistory = { backupSchemaVersion: 3, entries: [entry] };

		const merged = mergeHistories(local, remote);
		expect(merged.entries).toHaveLength(1);
	});

	it('should sort merged entries by timestamp', () => {
		const state = createMinimalState();

		const local: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				makeSnapshot('w0', null, 1, state),
				makeDelta('w2', 'w1', 30, {})
			]
		};

		const remote: SyncHistory = {
			backupSchemaVersion: 3,
			entries: [
				makeSnapshot('w0', null, 1, state),
				makeDelta('w1', 'w0', 20, {})
			]
		};

		const merged = mergeHistories(local, remote);
		const timestamps = merged.entries.map((e) => e.timestamp);
		expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
	});

	it('should merge two empty histories', () => {
		const local = createEmptyHistory();
		const remote = createEmptyHistory();

		const merged = mergeHistories(local, remote);
		expect(merged.entries).toHaveLength(0);
	});

	it('should use the higher backupSchemaVersion', () => {
		const local: SyncHistory = { backupSchemaVersion: 3, entries: [] };
		const remote: SyncHistory = { backupSchemaVersion: 4, entries: [] };

		const merged = mergeHistories(local, remote);
		expect(merged.backupSchemaVersion).toBe(4);
	});
});
