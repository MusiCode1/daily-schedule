import { browser } from '$app/environment';
import type { AppState } from '../types';
import { INITIAL_STATE } from '../data/defaults';
import { migrationService } from '../services/migration';

export const STORAGE_KEY = 'daily-schedule-data';
// גרסת ה-state הנוכחית חייבת להיות זהה לגרסה שב-INITIAL_STATE (מקור האמת).
export const CURRENT_VERSION = INITIAL_STATE.version;

export const persistence = {
	load(): AppState | null {
		if (!browser) return null;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				// יישום מיגרציות כאן
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
			state.lastModified = Date.now();
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
