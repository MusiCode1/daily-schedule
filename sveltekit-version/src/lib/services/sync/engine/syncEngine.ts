import * as jsondiffpatch from 'jsondiffpatch';
import type { AppState } from '$lib/types';

const TAG = '[SyncEngine]';

const differ = jsondiffpatch.create({
	arrays: {
		detectMove: true,
		includeValueOnMove: false
	}
});

export function calculateDelta(oldState: AppState, newState: AppState): object | undefined {
	const delta = differ.diff(oldState, newState);
	if (!delta) {
		console.log(TAG, 'אין שינויים בין הגרסאות');
		return undefined;
	}
	console.log(TAG, 'Delta מחושב:', delta);
	return delta;
}

export function applyDelta(baseState: AppState, delta: object): AppState {
	const result = differ.patch(
		JSON.parse(JSON.stringify(baseState)),
		delta as jsondiffpatch.Delta
	);
	console.log(TAG, 'Delta הוחל בהצלחה');
	return result as AppState;
}

/**
 * 3-way merge - המוח של המערכת
 */
export function threeWayMerge(common: AppState, local: AppState, remote: AppState): AppState {
	console.log(TAG, '3-way merge מתחיל...');

	const deltaLocal = differ.diff(common, local);
	const deltaRemote = differ.diff(common, remote);

	if (!deltaLocal && !deltaRemote) {
		console.log(TAG, 'אין שינויים בשני הצדדים');
		return common;
	}
	if (!deltaLocal) {
		console.log(TAG, 'רק remote השתנה');
		return remote;
	}
	if (!deltaRemote) {
		console.log(TAG, 'רק local השתנה');
		return local;
	}

	console.log(TAG, 'שני הצדדים השתנו - מבצע merge');
	let merged = JSON.parse(JSON.stringify(common));
	merged = differ.patch(merged, deltaRemote);

	try {
		merged = differ.patch(merged, deltaLocal);
		console.log(TAG, 'Merge הצליח ללא קונפליקטים');
	} catch (error) {
		console.warn(TAG, 'קונפליקט זוהה, משתמש ב-last-write-wins', error);
		merged = local.lastModified > remote.lastModified ? local : remote;
	}

	normalizeMergedState(merged);
	return merged;
}

function normalizeMergedState(state: AppState): void {
	console.log(TAG, 'מנרמל order...');
	Object.keys(state.lists).forEach((userId) => {
		const userLists = state.lists[userId];
		Object.values(userLists).forEach((list: any) => {
			const tasks = Object.values(list.tasks);
			tasks.sort((a: any, b: any) => {
				if (a.order !== b.order) return a.order - b.order;
				return a.id.localeCompare(b.id);
			});
			tasks.forEach((task: any, index: number) => {
				task.order = index;
			});
		});
	});
	console.log(TAG, 'נורמליזציה הסתיימה');
}

export function areStatesEqual(a: AppState, b: AppState): boolean {
	const aCopy = { ...a };
	const bCopy = { ...b };
	delete (aCopy as any).lastModified;
	delete (bCopy as any).lastModified;
	return JSON.stringify(aCopy) === JSON.stringify(bCopy);
}
