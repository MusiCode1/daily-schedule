import { browser } from '$app/environment';
import { migrationService, type GoogleAuthStorage } from '$lib/services/migration';

export const DEVICE_STATE_STORAGE_KEY = 'daily-schedule-device-state';

export const CURRENT_DEVICE_STATE_VERSION = 1 as const;

export type FloatingBoardPosition = {
	top: number;
	left: number;
	width: number;
	height: number;
};

export type DriveV2Cache = {
	backupFolderId?: string;
	assetsFolderId?: string;
	manifestFileId?: string;
	contentFileId?: string;
	progressFileId?: string;
	assetsIndexFileId?: string;
	lastUploadedContentHash?: string;
	lastUploadedProgressHash?: string;
	lastUploadedAssetsHash?: string;
};

export type DeviceStateV1 = {
	version: typeof CURRENT_DEVICE_STATE_VERSION;
	drive: {
		deviceId: string;
		deviceName: string;
		lastKnownWriteId: string | null;
		autoBackupEnabled: boolean;
		useRedirectMode: boolean;
		clientIdOverride: string;
		v2Cache: DriveV2Cache;
	};
	auth: {
		googleAuthStorage: GoogleAuthStorage | null;
	};
	// הערה: זה intentionally לא AppState.settings. זה per-device UI/settings.
	settings: {
		ui: {
			floatingBoard: FloatingBoardPosition;
		};
	};
};

export type DeviceState = DeviceStateV1;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const LEGACY_KEYS_TO_REMOVE = [
	'device_id',
	'device_name',
	'last_known_write_id',
	'auto_backup_enabled',
	'use_redirect_mode',
	'google_client_id_override',
	'google_auth_storage',
	'gdrive_token',
	'gdrive_expiry',
	'floating-board-state'
];

const DEFAULT_FLOATING_BOARD: FloatingBoardPosition = {
	top: 100,
	left: 100,
	width: 800,
	height: 600
};

function createDeviceId(): string {
	return crypto.randomUUID();
}

function guessDeviceNameFromUserAgent(userAgent: string): string {
	const ua = userAgent || '';

	let browserName = 'Browser';
	if (ua.includes('Chrome')) browserName = 'Chrome';
	else if (ua.includes('Firefox')) browserName = 'Firefox';
	else if (ua.includes('Safari')) browserName = 'Safari';
	else if (ua.includes('Edge')) browserName = 'Edge';

	let osName = 'OS';
	if (ua.includes('Windows')) osName = 'Windows';
	else if (ua.includes('Mac')) osName = 'MacOS';
	else if (ua.includes('Linux')) osName = 'Linux';
	else if (ua.includes('Android')) osName = 'Android';
	else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';

	return `${browserName} on ${osName}`;
}

function safeParseJson<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function parseBoolean(raw: string | null, fallback: boolean): boolean {
	if (raw === null) return fallback;
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	return fallback;
}

function validateFloatingBoardPosition(value: any): value is FloatingBoardPosition {
	return (
		value &&
		typeof value === 'object' &&
		typeof value.top === 'number' &&
		typeof value.left === 'number' &&
		typeof value.width === 'number' &&
		typeof value.height === 'number' &&
		!Number.isNaN(value.top) &&
		!Number.isNaN(value.left) &&
		!Number.isNaN(value.width) &&
		!Number.isNaN(value.height)
	);
}

function createDefaultDeviceState(userAgent: string): DeviceStateV1 {
	return {
		version: CURRENT_DEVICE_STATE_VERSION,
		drive: {
			deviceId: createDeviceId(),
			deviceName: guessDeviceNameFromUserAgent(userAgent),
			lastKnownWriteId: null,
			autoBackupEnabled: true,
			useRedirectMode: false,
			clientIdOverride: '',
			v2Cache: {}
		},
		auth: {
			googleAuthStorage: null
		},
		settings: {
			ui: {
				floatingBoard: { ...DEFAULT_FLOATING_BOARD }
			}
		}
	};
}

function normalizeDeviceStateV1(state: any, userAgent: string): DeviceStateV1 {
	const fallback = createDefaultDeviceState(userAgent);
	const next: DeviceStateV1 = {
		version: CURRENT_DEVICE_STATE_VERSION,
		drive: {
			deviceId: typeof state?.drive?.deviceId === 'string' && state.drive.deviceId ? state.drive.deviceId : fallback.drive.deviceId,
			deviceName:
				typeof state?.drive?.deviceName === 'string' && state.drive.deviceName
					? state.drive.deviceName
					: fallback.drive.deviceName,
			lastKnownWriteId:
				typeof state?.drive?.lastKnownWriteId === 'string'
					? state.drive.lastKnownWriteId
					: state?.drive?.lastKnownWriteId === null
						? null
						: fallback.drive.lastKnownWriteId,
			autoBackupEnabled:
				typeof state?.drive?.autoBackupEnabled === 'boolean'
					? state.drive.autoBackupEnabled
					: fallback.drive.autoBackupEnabled,
			useRedirectMode:
				typeof state?.drive?.useRedirectMode === 'boolean'
					? state.drive.useRedirectMode
					: fallback.drive.useRedirectMode,
			clientIdOverride:
				typeof state?.drive?.clientIdOverride === 'string'
					? state.drive.clientIdOverride
					: fallback.drive.clientIdOverride,
			v2Cache: typeof state?.drive?.v2Cache === 'object' && state.drive.v2Cache ? state.drive.v2Cache : {}
		},
		auth: {
			googleAuthStorage: state?.auth?.googleAuthStorage ?? fallback.auth.googleAuthStorage
		},
		settings: {
			ui: {
				floatingBoard: validateFloatingBoardPosition(state?.settings?.ui?.floatingBoard)
					? state.settings.ui.floatingBoard
					: fallback.settings.ui.floatingBoard
			}
		}
	};

	return next;
}

export function migrateDeviceStateInStorage(
	storage: StorageLike,
	options?: { userAgent?: string }
): DeviceStateV1 {
	const userAgent = options?.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

	const existingRaw = storage.getItem(DEVICE_STATE_STORAGE_KEY);
	const existing = safeParseJson<any>(existingRaw);

	// אם כבר קיים ומעודכן - רק normalize ושמור (למקרה שחסרים שדות).
	if (existing && existing.version === CURRENT_DEVICE_STATE_VERSION) {
		const normalized = normalizeDeviceStateV1(existing, userAgent);
		storage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(normalized));
		// ניקוי מפתחות ישנים (גם אם כבר היה device-state תקין) כדי להשאיר localStorage נקי.
		for (const key of LEGACY_KEYS_TO_REMOVE) {
			storage.removeItem(key);
		}
		return normalized;
	}

	// אחרת: נבנה default וננסה למזג אליו legacy keys.
	const next = createDefaultDeviceState(userAgent);

	// Drive legacy
	const legacyDeviceId = storage.getItem('device_id');
	if (legacyDeviceId) next.drive.deviceId = legacyDeviceId;

	const legacyDeviceName = storage.getItem('device_name');
	if (legacyDeviceName) next.drive.deviceName = legacyDeviceName;

	const legacyWriteId = storage.getItem('last_known_write_id');
	if (legacyWriteId) next.drive.lastKnownWriteId = legacyWriteId;

	next.drive.autoBackupEnabled = parseBoolean(storage.getItem('auto_backup_enabled'), next.drive.autoBackupEnabled);
	next.drive.useRedirectMode = parseBoolean(storage.getItem('use_redirect_mode'), next.drive.useRedirectMode);

	const legacyClientIdOverride = storage.getItem('google_client_id_override');
	if (legacyClientIdOverride !== null) next.drive.clientIdOverride = legacyClientIdOverride;

	// Auth legacy: google_auth_storage או gdrive_token
	const legacyAuthStorageRaw = storage.getItem('google_auth_storage');
	const legacyAuthStorage = safeParseJson<GoogleAuthStorage>(legacyAuthStorageRaw);
	if (legacyAuthStorage && legacyAuthStorage.accessToken) {
		next.auth.googleAuthStorage = legacyAuthStorage;
	} else {
		const legacyToken = storage.getItem('gdrive_token');
		const legacyExpiry = storage.getItem('gdrive_expiry');
		const migratedAuth = migrationService.migrateAuthStorage(legacyToken, legacyExpiry);
		if (migratedAuth) next.auth.googleAuthStorage = migratedAuth;
	}

	// UI legacy: floating-board-state
	const legacyFloatingRaw = storage.getItem('floating-board-state');
	const legacyFloating = safeParseJson<any>(legacyFloatingRaw);
	if (validateFloatingBoardPosition(legacyFloating)) {
		next.settings.ui.floatingBoard = legacyFloating;
	}

	storage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(next));

	// ניקוי מפתחות ישנים (חד-פעמי)
	for (const key of LEGACY_KEYS_TO_REMOVE) {
		storage.removeItem(key);
	}

	return next;
}

let cached: DeviceStateV1 | null = null;

export const deviceState = {
	load(): DeviceStateV1 {
		if (!browser) {
			// בצד השרת אין localStorage, נחזיר default "ריק".
			return createDefaultDeviceState('');
		}

		if (cached) return cached;

		const migrated = migrateDeviceStateInStorage(localStorage);
		cached = migrated;
		return migrated;
	},

	save(next: DeviceStateV1) {
		if (!browser) return;
		cached = next;
		localStorage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(next));
	},

	update(mutator: (draft: DeviceStateV1) => void): DeviceStateV1 {
		const current = this.load();
		// structuredClone קיים בדפדפנים מודרניים; fallback ל-JSON.
		const draft =
			typeof structuredClone === 'function'
				? structuredClone(current)
				: (JSON.parse(JSON.stringify(current)) as DeviceStateV1);
		mutator(draft);
		const normalized = normalizeDeviceStateV1(draft, typeof navigator !== 'undefined' ? navigator.userAgent : '');
		this.save(normalized);
		return normalized;
	},

	resetCache() {
		cached = null;
	}
};
