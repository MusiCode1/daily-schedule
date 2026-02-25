import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '$lib/data/defaults';
import {
	buildContentPayload,
	buildProgressPayload,
	collectAssetIds
} from '$lib/services/sync/payloads';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '$lib/services/sync/constants';

describe('Drive V2 backup payload builders', () => {
	it('buildContentPayload should exclude progress/volatile fields', () => {
		const state = JSON.parse(JSON.stringify(INITIAL_STATE));
		const content = buildContentPayload(state);

		expect(content.backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
		expect(content.appStateVersion).toBe(state.version);

		// settings אמור להכיל רק childLockEnabled (ללא lastActiveTime)
		expect(content.settings).toEqual({ childLockEnabled: false });

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
		const firstUserId = Object.keys(state.users)[0];
		const firstListId = Object.keys(state.lists[firstUserId])[0];
		const firstTaskId = Object.keys(state.lists[firstUserId][firstListId].tasks)[0];
		state.lists[firstUserId][firstListId].tasks[firstTaskId].isDone = true;

		const progress = buildProgressPayload(state);

		expect(progress.backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
		expect(progress.taskDone[firstTaskId]).toBe(true);
	});

	it('changing isDone should not change content payload structure', () => {
		const a = JSON.parse(JSON.stringify(INITIAL_STATE));
		const b = JSON.parse(JSON.stringify(INITIAL_STATE));

		const firstUserId = Object.keys(b.users)[0];
		const firstListId = Object.keys(b.lists[firstUserId])[0];
		const firstTaskId = Object.keys(b.lists[firstUserId][firstListId].tasks)[0];
		b.lists[firstUserId][firstListId].tasks[firstTaskId].isDone =
			!b.lists[firstUserId][firstListId].tasks[firstTaskId].isDone;

		const contentA = buildContentPayload(a);
		const contentB = buildContentPayload(b);

		expect(contentA).toEqual(contentB);
	});

	it('collectAssetIds should include all idb: refs and exclude /images/*', () => {
		const state = JSON.parse(JSON.stringify(INITIAL_STATE));
		const firstUserId = Object.keys(state.users)[0];
		const firstPersonId = Object.keys(state.people)[0];
		const firstListId = Object.keys(state.lists[firstUserId])[0];
		const firstTaskId = Object.keys(state.lists[firstUserId][firstListId].tasks)[0];

		// הזרקה של כמה refs סינתטיים
		state.users[firstUserId].avatar = 'idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
		state.people[firstPersonId].avatar = 'idb:11111111-2222-3333-4444-555555555555';
		state.lists[firstUserId][firstListId].logo = '/images/times/list_morning_sun.png';
		state.lists[firstUserId][firstListId].tasks[firstTaskId].imageSrc =
			'idb:99999999-8888-7777-6666-555555555555';
		state.images['idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'] = { crop: { x: 1, y: 2, scale: 1.1 } };

		const ids = collectAssetIds(state);

		expect(ids).toContain('idb:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
		expect(ids).toContain('idb:11111111-2222-3333-4444-555555555555');
		expect(ids).toContain('idb:99999999-8888-7777-6666-555555555555');
		expect(ids.some((x) => x.startsWith('/images/'))).toBe(false);
	});
});
