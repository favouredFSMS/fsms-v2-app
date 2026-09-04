/**
 * FSMS V2 — service worker (Phase 25, hand-written, no framework).
 *
 * Caching strategy (justified per surface):
 *  - Navigations (document requests)   → network-only, offline.html fallback.
 *    Authenticated page HTML is NEVER cached (Phase 28 security: no tenant
 *    data at rest in the cache); offline shows the neutral offline page.
 *  - /_next/static/* (hashed, immutable)→ cache-first. Safe to cache forever;
 *    content-hash in the URL means a new build busts old entries.
 *  - images / fonts / media             → cache-first with a bounded cache.
 *  - API / RPC / auth data             → network-only. Never cached, never
 *    served from cache: stale tenant data is worse than a failed request.
 *
 * Only same-origin GET requests are intercepted.
 */

const VERSION = "fsms-v1";
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_MEDIA = `${VERSION}-media`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigations: network-only, offline fallback. Authenticated HTML is
  //    never cached (tenant data must not rest in the cache).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match(OFFLINE_URL);
        return fallback ?? Response.error();
      }),
    );
    return;
  }

  // 2. Hashed build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // 3. Static media (images/fonts): cache-first, bounded.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(png|jpe?g|webp|svg|gif|woff2?|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_MEDIA).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // 4. Everything else (API, RPC, data): network-only.
  //    Default behavior; nothing to do.
});
