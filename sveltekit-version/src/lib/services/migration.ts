import type { AppState, List, Task } from '$lib/types';
import { INITIAL_STATE, ACTIVITIES, DEFAULT_LIST_DEFINITIONS } from '$lib/data/defaults';
import { db } from './db';

// פונקציית עזר להמרת base64 (data URL) ל-Blob
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
					if (task.imageSrc && typeof task.imageSrc === 'string' && task.imageSrc.startsWith('data:image')) {
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
		// לוגיקת המיגרציה
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

			// תיקון תמונות משתמשים
			if (parsed.users) {
				parsed.users.forEach((u: any) => {
					if (u.avatar && u.avatar.includes('/avatars/')) {
						u.avatar = u.avatar.replace('/avatars/', '/images/users/');
					}
				});
			}

			// תיקון תמונות משימות
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

		if (parsed.version < 6) {
			console.log('Migrating to version 6: Separating image metadata...');
			
			// אתחול images אם לא קיים
			if (!parsed.images) {
				parsed.images = {};
			}

			// מעבר על כל המשתמשים והעברת crop לתוך images
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				
				userLists.forEach((list) => {
					// טיפול ב-logo של רשימה
					if (list.logo && typeof list.logo === 'object' && 'src' in list.logo) {
						const logoData = list.logo as any;
						if (logoData.crop) {
							parsed.images[logoData.src] = { crop: logoData.crop };
						}
						list.logo = logoData.src;
					}

					// טיפול במשימות
					list.tasks.forEach((task: any) => {
						if (task.imageSrc && typeof task.imageSrc === 'object' && 'src' in task.imageSrc) {
							const imgData = task.imageSrc;
							if (imgData.crop) {
								parsed.images[imgData.src] = { crop: imgData.crop };
							}
							task.imageSrc = imgData.src;
						}
					});
				});
			});

			// טיפול ב-avatars של משתמשים
			if (parsed.users) {
				parsed.users.forEach((user: any) => {
					if (user.avatar && typeof user.avatar === 'object' && 'src' in user.avatar) {
						const avatarData = user.avatar;
						if (avatarData.crop) {
							parsed.images[avatarData.src] = { crop: avatarData.crop };
						}
						user.avatar = avatarData.src;
					}
				});
			}

			parsed.version = 6;
			console.log(`Migrated ${Object.keys(parsed.images).length} image metadata entries`);
		}

		return { ...INITIAL_STATE, ...parsed };
	},

	migrateFromLegacy(): AppState | null {
		const legacyLists = localStorage.getItem('my_lists');
		if (legacyLists) {
			try {
				const lists = JSON.parse(legacyLists);
				const newState: AppState = { ...INITIAL_STATE, version: 6, lastModified: Date.now() };

				// המרת רשימות ישנות לפורמט החדש עבור משתמש u1 (ברירת מחדל)
				const newLists: List[] = lists.map((l: any) => ({
					id: l.id,
					name: l.name,
					settings: {
						lastActiveTime: Date.now()
					},
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
