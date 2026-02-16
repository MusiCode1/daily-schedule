import { writable } from 'svelte/store';

/**
 * סטטוס סנכרון
 */
export interface SyncStatus {
	status: 'synced' | 'syncing' | 'error' | 'offline';
	lastSyncTime: number | null;
	retryAttempt: number | null;
	nextRetryIn: number | null; // שניות
	pendingChanges: number;
	errorMessage: string | null;
}

/**
 * סטטוס ברירת מחדל
 */
const defaultStatus: SyncStatus = {
	status: 'offline',
	lastSyncTime: null,
	retryAttempt: null,
	nextRetryIn: null,
	pendingChanges: 0,
	errorMessage: null
};

/**
 * Store לסטטוס סנכרון
 */
export const syncStatus = writable<SyncStatus>(defaultStatus);

/**
 * התחלת סנכרון
 */
export function syncStarted() {
	syncStatus.update((s) => ({
		...s,
		status: 'syncing',
		errorMessage: null
	}));
}

/**
 * סנכרון הצליח
 */
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

/**
 * סנכרון נכשל
 */
export function syncFailed(error: string, retryAttempt: number, nextRetryIn: number) {
	syncStatus.update((s) => ({
		...s,
		status: 'error',
		retryAttempt,
		nextRetryIn,
		errorMessage: error
	}));
}

/**
 * Offline
 */
export function setOffline() {
	syncStatus.update((s) => ({
		...s,
		status: 'offline'
	}));
}

/**
 * עדכון סטטוס כללי
 */
export function updateSyncStatus(update: Partial<SyncStatus>) {
	syncStatus.update((s) => ({ ...s, ...update }));
}

/**
 * איפוס סטטוס
 */
export function resetSyncStatus() {
	syncStatus.set(defaultStatus);
}

// ========================================
// תאימות לאחור עם API ישן (backupController)
// ========================================

/**
 * @deprecated - Store ישן לתאימות לאחור
 */
export const syncState = writable({
	status: 'idle' as 'idle' | 'uploading' | 'downloading' | 'processing',
	progress: 0,
	message: ''
});

/**
 * @deprecated - השתמש ב-syncStarted, syncSucceeded, syncFailed במקום
 */
export function setSyncStatus(
	status: 'idle' | 'uploading' | 'downloading' | 'processing',
	message: string = '',
	progress: number = 0
) {
	syncState.set({ status, message, progress });

	// עדכון גם את הממשק החדש
	if (status === 'idle') {
		resetSyncStatus();
	} else {
		syncStatus.update((s) => ({
			...s,
			status: 'syncing',
			errorMessage: message
		}));
	}
}
