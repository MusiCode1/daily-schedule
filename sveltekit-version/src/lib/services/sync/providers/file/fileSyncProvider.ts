import type {
	SyncContent,
	SyncProgress,
	SyncAssetsIndex,
	SyncManifest,
	RemoteMetadata
} from '$lib/services/sync/syncTypes';
import type { SyncHistory } from '$lib/services/sync/engine/types';
import type { SyncProvider } from '$lib/services/sync/syncProvider';

const TAG = '[FileSyncProvider]';

/**
 * ספק סנכרון מבוסס קובץ ZIP.
 *
 * - checkRemote() → תמיד null (אין remote מתמשך)
 * - commit() → בונה ZIP ומפעיל <a download>
 * - pull*() → קורא מ-ZIP שנטען דרך loadZip()
 *
 * שימוש ב-UI:
 *   - ייצוא: await fileSyncProvider.exportZip(state)
 *   - ייבוא: await fileSyncProvider.loadZip(file) → pull via orchestrator
 */
class FileSyncProvider implements SyncProvider {
	readonly id = 'file';

	/** state ה-ZIP שנטען — עבור pull operations */
	private loadedZip: {
		content: SyncContent | null;
		progress: SyncProgress | null;
		history: SyncHistory | null;
		assets: SyncAssetsIndex | null;
		blobs: Map<string, Blob>;
	} | null = null;

	/** אתחול — ללא פעולה */
	async initialize(): Promise<void> {
		// no-op
	}

	/** תמיד מחזיר true — ייצוא/ייבוא קובץ תמיד זמין */
	async isAvailable(): Promise<boolean> {
		return true;
	}

	/** תמיד null — אין remote מתמשך בספק קובץ */
	async checkRemote(): Promise<RemoteMetadata | null> {
		return null;
	}

	// ─── Pull (מ-ZIP שנטען) ─────────────────────────────────────────────────

	/** מחזיר את התוכן מה-ZIP שנטען */
	async pullContent(): Promise<SyncContent | null> {
		return this.loadedZip?.content ?? null;
	}

	/** מחזיר את ההתקדמות מה-ZIP שנטען */
	async pullProgress(): Promise<SyncProgress | null> {
		return this.loadedZip?.progress ?? null;
	}

	/** מחזיר את ההיסטוריה מה-ZIP שנטען */
	async pullHistory(): Promise<SyncHistory | null> {
		return this.loadedZip?.history ?? null;
	}

	/** מחזיר את אינדקס הנכסים מה-ZIP שנטען */
	async pullAssets(): Promise<SyncAssetsIndex | null> {
		return this.loadedZip?.assets ?? null;
	}

	/**
	 * מחזיר נכס מה-ZIP שנטען לפי hash.
	 * @param hash - hash SHA-256 של הנכס
	 * @returns Blob עם תוכן הנכס
	 * @throws {Error} אם הנכס לא נמצא ב-ZIP שנטען
	 */
	async downloadMissingAsset(hash: string): Promise<Blob> {
		const blob = this.loadedZip?.blobs.get(hash);
		if (!blob) throw new Error(`Asset not found in loaded ZIP: ${hash}`);
		return blob;
	}

	// ─── Push (אוסף לזיכרון, commit בונה ZIP) ─────────────────────────────

	private pendingContent: SyncContent | null = null;
	private pendingProgress: SyncProgress | null = null;
	private pendingHistory: SyncHistory | null = null;
	private pendingAssets: SyncAssetsIndex | null = null;
	private pendingBlobs = new Map<string, Blob>();

	/** אוגר תוכן לכתיבה ב-commit (בניית ZIP) */
	async writeContent(payload: SyncContent, _hash: string): Promise<void> {
		this.pendingContent = payload;
	}

	/** אוגר התקדמות לכתיבה ב-commit (בניית ZIP) */
	async writeProgress(payload: SyncProgress, _hash: string): Promise<void> {
		this.pendingProgress = payload;
	}

	/** אוגר היסטוריה לכתיבה ב-commit (בניית ZIP) */
	async writeHistory(history: SyncHistory): Promise<void> {
		this.pendingHistory = history;
	}

	/**
	 * אוגר נכסים חדשים לכתיבה ב-commit (בניית ZIP).
	 * @param index - אינדקס הנכסים
	 * @param newBlobs - מפה של hash → Blob להכללה ב-ZIP
	 */
	async writeAssets(index: SyncAssetsIndex, newBlobs: Map<string, Blob>): Promise<void> {
		this.pendingAssets = index;
		for (const [hash, blob] of newBlobs) {
			this.pendingBlobs.set(hash, blob);
			// עדכון hashToFile כדי שה-assets.json ב-ZIP יהיה שלם לייבוא
			if (!index.hashToFile[hash as `sha256:${string}`]) {
				index.hashToFile[hash as `sha256:${string}`] = {
					fileId: hash,
					mimeType: blob.type || 'application/octet-stream',
					size: blob.size
				};
			}
		}
	}

	/**
	 * commit — בונה ZIP ומפעיל הורדה דרך הדפדפן.
	 * ZIP מכיל:
	 *   - manifest.json
	 *   - content.json
	 *   - progress.json
	 *   - history.json (אופציונלי)
	 *   - assets.json
	 *   - assets/<hash> (blobs)
	 */
	async commit(manifest: SyncManifest): Promise<void> {
		console.log(TAG, 'commit: building ZIP...');

		const { default: JSZip } = await import('jszip');
		const zip = new JSZip();

		zip.file('manifest.json', JSON.stringify(manifest, null, 2));
		if (this.pendingContent) {
			zip.file('content.json', JSON.stringify(this.pendingContent, null, 2));
		}
		if (this.pendingProgress) {
			zip.file('progress.json', JSON.stringify(this.pendingProgress, null, 2));
		}
		if (this.pendingHistory) {
			zip.file('history.json', JSON.stringify(this.pendingHistory, null, 2));
		}
		if (this.pendingAssets) {
			zip.file('assets.json', JSON.stringify(this.pendingAssets, null, 2));
		}

		const assetsFolder = zip.folder('assets');
		if (assetsFolder) {
			for (const [hash, blob] of this.pendingBlobs) {
				const fileName = `sha256_${hash.slice('sha256:'.length)}`;
				assetsFolder.file(fileName, blob);
			}
		}

		const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
		const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		const fileName = `daily-schedule-backup-${ts}.zip`;

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		// ניקוי
		this.pendingContent = null;
		this.pendingProgress = null;
		this.pendingHistory = null;
		this.pendingAssets = null;
		this.pendingBlobs.clear();

		console.log(TAG, 'commit: ZIP downloaded', fileName);
	}

	// ─── ייבוא ─────────────────────────────────────────────────────────────

	/**
	 * טעינת ZIP לייבוא.
	 * לאחר קריאה זו, ניתן לקרוא ל-pull*() דרך ה-orchestrator.
	 */
	async loadZip(file: File): Promise<void> {
		console.log(TAG, 'loadZip:', file.name);
		const { default: JSZip } = await import('jszip');
		const zip = await JSZip.loadAsync(file);

		const readJson = async <T>(name: string): Promise<T | null> => {
			const f = zip.file(name);
			if (!f) return null;
			try {
				return JSON.parse(await f.async('text')) as T;
			} catch {
				console.warn(TAG, `failed to parse ${name}`);
				return null;
			}
		};

		const content = await readJson<SyncContent>('content.json');
		const progress = await readJson<SyncProgress>('progress.json');
		const history = await readJson<SyncHistory>('history.json');
		const assets = await readJson<SyncAssetsIndex>('assets.json');

		// טעינת blobs מתיקיית assets/
		const blobs = new Map<string, Blob>();
		const assetsFolder = zip.folder('assets');
		if (assetsFolder) {
			const assetFiles = Object.keys(zip.files).filter(
				(name) => name.startsWith('assets/') && !name.endsWith('/')
			);
			for (const assetPath of assetFiles) {
				const f = zip.file(assetPath);
				if (!f) continue;
				const blobData = await f.async('blob');
				// sha256_<hex> → sha256:<hex>
				const fileName = assetPath.replace('assets/', '');
				const hash = `sha256:${fileName.replace('sha256_', '')}`;
				blobs.set(hash, blobData);
			}
		}

		this.loadedZip = { content, progress, history, assets, blobs };
		console.log(TAG, 'loadZip done', {
			hasContent: !!content,
			hasProgress: !!progress,
			hasHistory: !!history,
			assetsBlobs: blobs.size
		});
	}

	/** ניקוי ZIP שנטען */
	clearLoadedZip(): void {
		this.loadedZip = null;
	}
}

/** singleton של ספק הסנכרון מבוסס קובץ ZIP */
export const fileSyncProvider = new FileSyncProvider();
