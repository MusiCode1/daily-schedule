import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '$lib/data/defaults';
import {
	backupToDriveV2,
	restoreFromDriveV2,
	type BackupV2Db,
	type BackupV2Repo
} from '$lib/services/drive/driveBackupV2';
import type { Sha256 } from '$lib/services/drive/types';

function deepClone<T>(v: T): T {
	return JSON.parse(JSON.stringify(v)) as T;
}

function makeInMemoryRepo(): BackupV2Repo & {
	writes: Array<{ fileId: string; data: any; appProperties?: Record<string, string> }>;
	assetUploads: Array<{ hash: Sha256; fileId: string; size: number }>;
	assetDownloads: Array<{ fileId: string }>;
	readJsonCalls: Array<{ fileId: string }>;
	store: Map<string, any>;
	assetStore: Map<string, Blob>;
} {
	const store = new Map<string, any>();
	const assetStore = new Map<string, Blob>();

	const writes: Array<{ fileId: string; data: any; appProperties?: Record<string, string> }> = [];
	const assetUploads: Array<{ hash: Sha256; fileId: string; size: number }> = [];
	const assetDownloads: Array<{ fileId: string }> = [];
	const readJsonCalls: Array<{ fileId: string }> = [];

	const ids = {
		backupFolderId: 'folder:backup',
		assetsFolderId: 'folder:assets',
		manifestFileId: 'file:manifest',
		contentFileId: 'file:content',
		progressFileId: 'file:progress',
		assetsIndexFileId: 'file:assetsIndex',
		historyFileId: 'file:history'
	};

	return {
		store,
		assetStore,
		writes,
		assetUploads,
		assetDownloads,
		readJsonCalls,

		async ensureStructure() {
			return ids;
		},

		async readJson(fileId: string) {
			readJsonCalls.push({ fileId });
			if (!store.has(fileId)) {
				throw new Error(`Missing json file ${fileId}`);
			}
			return deepClone(store.get(fileId));
		},

		async writeJson(
			fileId: string,
			data: any,
			options?: { appProperties?: Record<string, string>; onProgress?: (p: number) => void }
		) {
			// לא מדמים progress אמיתי כאן; מספיק לנו סדר כתיבות ואינפורמציה.
			options?.onProgress?.(1);
			store.set(fileId, deepClone(data));
			writes.push({ fileId, data: deepClone(data), appProperties: options?.appProperties });
		},

		async uploadAsset(params: { hash: Sha256; blob: Blob; mimeType: string; assetsFolderId: string }) {
			// משחזרים fileId יציב כדי לאפשר "הורדה" מאוחר יותר.
			const fileId = `asset:${params.hash}`;
			assetStore.set(fileId, params.blob);
			assetUploads.push({ hash: params.hash, fileId, size: params.blob.size });
			return { fileId, size: params.blob.size };
		},

		async downloadAsset(fileId: string) {
			assetDownloads.push({ fileId });
			const blob = assetStore.get(fileId);
			if (!blob) throw new Error(`Missing asset file ${fileId}`);
			return blob;
		},

		async readHistoryJson() {
			const historyFileId = ids.historyFileId;
			if (!store.has(historyFileId)) {
				return null;
			}
			return deepClone(store.get(historyFileId));
		},

		async writeHistoryJson(data: any) {
			const historyFileId = ids.historyFileId;
			store.set(historyFileId, deepClone(data));
		}
	};
}

function makeInMemoryDb(initial?: Record<string, Blob | null>): BackupV2Db & {
	images: Map<string, Blob>;
	saves: Array<{ id: string; size: number }>;
	gets: Array<{ id: string }>;
} {
	const images = new Map<string, Blob>();
	const saves: Array<{ id: string; size: number }> = [];
	const gets: Array<{ id: string }> = [];

	if (initial) {
		for (const [k, v] of Object.entries(initial)) {
			if (v) images.set(k, v);
		}
	}

	return {
		images,
		saves,
		gets,
		async getImage(id: string) {
			gets.push({ id });
			return images.get(id) ?? null;
		},
		async saveImage(blob: Blob, idOverride?: string) {
			const id = idOverride ?? `idb:generated-${Math.random()}`;
			images.set(id, blob);
			saves.push({ id, size: blob.size });
			return id;
		}
	};
}

describe('Drive Backup V2 integration (in-memory)', () => {
	it('should write manifest last and set appProperties on manifest', async () => {
		const repo = makeInMemoryRepo();
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
		const db = makeInMemoryDb({
			'idb:img-1': blob
		});

		const state = deepClone(INITIAL_STATE);
		state.users[0].avatar = 'idb:img-1';
		state.images['idb:img-1'] = { crop: { x: 1, y: 2, scale: 1.1 } };

		const res = await backupToDriveV2({
			state,
			repo,
			db,
			device: { deviceId: 'dev-1', deviceName: 'Test Device' },
			lastKnownWriteId: null,
			cache: {},
			now: 1700000000000,
			generateWriteId: () => 'write-1'
		});

		expect(res.writeId).toBe('write-1');
		expect(repo.writes.length).toBeGreaterThan(0);
		expect(repo.writes[repo.writes.length - 1].fileId).toBe('file:manifest');

		const manifestWrites = repo.writes.filter((w) => w.fileId === 'file:manifest');
		const manifestWrite = manifestWrites[manifestWrites.length - 1];
		expect(manifestWrite?.appProperties?.writeId).toBe('write-1');
		expect(manifestWrite?.appProperties?.backupSchemaVersion).toBe('2');
		expect(manifestWrite?.appProperties?.contentHash?.startsWith('sha256:')).toBe(true);
		expect(manifestWrite?.appProperties?.progressHash?.startsWith('sha256:')).toBe(true);
		expect(manifestWrite?.appProperties?.assetsHash?.startsWith('sha256:')).toBe(true);

		// sanity: העלינו נכס אחד
		expect(repo.assetUploads.length).toBe(1);
	});

	it('progress-only change should upload only progress + manifest (no content/assetsIndex/assets)', async () => {
		const repo = makeInMemoryRepo();
		const db = makeInMemoryDb();
		const state = deepClone(INITIAL_STATE);

		// backup ראשון (מקים את הקבצים + cache hashes)
		const first = await backupToDriveV2({
			state,
			repo,
			db,
			device: { deviceId: 'dev-1', deviceName: 'Test Device' },
			lastKnownWriteId: null,
			cache: {},
			now: 1700000000000,
			generateWriteId: () => 'write-1'
		});

		// backup שני: רק isDone משתנה
		repo.writes.length = 0;
		repo.assetUploads.length = 0;

		const state2 = deepClone(state);
		const t0 = state2.lists[state2.users[0].id][0].tasks[0];
		t0.isDone = !t0.isDone;

		await backupToDriveV2({
			state: state2,
			repo,
			db,
			device: { deviceId: 'dev-1', deviceName: 'Test Device' },
			lastKnownWriteId: first.writeId,
			cache: first.cache,
			now: 1700000001234,
			generateWriteId: () => 'write-2'
		});

		const writtenIds = repo.writes.map((w) => w.fileId);
		expect(writtenIds).toEqual(['file:progress', 'file:manifest']);
		expect(repo.assetUploads.length).toBe(0);
	});

	it('should dedupe assets by sha256 (two idb ids with same blob -> single upload)', async () => {
		const repo = makeInMemoryRepo();
		const blob = new Blob([new Uint8Array([9, 9, 9])], { type: 'image/jpeg' });
		const db = makeInMemoryDb({
			'idb:img-a': blob,
			'idb:img-b': blob
		});

		const state = deepClone(INITIAL_STATE);
		state.users[0].avatar = 'idb:img-a';
		state.people[0].avatar = 'idb:img-b';
		state.images['idb:img-a'] = { crop: { x: 1, y: 2, scale: 1.1 } };
		state.images['idb:img-b'] = { crop: { x: 3, y: 4, scale: 1.2 } };

		await backupToDriveV2({
			state,
			repo,
			db,
			device: { deviceId: 'dev-1', deviceName: 'Test Device' },
			lastKnownWriteId: null,
			cache: {},
			now: 1700000000000,
			generateWriteId: () => 'write-1'
		});

		expect(repo.assetUploads.length).toBe(1);

		const assetsIndex = repo.store.get('file:assetsIndex');
		expect(assetsIndex).toBeTruthy();
		expect(assetsIndex.idToHash['idb:img-a']).toBeTruthy();
		expect(assetsIndex.idToHash['idb:img-b']).toBeTruthy();
		expect(assetsIndex.idToHash['idb:img-a']).toBe(assetsIndex.idToHash['idb:img-b']);

		const hash = assetsIndex.idToHash['idb:img-a'] as Sha256;
		expect(assetsIndex.hashToFile[hash]).toBeTruthy();
	});

	it('restore should download only missing assets and preserve idb keys', async () => {
		const repo = makeInMemoryRepo();
		const blobA = new Blob([new Uint8Array([1, 1, 1])], { type: 'image/png' });
		const blobB = new Blob([new Uint8Array([2, 2, 2])], { type: 'image/png' });
		const db = makeInMemoryDb({
			'idb:img-a': blobA,
			'idb:img-b': blobB
		});

		const state = deepClone(INITIAL_STATE);
		state.users[0].avatar = 'idb:img-a';
		state.people[0].avatar = 'idb:img-b';
		state.images['idb:img-a'] = { crop: { x: 1, y: 2, scale: 1.1 } };
		state.images['idb:img-b'] = { crop: { x: 3, y: 4, scale: 1.2 } };
		state.lists[state.users[0].id][0].tasks[0].isDone = true;

		await backupToDriveV2({
			state,
			repo,
			db,
			device: { deviceId: 'dev-1', deviceName: 'Test Device' },
			lastKnownWriteId: null,
			cache: {},
			now: 1700000000000,
			generateWriteId: () => 'write-1'
		});

		// db חדש: נכס אחד קיים, השני חסר
		const db2 = makeInMemoryDb({
			'idb:img-a': blobA,
			'idb:img-b': null
		});

		const restored = await restoreFromDriveV2({
			manifestFileId: 'file:manifest',
			repo,
			db: db2,
			now: 1700000009999
		});

		// צריך להוריד רק אחד
		expect(repo.assetDownloads.length).toBe(1);
		expect(db2.images.has('idb:img-b')).toBe(true);
		expect(db2.saves.some((s) => s.id === 'idb:img-b')).toBe(true);

		// progress applied
		const task0 = restored.state.lists[restored.state.users[0].id][0].tasks[0];
		expect(task0.isDone).toBe(true);
	});
});
