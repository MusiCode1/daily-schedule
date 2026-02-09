import { describe, expect, it } from 'vitest';
import {
	CURRENT_DEVICE_STATE_VERSION,
	DEVICE_STATE_STORAGE_KEY,
	migrateDeviceStateInStorage,
	type StorageLike
} from '$lib/stores/deviceState';

class MemoryStorage implements StorageLike {
	private map = new Map<string, string>();

	getItem(key: string): string | null {
		return this.map.has(key) ? this.map.get(key)! : null;
	}

	setItem(key: string, value: string): void {
		this.map.set(key, value);
	}

	removeItem(key: string): void {
		this.map.delete(key);
	}

	keys(): string[] {
		return [...this.map.keys()].sort();
	}
}

describe('Device State Migration', () => {
	it('should normalize an existing device-state and remove legacy keys', () => {
		const storage = new MemoryStorage();

		storage.setItem(
			DEVICE_STATE_STORAGE_KEY,
			JSON.stringify({
				version: CURRENT_DEVICE_STATE_VERSION,
				drive: { deviceId: 'dev-1', deviceName: '' },
				auth: {},
				settings: {}
			})
		);

		storage.setItem('device_id', 'legacy-dev');
		storage.setItem('google_client_id_override', 'legacy-client');

		const ds = migrateDeviceStateInStorage(storage, { userAgent: 'Chrome Windows' });

		expect(ds.version).toBe(CURRENT_DEVICE_STATE_VERSION);
		expect(ds.drive.deviceId).toBe('dev-1'); // לא דורסים נתון שכבר קיים
		expect(ds.drive.deviceName.length).toBeGreaterThan(0); // מולא מ-defaults
		expect(ds.drive.v2Cache).toBeTruthy();
		expect(ds.settings.ui.floatingBoard).toBeTruthy();

		// מפתחות legacy אמורים להימחק
		expect(storage.getItem('device_id')).toBeNull();
		expect(storage.getItem('google_client_id_override')).toBeNull();
	});

	it('should migrate legacy keys into device-state and remove them', () => {
		const storage = new MemoryStorage();

		storage.setItem('device_id', 'legacy-dev-123');
		storage.setItem('device_name', 'Legacy Device');
		storage.setItem('last_known_write_id', 'w123');
		storage.setItem('auto_backup_enabled', 'false');
		storage.setItem('use_redirect_mode', 'true');
		storage.setItem('google_client_id_override', 'override123');
		storage.setItem(
			'google_auth_storage',
			JSON.stringify({ accessToken: 't1', expiresAt: Date.now() + 60000, issuedAt: Date.now() })
		);
		storage.setItem(
			'floating-board-state',
			JSON.stringify({ top: 1, left: 2, width: 3, height: 4 })
		);

		const ds = migrateDeviceStateInStorage(storage, { userAgent: 'Chrome Windows' });

		expect(ds.drive.deviceId).toBe('legacy-dev-123');
		expect(ds.drive.deviceName).toBe('Legacy Device');
		expect(ds.drive.lastKnownWriteId).toBe('w123');
		expect(ds.drive.autoBackupEnabled).toBe(false);
		expect(ds.drive.useRedirectMode).toBe(true);
		expect(ds.drive.clientIdOverride).toBe('override123');
		expect(ds.auth.googleAuthStorage?.accessToken).toBe('t1');
		expect(ds.settings.ui.floatingBoard).toEqual({ top: 1, left: 2, width: 3, height: 4 });

		// legacy keys נמחקו
		expect(storage.getItem('device_id')).toBeNull();
		expect(storage.getItem('device_name')).toBeNull();
		expect(storage.getItem('last_known_write_id')).toBeNull();
		expect(storage.getItem('auto_backup_enabled')).toBeNull();
		expect(storage.getItem('use_redirect_mode')).toBeNull();
		expect(storage.getItem('google_client_id_override')).toBeNull();
		expect(storage.getItem('google_auth_storage')).toBeNull();
		expect(storage.getItem('floating-board-state')).toBeNull();

		// אבל device-state כן נשמר
		expect(storage.getItem(DEVICE_STATE_STORAGE_KEY)).not.toBeNull();
	});

	it('should migrate legacy gdrive_token into googleAuthStorage when google_auth_storage is missing', () => {
		const storage = new MemoryStorage();

		storage.setItem('gdrive_token', 'legacy-token');
		storage.setItem('gdrive_expiry', String(Date.now() + 60000));

		const ds = migrateDeviceStateInStorage(storage, { userAgent: 'Chrome Windows' });
		expect(ds.auth.googleAuthStorage?.accessToken).toBe('legacy-token');

		// legacy keys נמחקו
		expect(storage.getItem('gdrive_token')).toBeNull();
		expect(storage.getItem('gdrive_expiry')).toBeNull();
	});
});

