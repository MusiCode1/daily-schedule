import { TEXTS } from '$lib/data/texts';
import { globalState } from '$lib/stores/globalState.svelte';
import { deviceState } from '$lib/stores/deviceState';
import { db } from '$lib/services/db';
import { fileSyncProvider } from '$lib/services/sync/providers/file/fileSyncProvider';
import { push, importFromProvider, type DeviceInfo } from '$lib/services/sync/syncOrchestrator';

const TAG = '[FileSyncSettings]';
const MESSAGE_TIMEOUT = 5000;

/**
 * Controller לניהול ייצוא/ייבוא קבצי גיבוי ZIP.
 * משתמש ב-fileSyncProvider + syncOrchestrator.
 */
export class FileSyncSettingsController {
	isExporting = $state(false);
	isImporting = $state(false);
	errorMessage = $state('');
	successMessage = $state('');

	/** ייצוא: push דרך ה-orchestrator — fileSyncProvider.commit() בונה ZIP ומפעיל הורדה */
	async exportZip(): Promise<void> {
		if (this.isExporting) return;
		this.isExporting = true;
		this.clearMessages();

		try {
			const state = $state.snapshot(globalState.state);
			const ds = deviceState.load();
			const device: DeviceInfo = {
				deviceId: ds.drive.deviceId,
				deviceName: ds.drive.deviceName
			};

			await push(
				fileSyncProvider,
				state,
				null, // previousState — null כדי לכפות snapshot מלא
				null, // lastKnownWriteId — null לייצוא חד-פעמי
				device,
				db,
				{ forceSnapshot: true }
			);

			this.successMessage = TEXTS.FILE_EXPORT_SUCCESS;
		} catch (error) {
			console.error(TAG, 'export failed', error);
			this.errorMessage = TEXTS.FILE_EXPORT_ERROR;
		} finally {
			this.isExporting = false;
			this.scheduleMessageClear();
		}
	}

	/** ייבוא: טוען ZIP, בונה state דרך ה-orchestrator, מחיל על globalState */
	async importZip(file: File): Promise<void> {
		if (this.isImporting) return;
		this.isImporting = true;
		this.clearMessages();

		try {
			// טעינת ה-ZIP לתוך fileSyncProvider
			await fileSyncProvider.loadZip(file);

			// בניית AppState מתוכן ה-ZIP
			const importedState = await importFromProvider(fileSyncProvider, db);

			// עדכון ה-state המקומי
			globalState.state = importedState;
			globalState.save();

			this.successMessage = TEXTS.FILE_IMPORT_SUCCESS;
		} catch (error) {
			console.error(TAG, 'import failed', error);
			this.errorMessage = TEXTS.FILE_IMPORT_ERROR;
		} finally {
			fileSyncProvider.clearLoadedZip();
			this.isImporting = false;
			this.scheduleMessageClear();
		}
	}

	private clearMessages() {
		this.errorMessage = '';
		this.successMessage = '';
	}

	private scheduleMessageClear() {
		setTimeout(() => this.clearMessages(), MESSAGE_TIMEOUT);
	}
}

export const fileSyncSettingsController = new FileSyncSettingsController();
