import { SvelteURL } from "svelte/reactivity";
import { FullyKioskClient } from './fullyKioskClient';
import type { AppListItem, DeviceInfoResponse, RecentApp } from './fullyKioskTypes';
import { KIOSK_TEXTS } from './texts';

// localStorage keys
const KEY_URL = 'fully-kiosk-url';
const KEY_PASS = 'fully-kiosk-password';
const KEY_WEBSITES = 'fully-kiosk-websites';
const KEY_RECENT_APPS = 'fully-kiosk-recent-apps';

const DEFAULT_WEBSITES: SavedWebsite[] = [
	{ label: 'מערכת משימות', url: 'https://daily-schedule.pages.dev/', logoUrl: 'https://daily-schedule.pages.dev/icons/icon.svg' },
	{ label: "ג'ינג'ים — משחקים לימודיים", url: 'https://gingim.net/games/' },
	{ label: 'פאזל', url: 'https://puzzle.aybritman.workers.dev/' },
];

export interface SavedWebsite {
	label: string;
	url: string;
	logoUrl?: string;
}

export function extractDomain(url: string): string {
	try {
		return new SvelteURL(url).hostname;
	} catch {
		return url;
	}
}

/**
 * Controller עבור מסך ניהול קיוסק פולי.
 * משתמש ב-class כדי לאפשר ייצוא תקין של $state בSvelte 5.
 */
class KioskController {
	baseUrl = $state('');
	password = $state('');
	deviceInfo = $state<DeviceInfoResponse | null>(null);
	websites = $state<SavedWebsite[]>([]);
	isConnecting = $state(false);
	isLoading = $state(false);
	appsLoading = $state(false);
	appList = $state<AppListItem[]>([]);
	recentApps = $state<RecentApp[]>([]);
	feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

	// --- כלי עזר ---

	private getClient(): FullyKioskClient {
		return new FullyKioskClient(this.baseUrl, this.password);
	}

	private showFeedback(type: 'success' | 'error', message: string) {
		if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
		this.feedback = { type, message };
		this.feedbackTimer = setTimeout(() => {
			this.feedback = null;
		}, 3000);
	}

	// --- אחסון ---

	loadFromStorage() {
		this.baseUrl = localStorage.getItem(KEY_URL) ?? '';
		this.password = localStorage.getItem(KEY_PASS) ?? '';
		const stored = localStorage.getItem(KEY_WEBSITES);
		this.websites = stored ? (JSON.parse(stored) as SavedWebsite[]) : DEFAULT_WEBSITES;
		const storedRecents = localStorage.getItem(KEY_RECENT_APPS);
		this.recentApps = storedRecents ? (JSON.parse(storedRecents) as RecentApp[]) : [];
	}

	private saveConnectionToStorage() {
		localStorage.setItem(KEY_URL, this.baseUrl);
		localStorage.setItem(KEY_PASS, this.password);
	}

	private saveWebsitesToStorage() {
		localStorage.setItem(KEY_WEBSITES, JSON.stringify(this.websites));
	}

	// --- פעולות ---

	async connect() {
		if (!this.baseUrl) return;
		this.isConnecting = true;
		this.deviceInfo = null;
		try {
			const info = await this.getClient().getDeviceInfo();
			// getDeviceInfo מחזיר JSON ישיר ללא שדה status — בודקים לפי deviceId
			if (info?.deviceId || info?.deviceName) {
				this.deviceInfo = info;
				this.saveConnectionToStorage();
			} else {
				this.showFeedback('error', KIOSK_TEXTS.ERROR_CONNECTION);
			}
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_CONNECTION);
		} finally {
			this.isConnecting = false;
		}
	}

	async enableKioskMode() {
		this.isLoading = true;
		try {
			await this.getClient().enableKioskMode();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_LOCKED);
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async disableKioskMode() {
		this.isLoading = true;
		try {
			await this.getClient().disableKioskMode();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_UNLOCKED);
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async navigateToUrl(url: string) {
		this.isLoading = true;
		try {
			await this.getClient().loadUrl(url);
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_NAVIGATED);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toggleScreen() {
		if (!this.deviceInfo) return;
		this.isLoading = true;
		try {
			if (this.deviceInfo.screenOn) {
				await this.getClient().screenOff();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_SCREEN_OFF);
			} else {
				await this.getClient().screenOn();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_SCREEN_ON);
			}
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toForeground() {
		this.isLoading = true;
		try {
			await this.getClient().toForeground();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_FOREGROUND);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toBackground() {
		this.isLoading = true;
		try {
			await this.getClient().toBackground();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_BACKGROUND);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async loadApps() {
		this.appsLoading = true;
		try {
			const list = await this.getClient().getAppsList();
			this.appList = list.sort((a, b) => a.label.localeCompare(b.label));
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.appsLoading = false;
		}
	}

	async launchApp(packageName: string) {
		if (!packageName.trim()) return;
		this.isLoading = true;
		try {
			await this.getClient().startApplication(packageName.trim());
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_APP_LAUNCHED);
			// שמירת האפליקציה ברשימת האחרונות
			const appInfo =
				this.appList.find(a => a.package === packageName) ??
				this.recentApps.find(a => a.package === packageName);
			if (appInfo) {
				const recent: RecentApp = { package: appInfo.package, label: appInfo.label, icon: appInfo.icon };
				this.recentApps = [recent, ...this.recentApps.filter(a => a.package !== packageName)].slice(0, 5);
				localStorage.setItem(KEY_RECENT_APPS, JSON.stringify(this.recentApps));
			}
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async loadStartUrl() {
		this.isLoading = true;
		try {
			await this.getClient().loadStartUrl();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_START_URL);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	addWebsite(label: string, url: string, logoUrl?: string) {
		this.websites = [...this.websites, { label, url, logoUrl: logoUrl || undefined }];
		this.saveWebsitesToStorage();
	}

	removeWebsite(index: number) {
		this.websites = this.websites.filter((_, i) => i !== index);
		this.saveWebsitesToStorage();
	}

	disconnect() {
		this.deviceInfo = null;
	}

	async refresh() {
		this.isConnecting = true;
		try {
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_CONNECTION);
		} finally {
			this.isConnecting = false;
		}
	}
}

export const ctrl = new KioskController();
