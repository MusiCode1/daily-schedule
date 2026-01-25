import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterAuto from '@sveltejs/adapter-auto';
import adapterBun from 'svelte-adapter-bun';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const eventName = process.env.npm_lifecycle_event;
const adapter = eventName === 'dev' ? adapterAuto : adapterCloudflare;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter()
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
