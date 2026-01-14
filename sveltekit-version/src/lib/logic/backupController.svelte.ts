import { googleDriveService } from '../services/googleDriveService';
import { persistence } from '../stores/persistence';
import { db } from '../services/db';
import { globalState } from '../stores/globalState.svelte'; // For listening to changes?
// Or maybe we just rely on manual trigger + auto-trigger hook
import { GOOGLE_CLIENT_ID } from '../config';

export class BackupController {
	// State
	isConnected = $state(false);
	isAutoBackupEnabled = $state(true); // Default to true
	lastBackupTime: Date | null = $state(null);
	status: 'idle' | 'backing_up' | 'restoring' | 'error' | 'success' = $state('idle');
	errorMessage = $state('');
	userInfo: { displayName?: string; emailAddress?: string; photoLink?: string } | null =
		$state(null);

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
			if (files.length === 0) return; // אין גיבוי, הכל טוב

			const latestBackup = files[0];
			if (!latestBackup.modifiedTime) return;
			const remoteTime = new Date(latestBackup.modifiedTime);

			// קריאת מצב מקומי
			const rawState = localStorage.getItem('daily-schedule-data');
			let localTime = new Date(0); // ברירת מחדל: ישן מאוד

			if (rawState) {
				try {
					const state = JSON.parse(rawState);
					if (state.lastModified) {
						localTime = new Date(state.lastModified);
					} else {
						// אם אין חותמת זמן, ננסה להעריך או שנניח שזה קונפליקט אם יש גיבוי
						// אבל כדי לא להציק למשתמשים קיימים שרק עדכנו, נניח שהמקומי הוא העדכני?
						// לא, עדיף להציע שחזור אם הגיבוי קיים.
						// נשתמש בזמן הגיבוי האחרון הידוע של המכשיר הזה?
						// אם lastBackupTime קיים, זה הזמן שידוע לנו.
						// אם localTime יהיה 0, הגיבוי ינצח.
					}
				} catch (e) {
					console.error('Failed to parse local state for comparison', e);
				}
			} else {
				// אין מצב מקומי (התקנה חדשה) - שחזור אוטומטי
				console.log('No local state found, auto-restoring from backup...');
				if (latestBackup.id) {
					await this.restoreFromFile(latestBackup.id);
				}
				return;
			}

			// בדיקת קונפליקט: אם הגיבוי בענן חדש יותר מהמקומי (בהפרש סביר של 5 שניות)
			if (remoteTime.getTime() > localTime.getTime() + 5000) {
				console.log('Remote is newer', { remoteTime, localTime });

				this.conflictState = {
					isConflict: true,
					remoteTime,
					localTime,
					remoteFileId: latestBackup.id || null
				};
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
			await this.performBackup(false);
		}

		this.conflictState = {
			isConflict: false,
			remoteTime: null,
			localTime: null,
			remoteFileId: null
		};
	}

	async performBackup(isAuto = false) {
		if (!this.isConnected) return;

		// מניעת גיבוי אם יש קונפליקט פתוח (לא רוצים לדרוס את הענן בטעות לפני שהמשתמש החליט)
		if (this.conflictState.isConflict) {
			console.log('Skipping backup due to unresolved conflict');
			return;
		}

		this.status = 'backing_up';
		this.errorMessage = '';

		try {
			// הכנת הנתונים לגיבוי כולל תמונות
			const backupData = await this.prepareBackupData();

			await googleDriveService.backup(backupData, 'DailyScheduleBackup'); // שם התיקייה

			this.status = 'success';
			this.lastBackupTime = new Date();

			if (!isAuto) {
				setTimeout(() => (this.status = 'idle'), 3000);
			} else {
				this.status = 'idle';
			}
		} catch (e: any) {
			console.error('Backup failed', e);
			this.status = 'error';
			this.errorMessage = e.message || 'Backup failed';
		}
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
				if (user.avatar && user.avatar.startsWith('idb:')) {
					user.avatar = await this.hydrateImage(user.avatar);
				}
			}
		}

		// ב. תמונות משימות ורשימות
		if (state.lists) {
			for (const userId of Object.keys(state.lists)) {
				for (const list of state.lists[userId]) {
					// תמונת רשימה (אם יש)
					if (list.logo && list.logo.startsWith('idb:')) {
						list.logo = await this.hydrateImage(list.logo);
					}

					// תמונות משימות
					for (const task of list.tasks) {
						if (task.imageSrc && task.imageSrc.startsWith('idb:')) {
							task.imageSrc = await this.hydrateImage(task.imageSrc);
						}
					}
				}
			}
		}

		return JSON.stringify(state);
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
		try {
			const data = await googleDriveService.restore(fileId);
			// בדיקת תקינות בסיסית
			if (!data || !data.users) throw new Error('Invalid backup file');

			// שמירה ל-LocalStorage
			localStorage.setItem('daily-schedule-data', JSON.stringify(data));

			// טעינה מחדש של הדף כדי שה-Storms יתעדכנו
			window.location.reload();
		} catch (e: any) {
			console.error('Restore failed', e);
			this.status = 'error';
			this.errorMessage = 'Restore failed';
		}
	}
}

// Singleton export
export const backupController = new BackupController();
