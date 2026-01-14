import { persistence, CURRENT_VERSION } from './persistence';
import { INITIAL_STATE } from '../data/defaults';
import type { AppState } from '../types';

class GlobalState {
	state = $state<AppState>({ ...INITIAL_STATE, version: CURRENT_VERSION });

	constructor() {
		const loaded = persistence.load();
		if (loaded) {
			this.state = loaded;

			// אתחול מיגרציה אסינכרונית לתמונות
			import('$lib/services/migration').then(({ migrationService }) => {
				migrationService.migrateImagesToDB(this.state).then((migratedState) => {
					this.state = migratedState;
					this.save();
				});
			});
		}
	}

	save() {
		persistence.save(this.state);
		// טריגר לגיבוי אוטומטי (דינמי כדי למנוע מעגליות אם קיימת, אם כי כאן זה לא אמור להפריע)
		import('../logic/backupController.svelte').then(({ backupController }) => {
			backupController.notifyDataChanged();
		});
	}
}

export const globalState = new GlobalState();
