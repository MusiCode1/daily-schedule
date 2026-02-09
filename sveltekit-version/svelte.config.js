import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterAuto from '@sveltejs/adapter-auto';
import adapterBun from 'svelte-adapter-bun';
import adapterStatic from '@sveltejs/adapter-static';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// import type { Config } from '@sveltejs/kit';

const eventName = process.env.npm_lifecycle_event;
const adapter = eventName === 'dev' ? adapterAuto : adapterCloudflare;
// const adapter = adapterStatic;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapterCloudflare({
			routes: {
				exclude: [
					"/images/*",
					"/sounds/*"
				]
			}
		})
	},
	vitePlugin: {
		inspector: true
	},
	onwarn: (warning, handler) => {
		if (warning.code === 'css_unused_selector') return;
		if (warning.message && warning.message.includes('Unknown at rule')) return;
		handler(warning);
	}
};

export default config;
