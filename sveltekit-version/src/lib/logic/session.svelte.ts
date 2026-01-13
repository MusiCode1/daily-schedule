import { userStore } from '$lib/stores/userStore.svelte';

export class SessionController {
	// UI State עבור הסשן (אם קיים, נפרד מנתוני ה-Store)

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
