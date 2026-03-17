import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrationService } from '$lib/services/migration';
import { INITIAL_STATE } from '$lib/data/defaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixtureJson(filePath: string) {
	const raw = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(raw);
}

describe('State Migration Fixtures', () => {
	it('should migrate all fixtures to the latest AppState version', () => {
		const fixturesDir = path.resolve(__dirname, '../../../fixtures/state');
		const fixtureFiles = fs
			.readdirSync(fixturesDir)
			.filter((f) => f.toLowerCase().endsWith('.json'))
			.sort();

		expect(fixtureFiles.length).toBeGreaterThan(0);

		for (const fileName of fixtureFiles) {
			const fixturePath = path.join(fixturesDir, fileName);
			const fixture = loadFixtureJson(fixturePath);
			const migrated = migrationService.migrateState(fixture);

			expect(migrated.version, `fixture ${fileName} should migrate to latest version`).toBe(
				INITIAL_STATE.version
			);
			expect(typeof migrated.users, `fixture ${fileName} users should be object`).toBe('object');
			expect(typeof migrated.lists, `fixture ${fileName} lists should exist`).toBe('object');
			expect(typeof migrated.images, `fixture ${fileName} images should exist`).toBe('object');
			expect(typeof migrated.people, `fixture ${fileName} people should be object`).toBe('object');
			expect(typeof migrated.settings?.activeListId, `fixture ${fileName} settings.activeListId should exist`).toBe(
				'object'
			);
			expect(
				typeof migrated.localDevice?.lastActiveTime,
				`fixture ${fileName} localDevice.lastActiveTime should exist`
			).toBe('number');
			expect(
				typeof migrated.localDevice?.lastModified,
				`fixture ${fileName} localDevice.lastModified should exist`
			).toBe('number');

			// בדיקה שכל רשימה יש לה order אחרי מיגרציה
			for (const userId of Object.keys(migrated.lists)) {
				for (const list of Object.values(migrated.lists[userId]) as any[]) {
					expect(
						typeof list.order,
						`list "${list.name}" in ${fileName} should have order`
					).toBe('number');
				}
			}
		}
	});
});
