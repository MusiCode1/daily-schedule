import { persistence } from '../stores/persistence';
import { db } from '../services/db';
import { globalState } from '../stores/globalState.svelte'; // For listening to changes?
// Or maybe we just rely on manual trigger + auto-trigger hook
import { GOOGLE_CLIENT_ID } from '../config';
import { setSyncStatus, resetSyncStatus } from '../stores/syncStore';
import type { AppState, List, Task, UserProfile } from '../types';
import { TEXTS } from '$lib/data/texts';
import { deviceState } from '$lib/stores/deviceState';
import { googleAuthService } from '$lib/services/drive/googleAuthService';
import { dailyScheduleBackupRepo } from '$lib/services/drive/dailyScheduleBackupRepo';
import { collectAssetIds } from '$lib/services/drive/backupPayloads';
import type { ManifestV2 } from '$lib/services/drive/types';
import { backupToDriveV2, restoreFromDriveV2 } from '$lib/services/drive/driveBackupV2';

export class BackupController {
	// State
	isConnected = $state(false);
	isAutoBackupEnabled = $state(true); // Default to true
	lastBackupTime: Date | null = $state(null);
	status: 'idle' | 'backing_up' | 'restoring' | 'error' | 'success' = $state('idle');
	statusMessage = $state('');
	errorMessage = $state('');
	userInfo: { displayName?: string; emailAddress?: string; photoLink?: string } | null =
		$state(null);

	// Sync State
	deviceId = $state('');
	deviceName = $state('');
	lastKnownWriteId: string | null = $state(null);

	// Config
	customClientId = $state('');
	useRedirectMode = $state(false);

	// Timers
	private autoBackupTimeout: ReturnType<typeof setTimeout> | null = null;

	// Conflict State
	conflictState: {
		isConflict: boolean;
		remoteTime: Date | null;
		localTime: Date | null;
		remoteFileId: string | null;
		remoteDeviceId?: string;
	} = $state({
		isConflict: false,
		remoteTime: null,
		localTime: null,
		remoteFileId: null
	});

	constructor() {
		// האזנה לשינויים בסטטוס של השירות
		googleAuthService.subscribe((status) => {
			if (status === 'authenticated') {
				this.isConnected = true;
				this.loadUserInfo();
				this.checkLastBackup().then(() => {
					this.checkForRemoteUpdates();
				});
			} else if (status === 'unauthenticated' || status === 'error') {
				this.isConnected = false;
				this.userInfo = null;
			}
		});

		// טעינת הגדרות מקומיות (למשל Client ID מותאם)
		this.loadLocalSettings();
	}

	private loadLocalSettings() {
		if (typeof window === 'undefined') return;

		const ds = deviceState.load();
		this.customClientId = ds.drive.clientIdOverride || '';
		this.isAutoBackupEnabled = ds.drive.autoBackupEnabled;
		this.useRedirectMode = ds.drive.useRedirectMode;
		this.deviceId = ds.drive.deviceId;
		this.deviceName = ds.drive.deviceName;
		this.lastKnownWriteId = ds.drive.lastKnownWriteId;
	}

	saveLocalSettings() {
		if (typeof window === 'undefined') return;

		deviceState.update((draft) => {
			draft.drive.clientIdOverride = this.customClientId || '';
			draft.drive.autoBackupEnabled = this.isAutoBackupEnabled;
			draft.drive.useRedirectMode = this.useRedirectMode;
		});
	}

	async initialize() {
		await googleAuthService.initialize(this.customClientId || GOOGLE_CLIENT_ID);
	}

	signIn() {
		this.saveLocalSettings(); // שמור הגדרות לפני התחברות (למקרה של CLient ID חדש)

		if (this.useRedirectMode) {
			// התחברות עם הפניה (למצבי קיוסק)
			googleAuthService.signInWithRedirect(this.customClientId || GOOGLE_CLIENT_ID);
			return;
		}

		// ברירת מחדל: התחברות רגילה (Popup)
		googleAuthService.initialize(this.customClientId || GOOGLE_CLIENT_ID).then(() => {
			googleAuthService.signIn();
		});
	}

	signOut() {
		googleAuthService.signOut();
	}

	async loadUserInfo() {
		const info = await googleAuthService.getUserInfo();
		this.userInfo = info || null;
	}

	async checkLastBackup() {
		try {
			const meta = await dailyScheduleBackupRepo.findV2ManifestMeta();
			const writeId = meta?.appProperties && (meta.appProperties as any).writeId;
			if (writeId && meta?.modifiedTime) {
				this.lastBackupTime = new Date(meta.modifiedTime);
				return;
			}

			// fallback: V1
			const v1 = await dailyScheduleBackupRepo.findLegacyV1BackupMeta();
			if (v1?.modifiedTime) {
				this.lastBackupTime = new Date(v1.modifiedTime);
			}
		} catch (e) {
			console.error('Failed to check last backup', e);
		}
	}

	async checkForRemoteUpdates() {
		try {
			const latestBackup = await dailyScheduleBackupRepo.findV2ManifestMeta();
			if (latestBackup?.appProperties && (latestBackup.appProperties as any).writeId) {
				const remoteWriteId = (latestBackup.appProperties as any).writeId;
				console.log('Checking Sync:', {
					remoteWriteId,
					localWriteId: this.lastKnownWriteId,
					match: remoteWriteId === this.lastKnownWriteId
				});

				if (remoteWriteId !== this.lastKnownWriteId) {
					// Conflict driven by UUID mismatch
					const remoteTime = (latestBackup.appProperties as any).lastModified
						? new Date(Number((latestBackup.appProperties as any).lastModified))
						: new Date(latestBackup.modifiedTime || 0);

					// Try to get local time from parentTimestamp or just file stats
					console.log('Remote writeId mismatch', { remoteWriteId, local: this.lastKnownWriteId });

					// שליפת זמן שינוי מקומי אמיתי
					let realLocalTime = new Date();
					try {
						const rawState = localStorage.getItem('daily-schedule-data');
						if (rawState) {
							const state = JSON.parse(rawState);
							if (state.lastModified) {
								realLocalTime = new Date(state.lastModified);
							}
						}
					} catch (e) {
						console.warn('Failed to read local time', e);
					}

					this.conflictState = {
						isConflict: true,
						remoteTime,
						localTime: realLocalTime,
						remoteFileId: latestBackup.id || null,
						remoteDeviceId: (latestBackup.appProperties as any).lastModifiedByDeviceId
					};
					return;
				}
			}

			// Fallback to old timestamp logic if no appProperties (migration phase)
			if (latestBackup && !latestBackup.appProperties && latestBackup.modifiedTime) {
				// ... (existing timestamp logic can stay as fallback or be removed? Let's keep it minimal)
				const remoteTime = new Date(latestBackup.modifiedTime);
				const rawState = localStorage.getItem('daily-schedule-data');
				let localTime = new Date(0);
				if (rawState) {
					const state = JSON.parse(rawState);
					if (state.lastModified) localTime = new Date(state.lastModified);
				}
				if (remoteTime.getTime() > localTime.getTime() + 10000) {
					this.conflictState = {
						isConflict: true,
						remoteTime,
						localTime,
						remoteFileId: latestBackup.id || null
					};
				}
			}
		} catch (e) {
			console.error('Failed to check for remote updates', e);
		}
	}

	async resolveConflict(choice: 'local' | 'remote') {
		if (choice === 'remote' && this.conflictState.remoteFileId) {
			await this.restoreFromFile(this.conflictState.remoteFileId);
		} else {
			// בחירה במקומי: פשוט מנקים את הקונפליקט, והגיבוי הבא ידרוס את הענן (כי יהיה חדש יותר)
			// או שאנחנו יוזמים גיבוי מיד?
			// כדאי ליזום גיבוי כדי לעדכן את הענן בגרסה "המנצחת"
			await this.performBackup(false, true); // force=true
		}

		this.conflictState = {
			isConflict: false,
			remoteTime: null,
			localTime: null,
			remoteFileId: null
		};
	}

	async performBackup(isAuto = false, force = false) {
		if (!this.isConnected) return;

		// מניעת גיבוי אם יש קונפליקט פתוח (לא רוצים לדרוס את הענן בטעות לפני שהמשתמש החליט)
		if (this.conflictState.isConflict && !force) {
			console.log('Skipping backup due to unresolved conflict');
			return;
		}

		this.status = 'backing_up';
		this.errorMessage = '';

		try {
			// Check-Then-Act (Only if not forced)
			if (!force) {
				const meta = await dailyScheduleBackupRepo.findV2ManifestMeta();
				const remoteWriteId =
					meta?.appProperties && (meta.appProperties as any).writeId
						? String((meta.appProperties as any).writeId)
						: null;
				if (remoteWriteId && remoteWriteId !== this.lastKnownWriteId) {
					console.warn('Conflict detected mid-action!');
					await this.checkForRemoteUpdates();
					this.status = 'idle';
					return;
				}
			}

			this.statusMessage = TEXTS.PREPARING_BACKUP;

			const rawState = localStorage.getItem('daily-schedule-data');
			if (!rawState) throw new Error('No data to backup');
			const state: AppState = JSON.parse(rawState);

			this.statusMessage = TEXTS.UPLOADING_TO_DRIVE;
			setSyncStatus('uploading', TEXTS.UPLOADING_BACKUP_TO_DRIVE, 0);

			const ds = deviceState.load();
			const result = await backupToDriveV2({
				state,
				repo: dailyScheduleBackupRepo,
				db,
				device: { deviceId: this.deviceId, deviceName: this.deviceName },
				lastKnownWriteId: this.lastKnownWriteId,
				cache: {
					lastUploadedAssetsHash: ds.drive.v2Cache.lastUploadedAssetsHash as any,
					lastUploadedContentHash: ds.drive.v2Cache.lastUploadedContentHash as any,
					lastUploadedProgressHash: ds.drive.v2Cache.lastUploadedProgressHash as any
				}
			});

			// Update local state on success
			this.lastKnownWriteId = result.writeId;
			deviceState.update((draft) => {
				draft.drive.lastKnownWriteId = result.writeId;
				draft.drive.v2Cache.lastUploadedContentHash = result.cache.lastUploadedContentHash as any;
				draft.drive.v2Cache.lastUploadedProgressHash = result.cache.lastUploadedProgressHash as any;
				draft.drive.v2Cache.lastUploadedAssetsHash = result.cache.lastUploadedAssetsHash as any;
			});

			this.statusMessage = '';
			this.status = 'success';
			this.lastBackupTime = new Date();

			// השהיה קצרה להראות 100% ואז לסגור
			setTimeout(() => {
				resetSyncStatus();
			}, 1000);

			if (!isAuto) {
				setTimeout(() => (this.status = 'idle'), 3000);
			} else {
				this.status = 'idle';
			}
		} catch (e: any) {
			console.error('Backup failed', e);
			this.status = 'error';
			this.errorMessage = TEXTS.ERROR_GENERIC;
			this.statusMessage = '';
			resetSyncStatus();
		}
	}

	async downloadLocalBackup() {
		try {
			this.statusMessage = TEXTS.PREPARING_DOWNLOAD_FILE;
			const data = await this.prepareBackupData();
			this.downloadFile(data, 'daily_schedule_backup.json');
			this.statusMessage = '';
		} catch (e) {
			console.error('Failed to download local backup', e);
			alert(TEXTS.CREATING_BACKUP_FILE_ERROR);
			this.statusMessage = '';
		}
	}

	async downloadRemoteBackup(fileId: string) {
		try {
			this.status = 'restoring';
			this.statusMessage = TEXTS.DOWNLOADING_FILE_FROM_DRIVE;

			const manifest = await dailyScheduleBackupRepo.readJson(fileId);
			if (!manifest) throw new Error('Empty backup');

			// ננסה לצרף גם את ה-content/progress/assetsIndex עבור דיבאג.
			const bundle: any = { manifest };
			if (manifest.files?.content?.fileId) {
				bundle.content = await dailyScheduleBackupRepo.readJson(manifest.files.content.fileId);
			}
			if (manifest.files?.progress?.fileId) {
				bundle.progress = await dailyScheduleBackupRepo.readJson(manifest.files.progress.fileId);
			}
			if (manifest.files?.assetsIndex?.fileId) {
				bundle.assetsIndex = await dailyScheduleBackupRepo.readJson(manifest.files.assetsIndex.fileId);
			}

			this.statusMessage = TEXTS.CREATING_DOWNLOAD_FILE;
			const json = JSON.stringify(bundle, null, 2);
			this.downloadFile(json, 'remote_backup_bundle.json');
			this.status = 'idle';
			this.statusMessage = '';
		} catch (e) {
			console.error('Failed to download remote backup', e);
			this.status = 'error';
			this.errorMessage = TEXTS.DOWNLOAD_FAILED;
			this.statusMessage = '';
			alert(TEXTS.DOWNLOADING_FILE_ERROR);
		}
	}

	private downloadFile(content: string, filename: string) {
		const blob = new Blob([content], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// פונקציה להמרת הנתונים לגיבוי מלא (החזרת התמונות מ-IndexedDB לתוך ה-JSON)
	private async prepareBackupData(): Promise<string> {
		// 1. שליפת הנתונים הגולמיים
		const rawState = localStorage.getItem('daily-schedule-data');
		if (!rawState) throw new Error('No data to backup');

		const state = JSON.parse(rawState);

		// 2. מעבר על כל המשתמשים והרשימות ומציאת תמונות
		// אנו נסרוק רק מקומות ידועים שיש בהם תמונות: users, tasks inside lists

		// א. תמונות משתמשים
		if (state.users) {
			for (const user of state.users) {
				if (user.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('idb:')) {
					user.avatar = await this.hydrateImage(user.avatar);
				}
			}
		}

		// ב. תמונות משימות ורשימות
		if (state.lists) {
			for (const userId of Object.keys(state.lists)) {
				for (const list of state.lists[userId]) {
					// תמונת רשימה (אם יש)
					if (list.logo && typeof list.logo === 'string' && list.logo.startsWith('idb:')) {
						list.logo = await this.hydrateImage(list.logo);
					}

					// תמונות משימות
					for (const task of list.tasks) {
						if (
							task.imageSrc &&
							typeof task.imageSrc === 'string' &&
							task.imageSrc.startsWith('idb:')
						) {
							task.imageSrc = await this.hydrateImage(task.imageSrc);
						}
					}
				}
			}
		}

		// ג. המרת תמונות במאגר images (נשארות כמו שהן - רק המפתחות מתעדכנים)
		if (state.images) {
			const newImages: any = {};
			for (const imageId of Object.keys(state.images)) {
				if (imageId.startsWith('idb:')) {
					const newId = await this.hydrateImage(imageId);
					newImages[newId] = state.images[imageId];
				} else {
					newImages[imageId] = state.images[imageId];
				}
			}
			state.images = newImages;
		}

		return JSON.stringify(state);
	}

	private async extractImagesFromState(data: any): Promise<any> {
		const imageMap = new Map<string, string>(); // Cache: DataURL -> IdbID

		// פונקציית עזר פנימית לטיפול ב-URL בודד
		const processUrl = async (url: string | undefined | null): Promise<string | null> => {
			if (!url || !url.startsWith('data:image')) return url || null;

			if (imageMap.has(url)) {
				return imageMap.get(url)!;
			}

			try {
				const blob = await this.dataURLToBlob(url);
				const id = await db.saveImage(blob);
				imageMap.set(url, id);
				return id;
			} catch (e) {
				console.error('Failed to save image to DB', e);
				return url; // במקרה שגיאה נשאיר את המקורי
			}
		};

		// 1. מעבר על Users
		if (data.users && Array.isArray(data.users)) {
			for (const user of data.users) {
				if (user.avatar) user.avatar = await processUrl(user.avatar);
			}
		}

		// 2. מעבר על Lists & Tasks
		if (data.lists) {
			for (const userId of Object.keys(data.lists)) {
				const lists = data.lists[userId];
				if (Array.isArray(lists)) {
					for (const list of lists) {
						if (list.logo) list.logo = await processUrl(list.logo);

						if (list.tasks && Array.isArray(list.tasks)) {
							for (const task of list.tasks) {
								if (task.imageSrc) task.imageSrc = await processUrl(task.imageSrc);
							}
						}
					}
				}
			}
		}

		// 3. מעבר על Images global map (תיקון מפתחות)
		if (data.images) {
			const newImages: any = {};
			for (const key of Object.keys(data.images)) {
				const newKey = await processUrl(key);
				if (newKey && newKey !== key) {
					newImages[newKey] = data.images[key];
				} else {
					// אם זה לא היה data url או שנכשל, שומרים כמו שהיה
					newImages[key] = data.images[key];
				}
			}
			data.images = newImages;
		}

		return data;
	}

	private dataURLToBlob(dataURL: string): Promise<Blob> {
		return fetch(dataURL).then((res) => res.blob());
	}

	private async hydrateImage(idbId: string): Promise<string> {
		try {
			const blob = await db.getImage(idbId);
			if (!blob) return idbId; // אם נכשל, נשאיר ID (עדיף מכלום)
			return await this.blobToDataURL(blob);
		} catch (e) {
			console.warn(`Failed to hydrate image ${idbId}`, e);
			return idbId;
		}
	}

	private blobToDataURL(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	// נקרא כאשר יש שינוי בנתונים באפליקציה
	notifyDataChanged() {
		if (!this.isConnected || !this.isAutoBackupEnabled) return;

		// Debounce: נמתין 5 שניות של שקט לפני גיבוי
		if (this.autoBackupTimeout) clearTimeout(this.autoBackupTimeout);

		this.autoBackupTimeout = setTimeout(() => {
			this.performBackup(true);
		}, 5000 * 1); // 5 שניות (או יותר)
	}

	async getRestoreList() {
		try {
			// V2
			const meta = await dailyScheduleBackupRepo.findV2ManifestMeta();
			const writeId = meta?.appProperties && (meta.appProperties as any).writeId;
			if (writeId) {
				return [
					{
						id: meta!.id,
						name: meta!.name,
						modifiedTime: meta!.modifiedTime
					}
				];
			}

			// fallback: V1
			const v1 = await dailyScheduleBackupRepo.findLegacyV1BackupMeta();
			if (!v1) return [];
			return [
				{
					id: v1.id,
					name: v1.name,
					modifiedTime: v1.modifiedTime
				}
			];
		} catch (e) {
			return [];
		}
	}

	async restoreFromFile(fileId: string) {
		this.status = 'restoring';
		this.statusMessage = TEXTS.STARTING_RESTORE;
		try {
			this.statusMessage = TEXTS.DOWNLOADING_BACKUP_FILE;
			setSyncStatus('downloading', TEXTS.DOWNLOADING_FROM_CLOUD, 0);
			const downloaded = await dailyScheduleBackupRepo.readJson(fileId, (progress) => {
				setSyncStatus('downloading', TEXTS.DOWNLOADING_FROM_CLOUD, progress);
			});

			// זיהוי V2 vs V1
			const isV2 =
				downloaded &&
				typeof downloaded === 'object' &&
				typeof (downloaded as any).backupSchemaVersion === 'number' &&
				(downloaded as any).files?.content?.fileId &&
				(downloaded as any).files?.progress?.fileId;

			if (!isV2) {
				// fallback: V1 (קובץ state יחיד שכולל data:image/...)
				const data = downloaded;
				if (!data || !data.users) throw new Error('Invalid backup file');

				console.log('Extracting images to IndexedDB (V1 restore)...');
				this.statusMessage = TEXTS.EXTRACTING_IMAGES;
				const cleanData = await this.extractImagesFromState(data);

				this.statusMessage = TEXTS.SAVING_AND_REFRESHING;
				localStorage.setItem('daily-schedule-data', JSON.stringify(cleanData));

				// עדכון ה-WriteID הידוע לנו אם קיים
				if (cleanData.syncMetadata && cleanData.syncMetadata.writeId) {
					this.lastKnownWriteId = cleanData.syncMetadata.writeId;
					deviceState.update((draft) => {
						draft.drive.lastKnownWriteId = cleanData.syncMetadata.writeId;
					});
				} else {
					this.lastKnownWriteId = null;
					deviceState.update((draft) => {
						draft.drive.lastKnownWriteId = null;
					});
				}

				resetSyncStatus();
				window.location.reload();
				return;
			}

			const { state: restored, manifest } = await restoreFromDriveV2({
				manifestFileId: fileId,
				repo: dailyScheduleBackupRepo,
				db
			});

			// שמירה ל-LocalStorage
			this.statusMessage = TEXTS.SAVING_AND_REFRESHING;
			localStorage.setItem('daily-schedule-data', JSON.stringify(restored));

			// עדכון state per-device
			this.lastKnownWriteId = manifest.syncMetadata.writeId;
			deviceState.update((draft) => {
				draft.drive.lastKnownWriteId = manifest.syncMetadata.writeId;
				// גם cache IDs כדי לחסוך חיפושים בפעם הבאה
				draft.drive.v2Cache.assetsFolderId = manifest.files.assetsFolder.folderId;
				draft.drive.v2Cache.manifestFileId = fileId;
				draft.drive.v2Cache.contentFileId = manifest.files.content.fileId;
				draft.drive.v2Cache.progressFileId = manifest.files.progress.fileId;
				draft.drive.v2Cache.assetsIndexFileId = manifest.files.assetsIndex.fileId;
				draft.drive.v2Cache.lastUploadedContentHash = manifest.hashes.contentHash;
				draft.drive.v2Cache.lastUploadedProgressHash = manifest.hashes.progressHash;
				draft.drive.v2Cache.lastUploadedAssetsHash = manifest.hashes.assetsHash;
			});

			// טעינה מחדש של הדף כדי שה-Storms יתעדכנו
			resetSyncStatus(); // ליתר ביטחון, למרות שהריפרש ינקה
			window.location.reload();
		} catch (e: any) {
			console.error('Restore failed', e);
			this.status = 'error';
			this.errorMessage = TEXTS.ERROR_GENERIC;
			this.statusMessage = '';
			resetSyncStatus();
		}
	}
}

// Singleton export
export const backupController = new BackupController();
