/**
 * ספק סנכרון המדבר עם שרת Mock מקומי (e2e/mock-server/server.ts).
 *
 * פעיל רק כאשר VITE_USE_MOCK_SYNC=true.
 * מחליף את googleDriveSyncProvider בבדיקות Playwright E2E.
 */

import type { SyncProvider } from '../../syncProvider';
import type {
	ContentV2,
	ProgressV2,
	AssetsIndexV2,
	ManifestV2,
	RemoteMetadata,
	Sha256
} from '../../syncTypes';
import type { SyncHistory } from '../../engine/types';

const BASE_URL = 'http://localhost:3001';

// ─── עזרים ───────────────────────────────────────────────────────────────────

async function getJson<T>(path: string): Promise<T | null> {
	const res = await fetch(`${BASE_URL}${path}`);
	if (res.status === 204) return null;
	if (!res.ok) throw new Error(`MockServer GET ${path} → ${res.status}`);
	return res.json() as Promise<T>;
}

async function postJson(path: string, data: unknown): Promise<void> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!res.ok) throw new Error(`MockServer POST ${path} → ${res.status}`);
}

// ─── Provider ────────────────────────────────────────────────────────────────

class MockServerSyncProvider implements SyncProvider {
	readonly id = 'mock-server';

	async initialize(): Promise<void> {
		// ללא אתחול — השרת תמיד זמין
	}

	async isAvailable(): Promise<boolean> {
		return true;
	}

	async checkRemote(): Promise<RemoteMetadata | null> {
		const manifest = await getJson<ManifestV2>('/manifest');
		if (!manifest) return null;
		return {
			writeId: manifest.syncMetadata.writeId,
			parentWriteId: manifest.syncMetadata.parentWriteId ?? null,
			contentHash: manifest.hashes.contentHash,
			progressHash: manifest.hashes.progressHash,
			assetsHash: manifest.hashes.assetsHash,
			timestamp: manifest.generatedAt,
			deviceId: manifest.syncMetadata.lastModifiedByDeviceId
		};
	}

	// ─── Pull ────────────────────────────────────────────────────────────────

	async pullContent(): Promise<ContentV2 | null> {
		return getJson<ContentV2>('/content');
	}

	async pullProgress(): Promise<ProgressV2 | null> {
		return getJson<ProgressV2>('/progress');
	}

	async pullHistory(): Promise<SyncHistory | null> {
		return getJson<SyncHistory>('/history');
	}

	async pullAssets(): Promise<AssetsIndexV2 | null> {
		return getJson<AssetsIndexV2>('/assets');
	}

	async downloadMissingAsset(hash: string): Promise<Blob> {
		const res = await fetch(`${BASE_URL}/blobs/${encodeURIComponent(hash)}`);
		if (!res.ok) throw new Error(`MockServer: asset not found: ${hash}`);
		return res.blob();
	}

	// ─── Push ────────────────────────────────────────────────────────────────

	async writeContent(payload: ContentV2, _hash: string): Promise<void> {
		await postJson('/content', payload);
	}

	async writeProgress(payload: ProgressV2, _hash: string): Promise<void> {
		await postJson('/progress', payload);
	}

	async writeHistory(history: SyncHistory): Promise<void> {
		await postJson('/history', history);
	}

	async writeAssets(index: AssetsIndexV2, newBlobs: Map<string, Blob>): Promise<void> {
		// העלאת blobs חדשים + רישום fileId פיקטיבי ב-index
		for (const [hash, blob] of newBlobs) {
			const buf = await blob.arrayBuffer();
			const res = await fetch(`${BASE_URL}/blobs/${encodeURIComponent(hash)}`, {
				method: 'POST',
				headers: { 'Content-Type': blob.type || 'application/octet-stream' },
				body: buf
			});
			if (!res.ok) throw new Error(`MockServer: failed to upload blob ${hash}`);

			index.hashToFile[hash as Sha256] = {
				fileId: `mock-${hash.slice(0, 16)}`,
				mimeType: blob.type || 'application/octet-stream',
				size: blob.size
			};
		}

		await postJson('/assets', index);
	}

	async commit(manifest: ManifestV2): Promise<void> {
		await postJson('/manifest', manifest);
	}
}

export const mockServerSyncProvider = new MockServerSyncProvider();
