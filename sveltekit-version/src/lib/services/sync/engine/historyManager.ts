import type {
	SyncHistory,
	HistoryEntry,
	DeltaEntry,
	CommonAncestorResult
} from './types';
import type { AppState } from '$lib/types';
import { applyDelta } from './syncEngine';

const TAG = '[HistoryManager]';
const SNAPSHOT_INTERVAL = 20;

export function createEmptyHistory(): SyncHistory {
	return {
		backupSchemaVersion: 3,
		entries: []
	};
}

export function appendToHistory(history: SyncHistory, entry: HistoryEntry): void {
	history.entries.push(entry);
	console.log(TAG, `Entry נוסף: ${entry.type} (writeId: ${entry.writeId})`);
}

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

export function findEntryByWriteId(
	history: SyncHistory,
	writeId: string
): HistoryEntry | null {
	return history.entries.find((e) => e.writeId === writeId) || null;
}

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

export function reconstructState(history: SyncHistory, writeId: string): AppState | null {
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

	let state: AppState =
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
	return state;
}

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
