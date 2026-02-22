import { beforeEach, describe, expect, it, vi } from 'vitest';

// חשוב: dailyScheduleBackupRepo תלוי ב-deviceState שמסתמך על `$app/environment.browser`.
// בבדיקות Node נבצע mock כדי לאפשר שימוש ב-localStorage.
vi.mock('$app/environment', () => ({ browser: true }));

type DriveFileMeta = { id: string; name?: string; modifiedTime?: string; appProperties?: Record<string, string> };

let getFileMetadataImpl: (fileId: string) => Promise<DriveFileMeta>;
let findOrCreateFolderImpl: (name: string, parentId?: string) => Promise<string>;
let findFileByNameInFolderImpl: (name: string, parentId: string) => Promise<DriveFileMeta | null>;

vi.mock('$lib/services/sync/providers/google-drive/driveFilesApi', () => {
	return {
		driveFilesApi: {
			getFileMetadata: (fileId: string) => getFileMetadataImpl(fileId),
			findOrCreateFolder: (name: string, parentId?: string) => findOrCreateFolderImpl(name, parentId),
			findFileByNameInFolder: (name: string, parentId: string) => findFileByNameInFolderImpl(name, parentId),
			createFile: async () => {
				throw new Error('Not used in this test');
			},
			updateFileMetadata: async () => {
				throw new Error('Not used in this test');
			}
		}
	};
});

vi.mock('$lib/services/sync/providers/google-drive/driveHttpClient', () => {
	return {
		driveHttpClient: {
			downloadJson: async () => {
				throw new Error('Not used in this test');
			},
			uploadJson: async () => {
				throw new Error('Not used in this test');
			},
			uploadBlob: async () => {
				throw new Error('Not used in this test');
			},
			downloadBlob: async () => {
				throw new Error('Not used in this test');
			}
		}
	};
});

class MemoryLocalStorage implements Storage {
	private map = new Map<string, string>();

	get length(): number {
		return this.map.size;
	}

	clear(): void {
		this.map.clear();
	}
	getItem(key: string): string | null {
		return this.map.has(key) ? this.map.get(key)! : null;
	}
	key(index: number): string | null {
		return [...this.map.keys()][index] ?? null;
	}
	removeItem(key: string): void {
		this.map.delete(key);
	}
	setItem(key: string, value: string): void {
		this.map.set(key, value);
	}
}

describe('dailyScheduleBackupRepo cache fallback', () => {
	beforeEach(async () => {
		vi.resetModules();

		// localStorage mock
		vi.stubGlobal('localStorage', new MemoryLocalStorage());

		// default mocks (ניתן לדרוס בכל בדיקה)
		getFileMetadataImpl = async (fileId: string) => ({ id: fileId });
		findOrCreateFolderImpl = async () => 'folder:backup';
		findFileByNameInFolderImpl = async () => null;
	});

	it('should fallback from stale cached manifestFileId to name-based lookup and update cache', async () => {
		const { DEVICE_STATE_STORAGE_KEY } = await import('$lib/stores/deviceState');
		const { DRIVE_MANIFEST_FILE_NAME } = await import('$lib/services/sync/providers/google-drive/constants');

		// device-state עם manifestFileId מיושן
		localStorage.setItem(
			DEVICE_STATE_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				drive: {
					deviceId: 'dev-1',
					deviceName: 'Test Device',
					lastKnownWriteId: null,
					autoBackupEnabled: true,
					useRedirectMode: false,
					clientIdOverride: '',
					v2Cache: {
						manifestFileId: 'file:stale-manifest'
					}
				},
				auth: { googleAuthStorage: null },
				settings: { ui: { floatingBoard: { top: 100, left: 100, width: 800, height: 600 } } }
			})
		);

		// cache id stale -> getFileMetadata זורק, ואז מוצאים לפי שם
		getFileMetadataImpl = async (fileId: string) => {
			if (fileId === 'file:stale-manifest') throw new Error('404');
			return { id: fileId };
		};
		findOrCreateFolderImpl = async () => 'folder:backup';
		findFileByNameInFolderImpl = async (name: string, parentId: string) => {
			expect(parentId).toBe('folder:backup');
			if (name !== DRIVE_MANIFEST_FILE_NAME) return null;
			return { id: 'file:manifest-fresh', name };
		};

		const { dailyScheduleBackupRepo } = await import('$lib/services/sync/providers/google-drive/dailyScheduleBackupRepo');
		const meta = await dailyScheduleBackupRepo.findV2ManifestMeta();

		expect(meta?.id).toBe('file:manifest-fresh');

		const updatedRaw = localStorage.getItem(DEVICE_STATE_STORAGE_KEY);
		expect(updatedRaw).not.toBeNull();
		const updated = JSON.parse(updatedRaw!);
		expect(updated.drive.v2Cache.manifestFileId).toBe('file:manifest-fresh');
	});
});

