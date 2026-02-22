import { browser } from '$app/environment';
import { INITIAL_STATE } from '../data/defaults';
import type { AppState } from '../types';
import { migrationService } from '$lib/services/migration';

const STORAGE_KEY = 'daily-schedule-data';

function loadState(): AppState | null {
	if (!browser) return null;

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			return migrationService.migrateState(parsed);
		} catch (e) {
			console.error('Failed to load state', e);
			return null;
		}
	}
	return migrationService.migrateFromLegacy();
}

function saveState(state: AppState) {
	if (browser) {
		state.lastModified = Date.now();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}
}

class GlobalState {
	state = $state<AppState>({ ...INITIAL_STATE });

	constructor() {
		const loaded = loadState();
		if (loaded) {
			this.state = loaded;

			migrationService.migrateImagesToDB(this.state).then((migratedState) => {
				this.state = migratedState;
				this.save();
			});
		}
	}

	save() {
		saveState(this.state);
		import('../logic/syncController.svelte').then(({ syncController }) => {
			syncController.triggerSync();
		});
	}
}

export const globalState = new GlobalState();
