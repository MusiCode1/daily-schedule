/**
 * ספק סנכרון המדבר עם שרת Mock מקומי (e2e/mock-server/server.ts).
 *
 * פעיל רק כאשר VITE_USE_MOCK_SYNC=true.
 * מחליף את googleDriveSyncProvider בבדיקות Playwright E2E.
 */

import type { SyncProvider } from '../../syncProvider';
import type {
	SyncContent,
	SyncProgress,
	SyncAssetsIndex,
	SyncManifest,
	RemoteMetadata,
	Sha256
} from '../../syncTypes';
import type { SyncHistory } from '../../engine/types';

const BASE_URL = import.meta.env.VITE_MOCK_SYNC_URL || 'http://localhost:3001';

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

/** שליחת POST עם גוף JSON וקבלת תשובה מפורשת מהשרת */
async function postJsonWithResponse<T>(path: string, data: unknown): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	if (!res.ok) throw new Error(`MockServer POST ${path} → ${res.status}`);
	return res.json() as Promise<T>;
}

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * ספק סנכרון המדבר עם שרת Mock מקומי.
 * מממש את {@link SyncProvider} באמצעות קריאות HTTP פשוטות (GET/POST).
 * שימושי לבדיקות E2E ולפיתוח מקומי ללא תלות ב-Google Drive.
 */
class MockServerSyncProvider implements SyncProvider {
	readonly id = 'mock-server';

	/** אתחול — ללא פעולה, השרת תמיד זמין */
	async initialize(): Promise<void> {
		// ללא אתחול — השרת תמיד זמין
	}

	/** תמיד מחזיר true — השרת המקומי נחשב זמין */
	async isAvailable(): Promise<boolean> {
		return true;
	}

	/**
	 * בודק את מצב ה-remote — קורא את ה-manifest מהשרת.
	 * @returns מטא-דאטה מרוחקת, או null אם אין manifest
	 */
	async checkRemote(): Promise<RemoteMetadata | null> {
		const manifest = await getJson<SyncManifest>('/manifest');
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

	async pullContent(): Promise<SyncContent | null> {
		return getJson<SyncContent>('/content');
	}

	async pullProgress(): Promise<SyncProgress | null> {
		return getJson<SyncProgress>('/progress');
	}

	async pullHistory(): Promise<SyncHistory | null> {
		return getJson<SyncHistory>('/history');
	}

	async pullAssets(): Promise<SyncAssetsIndex | null> {
		return getJson<SyncAssetsIndex>('/assets');
	}

	/**
	 * מוריד נכס חסר מהשרת לפי hash.
	 * @param hash - hash SHA-256 של הנכס
	 * @returns Blob עם תוכן הנכס
	 * @throws {Error} אם הנכס לא נמצא בשרת
	 */
	async downloadMissingAsset(hash: string): Promise<Blob> {
		const res = await fetch(`${BASE_URL}/blobs/${encodeURIComponent(hash)}`);
		if (!res.ok) throw new Error(`MockServer: asset not found: ${hash}`);
		return res.blob();
	}

	// ─── Push ────────────────────────────────────────────────────────────────

	async writeContent(payload: SyncContent, _hash: string): Promise<void> {
		await postJson('/content', payload);
	}

	async writeProgress(payload: SyncProgress, _hash: string): Promise<void> {
		await postJson('/progress', payload);
	}

	async writeHistory(history: SyncHistory): Promise<void> {
		await postJson('/history', history);
	}

	/**
	 * מעלה נכסים חדשים לשרת ושולח את אינדקס הנכסים המעודכן.
	 * @param index - אינדקס הנכסים
	 * @param newBlobs - מפה של hash → Blob להעלאה
	 */
	async writeAssets(index: SyncAssetsIndex, newBlobs: Map<string, Blob>): Promise<void> {
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

	/**
	 * מבצע commit — שולח את ה-manifest לשרת.
	 * @param manifest - אובייקט ה-manifest לשמירה
	 */
	async commit(manifest: SyncManifest): Promise<void> {
		await postJson('/manifest', manifest);
	}

	// ─── Lock ────────────────────────────────────────────────────────────────

	/**
	 * רוכש נעילה על ה-remote עבור המכשיר הנוכחי.
	 * מייצר nonce ייחודי ושולח בקשה לשרת.
	 * @param device - מזהה ושם המכשיר המבקש
	 * @returns acquired=true עם nonce אם הנעילה נרכשה, אחרת acquired=false עם שם המחזיק
	 */
	async acquireLock(device: { deviceId: string; deviceName: string }): Promise<{
		acquired: boolean;
		nonce?: string;
		holder?: string;
	}> {
		const nonce = crypto.randomUUID();
		return postJsonWithResponse('/lock', {
			deviceId: device.deviceId,
			deviceName: device.deviceName,
			nonce
		});
	}

	/**
	 * מאמת שהנעילה עדיין תקפה לפי ה-nonce שנשמר.
	 * @param nonce - ה-nonce שהתקבל בעת רכישת הנעילה
	 * @returns true אם הנעילה עדיין תקפה
	 */
	async verifyLock(nonce: string): Promise<boolean> {
		const res = await postJsonWithResponse<{ valid: boolean }>('/lock/verify', { nonce });
		return res.valid;
	}

	/**
	 * משחרר את הנעילה הנוכחית מה-remote.
	 */
	async releaseLock(): Promise<void> {
		await postJson('/lock/release', {});
	}
}

/** singleton של ספק הסנכרון לשרת Mock */
export const mockServerSyncProvider = new MockServerSyncProvider();
