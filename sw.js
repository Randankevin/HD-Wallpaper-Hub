// HD Wallpaper Hub — Service Worker
// Bump this on every deploy that changes cached app-shell files.
const CACHE_VERSION = 'v2';
const APP_SHELL_CACHE = `wallpaper-hub-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `wallpaper-hub-images-${CACHE_VERSION}`;
const APP_BASE = self.registration.scope;
const APP_BASE_PATH = new URL(APP_BASE).pathname;
const APP_SHELL_FILES = ['', 'index.html', 'manifest.json', 'Icon%201.svg']
    .map((path) => new URL(path, APP_BASE).toString());
const INDEX_URL = new URL('index.html', APP_BASE).toString();

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== APP_SHELL_CACHE && key !== IMAGE_CACHE)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith(APP_BASE_PATH + 'wallpapers/')) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then((cache) =>
                cache.match(request).then((cached) => {
                    if (cached) return cached;
                    return fetch(request).then((response) => {
                        if (response.ok) cache.put(request, response.clone());
                        return response;
                    }).catch(() => cached);
                })
            )
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy));
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) => cached || caches.match(INDEX_URL))
            )
    );
});
