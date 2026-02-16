import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '$lib/data/defaults';
import {
	buildContentPayload,
	buildProgressPayload,
	collectAssetIds
} from '$lib/services/drive/backupPayloads';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '$lib/services/drive/constants';

describe('Drive V2 backup payload builders', () => {
	it('buildContentPayload should exclude progress/volatile fields', () => {
		const state = JSON.parse(JSON.stringify(INITIAL_STATE));
		const content = buildContentPayload(state);

		expect(content.backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
		expect(content.appStateVersion).toBe(state.version);

		// settings אמור להיות אובייקט ריק (ללא lastActiveTime)
		expect(content.settings).toEqual({});

		// בדיקה ש-isDone לא מופיע באף משימה
		for (const userId of Object.keys(content.lists)) {
			const userLists = content.lists[userId];
			for (const list of Object.values(userLists)) {
				for (const task of Object.values((list as any).tasks) as any[]) {
					expect('isDone' in task).toBe(false);
				}
			}
		}
	});

	it('buildProgressPayload should include taskDone and exclude everything else', () => {
		const state = JSON.parse(JSON.stringify(INITIAL_STATE));
		state.lists[state.users[0].id][0].tasks[0].isDone = true;

		const progress = buildProgressPayload(state);

		expect(progress.backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
		const firstTaskId = state.lists[state.users[0].id][0].tasks[0].id;
		expect(progress.taskDone[firstTaskId]).toBe(true);
	});

	it('changing isDone should not change content payload structure', () => {
		const a = JSON.parse(JSON.stringify(INITIAL_STATE));
		const b = JSON.parse(JSON.stringify(INITIAL_STATE));

		b.lists[b.users[0].id][0].tasks[0].isDone = !b.lists[b.users[0].id][0].tasks[0].isDone;

		const contentA = buildContentPayload(a);
		const contentB = buildContentPayload(b);

		expect(contentA).toEqual(contentB);
	});

	it('collectAssetIds should include all idb: refs and exclude /images/*', () => {
		const state = JSON.parse(JSON.stringify(INITIAL_STATE));
		// הזרקה של כמה refs סינתטיים
		state.users[0].avatar = 'idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
		state.people[0].avatar = 'idb:11111111-2222-3333-4444-555555555555';
		state.lists[state.users[0].id][0].logo = '/images/times/list_morning_sun.png';
		state.lists[state.users[0].id][0].tasks[0].imageSrc = 'idb:99999999-8888-7777-6666-555555555555';
		state.images['idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'] = { crop: { x: 1, y: 2, scale: 1.1 } };

		const ids = collectAssetIds(state);

		expect(ids).toContain('idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
		expect(ids).toContain('idb:11111111-2222-3333-4444-555555555555');
		expect(ids).toContain('idb:99999999-8888-7777-6666-555555555555');
		expect(ids.some((x) => x.startsWith('/images/'))).toBe(false);
	});
});
