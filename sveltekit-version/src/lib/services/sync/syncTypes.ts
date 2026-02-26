/**
 * טיפוסים משותפים לכל ספקי הסנכרון (payload types).
 * הקוד הגנרי ב-syncOrchestrator ובספקים משתמש בהם.
 */

/**
 * מזהה hash מסוג SHA-256 עם prefix קבוע.
 * משמש לזיהוי ייחודי של תוכן (content addressing) במערכת הסנכרון.
 */
export type Sha256 = `sha256:${string}`;

/**
 * מניפסט סנכרון — מתאר את מצב הגיבוי המרוחק.
 * מכיל metadata על הכתיבה האחרונה, hash-ים לזיהוי שינויים,
 * ומפת קבצים (שמות ומזהים) עבור כל רכיב בגיבוי.
 * נכתב אחרון בתהליך ה-commit כ-marker שהכתיבה הושלמה.
 */
export type SyncManifest = {
	backupSchemaVersion: number;
	generatedAt: number;
	syncMetadata: {
		writeId: string;
		parentWriteId?: string;
		lastModified: number;
		lastModifiedByDeviceId: string;
		lastModifiedByDeviceName: string;
	};
	hashes: {
		contentHash: Sha256;
		progressHash: Sha256;
		assetsHash: Sha256;
	};
	files: {
		content: { name: string; fileId: string };
		progress: { name: string; fileId: string };
		assetsIndex: { name: string; fileId: string };
		assetsFolder: { name: string; folderId: string };
	};
};

/**
 * תוכן האפליקציה המסונכרן — מכיל את כל הנתונים העסקיים.
 * כולל משתמשים, אנשים, רשימות משימות, תמונות והגדרות.
 * זהו ה-payload המרכזי שעובר סנכרון בין מכשירים.
 */
export type SyncContent = {
	backupSchemaVersion: number;
	appStateVersion: number;
	users: any[];
	people: any[];
	lists: Record<string, Record<string, any>>;
	images: Record<string, any>;
	settings: {
		activeListId: Record<string, string>;
		currentUserId: string | null;
		childLockEnabled: boolean;
	};
};

/**
 * מצב התקדמות משימות — מסמן אילו משימות הושלמו.
 * מסונכרן בנפרד מ-content כדי לאפשר עדכונים תכופים
 * ללא צורך בהעלאת כל התוכן מחדש.
 */
export type SyncProgress = {
	backupSchemaVersion: number;
	taskDone: Record<string, boolean>;
};

/**
 * אינדקס נכסים (תמונות/קבצים) — מיפוי דו-כיווני בין מזהי נכסים ל-hash-ים.
 * `idToHash` ממפה מזהה נכס ל-hash שלו, ו-`hashToFile` ממפה hash למידע
 * על הקובץ הפיזי (מזהה קובץ, סוג MIME וגודל).
 * מאפשר content-addressing: נכסים זהים נשמרים פעם אחת בלבד.
 */
export type SyncAssetsIndex = {
	backupSchemaVersion: number;
	idToHash: Record<string, Sha256>;
	hashToFile: Record<
		Sha256,
		{
			fileId: string;
			mimeType: string;
			size: number;
		}
	>;
};

/**
 * מטא-דאטה על הגרסה המרוחקת — נקרא בזול (metadata בלבד, בלי הורדת קבצים)
 */
export type RemoteMetadata = {
	writeId: string;
	parentWriteId: string | null;
	contentHash: Sha256;
	progressHash: Sha256;
	assetsHash: Sha256;
	timestamp: number;
	deviceId: string;
};

/**
 * קטגוריות שגיאה לטיפול שונה ב-syncController
 */
export type SyncErrorCategory = 'network' | 'auth' | 'conflict' | 'unknown';

/**
 * שגיאת סנכרון מסווגת — מרחיבה את Error עם קטגוריה לטיפול דיפרנציאלי.
 * ה-syncController משתמש בקטגוריה כדי להחליט על אסטרטגיית retry,
 * הצגת הודעה למשתמש, או ביטול הסנכרון.
 */
export class SyncError extends Error {
	/**
	 * @param message - תיאור השגיאה
	 * @param category - קטגוריית השגיאה לטיפול דיפרנציאלי
	 * @param cause - השגיאה המקורית (אם קיימת)
	 */
	constructor(
		message: string,
		public readonly category: SyncErrorCategory,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'SyncError';
	}
}
