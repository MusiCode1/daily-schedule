import { globalState } from './globalState.svelte';
import type { UserProfile, Gender } from '../types';

export class UserStore {
	get users() {
		return globalState.state.users;
	}

	get currentUserId() {
		return globalState.state.currentUserId;
	}

	get currentUser() {
		return this.currentUserId ? this.users[this.currentUserId] : undefined;
	}

	login(userId: string) {
		const user = this.users[userId];
		if (user) {
			globalState.state.currentUserId = userId;
			globalState.save();
		}
	}

	logout() {
		globalState.state.currentUserId = null;
		globalState.save();
	}

	async addUser(userData: { name: string; gender: Gender; avatar?: string }) {
		const id = crypto.randomUUID();
		const newUser: UserProfile = {
			id,
			name: userData.name,
			gender: userData.gender,
			avatar: userData.avatar || '',
			themeColor: '#6366f1'
		};

		globalState.state.users[id] = newUser; // object במקום push

		// אתחול רשימות ברירת מחדל למשתמש החדש באמצעות listStore
		// ייבוא דינמי תואם את אופן הפעולה של Svelte 5
		const { listStore } = await import('./listStore.svelte');
		listStore.initializeDefaultLists(id);

		globalState.save();
		return id;
	}

	updateUser(id: string, updates: Partial<UserProfile>) {
		const user = this.users[id];
		if (user) {
			globalState.state.users[id] = { ...user, ...updates };
			globalState.save();
		}
	}

	deleteUser(id: string) {
		delete globalState.state.users[id]; // delete במקום filter

		if (this.currentUserId === id) {
			this.logout();
		}
		globalState.save();
	}
}

export const userStore = new UserStore();
