/**
 * בדיקת E2E: סנכרון ראשון
 *
 * מוודא שהאפליקציה מסנכרנת אוטומטית עם שרת המock בטעינה ראשונה.
 */

import { test, expect } from '@playwright/test';

const MOCK_SERVER = 'http://localhost:3001';

test.beforeEach(async ({ request }) => {
	await request.post(`${MOCK_SERVER}/reset`);
});

test('טעינת אפליקציה מסנכרנת אוטומטית עם השרת', async ({ page, request }) => {
	await page.goto('/');

	// מחכים עד שה-SyncController מסיים את הסנכרון הראשוני.
	// ה-manifest מופיע בשרת רק אחרי push מוצלח.
	await expect(async () => {
		const res = await request.get(`${MOCK_SERVER}/manifest`);
		expect(res.status()).toBe(200);
	}).toPass({ timeout: 15_000, intervals: [500, 1000, 2000] });

	// מוודאים שהתוכן הועלה
	const contentRes = await request.get(`${MOCK_SERVER}/content`);
	expect(contentRes.status()).toBe(200);
	const content = await contentRes.json();
	expect(content.backupSchemaVersion).toBeDefined();
});

test('אחרי סנכרון, deviceState שומר lastKnownWriteId', async ({ page, request }) => {
	await page.goto('/');

	// מחכים לסנכרון
	await expect(async () => {
		const res = await request.get(`${MOCK_SERVER}/manifest`);
		expect(res.status()).toBe(200);
	}).toPass({ timeout: 15_000, intervals: [500, 1000, 2000] });

	// בודקים שה-deviceState עודכן ב-localStorage
	const writeId = await page.evaluate(() => {
		const raw = localStorage.getItem('daily-schedule-device-state');
		if (!raw) return null;
		return JSON.parse(raw)?.drive?.lastKnownWriteId ?? null;
	});

	const manifest = await request.get(`${MOCK_SERVER}/manifest`).then((r) => r.json());

	expect(writeId).not.toBeNull();
	// ה-writeId השמור תואם לזה שבשרת (הסנכרון הצליח)
	expect(writeId).toBe(manifest.syncMetadata.writeId);
});
