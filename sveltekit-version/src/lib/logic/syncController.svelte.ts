import { globalState } from '../stores/globalState.svelte';
import { backupWithHistory, restoreWithMerge } from '../services/drive/driveBackupV2';
import { dailyScheduleBackupRepo } from '../services/drive/dailyScheduleBackupRepo';
import { db } from '../services/db';
import { googleAuthService } from '../services/drive/googleAuthService';
import { calculateDelta } from '../services/sync/syncEngine';
import { deviceState } from '../stores/deviceState';
import {
	syncStarted,
	syncSucceeded,
	syncFailed,
	setOffline
} from '../stores/syncStore';
import type { AppState } from '../types';

const TAG = '[SyncController]';
const DEBOUNCE_DELAY = 5000; // 5 שניות
const MAX_RETRIES = 10;

type SyncOptions = {
	manual?: boolean;
};

function cloneAppState(state: AppState): AppState {
	return $state.snapshot(state);
}

/**
 * Controller לניהול סנכרון אוטומטי עם Drive
 */
export class SyncController {
	private debounceTimer: number | null = null;
	private lastKnownWriteId: string | null = null;
	private retryCount = 0;
	private previousState: AppState | null = null;

	constructor() {
		this.loadLocalState();
		this.setupTriggers();
	}

	/**
	 * טעינת מצב מקומי (lastKnownWriteId)
	 */
	private loadLocalState() {
		if (typeof window === 'undefined') return;

		const ds = deviceState.load();
		this.lastKnownWriteId = ds.drive.lastKnownWriteId;
		this.previousState = cloneAppState(globalState.state);
	}

	/**
	 * שמירת lastKnownWriteId ל-deviceState
	 */
	private saveLastKnownWriteId(writeId: string) {
		if (typeof window === 'undefined') return;

		deviceState.update((draft) => {
			draft.drive.lastKnownWriteId = writeId;
		});
		this.lastKnownWriteId = writeId;
	}

	/**
	 * בדיקה האם גיבוי אוטומטי פעיל במכשיר הנוכחי
	 */
	private isAutoBackupEnabled(): boolean {
		if (typeof window === 'undefined') return false;
		return deviceState.load().drive.autoBackupEnabled;
	}

	/**
	 * הגדרת טריגרים לסנכרון
	 */
	private setupTriggers() {
		if (typeof window === 'undefined') return;

		// 1. Visibility change - כשחוזרים לטאב
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				console.log(TAG, 'Tab visible - מסנכרן...');
				this.sync();
			}
		});

		// 2. Online/Offline events
		window.addEventListener('online', () => {
			console.log(TAG, 'חזר online - מסנכרן...');
			this.sync();
		});

		window.addEventListener('offline', () => {
			console.log(TAG, 'Offline');
			setOffline();
		});

		// 3. App load - סנכרון ראשוני
		this.sync();
	}

	/**
	 * טריגר סנכרון מדחף (debounced)
	 */
	public triggerSync() {
		if (!this.isAutoBackupEnabled()) {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
				this.debounceTimer = null;
			}
			return;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.sync();
		}, DEBOUNCE_DELAY);
	}

	/**
	 * סנכרון מיידי
	 */
	public async sync(options: SyncOptions = {}) {
		// בדיקת תנאים מקדימים
		if (typeof window === 'undefined') return;
		const isManual = options.manual === true;

		if (!isManual && !this.isAutoBackupEnabled()) {
			console.log(TAG, 'גיבוי אוטומטי כבוי - מדלג על סנכרון אוטומטי');
			return;
		}

		if (!navigator.onLine) {
			console.log(TAG, 'Offline - מדלג על סנכרון');
			setOffline();
			return;
		}

		if (!googleAuthService.getAccessToken()) {
			console.log(TAG, 'אין חיבור ל-Google Drive - מדלג על סנכרון');
			return;
		}

		try {
			syncStarted();

			// קבלת המצב המקומי הנוכחי
			const localState = cloneAppState(globalState.state);
			let stateForUpload = localState;
			let remoteWriteId: string | null = null;
			let mergedFromRemote = false;

			// קבלת device info
			const ds = deviceState.load();
			const device = {
				deviceId: ds.drive.deviceId,
				deviceName: ds.drive.deviceName
			};

			// 1. שחזור + merge (אם יש גיבוי בענן)
			const remoteManifestMeta = await dailyScheduleBackupRepo.findV2ManifestMeta();
			if (remoteManifestMeta?.id) {
				console.log(TAG, 'מבצע restoreWithMerge...');
				const restoreResult = await restoreWithMerge({
					manifestFileId: remoteManifestMeta.id,
					repo: dailyScheduleBackupRepo,
					db,
					localState,
					localWriteId: this.lastKnownWriteId
				});

				remoteWriteId = restoreResult.manifest.syncMetadata.writeId;
				mergedFromRemote = restoreResult.merged;

				const shouldApplyRemoteState =
					restoreResult.merged ||
					!this.lastKnownWriteId ||
					this.lastKnownWriteId !== remoteWriteId;

				if (shouldApplyRemoteState) {
					console.log(TAG, 'מעדכן local state עם state מהענן');
					globalState.state = restoreResult.state;
					globalState.save();
				}

				stateForUpload = restoreResult.state;
				this.saveLastKnownWriteId(remoteWriteId);

				// במקרה של pull מהענן בלבד, ה-baseline המקומי הוא state שהתקבל מהענן
				if (!restoreResult.merged) {
					this.previousState = cloneAppState(stateForUpload);
				}
			} else {
				console.log(TAG, 'לא נמצא manifest בענן - מדלג על שלב restore');
			}

			// 2. החלטה האם בכלל צריך להעלות לענן
			const hasLocalChanges = this.previousState
				? !!calculateDelta(this.previousState, stateForUpload)
				: true;
			const shouldUpload = !remoteWriteId || mergedFromRemote || hasLocalChanges;

			if (!shouldUpload) {
				this.retryCount = 0;
				this.previousState = cloneAppState(stateForUpload);
				syncSucceeded();
				console.log(TAG, 'אין שינויים מקומיים - דילוג על upload');
				return;
			}

			// 3. גיבוי עם history
			console.log(TAG, 'מבצע backupWithHistory...');
			const cache = {
				lastUploadedAssetsHash: ds.drive.v2Cache.lastUploadedAssetsHash as any,
				lastUploadedContentHash: ds.drive.v2Cache.lastUploadedContentHash as any,
				lastUploadedProgressHash: ds.drive.v2Cache.lastUploadedProgressHash as any
			};

			const result = await backupWithHistory({
				state: stateForUpload,
				repo: dailyScheduleBackupRepo,
				db,
				device,
				lastKnownWriteId: this.lastKnownWriteId,
				previousState: this.previousState ?? cloneAppState(stateForUpload),
				forceSnapshot: mergedFromRemote || !this.previousState,
				cache
			});

			// עדכון cache ב-deviceState
			deviceState.update((draft) => {
				draft.drive.v2Cache.lastUploadedAssetsHash = result.cache.lastUploadedAssetsHash as string;
				draft.drive.v2Cache.lastUploadedContentHash = result.cache.lastUploadedContentHash as string;
				draft.drive.v2Cache.lastUploadedProgressHash = result.cache.lastUploadedProgressHash as string;
			});

			// 4. שמירת writeId
			this.saveLastKnownWriteId(result.writeId);

			// 5. שמירת previousState לדלתא הבאה
			this.previousState = cloneAppState(stateForUpload);

			// 6. איפוס retry counter
			this.retryCount = 0;

			syncSucceeded();
			console.log(TAG, 'סנכרון הושלם בהצלחה', { writeId: result.writeId });
		} catch (error) {
			console.error(TAG, 'שגיאה בסנכרון:', error);

			// במקרה שאין שינויים אמיתיים - לא נכשיל את הזרימה
			if (error instanceof Error && error.message === 'No changes to backup') {
				this.retryCount = 0;
				this.previousState = cloneAppState(globalState.state);
				syncSucceeded();
				console.log(TAG, 'No changes to backup - מסיים כהצלחה');
				return;
			}

			// Retry logic עם exponential backoff
			if (this.retryCount < MAX_RETRIES) {
				this.retryCount++;
				const delay = Math.pow(2, this.retryCount - 1); // 1, 2, 4, 8, 16, 32, 64, 128, 256, 512

				syncFailed(
					error instanceof Error ? error.message : 'שגיאה לא ידועה',
					this.retryCount,
					delay
				);

				console.log(TAG, `ניסיון ${this.retryCount}/${MAX_RETRIES} בעוד ${delay}s`);

				setTimeout(() => {
					this.sync(options);
				}, delay * 1000);
			} else {
				console.error(TAG, 'הגעתי ל-10 ניסיונות - מוותר');
				syncFailed('הגעתי למקסימום ניסיונות', this.retryCount, 0);
			}
		}
	}
}

/**
 * Instance יחיד ל-syncController
 */
export const syncController = new SyncController();
