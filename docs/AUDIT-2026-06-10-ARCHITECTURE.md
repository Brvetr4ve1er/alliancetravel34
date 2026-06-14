# Architecture & Design Audit — 2026-06-10

Scope: full codebase scan of `site/` (9 HTML pages, 11 JS modules, 1 CSS file, SW, deploy config).
Companion report: `AUDIT-2026-06-10-CLEANUP.md` (unused files / obsolete assets, produced by cleaner agent).
**No changes made — audit only.**

---

## Verdict in one paragraph

The site is in better shape than most hand-built static sites — the deploy layer (`_headers`, `_redirects`, `sw.js`), SEO layer (canonicals, JSON-LD `TravelAgency`/`TouristTrip`/`FAQPage`/`BreadcrumbList`, complete sitemap), and the calculator's defensive coding are genuinely professional. The flaws are almost all consequences of **one root decision: 9 pages maintained by hand with zero build step**. Everything duplicated across pages has already started to drift, and the repo's own history (35 one-off Python patch scripts now in `_archive/migrations/`) is proof that cross-page edits don't scale. The second structural weakness is **data duplication**: prices exist in 3 places per trip page, contact numbers in ~130 places site-wide.

---

## A. Architectural flaws (root causes)

### A1 — No templating/build layer (CRITICAL, root cause of most findings below)
Every page hand-duplicates `<head>`, nav, footer, and script includes. Measured drift already present:

| Evidence | Detail |
|---|---|
| Nav markup drift | `cairo-sharm` nav has `role="navigation" aria-label="Navigation principale"`; `rendez-vous-visa` has only `aria-label`; the other 6 pages have neither |
| Logo drift | index + 5 trip pages inline a **25 KB raw SVG logo** (82 clipPaths) in the nav; `voyages` + `rendez-vous-visa` use a plain styled-text logo instead — two different brands renderings, and ~150 KB of duplicated markup across the site |
| Maintenance history | 35 one-off Python migration scripts (`_phone_city_migrate.py`, `_migrate_colors.py`, `_patch_wa_links.py`, …) were needed to make cross-page changes — that's a build step being reinvented badly, one emergency at a time |

**Recommendation:** adopt a minimal static build (Eleventy, or even a single Python/Node build script with partials for head/nav/footer + a data file for trips). Keep output identical; this is a refactor, not a redesign. Replace the inline logo SVG with `<img src="/assets/images/logo.svg">` (file already exists) or an optimized inline symbol — the current SVG is unoptimized Inkscape/Illustrator output.

### A2 — Price data has no single source of truth (HIGH)
On each trip page the same price appears in **three hand-synced places**:
1. Static comparison table (`<strong>192.000 DA</strong>`, line ~620 in cairo-sharm)
2. Hotel `<select>` option labels (`Tivoli Aqua Park 4★ — dès 192.000 DA`, line ~821)
3. `window.TRIP_DATA` inline JS blob (line ~1189)

A price update that touches only one of the three silently shows customers two different prices. This is the highest *business-risk* flaw in the codebase.
**Recommendation:** make `TRIP_DATA` the single source and render table + option labels from it at build time (with A1) or at runtime (small JS, no build needed).

### A3 — i18n is half an architecture (HIGH)
- `i18n.js` is **95 KB** (≈900 lines of FR/EN/AR dictionaries) and ships to **every** page.
- But trip pages expose only **13–15** `data-i18n` hooks (nav only) vs 95 on the homepage and 192 on the visa page. Switching to EN/AR on a trip page translates the nav and leaves the entire body French — the language pill promises something the page doesn't deliver.
- Client-side-only switching also means EN/AR content is invisible to search engines (`hreflang` is only `x-default`, correctly — there are no per-language URLs to point at).

**Recommendation:** decide the product question first — is AR/EN a real launch requirement?
- If yes: finish wiring trip-page content (the dictionaries partly exist already) and consider per-language URLs later for SEO.
- If no for this release: hide the switcher on pages that aren't translated, and split the dictionary per page so each page loads only its own strings (the 95 KB monolith is mostly dead weight on every page).

### A4 — No minification pipeline (MEDIUM-HIGH)
Per-page uncompressed payload: `styles.css` **310 KB / 9,977 lines** + `i18n.js` 95 KB + `enhance.js` 46 KB ≈ **450 KB** of unminified text on every page. Cloudflare brotli softens transfer size but parse cost and cache size remain. All 9 pages load the entire 10k-line stylesheet regardless of which components they use.
**Recommendation:** add a 10-line build step (esbuild/lightningcss) producing minified bundles; longer-term, split page-specific CSS. 234 `!important` in styles.css signals specificity battles worth untangling during the split.

### A5 — Contact data scattered as literals (MEDIUM)
Main WhatsApp number `213561616266` appears **87 times**; 5 other numbers ~10× each (~130 hardcoded contact literals across HTML/JS). The agency changing one number = another `_patch_wa_links.py` emergency.
**Recommendation:** with A1, centralize in one data/config include. Without a build step, at minimum have JS hydrate `href`s from one constant.

---

## B. Design / implementation flaws (contained, fixable independently)

### B1 — Runtime third-party CDN dependency for the globe (MEDIUM)
`globe.js` dynamic-imports `cobe@0.6.4` from `esm.sh` at runtime. No SRI possible on dynamic `import()` (acknowledged in the file's own comment). If esm.sh is slow/blocked (relevant for DZ networks), the globe dies; worse, a compromised CDN executes arbitrary JS on your page.
**Recommendation:** self-host the ~50 KB cobe bundle under `assets/js/vendor/`. Also removes the SW's special-case CDN caching.

### B2 — Google Fonts via CSS `@import` (LOW-MEDIUM)
`styles.css:6` uses `@import url(fonts.googleapis.com/...)` — the font CSS fetch can't start until styles.css fully downloads, serializing the chain (preconnect hints exist but don't fix the chaining). Move to a `<link rel="stylesheet">` in HTML (with A1's shared head partial), or self-host the fonts (best for DZ latency + GDPR-ish hygiene).

### B3 — Service worker runtime cache never pruned (LOW-MEDIUM)
`sw.js`: `RUNTIME = 'alliance-runtime'` is exempted from the activate-purge and has no entry cap. Every image/CSS/JS version ever fetched accumulates forever on user devices. Also the header comment says images are "cache-first (immutable)" but the code applies stale-while-revalidate to everything — doc drift.
**Recommendation:** version the runtime cache name with the release (or add a simple max-entries trim on activate); fix the comment.

### B4 — No Content-Security-Policy (LOW-MEDIUM)
`_headers` has a solid baseline (nosniff, XFO, Referrer-Policy, Permissions-Policy) but no CSP. The site uses inline scripts (TRIP_DATA blobs, JSON-LD, boot snippets), so a strict CSP needs work — but even `script-src 'self' 'unsafe-inline' https://esm.sh; object-src 'none'; base-uri 'self'; frame-ancestors 'self'` would cut XSS blast radius. Self-hosting cobe (B1) simplifies this. Consider also `Strict-Transport-Security` if not already set at the Cloudflare zone level.

### B5 — Order-dependent inline script (LOW)
`site/index.html:412` has an inline `<script>` whose own comment admits it must sit *before* `.trips-grid` in source order to work. Fragile under any future reordering; should be a deferred listener keyed on DOMContentLoaded like everything else.

### B6 — Accessibility consistency (LOW)
Beyond the nav drift (A1): pages are otherwise consistent (skip links, aria-labels on CTAs, `lang`/`dir` toggling in i18n). One page having `role="navigation"` and others not is purely a duplication symptom — fix via A1.

---

## C. What is genuinely good (keep, don't churn)

- `_redirects`: trailing-slash normalization + typo aliases + an explicit, correct refusal of the SPA-fallback anti-pattern.
- `_headers`: sensible caching tiers (HTML 1h, CSS/JS 10min+SWR, images immutable, SW never cached) with the reasoning documented inline.
- `sw.js`: minimal atomic precache (learned from the 2026-06-05 audit), network-first HTML, version-bumped cache name.
- SEO: per-page canonicals on the real domain, complete sitemap (8/8 pages), rich JSON-LD (TravelAgency ×6, TouristTrip ×5, FAQPage ×5, BreadcrumbList ×5), descriptive unique titles.
- `calculator.js`: clean class structure, `Intl.NumberFormat` with an explicit NaN guard, null-safe state init.
- `enhance.js`: well-sectioned modules, safe-localStorage wrapper, single scroll coordinator.
- Images: `loading="lazy"` on 20/21 sampled `<img>`, AVIF/WebP variants, hero preloads with `imagesrcset`.

---

## D. Content-readiness flags (not code, but blocks "ready for deployment")

- **Trip dates vs today (2026-06-10):** cairo-sharm sells departures 12/19/26 Juin 2026 — the first is in 2 days; Istanbul's source doc is "MARS AVRIL MAI 26" (already past). The site will look stale within weeks of launch. Worth a content pass with the agency before go-live.

---

## Priority order for fixes (proposed, pending your go)

| # | Fix | Effort | Risk |
|---|---|---|---|
| 1 | A2 — render prices from TRIP_DATA only | S | Low |
| 2 | B1 — self-host cobe | S | Low |
| 3 | B2 — fonts out of `@import` | S | Low |
| 4 | B3 — SW runtime cache versioning | S | Low |
| 5 | A3 — i18n decision (hide switcher where untranslated, or finish wiring) | M | Low |
| 6 | A4 — minify pipeline | S–M | Low |
| 7 | B4 — baseline CSP | S | Med (needs testing) |
| 8 | A1 — templating/build layer (subsumes logo, nav, contact-data fixes) | L | Med |
