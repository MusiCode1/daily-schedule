import devtoolsJson from 'vite-plugin-devtools-json';
import { ttsScannerPlugin } from './plugins/tts-scanner';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			injectRegister: false,
			manifest: false
		}),
		devtoolsJson(),
		ttsScannerPlugin()
	],

	server: {
		allowedHosts: true
	},

	// PostCSS config נמצא ב-postcss.config.js
	// Vite קורא אותו אוטומטית

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'client',

					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},

					include: ['tests/component/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: [
						'tests/unit/**/*.{test,spec}.{js,ts}',
						'tests/integration/**/*.{test,spec}.{js,ts}'
					]
				}
			}
		]
	}
});
