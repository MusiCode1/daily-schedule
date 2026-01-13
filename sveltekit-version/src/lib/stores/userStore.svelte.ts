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
		return this.users.find((u) => u.id === this.currentUserId);
	}

	login(userId: string) {
		const user = this.users.find((u) => u.id === userId);
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

		globalState.state.users.push(newUser);

		// Initialize default lists for the new user using listStore
		// Dynamic import matches Svelte 5 module resolution usage
		const { listStore } = await import('./listStore.svelte');
		listStore.initializeDefaultLists(id);

		globalState.save();
		return id;
	}

	updateUser(id: string, updates: Partial<UserProfile>) {
		const userIndex = this.users.findIndex((u) => u.id === id);
		if (userIndex !== -1) {
			globalState.state.users[userIndex] = { ...this.users[userIndex], ...updates };
			globalState.save();
		}
	}

	deleteUser(id: string) {
		globalState.state.users = this.users.filter((u) => u.id !== id);

		if (this.currentUserId === id) {
			this.logout();
		}
		globalState.save();
	}
}

export const userStore = new UserStore();
