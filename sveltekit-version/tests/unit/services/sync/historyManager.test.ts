import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '$lib/data/defaults';
import type { SyncHistory } from '$lib/services/sync/types';
import { calculateDelta } from '$lib/services/sync/syncEngine';
import { reconstructState } from '$lib/services/sync/historyManager';

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
});
