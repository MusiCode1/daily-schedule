import { globalState } from '../stores/globalState.svelte';
import { db } from '../services/db';
import { deviceState } from '../stores/deviceState';
import {
	syncStarted,
	syncSucceeded,
	syncFailed,
	setOffline
} from '../stores/syncStore';
import { calculateDelta } from '../services/sync/engine/syncEngine';
import { pull, push, type DeviceInfo } from '../services/sync/syncOrchestrator';
import { googleDriveSyncProvider } from '../services/sync/providers/google-drive/googleDriveSyncProvider';
import { SyncError } from '../services/sync/syncTypes';
import type { AppState } from '../types';

const TAG = '[SyncController]';
const DEBOUNCE_DELAY = 5000;
const MAX_RETRIES = 10;

type SyncOptions = {
	manual?: boolean;
};

function cloneAppState(state: AppState): AppState {
	return $state.snapshot(state);
}

/**
 * Controller לניהול סנכרון אוטומטי.
 * משתמש ב-syncOrchestrator + googleDriveSyncProvider.
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

	private loadLocalState() {
		if (typeof window === 'undefined') return;
		const ds = deviceState.load();
		this.lastKnownWriteId = ds.drive.lastKnownWriteId;
		this.previousState = cloneAppState(globalState.state);
	}

	private saveLastKnownWriteId(writeId: string) {
		if (typeof window === 'undefined') return;
		deviceState.update((draft) => {
			draft.drive.lastKnownWriteId = writeId;
		});
		this.lastKnownWriteId = writeId;
	}

	private isAutoBackupEnabled(): boolean {
		if (typeof window === 'undefined') return false;
		return deviceState.load().drive.autoBackupEnabled;
	}

	private setupTriggers() {
		if (typeof window === 'undefined') return;

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				console.log(TAG, 'Tab visible - מסנכרן...');
				this.sync();
			}
		});

		window.addEventListener('online', () => {
			console.log(TAG, 'חזר online - מסנכרן...');
			this.sync();
		});

		window.addEventListener('offline', () => {
			console.log(TAG, 'Offline');
			setOffline();
		});

		this.sync();
	}

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

	public async sync(options: SyncOptions = {}) {
		if (typeof window === 'undefined') return;
		const isManual = options.manual === true;

		if (!isManual && !this.isAutoBackupEnabled()) {
			console.log(TAG, 'סנכרון אוטומטי כבוי - מדלג');
			return;
		}

		if (!navigator.onLine) {
			console.log(TAG, 'Offline - מדלג על סנכרון');
			setOffline();
			return;
		}

		const available = await googleDriveSyncProvider.isAvailable();
		if (!available) {
			console.log(TAG, 'Google Drive לא זמין - מדלג על סנכרון');
			return;
		}

		try {
			syncStarted();

			const localState = cloneAppState(globalState.state);
			const ds = deviceState.load();
			const device: DeviceInfo = {
				deviceId: ds.drive.deviceId,
				deviceName: ds.drive.deviceName
			};

			// ─── PULL ──────────────────────────────────────────────────────
			console.log(TAG, 'מבצע pull...');
			const pullResult = await pull(
				googleDriveSyncProvider,
				localState,
				this.lastKnownWriteId,
				db
			);

			const remoteWriteId = pullResult.remoteWriteId;
			const mergedFromRemote = pullResult.merged;

			const shouldApplyRemoteState =
				mergedFromRemote ||
				!this.lastKnownWriteId ||
				this.lastKnownWriteId !== remoteWriteId;

			if (shouldApplyRemoteState && remoteWriteId) {
				console.log(TAG, 'מעדכן local state עם state מהענן');
				globalState.state = pullResult.state;
				globalState.save();
			}

			const stateForUpload = pullResult.state;

			if (remoteWriteId) {
				this.saveLastKnownWriteId(remoteWriteId);
			}

			if (!mergedFromRemote && shouldApplyRemoteState) {
				this.previousState = cloneAppState(stateForUpload);
			} else if (!mergedFromRemote && !shouldApplyRemoteState && pullResult.remoteState) {
				this.previousState = cloneAppState(pullResult.remoteState);
			}

			// ─── החלטה: צריך להעלות? ──────────────────────────────────────
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

			// ─── PUSH ──────────────────────────────────────────────────────
			console.log(TAG, 'מבצע push...');
			const pushResult = await push(
				googleDriveSyncProvider,
				stateForUpload,
				this.previousState,
				this.lastKnownWriteId,
				device,
				db,
				{ forceSnapshot: mergedFromRemote || !this.previousState }
			);

			this.saveLastKnownWriteId(pushResult.writeId);
			this.previousState = cloneAppState(stateForUpload);
			this.retryCount = 0;

			syncSucceeded();
			console.log(TAG, 'סנכרון הושלם בהצלחה', { writeId: pushResult.writeId });
		} catch (error) {
			console.error(TAG, 'שגיאה בסנכרון:', error);

			// אין שינויים — לא נכשיל
			if (error instanceof Error && error.message === 'No changes to backup') {
				this.retryCount = 0;
				this.previousState = cloneAppState(globalState.state);
				syncSucceeded();
				console.log(TAG, 'No changes to backup - מסיים כהצלחה');
				return;
			}

			// טיפול לפי קטגוריית שגיאה
			if (error instanceof SyncError && error.category === 'auth') {
				// שגיאת auth — לא retry, המשתמש צריך להתחבר מחדש
				syncFailed(error.message, 0, 0);
				console.warn(TAG, 'Auth error - לא מנסה שוב');
				return;
			}

			// שגיאות רשת/אחר — retry עם exponential backoff
			if (this.retryCount < MAX_RETRIES) {
				this.retryCount++;
				const delay = Math.pow(2, this.retryCount - 1); // 1, 2, 4, 8, ... 512

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

export const syncController = new SyncController();
