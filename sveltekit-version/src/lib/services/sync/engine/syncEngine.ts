import * as jsondiffpatch from 'jsondiffpatch';

const TAG = '[SyncEngine]';

const differ = jsondiffpatch.create({
	arrays: {
		detectMove: true,
		includeValueOnMove: false
	}
});

/**
 * חישוב delta (הפרש) בין שתי גרסאות של מצב.
 * משתמש ב-jsondiffpatch לזיהוי שינויים כולל זיהוי הזזות במערכים.
 * @param oldState - המצב הישן (בסיס)
 * @param newState - המצב החדש
 * @returns אובייקט delta המתאר את השינויים, או undefined אם אין שינויים
 */
export function calculateDelta(oldState: object, newState: object): object | undefined {
	const delta = differ.diff(oldState, newState);
	if (!delta) {
		console.log(TAG, 'אין שינויים בין הגרסאות');
		return undefined;
	}
	console.log(TAG, 'Delta מחושב:', delta);
	return delta;
}

/**
 * החלת delta על מצב בסיס ליצירת מצב חדש.
 * מבצע deep clone של המצב לפני ההחלה כדי לא לשנות את המקור.
 * @param baseState - מצב הבסיס להחלה עליו
 * @param delta - אובייקט ה-delta שחושב על ידי {@link calculateDelta}
 * @returns מצב חדש עם השינויים מוחלים
 */
export function applyDelta(baseState: object, delta: object): object {
	const result = differ.patch(
		JSON.parse(JSON.stringify(baseState)),
		delta as jsondiffpatch.Delta
	);
	console.log(TAG, 'Delta הוחל בהצלחה');
	return result as object;
}

/**
 * מיזוג תלת-כיווני (3-way merge) — הלוגיקה המרכזית של פתרון קונפליקטים.
 * מחשב delta מה-common ancestor לכל צד (local ו-remote),
 * ומחיל את שניהם על הבסיס המשותף.
 * בקונפליקט — remote wins (last-write-wins).
 * מקבל historyContent objects ללא שדות אפמריים.
 * @param common - המצב המשותף האחרון (common ancestor)
 * @param local - המצב המקומי הנוכחי
 * @param remote - המצב המרוחק הנוכחי
 * @returns מצב ממוזג ומנורמל
 */
export function threeWayMerge(common: object, local: object, remote: object): object {
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
		console.warn(TAG, 'קונפליקט זוהה, last-write-wins לא זמין ב-historyContent, משתמש ב-remote', error);
		merged = remote;
	}

	normalizeMergedState(merged);
	return merged;
}

/**
 * נרמול מצב ממוזג — מסדר מחדש את ה-order של משימות בכל הרשימות.
 * מונע פערים או כפילויות ב-order שעלולות להיווצר אחרי merge.
 * ממיין לפי order קיים, ובמקרה שוויון — לפי id (deterministic).
 * @param state - אובייקט המצב הממוזג (משתנה in-place)
 */
function normalizeMergedState(state: any): void {
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

/**
 * השוואת שני מצבים תוך התעלמות משדה `localDevice` (אפמרי).
 * משתמש ב-JSON.stringify להשוואה עמוקה.
 * @param a - מצב ראשון להשוואה
 * @param b - מצב שני להשוואה
 * @returns true אם המצבים זהים (למעט שדות אפמריים)
 */
export function areStatesEqual(a: object, b: object): boolean {
	const aCopy = { ...a };
	const bCopy = { ...b };
	delete (aCopy as any).localDevice;
	delete (bCopy as any).localDevice;
	return JSON.stringify(aCopy) === JSON.stringify(bCopy);
}
