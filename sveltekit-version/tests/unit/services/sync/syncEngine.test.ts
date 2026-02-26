import { describe, expect, it } from 'vitest';
import {
	calculateDelta,
	applyDelta,
	threeWayMerge,
	areStatesEqual
} from '$lib/services/sync/syncEngine';
import type { AppState } from '$lib/types';

function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function createMinimalState(overrides?: Partial<AppState>): AppState {
	return {
		version: 15,
		users: {
			u1: {
				id: 'u1',
				name: 'משתמש א',
				gender: 'boy',
				avatar: '/img/u1.png',
				themeColor: '#000'
			}
		},
		lists: {
			u1: {
				list1: {
					id: 'list1',
					name: 'רשימה א',
					tasks: {
						t1: { id: 't1', name: 'משימה 1', imageSrc: null, isDone: false, order: 0 },
						t2: { id: 't2', name: 'משימה 2', imageSrc: null, isDone: false, order: 1 },
						t3: { id: 't3', name: 'משימה 3', imageSrc: null, isDone: false, order: 2 }
					}
				}
			}
		},
		images: {},
		people: {},
		activeListId: { u1: 'list1' },
		currentUserId: 'u1',
		settings: { lastActiveTime: 1000, childLockEnabled: false },
		lastModified: 1000,
		...overrides
	};
}

// ─── calculateDelta ─────────────────────────────────────────

describe('syncEngine.calculateDelta', () => {
	it('should return undefined for identical states', () => {
		const state = createMinimalState();
		expect(calculateDelta(state, deepClone(state))).toBeUndefined();
	});

	it('should detect a task name change', () => {
		const old = createMinimalState();
		const updated = deepClone(old);
		updated.lists.u1.list1.tasks.t1.name = 'שם חדש';

		const delta = calculateDelta(old, updated);
		expect(delta).toBeDefined();
	});

	it('should detect a new task added', () => {
		const old = createMinimalState();
		const updated = deepClone(old);
		updated.lists.u1.list1.tasks.t4 = {
			id: 't4',
			name: 'משימה 4',
			imageSrc: null,
			isDone: false,
			order: 3
		};

		const delta = calculateDelta(old, updated);
		expect(delta).toBeDefined();
	});

	it('should detect a task removal', () => {
		const old = createMinimalState();
		const updated = deepClone(old);
		delete updated.lists.u1.list1.tasks.t3;

		const delta = calculateDelta(old, updated);
		expect(delta).toBeDefined();
	});

	it('should detect an order change', () => {
		const old = createMinimalState();
		const updated = deepClone(old);
		updated.lists.u1.list1.tasks.t1.order = 2;
		updated.lists.u1.list1.tasks.t3.order = 0;

		const delta = calculateDelta(old, updated);
		expect(delta).toBeDefined();
	});
});

// ─── applyDelta ─────────────────────────────────────────────

describe('syncEngine.applyDelta', () => {
	it('should apply a field change delta correctly', () => {
		const base = createMinimalState();
		const modified = deepClone(base);
		modified.lists.u1.list1.tasks.t1.name = 'שם חדש';

		const delta = calculateDelta(base, modified)!;
		const result = applyDelta(base, delta) as any;

		expect(result.lists.u1.list1.tasks.t1.name).toBe('שם חדש');
	});

	it('should apply an add-task delta correctly', () => {
		const base = createMinimalState();
		const modified = deepClone(base);
		modified.lists.u1.list1.tasks.t4 = {
			id: 't4',
			name: 'משימה 4',
			imageSrc: null,
			isDone: false,
			order: 3
		};

		const delta = calculateDelta(base, modified)!;
		const result = applyDelta(base, delta) as any;

		expect(result.lists.u1.list1.tasks.t4).toBeDefined();
		expect(result.lists.u1.list1.tasks.t4.name).toBe('משימה 4');
	});

	it('should round-trip: applyDelta(base, calculateDelta(base, target)) === target', () => {
		const base = createMinimalState();
		const target = deepClone(base);
		target.lists.u1.list1.tasks.t1.name = 'שם אחר';
		target.lists.u1.list1.tasks.t2.order = 5;
		target.settings.childLockEnabled = true;

		const delta = calculateDelta(base, target)!;
		const result = applyDelta(base, delta) as any;

		expect(result.lists.u1.list1.tasks.t1.name).toBe('שם אחר');
		expect(result.lists.u1.list1.tasks.t2.order).toBe(5);
		expect(result.settings.childLockEnabled).toBe(true);
	});

	it('should not mutate the base state', () => {
		const base = createMinimalState();
		const baseCopy = deepClone(base);
		const modified = deepClone(base);
		modified.lists.u1.list1.tasks.t1.name = 'שם חדש';

		const delta = calculateDelta(base, modified)!;
		applyDelta(base, delta);

		expect(base).toEqual(baseCopy);
	});
});

// ─── threeWayMerge ──────────────────────────────────────────

describe('syncEngine.threeWayMerge', () => {
	it('should return ancestor when neither side changed', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);

		const merged = threeWayMerge(ancestor, local, remote);
		expect(merged).toEqual(ancestor);
	});

	it('should return remote when only remote changed', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);
		remote.lists.u1.list1.tasks.t1.name = 'שם מרוחק';

		const merged = threeWayMerge(ancestor, local, remote) as any;
		expect(merged.lists.u1.list1.tasks.t1.name).toBe('שם מרוחק');
	});

	it('should return local when only local changed', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);
		local.lists.u1.list1.tasks.t1.name = 'שם מקומי';

		const merged = threeWayMerge(ancestor, local, remote) as any;
		expect(merged.lists.u1.list1.tasks.t1.name).toBe('שם מקומי');
	});

	it('should merge when both sides changed different fields', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);

		local.lists.u1.list1.tasks.t1.name = 'שם מקומי';
		remote.lists.u1.list1.tasks.t2.name = 'שם מרוחק';

		const merged = threeWayMerge(ancestor, local, remote) as any;
		expect(merged.lists.u1.list1.tasks.t1.name).toBe('שם מקומי');
		expect(merged.lists.u1.list1.tasks.t2.name).toBe('שם מרוחק');
	});

	it('should use last-write-wins when both sides changed the same field', () => {
		const ancestor = createMinimalState({ lastModified: 100 });
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);

		local.lists.u1.list1.tasks.t1.name = 'מקומי';
		local.lastModified = 200;

		remote.lists.u1.list1.tasks.t1.name = 'מרוחק';
		remote.lastModified = 150;

		const merged = threeWayMerge(ancestor, local, remote) as any;
		// jsondiffpatch patches remote first then local, so local wins when no conflict exception
		// If it throws (conflict) -> last-write-wins by timestamp -> local wins (200 > 150)
		expect(merged.lists.u1.list1.tasks.t1.name).toBe('מקומי');
	});

	it('should keep tasks added on both sides', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);

		local.lists.u1.list1.tasks.t_local = {
			id: 't_local',
			name: 'משימה מקומית',
			imageSrc: null,
			isDone: false,
			order: 3
		};

		remote.lists.u1.list1.tasks.t_remote = {
			id: 't_remote',
			name: 'משימה מרוחקת',
			imageSrc: null,
			isDone: false,
			order: 4
		};

		const merged = threeWayMerge(ancestor, local, remote) as any;
		expect(merged.lists.u1.list1.tasks.t_local).toBeDefined();
		expect(merged.lists.u1.list1.tasks.t_remote).toBeDefined();
	});

	it('should normalize order after merge (no gaps, no duplicates)', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);

		local.lists.u1.list1.tasks.t_a = {
			id: 't_a',
			name: 'חדש A',
			imageSrc: null,
			isDone: false,
			order: 3
		};
		remote.lists.u1.list1.tasks.t_b = {
			id: 't_b',
			name: 'חדש B',
			imageSrc: null,
			isDone: false,
			order: 3 // order כפול
		};

		const merged = threeWayMerge(ancestor, local, remote) as any;
		const orders = Object.values(merged.lists.u1.list1.tasks).map((t: any) => t.order);
		orders.sort((a: number, b: number) => a - b);

		// verify sequential: 0, 1, 2, 3, 4
		expect(orders).toEqual([0, 1, 2, 3, 4]);
	});

	it('should use id as tie-breaker for same order', () => {
		const ancestor = createMinimalState();
		const local = deepClone(ancestor);
		const remote = deepClone(ancestor);

		local.lists.u1.list1.tasks.aaa = {
			id: 'aaa',
			name: 'AAA',
			imageSrc: null,
			isDone: false,
			order: 10
		};
		remote.lists.u1.list1.tasks.zzz = {
			id: 'zzz',
			name: 'ZZZ',
			imageSrc: null,
			isDone: false,
			order: 10
		};

		const merged = threeWayMerge(ancestor, local, remote) as any;
		const taskAaa = merged.lists.u1.list1.tasks.aaa;
		const taskZzz = merged.lists.u1.list1.tasks.zzz;

		// 'aaa' < 'zzz' lexicographically => aaa gets lower order
		expect(taskAaa.order).toBeLessThan(taskZzz.order);
	});
});

// ─── areStatesEqual ─────────────────────────────────────────

describe('syncEngine.areStatesEqual', () => {
	it('should return true for identical states', () => {
		const state = createMinimalState();
		expect(areStatesEqual(state, deepClone(state))).toBe(true);
	});

	it('should return true when only lastModified differs', () => {
		const a = createMinimalState({ lastModified: 100 });
		const b = createMinimalState({ lastModified: 999 });
		expect(areStatesEqual(a, b)).toBe(true);
	});

	it('should return false when a non-timestamp field differs', () => {
		const a = createMinimalState();
		const b = deepClone(a);
		b.lists.u1.list1.tasks.t1.name = 'שונה';
		expect(areStatesEqual(a, b)).toBe(false);
	});
});
