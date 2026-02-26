import { browser } from '$app/environment';
import type { SyncHistory } from './sync/engine/types';

const DB_NAME = 'daily-schedule-db';
const DB_VERSION = 2;
const STORE_NAME = 'images';
const SYNC_HISTORY_STORE = 'sync-history';
const SYNC_HISTORY_KEY = 'current';

/**
 * שירות IndexedDB לניהול תמונות/נכסים בינאריים.
 * משמש את מערכת הסנכרון לאחסון מקומי של נכסים (blobs) שנמשכו מ-remote
 * תחת מפתחות בפורמט `idb:<uuid>`.
 */
class DBService {
	private db: IDBDatabase | null = null;
	private initPromise: Promise<void> | null = null;

	constructor() {
		// הגנה: בבדיקות/סביבות לא-דפדפן יכול להיות שהוגדר browser=true (mock)
		// אבל אין IndexedDB בפועל.
		if (browser && typeof indexedDB !== 'undefined') {
			this.init();
		}
	}

	async init() {
		if (!browser || typeof indexedDB === 'undefined') return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = (event) => {
				console.error('IndexedDB error:', event);
				reject('Failed to open database');
			};

			request.onsuccess = (event) => {
				this.db = (event.target as IDBOpenDBRequest).result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME);
				}
				if (!db.objectStoreNames.contains(SYNC_HISTORY_STORE)) {
					db.createObjectStore(SYNC_HISTORY_STORE);
				}
			};
		});

		return this.initPromise;
	}

	/**
	 * שומרת תמונה/blob ב-IndexedDB.
	 * בסנכרון — משמשת לאחסון נכסים שנמשכו מ-remote.
	 * @param blob - תוכן בינארי לשמירה
	 * @param idOverride - מפתח קיים לעדכון (חייב להתחיל ב-`idb:`), או undefined ליצירת חדש
	 * @returns מפתח ה-blob בפורמט `idb:<uuid>`
	 */
	async saveImage(blob: Blob, idOverride?: string): Promise<string> {
		await this.init();
		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const id =
				typeof idOverride === 'string' && idOverride.startsWith('idb:')
					? idOverride
					: `idb:${crypto.randomUUID()}`;

			const request = store.put(blob, id);

			request.onsuccess = () => resolve(id);
			request.onerror = () => reject('Failed to save image');
		});
	}

	/**
	 * מחזירה תמונה/blob מ-IndexedDB לפי מפתח.
	 * @param id - מפתח ה-blob (חייב להתחיל ב-`idb:`)
	 * @returns Blob או null אם לא נמצא
	 */
	async getImage(id: string): Promise<Blob | null> {
		if (!id.startsWith('idb:')) return null;
		await this.init();

		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([STORE_NAME], 'readonly');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onsuccess = () => {
				resolve((request.result as Blob) || null);
			};
			request.onerror = () => reject('Failed to get image');
		});
	}

	/**
	 * מוחקת תמונה/blob מ-IndexedDB לפי מפתח.
	 * @param id - מפתח ה-blob (חייב להתחיל ב-`idb:`)
	 */
	async deleteImage(id: string): Promise<void> {
		if (!id.startsWith('idb:')) return;
		await this.init();

		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(id);

			request.onsuccess = () => resolve();
			request.onerror = () => reject('Failed to delete image');
		});
	}

	// ─── Sync History ────────────────────────────────────────────────────────

	/**
	 * שמירת היסטוריית סנכרון ב-IndexedDB.
	 * ההיסטוריה נשמרת תחת מפתח יחיד ('current') — תמיד snapshot אחרון.
	 * @param history - היסטוריית הסנכרון לשמירה
	 */
	async saveSyncHistory(history: SyncHistory): Promise<void> {
		await this.init();
		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([SYNC_HISTORY_STORE], 'readwrite');
			const store = transaction.objectStore(SYNC_HISTORY_STORE);
			const request = store.put(history, SYNC_HISTORY_KEY);

			request.onsuccess = () => resolve();
			request.onerror = () => reject('Failed to save sync history');
		});
	}

	/**
	 * קריאת היסטוריית סנכרון מ-IndexedDB.
	 * @returns היסטוריית סנכרון, או null אם אין
	 */
	async getSyncHistory(): Promise<SyncHistory | null> {
		await this.init();
		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([SYNC_HISTORY_STORE], 'readonly');
			const store = transaction.objectStore(SYNC_HISTORY_STORE);
			const request = store.get(SYNC_HISTORY_KEY);

			request.onsuccess = () => resolve((request.result as SyncHistory) || null);
			request.onerror = () => reject('Failed to get sync history');
		});
	}

	/**
	 * מחיקת היסטוריית סנכרון מ-IndexedDB.
	 */
	async deleteSyncHistory(): Promise<void> {
		await this.init();
		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([SYNC_HISTORY_STORE], 'readwrite');
			const store = transaction.objectStore(SYNC_HISTORY_STORE);
			const request = store.delete(SYNC_HISTORY_KEY);

			request.onsuccess = () => resolve();
			request.onerror = () => reject('Failed to delete sync history');
		});
	}
}

/** singleton של שירות IndexedDB — משמש לאחסון נכסים בינאריים מקומית */
export const db = new DBService();
