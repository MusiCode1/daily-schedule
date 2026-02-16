import type {
	SyncHistory,
	HistoryEntry,
	DeltaEntry,
	CommonAncestorResult
} from './types';
import type { AppState } from '$lib/types';
import { applyDelta } from './syncEngine';

const TAG = '[HistoryManager]';
const SNAPSHOT_INTERVAL = 20; // snapshot כל 20 גרסאות

/**
 * יצירת history ריק (genesis)
 */
export function createEmptyHistory(): SyncHistory {
	return {
		backupSchemaVersion: 3, // גרסה חדשה (2 היא הנוכחית)
		entries: []
	};
}

/**
 * הוספת entry להיסטוריה
 */
export function appendToHistory(history: SyncHistory, entry: HistoryEntry): void {
	history.entries.push(entry);
	console.log(TAG, `Entry נוסף: ${entry.type} (writeId: ${entry.writeId})`);
}

/**
 * החלטה אם ליצור snapshot או delta
 */
export function shouldCreateSnapshot(history: SyncHistory): boolean {
	// אם אין entries → genesis snapshot
	if (history.entries.length === 0) {
		return true;
	}

	// מצא את ה-snapshot האחרון
	const lastSnapshotIndex = history.entries
		.map((e, i) => ({ e, i }))
		.reverse()
		.find(({ e }) => e.type === 'snapshot')?.i;

	if (lastSnapshotIndex === undefined) {
		// אין snapshot בכלל? (לא אמור לקרות אחרי genesis)
		return true;
	}

	// כמה deltas מאז ה-snapshot האחרון?
	const deltasSinceSnapshot = history.entries.length - lastSnapshotIndex - 1;

	return deltasSinceSnapshot >= SNAPSHOT_INTERVAL;
}

/**
 * חיפוש writeId בהיסטוריה
 */
export function findEntryByWriteId(
	history: SyncHistory,
	writeId: string
): HistoryEntry | null {
	return history.entries.find((e) => e.writeId === writeId) || null;
}

/**
 * מציאת common ancestor - המוח של המערכת!
 *
 * @param history - ההיסטוריה המשותפת
 * @param localWriteId - writeId מקומי
 * @param remoteWriteId - writeId מרוחק
 * @returns common ancestor + state משוחזר
 */
export function findCommonAncestor(
	history: SyncHistory,
	localWriteId: string,
	remoteWriteId: string
): CommonAncestorResult {
	console.log(TAG, `מחפש common ancestor בין ${localWriteId} ל-${remoteWriteId}`);

	// 1. בנה שרשרת עבור local
	const localChain = buildChain(history, localWriteId);

	// 2. בנה שרשרת עבור remote
	const remoteChain = buildChain(history, remoteWriteId);

	if (!localChain || !remoteChain) {
		console.error(TAG, 'לא הצלחתי לבנות שרשרת');
		return { found: false, writeId: null, entry: null, state: null };
	}

	// 3. מצא את ה-writeId המשותף הראשון
	const commonWriteId = localChain.find((id) => remoteChain.includes(id));

	if (!commonWriteId) {
		console.error(TAG, 'אין common ancestor!');
		return { found: false, writeId: null, entry: null, state: null };
	}

	console.log(TAG, `Common ancestor נמצא: ${commonWriteId}`);

	// 4. שחזר את ה-state של ה-ancestor
	const entry = findEntryByWriteId(history, commonWriteId);
	if (!entry) {
		console.error(TAG, 'Entry לא נמצא (לא אמור לקרות)');
		return { found: false, writeId: commonWriteId, entry: null, state: null };
	}

	const state = reconstructState(history, commonWriteId);

	return { found: true, writeId: commonWriteId, entry, state };
}

/**
 * בניית שרשרת writeIds מ-writeId נתון עד genesis
 *
 * @returns [writeId, parent, grandparent, ..., genesis]
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
 * שחזור state מהיסטוריה
 *
 * @param history - ההיסטוריה
 * @param writeId - writeId לשחזור
 * @returns state משוחזר
 */
export function reconstructState(history: SyncHistory, writeId: string): AppState | null {
	console.log(TAG, `משחזר state עבור writeId: ${writeId}`);

	// 1. מצא את ה-entry
	const targetEntry = findEntryByWriteId(history, writeId);
	if (!targetEntry) {
		console.error(TAG, 'Entry לא נמצא');
		return null;
	}

	// 2. אם זה snapshot - החזר ישירות
	if (targetEntry.type === 'snapshot') {
		console.log(TAG, 'זה snapshot - מחזיר ישירות');
		if (typeof structuredClone === 'function') return structuredClone(targetEntry.state);
		return JSON.parse(JSON.stringify(targetEntry.state));
	}

	// 3. זה delta - צריך למצוא snapshot קודם
	const chain = buildChain(history, writeId);
	if (!chain) {
		console.error(TAG, 'לא הצלחתי לבנות שרשרת');
		return null;
	}

	// 4. מצא את ה-snapshot הראשון בשרשרת (מה-target אחורה)
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

	let state: AppState =
		typeof structuredClone === 'function'
			? structuredClone(snapshotEntry.state)
			: JSON.parse(JSON.stringify(snapshotEntry.state));

	console.log(TAG, `מתחיל מ-snapshot: ${snapshotWriteId}`);

	// 5. החל רק את ה-deltas שנמצאים בשרשרת ההורים של ה-target
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
	return state;
}

/**
 * מיזוג שתי היסטוריות (מטא-קונפליקט)
 * קורה כשבשני המכשירים הוסיפו entries בזמן שהיו offline
 */
export function mergeHistories(
	localHistory: SyncHistory,
	remoteHistory: SyncHistory
): SyncHistory {
	console.log(TAG, 'ממזג שתי היסטוריות...');

	// 1. מצא entries שיש רק ב-remote
	const localWriteIds = new Set(localHistory.entries.map((e) => e.writeId));
	const newEntries = remoteHistory.entries.filter((e) => !localWriteIds.has(e.writeId));

	console.log(TAG, `נמצאו ${newEntries.length} entries חדשים מ-remote`);

	// 2. הוסף אותם ל-local
	const merged: SyncHistory = {
		backupSchemaVersion: Math.max(
			localHistory.backupSchemaVersion,
			remoteHistory.backupSchemaVersion
		),
		entries: [...localHistory.entries, ...newEntries]
	};

	// 3. מיין לפי timestamp
	merged.entries.sort((a, b) => a.timestamp - b.timestamp);

	console.log(TAG, `היסטוריה ממוזגת: ${merged.entries.length} entries`);

	return merged;
}
