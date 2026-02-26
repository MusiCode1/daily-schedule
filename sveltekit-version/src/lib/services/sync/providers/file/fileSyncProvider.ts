import type {
	ContentV2,
	ProgressV2,
	AssetsIndexV2,
	ManifestV2,
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
		content: ContentV2 | null;
		progress: ProgressV2 | null;
		history: SyncHistory | null;
		assets: AssetsIndexV2 | null;
		blobs: Map<string, Blob>;
	} | null = null;

	async initialize(): Promise<void> {
		// no-op
	}

	async isAvailable(): Promise<boolean> {
		return true;
	}

	async checkRemote(): Promise<RemoteMetadata | null> {
		return null;
	}

	// ─── Pull (מ-ZIP שנטען) ─────────────────────────────────────────────────

	async pullContent(): Promise<ContentV2 | null> {
		return this.loadedZip?.content ?? null;
	}

	async pullProgress(): Promise<ProgressV2 | null> {
		return this.loadedZip?.progress ?? null;
	}

	async pullHistory(): Promise<SyncHistory | null> {
		return this.loadedZip?.history ?? null;
	}

	async pullAssets(): Promise<AssetsIndexV2 | null> {
		return this.loadedZip?.assets ?? null;
	}

	async downloadMissingAsset(hash: string): Promise<Blob> {
		const blob = this.loadedZip?.blobs.get(hash);
		if (!blob) throw new Error(`Asset not found in loaded ZIP: ${hash}`);
		return blob;
	}

	// ─── Push (אוסף לזיכרון, commit בונה ZIP) ─────────────────────────────

	private pendingContent: ContentV2 | null = null;
	private pendingProgress: ProgressV2 | null = null;
	private pendingHistory: SyncHistory | null = null;
	private pendingAssets: AssetsIndexV2 | null = null;
	private pendingBlobs = new Map<string, Blob>();

	async writeContent(payload: ContentV2, _hash: string): Promise<void> {
		this.pendingContent = payload;
	}

	async writeProgress(payload: ProgressV2, _hash: string): Promise<void> {
		this.pendingProgress = payload;
	}

	async writeHistory(history: SyncHistory): Promise<void> {
		this.pendingHistory = history;
	}

	async writeAssets(index: AssetsIndexV2, newBlobs: Map<string, Blob>): Promise<void> {
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
	async commit(manifest: ManifestV2): Promise<void> {
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

		const content = await readJson<ContentV2>('content.json');
		const progress = await readJson<ProgressV2>('progress.json');
		const history = await readJson<SyncHistory>('history.json');
		const assets = await readJson<AssetsIndexV2>('assets.json');

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

export const fileSyncProvider = new FileSyncProvider();
