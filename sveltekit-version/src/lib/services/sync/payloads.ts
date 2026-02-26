import type { AppState } from '$lib/types';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './constants';
import type { SyncContent, SyncProgress } from './syncTypes';

/**
 * בונה את ה-payload של התוכן המבני לסנכרון.
 * ממיר את AppState לפורמט SyncContent — כולל users, people, lists, images ו-settings.
 * Users ו-people מומרים ממפה (map) למערך (array) עבור תאימות לענן.
 * @param state - מצב האפליקציה המקומי
 * @returns אובייקט SyncContent מוכן להעלאה
 */
export function buildContentPayload(state: AppState): SyncContent {
	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		appStateVersion: state.version,
		users: Object.values(state.users),
		people: Object.values(state.people),
		lists: state.lists,
		images: state.images,
		settings: {
			activeListId: state.settings.activeListId,
			currentUserId: state.settings.currentUserId,
			childLockEnabled: state.settings.childLockEnabled ?? false
		}
	};
}

/**
 * בונה את ה-payload של התקדמות המשימות לסנכרון.
 * מופרד מה-content כדי לאפשר עדכון progress בלבד ללא שינוי ב-writeId.
 * @param state - מצב האפליקציה המקומי
 * @returns אובייקט SyncProgress עם מצב ביצוע המשימות
 */
export function buildProgressPayload(state: AppState): SyncProgress {
	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		taskDone: state.taskProgress
	};
}

/**
 * אוסף את כל מזהי ה-assets (תמונות מ-IndexedDB) המופיעים ב-state.
 * סורק avatars של users ו-people, לוגואים של רשימות, ותמונות משימות.
 * מחזיר רק מזהים בפורמט `idb:*`.
 * @param state - מצב האפליקציה
 * @returns מערך מזהי IDB ייחודיים
 */
export function collectAssetIds(state: AppState): string[] {
	const set = new Set<string>();

	for (const user of Object.values(state.users || {})) {
		if (typeof user.avatar === 'string' && user.avatar.startsWith('idb:')) {
			set.add(user.avatar);
		}
	}

	for (const person of Object.values(state.people || {})) {
		if (typeof (person as any).avatar === 'string' && (person as any).avatar.startsWith('idb:')) {
			set.add((person as any).avatar);
		}
	}

	for (const userId of Object.keys(state.lists || {})) {
		const userLists = state.lists[userId] || {};
		for (const list of Object.values(userLists)) {
			if (typeof (list as any).logo === 'string' && (list as any).logo.startsWith('idb:')) {
				set.add((list as any).logo);
			}
			for (const task of Object.values(list.tasks)) {
				if (typeof task.imageSrc === 'string' && task.imageSrc.startsWith('idb:')) {
					set.add(task.imageSrc);
				}
			}
		}
	}

	for (const key of Object.keys(state.images || {})) {
		if (key.startsWith('idb:')) set.add(key);
	}

	return [...set];
}
