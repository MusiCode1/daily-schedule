import { writable } from 'svelte/store';

export interface SyncStatus {
	status: 'synced' | 'syncing' | 'error' | 'offline';
	lastSyncTime: number | null;
	retryAttempt: number | null;
	nextRetryIn: number | null;
	pendingChanges: number;
	errorMessage: string | null;
}

const defaultStatus: SyncStatus = {
	status: 'offline',
	lastSyncTime: null,
	retryAttempt: null,
	nextRetryIn: null,
	pendingChanges: 0,
	errorMessage: null
};

export const syncStatus = writable<SyncStatus>(defaultStatus);

export function syncStarted() {
	syncStatus.update((s) => ({
		...s,
		status: 'syncing',
		errorMessage: null
	}));
}

export function syncSucceeded() {
	syncStatus.update((s) => ({
		...s,
		status: 'synced',
		lastSyncTime: Date.now(),
		retryAttempt: null,
		nextRetryIn: null,
		pendingChanges: 0,
		errorMessage: null
	}));
}

export function syncFailed(error: string, retryAttempt: number, nextRetryIn: number) {
	syncStatus.update((s) => ({
		...s,
		status: 'error',
		retryAttempt,
		nextRetryIn,
		errorMessage: error
	}));
}

export function setOffline() {
	syncStatus.update((s) => ({
		...s,
		status: 'offline'
	}));
}

export function resetSyncStatus() {
	syncStatus.set(defaultStatus);
}
