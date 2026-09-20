# Production Audit — Performance & Loading

**Site:** Alliance Travel — trilingual vanilla static multi-page site (Vercel, `outputDirectory=site`)
**Auditor dimension:** Performance & loading
**Date:** 2026-07-03
**Method:** Read-only static inspection (Read/Grep/Glob/Bash/PowerShell). No files modified.

---

## Executive summary

The site is **built by someone who clearly knows performance** — hero images ship as AVIF/WebP/JPEG ladders with mobile crops, the LCP hero is preloaded with `fetchpriority="high"`, JS is `defer`red, MapLibre is lazy-loaded on intersection with SRI, the hero collage defers tiles 2-5 until after the LCP paints, and a service worker adds SWR caching. The engineering instinct is good.

The problems are **at the edges and in the config**, and one is a genuine production regression:

1. **The caching + security-headers policy does not apply on the stated deploy target.** A well-designed `site/_headers` file exists, but Vercel ignores `_headers` entirely — it only reads `vercel.json`, which has **no `headers` block**. So on Vercel there is no `immutable` caching on images/fonts, no SWR on CSS/JS, and no security headers. This is the highest-value fix.
2. **~5.7 MB of dead image variants** (the entire `--fg` hero set in `heroes-v2/`) ship in the deploy bundle and are never fetched by any browser — inert `data-fg` markup, no JS consumer.
3. **The 288 KB / 9,555-line `styles.css` is render-blocking and shipped whole to every page** (~62 KB gzipped). Acceptable but the single biggest shared cost.
4. **Trip-card and hotel-card thumbnails are raw over-sized JPEGs** (240-399 KB, 1280×720) with no WebP/AVIF and no `srcset`, while heroes get the full treatment — an inconsistency worth ~1.5 MB of below-fold bytes on the homepage.
5. **Google Fonts is render-blocking** and the request string is fragmented across three variants, defeating cross-page font cache reuse.

Nothing here is a redesign; every fix refines the existing system.

---

## Measured baseline

| Surface | Size |
|---|---|
| `site/` total | 28 MB |
| `assets/images/` total | 25.3 MB (195 image files) |
| `assets/css/styles.css` | 288 KB raw / ~62 KB gzipped / 9,555 lines |
| `assets/js/` (9 files) | 261 KB raw |
| Largest HTML page (`egypte`) | 217 KB / ~39 KB gz |
| Largest single hero JPG | `hero__kuala-lumpur--bg.jpg` 653 KB, 2000×1600 (fallback only) |
| Largest trip-card JPG | `card__home__kuala-lumpur.jpg` 399 KB, 1280×720 |
| Dead `--fg` hero variants | 42 files, ~5.7 MB |

---

## Findings

### PERF-01 — `_headers` caching/security policy is silently dropped on Vercel (no `headers` in `vercel.json`) · HIGH
`site/_headers` (`site/_headers:41-54`) defines exactly the right policy: `max-age=31536000, immutable` for images/fonts, `stale-while-revalidate` for CSS/JS, plus `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. **Vercel does not read `_headers`** (that's a Cloudflare Pages / Netlify convention). `vercel.json` (whole file, `vercel.json:1-9`) has no `headers` array, so on the stated deploy target **none of this applies**: every returning visitor re-validates immutable images instead of serving them from cache, CSS/JS lose SWR, and security headers vanish. `netlify.toml`/`wrangler.toml` confirm the project has drifted across three hosts; only Cloudflare/Netlify honor `_headers`.
**Fix:** Port `_headers` into `vercel.json` as a `headers` array (same globs, same `Cache-Control` values). Keep `_headers` for the Cloudflare/Netlify targets. No asset changes needed.

### PERF-02 — ~5.7 MB of dead `--fg` hero image variants ship in the deploy bundle · MEDIUM
The `heroes-v2/` folder contains a full foreground (`--fg`) hero set — every slug, every format (AVIF/WebP/JPEG), desktop + mobile — from an abandoned two-layer parallax hero. **No `<img>`, `<source>`, CSS `background-image`, or JS string references any `--fg` file.** The only trace is an inert `data-fg="../assets/images/heroes-v2/hero__cairo-sharm--fg.jpg"` attribute on `site/cairo-sharm/index.html:174`, and **no JS reads `data-fg`/`dataset.fg`** (grep of `assets/js/*.js` returns nothing). So even that one file never loads. Tally: 41 grep-unreferenced files + the inert cairo-sharm fg = 42 files, ~5.7 MB. Browsers never fetch these, so there's no *runtime* cost — but they bloat the Vercel deploy artifact and every git clone.
**Fix:** Delete the `heroes-v2/*--fg*` set and the inert `data-fg` attribute on cairo-sharm. Verify first with `grep -rF <basename> site` per file.

### PERF-03 — 288 KB / 9,555-line `styles.css` is render-blocking and shipped whole to every page · MEDIUM
`site/index.html:105` (and identically on every page, e.g. `site/egypte/index.html:15`) loads the entire monolith as a blocking `<link rel="stylesheet">`. It's 288 KB raw / ~62 KB gzipped and includes rules for maps, calculators, booking forms, admin, and every destination — but a given page uses a fraction. The blocking parse delays first paint on every navigation. Also inside it: **233 `!important`, 71 `backdrop-filter`, 100 `box-shadow`, 153 `transition`** — the 71 `backdrop-filter` uses are a real paint/compositing cost on mid/low-end mobile, compounded on theme toggle.
**Fix (refine, not rewrite):** (a) keep the single file but ensure PERF-01 gives it SWR so it caches; (b) optionally inline the small critical hero/nav CSS and load the rest with a non-blocking pattern (`media="print" onload="this.media='all'"`); (c) audit whether all 71 `backdrop-filter` layers are needed simultaneously (biggest real paint win). Do NOT attempt to split the file per-page without a build step — the no-build constraint makes that fragile.

### PERF-04 — Trip-card & hotel-card thumbnails are over-sized raw JPEGs (no WebP/AVIF, no `srcset`) · MEDIUM
Unlike heroes (full AVIF/WebP/JPEG `<picture>`), the card thumbnails ship as single raw JPEGs:
- Homepage trip cards (`site/index.html:366-374` and the injected grid, all `width="1280" height="720"`): `card__home__kuala-lumpur.jpg` **399 KB**, `istanbul` 311 KB, `cairo-sharm` 241 KB — 7 cards, ~1.9 MB total, stored at 1280×720 but rendered in a multi-column grid slot far smaller than 1280 px.
- Hotel cards on destination pages (25 `<img class="hotel-card__photo">` on `site/egypte/index.html` alone, e.g. `:583`, `:608`), all raw `.jpg` at 800×600, ~80-165 KB each.
They are correctly `loading="lazy"` with dimensions (good — no CLS), but they're 2-3× heavier than a q75 WebP/AVIF at the displayed size.
**Fix:** Generate WebP/AVIF siblings and wrap in `<picture>` (reuse the hero pipeline), and/or add a `srcset` with a smaller intrinsic width matching the grid slot. Even WebP-only would roughly halve these bytes.

### PERF-05 — Google Fonts stylesheet is render-blocking and fragmented across 3 request strings · MEDIUM
Every page loads fonts via a blocking `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` (`site/index.html:100-102`, `site/egypte/index.html:12`). `display=swap` and `preconnect` to `fonts.gstatic.com` are present (good — no FOIT), but the request string differs across pages:
- Homepage: `family=DM+Sans:wght@300;400;500;600;700&family=DM+Sans:ital,wght@1,400`
- Destination pages: `family=DM+Sans:opsz,wght@9..40,...` (variable `opsz` axis)
- `egypte` additionally pulls **`Sora:wght@600;700`** — the only page that does.
Three distinct URLs ⇒ three distinct browser cache entries ⇒ a visitor navigating home → destination re-downloads a fonts CSS + font files instead of reusing cache. The blocking `<link>` also sits in the critical path.
**Fix:** Standardize on ONE `css2` request string across all pages (pick the `opsz` variable-font form; confirm Sora is actually used on egypte before keeping it — if it's a stray, drop it). Optionally load the fonts CSS non-blocking (`media="print" onload`) since `swap` already handles the fallback. Self-hosting the two woff2 files (the dead `/assets/fonts/*` rule in `_headers:49` shows this was once intended) would remove the third-party round-trip entirely.

### PERF-06 — Homepage LCP preload targets WebP while `<picture>` prefers AVIF (wasted fetch on AVIF browsers) · LOW
`site/index.html:95-99` preloads `hero__cairo-sharm.webp` with `fetchpriority="high"`, but the hero `<picture>` lists AVIF *before* WebP (`site/index.html:282-284`). On an AVIF-capable browser the preload fetches the WebP (~244 KB) that the `<picture>` then ignores in favor of the AVIF — a wasted parallel download competing with the real LCP. WebP browsers are matched correctly. (Interior pages have the same shape but `--bg` webp preload matches their `<picture>` order for webp browsers; same AVIF caveat, e.g. `site/egypte/index.html:38-42`.)
**Fix:** Either preload the AVIF (`type="image/avif"`, and add a second `type="image/webp"` preload for non-AVIF), or accept the minor waste. Low severity because WebP is still a valid decode; it's bandwidth, not a broken paint.

### PERF-07 — Service worker classifies immutable images as stale-while-revalidate (background re-fetch every visit) · LOW
`site/sw.js:91` routes images through the SWR branch alongside CSS/JS, even though the header comment (`site/sw.js:8`) says images should be *cache-first* ("immutable once shipped"). SWR issues a background network fetch for every already-cached image on every visit — harmless to the visible render, but needless data on repeat visits (and it contradicts the intended policy). Filenames are content-stable, so cache-first is safe.
**Fix:** Add a cache-first branch for `isImage(url)` ahead of the SWR branch; keep SWR for CSS/JS only. Bump `CACHE_NAME` (`sw.js:17`) on release as the file already instructs.

### PERF-08 — ~29 MB of source PDFs are git-tracked (incl. a 31 MB file); slow clones, no deploy impact · LOW
`git ls-files "source of truth"` returns 37 tracked PDFs totaling ~50 MB, including `alliance travel  graphic chart .pdf` at **31.6 MB** and `AZERBAIDJAN ETE 2026.pdf` at 7.2 MB. They live outside `site/`, so Vercel (`outputDirectory=site`) never serves them — **zero page-load impact** — but they bloat every clone/checkout and the git history permanently. `.gitignore` does not exclude `source of truth/`.
**Fix:** If these are reference material, move them out of the repo (or into Git LFS) and add `source of truth/` to `.gitignore`. Purging history is optional and higher-risk; at minimum stop tracking new ones. Not a runtime perf issue — flagged for repo hygiene.

### PERF-09 — ~690 KB of unreferenced legacy AVIFs in the old `heroes/` folder · LOW
The old `heroes/` folder (used by the homepage collage) contains AVIFs that are still loaded via JS string-concatenation (`hero-collage-lazy.js:38`, `base + '.avif'`) for the slugs `cairo-sharm/azerbaidjan/istanbul/kuala-lumpur/sharm-constantine` — those are **live**. But a handful (verify per-file) are not built by any slug the collage requests. Because the collage builds URLs dynamically, a literal-filename grep can't fully prove liveness; treat this as "audit before delete," lower confidence than PERF-02.
**Fix:** Cross-check each `heroes/*.avif` against the collage's `data-lazy-hero` slug list (`index.html:288-303`) plus the eager `cairo-sharm` tile; delete only those matching no slug. Small win; verify carefully because of the dynamic URL construction.

---

## What's already good (do not "fix")

- LCP hero preloaded with `fetchpriority="high"` + per-viewport `imagesrcset` (`index.html:95-99`).
- Hero images: full AVIF → WebP → JPEG ladder with mobile crops (`egypte/index.html:177-183`).
- All page JS is `defer`red (`index.html:1451-1455`); nothing render-blocking except CSS/fonts.
- MapLibre lazy-loaded on IntersectionObserver with SRI + `crossorigin`, 30 s safety boot (`map-base.js:59-82`, `142-182`) — heavy third-party kept off the critical path.
- Hero collage tiles 2-5 deferred until after `load` + idle (`hero-collage-lazy.js`) so they don't steal LCP bandwidth.
- Below-fold `<img>`s carry `loading="lazy"` + explicit `width`/`height` (no CLS) — e.g. hotel cards, trip cards.
- `display=swap` + `preconnect` to gstatic on every font-loading page (no FOIT).
- Service worker: network-first HTML, SWR assets — sound offline strategy (aside from PERF-07).
