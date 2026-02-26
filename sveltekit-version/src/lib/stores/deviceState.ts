import { browser } from '$app/environment';
import { migrationService, type GoogleAuthStorage } from '$lib/services/migration';

/** מפתח localStorage לשמירת מצב המכשיר */
export const DEVICE_STATE_STORAGE_KEY = 'daily-schedule-device-state';

/** גרסה נוכחית של סכימת DeviceState — משמשת למיגרציה */
export const CURRENT_DEVICE_STATE_VERSION = 2 as const;

export type FloatingBoardPosition = {
	top: number;
	left: number;
	width: number;
	height: number;
};

/** Cache ספציפי ל-Google Drive — fileIds ו-hashes לאינקרמנטליות */
export type GoogleDriveProviderCache = {
	backupFolderId?: string;
	assetsFolderId?: string;
	manifestFileId?: string;
	contentFileId?: string;
	progressFileId?: string;
	assetsIndexFileId?: string;
	historyFileId?: string;
	lastUploadedContentHash?: string;
	lastUploadedProgressHash?: string;
	lastUploadedAssetsHash?: string;
};

/**
 * מצב מכשיר — כולל הגדרות סנכרון, cache של ספקים, אימות ו-UI.
 * נשמר ב-localStorage ומשמש כ-single source of truth לכל מצב מקומי.
 */
export type DeviceState = {
	version: typeof CURRENT_DEVICE_STATE_VERSION;
	drive: {
		deviceId: string;
		deviceName: string;
		lastKnownWriteId: string | null;
		autoBackupEnabled: boolean;
		useRedirectMode: boolean;
		clientIdOverride: string;
		/** @deprecated השתמש ב-providers['google-drive'] במקום */
		v2Cache: GoogleDriveProviderCache;
	};
	/** cache ספציפי לכל ספק — מפתח = provider.id */
	providers: {
		'google-drive'?: GoogleDriveProviderCache;
	};
	auth: {
		googleAuthStorage: GoogleAuthStorage | null;
	};
	settings: {
		ui: {
			floatingBoard: FloatingBoardPosition;
		};
	};
};

/** V1 — שמור לצורך מיגרציה */
type DeviceStateV1 = {
	version: 1;
	drive: {
		deviceId: string;
		deviceName: string;
		lastKnownWriteId: string | null;
		autoBackupEnabled: boolean;
		useRedirectMode: boolean;
		clientIdOverride: string;
		v2Cache: GoogleDriveProviderCache;
	};
	auth: {
		googleAuthStorage: GoogleAuthStorage | null;
	};
	settings: {
		ui: {
			floatingBoard: FloatingBoardPosition;
		};
	};
};

/** ממשק מינימלי לאחסון — מאפשר הזרקת mock בבדיקות */
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

function createDefaultDeviceState(userAgent: string): DeviceState {
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
		providers: {},
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

function normalizeDeviceState(state: any, userAgent: string): DeviceState {
	const fallback = createDefaultDeviceState(userAgent);
	const driveCache =
		typeof state?.drive?.v2Cache === 'object' && state.drive.v2Cache
			? state.drive.v2Cache
			: {};

	const next: DeviceState = {
		version: CURRENT_DEVICE_STATE_VERSION,
		drive: {
			deviceId:
				typeof state?.drive?.deviceId === 'string' && state.drive.deviceId
					? state.drive.deviceId
					: fallback.drive.deviceId,
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
			v2Cache: driveCache
		},
		providers:
			typeof state?.providers === 'object' && state.providers ? state.providers : {},
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

	// סנכרון: אם providers['google-drive'] ריק אבל v2Cache מלא → מאכלס אוטומטית
	if (!next.providers['google-drive'] && Object.keys(driveCache).length > 0) {
		next.providers['google-drive'] = { ...driveCache };
	}

	return next;
}

/** מיגרציה מ-V1 ל-V2 (הוספת providers) */
function migrateV1ToV2(v1: DeviceStateV1): DeviceState {
	return {
		version: CURRENT_DEVICE_STATE_VERSION,
		drive: {
			deviceId: v1.drive.deviceId,
			deviceName: v1.drive.deviceName,
			lastKnownWriteId: v1.drive.lastKnownWriteId,
			autoBackupEnabled: v1.drive.autoBackupEnabled,
			useRedirectMode: v1.drive.useRedirectMode,
			clientIdOverride: v1.drive.clientIdOverride,
			v2Cache: v1.drive.v2Cache
		},
		providers: {
			'google-drive': v1.drive.v2Cache && Object.keys(v1.drive.v2Cache).length > 0
				? { ...v1.drive.v2Cache }
				: undefined
		},
		auth: {
			googleAuthStorage: v1.auth.googleAuthStorage
		},
		settings: {
			ui: {
				floatingBoard: v1.settings.ui.floatingBoard
			}
		}
	};
}

/**
 * מבצעת מיגרציה של מצב המכשיר ב-storage — מ-legacy keys או מגרסה ישנה לגרסה נוכחית.
 * מנקה מפתחות ישנים לאחר מיגרציה מוצלחת.
 * @param storage - אובייקט אחסון (localStorage או mock)
 * @param options - אפשרויות
 * @param options.userAgent - מחרוזת user agent לזיהוי שם המכשיר
 * @returns DeviceState מנורמל ומעודכן
 */
export function migrateDeviceStateInStorage(
	storage: StorageLike,
	options?: { userAgent?: string }
): DeviceState {
	const userAgent = options?.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

	const existingRaw = storage.getItem(DEVICE_STATE_STORAGE_KEY);
	const existing = safeParseJson<any>(existingRaw);

	// V2 קיים ותקין — רק normalize ושמור
	if (existing && existing.version === CURRENT_DEVICE_STATE_VERSION) {
		const normalized = normalizeDeviceState(existing, userAgent);
		storage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(normalized));
		for (const key of LEGACY_KEYS_TO_REMOVE) {
			storage.removeItem(key);
		}
		return normalized;
	}

	// V1 → V2
	if (existing && existing.version === 1) {
		const v1 = normalizeV1ForMigration(existing, userAgent);
		const v2 = migrateV1ToV2(v1);
		const normalized = normalizeDeviceState(v2, userAgent);
		storage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(normalized));
		for (const key of LEGACY_KEYS_TO_REMOVE) {
			storage.removeItem(key);
		}
		return normalized;
	}

	// אחרת: בנה default וממגר legacy keys
	const next = createDefaultDeviceState(userAgent);

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

	const legacyFloatingRaw = storage.getItem('floating-board-state');
	const legacyFloating = safeParseJson<any>(legacyFloatingRaw);
	if (validateFloatingBoardPosition(legacyFloating)) {
		next.settings.ui.floatingBoard = legacyFloating;
	}

	storage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(next));

	for (const key of LEGACY_KEYS_TO_REMOVE) {
		storage.removeItem(key);
	}

	return next;
}

/** normalize partial V1 data (for migration path) */
function normalizeV1ForMigration(state: any, userAgent: string): DeviceStateV1 {
	const fallback = createDefaultDeviceState(userAgent);
	return {
		version: 1,
		drive: {
			deviceId: state?.drive?.deviceId || fallback.drive.deviceId,
			deviceName: state?.drive?.deviceName || fallback.drive.deviceName,
			lastKnownWriteId: state?.drive?.lastKnownWriteId ?? null,
			autoBackupEnabled:
				typeof state?.drive?.autoBackupEnabled === 'boolean'
					? state.drive.autoBackupEnabled
					: true,
			useRedirectMode:
				typeof state?.drive?.useRedirectMode === 'boolean'
					? state.drive.useRedirectMode
					: false,
			clientIdOverride: state?.drive?.clientIdOverride || '',
			v2Cache:
				typeof state?.drive?.v2Cache === 'object' && state.drive.v2Cache
					? state.drive.v2Cache
					: {}
		},
		auth: {
			googleAuthStorage: state?.auth?.googleAuthStorage ?? null
		},
		settings: {
			ui: {
				floatingBoard: validateFloatingBoardPosition(state?.settings?.ui?.floatingBoard)
					? state.settings.ui.floatingBoard
					: { ...DEFAULT_FLOATING_BOARD }
			}
		}
	};
}

let cached: DeviceState | null = null;

/**
 * store של מצב המכשיר — קריאה, כתיבה ועדכון אטומי.
 * משמש את שכבות הסנכרון לשמירת deviceId, writeId, cache של ספקים ואימות.
 */
export const deviceState = {
	/**
	 * טוענת את מצב המכשיר (עם cache ומיגרציה חד-פעמית).
	 * @returns DeviceState נוכחי
	 */
	load(): DeviceState {
		if (!browser) {
			return createDefaultDeviceState('');
		}

		if (cached) return cached;

		const migrated = migrateDeviceStateInStorage(localStorage);
		cached = migrated;
		return migrated;
	},

	/**
	 * שומרת מצב מכשיר חדש ל-localStorage ול-cache.
	 * @param next - מצב חדש לשמירה
	 */
	save(next: DeviceState) {
		if (!browser) return;
		cached = next;
		localStorage.setItem(DEVICE_STATE_STORAGE_KEY, JSON.stringify(next));
	},

	/**
	 * עדכון אטומי — משכפלת את המצב הנוכחי, מפעילה mutator, מנרמלת ושומרת.
	 * @param mutator - פונקציה שמקבלת draft לשינוי in-place
	 * @returns DeviceState מעודכן ומנורמל
	 */
	update(mutator: (draft: DeviceState) => void): DeviceState {
		const current = this.load();
		const draft =
			typeof structuredClone === 'function'
				? structuredClone(current)
				: (JSON.parse(JSON.stringify(current)) as DeviceState);
		mutator(draft);
		const normalized = normalizeDeviceState(
			draft,
			typeof navigator !== 'undefined' ? navigator.userAgent : ''
		);
		this.save(normalized);
		return normalized;
	},

	/** מאפסת את ה-cache הפנימי — הקריאה הבאה ל-load() תקרא מ-localStorage */
	resetCache() {
		cached = null;
	}
};
