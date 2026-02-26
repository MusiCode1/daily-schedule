import type {
	ContentV2,
	ProgressV2,
	AssetsIndexV2,
	ManifestV2,
	RemoteMetadata
} from './syncTypes';
import type { SyncHistory } from './engine/types';

export type { RemoteMetadata };

/**
 * ממשק גנרי לספק סנכרון.
 * מימושים: GoogleDriveSyncProvider, FileSyncProvider.
 *
 * העיקרון:
 * - ה-orchestrator מחליט מה לסנכרן ואיך (merge, delta, history)
 * - הספק מחליט פנימית כיצד לאחסן (Drive API, ZIP, שרת, וכו')
 * - האינקרמנטליות (hash cache) היא פרט מימוש פנימי של הספק
 */
export interface SyncProvider {
	/** מזהה ייחודי של הספק (לשמירת cache ב-deviceState) */
	readonly id: string;

	/**
	 * אתחול lazy — יצירת מבנה (תיקיות/קבצים) אם נדרש.
	 * Drive: ensureStructure(). File: no-op.
	 * ה-orchestrator קורא לזה בתחילת כל סנכרון.
	 */
	initialize(): Promise<void>;

	/**
	 * בדיקת זמינות — אסינכרוני כדי לאפשר token refresh.
	 * Drive: בודק accessToken. File: תמיד true.
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * קריאת metadata מרוחקת בלבד — זול! לא מוריד קבצים.
	 * Drive: קורא appProperties מה-manifest.
	 * File: מחזיר null (אין remote מתמשך).
	 * @returns null אם אין גיבוי מרוחק בכלל
	 */
	checkRemote(): Promise<RemoteMetadata | null>;

	// ─── Pull ────────────────────────────────────────────────────────────────

	pullContent(): Promise<ContentV2 | null>;
	pullProgress(): Promise<ProgressV2 | null>;
	pullHistory(): Promise<SyncHistory | null>;
	pullAssets(): Promise<AssetsIndexV2 | null>;

	/**
	 * הורדת asset יחיד לפי hash.
	 * Drive: מוריד מ-Drive. File: קורא מ-ZIP שנטען.
	 */
	downloadMissingAsset(hash: string): Promise<Blob>;

	// ─── Push ────────────────────────────────────────────────────────────────
	// הספק מחליט פנימית אם צריך network call (hash cache).
	// אם ה-hash זהה ל-cache פנימי → דלג.

	writeContent(payload: ContentV2, hash: string): Promise<void>;
	writeProgress(payload: ProgressV2, hash: string): Promise<void>;
	writeHistory(history: SyncHistory): Promise<void>;

	/**
	 * כתיבת assets index + העלאת blobs חדשים.
	 * @param index האינדקס המעודכן (כולל כל הקיימים + החדשים)
	 * @param newBlobs map של hash → Blob עבור assets חדשים בלבד
	 */
	writeAssets(index: AssetsIndexV2, newBlobs: Map<string, Blob>): Promise<void>;

	/**
	 * commit — תמיד אחרון! commit marker.
	 * Drive: כותב manifest.json + appProperties.
	 * File: בונה ZIP ומפעיל <a download>.
	 */
	commit(manifest: ManifestV2): Promise<void>;
}
