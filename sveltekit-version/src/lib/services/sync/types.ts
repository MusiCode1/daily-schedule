import type { AppState } from '$lib/types';

/**
 * מבנה history.json - שומר את כל הדלתות וה-snapshots
 */
export interface SyncHistory {
	backupSchemaVersion: number; // גרסת סכמת הגיבוי
	entries: HistoryEntry[]; // רשימת entries כרונולוגית
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
	writeId: string; // UUID ייחודי לגרסה זו
	parentWriteId: string | null; // writeId של ההורה (null = genesis)
	timestamp: number; // Date.now()
	deviceId: string; // מזהה המכשיר שיצר
	deviceName: string; // שם המכשיר (לUI)
	state: AppState; // State מלא!
}

/**
 * Delta - רק השינויים
 */
export interface DeltaEntry {
	type: 'delta';
	writeId: string;
	parentWriteId: string; // חובה! (לא null)
	timestamp: number;
	deviceId: string;
	deviceName: string;
	delta: object; // jsondiffpatch delta
}

/**
 * תוצאת חיפוש common ancestor
 */
export interface CommonAncestorResult {
	found: boolean;
	writeId: string | null;
	entry: HistoryEntry | null;
	state: AppState | null; // state משוחזר (snapshot או snapshot + deltas)
}
