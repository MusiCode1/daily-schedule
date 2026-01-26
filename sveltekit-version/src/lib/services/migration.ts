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

		if (parsed.version < 7) {
			console.log('Migrating to version 7: Adding communication board URLs and change types...');

			// הוספת שדות חדשים למשימות קיימות (אופציונליים - אין צורך באתחול)
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list) => {
					list.tasks.forEach((task: any) => {
						// השדות האלו אופציונליים, אז פשוט מוודאים שהם undefined אם לא קיימים
						if (!task.communicationBoardUrl) {
							task.communicationBoardUrl = undefined;
						}
						if (!task.changeType) {
							task.changeType = undefined;
						}
					});
				});
			});

			parsed.version = 7;
		}

		if (parsed.version < 8) {
			console.log('Migrating to version 8: Adding list title and description...');

			// הוספת שדות כותרת ותיאור לרשימות (אופציונליים)
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list: any) => {
					if (!list.title) {
						list.title = undefined;
					}
					if (!list.description) {
						list.description = undefined;
					}
				});
			});

			parsed.version = 8;
		}

		if (parsed.version < 9) {
			console.log('Migrating to version 9: Adding people (team/family members)...');

			// אתחול מאגר האנשים אם לא קיים
			if (!parsed.people) {
				parsed.people = [];
			}

			// הוספת שדות לרשימות (אופציונליים)
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list: any) => {
					if (!list.peopleIds) {
						list.peopleIds = undefined;
					}
					if (!list.isPeopleSectionVisible) {
						list.isPeopleSectionVisible = true; // ברירת מחדל - גלוי
					}
				});
			});

			parsed.version = 9;
		}

		if (parsed.version < 10) {
			console.log('Migrating to version 10: Adding isLocked to lists...');

			// הוספת שדה isLocked לכל הרשימות
			const users = Object.keys(parsed.lists || {});
			users.forEach((userId) => {
				const userLists: List[] = parsed.lists[userId];
				userLists.forEach((list: any) => {
					if (list.isLocked === undefined) {
						list.isLocked = false; // ברירת מחדל: לא נעול
					}
				});
			});

			parsed.version = 10;
		}

		if (parsed.version < 11) {
			console.log('Migrating to version 11: Populating example family members...');

			// אכלוס רשימת האנשים בברירת המחדל אם היא ריקה
			if (!parsed.people || parsed.people.length === 0) {
				// אנו מעתיקים מ-INITIAL_STATE שכבר מכיל את האנשים החדשים (כי עדכנו את defaults.ts)
				// הערה: בגלל שה-merge בסוף הפונקציה דורס את INITIAL_STATE עם parsed,
				// אנחנו חייבים לעדכן את parsed.people כאן.
				parsed.people = INITIAL_STATE.people;
			}

			parsed.version = 11;
		}

		if (parsed.version < 12) {
			console.log(
				'Migrating to version 12: Updating defaults to Family Members (Ezra, Tzofia, Adam)...'
			);

			// אנו דורסים את המשתמשים ואת ה-lists שלהם כדי להתאים למשפחה החדשה
			// שים לב: זה מהלך אגרסיבי, אבל מתבקש מכיוון שזו "משפחה לדוגמא"
			// משתמשים אמיתיים (ששינו את המשתמשים) לא ייפגעו אם נבדוק אם אלו משתמשי ברירת המחדל הישנים

			const oldDefaultIds = ['u1', 'u2', 'u3'];
			const currentUsers = parsed.users || [];
			const isDefaultSetup =
				currentUsers.length === 3 && currentUsers.every((u: any) => oldDefaultIds.includes(u.id));

			// רק אם זה עדיין הסטאפ הדיפולטיבי הישן (או ריק), נחליף לחדש
			if (isDefaultSetup || currentUsers.length === 0) {
				parsed.users = INITIAL_STATE.users;
				parsed.lists = INITIAL_STATE.lists;
				parsed.activeListId = INITIAL_STATE.activeListId;
				// עדכון רשימת האנשים (הסרת הילדים ממנה)
				parsed.people = INITIAL_STATE.people;
			} else {
				// אם המשתמש כבר ערך שינויים, רק נעדכן את רשימת האנשים (people) שתתאים לחדש
				// כלומר נסיר את הילדים אם הם בטעות שם (בגלל מיגרציה 11)
				if (parsed.people) {
					parsed.people = parsed.people.filter(
						(p: any) => !['p_ezra', 'p_tzofia', 'p_adam'].includes(p.id)
					);
				}
			}

			parsed.version = 12;
		}

		if (parsed.version < 13) {
			console.log(
				'Migrating to version 13: Adding new preparation lists (Grandparents, Guests)...'
			);

			// אנו צריכים להוסיף את הרשימות החדשות לכל המשתמשים
			// אבל רק אם הן לא קיימות כבר (למניעת כפילות למרות שזה מערך חדש של ברירת מחדל)

			const users = Object.keys(parsed.lists || {});

			users.forEach((userId) => {
				const userLists = parsed.lists[userId] || [];

				// יצירת הרשימות החדשות מתוך ההגדרות (רק ה-2 החדשות)
				const newListsDefs = DEFAULT_LIST_DEFINITIONS.filter((def) =>
					['visit_grandparents', 'guests_visit'].includes(def.id)
				);

				const listsToAdd = newListsDefs.map((def) => {
					// יצירת אובייקט List חדש (לוגיקה מועתקת מ-createDefaultLists)
					return {
						id: def.id,
						name: def.name,
						logo: def.logo,
						greeting: (def as any).greeting,
						title: (def as any).title,
						tasks: def.items
							.map((item: any) => {
								const activity = ACTIVITIES.find((a) => a.id === item.activityId);
								return {
									id: crypto.randomUUID(),
									name: activity ? activity.name : 'Unknown', // Fallback
									imageSrc: activity ? `/images/activities/${activity.image}` : null,
									isDone: false
								};
							})
							.filter((t: any) => t.name !== 'Unknown') // סינון פעילויות שלא נמצאו
					};
				});

				// הוספה לרשימות המשתמש (רק אם לא קיים כבר ID כזה)
				listsToAdd.forEach((newList: any) => {
					if (!userLists.find((l: any) => l.id === newList.id)) {
						userLists.push(newList);
					}
				});
			});

			parsed.version = 13;
		}

		if (parsed.version < 14) {
			console.log('Migrating to version 14: Updating peopleIds for preparation lists...');

			const users = Object.keys(parsed.lists || {});

			users.forEach((userId) => {
				const userLists = parsed.lists[userId] || [];

				userLists.forEach((list: any) => {
					// עדכון עבור רשימות ספציפיות
					if (list.id === 'morning_routine') {
						list.peopleIds = ['p_father', 'p_mother']; // בוקר: אבא ואמא
					} else if (list.id === 'afternoon_routine') {
						list.peopleIds = ['p_mother']; // ערב: אמא
					} else if (list.id === 'visit_grandparents') {
						list.peopleIds = ['p_grandfather', 'p_grandmother']; // סבא וסבתא בנסיעה
					} else if (list.id === 'guests_visit') {
						list.peopleIds = ['p_uncle', 'p_aunt']; // דוד ודודה באירוח
					}
				});
			});

			parsed.version = 14;
		}

		return { ...INITIAL_STATE, ...parsed };
	},

	migrateFromLegacy(): AppState | null {
		const legacyLists = localStorage.getItem('my_lists');
		if (legacyLists) {
			try {
				const lists = JSON.parse(legacyLists);
				const newState: AppState = { ...INITIAL_STATE, version: 9, lastModified: Date.now() };

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
							isDone: false,
							communicationBoardUrl: undefined,
							changeType: undefined
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
