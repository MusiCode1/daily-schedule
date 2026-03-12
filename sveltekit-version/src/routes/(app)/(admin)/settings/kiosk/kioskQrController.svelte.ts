import QRCode from 'qrcode';
import { TEXTS } from '$lib/services/language';
import { KIOSK_PROXY_PORT, KIOSK_ADMIN_URL } from '$lib/config';

const proxyPort = KIOSK_PROXY_PORT; // פורט ברירת המחדל של Fully Kiosk Remote Admin

class KioskQrController {
	qrDataUrl = $state('');
	deviceIp = $state('');
	loading = $state(true);
	error = $state('');
	isFullyKiosk = $state(false);

	async load() {
		this.loading = true;
		this.error = '';
		this.qrDataUrl = '';
		this.deviceIp = '';

		if (typeof window === 'undefined' || !('fully' in window)) {
			this.isFullyKiosk = false;
			this.loading = false;
			return;
		}

		this.isFullyKiosk = true;

		try {
			const isEnabled = (window as any).fully.getBooleanSetting('remoteAdmin');
			if (isEnabled === 'false') {
				this.error = 'ניהול מרוחק אינו מופעל ב-Fully Kiosk. יש להפעיל Remote Admin בהגדרות.';
				this.loading = false;
				return;
			}

			const password = (window as any).fully.getStringRawSetting('remoteAdminPassword');
			if (!password) {
				this.error = TEXTS.KIOSK_QR_ERROR;
				this.loading = false;
				return;
			}

			// קריאת ה-IP מה-API המקומי של Fully Kiosk
			const params = new URLSearchParams({ cmd: 'deviceInfo', type: 'json', password });
			const response = await fetch(`http://127.0.0.1:${proxyPort}/?${params}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const info = await response.json();
			const ip = info.ip4 as string;
			if (!ip) {
				this.error = 'לא ניתן לקרוא את כתובת ה-IP של המכשיר';
				this.loading = false;
				return;
			}

			this.deviceIp = ip;

			const adminBaseUrl = KIOSK_ADMIN_URL;
			const payload = btoa(JSON.stringify({ ip, password, port: 2323 }));
			const adminUrl = `${adminBaseUrl}?auth=${payload}`;

			this.qrDataUrl = await QRCode.toDataURL(adminUrl, {
				width: 300,
				margin: 2,
				errorCorrectionLevel: 'M'
			});
		} catch (e) {
			this.error = TEXTS.KIOSK_QR_ERROR;
			console.error('שגיאה בטעינת QR:', e);
		} finally {
			this.loading = false;
		}
	}
}

export const qrCtrl = new KioskQrController();
