import { GOOGLE_CLIENT_ID } from '$lib/config';
import { TEXTS } from '$lib/data/texts';
import { createLogger } from '$lib/logger';

const log = createLogger('DriveBackupSettings');
import { syncController } from '$lib/logic/syncController.svelte';
import { googleAuthService, type DriveStatus } from '$lib/services/drive/googleAuthService';
import { dailyScheduleBackupRepo } from '$lib/services/drive/dailyScheduleBackupRepo';
import { deviceState } from '$lib/stores/deviceState';
import { syncStatus } from '$lib/stores/syncStore';
import { get } from 'svelte/store';

type DriveUserInfo = {
	displayName?: string;
	emailAddress?: string;
	photoLink?: string;
};

export class DriveBackupSettingsController {
	isConnected = $state(false);
	isLoading = $state(true);
	isSyncingNow = $state(false);
	status = $state<DriveStatus>('uninitialized');
	errorMessage = $state('');
	successMessage = $state('');
	userInfo: DriveUserInfo | null = $state(null);
	lastRemoteBackupTime: number | null = $state(null);

	customClientId = $state('');
	useRedirectMode = $state(false);
	isAutoBackupEnabled = $state(true);

	constructor() {
		if (typeof window === 'undefined') return;

		this.loadLocalSettings();

		googleAuthService.subscribe((status) => {
			void this.handleAuthStatusChange(status);
		});

		void this.initialize();
	}

	private loadLocalSettings() {
		const ds = deviceState.load();
		this.customClientId = ds.drive.clientIdOverride || '';
		this.useRedirectMode = ds.drive.useRedirectMode;
		this.isAutoBackupEnabled = ds.drive.autoBackupEnabled;
	}

	saveLocalSettings() {
		deviceState.update((draft) => {
			draft.drive.clientIdOverride = this.customClientId || '';
			draft.drive.useRedirectMode = this.useRedirectMode;
			draft.drive.autoBackupEnabled = this.isAutoBackupEnabled;
		});
	}

	private async handleAuthStatusChange(status: DriveStatus) {
		this.status = status;
		this.isConnected = status === 'authenticated';

		if (this.isConnected) {
			await this.loadUserInfo();
			await this.refreshLastRemoteBackupTime();
			return;
		}

		this.userInfo = null;
		this.lastRemoteBackupTime = null;
	}

	async initialize() {
		this.isLoading = true;
		this.errorMessage = '';
		try {
			await googleAuthService.initialize(this.customClientId || GOOGLE_CLIENT_ID);
		} catch (error) {
			log.error('initialize נכשל', error);
			this.errorMessage = TEXTS.ERROR_GENERIC;
		} finally {
			this.isLoading = false;
		}
	}

	signIn() {
		this.errorMessage = '';
		this.successMessage = '';
		this.saveLocalSettings();

		if (this.useRedirectMode) {
			googleAuthService.signInWithRedirect(this.customClientId || GOOGLE_CLIENT_ID);
			return;
		}

		void googleAuthService
			.initialize(this.customClientId || GOOGLE_CLIENT_ID)
			.then(() => {
				googleAuthService.signIn();
			})
			.catch((error) => {
				log.error('signIn init נכשל', error);
				this.errorMessage = TEXTS.ERROR_GENERIC;
			});
	}

	signOut() {
		this.errorMessage = '';
		this.successMessage = '';
		googleAuthService.signOut();
	}

	async syncNow() {
		if (!this.isConnected || this.isSyncingNow) return;

		this.isSyncingNow = true;
		this.errorMessage = '';
		this.successMessage = '';

		try {
			await syncController.sync({ manual: true });
			const currentStatus = get(syncStatus);
			if (currentStatus.status === 'error') {
				throw new Error(currentStatus.errorMessage || 'Sync failed');
			}
			await this.refreshLastRemoteBackupTime();
			this.successMessage = TEXTS.BACKUP_SUCCESS;
		} catch (error) {
			log.error('syncNow נכשל', error);
			this.errorMessage = TEXTS.ERROR_GENERIC;
		} finally {
			this.isSyncingNow = false;
		}
	}

	async refreshLastRemoteBackupTime() {
		try {
			const meta = await dailyScheduleBackupRepo.findV2ManifestMeta();
			if (!meta?.modifiedTime) {
				this.lastRemoteBackupTime = null;
				return;
			}

			const parsedTime = Date.parse(meta.modifiedTime);
			this.lastRemoteBackupTime = Number.isNaN(parsedTime) ? null : parsedTime;
		} catch (error) {
			log.warn('קריאת זמן גיבוי אחרון נכשלה', error);
			this.lastRemoteBackupTime = null;
		}
	}

	private async loadUserInfo() {
		const info = await googleAuthService.getUserInfo();
		this.userInfo = info || null;
	}
}

export const driveBackupSettingsController = new DriveBackupSettingsController();
