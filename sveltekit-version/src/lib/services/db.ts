import { browser } from '$app/environment';

const DB_NAME = 'daily-schedule-db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

class DBService {
	private db: IDBDatabase | null = null;
	private initPromise: Promise<void> | null = null;

	constructor() {
		if (browser) {
			this.init();
		}
	}

	async init() {
		if (!browser) return;
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
			};
		});

		return this.initPromise;
	}

	async saveImage(blob: Blob): Promise<string> {
		await this.init();
		return new Promise((resolve, reject) => {
			if (!this.db) return reject('Database not initialized');

			const transaction = this.db.transaction([STORE_NAME], 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const id = `idb:${crypto.randomUUID()}`;

			const request = store.put(blob, id);

			request.onsuccess = () => resolve(id);
			request.onerror = () => reject('Failed to save image');
		});
	}

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
}

export const db = new DBService();
