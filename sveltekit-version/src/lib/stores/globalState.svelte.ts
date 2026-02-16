import { persistence } from './persistence';
import { INITIAL_STATE } from '../data/defaults';
import type { AppState } from '../types';
import { migrationService } from '$lib/services/migration';

class GlobalState {
	state = $state<AppState>({ ...INITIAL_STATE });

	constructor() {
		const loaded = persistence.load();
		if (loaded) {
			this.state = loaded;

			// אתחול מיגרציה אסינכרונית לתמונות
			migrationService.migrateImagesToDB(this.state).then((migratedState) => {
				this.state = migratedState;
				this.save();
			});
		}
	}

	save() {
		persistence.save(this.state);
		// טריגר לסנכרון אוטומטי (המערכת החדשה)
		import('../logic/syncController.svelte').then(({ syncController }) => {
			syncController.triggerSync();
		});
	}
}

export const globalState = new GlobalState();
