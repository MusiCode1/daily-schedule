import { browser } from '$app/environment';
import type { AppState } from '../types';
import { migrationService } from '../services/migration';

export const STORAGE_KEY = 'daily-schedule-data';
export const CURRENT_VERSION = 5;

export const persistence = {
	load(): AppState | null {
		if (!browser) return null;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				// Migrations are applied here
				return this.migrateState(parsed);
			} catch (e) {
				console.error('Failed to load state', e);
				return null;
			}
		}
		return this.migrateFromLegacy();
	},

	save(state: AppState) {
		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		}
	},

	migrateState(parsed: any): AppState {
		return migrationService.migrateState(parsed);
	},

	migrateFromLegacy(): AppState | null {
		return migrationService.migrateFromLegacy();
	}
};
