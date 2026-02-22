import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { AppState } from '$lib/types';
import type { SyncHistory } from '$lib/services/sync/types';
import type { BackupV2Repo, BackupV2Db, BackupV2Cache } from '$lib/services/drive/driveBackupV2';
import {
	backupWithHistory,
	backupToDriveV2,
	restoreWithMerge
} from '$lib/services/drive/driveBackupV2';

// ─── Helpers ─────────────────────────────────────────────────

function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function createMinimalState(overrides?: Partial<AppState>): AppState {
	return {
		version: 15,
		users: {
			u1: { id: 'u1', name: 'משתמש', gender: 'boy', avatar: '/img/u1.png', themeColor: '#000' }
		},
		lists: {
			u1: {
				list1: {
					id: 'list1',
					name: 'רשימה',
					tasks: {
						t1: { id: 't1', name: 'משימה 1', imageSrc: null, isDone: false, order: 0 },
						t2: { id: 't2', name: 'משימה 2', imageSrc: null, isDone: true, order: 1 }
					}
				}
			}
		},
		images: {},
		people: {},
		activeListId: { u1: 'list1' },
		currentUserId: 'u1',
		settings: { lastActiveTime: 1000, childLockEnabled: false },
		lastModified: 1000,
		...overrides
	};
}

const FILE_IDS = {
	backupFolderId: 'f-backup',
	assetsFolderId: 'f-assets',
	manifestFileId: 'f-manifest',
	contentFileId: 'f-content',
	progressFileId: 'f-progress',
	assetsIndexFileId: 'f-assets-index',
	historyFileId: 'f-history'
};

function createMockRepo() {
	const store = new Map<string, any>();
	const writeJsonCalls: Array<{ fileId: string; data: any }> = [];

	const repo: BackupV2Repo = {
		ensureStructure: async () => FILE_IDS,
		readJson: async (id: string) => deepClone(store.get(id) ?? null),
		writeJson: async (id: string, data: any) => {
			writeJsonCalls.push({ fileId: id, data });
			store.set(id, deepClone(data));
		},
		readHistoryJson: async (id: string) => {
			const h = store.get(id);
			if (!h) throw new Error('history not found');
			return deepClone(h) as SyncHistory;
		},
		writeHistoryJson: async (id: string, h: SyncHistory) => {
			store.set(id, deepClone(h));
		},
		uploadAsset: async () => ({ fileId: 'asset-' + Math.random(), size: 100 }),
		downloadAsset: async () => new Blob(['fake'])
	};

	const db: BackupV2Db = {
		getImage: async () => null,
		saveImage: async (_blob: Blob, idOverride?: string) => idOverride ?? 'saved-id'
	};

	return { repo, db, store, writeJsonCalls };
}

const DEVICE = { deviceId: 'd1', deviceName: 'מכשיר 1' };
const EMPTY_CACHE: BackupV2Cache = {};

// ─── backupWithHistory ───────────────────────────────────────

describe('driveBackupV2.backupWithHistory', () => {
	it('should create a snapshot entry on first backup (no history in repo)', async () => {
		const { repo, db } = createMockRepo();
		const state = createMinimalState();

		const result = await backupWithHistory({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		expect(result.writeId).toBe('w1');
		expect(result.history.entries).toHaveLength(1);
		expect(result.history.entries[0].type).toBe('snapshot');
		expect(result.history.entries[0].writeId).toBe('w1');
	});

	it('should create a delta entry on second backup when state changed', async () => {
		const { repo, db } = createMockRepo();
		const state1 = createMinimalState();

		await backupWithHistory({
			state: state1,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		const state2 = deepClone(state1);
		state2.lists.u1.list1.tasks.t1.name = 'משימה שונה';

		const result2 = await backupWithHistory({
			state: state2,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: 'w1',
			previousState: state1,
			cache: EMPTY_CACHE,
			now: 2000,
			generateWriteId: () => 'w2'
		});

		expect(result2.history.entries).toHaveLength(2);
		expect(result2.history.entries[1].type).toBe('delta');
		expect(result2.history.entries[1].writeId).toBe('w2');
	});

	it('should create a snapshot when forceSnapshot=true even after existing history', async () => {
		const { repo, db } = createMockRepo();
		const state1 = createMinimalState();

		await backupWithHistory({
			state: state1,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		const state2 = deepClone(state1);
		state2.lists.u1.list1.tasks.t1.name = 'שונה';

		const result2 = await backupWithHistory({
			state: state2,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: 'w1',
			previousState: state1,
			forceSnapshot: true,
			cache: EMPTY_CACHE,
			now: 2000,
			generateWriteId: () => 'w2'
		});

		expect(result2.history.entries[1].type).toBe('snapshot');
	});

	it('should throw "No changes to backup" when state is identical to previousState', async () => {
		const { repo, db } = createMockRepo();
		const state = createMinimalState();

		// First backup to create history
		await backupWithHistory({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		await expect(
			backupWithHistory({
				state: deepClone(state),
				repo,
				db,
				device: DEVICE,
				lastKnownWriteId: 'w1',
				previousState: deepClone(state),
				cache: EMPTY_CACHE,
				now: 2000,
				generateWriteId: () => 'w2'
			})
		).rejects.toThrow('No changes to backup');
	});

	it('should create a snapshot automatically after 20 deltas', async () => {
		const { repo, db } = createMockRepo();
		let state = createMinimalState();

		// First backup: snapshot (w0)
		await backupWithHistory({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 0,
			generateWriteId: () => 'w0'
		});

		// 21 delta backups — shouldCreateSnapshot triggers on the 21st call
		// (it sees 20 deltas already in history → returns true → creates snapshot)
		for (let i = 1; i <= 21; i++) {
			const prev = deepClone(state);
			state = deepClone(state);
			state.lists.u1.list1.tasks.t1.name = `שלב ${i}`;

			await backupWithHistory({
				state,
				repo,
				db,
				device: DEVICE,
				lastKnownWriteId: `w${i - 1}`,
				previousState: prev,
				cache: EMPTY_CACHE,
				now: i * 1000,
				generateWriteId: () => `w${i}`
			});
		}

		// 1 genesis snapshot + 20 deltas + 1 auto-snapshot = 22 entries
		// The last entry (index 21) must be a snapshot
		const historyInStore = await repo.readHistoryJson(FILE_IDS.historyFileId);
		expect(historyInStore.entries).toHaveLength(22);
		expect(historyInStore.entries[21].type).toBe('snapshot');
	}, 20000);

	it('should save history to repo after each backup', async () => {
		const { repo, db, store } = createMockRepo();
		const state = createMinimalState();

		await backupWithHistory({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		expect(store.has(FILE_IDS.historyFileId)).toBe(true);
	});

	it('should use the same writeId in both manifest and history entry', async () => {
		const { repo, db } = createMockRepo();
		const state = createMinimalState();

		const result = await backupWithHistory({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			previousState: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'consistent-id'
		});

		expect(result.writeId).toBe('consistent-id');
		expect(result.history.entries[0].writeId).toBe('consistent-id');
		expect(result.manifest.syncMetadata.writeId).toBe('consistent-id');
	});
});

// ─── backupToDriveV2 ────────────────────────────────────────

describe('driveBackupV2.backupToDriveV2', () => {
	it('should write content and progress on cache miss', async () => {
		const { repo, db, writeJsonCalls } = createMockRepo();
		const state = createMinimalState();

		await backupToDriveV2({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		const writtenFileIds = writeJsonCalls.map((c) => c.fileId);
		expect(writtenFileIds).toContain(FILE_IDS.contentFileId);
		expect(writtenFileIds).toContain(FILE_IDS.progressFileId);
	});

	it('should skip content and progress writes on cache hit', async () => {
		const { repo, db } = createMockRepo();
		const state = createMinimalState();

		// First backup to get the real hashes into the cache
		const first = await backupToDriveV2({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'w1'
		});

		// Second backup with the populated cache — reset call tracking
		const { repo: repo2, db: db2, writeJsonCalls: calls2 } = createMockRepo();
		// Pre-populate store with assets index so it doesn't trigger re-upload
		await backupToDriveV2({
			state: deepClone(state),
			repo: repo2,
			db: db2,
			device: DEVICE,
			lastKnownWriteId: 'w1',
			cache: {
				lastUploadedContentHash: first.hashes.contentHash,
				lastUploadedProgressHash: first.hashes.progressHash,
				lastUploadedAssetsHash: first.hashes.assetsHash
			},
			now: 2000,
			generateWriteId: () => 'w2'
		});

		const writtenFileIds = calls2.map((c) => c.fileId);
		expect(writtenFileIds).not.toContain(FILE_IDS.contentFileId);
		expect(writtenFileIds).not.toContain(FILE_IDS.progressFileId);
	});

	it('should always write the manifest with correct writeId and hashes', async () => {
		const { repo, db, store } = createMockRepo();
		const state = createMinimalState();

		const result = await backupToDriveV2({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'manifest-id'
		});

		const savedManifest = store.get(FILE_IDS.manifestFileId);
		expect(savedManifest).toBeDefined();
		expect(savedManifest.syncMetadata.writeId).toBe('manifest-id');
		expect(result.hashes.contentHash).toBeTruthy();
		expect(result.hashes.progressHash).toBeTruthy();
	});
});

// ─── restoreWithMerge ───────────────────────────────────────

describe('driveBackupV2.restoreWithMerge', () => {
	/** Helper: backup a state and return the manifestFileId for restoring */
	async function backupAndGetManifestId(
		state: AppState,
		repo: BackupV2Repo,
		db: BackupV2Db,
		writeId: string,
		previousState: AppState | null = null,
		lastKnownWriteId: string | null = null
	) {
		await backupWithHistory({
			state,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId,
			previousState,
			cache: EMPTY_CACHE,
			now: Date.now(),
			generateWriteId: () => writeId
		});
		return FILE_IDS.manifestFileId;
	}

	it('should return remote state when localState is null', async () => {
		const { repo, db } = createMockRepo();
		const remote = createMinimalState();
		const manifestFileId = await backupAndGetManifestId(remote, repo, db, 'remote-w1');

		const result = await restoreWithMerge({
			manifestFileId,
			repo,
			db,
			localState: null,
			localWriteId: null
		});

		expect(result.merged).toBe(false);
		expect(result.state.lists.u1.list1.tasks.t1.name).toBe('משימה 1');
	});

	it('should return local state unchanged when writeIds match', async () => {
		const { repo, db } = createMockRepo();
		const state = createMinimalState();
		const manifestFileId = await backupAndGetManifestId(state, repo, db, 'same-id');

		const localModified = deepClone(state);
		localModified.lists.u1.list1.tasks.t1.name = 'מקומי';

		const result = await restoreWithMerge({
			manifestFileId,
			repo,
			db,
			localState: localModified,
			localWriteId: 'same-id'
		});

		expect(result.merged).toBe(false);
		expect(result.state.lists.u1.list1.tasks.t1.name).toBe('מקומי');
	});

	it('should return remote when there is no history in repo', async () => {
		const { repo, db } = createMockRepo();
		const remote = createMinimalState();

		// Backup without history by bypassing backupWithHistory —
		// use backupToDriveV2 directly (no history file written)
		await backupToDriveV2({
			state: remote,
			repo,
			db,
			device: DEVICE,
			lastKnownWriteId: null,
			cache: EMPTY_CACHE,
			now: 1000,
			generateWriteId: () => 'remote-w1'
		});

		const localState = deepClone(remote);
		localState.lists.u1.list1.tasks.t1.name = 'מקומי';

		const result = await restoreWithMerge({
			manifestFileId: FILE_IDS.manifestFileId,
			repo,
			db,
			localState,
			localWriteId: 'local-w1-unknown'
		});

		expect(result.merged).toBe(false);
	});

	it('should return remote when local writeId is not in history (no common ancestor)', async () => {
		const { repo, db } = createMockRepo();
		const remote = createMinimalState();
		const manifestFileId = await backupAndGetManifestId(remote, repo, db, 'remote-w1');

		const localState = deepClone(remote);
		localState.lists.u1.list1.tasks.t1.name = 'מקומי';

		const result = await restoreWithMerge({
			manifestFileId,
			repo,
			db,
			localState,
			localWriteId: 'unknown-local-id'
		});

		expect(result.merged).toBe(false);
	});

	it('should merge successfully when local and remote changed different fields', async () => {
		const { repo, db } = createMockRepo();

		// Common ancestor
		const ancestor = createMinimalState({ lastModified: 500 });
		await backupAndGetManifestId(ancestor, repo, db, 'w-ancestor');

		// Remote: changed task t2 name
		const remoteState = deepClone(ancestor);
		remoteState.lists.u1.list1.tasks.t2.name = 'שם מרוחק';
		remoteState.lastModified = 1500;
		const manifestFileId = await backupAndGetManifestId(
			remoteState,
			repo,
			db,
			'w-remote',
			ancestor,
			'w-ancestor'
		);

		// Local: changed task t1 name
		const localState = deepClone(ancestor);
		localState.lists.u1.list1.tasks.t1.name = 'שם מקומי';
		localState.lastModified = 1200;

		const result = await restoreWithMerge({
			manifestFileId,
			repo,
			db,
			localState,
			localWriteId: 'w-ancestor'
		});

		expect(result.merged).toBe(true);
		expect(result.state.lists.u1.list1.tasks.t1.name).toBe('שם מקומי');
		expect(result.state.lists.u1.list1.tasks.t2.name).toBe('שם מרוחק');
	});

	it('should use last-write-wins when both changed the same field', async () => {
		const { repo, db } = createMockRepo();

		const ancestor = createMinimalState({ lastModified: 500 });
		await backupAndGetManifestId(ancestor, repo, db, 'w-ancestor');

		// Remote: changed t1, older timestamp
		const remoteState = deepClone(ancestor);
		remoteState.lists.u1.list1.tasks.t1.name = 'מרוחק';
		remoteState.lastModified = 800;
		const manifestFileId = await backupAndGetManifestId(
			remoteState,
			repo,
			db,
			'w-remote',
			ancestor,
			'w-ancestor'
		);

		// Local: changed t1, newer timestamp
		const localState = deepClone(ancestor);
		localState.lists.u1.list1.tasks.t1.name = 'מקומי';
		localState.lastModified = 1200;

		const result = await restoreWithMerge({
			manifestFileId,
			repo,
			db,
			localState,
			localWriteId: 'w-ancestor'
		});

		expect(result.merged).toBe(true);
		// Local is newer (1200 > 800) → local wins
		expect(result.state.lists.u1.list1.tasks.t1.name).toBe('מקומי');
	});
});
