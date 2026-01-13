import { listStore } from '$lib/stores/listStore.svelte';
import { userStore } from '$lib/stores/userStore.svelte';

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

	// Actions

	createNewList() {
		if (!this.currentUser) return;
		const name = prompt('שם הרשימה החדשה:');
		if (!name) return;

		listStore.addList(this.currentUser.id, name);
	}

	deleteCurrentList() {
		const user = this.currentUser;
		const list = this.activeList;

		if (!user || !list) return;

		// Validation - Logic that belongs in Controller because it might involve UI (alerts)
		if (this.userLists.length <= 1) {
			alert('אי אפשר למחוק את הרשימה האחרונה.');
			return;
		}

		if (!confirm('למחוק את הרשימה הנוכחית?')) return;

		listStore.deleteList(user.id, list.id);
	}

	switchList(listId: string) {
		if (this.currentUser) {
			listStore.setActiveList(this.currentUser.id, listId);
		}
	}
}
