import { defineConfig } from '@playwright/test';

const MOCK_SYNC_PORT = process.env.MOCK_SYNC_PORT || '3001';
const MOCK_SYNC_URL = `http://127.0.0.1:${MOCK_SYNC_PORT}`;

export default defineConfig({
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},

	webServer: [
		// ── אפליקציה עם mock sync מופעל ────────────────────────────────────
		{
			command: 'bun run dev --host 127.0.0.1 --port 4173',
			url: 'http://127.0.0.1:4173',
			reuseExistingServer: !process.env.CI,
			timeout: 180_000,
			env: {
				VITE_USE_MOCK_SYNC: 'true',
				VITE_MOCK_SYNC_URL: MOCK_SYNC_URL
			}
		},
		// ── שרת הסנכרון המדומה (Bun) ────────────────────────────────────────
		{
			command: `bun e2e/mock-server/server.ts --port ${MOCK_SYNC_PORT}`,
			url: `${MOCK_SYNC_URL}/health`,
			reuseExistingServer: !process.env.CI,
			timeout: 30_000
		}
	],

	testDir: 'e2e'
});
