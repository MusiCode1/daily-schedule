/// <reference lib="WebWorker" />

export {};

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const PRECACHE_CACHE_NAME = 'pwa-precache-v2';
const RUNTIME_CACHE_NAME = 'pwa-runtime-v2';
const STATIC_PREFIXES = ['/images/', '/sounds/', '/icons/'];
const NAVIGATION_SHELL_FALLBACKS = ['/', '/login'];

const wbManifest = self.__WB_MANIFEST;
const manifestEntries = Array.isArray(wbManifest) ? wbManifest : [];
const normalizeCacheUrl = (url: string): string => {
	const resolved = new URL(url, self.location.origin);
	return `${resolved.pathname}${resolved.search}`;
};

// נרמול + dedupe מונעים כשל install כשאותו URL מגיע בפורמטים שונים (עם/בלי / מוביל)
const precacheUrls = [
	...new Set(
		[...manifestEntries.map((entry) => entry.url), '/manifest.webmanifest', ...NAVIGATION_SHELL_FALLBACKS].map(
			normalizeCacheUrl
		)
	)
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(PRECACHE_CACHE_NAME);
			await cache.addAll(precacheUrls);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => key !== PRECACHE_CACHE_NAME && key !== RUNTIME_CACHE_NAME)
					.map((key) => caches.delete(key))
			);
			await self.clients.claim();
		})()
	);
});

const isStaticAsset = (pathname: string): boolean =>
	STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const staleWhileRevalidate = async (request: Request): Promise<Response> => {
	const cache = await caches.open(RUNTIME_CACHE_NAME);
	const cached = await cache.match(request);
	const networkPromise = fetch(request)
		.then((response) => {
			if (response.ok) {
				void cache.put(request, response.clone());
			}
			return response;
		})
		.catch(() => undefined);

	if (cached) {
		void networkPromise;
		return cached;
	}

	const networkResponse = await networkPromise;
	return networkResponse ?? new Response('', { status: 504, statusText: 'Offline' });
};

const networkFirst = async (request: Request): Promise<Response> => {
	const cache = await caches.open(RUNTIME_CACHE_NAME);

	try {
		const response = await fetch(request);
		if (response.ok) {
			void cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;

		// fallback ל-shell מונע מסך שגיאה כשאין cache-route מדויק לניווט הנוכחי
		const shellFallback = await caches.match('/login').then((match) => match ?? caches.match('/'));
		if (shellFallback) return shellFallback;

		return new Response('Offline', { status: 503, statusText: 'Offline' });
	}
};

self.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	if (url.origin !== self.location.origin) return;

	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request));
		return;
	}

	if (isStaticAsset(url.pathname)) {
		event.respondWith(staleWhileRevalidate(request));
		return;
	}

	event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
