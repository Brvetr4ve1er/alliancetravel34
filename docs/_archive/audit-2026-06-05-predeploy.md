# Alliance Travel — Pre-Deploy Audit (2026-06-05)

Scope: production-only failure modes on Cloudflare Pages. HEAD at `refactor/trim-v26` (`45b126b`). Site root: `site/`. Target: `https://alliance-travel.dz/`.

The audit walks every page (`/`, `/voyages/`, `/cairo-sharm/`, `/sharm-constantine/`, `/istanbul/`, `/azerbaidjan/`, `/kuala-lumpur/`, `/rendez-vous-visa/`, `/404.html`) plus `_headers`, `_redirects`, `sw.js`, `site.webmanifest`, `sitemap.xml`, `robots.txt`, and the 11 JS / 1 CSS asset files.

---

## CRITICAL (deploy-breaking on first push)

### P1 — `sw.js` precaches `/assets/js/enhance.js` but trip pages also depend on 6+ other JS files

* **File:** `site/sw.js:21-27`
* **What:** `PRECACHE_URLS` lists only `enhance.js` + `styles.css` + favicon + manifest. Trip pages load `map-base.js`, `trip-map.js`, `scroll-hero.js`, `calculator.js`, `booking-form.js`, `i18n.js`. Homepage additionally loads `globe.js`, `hero-collage-lazy.js`, `algeria-map.js`.
* **Failure mode:** Not deploy-breaking by itself (fetch handler still serves them stale-while-revalidate from runtime cache), but a first-visit offline user hits the install-precache only — every trip page is broken offline. Bigger risk: if a precache URL 404s, `addAll` rejects and *no* precache happens at all.
* **Severity:** This is the SW invariant most likely to silently regress. Precache list has not been updated in 5 commits despite multiple JS merges (verified via `git log -- site/sw.js`).
* **Fix:** Either delete `enhance.js` from precache (let the runtime SWR handle it) or add the other 7 same-priority shell files. The first is safer.

### P2 — `404.html` references `assets/js/i18n.js` as **relative** path

* **File:** `site/404.html:163`
* **What:** `<script src="assets/js/i18n.js" defer>` — no leading slash.
* **Failure mode:** Cloudflare Pages serves `404.html` for any unmatched route, e.g. `/cairo-sharm/typo`. The relative script src then resolves to `/cairo-sharm/assets/js/i18n.js` → 404 nested inside the 404 page. The 404 page works visually (i18n.js is non-essential) but every missed URL ships a console error and a wasted request. Same with `<link rel="icon" href="/assets/...">` on lines 22-23 — those use leading `/`, inconsistent with the script.
* **Fix:** Change to `/assets/js/i18n.js`.

### P3 — `_headers` advertises `?cb=` cache-busting policy but **no HTML file actually uses it**

* **Files:** `site/_headers:7,35` (policy doc) vs. every `<link rel="stylesheet" href="...styles.css"/>` and `<script src=".../enhance.js" defer>` (no version query)
* **Failure mode:** CSS + JS are served with `Cache-Control: public, max-age=31536000, immutable`. On the next deploy that ships a new `styles.css` or `enhance.js`, returning visitors keep the year-old file for up to 1 year while their HTML is fresh (3600 s) — produces invisible breakage (new HTML markup ↔ old CSS classes, new JS handlers missing). The Service Worker mitigates this *for SW-enrolled clients only*, but new visitors and clients on Safari private mode hit the raw CDN cache.
* **Severity:** This is the single most dangerous discrepancy in the audit. v22 deploy worked because nothing has shipped yet; first prod CSS update will brick the site for week-old visitors.
* **Fix:** Either (a) add `?cb=v27` (or commit SHA) to every CSS/JS reference and bump on each release, or (b) drop `immutable` from `/assets/css/*` and `/assets/js/*` and ship `max-age=600, stale-while-revalidate=86400`.

---

## HIGH (likely problems within first week)

### P4 — Service-Worker scope is `/`, but visa subpage was added after SW was last tested

* **File:** `site/sw.js:54` (`Service-Worker-Allowed: /`); visa page at `site/rendez-vous-visa/index.html`
* **What:** SW covers entire origin; visa page paths are correctly relative (`../assets/...`). However, SW precache has no visa-page entry and no visa-page assets (flag SVGs), so offline first-visit to `/rendez-vous-visa/` shows nothing. The visa page also references `../assets/images/logo.svg` (line 80, 124) but trip pages use inline SVG — inconsistent.
* **Fix:** None required for correctness; for resilience, add `/rendez-vous-visa/` and the 11 flag SVGs to PRECACHE_URLS.

### P5 — `cobe` ES-module CDN (`esm.sh`) is sole hard runtime dep for globe + has known MENA reachability issues

* **File:** `site/assets/js/globe.js:43` (`import('https://esm.sh/cobe@0.6.4')`)
* **What:** Globe falls back to CSS atmosphere on import failure (correctly handled). But esm.sh is known to be intermittently slow/blocked in Algeria (CloudFront edge cache gaps). On a slow MENA link, the `import()` may stall the homepage hero for 10+ s before falling back.
* **Fix:** Add a 5 s timeout race around the dynamic import OR self-host `cobe@0.6.4` under `/assets/vendor/cobe.js` (file is ~7 KB minified).

### P6 — MapLibre GL CDN (`unpkg.com`) loaded synchronously by Algeria map + visa map + trip maps

* **File:** `site/assets/js/map-base.js:65,69`
* **What:** Loads `https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.{js,css}`. Unpkg is even more unreliable than esm.sh in MENA. The maps degrade to a static fallback if it fails, but a slow load blocks the lazy-boot resolve for up to 30 s (per `lazyBoot`'s safety timeout).
* **Fix:** Self-host MapLibre under `/assets/vendor/maplibre-gl-4.7.1/` (~200 KB gzip) and update `STYLES` to local URLs or set a fetch timeout.

### P7 — No Content-Security-Policy header despite inline `<script>` and `style=""`

* **File:** `site/_headers:14-24`
* **What:** Counts on entry pages:
  * Inline `<script>` blocks: homepage 13, cairo-sharm 13, visa 7, voyages 6, 404 1.
  * Inline `style=""`: homepage 43, visa 14, cairo-sharm 8.
  * Inline event handlers (`onsubmit=`): homepage 1 (contact form).
* **Failure mode:** Without CSP, *clickjacking* is partially mitigated by `X-Frame-Options: SAMEORIGIN`, but XSS via translation key injection or third-party iframe is not. For a static brochure site this is "low risk", but Google Lighthouse will flag it.
* **Fix:** Adding CSP is non-trivial because of 43 inline styles. Minimum-effort: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://esm.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src https://fonts.gstatic.com; connect-src 'self' https://basemaps.cartocdn.com; frame-ancestors 'self';` — accept `'unsafe-inline'` until inline styles are extracted.

### P8 — Trip pages (`cairo-sharm/`, `istanbul/`, etc.) lack `<body data-page="">`, so i18n meta-translation is a no-op

* **File:** all trip pages line ~138-148 — `<body data-region="egypt">` (no `data-page`)
* **What:** `i18n.js:987` reads `document.body?.dataset?.page` to look up `T[lang].meta[pageKey]`. Trip pages have `data-region` but not `data-page`. EN/AR users see French `<title>` and `<meta description>` on every trip page even after switching language.
* **Fix:** Add `data-page="trip-cairo"` etc. and add matching entries under `T.en.meta.trip-cairo` and `T.ar.meta.trip-cairo`.

### P9 — Algeria-map and visa-map CDN style URLs (`basemaps.cartocdn.com`) not in CSP / not preconnected

* **File:** `site/assets/js/map-base.js:25-26`; `site/index.html:63-64` (only Google Fonts preconnect)
* **Failure mode:** First map render fires a fresh TLS handshake to `basemaps.cartocdn.com` from the user's browser. Adds ~150-300 ms on cold cache. Not breaking but visible.
* **Fix:** Add `<link rel="preconnect" href="https://basemaps.cartocdn.com" crossorigin>` to pages that have maps (homepage + visa + 5 trip pages).

---

## MEDIUM (degraded UX, fixable later)

### P10 — `visa-country-card:hover` has no `:focus-within` / `:focus-visible` parallel

* **File:** `site/rendez-vous-visa/index.html:26`
* **What:** `.visa-country-card[open], .visa-country-card:hover { border-color: var(--border-hi); }` — on iOS Safari, the hover styling never fires; users tapping the `<details>` see the border-color stay unchanged until `[open]` kicks in.
* **Fix:** Add `:focus-within` to the selector.

### P11 — Sitemap.xml `lastmod` for visa page is `2026-06-05` (today) but other pages stuck at `2026-05-13/19`

* **File:** `site/sitemap.xml:19,32,45,57,71,83,97,109`
* **Failure mode:** Some pages' `lastmod` is fresher than their actual last commit (e.g., index.html was touched in commit `45b126b` from "this session" — but `lastmod` says 2026-05-19). Google deprioritizes pages with stale lastmods. Not breaking.
* **Fix:** Bump `lastmod` for the homepage + every trip page to current deploy date when shipping.

### P12 — Voyages page (`/voyages/index.html:68`) uses text logo `Alliance<strong>Travel</strong>` instead of the SVG logo used everywhere else

* **File:** `site/voyages/index.html:68`
* **Failure mode:** Visual inconsistency, breaks brand presentation on this hub page.
* **Fix:** Inline the same SVG logo block used on `/index.html:224` and on trip pages.

### P13 — Voyages page nav uses absolute path `/voyages/` for self-link (line 70) but `../index.html#agence` for siblings

* **File:** `site/voyages/index.html:70-73`
* **Failure mode:** Mixing absolute & relative paths within the same nav is brittle; if someone changes the deploy base URL or moves the page, only some links update.
* **Fix:** Normalize to one style.

### P14 — Hreflang is `x-default` only — no `en` or `ar` alternates declared anywhere

* **Files:** all 8 HTML pages
* **What:** `<link rel="alternate" hreflang="x-default" href="...">` declares self as the language-neutral fallback. There's no `hreflang="fr"`, `"en"`, or `"ar"`. Since translations are client-side JS-only with no distinct URL per language, declaring per-locale hreflang would lie to Google. Current architecture is correct given the chosen i18n strategy, but the trade-off is **EN/AR users cannot land directly via Google in their language**.
* **Verdict:** Architectural decision documented in `docs/I18N-SEO.md`. Won't-fix without architectural shift to URL-per-locale.

### P15 — `<html dir>` not set during SSR; AR users see LTR layout for ~300 ms until i18n.js runs

* **File:** all 8 HTML pages (`<html lang="fr">`, no `dir=`)
* **Failure mode:** FOUC on language switch for returning AR users; first paint shows French LTR layout, then flips to Arabic RTL when JS executes.
* **Fix:** Use a blocking inline `<script>` at the top of `<head>` to read `localStorage["al-lang"]` and set `html.lang` + `html.dir` before CSS paints. ~150 bytes inline.

### P16 — `openingHours` schema value `"Sa-Th 09:00-18:00"` may confuse parsers

* **File:** `site/index.html:39`
* **What:** Schema.org allows `Sa-Th` but most validators interpret it as "Saturday through Thursday" — wrap-around semantically correct for Algeria's working week, but Google Knowledge Graph has been known to parse only the simple sequence. Safer: `["Sa", "Su", "Mo", "Tu", "We", "Th"]` as an array.
* **Fix:** Change to an explicit array of single-day strings or two separate ranges (`"Sa 09:00-18:00"`, `"Su-Th 09:00-18:00"`).

---

## LOW

### P17 — Service Worker fetch handler doesn't handle cross-origin map tiles

* **File:** `site/sw.js:69-70` — returns early for non-same-origin requests except `(fonts.googleapis.com|fonts.gstatic.com|esm.sh)`.
* **Failure mode:** MapLibre tile requests to `basemaps.cartocdn.com` bypass the SW entirely. Not broken, just no offline-first benefit for map tiles. Intentional.

### P18 — `enhance.js:1034` registers SW with no version-skew handling

* **File:** `site/assets/js/enhance.js:1030-1035`
* **Failure mode:** No `registration.update()` or `controllerchange` listener. Users who keep a tab open across a deploy receive stale shell until they navigate. Not breaking.

### P19 — Trip pages' inline `<style>` block sets `--accent` overriding global token

* **Files:** `site/cairo-sharm/index.html:14-20`, all trip pages
* **Failure mode:** Light theme token cascade: brand mint is overridden globally to per-trip color. Verified intentional in `docs/AUDIT.md`.

### P20 — `nav-logo` SVG repeats verbatim across 6 pages (~50 KB inline per page)

* **Files:** all pages with the nav logo SVG
* **Failure mode:** Wasted gzipped bytes; SVG sprite would save ~30 KB. Inline avoids a render-blocking request, so net-neutral but inelegant.

### P21 — Form regex `^(\+213|0)[5-7][0-9 ]{8,}$` may reject valid Algerian numbers starting with 4

* **File:** `site/index.html:838`
* **What:** Some recent Mobilis batches start with 04. Pattern excludes them. Low impact today, may grow.

### P22 — Hero image preload for homepage uses **only WebP** (`type="image/webp"`)

* **File:** `site/index.html:68-72`
* **What:** `<link rel="preload" as="image" type="image/webp" ...>` — browsers that don't support WebP (older Safari) ignore the preload. The `<picture>` then issues a non-preloaded JPG fetch. Loss of LCP boost on those clients but no breakage.

---

## WON'T FIX

* **WF1** Hreflang per-language URLs (architectural — see P14).
* **WF2** Inline `style=""` removal (cost ≫ benefit for a static brochure).
* **WF3** Migrating to self-hosted fonts (Google Fonts coverage in MENA is excellent).

---

## Summary by severity

| Severity | Count |
|----------|-------|
| Critical | 3 (P1-P3) |
| High     | 6 (P4-P9) |
| Medium   | 7 (P10-P16) |
| Low      | 6 (P17-P22) |
| Won't fix | 3 |

Three most dangerous: **P3** (cache-bust policy not implemented, will brick returning visitors on first CSS update), **P1** (SW precache out of sync — partial offline coverage that gives a false sense of resilience), **P2** (404.html relative `i18n.js` ships console errors on every missed nested URL).
