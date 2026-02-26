import type {
	SyncContent,
	SyncProgress,
	SyncAssetsIndex,
	SyncManifest,
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

	/**
	 * הורדת תוכן (content) מהשרת המרוחק.
	 * @returns תוכן מסונכרן, או null אם אין גיבוי מרוחק
	 */
	pullContent(): Promise<SyncContent | null>;

	/**
	 * הורדת מצב התקדמות (progress) מהשרת המרוחק.
	 * @returns מצב התקדמות משימות, או null אם אין גיבוי מרוחק
	 */
	pullProgress(): Promise<SyncProgress | null>;

	/**
	 * הורדת היסטוריית סנכרון מהשרת המרוחק.
	 * ההיסטוריה משמשת ל-3-way merge כ-common ancestor.
	 * @returns היסטוריית סנכרון, או null אם אין גיבוי מרוחק
	 */
	pullHistory(): Promise<SyncHistory | null>;

	/**
	 * הורדת אינדקס נכסים (assets index) מהשרת המרוחק.
	 * האינדקס מפרט את כל הנכסים הקיימים וה-hash שלהם.
	 * @returns אינדקס נכסים, או null אם אין גיבוי מרוחק
	 */
	pullAssets(): Promise<SyncAssetsIndex | null>;

	/**
	 * הורדת asset יחיד לפי hash.
	 * Drive: מוריד מ-Drive. File: קורא מ-ZIP שנטען.
	 */
	downloadMissingAsset(hash: string): Promise<Blob>;

	// ─── Push ────────────────────────────────────────────────────────────────
	// הספק מחליט פנימית אם צריך network call (hash cache).
	// אם ה-hash זהה ל-cache פנימי → דלג.

	/**
	 * כתיבת תוכן (content) לשרת המרוחק.
	 * הספק משתמש ב-hash cache פנימי — אם ה-hash זהה, הכתיבה נדלגת.
	 * @param payload - תוכן האפליקציה לכתיבה
	 * @param hash - hash של התוכן לצורך cache ומניעת כתיבות מיותרות
	 */
	writeContent(payload: SyncContent, hash: string): Promise<void>;

	/**
	 * כתיבת מצב התקדמות (progress) לשרת המרוחק.
	 * הספק משתמש ב-hash cache פנימי — אם ה-hash זהה, הכתיבה נדלגת.
	 * @param payload - מצב ההתקדמות לכתיבה
	 * @param hash - hash של ההתקדמות לצורך cache ומניעת כתיבות מיותרות
	 */
	writeProgress(payload: SyncProgress, hash: string): Promise<void>;

	/**
	 * כתיבת היסטוריית סנכרון לשרת המרוחק.
	 * ההיסטוריה נשמרת כ-snapshot של המצב האחרון המוסכם,
	 * ומשמשת כ-common ancestor ב-3-way merge בסנכרון הבא.
	 * @param history - היסטוריית הסנכרון לכתיבה
	 */
	writeHistory(history: SyncHistory): Promise<void>;

	/**
	 * כתיבת assets index + העלאת blobs חדשים.
	 * @param index האינדקס המעודכן (כולל כל הקיימים + החדשים)
	 * @param newBlobs map של hash → Blob עבור assets חדשים בלבד
	 */
	writeAssets(index: SyncAssetsIndex, newBlobs: Map<string, Blob>): Promise<void>;

	/**
	 * commit — תמיד אחרון! commit marker.
	 * Drive: כותב manifest.json + appProperties.
	 * File: בונה ZIP ומפעיל <a download>.
	 */
	commit(manifest: SyncManifest): Promise<void>;

	// ─── Lock (אופציונלי) ─────────────────────────────────────────────────

	/**
	 * נעילת הענן לכתיבה — מכשיר אחד בלבד יכול לכתוב בו-זמנית.
	 * @param device - מזהה ושם המכשיר הנועל
	 * @returns acquired=true אם הנעילה הצליחה, nonce לזיהוי הנעילה; holder=שם המכשיר שמחזיק אם נכשל
	 */
	acquireLock?(device: { deviceId: string; deviceName: string }): Promise<{
		acquired: boolean;
		nonce?: string;
		holder?: string;
	}>;

	/**
	 * אימות שהנעילה שרכשנו עדיין בתוקף (write-then-verify).
	 * @param nonce - ה-nonce שחזר מ-acquireLock
	 * @returns true אם הנעילה עדיין שלנו
	 */
	verifyLock?(nonce: string): Promise<boolean>;

	/**
	 * שחרור הנעילה — נקרא ב-finally לאחר push (גם אם נכשל).
	 * כישלון בשחרור לא גורם ל-throw — רק warning.
	 */
	releaseLock?(): Promise<void>;
}
