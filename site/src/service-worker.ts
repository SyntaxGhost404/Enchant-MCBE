/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/**
 * Offline support: every page, script and stylesheet is stored on install (about 300 KB compressed), pictures
 * and fonts as they are first shown. Pages are fetched fresh when there is a connection; the stored copy is
 * the fallback.
 * The .mcaddon download always comes from the network.
 */
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `enchantplus-${version}`;
const PRECACHE = [
	...build.filter((f) => /\.(js|css)$/.test(f)),
	...prerendered,
	...files.filter((f) => /icon-(32|192)\.png$/.test(f))
];
const STORED = new Set([...build, ...files, ...prerendered]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k.startsWith('enchantplus-') && k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin || url.pathname.endsWith('.mcaddon')) return;

	// build output never changes under the same name: stored copy first
	if (STORED.has(url.pathname) && !request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const hit = await cache.match(url.pathname);
				if (hit) return hit;
				const response = await fetch(request);
				if (response.ok) cache.put(url.pathname, response.clone());
				return response;
			})
		);
		return;
	}

	// pages: fresh when online, stored copy when offline
	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				try {
					const response = await fetch(request);
					if (response.ok) cache.put(request, response.clone());
					return response;
				} catch {
					return (await cache.match(request)) ?? (await cache.match(url.pathname.replace(/\/?$/, '/'))) ?? Response.error();
				}
			})()
		);
	}
});
