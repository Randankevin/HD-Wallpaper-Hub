// HD Wallpaper Hub — Service Worker
// Bump this on every deploy that changes cached app-shell files.
const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `wallpaper-hub-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `wallpaper-hub-images-${CACHE_VERSION}`;

const APP_SHELL_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/Icon 1.svg'
];

// Install: pre-cache the app shell so the UI loads instantly (and offline).
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then((cache) => cache.addAll(APP_SHELL_FILES))
            .then(() => self.skipWaiting())
    );
});

// Activate: drop any caches from older versions.
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

    // Wallpaper images: cache-first, so once viewed they're available offline
    // and repeat visits don't re-download multi-MB files.
    if (url.pathname.startsWith('/wallpapers/')) {
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

    // App shell / HTML: network-first so content updates show up right away,
    // falling back to cache when offline.
    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone();
                caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, copy));
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) => cached || caches.match('/index.html'))
            )
    );
});
