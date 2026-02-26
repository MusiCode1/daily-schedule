import type {
	SyncHistory,
	HistoryEntry,
	DeltaEntry,
	CommonAncestorResult
} from './types';
import { applyDelta } from './syncEngine';

const TAG = '[HistoryManager]';
const SNAPSHOT_INTERVAL = 20;

/**
 * יוצר אובייקט היסטוריה ריק עם גרסת סכימה נוכחית.
 * משמש כנקודת התחלה כשאין היסטוריית סנכרון קיימת.
 * @returns היסטוריית סנכרון ריקה
 */
export function createEmptyHistory(): SyncHistory {
	return {
		backupSchemaVersion: 3,
		entries: []
	};
}

/**
 * מוסיף רשומה חדשה (snapshot או delta) לסוף ההיסטוריה.
 * @param history - אובייקט ההיסטוריה לעדכון (מוטציה ישירה)
 * @param entry - הרשומה להוספה
 */
export function appendToHistory(history: SyncHistory, entry: HistoryEntry): void {
	history.entries.push(entry);
	console.log(TAG, `Entry נוסף: ${entry.type} (writeId: ${entry.writeId})`);
}

/**
 * קובע האם יש ליצור snapshot חדש במקום delta.
 * מחזיר true אם ההיסטוריה ריקה, אין snapshot קיים,
 * או שמספר ה-delta entries מאז ה-snapshot האחרון חרג מה-SNAPSHOT_INTERVAL.
 * @param history - ההיסטוריה לבדיקה
 * @returns true אם נדרש snapshot חדש
 */
export function shouldCreateSnapshot(history: SyncHistory): boolean {
	if (history.entries.length === 0) return true;

	const lastSnapshotIndex = history.entries
		.map((e, i) => ({ e, i }))
		.reverse()
		.find(({ e }) => e.type === 'snapshot')?.i;

	if (lastSnapshotIndex === undefined) return true;

	const deltasSinceSnapshot = history.entries.length - lastSnapshotIndex - 1;
	return deltasSinceSnapshot >= SNAPSHOT_INTERVAL;
}

/**
 * מאתר רשומת היסטוריה לפי מזהה כתיבה ייחודי.
 * @param history - ההיסטוריה לחיפוש
 * @param writeId - מזהה הכתיבה לחיפוש
 * @returns הרשומה שנמצאה, או null אם לא קיימת
 */
export function findEntryByWriteId(
	history: SyncHistory,
	writeId: string
): HistoryEntry | null {
	return history.entries.find((e) => e.writeId === writeId) || null;
}

/**
 * מוצא את האב הקדמון המשותף (common ancestor) בין שני writeId-ים בהיסטוריה.
 * בונה שרשרת parentWriteId עבור כל צד ומחפש את הצומת הראשון המשותף.
 * אם נמצא — משחזר גם את ה-state של אותו אב קדמון (לשימוש ב-3-way merge).
 * @param history - ההיסטוריה לחיפוש
 * @param localWriteId - מזהה הכתיבה המקומי
 * @param remoteWriteId - מזהה הכתיבה המרוחק
 * @returns תוצאה עם found, writeId, entry ו-state של האב הקדמון (או ערכי null אם לא נמצא)
 */
export function findCommonAncestor(
	history: SyncHistory,
	localWriteId: string,
	remoteWriteId: string
): CommonAncestorResult {
	console.log(TAG, `מחפש common ancestor בין ${localWriteId} ל-${remoteWriteId}`);

	const localChain = buildChain(history, localWriteId);
	const remoteChain = buildChain(history, remoteWriteId);

	if (!localChain || !remoteChain) {
		console.error(TAG, 'לא הצלחתי לבנות שרשרת');
		return { found: false, writeId: null, entry: null, state: null };
	}

	const commonWriteId = localChain.find((id) => remoteChain.includes(id));

	if (!commonWriteId) {
		console.error(TAG, 'אין common ancestor!');
		return { found: false, writeId: null, entry: null, state: null };
	}

	console.log(TAG, `Common ancestor נמצא: ${commonWriteId}`);

	const entry = findEntryByWriteId(history, commonWriteId);
	if (!entry) {
		console.error(TAG, 'Entry לא נמצא (לא אמור לקרות)');
		return { found: false, writeId: commonWriteId, entry: null, state: null };
	}

	const state = reconstructState(history, commonWriteId);
	return { found: true, writeId: commonWriteId, entry, state };
}

/**
 * בונה שרשרת writeId-ים מרשומה נתונה עד ל-root (רשומה ללא parent).
 * עוקב אחרי parentWriteId כלפי מעלה, עם הגנה מפני מחזורים וחריגה באורך.
 * @param history - ההיסטוריה לחיפוש
 * @param writeId - מזהה הכתיבה ממנו מתחילים לבנות את השרשרת
 * @returns מערך writeId-ים מהנוכחי עד ל-root, או null בעת שגיאה (מחזור, entry חסר, או שרשרת ארוכה מדי)
 */
function buildChain(history: SyncHistory, writeId: string): string[] | null {
	const chain: string[] = [];
	const visited = new Set<string>();
	let currentId: string | null = writeId;
	const MAX_CHAIN_LENGTH = 10000;

	while (currentId) {
		if (visited.has(currentId)) {
			console.error(TAG, `זוהה מחזור בשרשרת history סביב writeId: ${currentId}`);
			return null;
		}

		visited.add(currentId);
		const entry = findEntryByWriteId(history, currentId);

		if (!entry) {
			console.error(TAG, `Entry לא נמצא: ${currentId}`);
			return null;
		}

		chain.push(currentId);
		if (chain.length > MAX_CHAIN_LENGTH) {
			console.error(TAG, 'שרשרת history ארוכה בצורה חריגה - ביטול לשם בטיחות');
			return null;
		}
		currentId = entry.parentWriteId;
	}

	return chain;
}

/**
 * משחזר את ה-state המלא עבור writeId נתון על ידי חזרה ל-snapshot האחרון בשרשרת
 * והחלת כל ה-delta entries שבדרך.
 * אם הרשומה עצמה היא snapshot — מחזיר אותה ישירות.
 * @param history - ההיסטוריה המכילה את הרשומות
 * @param writeId - מזהה הכתיבה שעבורו יש לשחזר את ה-state
 * @returns ה-state המשוחזר, או null אם לא ניתן לשחזר (entry חסר, אין snapshot בשרשרת וכו')
 */
export function reconstructState(history: SyncHistory, writeId: string): Record<string, any> | null {
	console.log(TAG, `משחזר state עבור writeId: ${writeId}`);

	const targetEntry = findEntryByWriteId(history, writeId);
	if (!targetEntry) {
		console.error(TAG, 'Entry לא נמצא');
		return null;
	}

	if (targetEntry.type === 'snapshot') {
		console.log(TAG, 'זה snapshot - מחזיר ישירות');
		if (typeof structuredClone === 'function') return structuredClone(targetEntry.state);
		return JSON.parse(JSON.stringify(targetEntry.state));
	}

	const chain = buildChain(history, writeId);
	if (!chain) {
		console.error(TAG, 'לא הצלחתי לבנות שרשרת');
		return null;
	}

	const snapshotWriteId = chain.find((id) => {
		const entry = findEntryByWriteId(history, id);
		return entry?.type === 'snapshot';
	});

	if (!snapshotWriteId) {
		console.error(TAG, 'אין snapshot בשרשרת');
		return null;
	}

	const snapshotEntry = findEntryByWriteId(history, snapshotWriteId);
	if (!snapshotEntry || snapshotEntry.type !== 'snapshot') {
		console.error(TAG, 'ה-snapshot שנמצא אינו תקין');
		return null;
	}

	let state: object =
		typeof structuredClone === 'function'
			? structuredClone(snapshotEntry.state)
			: JSON.parse(JSON.stringify(snapshotEntry.state));

	console.log(TAG, `מתחיל מ-snapshot: ${snapshotWriteId}`);

	const snapshotIndexInChain = chain.indexOf(snapshotWriteId);
	const deltaPathIds = chain.slice(0, snapshotIndexInChain).reverse();

	for (const deltaWriteId of deltaPathIds) {
		const entry = findEntryByWriteId(history, deltaWriteId);
		if (!entry) {
			console.error(TAG, `Entry חסר בשרשרת: ${deltaWriteId}`);
			return null;
		}
		if (entry.type !== 'delta') {
			console.error(TAG, `Entry בשרשרת אינו delta: ${entry.writeId}`);
			return null;
		}
		console.log(TAG, `מחיל delta: ${entry.writeId}`);
		state = applyDelta(state, entry.delta);
	}

	console.log(TAG, 'State שוחזר בהצלחה');
	return state as Record<string, any>;
}

/**
 * ממזג שתי היסטוריות (מקומית ומרוחקת) לאחת.
 * מוסיף רק רשומות שלא קיימות בהיסטוריה המקומית (לפי writeId),
 * ומסדר את כל הרשומות לפי timestamp.
 * @param localHistory - ההיסטוריה המקומית
 * @param remoteHistory - ההיסטוריה המרוחקת
 * @returns היסטוריה ממוזגת וממוינת
 */
export function mergeHistories(
	localHistory: SyncHistory,
	remoteHistory: SyncHistory
): SyncHistory {
	console.log(TAG, 'ממזג שתי היסטוריות...');

	const localWriteIds = new Set(localHistory.entries.map((e) => e.writeId));
	const newEntries = remoteHistory.entries.filter((e) => !localWriteIds.has(e.writeId));

	console.log(TAG, `נמצאו ${newEntries.length} entries חדשים מ-remote`);

	const merged: SyncHistory = {
		backupSchemaVersion: Math.max(
			localHistory.backupSchemaVersion,
			remoteHistory.backupSchemaVersion
		),
		entries: [...localHistory.entries, ...newEntries]
	};

	merged.entries.sort((a, b) => a.timestamp - b.timestamp);

	console.log(TAG, `היסטוריה ממוזגת: ${merged.entries.length} entries`);
	return merged;
}
