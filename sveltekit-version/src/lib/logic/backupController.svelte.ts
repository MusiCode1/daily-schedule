import { googleDriveService } from '../services/googleDriveService';
import { persistence } from '../stores/persistence';
import { db } from '../services/db';
import { globalState } from '../stores/globalState.svelte'; // For listening to changes?
// Or maybe we just rely on manual trigger + auto-trigger hook
import { GOOGLE_CLIENT_ID } from '../config';
import { setSyncStatus, resetSyncStatus } from '../stores/syncStore';
import type { AppState, List, Task, UserProfile } from '../types';

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

	// Timers
	private autoBackupTimeout: ReturnType<typeof setTimeout> | null = null;

	// אנו מאזינים לשינויים ב-persistence דרך עטיפה או פשוט מניחים שהמשתמש יקרא לזה
	// אך כדי לעשות זאת אוטומטית, נצטרך להתממשק למקום שבו שומרים.
	// כרגע נספק פונקציה `notifyChange()` שנקרא לה מ-persistence.ts

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
		googleDriveService.subscribe((status) => {
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

	// ... (loadLocalSettings, saveLocalSettings, initialize, signIn, signOut, loadUserInfo stay same)

	private loadLocalSettings() {
		if (typeof localStorage !== 'undefined') {
			const savedClientId = localStorage.getItem('google_client_id_override');
			if (savedClientId) this.customClientId = savedClientId;

			const savedAuto = localStorage.getItem('auto_backup_enabled');
			if (savedAuto !== null) this.isAutoBackupEnabled = savedAuto === 'true';

			// Load Sync State
			let dId = localStorage.getItem('device_id');
			if (!dId) {
				dId = crypto.randomUUID();
				localStorage.setItem('device_id', dId);
			}
			this.deviceId = dId;

			let dName = localStorage.getItem('device_name');
			if (!dName) {
				// Generate basic name from User Agent
				const ua = navigator.userAgent;
				let browser = 'Browser';
				if (ua.includes('Chrome')) browser = 'Chrome';
				else if (ua.includes('Firefox')) browser = 'Firefox';
				else if (ua.includes('Safari')) browser = 'Safari';
				else if (ua.includes('Edge')) browser = 'Edge';

				let os = 'OS';
				if (ua.includes('Windows')) os = 'Windows';
				else if (ua.includes('Mac')) os = 'MacOS';
				else if (ua.includes('Linux')) os = 'Linux';
				else if (ua.includes('Android')) os = 'Android';
				else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

				dName = `${browser} on ${os}`;
				localStorage.setItem('device_name', dName);
			}
			this.deviceName = dName;

			this.lastKnownWriteId = localStorage.getItem('last_known_write_id');
		}
	}

	saveLocalSettings() {
		if (typeof localStorage !== 'undefined') {
			if (this.customClientId)
				localStorage.setItem('google_client_id_override', this.customClientId);
			else localStorage.removeItem('google_client_id_override');

			localStorage.setItem('auto_backup_enabled', String(this.isAutoBackupEnabled));
		}
	}

	async initialize() {
		await googleDriveService.initialize(this.customClientId || GOOGLE_CLIENT_ID);
	}

	signIn() {
		this.saveLocalSettings(); // שמור הגדרות לפני התחברות (למקרה של CLient ID חדש)
		// ייתכן שנצטרך לאתחל מחדש אם ה-Client ID השתנה
		googleDriveService.initialize(this.customClientId || GOOGLE_CLIENT_ID).then(() => {
			googleDriveService.signIn();
		});
	}

	signOut() {
		googleDriveService.signOut();
	}

	async loadUserInfo() {
		const info = await googleDriveService.getUserInfo();
		this.userInfo = info || null;
	}

	async checkLastBackup() {
		try {
			const files = await googleDriveService.listBackups();
			if (files.length > 0 && files[0].modifiedTime) {
				this.lastBackupTime = new Date(files[0].modifiedTime);
			}
		} catch (e) {
			console.error('Failed to check last backup', e);
		}
	}

	async checkForRemoteUpdates() {
		try {
			const files = await googleDriveService.listBackups();
			if (files.length === 0) return;

			const latestBackup = files[0];
			// If we have appProperties, use strictly that for conflict detection
			if (latestBackup.appProperties && latestBackup.appProperties.writeId) {
				const remoteWriteId = latestBackup.appProperties.writeId;
				console.log('Checking Sync:', {
					remoteWriteId,
					localWriteId: this.lastKnownWriteId,
					match: remoteWriteId === this.lastKnownWriteId
				});

				if (remoteWriteId !== this.lastKnownWriteId) {
					// Conflict driven by UUID mismatch
					const remoteTime = latestBackup.appProperties.lastModified
						? new Date(Number(latestBackup.appProperties.lastModified))
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
						remoteDeviceId: latestBackup.appProperties.lastModifiedByDeviceId
					};
					return;
				}
			}

			// Fallback to old timestamp logic if no appProperties (migration phase)
			if (!latestBackup.appProperties && latestBackup.modifiedTime) {
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
				const files = await googleDriveService.listBackups();
				if (files.length > 0 && files[0].appProperties && files[0].appProperties.writeId) {
					if (files[0].appProperties.writeId !== this.lastKnownWriteId) {
						// Double check conflict!
						console.warn('Conflict detected mid-action!');
						await this.checkForRemoteUpdates(); // Will verify and open modal
						this.status = 'idle';
						return;
					}
				}
			}

			this.statusMessage = 'מכין נתונים לגיבוי...';
			// הכנת הנתונים לגיבוי כולל תמונות
			const backupDataStr = await this.prepareBackupData();

			// Extract the new WriteID that was generated inside prepareBackupData?
			// Actually prepareBackupData just stringifies. We should insert metadata there.
			// Let's modify prepareBackupData to handle logic or do it here.
			// Better to do it here where we control the flow.

			const state = JSON.parse(backupDataStr);
			const newWriteId = crypto.randomUUID();
			state.syncMetadata = {
				lastModified: Date.now(),
				lastModifiedByDeviceId: this.deviceId,
				lastModifiedByDeviceName: this.deviceName,
				writeId: newWriteId,
				parentWriteId: this.lastKnownWriteId || undefined
			};
			const finalData = JSON.stringify(state);

			this.statusMessage = 'מעלה ל-Google Drive...';
			setSyncStatus('uploading', 'מעלה גיבוי ל-Google Drive...', 0);

			await googleDriveService.backup(finalData, 'DailyScheduleBackup', (progress) => {
				setSyncStatus('uploading', 'מעלה גיבוי ל-Google Drive...', progress);
			});

			// Update local state on success
			this.lastKnownWriteId = newWriteId;
			localStorage.setItem('last_known_write_id', newWriteId);

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
			this.errorMessage = e.message || 'Backup failed';
			this.statusMessage = '';
			resetSyncStatus();
		}
	}

	async downloadLocalBackup() {
		try {
			this.statusMessage = 'מכין קובץ להורדה...';
			const data = await this.prepareBackupData();
			this.downloadFile(data, 'daily_schedule_backup.json');
			this.statusMessage = '';
		} catch (e) {
			console.error('Failed to download local backup', e);
			alert('שגיאה ביצירת קובץ הגיבוי');
			this.statusMessage = '';
		}
	}

	async downloadRemoteBackup(fileId: string) {
		try {
			this.status = 'restoring';
			this.statusMessage = 'מוריד קובץ מ-Google Drive...';

			const data = await googleDriveService.restore(fileId);
			if (!data) throw new Error('Empty backup');

			this.statusMessage = 'יוצר קובץ להורדה...';
			const json = JSON.stringify(data, null, 2);
			this.downloadFile(json, 'remote_backup.json');
			this.status = 'idle';
			this.statusMessage = '';
		} catch (e) {
			console.error('Failed to download remote backup', e);
			this.status = 'error';
			this.errorMessage = 'הורדה נכשלה';
			this.statusMessage = '';
			alert('שגיאה בהורדת הקובץ');
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
			return await googleDriveService.listBackups();
		} catch (e) {
			return [];
		}
	}

	async restoreFromFile(fileId: string) {
		this.status = 'restoring';
		this.statusMessage = 'מתחיל תהליך שחזור...';
		try {
			this.statusMessage = 'מוריד קובץ גיבוי...';
			setSyncStatus('downloading', 'מוריד נתונים מהענן...', 0);
			const data = await googleDriveService.restore(fileId, (progress) => {
				setSyncStatus('downloading', 'מוריד נתונים מהענן...', progress);
			});
			// בדיקת תקינות בסיסית
			if (!data || !data.users) throw new Error('Invalid backup file');

			// חילוץ תמונות ל-IndexedDB למניעת קריסת Quota
			console.log('Extracting images to IndexedDB...');
			this.statusMessage = 'מחלץ ושומר תמונות (זה עשוי לקחת רגע)...';
			const cleanData = await this.extractImagesFromState(data);

			// שמירה ל-LocalStorage
			this.statusMessage = 'שומר נתונים ומרענן...';
			localStorage.setItem('daily-schedule-data', JSON.stringify(cleanData));

			console.log('Restored data metadata:', cleanData.syncMetadata);

			// עדכון ה-WriteID הידוע לנו מהגיבוי ששחזרנו
			if (cleanData.syncMetadata && cleanData.syncMetadata.writeId) {
				console.log('Updating lastKnownWriteId from backup to:', cleanData.syncMetadata.writeId);
				this.lastKnownWriteId = cleanData.syncMetadata.writeId;
				localStorage.setItem('last_known_write_id', this.lastKnownWriteId!);

				// HEAL: Ensure server metadata matches the content we just accepted
				try {
					console.log('Self-healing server metadata to match content...');
					await googleDriveService.updateFileMetadata(fileId, {
						appProperties: cleanData.syncMetadata
					});
				} catch (metaErr) {
					console.warn('Failed to self-heal metadata', metaErr);
				}
			} else {
				// Backward compatibility: If no writeId, maybe generate one or nullify?
				// Let's reset it so next backup creates a new chain
				this.lastKnownWriteId = null;
				localStorage.removeItem('last_known_write_id');
			}

			// טעינה מחדש של הדף כדי שה-Storms יתעדכנו
			resetSyncStatus(); // ליתר ביטחון, למרות שהריפרש ינקה
			window.location.reload();
		} catch (e: any) {
			console.error('Restore failed', e);
			this.status = 'error';
			this.errorMessage = 'Restore failed';
			this.statusMessage = '';
			resetSyncStatus();
		}
	}
}

// Singleton export
export const backupController = new BackupController();
