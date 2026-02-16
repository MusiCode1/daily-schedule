import * as jsondiffpatch from 'jsondiffpatch';
import type { AppState } from '$lib/types';

const TAG = '[SyncEngine]';

// יצירת differ עם הגדרות מותאמות
const differ = jsondiffpatch.create({
	arrays: {
		detectMove: true, // זיהוי תזוזות (drag & drop)
		includeValueOnMove: false
	}
	// הסרת textDiff - לא נדרש עבור המבנה שלנו
});

/**
 * חישוב delta בין שני states
 */
export function calculateDelta(oldState: AppState, newState: AppState): object | undefined {
	const delta = differ.diff(oldState, newState);

	if (!delta) {
		console.log(TAG, 'אין שינויים בין הגרסאות');
		return undefined;
	}

	console.log(TAG, 'Delta מחושב:', delta);
	return delta;
}

/**
 * החלת delta על state
 */
export function applyDelta(baseState: AppState, delta: object): AppState {
	const result = differ.patch(
		JSON.parse(JSON.stringify(baseState)), // clone עמוק
		delta as jsondiffpatch.Delta
	);

	console.log(TAG, 'Delta הוחל בהצלחה');
	return result as AppState;
}

/**
 * 3-way merge - המוח של המערכת
 *
 * @param common - common ancestor
 * @param local - שינויים מקומיים
 * @param remote - שינויים מרוחקים
 * @returns state ממוזג
 */
export function threeWayMerge(common: AppState, local: AppState, remote: AppState): AppState {
	console.log(TAG, '3-way merge מתחיל...');

	// 1. חישוב דלתות
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

	// 2. ניסיון למזג
	console.log(TAG, 'שני הצדדים השתנו - מבצע merge');

	// התחל מ-common
	let merged = JSON.parse(JSON.stringify(common));

	// החל את deltaRemote
	merged = differ.patch(merged, deltaRemote);

	// נסה להחיל את deltaLocal
	try {
		merged = differ.patch(merged, deltaLocal);
		console.log(TAG, 'Merge הצליח ללא קונפליקטים');
	} catch (error) {
		console.warn(TAG, 'קונפליקט זוהה, משתמש ב-last-write-wins', error);

		// במקרה של קונפליקט - last-write-wins
		// נבדוק timestamps
		merged = local.lastModified > remote.lastModified ? local : remote;
	}

	// 3. נורמליזציה של order
	normalizeMergedState(merged);

	return merged;
}

/**
 * נורמליזציה של order אחרי merge
 * מטפל בכפילויות ופערים
 */
function normalizeMergedState(state: AppState): void {
	console.log(TAG, 'מנרמל order...');

	// עבור כל משתמש
	Object.keys(state.lists).forEach((userId) => {
		const userLists = state.lists[userId];

		// עבור כל רשימה
		Object.values(userLists).forEach((list: any) => {
			const tasks = Object.values(list.tasks);

			// מיין לפי order, אם שוויון → לפי id
			tasks.sort((a: any, b: any) => {
				if (a.order !== b.order) return a.order - b.order;
				return a.id.localeCompare(b.id);
			});

			// עדכן order להיות רציף: 0, 1, 2, 3...
			tasks.forEach((task: any, index: number) => {
				task.order = index;
			});
		});
	});

	console.log(TAG, 'נורמליזציה הסתיימה');
}

/**
 * בדיקה אם state A ו-B זהים (ללא timestamp)
 */
export function areStatesEqual(a: AppState, b: AppState): boolean {
	const aCopy = { ...a };
	const bCopy = { ...b };

	// התעלם מ-timestamps
	delete (aCopy as any).lastModified;
	delete (bCopy as any).lastModified;

	return JSON.stringify(aCopy) === JSON.stringify(bCopy);
}
