import type { AppState, List, Task } from '$lib/types';
import { INITIAL_STATE, ACTIVITIES, DEFAULT_LIST_DEFINITIONS } from '$lib/data/defaults';
import { db } from './db';

// Helper to convert base64 (data URL) to Blob
async function dataURLToBlob(dataURL: string): Promise<Blob> {
	const response = await fetch(dataURL);
	return await response.blob();
}

export const migrationService = {
	async migrateImagesToDB(state: AppState): Promise<AppState> {
		let hasChanges = false;
		const users = Object.keys(state.lists || {});

		for (const userId of users) {
			const lists = state.lists[userId];
			if (!lists) continue;

			for (const list of lists) {
				for (const task of list.tasks) {
					if (task.imageSrc && task.imageSrc.startsWith('data:image')) {
						try {
							console.log(`Migrating image for task ${task.name}...`);
							const blob = await dataURLToBlob(task.imageSrc);
							const newId = await db.saveImage(blob);
							task.imageSrc = newId;
							hasChanges = true;
						} catch (e) {
							console.error(`Failed to migrate image for task ${task.name}`, e);
						}
					}
				}
			}
		}

		if (hasChanges) {
			console.log('Migration complete: Images moved to IndexedDB');
		}

		return state;
	},

	migrateState(parsed: any): AppState {
		// Migration Logic
		if (!parsed.version || parsed.version < 2) {
			console.log('Migrating to version 2: Adding list logos...');
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list) => {
					const def = DEFAULT_LIST_DEFINITIONS.find((d) => d.id === list.id);
					if (def && !list.logo) {
						list.logo = def.logo || '';
					}
				});
			});
			parsed.version = 2;
		}

		if (parsed.version < 3) {
			console.log('Migrating to version 3: Fixing image paths...');

			// Fix user avatars
			if (parsed.users) {
				parsed.users.forEach((u: any) => {
					if (u.avatar && u.avatar.includes('/avatars/')) {
						u.avatar = u.avatar.replace('/avatars/', '/images/users/');
					}
				});
			}

			// Fix task images
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list) => {
					list.tasks.forEach((task) => {
						if (task.imageSrc && typeof task.imageSrc === 'string') {
							task.imageSrc = task.imageSrc
								.replace('/images/clean/', '/images/activities/')
								.replace('/avatars/', '/images/users/');
						}
					});
				});
			});
			parsed.version = 3;
		}

		if (parsed.version < 4) {
			console.log('Migrating to version 4: Adding greetings...');
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list) => {
					if (!list.greeting) {
						if (list.id === 'morning_routine') list.greeting = 'בוקר טוב';
						else if (list.id === 'afternoon_routine') list.greeting = 'אחרי צהריים טובים';
						else list.greeting = 'שלום';
					}
				});
			});
			parsed.version = 4;
		}

		if (parsed.version < 5) {
			console.log('Migrating to version 5: Update default greetings...');
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list) => {
					if (list.greeting === 'שלום') {
						list.greeting = 'בהצלחה';
					}
				});
			});
			parsed.version = 5;
		}

		return { ...INITIAL_STATE, ...parsed };
	},

	migrateFromLegacy(): AppState | null {
		const legacyLists = localStorage.getItem('my_lists');
		if (legacyLists) {
			try {
				const lists = JSON.parse(legacyLists);
				const newState: AppState = { ...INITIAL_STATE, version: 5 }; // Using hardcoded 5 or import CURRENT_VERSION? Let's assume 5 is current.

				// Convert legacy lists to new format for user u1 (default)
				const newLists: List[] = lists.map((l: any) => ({
					id: l.id,
					name: l.name,
					tasks: (l.items || []).map((item: any) => {
						const activity = ACTIVITIES.find((a) => a.id === item.activityId);
						return {
							id: crypto.randomUUID(),
							name: activity ? activity.name : 'Unknown',
							imageSrc: activity ? `/images/activities/${activity.image}` : null,
							isDone: false
						};
					})
				}));

				newState.lists['u1'] = newLists;
				if (newLists.length > 0) {
					newState.activeListId['u1'] = newLists[0].id;
				}

				console.log('Migrated legacy lists to user u1');
				return newState;
			} catch (e) {
				console.error('Migration failed', e);
				return null;
			}
		}
		return null;
	}
};
