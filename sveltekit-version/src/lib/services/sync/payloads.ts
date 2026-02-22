import type { AppState, List, Task } from '$lib/types';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './constants';
import type { ContentV2, ProgressV2 } from './syncTypes';

function cloneTaskWithoutProgress(task: Task) {
	const { isDone, ...rest } = task;
	return rest;
}

function cloneListWithoutProgress(list: List) {
	const tasksWithoutProgress: Record<string, any> = {};
	for (const [taskId, task] of Object.entries(list.tasks)) {
		tasksWithoutProgress[taskId] = cloneTaskWithoutProgress(task);
	}
	return {
		...list,
		tasks: tasksWithoutProgress
	};
}

export function buildContentPayload(state: AppState): ContentV2 {
	const lists: Record<string, Record<string, any>> = {};
	for (const userId of Object.keys(state.lists || {})) {
		const userLists = state.lists[userId] || {};
		lists[userId] = {};
		for (const [listId, list] of Object.entries(userLists)) {
			lists[userId][listId] = cloneListWithoutProgress(list);
		}
	}

	return {
		backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
		appStateVersion: state.version,
		users: Object.values(state.users),
		people: Object.values(state.people),
		lists,
		images: state.images,
		activeListId: state.activeListId,
		currentUserId: state.currentUserId,
		settings: {}
	};
}

export function buildProgressPayload(state: AppState): ProgressV2 {
	const taskDone: Record<string, boolean> = {};

	for (const userId of Object.keys(state.lists || {})) {
		const userLists = state.lists[userId] || {};
		for (const list of Object.values(userLists)) {
			for (const task of Object.values(list.tasks)) {
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
