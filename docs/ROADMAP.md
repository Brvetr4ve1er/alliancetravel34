# Roadmap — what was done and what's next

This file tracks shipped work and the deferred items.

---

## Phase 1 · Critical fixes — ✅ COMPLETE

Six commits on `refactor/audit-execution` (merged into `main` at `005ccfc`):

| Commit | Purpose | Files touched |
|---|---|---|
| `d1401a5` `chore` | Archive 12 Python scripts + 7 `_v*_styles.css` + temp logs + `agent-handoff/` snapshot. Consolidate docs into `docs/`. Project root went from 25+ entries to 6. | move-only |
| `eef5ad8` `chore(assets)` | Generate favicons (16/32/96/180/192/512 + .ico) and 6 page-specific OG share images (1200×630) via Pillow. Inject favicon + OG meta tags into all 6 pages. Add PWA manifest. | 6 HTML + 14 image files + manifest |
| `71cabdd` `perf(images)` | Compress hero JPGs (q=78), generate WebP variants and mobile-cropped versions. Wire `<picture>` with WebP-first sources on the homepage collage. CSS hero rules use `image-set()` with mobile media queries. | 5 JPGs + 15 new images + index.html + styles.css |
| `00455c3` `feat(booking)` | Add email + clipboard fallbacks to the WhatsApp flow. Three actions: WhatsApp primary, mailto: with full dossier, copy with `execCommand` fallback. | booking-form.js |
| `ec204db` `fix(robustness)` | Safe-localStorage wrapper, cobe CDN graceful fallback, lightbox focus restoration + keyboard activation, `:has()` nav-push fallback via body class, press-strip honesty audit. | enhance.js + enhance-pro.js + globe.js + styles.css |
| `27ae633` `perf` | Font subset (drop italic 300, add 700), mobile globe `mapSamples`, service worker (offline cache). | enhance.js + globe.js + sw.js + 6 HTML |

---

## Phase 1.5 · Maps + readability pass — ✅ COMPLETE

Eight commits across four feature branches (all merged into `main`):

| Branch | Commits | Purpose |
|---|---|---|
| `feat/algeria-map-real-geography` | `c39c076`, `67f6628` | Replace broken SVG outline of Algeria on the homepage with a real **MapLibre GL** vector map. Pins at Bordj Bou Arreridj HQ + Sétif + Alger + Constantine + Oran. CARTO basemap (no API key). Loading state + reduced-motion support. New file: `site/assets/js/algeria-map.js` (501 lines). |
| `feat/trip-itinerary-maps` | `31d24cd`, `27d5747` | Add **per-trip itinerary maps** to all 5 trip pages. Day-by-day route polylines, sequenced numbered pins, hover/click popups. New file: `site/assets/js/trip-map.js` (561 lines). Per-page `TRIP_MAP_DATA` array currently lives inline in each `index.html`. |
| `feat/trip-map-readability` | `a05bbd8` | Bigger map containers, larger pins, clearer day-labels, more breathing room. Pass over both Algeria and trip maps. |
| `feat/maps-anti-clutter` | `e0c0615` | **8-strategy anti-clutter engine** shared by both map types: screen-space pin stacking, label collision avoidance, click-to-isolate route, single-popup mode, viewport-aware label visibility, debounced re-layout on zoom/pan, hover-to-promote, escape-to-clear. |

Plus a parallel cleanup branch:

| Branch | Commits | Purpose |
|---|---|---|
| `refactor/cleanup-bloat` | `f74d9ac`, `70aa8a6`, `6a65c48` | Remove dead Algeria-SVG-era CSS/keyframes, drop the SVG tombstone, dedupe `.gitignore`, delete unused `site/assets/images/sites/` folder. |

---

## Phase 2 · Refactoring — ⏳ DEFERRED

### Why deferred

These three changes need either a build step (Vite / 11ty) or a sibling-wide module conversion. Doing them piecewise without that infrastructure introduces subtle timing bugs (data not loaded before consumer reads it; CSS `@import` chain causes render-blocking waterfall; module/non-module mixed scripts behave differently at boot).

The audit recommended Vite. The previous user direction was "no build step". This is a decision point you need to make.

### Phase 2.1 · Extract data to JSON

**What:** Move trip data, hotel data, agency contact info into `src/data/*.json` so the agency owner can edit one file instead of finding-and-replacing across 6 HTML pages and 7 JS files.

**Files needed:**
- `src/data/agency.json` — `{ name, phone, phoneDisplay, whatsapp, email, address, city }`
- `src/data/trips.json` — array of `{ slug, region, name, subtitle, priceFromDA, accent, departures, hotels, heroImage, summary, mapData }`
- `src/data/hotels.json` — keyed by id, `{ name, stars, city, board, image }`

**Why:** Today, changing the phone number `+213561616266` requires editing **12+ places** (HTML × 6 + 4 JS files). Trip price/date changes require editing 5 places (HTML, `calculator.js`, `enhance.js` `ALL_TRIPS`, `globe.js` `DESTINATIONS`, `trip-map.js` per-page `TRIP_MAP_DATA`). See [docs/CLEANUP-FLAGGED.md](CLEANUP-FLAGGED.md) #13–14.

**Implementation paths:**
1. **With Vite (recommended):** import JSON, template-render HTML, compile-time inline. Zero runtime cost.
2. **Without build:** Convert all 7 JS files from IIFE to ES modules, then `import` the data. Mixed module/non-module load order makes this fragile.
3. **Pragmatic middle:** Generate the JSON files for documentation + write a small Python "build" script (`_archive/migrations/_apply_data.py`) that injects from JSON into HTML/JS via regex when run manually.

### Phase 2.2 · Split `styles.css`

**What:** Break the **6,625-line / 165 KB monolith** (layered v1 → v11) into ITCSS-style modules:

```
src/styles/
  01-tokens.css       ← :root + light theme
  02-reset.css
  03-base.css
  04-layout.css
  05-components/      ← nav, hero, trip-card, hotel-card, calculator, map, …
  06-pages/           ← home.css, trip.css
  07-utils.css
  main.css            ← @imports the modules in order
```

**Why:** Currently `.btn--primary` is defined **4 times**, `.site-nav` **5 times**, with **163 `!important` declarations** to resolve cascade conflicts. Modular structure makes drift impossible. See [docs/CLEANUP-FLAGGED.md](CLEANUP-FLAGGED.md) #10–12.

**Implementation:** A bundler concatenates them at build time. Without one, native `@import` works but creates a render-blocking waterfall (one HTTP request per `@import`). Don't ship native `@import` to production.

### Phase 2.3 · Split `enhance-pro.js`

**What:** Break the **600-line IIFE with 14 numbered sections** into focused ES modules:

```
src/scripts/components/
  reveals.js
  parallax.js
  magnetic-buttons.js
  scroll-progress.js
  fab.js
  trust-strip.js
  sticky-bar.js
  lightbox.js
  accordion.js
  press-strip.js
  value-props.js
src/scripts/main.js  ← imports + boots in order
```

**Why:** When section 15 needs adding, there's no structural ceiling on the current IIFE. Single-responsibility modules are testable, tree-shakeable, lazy-loadable.

**Implementation:** All consumers (`calculator.js`, `booking-form.js`, `enhance.js`, `algeria-map.js`, `trip-map.js`, `globe.js`) need to become modules too, or stay IIFE and the new module sits alongside. Either path is risky without tests; a build step makes the migration safe.

---

## Phase 3 · Optimization — partially ✅

| Item | Status |
|---|---|
| Font subset | ✅ commit `27ae633` |
| Mobile globe `mapSamples` | ✅ commit `27ae633` |
| Service worker | ✅ commit `27ae633` |
| Image pipeline (AVIF + WebP + JPG, 3 widths) | ✅ partial (WebP + 2 widths in `71cabdd`) |
| `fetchpriority` cleanup | ✅ commit `71cabdd` |
| Self-host cobe | ⏳ deferred — esm.sh bundle pulls phenomenon dep chain too tangled to bundle without a real bundler |
| Self-host MapLibre GL | ⏳ deferred — same reason; ~200 KB minified + worker chunk needs proper bundling |
| Critical CSS inlined | ⏳ needs build step |
| HTTP cache headers | ⏳ host-side config (Netlify `_headers` / Vercel `vercel.json`) |
| Lazy-load `calculator.js`/`booking-form.js`/`trip-map.js` | ⏳ deferred (intersection observer + dynamic import) |
| Defer map-tile fetches until in-viewport | ⏳ low priority — Algeria + trip maps are below the fold so most users never trigger |

---

## Phase 4 · UX/UI Upgrade — ⏳ DEFERRED

| Item | Effort | Notes |
|---|---|---|
| Arabic (RTL) version | L | Needs translator + `lang="ar"` switcher + `dir="rtl"` style audit |
| Real testimonials with photos | M | Needs agency to collect consent + portrait photos |
| Real lead-capture form | M | Pick: Formspree (no-code), Cloudflare Worker (free), Supabase |
| Mobile drawer nav (focus trap, scroll lock) | S | Improve current hamburger |
| Lightbox a11y pass | partial ✅ | Focus restore + keyboard activation done in `ec204db`. Still need: focus trap inside lightbox, `aria-modal=true`. |
| Calculator sticky-pill on mobile | S | Show running total in viewport at all times |
| Map keyboard navigation | S | MapLibre supports kbd nav natively but custom popup logic needs Esc handling + tab order audit |

---

## Phase 5 · Scalability — not started

| Item | Recommendation |
|---|---|
| Lead capture backend | **Cloudflare Worker** writing to **Airtable** (free tier covers ≤1k submissions/mo) |
| Analytics | **Plausible** (privacy-first, GDPR-friendly, ~$9/mo for 10k pageviews) — track WhatsApp click + email click + scroll depth + map interactions |
| CMS | **Decap CMS** (Git-based, no DB) → trip + hotel content edited via web UI, commits to repo, rebuilds on push |
| A/B testing | **GrowthBook** (open-source) + Cloudflare Worker for edge flag |
| Multi-currency | DZD + EUR + USD with currency switcher |
| `Schema.org` rich data | `TouristTrip`, `Offer`, `Reservation` per trip page |
| Sitemap.xml + robots.txt | Generate from `trips.json` |
| Lighthouse-CI | Block PRs that regress LCP / CLS / TBT |

---

## Performance budget (target, enforce in CI)

| Metric | Budget |
|---|---|
| LCP (3G mobile) | ≤ 2.0 s |
| CLS | ≤ 0.05 |
| INP | ≤ 200 ms |
| Total page weight (HTML + CSS + JS, gzipped) | ≤ 80 KB / page |
| Hero image at mobile breakpoint | ≤ 100 KB |
| Lighthouse Performance | ≥ 90 mobile, ≥ 95 desktop |
| Lighthouse Accessibility | 100 |

---

## Open questions for the project owner

1. **Build step (Vite or 11ty)?** Most of Phase 2 is blocked on this decision.
2. **Real press / partner relationships?** The press strip is currently 5 honest commitments. If actual outlets exist, they go back in (with proof).
3. **Arabic version scope?** Full translation, or just nav + key headers?
4. **Backend for lead capture?** Pick Formspree / Cloudflare / Supabase / serverless.
5. **Testimonials sourcing?** Need real customers + signed consent.
6. **Domain?** All canonical URLs assume `https://alliance-travel.dz/` — confirm or update.
7. **Cleanup carry-over?** [docs/CLEANUP-FLAGGED.md](CLEANUP-FLAGGED.md) lists items currently flagged 🟡 (kept on purpose) and 🔴 (structural debt). Sign off / re-prioritize as needed.

---

## How to continue

All audit + maps + cleanup branches are merged into `main` (15+ commits ahead of the original `main` snapshot at `50f7497`). The local feature branches have been deleted; commits remain reachable from `main`.

```bash
git checkout main          # the live state
git log --oneline -25      # walk through every commit since the original snapshot
```

Next pickup-points (no current branches):

- **Phase 2.x refactor:** create a fresh `feat/build-step-vite` branch once the Vite-or-not decision is made (open question #1).
- **Phase 4 lightbox a11y completion:** small `fix/lightbox-focus-trap` branch.
- **Phase 5 lead capture:** new `feat/lead-capture-worker` branch once backend is chosen (open question #4).

For every cleanup-or-debt item see [docs/CLEANUP-FLAGGED.md](CLEANUP-FLAGGED.md).
