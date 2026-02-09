import { listStore } from '$lib/stores/listStore.svelte';
import { userStore } from '$lib/stores/userStore.svelte';
import { TEXTS } from '$lib/data/texts';

export class ListsNavigationController {
	get currentUser() {
		return userStore.currentUser;
	}

	get userLists() {
		return this.currentUser ? listStore.getUserLists(this.currentUser.id) : [];
	}

	get activeList() {
		return this.currentUser ? listStore.getActiveList(this.currentUser.id) : undefined;
	}

	// פעולות

	createNewList() {
		if (!this.currentUser) return;
		const name = prompt(TEXTS.NEW_LIST_NAME_PROMPT);
		if (!name) return;

		listStore.addList(this.currentUser.id, name);
	}

	deleteCurrentList() {
		const user = this.currentUser;
		const list = this.activeList;

		if (!user || !list) return;

		// ולידציה - לוגיקה ששייכת ל-Controller כי היא עשויה לערב ממשק משתמש (התראות)
		if (this.userLists.length <= 1) {
			alert(TEXTS.CANNOT_DELETE_LAST_LIST);
			return;
		}

		if (!confirm(TEXTS.DELETE_CURRENT_LIST_CONFIRM)) return;

		listStore.deleteList(user.id, list.id);
	}

	switchList(listId: string) {
		if (this.currentUser) {
			listStore.setActiveList(this.currentUser.id, listId);
		}
	}
}
