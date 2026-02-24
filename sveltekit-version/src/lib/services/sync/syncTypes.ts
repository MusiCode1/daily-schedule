/**
 * טיפוסים משותפים לכל ספקי הסנכרון (payload types).
 * הקוד הגנרי ב-syncOrchestrator ובספקים משתמש בהם.
 */

export type Sha256 = `sha256:${string}`;

export type ManifestV2 = {
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

export type ContentV2 = {
	backupSchemaVersion: number;
	appStateVersion: number;
	users: any[];
	people: any[];
	lists: Record<string, Record<string, any>>;
	images: Record<string, any>;
	activeListId: Record<string, string>;
	currentUserId: string | null;
	settings: { childLockEnabled?: boolean };
};

export type ProgressV2 = {
	backupSchemaVersion: number;
	taskDone: Record<string, boolean>;
};

export type AssetsIndexV2 = {
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

export class SyncError extends Error {
	constructor(
		message: string,
		public readonly category: SyncErrorCategory,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'SyncError';
	}
}
