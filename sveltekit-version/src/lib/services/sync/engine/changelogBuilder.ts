/**
 * מודול changelog — בונה תיאור קריא של שינויים בהיסטוריית סנכרון.
 * מודול נפרד מ-historyManager — לא מתערבב עם לוגיקה קריטית.
 */
import type { SyncHistory, HistoryEntry } from './types';
import { reconstructState } from './historyManager';
import { calculateDelta } from './syncEngine';

/** סוג שינוי יחיד */
export type ChangeDetail = {
	kind:
		| 'task-added'
		| 'task-removed'
		| 'task-changed'
		| 'user-added'
		| 'user-removed'
		| 'list-added'
		| 'list-removed'
		| 'settings-changed';
	/** תיאור קריא, למשל: "משימה 'ארוחת בוקר' נוספה" */
	description: string;
};

/** שורת changelog — מייצגת entry יחיד בהיסטוריה */
export type ChangelogLine = {
	writeId: string;
	timestamp: number;
	deviceName: string;
	type: 'snapshot' | 'delta';
	changes: ChangeDetail[];
};

/**
 * בונה changelog קריא מהיסטוריית סנכרון.
 * עובר על כל entry, משחזר state לפני ואחרי, ומתאר את השינויים.
 * @param history - היסטוריית הסנכרון
 * @returns מערך שורות changelog
 */
export function buildChangelog(history: SyncHistory): ChangelogLine[] {
	const lines: ChangelogLine[] = [];

	for (const entry of history.entries) {
		const line: ChangelogLine = {
			writeId: entry.writeId,
			timestamp: entry.timestamp,
			deviceName: entry.deviceName,
			type: entry.type,
			changes: []
		};

		if (entry.type === 'snapshot') {
			// snapshot ראשון — כל מה שבתוכו הוא "חדש"
			if (!entry.parentWriteId) {
				line.changes.push({ kind: 'task-added', description: 'סנכרון ראשוני' });
			} else {
				// snapshot עם parent — נשווה ל-parent
				const parentState = reconstructState(history, entry.parentWriteId);
				if (parentState) {
					line.changes = describeDelta(
						calculateDelta(parentState, entry.state) ?? {},
						parentState
					);
				} else {
					line.changes.push({ kind: 'task-added', description: 'snapshot (ללא בסיס להשוואה)' });
				}
			}
		} else {
			// delta — מתאר את ה-delta ישירות
			const baseState = entry.parentWriteId
				? reconstructState(history, entry.parentWriteId)
				: null;
			line.changes = describeDelta(entry.delta, baseState ?? {});
		}

		lines.push(line);
	}

	return lines;
}

/**
 * מתאר delta כרשימת שינויים קריאים.
 * @param delta - אובייקט delta מ-jsondiffpatch
 * @param baseState - ה-state שלפני השינוי (לשליפת שמות)
 * @returns מערך תיאורי שינויים
 */
export function describeDelta(delta: object, baseState: Record<string, any>): ChangeDetail[] {
	const changes: ChangeDetail[] = [];
	if (!delta || typeof delta !== 'object') return changes;

	const d = delta as Record<string, any>;

	// שינויים ב-users
	if (d.users) {
		for (const [userId, userDelta] of Object.entries(d.users)) {
			if (isAdded(userDelta)) {
				const name = (userDelta as any[])[0]?.name ?? userId;
				changes.push({ kind: 'user-added', description: `משתמש '${name}' נוסף` });
			} else if (isRemoved(userDelta)) {
				const name = baseState.users?.[userId]?.name ?? userId;
				changes.push({ kind: 'user-removed', description: `משתמש '${name}' הוסר` });
			}
		}
	}

	// שינויים ב-lists
	if (d.lists) {
		for (const [, userListsDelta] of Object.entries(d.lists)) {
			if (!userListsDelta || typeof userListsDelta !== 'object') continue;
			for (const [listId, listDelta] of Object.entries(userListsDelta as Record<string, any>)) {
				if (isAdded(listDelta)) {
					const name = (listDelta as any[])[0]?.name ?? listId;
					changes.push({ kind: 'list-added', description: `רשימה '${name}' נוספה` });
				} else if (isRemoved(listDelta)) {
					changes.push({ kind: 'list-removed', description: `רשימה הוסרה` });
				} else if (typeof listDelta === 'object' && listDelta !== null) {
					// שינויים ב-tasks בתוך הרשימה
					const tasksDelta = (listDelta as Record<string, any>).tasks;
					if (tasksDelta && typeof tasksDelta === 'object') {
						for (const [taskId, taskDelta] of Object.entries(tasksDelta)) {
							if (isAdded(taskDelta)) {
								const name = (taskDelta as any[])[0]?.name ?? taskId;
								changes.push({ kind: 'task-added', description: `משימה '${name}' נוספה` });
							} else if (isRemoved(taskDelta)) {
								changes.push({ kind: 'task-removed', description: `משימה הוסרה` });
							} else if (typeof taskDelta === 'object' && taskDelta !== null) {
								changes.push({ kind: 'task-changed', description: `משימה עודכנה (${taskId.slice(0, 8)}…)` });
							}
						}
					}
				}
			}
		}
	}

	// שינויים ב-settings
	if (d.settings) {
		changes.push({ kind: 'settings-changed', description: 'הגדרות עודכנו' });
	}

	// אם לא זיהינו שינויים ספציפיים
	if (changes.length === 0) {
		const topKeys = Object.keys(d).filter((k) => !k.startsWith('_'));
		if (topKeys.length > 0) {
			changes.push({ kind: 'task-changed', description: `שינויים ב: ${topKeys.join(', ')}` });
		}
	}

	return changes;
}

/** בודק אם delta-value מייצג הוספה (jsondiffpatch: [newValue]) */
function isAdded(v: any): v is [any] {
	return Array.isArray(v) && v.length === 1;
}

/** בודק אם delta-value מייצג הסרה (jsondiffpatch: [oldValue, 0, 0]) */
function isRemoved(v: any): v is [any, 0, 0] {
	return Array.isArray(v) && v.length === 3 && v[1] === 0 && v[2] === 0;
}
