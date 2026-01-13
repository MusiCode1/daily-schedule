import { userStore } from '$lib/stores/userStore.svelte';

export class SessionController {
	// UI State for session (if any, separate from store data)

	get currentUser() {
		return userStore.currentUser;
	}

	get users() {
		return userStore.users;
	}

	login(userId: string) {
		userStore.login(userId);
	}

	logout() {
		userStore.logout();
	}
}
