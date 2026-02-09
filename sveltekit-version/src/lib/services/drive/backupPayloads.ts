import type { AppState, List, Task } from '$lib/types';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './constants';
import type { ContentV2, ProgressV2 } from './types';

function cloneTaskWithoutProgress(task: Task) {
	const { isDone, ...rest } = task;
	return rest;
}

function cloneListWithoutProgress(list: List) {
	return {
		...list,
		tasks: list.tasks.map(cloneTaskWithoutProgress)
	};
}

export function buildContentPayload(state: AppState): ContentV2 {
	const lists: Record<string, any[]> = {};
	for (const userId of Object.keys(state.lists || {})) {
		const userLists = state.lists[userId] || [];
		lists[userId] = userLists.map(cloneListWithoutProgress);
	}

	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		appStateVersion: state.version,
		users: state.users,
		people: state.people,
		lists,
		images: state.images,
		activeListId: state.activeListId,
		currentUserId: state.currentUserId,
		// intentionally empty: lastActiveTime הוא דינמי ותכוף
		settings: {}
	};
}

export function buildProgressPayload(state: AppState): ProgressV2 {
	const taskDone: Record<string, boolean> = {};

	for (const userId of Object.keys(state.lists || {})) {
		for (const list of state.lists[userId] || []) {
			for (const task of list.tasks) {
				taskDone[task.id] = !!task.isDone;
			}
		}
	}

	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		taskDone
	};
}

export function collectAssetIds(state: AppState): string[] {
	const set = new Set<string>();

	for (const user of state.users || []) {
		if (typeof user.avatar === 'string' && user.avatar.startsWith('idb:')) {
			set.add(user.avatar);
		}
	}

	for (const person of state.people || []) {
		if (typeof (person as any).avatar === 'string' && (person as any).avatar.startsWith('idb:')) {
			set.add((person as any).avatar);
		}
	}

	for (const userId of Object.keys(state.lists || {})) {
		for (const list of state.lists[userId] || []) {
			if (typeof (list as any).logo === 'string' && (list as any).logo.startsWith('idb:')) {
				set.add((list as any).logo);
			}

			for (const task of list.tasks) {
				if (typeof task.imageSrc === 'string' && task.imageSrc.startsWith('idb:')) {
					set.add(task.imageSrc);
				}
			}
		}
	}

	// גם keys של images (רק אלו שמתחילים ב-idb:)
	for (const key of Object.keys(state.images || {})) {
		if (key.startsWith('idb:')) set.add(key);
	}

	return [...set];
}

