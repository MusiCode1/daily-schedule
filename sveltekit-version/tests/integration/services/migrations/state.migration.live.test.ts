import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrationService } from '$lib/services/migration';
import { INITIAL_STATE } from '$lib/data/defaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findLatestLiveSnapshot(): string | null {
	const snapshotsDir = path.resolve(
		__dirname,
		'../../../../../docs/private-docs/live-snapshots'
	);
	if (!fs.existsSync(snapshotsDir)) return null;

	const candidates = fs
		.readdirSync(snapshotsDir)
		.filter((f) => f.toLowerCase().endsWith('.json'))
		.filter((f) => f.toLowerCase().startsWith('daily-schedule-data.v'))
		.map((f) => path.join(snapshotsDir, f))
		.filter((p) => fs.statSync(p).isFile())
		.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

	return candidates[0] ?? null;
}

function loadJson(filePath: string) {
	const raw = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(raw);
}

describe('State Migration (live snapshot, local only)', () => {
	const livePath = process.env.DAILY_SCHEDULE_LIVE_SNAPSHOT_PATH || findLatestLiveSnapshot();
	const run = livePath && fs.existsSync(livePath) ? it : it.skip;

	run('should migrate a local live snapshot to the latest AppState version', () => {
		// NOTE: הקובץ נמצא תחת docs/private-docs ולכן לא נכנס ל-Git/CI.
		const fixture = loadJson(livePath!);
		const migrated = migrationService.migrateState(fixture);

		expect(migrated.version).toBe(INITIAL_STATE.version);
		expect(typeof migrated.users).toBe('object');
		expect(typeof migrated.lists).toBe('object');
		expect(typeof migrated.images).toBe('object');
		expect(typeof migrated.people).toBe('object');
		expect(typeof migrated.settings?.activeListId).toBe('object');
		expect(typeof migrated.localDevice?.lastActiveTime).toBe('number');
		expect(typeof migrated.localDevice?.lastModified).toBe('number');
	});
});
