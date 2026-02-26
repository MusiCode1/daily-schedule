import type { AppState, List } from '$lib/types';
import { INITIAL_STATE, ACTIVITIES, DEFAULT_LIST_DEFINITIONS } from '$lib/data/defaults';
import { TEXTS } from '$lib/data/texts';
import { db } from './db';

// פונקציית עזר להמרת base64 (data URL) ל-Blob
async function dataURLToBlob(dataURL: string): Promise<Blob> {
	const response = await fetch(dataURL);
	return await response.blob();
}

type AnyState = any;

export const LATEST_STATE_VERSION = INITIAL_STATE.version;

function cloneForMigration(input: AnyState): AnyState {
	// המיגרציות משנות את האובייקט "במקום". כדי לא להפתיע קוראים, נשכפל לפני ריצה.
	if (typeof structuredClone === 'function') return structuredClone(input);
	return JSON.parse(JSON.stringify(input));
}

function getSafeStateVersion(state: AnyState): number {
	const v = Number(state?.version);
	// לפני v2 לא תמיד היה version מסודר, לכן נניח "1" אם חסר/לא תקין.
	if (!Number.isFinite(v) || v <= 0) return 1;
	return v;
}

function asArray<T>(value: T[] | Record<string, T> | null | undefined): T[] {
	if (Array.isArray(value)) return value;
	if (value && typeof value === 'object') return Object.values(value);
	return [];
}

function migrateToV2(state: AnyState): AnyState {
	console.log('Migrating to version 2: Adding list logos...');
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];
		userLists.forEach((list) => {
			const def = DEFAULT_LIST_DEFINITIONS.find((d) => d.id === list.id);
			if (def && !list.logo) {
				list.logo = def.logo || '';
			}
		});
	});
	state.version = 2;
	return state;
}

function migrateToV3(state: AnyState): AnyState {
	console.log('Migrating to version 3: Fixing image paths...');

	// תיקון תמונות משתמשים
	if (state.users) {
		state.users.forEach((u: any) => {
			if (u.avatar && u.avatar.includes('/avatars/')) {
				u.avatar = u.avatar.replace('/avatars/', '/images/users/');
			}
		});
	}

	// תיקון תמונות משימות
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: any[] = state.lists[userId] || [];
		userLists.forEach((list: any) => {
			// במיגרציות ישנות (לפני v15) tasks עדיין מערך
			const tasks = Array.isArray(list.tasks) ? list.tasks : [];
			tasks.forEach((task: any) => {
				if (task.imageSrc && typeof task.imageSrc === 'string') {
					task.imageSrc = task.imageSrc
						.replace('/images/clean/', '/images/activities/')
						.replace('/avatars/', '/images/users/');
				}
			});
		});
	});

	state.version = 3;
	return state;
}

function migrateToV4(state: AnyState): AnyState {
	console.log('Migrating to version 4: Adding greetings...');
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];
		userLists.forEach((list) => {
			if (!list.greeting) {
				const def = DEFAULT_LIST_DEFINITIONS.find((d) => d.id === list.id);
				const greeting = def && 'greeting' in (def as any) ? (def as any).greeting : undefined;
				list.greeting = greeting || TEXTS.LEGACY_GREETING_HELLO;
			}
		});
	});
	state.version = 4;
	return state;
}

function migrateToV5(state: AnyState): AnyState {
	console.log('Migrating to version 5: Update default greetings...');
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];
		userLists.forEach((list) => {
			if (list.greeting === TEXTS.LEGACY_GREETING_HELLO) {
				list.greeting = TEXTS.DEFAULT_GREETING;
			}
		});
	});
	state.version = 5;
	return state;
}

function migrateToV6(state: AnyState): AnyState {
	console.log('Migrating to version 6: Separating image metadata...');

	// אתחול images אם לא קיים
	if (!state.images) {
		state.images = {};
	}

	// מעבר על כל המשתמשים והעברת crop לתוך images
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];

		userLists.forEach((list: any) => {
			// טיפול ב-logo של רשימה
			if (list.logo && typeof list.logo === 'object' && 'src' in list.logo) {
				const logoData = list.logo as any;
				if (logoData.crop) {
					state.images[logoData.src] = { crop: logoData.crop };
				}
				list.logo = logoData.src;
			}

			// טיפול במשימות (במיגרציות ישנות לפני v15 tasks עדיין מערך)
			const tasks = Array.isArray(list.tasks) ? list.tasks : [];
			tasks.forEach((task: any) => {
				if (task.imageSrc && typeof task.imageSrc === 'object' && 'src' in task.imageSrc) {
					const imgData = task.imageSrc;
					if (imgData.crop) {
						state.images[imgData.src] = { crop: imgData.crop };
					}
					task.imageSrc = imgData.src;
				}
			});
		});
	});

	// טיפול ב-avatars של משתמשים
	if (state.users) {
		state.users.forEach((user: any) => {
			if (user.avatar && typeof user.avatar === 'object' && 'src' in user.avatar) {
				const avatarData = user.avatar;
				if (avatarData.crop) {
					state.images[avatarData.src] = { crop: avatarData.crop };
				}
				user.avatar = avatarData.src;
			}
		});
	}

	state.version = 6;
	console.log(`Migrated ${Object.keys(state.images).length} image metadata entries`);
	return state;
}

function migrateToV7(state: AnyState): AnyState {
	console.log('Migrating to version 7: Adding communication board URLs and change types...');
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: any[] = state.lists[userId] || [];
		userLists.forEach((list: any) => {
			// במיגרציות ישנות (לפני v15) tasks עדיין מערך
			const tasks = Array.isArray(list.tasks) ? list.tasks : [];
			tasks.forEach((task: any) => {
				if (!task.communicationBoardUrl) {
					task.communicationBoardUrl = undefined;
				}
				if (!task.changeType) {
					task.changeType = undefined;
				}
			});
		});
	});
	state.version = 7;
	return state;
}

function migrateToV8(state: AnyState): AnyState {
	console.log('Migrating to version 8: Adding list title and description...');
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];
		userLists.forEach((list: any) => {
			if (!list.title) {
				list.title = undefined;
			}
			if (!list.description) {
				list.description = undefined;
			}
		});
	});
	state.version = 8;
	return state;
}

function migrateToV9(state: AnyState): AnyState {
	console.log('Migrating to version 9: Adding people (team/family members)...');

	// אתחול מאגר האנשים אם לא קיים
	if (!state.people) {
		state.people = [];
	}

	// הוספת שדות לרשימות (אופציונליים)
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];
		userLists.forEach((list: any) => {
			if (!list.peopleIds) {
				list.peopleIds = undefined;
			}
			if (!list.isPeopleSectionVisible) {
				list.isPeopleSectionVisible = true; // ברירת מחדל - גלוי
			}
		});
	});

	state.version = 9;
	return state;
}

function migrateToV10(state: AnyState): AnyState {
	console.log('Migrating to version 10: Adding isLocked to lists...');
	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists: List[] = state.lists[userId] || [];
		userLists.forEach((list: any) => {
			if (list.isLocked === undefined) {
				list.isLocked = false; // ברירת מחדל: לא נעול
			}
		});
	});
	state.version = 10;
	return state;
}

function migrateToV11(state: AnyState): AnyState {
	console.log('Migrating to version 11: Populating example family members...');
	if (asArray(state.people).length === 0) {
		state.people = asArray(INITIAL_STATE.people);
	}
	state.version = 11;
	return state;
}

function migrateToV12(state: AnyState): AnyState {
	console.log('Migrating to version 12: Updating defaults to Family Members (Ezra, Tzofia, Adam)...');

	const oldDefaultIds = ['u1', 'u2', 'u3'];
	const currentUsers = asArray(state.users);
	const isDefaultSetup =
		currentUsers.length === 3 && currentUsers.every((u: any) => oldDefaultIds.includes(u.id));

	// מיגרציה לא מזריקה נתוני ברירת מחדל חדשים.
	// במקרה של סטאפ ברירת מחדל ישן - נשמרים הנתונים הקיימים כמות שהם.
	if (isDefaultSetup) {
		console.log('Legacy default setup detected; preserving existing user data.');
	}

	// ניקוי מזהי ילדים ישנים מתוך people (אם קיימים), תוך תמיכה גם במערך וגם באובייקט.
	const legacyChildIds = new Set(['p_ezra', 'p_tzofia', 'p_adam']);
	if (Array.isArray(state.people)) {
		state.people = state.people.filter((p: any) => !legacyChildIds.has(p.id));
	} else if (state.people && typeof state.people === 'object') {
		for (const personId of Object.keys(state.people)) {
			if (legacyChildIds.has(personId)) {
				delete state.people[personId];
			}
		}
	}

	state.version = 12;
	return state;
}

function migrateToV13(state: AnyState): AnyState {
	console.log('Migrating to version 13: Adding new preparation lists (Grandparents, Guests)...');

	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userListsCollection = state.lists[userId] || [];
		const userLists = asArray(userListsCollection);

		const newListsDefs = DEFAULT_LIST_DEFINITIONS.filter((def) =>
			['visit_grandparents', 'guests_visit'].includes(def.id)
		);

		const listsToAdd = newListsDefs.map((def) => {
			return {
				id: def.id,
				name: def.name,
				logo: def.logo,
				greeting: (def as any).greeting,
				title: (def as any).title,
				tasks: def.items
					.map((item: any, index: number) => {
						const activity = ACTIVITIES.find((a) => a.id === item.activityId);
						return {
							id: crypto.randomUUID(),
							name: activity ? activity.name : 'Unknown', // Fallback
							imageSrc: activity ? `/images/activities/${activity.image}` : null,
							isDone: false,
							order: index
						};
					})
					.filter((t: any) => t.name !== 'Unknown')
			};
		});

		listsToAdd.forEach((newList: any) => {
			const exists = userLists.some((l: any) => l.id === newList.id);
			if (exists) return;

			if (Array.isArray(userListsCollection)) {
				userListsCollection.push(newList);
			} else {
				if (!state.lists[userId] || typeof state.lists[userId] !== 'object') {
					state.lists[userId] = {};
				}
				state.lists[userId][newList.id] = newList;
			}
		});
	});

	state.version = 13;
	return state;
}

function migrateToV14(state: AnyState): AnyState {
	console.log('Migrating to version 14: Updating peopleIds for preparation lists...');

	const users = Object.keys(state.lists || {});
	users.forEach((userId) => {
		const userLists = asArray(state.lists[userId]);
		userLists.forEach((list: any) => {
			if (list.id === 'morning_routine') {
				list.peopleIds = ['p_father', 'p_mother'];
			} else if (list.id === 'afternoon_routine') {
				list.peopleIds = ['p_mother'];
			} else if (list.id === 'visit_grandparents') {
				list.peopleIds = ['p_grandfather', 'p_grandmother'];
			} else if (list.id === 'guests_visit') {
				list.peopleIds = ['p_uncle', 'p_aunt'];
			}
		});
	});

	state.version = 14;
	return state;
}

function migrateToV15(state: AnyState): AnyState {
	console.log('[Migration] v14 → v15: מעבר ל-objects + order');

	// 1. המרת users ממערך ל-object
	if (Array.isArray(state.users)) {
		const newUsers: { [userId: string]: any } = {};
		state.users.forEach((user: any) => {
			newUsers[user.id] = user;
		});
		state.users = newUsers;
	}

	// 2. המרת people ממערך ל-object
	if (Array.isArray(state.people)) {
		const newPeople: { [personId: string]: any } = {};
		state.people.forEach((person: any) => {
			newPeople[person.id] = person;
		});
		state.people = newPeople;
	}

	// 3. המרת lists ממערך ל-object
	if (state.lists) {
		const newLists: { [userId: string]: { [listId: string]: any } } = {};

		Object.keys(state.lists).forEach((userId) => {
			const userLists = state.lists[userId];

			if (Array.isArray(userLists)) {
				// זה מערך - צריך המרה
				newLists[userId] = {};
				userLists.forEach((list) => {
					newLists[userId][list.id] = list;
				});
			} else {
				// כבר object (אולי מיגרציה חלקית?)
				newLists[userId] = userLists;
			}
		});

		state.lists = newLists;
	}

	// 4. המרת tasks ממערך ל-object + הוספת order
	if (state.lists) {
		Object.keys(state.lists).forEach((userId) => {
			const userLists = state.lists[userId];

			Object.keys(userLists).forEach((listId) => {
				const list = userLists[listId];

				if (Array.isArray(list.tasks)) {
					// זה מערך - צריך המרה
					const newTasks: { [taskId: string]: any } = {};

					list.tasks.forEach((task: any, index: number) => {
						newTasks[task.id] = {
							...task,
							order: task.order ?? index // אם אין order, השתמש באינדקס
						};
					});

					list.tasks = newTasks;
				} else {
					// כבר object - רק ודא שיש order
					Object.values(list.tasks).forEach((task: any, index: number) => {
						if (task.order === undefined) {
							task.order = index;
						}
					});
				}
			});
		});
	}

	// 5. הוספת childLockEnabled ל-settings
	if (!state.settings) {
		state.settings = {};
	}

	if (state.settings.childLockEnabled === undefined) {
		state.settings.childLockEnabled = false;
	}

	// 6. עדכון גרסה
	state.version = 15;

	console.log('[Migration] v15 completed successfully');
	return state;
}

function migrateToV16(state: AnyState): AnyState {
	console.log('[Migration] v15 → v16: הפרדת settings, localDevice, taskProgress');

	// 1. העברת activeListId ו-currentUserId ל-settings
	if (!state.settings) {
		state.settings = {};
	}
	if (state.activeListId && !state.settings.activeListId) {
		state.settings.activeListId = state.activeListId;
	}
	if (!state.settings.activeListId) {
		state.settings.activeListId = {};
	}
	if (state.currentUserId !== undefined && state.settings.currentUserId === undefined) {
		state.settings.currentUserId = state.currentUserId;
	}
	if (state.settings.currentUserId === undefined) {
		state.settings.currentUserId = null;
	}
	if (state.settings.childLockEnabled === undefined) {
		state.settings.childLockEnabled = false;
	}
	delete state.activeListId;
	delete state.currentUserId;

	// 2. העברת lastModified, lastActiveTime, syncMetadata ל-localDevice
	state.localDevice = {
		lastModified: state.lastModified ?? Date.now(),
		lastActiveTime: state.lastActiveTime ?? Date.now()
	};
	if (state.syncMetadata) {
		state.localDevice.syncMetadata = state.syncMetadata;
	}
	delete state.lastModified;
	delete state.lastActiveTime;
	delete state.syncMetadata;

	// 3. חילוץ isDone מכל המשימות ל-taskProgress
	if (!state.taskProgress) {
		state.taskProgress = {};
	}
	if (state.lists) {
		Object.values(state.lists).forEach((userLists: any) => {
			Object.values(userLists).forEach((list: any) => {
				if (list.tasks && typeof list.tasks === 'object') {
					Object.values(list.tasks).forEach((task: any) => {
						if (task.isDone) {
							state.taskProgress[task.id] = true;
						}
						delete task.isDone;
					});
				}
			});
		});
	}

	state.version = 16;
	console.log('[Migration] v16 completed successfully');
	return state;
}

export const STATE_MIGRATIONS: Record<number, (state: AnyState) => AnyState> = {
	2: migrateToV2,
	3: migrateToV3,
	4: migrateToV4,
	5: migrateToV5,
	6: migrateToV6,
	7: migrateToV7,
	8: migrateToV8,
	9: migrateToV9,
	10: migrateToV10,
	11: migrateToV11,
	12: migrateToV12,
	13: migrateToV13,
	14: migrateToV14,
	15: migrateToV15,
	16: migrateToV16
};

function runStateMigrations(input: AnyState): AnyState {
	const state = cloneForMigration(input);
	state.version = getSafeStateVersion(state);

	while (state.version < LATEST_STATE_VERSION) {
		const targetVersion = state.version + 1;
		const migrate = STATE_MIGRATIONS[targetVersion];
		if (!migrate) {
			throw new Error(`Missing migration for target version ${targetVersion}`);
		}
		migrate(state);
	}

	return state;
}

export const migrationService = {
	async migrateImagesToDB(state: AppState): Promise<AppState> {
		let hasChanges = false;
		const users = Object.keys(state.lists || {});

		for (const userId of users) {
			const lists = state.lists[userId];
			if (!lists) continue;

			// lists הוא object של רשימות, לא מערך
			for (const list of Object.values(lists)) {
				// tasks הוא object של משימות, לא מערך
				for (const task of Object.values(list.tasks)) {
					if (
						task.imageSrc &&
						typeof task.imageSrc === 'string' &&
						task.imageSrc.startsWith('data:image')
					) {
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
		const migrated = runStateMigrations(parsed);
		return { ...INITIAL_STATE, ...migrated };
	},

	// ... existing code ...
	migrateFromLegacy(): AppState | null {
		const legacyLists = localStorage.getItem('my_lists');
		if (legacyLists) {
			try {
				const lists = JSON.parse(legacyLists);
				const newState: any = { ...INITIAL_STATE, version: 16 };
			newState.localDevice = { ...INITIAL_STATE.localDevice, lastModified: Date.now() };

				// המרת רשימות ישנות לפורמט החדש עבור משתמש u1 (ברירת מחדל)
				const newListsArray: any[] = lists.map((l: any) => ({
					id: l.id,
					name: l.name,
					settings: {
						lastActiveTime: Date.now()
					},
					tasks: (l.items || []).map((item: any, index: number) => {
						const activity = ACTIVITIES.find((a) => a.id === item.activityId);
						return {
							id: crypto.randomUUID(),
							name: activity ? activity.name : 'Unknown',
							imageSrc: activity ? `/images/activities/${activity.image}` : null,
							isDone: false,
							communicationBoardUrl: undefined,
							changeType: undefined,
							order: index
						};
					})
				}));

				// המרה ל-object structure (v15+)
				const newListsObject: { [listId: string]: any } = {};
				newListsArray.forEach((list) => {
					// המרת tasks מ-array ל-object
					const tasksObject: { [taskId: string]: any } = {};
					list.tasks.forEach((task: any) => {
						tasksObject[task.id] = task;
					});
					list.tasks = tasksObject;

					// הוספת הרשימה ל-object
					newListsObject[list.id] = list;
				});

				newState.lists['u1'] = newListsObject;
				if (newListsArray.length > 0) {
					newState.settings.activeListId['u1'] = newListsArray[0].id;
				}

				console.log('Migrated legacy lists to user u1');
				return newState;
			} catch (e) {
				console.error('Migration failed', e);
				return null;
			}
		}
		return null;
	},

	migrateAuthStorage(
		legacyToken: string | null,
		legacyExpiry: string | null
	): GoogleAuthStorage | null {
		// אם אין טוקן ישן, אין מה לנסות להגר
		if (!legacyToken) return null;

		console.log('Migrating Google Auth storage from legacy format...');

		// בדיקת תקינות בסיסית של הטוקן הישן (לוודא שהוא לא פג בצורה קיצונית או ריק)
		// הערה: בדיקת התפוגה המדויקת תתבצע על ידי GoogleDriveService,
		// כאן אנו רק דואגים להמיר את המבנה.

		let expiryTime = 0;
		if (legacyExpiry) {
			const parsed = parseInt(legacyExpiry);
			if (!isNaN(parsed)) {
				expiryTime = parsed;
			}
		}

		// אם אין תאריך תפוגה, נניח שהוא פג עכשיו (או שעה מעכשיו, אבל עדיף להיות שמרניים)
		// בפועל, googleAuthService יטפל בחידוש אם הוא פג.
		if (expiryTime === 0) {
			expiryTime = Date.now();
		}

		const newStorage: GoogleAuthStorage = {
			accessToken: legacyToken,
			expiresAt: expiryTime,
			issuedAt: Date.now() // אין לנו מידע מתי הונפק הישן, נניח שעכשיו (לצורך התיעוד)
			// user ו-permissionId חסרים בגרסה הישנה, יתמלאו ב-fetchUserInfo הבא
		};

		return newStorage;
	}
};

export interface GoogleAuthStorage {
	accessToken: string;
	expiresAt: number; // Timestamp של התפוגה
	issuedAt: number; // מתי נוצר
	user?: {
		id: string; // Google Permission ID (Sub ID)
		displayName: string;
		email: string;
		photoLink: string;
	};
}
