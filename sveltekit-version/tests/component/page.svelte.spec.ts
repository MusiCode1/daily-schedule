import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { INITIAL_STATE } from '$lib/data/defaults';

const STORAGE_KEY = 'daily-schedule-data';

describe('/tasks/+page.svelte', () => {
	it('should render h1', async () => {
		// הגדרה מינימלית של משתמש פעיל כדי שהלוח ירונדר (ולא יפנה ל-login)
		const state = JSON.parse(JSON.stringify(INITIAL_STATE));
		state.currentUserId = state.users?.[0]?.id ?? null;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

		// חשוב: הייבוא חייב לקרות אחרי כתיבה ל-localStorage,
		// כי ה-GlobalState נטען בזמן import.
		const { default: Page } = await import('../../src/routes/(board)/tasks/+page.svelte');
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
