/**
 * בדיקת E2E: סנכרון דו-כיווני בין שני מכשירים
 *
 * תרחיש:
 * 1. Device A ו-Device B מסנכרנים בפעם הראשונה (baseline)
 * 2. Device A מוסיף משימה, מסנכרן → Device B מסנכרן ובודק שקיבל אותה
 * 3. Device B מוסיף משימה, מסנכרן → Device A מסנכרן ובודק שקיבל אותה
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const MOCK_SERVER = 'http://localhost:3001';
const SYNC_TIMEOUT = 20_000;
const POLL_INTERVALS: number[] = [500, 1000, 2000];
const BACKUP_PAGE = '/settings/backup';

// ─── עזרים ──────────────────────────────────────────────────────────────────

/** מחכה עד שה-writeId בשרת משתנה מהערך הנתון */
async function waitForNewWriteId(request: APIRequestContext, previousWriteId: string | null): Promise<string> {
	let newWriteId = '';
	await expect(async () => {
		const res = await request.get(`${MOCK_SERVER}/manifest`);
		expect(res.status()).toBe(200);
		const manifest = await res.json();
		newWriteId = manifest.syncMetadata.writeId;
		if (previousWriteId) {
			expect(newWriteId).not.toBe(previousWriteId);
		}
	}).toPass({ timeout: SYNC_TIMEOUT, intervals: POLL_INTERVALS });
	return newWriteId;
}

/** קורא את ה-writeId מ-localStorage */
async function getLastKnownWriteId(page: Page): Promise<string | null> {
	return page.evaluate(() => {
		const raw = localStorage.getItem('daily-schedule-device-state');
		if (!raw) return null;
		return JSON.parse(raw)?.drive?.lastKnownWriteId ?? null;
	});
}

/** מחכה עד שה-writeId ב-localStorage של הדף תואם לערך מסוים */
async function waitForDeviceWriteId(page: Page, expectedWriteId: string) {
	await expect(async () => {
		const writeId = await getLastKnownWriteId(page);
		expect(writeId).toBe(expectedWriteId);
	}).toPass({ timeout: SYNC_TIMEOUT, intervals: POLL_INTERVALS });
}

/**
 * מוסיף משימה ל-state של האפליקציה.
 * משנה את localStorage ישירות, ואז עושה reload כדי שהאפליקציה תטען את ה-state החדש.
 */
async function addTaskAndReload(page: Page, taskId: string, taskName: string, userId: string, listId: string) {
	// קריאת state נוכחי — מנסה localStorage, fallback ל-globalState דרך evaluate
	const hasLocalStorage = await page.evaluate(() => !!localStorage.getItem('daily-schedule-data'));

	if (hasLocalStorage) {
		await page.evaluate(
			({ taskId, taskName, userId, listId }) => {
				const state = JSON.parse(localStorage.getItem('daily-schedule-data')!);
				const existingTasks = state.lists[userId][listId].tasks;
				const maxOrder = Math.max(-1, ...Object.values(existingTasks).map((t: any) => t.order));
				existingTasks[taskId] = {
					id: taskId,
					name: taskName,
					imageSrc: null,
					isDone: false,
					order: maxOrder + 1
				};
				state.lastModified = Date.now();
				localStorage.setItem('daily-schedule-data', JSON.stringify(state));
			},
			{ taskId, taskName, userId, listId }
		);
	} else {
		// localStorage ריק — נזריק דרך addInitScript לפני reload
		await page.addInitScript(
			({ taskId, taskName, userId, listId }) => {
				const raw = localStorage.getItem('daily-schedule-data');
				if (!raw) return;
				const state = JSON.parse(raw);
				if (!state.lists?.[userId]?.[listId]) return;
				const existingTasks = state.lists[userId][listId].tasks;
				const maxOrder = Math.max(-1, ...Object.values(existingTasks).map((t: any) => t.order));
				existingTasks[taskId] = {
					id: taskId,
					name: taskName,
					imageSrc: null,
					isDone: false,
					order: maxOrder + 1
				};
				state.lastModified = Date.now();
				localStorage.setItem('daily-schedule-data', JSON.stringify(state));
			},
			{ taskId, taskName, userId, listId }
		);
	}
}

/** בודק אם משימה קיימת ב-localStorage */
async function hasTaskInLocalStorage(page: Page, taskId: string): Promise<boolean> {
	return page.evaluate((taskId) => {
		const raw = localStorage.getItem('daily-schedule-data');
		if (!raw) return false;
		const state = JSON.parse(raw);
		for (const userId of Object.keys(state.lists || {})) {
			for (const listId of Object.keys(state.lists[userId] || {})) {
				if (state.lists[userId][listId]?.tasks?.[taskId]) return true;
			}
		}
		return false;
	}, taskId);
}

/**
 * מפעיל סנכרון — נווט/reload לעמוד backup שמפעיל סנכרון אוטומטי.
 * ואז לוחץ על "סנכרן עכשיו" לוודא שהסנכרון רץ.
 */
async function triggerManualSync(page: Page) {
	await page.goto(BACKUP_PAGE, { waitUntil: 'networkidle' });
	// המתנה קצרה לסנכרון אוטומטי שמופעל ב-setupTriggers
	await page.waitForTimeout(1000);
	// לחיצה על כפתור "סנכרן עכשיו" לוודאות
	await page.getByRole('button', { name: /סנכרן עכשיו/ }).click();
	await page.waitForTimeout(2000);
}

/** מחזיר את המשתמש הראשון ואת ה-listId הראשון (מהשרת) */
async function getFirstUserAndList(request: APIRequestContext): Promise<{ userId: string; listId: string }> {
	const content = await request.get(`${MOCK_SERVER}/content`).then((r) => r.json());
	const userId = Object.keys(content.lists)[0];
	const listId = Object.keys(content.lists[userId])[0];
	return { userId, listId };
}

// ─── בדיקה ──────────────────────────────────────────────────────────────────

test.beforeEach(async ({ request }) => {
	await request.post(`${MOCK_SERVER}/reset`);
});

test('סנכרון דו-כיווני: A משנה → B מקבל, B משנה → A מקבל', async ({ browser, request }) => {
	test.setTimeout(90_000);

	const TASK_FROM_A = { id: 'test-task-from-device-a', name: 'משימה מ-Device A' };
	const TASK_FROM_B = { id: 'test-task-from-device-b', name: 'משימה מ-Device B' };

	// ═══════════════════════════════════════════════════════════════════════════
	// שלב 1: Device A מסנכרן בפעם הראשונה (baseline)
	// ═══════════════════════════════════════════════════════════════════════════

	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();
	await pageA.goto(BACKUP_PAGE, { waitUntil: 'networkidle' });

	// סנכרון ראשוני אוטומטי — מחכה ש-manifest יופיע בשרת
	const baselineWriteId = await waitForNewWriteId(request, null);
	expect(baselineWriteId).toBeTruthy();

	// ═══════════════════════════════════════════════════════════════════════════
	// שלב 2: Device B מסנכרן — מוריד את נתוני Device A
	// ═══════════════════════════════════════════════════════════════════════════

	const ctxB = await browser.newContext();
	const pageB = await ctxB.newPage();
	await pageB.goto(BACKUP_PAGE, { waitUntil: 'networkidle' });

	// מחכים עד ש-Device B שומר writeId (הוכחה שהסנכרון הראשון הושלם)
	await expect(async () => {
		const writeId = await getLastKnownWriteId(pageB);
		expect(writeId).toBeTruthy();
	}).toPass({ timeout: SYNC_TIMEOUT, intervals: POLL_INTERVALS });

	// ═══════════════════════════════════════════════════════════════════════════
	// שלב 3: Device A מוסיף משימה ומסנכרן
	// ═══════════════════════════════════════════════════════════════════════════

	const { userId, listId } = await getFirstUserAndList(request);
	await addTaskAndReload(pageA, TASK_FROM_A.id, TASK_FROM_A.name, userId, listId);

	const serverWriteIdBeforeA = (await request.get(`${MOCK_SERVER}/manifest`).then((r) => r.json()))
		.syncMetadata.writeId;
	await triggerManualSync(pageA);
	const writeIdAfterA = await waitForNewWriteId(request, serverWriteIdBeforeA);

	// ═══════════════════════════════════════════════════════════════════════════
	// שלב 4: Device B מסנכרן ובודק שקיבל את המשימה מ-A
	// ═══════════════════════════════════════════════════════════════════════════

	await triggerManualSync(pageB);

	// מחכים ש-Device B יעדכן writeId (הוכחה שקיבל שינויים מ-A)
	await waitForDeviceWriteId(pageB, writeIdAfterA);

	// בודקים שהמשימה מ-A קיימת ב-Device B
	const bHasTaskFromA = await hasTaskInLocalStorage(pageB, TASK_FROM_A.id);
	expect(bHasTaskFromA, `Device B צריך לקבל את המשימה "${TASK_FROM_A.name}" מ-Device A`).toBe(true);

	// ═══════════════════════════════════════════════════════════════════════════
	// שלב 5: Device B מוסיף משימה ומסנכרן
	// ═══════════════════════════════════════════════════════════════════════════

	await addTaskAndReload(pageB, TASK_FROM_B.id, TASK_FROM_B.name, userId, listId);

	const serverWriteIdBeforeB = (await request.get(`${MOCK_SERVER}/manifest`).then((r) => r.json()))
		.syncMetadata.writeId;
	await triggerManualSync(pageB);
	const writeIdAfterB = await waitForNewWriteId(request, serverWriteIdBeforeB);

	// ═══════════════════════════════════════════════════════════════════════════
	// שלב 6: Device A מסנכרן ובודק שקיבל את המשימה מ-B
	// ═══════════════════════════════════════════════════════════════════════════

	await triggerManualSync(pageA);

	// מחכים ש-Device A יעדכן writeId
	await waitForDeviceWriteId(pageA, writeIdAfterB);

	// בודקים שהמשימה מ-B קיימת ב-Device A
	const aHasTaskFromB = await hasTaskInLocalStorage(pageA, TASK_FROM_B.id);
	expect(aHasTaskFromB, `Device A צריך לקבל את המשימה "${TASK_FROM_B.name}" מ-Device B`).toBe(true);

	// ובודקים שהמשימה המקורית של A עדיין שם
	const aStillHasOwnTask = await hasTaskInLocalStorage(pageA, TASK_FROM_A.id);
	expect(aStillHasOwnTask, 'Device A צריך לשמור את המשימה שלו אחרי סנכרון עם B').toBe(true);

	// ═══════════════════════════════════════════════════════════════════════════
	// ניקוי
	// ═══════════════════════════════════════════════════════════════════════════

	await ctxA.close();
	await ctxB.close();
});
