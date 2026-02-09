/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />
/// <reference types="gapi.auth2" />

import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '$lib/config';
import { deviceState } from '$lib/stores/deviceState';
import type { GoogleAuthStorage } from '$lib/services/migration';

declare global {
	interface Window {
		gapi: typeof gapi;
		google: any;
	}
}

export type DriveStatus =
	| 'uninitialized'
	| 'loading'
	| 'authenticated'
	| 'unauthenticated'
	| 'error';

export class GoogleAuthService {
	private tokenClient: any;
	private accessToken: string | null = null;
	private gapiInited = false;
	private gisInited = false;
	private refreshTimer: any = null;

	private statusListeners: ((status: DriveStatus) => void)[] = [];
	private _status: DriveStatus = 'uninitialized';

	get status() {
		return this._status;
	}

	private set status(newStatus: DriveStatus) {
		this._status = newStatus;
		this.notifyListeners();
	}

	subscribe(listener: (status: DriveStatus) => void) {
		this.statusListeners.push(listener);
		listener(this.status);
		return () => {
			this.statusListeners = this.statusListeners.filter((l) => l !== listener);
		};
	}

	private notifyListeners() {
		this.statusListeners.forEach((l) => l(this.status));
	}

	getAccessToken(): string | null {
		return this.accessToken;
	}

	async initialize(clientIdOverride?: string): Promise<void> {
		if ((this.status as string) === 'authenticated') return;

		this.status = 'loading';
		const clientId = clientIdOverride || GOOGLE_CLIENT_ID;

		if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
			console.warn('Google Client ID is missing');
			this.status = 'error';
			return;
		}

		try {
			// בדיקה מיידית אם חזרנו מ-Redirect (לפני טעינת סקריפטים כבדים)
			if (this.checkRedirectCallback()) {
				this.status = 'authenticated';
				return;
			}

			await Promise.all([this.loadGapi(), this.loadGis()]);

			this.tokenClient = window.google.accounts.oauth2.initTokenClient({
				client_id: clientId,
				scope: GOOGLE_SCOPES,
				callback: (tokenResponse: any) => {
					if (tokenResponse && tokenResponse.access_token) {
						this.setSession(tokenResponse);
					} else {
						this.status = 'unauthenticated';
					}
				},
				error_callback: (error: any) => {
					console.error('Google Auth Error:', error);
					this.handleRefreshFailure();
				}
			});

			this.restoreSession();
			if ((this.status as string) !== 'authenticated') {
				this.status = 'unauthenticated';
			}
		} catch (error) {
			console.error('Failed to initialize Google Drive:', error);
			this.status = 'error';
		}
	}

	signIn() {
		if (!this.tokenClient) return;
		this.tokenClient.requestAccessToken({ prompt: 'consent' });
	}

	signInWithRedirect(clientIdOverride?: string) {
		const clientId = clientIdOverride || GOOGLE_CLIENT_ID;
		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: window.location.origin,
			response_type: 'token',
			scope: GOOGLE_SCOPES,
			include_granted_scopes: 'true',
			state: 'pass-through-value',
			prompt: 'consent'
		});

		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
		window.location.href = authUrl;
	}

	signOut() {
		if (this.accessToken) {
			if (window.google && window.google.accounts && window.google.accounts.oauth2) {
				window.google.accounts.oauth2.revoke(this.accessToken, () => {
					this.clearSession();
				});
			} else {
				this.clearSession();
			}
		} else {
			this.clearSession();
		}
	}

	async getUserInfo() {
		if (!this.accessToken) return null;
		try {
			const res = await window.gapi.client.drive.about.get({
				fields: 'user(displayName, emailAddress, photoLink, permissionId)'
			});
			return res.result.user;
		} catch (e) {
			console.warn('Could not get user info', e);
			return null;
		}
	}

	private setSession(tokenResponse: any) {
		this.accessToken = tokenResponse.access_token;
		this.isTokenExpired = false;
		const expiresIn = tokenResponse.expires_in || 3599;
		const expiryTime = Date.now() + expiresIn * 1000;

		const storageData: GoogleAuthStorage = {
			accessToken: this.accessToken!,
			expiresAt: expiryTime,
			issuedAt: Date.now()
		};

		const existing = deviceState.load().auth.googleAuthStorage;
		if (existing?.user) {
			storageData.user = existing.user;
		}

		deviceState.update((draft) => {
			draft.auth.googleAuthStorage = storageData;
		});

		if (window.gapi && window.gapi.client && this.accessToken) {
			window.gapi.client.setToken({ access_token: this.accessToken });
		}

		// בקשת פרטי משתמש אם חסרים
		if (!storageData.user) {
			this.getUserInfo().then((user) => {
				if (!user || !this.accessToken) return;
				deviceState.update((draft) => {
					if (!draft.auth.googleAuthStorage) return;
					draft.auth.googleAuthStorage.user = {
						id: user.permissionId || '',
						displayName: user.displayName || '',
						email: user.emailAddress || '',
						photoLink: user.photoLink || ''
					};
				});
			});
		}

		this.scheduleTokenRefresh(expiresIn);
		this.status = 'authenticated';
	}

	private restoreSession() {
		// deviceState.load() כולל מיגרציה חד-פעמית של legacy keys (כולל auth).
		const storage = deviceState.load().auth.googleAuthStorage;
		if (storage && storage.accessToken) {
			if (Date.now() < storage.expiresAt) {
				this.accessToken = storage.accessToken;
				if (window.gapi && window.gapi.client) {
					window.gapi.client.setToken({ access_token: this.accessToken });
				}

				const remainingSeconds = (storage.expiresAt - Date.now()) / 1000;
				this.scheduleTokenRefresh(remainingSeconds);
				this.status = 'authenticated';
			} else {
				console.log('Token expired in storage, attempting silent refresh...');
				this.refreshTokenSilently();
			}
		}
	}

	private isTokenExpired = false;

	private scheduleTokenRefresh(expiresInSeconds: number) {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		const refreshTime = (expiresInSeconds - 300) * 1000;
		if (refreshTime <= 0) {
			console.log('Token expiring soon, refreshing now...');
			this.refreshTokenSilently();
		} else {
			console.log(`Scheduling token refresh in ${Math.round(refreshTime / 1000)} seconds.`);
			this.refreshTimer = setTimeout(() => {
				this.refreshTokenSilently();
			}, refreshTime);
		}
	}

	private refreshTokenSilently() {
		if (!this.tokenClient) return;
		console.log('Attempting silent token refresh...');
		try {
			this.tokenClient.requestAccessToken({ prompt: '' });
		} catch (e) {
			console.error('Silent refresh failed synchronously:', e);
			this.handleRefreshFailure();
		}
	}

	private handleRefreshFailure() {
		console.warn('Silent refresh failed (likely blocked). Setting up Smart Retry.');
		this.isTokenExpired = true;
		this.setupSmartRetry();
	}

	private setupSmartRetry() {
		const retryHandler = () => {
			console.log('User interaction detected! Retrying token refresh...');
			document.removeEventListener('click', retryHandler);
			document.removeEventListener('keydown', retryHandler);
			document.removeEventListener('touchstart', retryHandler);
			this.refreshTokenSilently();
		};

		document.addEventListener('click', retryHandler);
		document.addEventListener('keydown', retryHandler);
		document.addEventListener('touchstart', retryHandler);
	}

	private clearSession() {
		this.accessToken = null;
		this.isTokenExpired = false;
		if (this.refreshTimer) clearTimeout(this.refreshTimer);

		deviceState.update((draft) => {
			draft.auth.googleAuthStorage = null;
		});

		if (window.gapi && window.gapi.client) {
			window.gapi.client.setToken(null);
		}

		this.status = 'unauthenticated';
	}

	private loadGapi(): Promise<void> {
		return new Promise((resolve) => {
			if (window.gapi) {
				this.gapiInited = true;
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://apis.google.com/js/api.js';
			script.onload = () => {
				window.gapi.load('client', async () => {
					await window.gapi.client.init({
						discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
					});
					this.gapiInited = true;
					resolve();
				});
			};
			document.body.appendChild(script);
		});
	}

	private loadGis(): Promise<void> {
		return new Promise((resolve) => {
			if (window.google) {
				this.gisInited = true;
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://accounts.google.com/gsi/client';
			script.onload = () => {
				this.gisInited = true;
				resolve();
			};
			document.body.appendChild(script);
		});
	}

	private checkRedirectCallback() {
		const hash = window.location.hash;
		if (hash && hash.includes('access_token')) {
			console.log('Detected detailed OAuth response in URL hash');
			const params = new URLSearchParams(hash.substring(1));
			const accessToken = params.get('access_token');
			const expiresIn = params.get('expires_in');

			if (accessToken) {
				const tokenResponse = {
					access_token: accessToken,
					expires_in: expiresIn ? parseInt(expiresIn) : 3599,
					scope: params.get('scope'),
					token_type: params.get('token_type')
				};

				this.setSession(tokenResponse);
				window.history.replaceState(null, '', window.location.pathname + window.location.search);
				return true;
			}
		}
		return false;
	}
}

export const googleAuthService = new GoogleAuthService();

