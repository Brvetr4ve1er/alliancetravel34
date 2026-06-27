/**
 * Alliance Travel — service worker (offline-friendly cache)
 *
 * Strategy:
 *  - HTML pages         : network-first (fall back to cache when offline)
 *  - CSS / JS / fonts   : stale-while-revalidate (instant load, refresh in bg)
 *  - Images             : cache-first (immutable once shipped)
 *  - Everything else    : pass through
 *
 * Bump CACHE_NAME on any release; the activate handler purges old caches.
 * Vanilla JS, no Workbox / build step.
 */

/* CACHE NAME RULE: bump version on every release that changes site/.
   The activate handler purges old caches automatically. Query-param
   cache busting (?v=) does NOT work for SW-cached resources. */
const CACHE_NAME = 'alliance-v30-2026-06-20';
const RUNTIME    = 'alliance-runtime-v30';
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');

function scopedPath(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SCOPE_PATH}${normalized}` || '/';
}

// Install: pre-cache the absolute homepage shell only.
//
// IMPORTANT: keep this list MINIMAL. addAll() is atomic — if any URL
// 404s the entire precache aborts and offline first-visit fails. The
// SWR fetch handler (line 86+) covers JS/CSS/images on first runtime
// request, so we don't need to enumerate them here. Audit 2026-06-05
// flagged that pre-listing enhance.js + styles.css drifted from what
// trip pages actually load — dropped to '/' only.
const PRECACHE_URLS = [
  scopedPath('/'),
  scopedPath('/assets/images/favicon/favicon-32x32.png'),
  scopedPath('/site.webmanifest'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {/* offline at install — fine */}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Helper: classify a request */
function isHTML(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}
function isStaticAsset(url) {
  return /\.(?:css|js|woff2?|ttf)$/i.test(url.pathname);
}
function isImage(url) {
  return /\.(?:jpg|jpeg|png|webp|avif|gif|svg|ico)$/i.test(url.pathname);
}
function isCDN(url) {
  // Cache fonts.googleapis + esm.sh (cobe) as runtime cache
  return /(fonts\.googleapis\.com|fonts\.gstatic\.com|esm\.sh)$/.test(url.hostname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip cross-origin requests we don't care about
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isCDN(url)) return;

  if (isHTML(req)) {
    // Network-first: prefer fresh, fall back to cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match(scopedPath('/'))))
    );
    return;
  }

  if (isStaticAsset(url) || isImage(url) || isCDN(url)) {
    // Stale-while-revalidate
    event.respondWith(
      caches.match(req).then((cached) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached); // offline fallback
        return cached || fresh;
      })
    );
  }
});
