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

// AppStateVersion נועד לתאימות מיגרציה של ה-state עצמו
export type ContentV2 = {
	backupSchemaVersion: number;
	appStateVersion: number;
	users: any[];
	people: any[];
	lists: Record<string, any[]>;
	images: Record<string, any>;
	activeListId: Record<string, string>;
	currentUserId: string | null;
	settings: Record<string, never>;
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

