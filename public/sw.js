/**
 * CTTP Renforcement — Service Worker
 * Cache-first for UI/assets, network-first for API calls.
 * Skips registration in Tauri environment (window.__TAURI__).
 */

const CACHE_NAME = 'cttp-v1';
const API_CACHE_NAME = 'cttp-api-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/logo.svg',
];

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== API_CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Listen for skip-waiting message from the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except same-origin API)
  if (url.origin !== location.origin) return;

  // API routes: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE_NAME));
    return;
  }

  // Navigation: network-first for fresh HTML
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, CACHE_NAME));
    return;
  }

  // Static assets: cache-first with network fallback (safe for hashed filenames)
  event.respondWith(cacheFirstWithNetwork(request, CACHE_NAME));
});

/**
 * Cache-first strategy: serve from cache, fall back to network.
 * Good for static assets (JS, CSS, images, fonts).
 */
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a minimal offline page for navigation
    if (request.mode === 'navigate') {
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CTTP — Offline</title></head>' +
        '<body style="background:#F0FDF4;color:#14532D;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;text-align:center;padding:2rem;">' +
        '<div><h1 style="font-size:1.5rem;margin-bottom:0.5rem;">CTTP Renforcement</h1>' +
        '<p style="color:#94A3B8;">You are offline. Cached data may still be available.</p>' +
        '<button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;background:#14532D;color:white;border:none;border-radius:0.5rem;cursor:pointer;font-size:0.875rem;">Retry</button>' +
        '</div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Network-first strategy: try network, fall back to cache.
 * Good for API calls where fresh data is preferred.
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline — no cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
