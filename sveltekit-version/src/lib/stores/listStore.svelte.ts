import { globalState } from './globalState.svelte';
import type { List, Task } from '../types';
import { createDefaultLists } from '../data/defaults';
import { TEXTS } from '$lib/data/texts';

export class ListStore {
	/**
	 * קבלת רשימות משתמש (ממוין לפי שם)
	 */
	getUserLists(userId: string, includeHidden: boolean = false): List[] {
		const listsObj = globalState.state.lists[userId] || {};
		const lists = Object.values(listsObj);

		if (includeHidden) {
			return lists.sort((a, b) => a.name.localeCompare(b.name));
		}
		return lists.filter((l) => !l.isHidden).sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * קבלת כל הרשימות (כולל מוסתרות)
	 */
	getAllLists(userId: string): List[] {
		return this.getUserLists(userId, true);
	}

	/**
	 * קבלת הרשימה הפעילה
	 */
	getActiveList(userId: string): List | undefined {
		let activeId = globalState.state.settings.activeListId[userId];
		const listsObj = globalState.state.lists[userId] || {};

		// אם יש ID פעיל ורשימה קיימת - החזר אותה
		if (activeId && listsObj[activeId]) {
			return listsObj[activeId];
		}

		// אחרת, החזר את הראשונה
		const lists = Object.values(listsObj);
		return lists.length > 0 ? lists[0] : undefined;
	}

	/**
	 * הגדרת רשימה פעילה
	 */
	setActiveList(userId: string, listId: string) {
		globalState.state.settings.activeListId[userId] = listId;
		globalState.save();
	}

	/**
	 * הוספת רשימה חדשה
	 */
	addList(userId: string, name: string) {
		const id = crypto.randomUUID();
		const newList: List = {
			id,
			name,
			greeting: TEXTS.DEFAULT_GREETING,
			tasks: {} // object ריק במקום מערך!
		};

		if (!globalState.state.lists[userId]) {
			globalState.state.lists[userId] = {};
		}

		globalState.state.lists[userId][id] = newList; // הוספה ל-object במקום push
		this.setActiveList(userId, id);
		globalState.save();
		return id;
	}

	/**
	 * מחיקת רשימה
	 */
	deleteList(userId: string, listId: string) {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj) return;

		// לא לאפשר מחיקת הרשימה האחרונה
		if (Object.keys(listsObj).length <= 1) return;

		delete listsObj[listId]; // delete במקום filter

		// אם מחקנו את הרשימה הפעילה, עבור לרשימה הראשונה
		if (globalState.state.settings.activeListId[userId] === listId) {
			const remainingLists = Object.keys(listsObj);
			if (remainingLists.length > 0) {
				globalState.state.settings.activeListId[userId] = remainingLists[0];
			}
		}

		globalState.save();
	}

	/**
	 * עדכון רשימה
	 */
	updateList(userId: string, listId: string, updates: Partial<List>) {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj || !listsObj[listId]) return;

		const list = listsObj[listId];
		Object.assign(list, updates);
		globalState.save();
	}

	// -- ניהול משימות --

	/**
	 * עדכון משימות (מקבל object)
	 */
	updateTasks(userId: string, listId: string, newTasks: { [taskId: string]: Task }) {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj || !listsObj[listId]) return;

		listsObj[listId].tasks = newTasks;
		globalState.save();
	}

	/**
	 * אתחול רשימות ברירת מחדל למשתמש חדש
	 */
	initializeDefaultLists(userId: string) {
		// createDefaultLists() כבר מחזיר object, לא מערך
		const defaultListsObj = createDefaultLists();

		globalState.state.lists[userId] = defaultListsObj;
		// קבלת ה-ID של הרשימה הראשונה
		const firstListId = Object.keys(defaultListsObj)[0];
		if (firstListId) {
			this.setActiveList(userId, firstListId);
		}
		globalState.save();
	}

	/**
	 * שכפול רשימה
	 */
	duplicateList(userId: string, listId: string): string | null {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj || !listsObj[listId]) return null;

		const originalList = listsObj[listId];
		const newId = crypto.randomUUID();

		// העתקה עמוקה של המשימות עם IDs חדשים
		const duplicatedTasks: { [taskId: string]: Task } = {};
		for (const task of Object.values(originalList.tasks)) {
			const newTaskId = crypto.randomUUID();
			duplicatedTasks[newTaskId] = {
				...task,
				id: newTaskId
			};
		}

		const duplicatedList: List = {
			id: newId,
			name: `${originalList.name}${TEXTS.LIST_COPY_SUFFIX}`,
			tasks: duplicatedTasks,
			greeting: originalList.greeting,
			logo: originalList.logo,
			isDefault: false
		};

		listsObj[newId] = duplicatedList; // הוספה ל-object במקום push
		globalState.save();

		return newId;
	}

	/**
	 * איפוס כל המשימות ברשימה
	 */
	resetAllTasks(userId: string, listId: string) {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj || !listsObj[listId]) return;

		const list = listsObj[listId];
		for (const taskId of Object.keys(list.tasks)) {
			delete globalState.state.taskProgress[taskId];
		}
		globalState.save();
	}

	/**
	 * החלפת מצב הצגה/הסתרה של רשימה
	 */
	toggleListVisibility(userId: string, listId: string) {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj || !listsObj[listId]) return;

		const list = listsObj[listId];
		list.isHidden = !list.isHidden;
		globalState.save();
	}

	/**
	 * החלפת מצב נעילה של רשימה (תרגול/הכנה)
	 */
	toggleListLock(userId: string, listId: string) {
		const listsObj = globalState.state.lists[userId];
		if (!listsObj || !listsObj[listId]) return;

		const list = listsObj[listId];
		if (!list.isDefault) {
			// לא לנעול רשימות ברירת מחדל
			list.isLocked = !list.isLocked;
			globalState.save();
		}
	}

	/**
	 * העברה/שכפול רשימה בין משתמשים
	 */
	copyListToUser(
		fromUserId: string,
		toUserId: string,
		listId: string,
		shouldMove: boolean = false
	): string | null {
		const fromListsObj = globalState.state.lists[fromUserId];
		if (!fromListsObj || !fromListsObj[listId]) return null;

		const originalList = fromListsObj[listId];
		const newId = crypto.randomUUID();

		// העתקה עמוקה של המשימות עם IDs חדשים
		const copiedTasks: { [taskId: string]: Task } = {};
		for (const task of Object.values(originalList.tasks)) {
			const newTaskId = crypto.randomUUID();
			copiedTasks[newTaskId] = {
				...task,
				id: newTaskId
			};
		}

		const copiedList: List = {
			id: newId,
			name: originalList.name,
			tasks: copiedTasks,
			greeting: originalList.greeting,
			logo: originalList.logo,
			title: originalList.title,
			description: originalList.description,
			peopleIds: originalList.peopleIds,
			isPeopleSectionVisible: originalList.isPeopleSectionVisible,
			isLocked: originalList.isLocked,
			isDefault: false, // תמיד false - העתק לא יכול להיות default
			isHidden: false
		};

		if (!globalState.state.lists[toUserId]) {
			globalState.state.lists[toUserId] = {};
		}

		globalState.state.lists[toUserId][newId] = copiedList; // הוספה ל-object במקום push

		// אם זו העברה (לא שכפול) - מחיקת המקור
		if (shouldMove && Object.keys(fromListsObj).length > 1) {
			this.deleteList(fromUserId, listId);
		}

		globalState.save();
		return newId;
	}
}

export const listStore = new ListStore();
