import { writable } from 'svelte/store';

export type SyncStatus = 'idle' | 'uploading' | 'downloading' | 'processing';

export const syncState = writable({
	status: 'idle' as SyncStatus,
	progress: 0, // 0-100
	message: '' // טקסט תיאורי (למשל: "מעלה גיבוי...", "מוריד נתונים...")
});

export const setSyncStatus = (status: SyncStatus, message: string = '', progress: number = 0) => {
	syncState.set({ status, message, progress });
};

export const resetSyncStatus = () => {
	syncState.set({ status: 'idle', progress: 0, message: '' });
};
