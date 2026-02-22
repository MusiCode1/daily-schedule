import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	syncStatus,
	syncStarted,
	syncSucceeded,
	syncFailed,
	setOffline,
	resetSyncStatus
} from '$lib/stores/syncStore';

beforeEach(() => {
	resetSyncStatus();
});

// ─── syncStarted ─────────────────────────────────────────────

describe('syncStore.syncStarted', () => {
	it('should set status to syncing', () => {
		syncStarted();
		expect(get(syncStatus).status).toBe('syncing');
	});

	it('should clear errorMessage', () => {
		syncFailed('שגיאה', 1, 5);
		syncStarted();
		expect(get(syncStatus).errorMessage).toBeNull();
	});

	it('should preserve other fields', () => {
		syncSucceeded();
		const before = get(syncStatus);
		syncStarted();
		const after = get(syncStatus);
		expect(after.lastSyncTime).toBe(before.lastSyncTime);
	});
});

// ─── syncSucceeded ───────────────────────────────────────────

describe('syncStore.syncSucceeded', () => {
	it('should set status to synced', () => {
		syncStarted();
		syncSucceeded();
		expect(get(syncStatus).status).toBe('synced');
	});

	it('should update lastSyncTime to a non-null value', () => {
		syncSucceeded();
		expect(get(syncStatus).lastSyncTime).not.toBeNull();
		expect(typeof get(syncStatus).lastSyncTime).toBe('number');
	});

	it('should reset retryAttempt and nextRetryIn to null', () => {
		syncFailed('שגיאה', 3, 8);
		syncSucceeded();
		const s = get(syncStatus);
		expect(s.retryAttempt).toBeNull();
		expect(s.nextRetryIn).toBeNull();
	});

	it('should reset pendingChanges to 0', () => {
		syncSucceeded();
		expect(get(syncStatus).pendingChanges).toBe(0);
	});

	it('should clear errorMessage', () => {
		syncFailed('שגיאה', 1, 2);
		syncSucceeded();
		expect(get(syncStatus).errorMessage).toBeNull();
	});
});

// ─── syncFailed ───────────────────────────────────────────────

describe('syncStore.syncFailed', () => {
	it('should set status to error', () => {
		syncFailed('כשל', 1, 2);
		expect(get(syncStatus).status).toBe('error');
	});

	it('should store retryAttempt and nextRetryIn', () => {
		syncFailed('כשל', 3, 8);
		const s = get(syncStatus);
		expect(s.retryAttempt).toBe(3);
		expect(s.nextRetryIn).toBe(8);
	});

	it('should store errorMessage', () => {
		syncFailed('הודעת שגיאה', 1, 1);
		expect(get(syncStatus).errorMessage).toBe('הודעת שגיאה');
	});

	it('should handle maximum retry attempt (10)', () => {
		syncFailed('מקסימום', 10, 0);
		const s = get(syncStatus);
		expect(s.retryAttempt).toBe(10);
		expect(s.nextRetryIn).toBe(0);
	});
});

// ─── setOffline ──────────────────────────────────────────────

describe('syncStore.setOffline', () => {
	it('should set status to offline', () => {
		syncStarted();
		setOffline();
		expect(get(syncStatus).status).toBe('offline');
	});

	it('should preserve other fields when going offline', () => {
		syncSucceeded();
		const lastSyncTime = get(syncStatus).lastSyncTime;
		setOffline();
		expect(get(syncStatus).lastSyncTime).toBe(lastSyncTime);
	});
});

// ─── resetSyncStatus ─────────────────────────────────────────

describe('syncStore.resetSyncStatus', () => {
	it('should reset status to offline (default)', () => {
		syncSucceeded();
		resetSyncStatus();
		expect(get(syncStatus).status).toBe('offline');
	});

	it('should reset lastSyncTime to null', () => {
		syncSucceeded();
		resetSyncStatus();
		expect(get(syncStatus).lastSyncTime).toBeNull();
	});

	it('should reset retryAttempt and nextRetryIn to null', () => {
		syncFailed('שגיאה', 5, 32);
		resetSyncStatus();
		const s = get(syncStatus);
		expect(s.retryAttempt).toBeNull();
		expect(s.nextRetryIn).toBeNull();
	});

	it('should reset errorMessage to null', () => {
		syncFailed('שגיאה', 1, 1);
		resetSyncStatus();
		expect(get(syncStatus).errorMessage).toBeNull();
	});

	it('should reset pendingChanges to 0', () => {
		resetSyncStatus();
		expect(get(syncStatus).pendingChanges).toBe(0);
	});
});

// ─── רצפים ──────────────────────────────────────────────────

describe('syncStore: state sequences', () => {
	it('syncStarted → syncSucceeded should update correctly at each step', () => {
		syncStarted();
		expect(get(syncStatus).status).toBe('syncing');

		syncSucceeded();
		expect(get(syncStatus).status).toBe('synced');
		expect(get(syncStatus).lastSyncTime).not.toBeNull();
	});

	it('syncStarted → syncFailed → syncStarted should clear errorMessage', () => {
		syncStarted();
		syncFailed('שגיאה', 1, 1);
		expect(get(syncStatus).errorMessage).toBe('שגיאה');

		syncStarted();
		expect(get(syncStatus).errorMessage).toBeNull();
		expect(get(syncStatus).status).toBe('syncing');
	});

	it('multiple syncFailed calls should update retryAttempt progressively', () => {
		syncFailed('א', 1, 1);
		syncFailed('ב', 2, 2);
		syncFailed('ג', 3, 4);

		const s = get(syncStatus);
		expect(s.retryAttempt).toBe(3);
		expect(s.nextRetryIn).toBe(4);
		expect(s.errorMessage).toBe('ג');
	});

	it('syncSucceeded after syncFailed should fully clear error state', () => {
		syncFailed('שגיאה', 5, 32);
		syncSucceeded();

		const s = get(syncStatus);
		expect(s.status).toBe('synced');
		expect(s.retryAttempt).toBeNull();
		expect(s.nextRetryIn).toBeNull();
		expect(s.errorMessage).toBeNull();
	});
});
