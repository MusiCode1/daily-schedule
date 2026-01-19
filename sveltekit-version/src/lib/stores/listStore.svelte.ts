import { globalState } from './globalState.svelte';
import type { List, Task } from '../types';
import { createDefaultLists } from '../data/defaults';
import { TEXTS } from '../services/language';

export class ListStore {
	getUserLists(userId: string, includeHidden: boolean = false): List[] {
		if (!globalState.state.lists[userId]) {
			globalState.state.lists[userId] = [];
		}
		const lists = globalState.state.lists[userId];
		if (includeHidden) {
			return lists;
		}
		return lists.filter((l) => !l.isHidden);
	}

	getAllLists(userId: string): List[] {
		return this.getUserLists(userId, true);
	}

	getActiveList(userId: string): List | undefined {
		let activeId = globalState.state.activeListId[userId];
		const lists = this.getUserLists(userId);

		if (!activeId && lists.length > 0) {
			activeId = lists[0].id;
			this.setActiveList(userId, activeId);
		}

		return lists.find((l) => l.id === activeId) || lists[0];
	}

	setActiveList(userId: string, listId: string) {
		globalState.state.activeListId[userId] = listId;
		globalState.save();
	}

	addList(userId: string, name: string) {
		const id = crypto.randomUUID();
		const newList: List = { id, name, greeting: TEXTS.DEFAULT_GREETING, tasks: [] };

		if (!globalState.state.lists[userId]) {
			globalState.state.lists[userId] = [];
		}

		globalState.state.lists[userId].push(newList);
		this.setActiveList(userId, id);
		globalState.save();
		return id;
	}

	deleteList(userId: string, listId: string) {
		if (!globalState.state.lists[userId]) return;

		// לא לאפשר מחיקת הרשימה האחרונה
		if (globalState.state.lists[userId].length <= 1) return;

		globalState.state.lists[userId] = globalState.state.lists[userId].filter(
			(l) => l.id !== listId
		);

		// אם מחקנו את הרשימה הפעילה, עבור לרשימה הראשונה
		if (globalState.state.activeListId[userId] === listId) {
			globalState.state.activeListId[userId] = globalState.state.lists[userId][0].id;
			globalState.save();
		} else {
			globalState.save();
		}
	}

	updateList(userId: string, listId: string, updates: Partial<List>) {
		const list = globalState.state.lists[userId]?.find((l) => l.id === listId);
		if (list) {
			Object.assign(list, updates);
			globalState.save();
		}
	}

	// -- ניהול משימות --

	updateTasks(userId: string, listId: string, newTasks: Task[]) {
		const list = globalState.state.lists[userId]?.find((l) => l.id === listId);
		if (list) {
			list.tasks = newTasks;
			globalState.save();
		}
	}

	// פונקציית עזר לאתחול ברירות מחדל למשתמש חדש
	initializeDefaultLists(userId: string) {
		globalState.state.lists[userId] = createDefaultLists();
		this.setActiveList(userId, globalState.state.lists[userId][0].id);
		globalState.save();
	}

	// שכפול רשימה
	duplicateList(userId: string, listId: string): string | null {
		const originalList = globalState.state.lists[userId]?.find((l) => l.id === listId);
		if (!originalList) return null;

		const newId = crypto.randomUUID();
		
		// העתקה עמוקה של המשימות עם IDs חדשים
		const duplicatedTasks: Task[] = originalList.tasks.map((task) => ({
			...task,
			id: crypto.randomUUID(),
			isDone: false // אפס את הסטטוס של המשימות בעותק
		}));

		const duplicatedList: List = {
			id: newId,
			name: `${originalList.name} (עותק)`,
			tasks: duplicatedTasks,
			greeting: originalList.greeting,
			logo: originalList.logo,
			isDefault: false
		};

		if (!globalState.state.lists[userId]) {
			globalState.state.lists[userId] = [];
		}

		globalState.state.lists[userId].push(duplicatedList);
		globalState.save();
		
		return newId;
	}

	// איפוס כל המשימות ברשימה
	resetAllTasks(userId: string, listId: string) {
		const list = globalState.state.lists[userId]?.find((l) => l.id === listId);
		if (list) {
			list.tasks.forEach((task) => {
				task.isDone = false;
			});
			globalState.save();
		}
	}

	// החלפת מצב הצגה/הסתרה של רשימה
	toggleListVisibility(userId: string, listId: string) {
		const list = globalState.state.lists[userId]?.find((l) => l.id === listId);
		if (list) {
			list.isHidden = !list.isHidden;
			globalState.save();
		}
	}

	// החלפת מצב נעילה של רשימה (תרגול/הכנה)
	toggleListLock(userId: string, listId: string) {
		const list = globalState.state.lists[userId]?.find((l) => l.id === listId);
		if (list && !list.isDefault) {
			// לא לנעול רשימות ברירת מחדל
			list.isLocked = !list.isLocked;
			globalState.save();
		}
	}

	// העברה/שכפול רשימה בין משתמשים
	copyListToUser(
		fromUserId: string,
		toUserId: string,
		listId: string,
		shouldMove: boolean = false
	): string | null {
		const originalList = globalState.state.lists[fromUserId]?.find((l) => l.id === listId);
		if (!originalList) return null;

		const newId = crypto.randomUUID();

		// העתקה עמוקה של המשימות עם IDs חדשים
		const copiedTasks: Task[] = originalList.tasks.map((task) => ({
			...task,
			id: crypto.randomUUID(),
			isDone: false // אפס את הסטטוס של המשימות בעותק
		}));

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
			globalState.state.lists[toUserId] = [];
		}

		globalState.state.lists[toUserId].push(copiedList);

		// אם זו העברה (לא שכפול) - מחיקת המקור
		if (shouldMove && globalState.state.lists[fromUserId].length > 1) {
			this.deleteList(fromUserId, listId);
		}

		globalState.save();
		return newId;
	}
}

export const listStore = new ListStore();
