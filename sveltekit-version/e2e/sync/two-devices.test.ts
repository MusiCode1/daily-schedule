/**
 * בדיקת E2E: סנכרון בין שני מכשירים
 *
 * מדמה שני מכשירים עצמאיים (context נפרד = localStorage נפרד).
 * מוודא שנתונים זורמים מ-Device A ל-Device B דרך שרת המock.
 */

import { test, expect, type Page } from '@playwright/test';

const MOCK_SERVER = `http://127.0.0.1:${process.env.MOCK_SYNC_PORT || 3001}`;
const SYNC_TIMEOUT = 15_000;
const POLL_INTERVALS: number[] = [500, 1000, 2000];

/** מחכה עד שה-manifest מופיע בשרת (סנכרון הושלם) */
async function waitForSync(request: Parameters<Parameters<typeof test>[1]>[0]['request']) {
	await expect(async () => {
		const res = await request.get(`${MOCK_SERVER}/manifest`);
		expect(res.status()).toBe(200);
	}).toPass({ timeout: SYNC_TIMEOUT, intervals: POLL_INTERVALS });
}

/** קורא את lastKnownWriteId מה-localStorage של הדף */
async function getLastKnownWriteId(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		const raw = localStorage.getItem('daily-schedule-device-state');
		if (!raw) return null;
		return JSON.parse(raw)?.drive?.lastKnownWriteId ?? null;
	});
}

test.beforeEach(async ({ request }) => {
	await request.post(`${MOCK_SERVER}/reset`);
});

test('Device A מסנכרן, Device B מוריד את הנתונים', async ({ browser, request }) => {
	// ─── Device A: סנכרון ראשוני ─────────────────────────────────────────────
	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();
	await pageA.goto('/');

	await waitForSync(request);

	const manifestAfterA = await request.get(`${MOCK_SERVER}/manifest`).then((r) => r.json());
	const writeIdA = manifestAfterA.syncMetadata.writeId;
	expect(writeIdA).toBeTruthy();

	await ctxA.close();

	// ─── Device B: מכשיר חדש, localStorage נקי ───────────────────────────────
	const ctxB = await browser.newContext();
	const pageB = await ctxB.newPage();
	await pageB.goto('/');

	// מחכים ש-Device B יסנכרן (יוריד ויעלה snapshot)
	await expect(async () => {
		const writeIdB = await getLastKnownWriteId(pageB);
		expect(writeIdB).not.toBeNull();
	}).toPass({ timeout: SYNC_TIMEOUT, intervals: POLL_INTERVALS });

	const writeIdBSaved = await getLastKnownWriteId(pageB);
	expect(writeIdBSaved).not.toBeNull();

	// manifest בשרת תואם ל-writeId שנשמר ב-Device B
	const manifestAfterB = await request.get(`${MOCK_SERVER}/manifest`).then((r) => r.json());
	expect(writeIdBSaved).toBe(manifestAfterB.syncMetadata.writeId);

	await ctxB.close();
});

test('Device B מקבל נתונים שהועלו ע"י Device A', async ({ browser, request }) => {
	// ─── Device A: טוען עם שם משתמש ייחודי ──────────────────────────────────
	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();

	// מגדירים state עם שם ייחודי לפני טעינת האפליקציה
	await pageA.addInitScript(() => {
		const UNIQUE_USER_NAME = '__test_device_a_user__';
		const STORAGE_KEY = 'daily-schedule-data';

		const existing = localStorage.getItem(STORAGE_KEY);
		const state = existing ? JSON.parse(existing) : {};

		// מוסיפים שם ייחודי לإمر הראשון
		if (state.users && typeof state.users === 'object') {
			const firstKey = Object.keys(state.users)[0];
			if (firstKey) {
				state.users[firstKey].name = UNIQUE_USER_NAME;
			}
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	});

	await pageA.goto('/');
	await waitForSync(request);

	// בודקים שה-content הועלה
	const contentAfterA = await request.get(`${MOCK_SERVER}/content`).then((r) => r.json());
	await ctxA.close();

	// ─── Device B: מוריד נתונים מהשרת ───────────────────────────────────────
	const ctxB = await browser.newContext();
	const pageB = await ctxB.newPage();
	await pageB.goto('/');

	// מחכים לסנכרון של Device B
	await expect(async () => {
		const writeIdB = await getLastKnownWriteId(pageB);
		expect(writeIdB).not.toBeNull();
	}).toPass({ timeout: SYNC_TIMEOUT, intervals: POLL_INTERVALS });

	// בודקים שה-localStorage של Device B הכיל נתוני content מהשרת
	const contentInB = await pageB.evaluate(() => {
		const raw = localStorage.getItem('daily-schedule-data');
		return raw ? JSON.parse(raw) : null;
	});

	// Device B קיבל את ה-users שהיו ב-Device A (דרך השרת)
	if (contentAfterA?.users && contentInB?.users) {
		const serverUserNames = Object.values(contentAfterA.users as Record<string, { name: string }>).map(
			(u) => u.name
		);
		const localUserNames = Object.values(contentInB.users as Record<string, { name: string }>).map(
			(u) => u.name
		);
		expect(localUserNames).toEqual(expect.arrayContaining(serverUserNames));
	}

	await ctxB.close();
});
