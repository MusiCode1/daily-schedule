import { expect, test } from '@playwright/test';

test('home page should load and expose app title', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/סדר יום/);
	await expect(page.locator('body')).toBeVisible();
});
