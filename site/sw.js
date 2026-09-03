/**
 * Alliance Travel — service worker (offline-friendly cache)
 *
 * Strategy:
 *  - HTML pages         : network-first (fall back to cache when offline)
 *  - CSS / JS / fonts   : stale-while-revalidate (instant load, refresh in bg)
 *  - Images             : cache-first (immutable once shipped)
 *  - /admin/ + /api/    : NEVER touched (see isExcluded)
 *  - Everything else    : pass through
 *
 * Bump VERSION on any release; the activate handler purges old caches.
 * Vanilla JS, no Workbox / build step.
 */

/* CACHE VERSION RULE: bump VERSION on every release that changes site/.
   BOTH cache names are derived from it, so one bump really does purge
   everything the previous release stored. Until 2026-08-11 the runtime cache
   — which holds every HTML page, stylesheet, script and image the site ever
   serves — carried its own hand-written version, so bumping CACHE_NAME
   purged nothing but the 3-entry precache and visitors kept the old assets.
   Query-param cache busting (?v=) does NOT work for SW-cached resources;
   this constant is the only lever. */
const VERSION    = 'v34-b549679b43fa';
const CACHE_NAME = `alliance-${VERSION}`;
const RUNTIME    = `alliance-runtime-${VERSION}`;

// Install: pre-cache the absolute homepage shell only.
//
// IMPORTANT: keep this list MINIMAL. addAll() is atomic — if any URL
// 404s the entire precache aborts and offline first-visit fails. The
// SWR fetch handler (line 86+) covers JS/CSS/images on first runtime
// request, so we don't need to enumerate them here. Audit 2026-06-05
// flagged that pre-listing enhance.js + styles.css drifted from what
// trip pages actually load — dropped to '/' only.
const PRECACHE_URLS = [
  '/',
  '/assets/images/favicon/favicon-32x32.png',
  '/site.webmanifest',
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
  // Cache Google Fonts as runtime cache (cobe/esm.sh removed in v31)
  return /(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
}
/* Paths the worker must never see. The owner dashboard is an authenticated,
   always-changing app — a cached copy of one screen is at best stale and at
   worst the previous session's data — and /api/* is dynamic by definition.
   Both return early from `fetch`: no cache read, no cache write, no offline
   fallback, the network answers or the browser shows its own error. */
function isExcluded(url) {
  return /^\/(admin|api)(\/|$)/.test(url.pathname);
}

/* The offline answer for a page we have never cached.
   It is SYNTHESIZED here, not read from the cache, because the previous
   fallback (`caches.match('/')`) served the HOMEPAGE's HTML under whatever
   URL had failed — so an offline tap on a trip link, or on /admin/, showed
   the home page pretending to be that page. Self-contained by necessity:
   nothing external loads while offline. Trilingual like the rest of the site. */
function offlineResponse() {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hors ligne — Alliance Travel</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         padding-inline:1.5rem; text-align:center;
         background:#0f1115; color:#e9edf2;
         font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  h1 { font-size:1.25rem; margin-block:0 .75rem; }
  p  { margin-block:0 .5rem; line-height:1.6; opacity:.75; }
</style>
</head>
<body>
<main>
  <h1 lang="fr">Vous êtes hors ligne</h1>
  <p lang="fr">Cette page n’a pas encore été consultée sur cet appareil. Reconnectez-vous puis réessayez.</p>
  <p lang="en">You are offline. This page hasn’t been opened on this device yet — reconnect and try again.</p>
  <p lang="ar" dir="rtl">أنت غير متصل بالإنترنت. لم تُفتح هذه الصفحة على هذا الجهاز بعد — أعد الاتصال ثم حاول مجددًا.</p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

/* Store a response copy without ever letting a cache failure (quota, opaque
   body, storage disabled) surface as an unhandled rejection. */
function putInRuntime(req, res) {
  const copy = res.clone();
  caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip cross-origin requests we don't care about
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isCDN(url)) return;

  // Dashboard + serverless functions: hands off entirely.
  if (sameOrigin && isExcluded(url)) return;

  if (isHTML(req)) {
    // Network-first: prefer fresh, fall back to cache
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only a REAL page is worth keeping. Without this check a 404 or a
          // 500 error page was written into RUNTIME and then served as the
          // offline answer for that URL until the next version bump — the
          // image and static branches below have always checked res.ok.
          if (res && res.ok && res.type !== 'opaque') putInRuntime(req, res);
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || offlineResponse()))
    );
    return;
  }

  if (isImage(url)) {
    // Cache-first: images are immutable once shipped, so a cached hit is
    // returned as-is with NO background revalidation (avoids a needless
    // re-fetch of every image on every visit). Only fetch when not cached.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) putInRuntime(req, res);
          return res;
        });
      })
    );
    return;
  }

  if (isStaticAsset(url) || isCDN(url)) {
    // Stale-while-revalidate (CSS / JS / fonts / CDN)
    event.respondWith(
      caches.match(req).then((cached) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) putInRuntime(req, res);
          return res;
        }).catch(() => cached); // offline fallback
        return cached || fresh;
      })
    );
  }
});
