import type { AppState } from '$lib/types';

/**
 * מבנה history.json - שומר את כל הדלתות וה-snapshots
 */
export interface SyncHistory {
	backupSchemaVersion: number;
	entries: HistoryEntry[];
}

/**
 * Entry יחיד בהיסטוריה
 */
export type HistoryEntry = SnapshotEntry | DeltaEntry;

/**
 * Snapshot מלא - נקודת ציון
 */
export interface SnapshotEntry {
	type: 'snapshot';
	writeId: string;
	parentWriteId: string | null;
	timestamp: number;
	deviceId: string;
	deviceName: string;
	state: AppState;
}

/**
 * Delta - רק השינויים
 */
export interface DeltaEntry {
	type: 'delta';
	writeId: string;
	parentWriteId: string;
	timestamp: number;
	deviceId: string;
	deviceName: string;
	delta: object;
}

/**
 * תוצאת חיפוש common ancestor
 */
export interface CommonAncestorResult {
	found: boolean;
	writeId: string | null;
	entry: HistoryEntry | null;
	state: AppState | null;
}
