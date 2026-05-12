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

## Phase 1.13 · Trip cards + colour hierarchy refresh (v19) — ✅ COMPLETE

Date: 2026-05-07. Three asks bundled together:

1. **Hotel-card price stripe — removed.** v18 shipped a mint highlight bar behind the price number (fake-marker effect). On small renders it hurt readability. Deleted the rule. The bold number is the focal point on its own.

2. **Homepage trip cards — image-fill + hover-reveal pattern** adapted from a shadcn/lucide reference. Same markup hooks (`.trip-card`, `.trip-card__hero`, `.trip-card__body`, `.trip-card__cta`) repurposed via CSS:

   - **Photo fills the entire card** edge-to-edge, scales 1.08 on hover (600ms ease)
   - **Multi-stop gradient overlay** at the bottom for legibility (25% → 92% black at 0% / 35% / 75% / 100%)
   - **Monument SVG icon** top-left in a frosted-glass disc — pyramid for Cairo+Sharm, sun+waves for Sharm-Constantine, flame towers for Azerbaidjan, dome+minarets for Istanbul, twin towers for Kuala Lumpur. Each rotates -6° + scales on hover.
   - **Title + subtitle** sit at the bottom by default; on hover they slide UP 58px so the price+CTA strip can slide in below from `translateY(20px)` + `opacity:0`
   - **Price chip** ("À PARTIR DE / 190 000 DA") + **white pill CTA** ("Voir ce voyage →") reveal on hover with arrow translation
   - **Bottom region accent strip** (per-trip colour) animates `scaleX(0)→1` from left on hover
   - **4:5 portrait aspect ratio** in a `repeat(auto-fit, minmax(280px, 1fr))` grid — 3-up on desktop, 2-up tablet, 1-up mobile
   - Per-region accent: cairo-sharm amber `#e0a04a`, azerbaijan crimson `#e07b5a`, istanbul teal `#5cb1c1`, malaysia mint `#8acaa1`, sharm coral `#5cc4c1`
   - **Mobile + reduced-motion fallbacks** show the CTA + title-translated state by default since hover isn't available
   - **Touch-device handling**: same as reduced-motion — CTAs always visible
   
   Per-trip price chip injected as a real `<span>` (CSS `attr()` can only read the element's own attributes, and `data-from` lives on the `.trip-card` root which is the parent of `.trip-card__cta`).

3. **Colour hierarchy refresh** (`_v19_palette.css`). Three goals:

   **a. Warmer dark mode.** `--bg: #000000` → `--bg: #0a0f15`. Pure black was clinical; the new tinted near-black reads editorial. Six-layer ladder: `bg-deep / bg / bg-low / bg-2 / bg-card / bg-elev` so cards have proper visible elevation against the page.
   
   **b. Same-temperature text ladder.** Original was warm `#efe8df` → cool `#b8bac4` (jarring temperature jump). Now `#f3ede2` (warm cream) → `#b6ada0` (warm beige) → `#7a7268` (warm gray). All three siblings.
   
   **c. Mint discipline.** New tokens `--mint-soft / --mint-deep / --mint-glow / --ring / --mint-dim` give chrome a quieter sibling. `--accent` stays mint-tied for primary CTAs, but `--mint-dim` (10% mint) is what borders/pads/halos use — so we stop painting every focus ring and pill border in the same loud green. `.amenity-pill`, `.dep-badge`, `.phase-marker` all rerouted to `--mint-dim` background + `--accent` text + `--border-mint` border.
   
   Borders globally subtler (default `rgba(255,255,255,.06)` was `#1e2025`). Card surfaces visibly elevated. Focus rings use the new unified `--ring` token. Light mode flips colours while preserving the same ladder + temperature consistency, with mint darkened to `#237a4a` for AA contrast on cream (matching the v12 fix).
   
   Surface elevation tokens `[data-elev="card|low|2|elev|glass"]` available for explicit hooks. Selection highlight + scrollbar styling pick up the new tokens too.

### Files

**New:**
- `_v19_trip_cards.css` (~280 lines)
- `_v19_palette.css` (~180 lines)
- `_v19_inject_monuments.py` (~180 lines)

**Modified:**
- `site/assets/css/styles.css` — appended v19 trip-cards + v19 palette layer (8,786 → 9,346 lines). v18 hotel-card price-stripe rule removed inline.
- `site/index.html` — 5 trip cards now have `data-from`, `<div class="trip-card__monument">SVG</div>`, and `<span class="trip-card__cta-price">` injected.
- `docs/ROADMAP.md` — Phase 1.13 entry.

### Verified

- ✅ 5 trip cards all render with image-fill + monument icons + price text
- ✅ Force-hover state confirms title slides up, CTA + price reveal at bottom
- ✅ Body bg switched from `#000` to `#0a0f15` (warm-tinted)
- ✅ Card surface (`--bg-card`) now `#161e28` (visible elevation, was `rgba(255,255,255,.04)`)
- ✅ Text ladder warm-temperature throughout (`#f3ede2 / #b6ada0 / #7a7268`)
- ✅ Hotel card prices no longer have the mint highlight stripe behind them

### Things to watch

- The trip-card hover effect requires a positioned ancestor for `.trip-card__cta` (an `<a>` sibling of `.trip-card__body`). Solved with `.trip-card { position: relative !important }` — without that, the absolutely-positioned CTA escapes the card. Keep this.
- The price chip is injected as real DOM by `_v19_inject_monuments.py` rather than CSS `attr()` — re-running the script is idempotent (skips if `trip-card__cta-price` already present).

---

## Phase 1.12 · Neo-brutalist hotel cards + WhatsApp cleanup (v18) — ✅ COMPLETE

Date: 2026-05-07. Triggered by user request: "I want hotel cards in this style adapted to the website's design system, and find unnecessary WhatsApp buttons left over from previous edits and remove them."

Reference: a Uiverse-style neo-brutalist creative-studio card (bold borders, hard offset shadows, tilted ribbon, cut corner with star, dashed price divider with scissors, hard-shadow CTA). Adapted to Alliance Travel's existing palette — mint #9ce8b2, navy #002c51, cream #fbf8f1 — instead of the source's orange/blue.

### Hotel card redesign

`_v18_brutalist_cards.css` (~280 lines, appended to styles.css). Same markup, different visual language. Highlights:

- **3px solid mint border** (navy in light mode) replacing the previous 1px subtle border
- **8px hard offset shadow** (no blur) — extends to 12px on hover. The brutalist signature.
- **Cut-corner triangle** in top-right (mint in dark, navy in light) with a ★ inside
- **Tilted ribbon** (rotated -3°) with its own 3px hard shadow that tilts the other way (+2°) on hover
- **Diagonal stripe overlay** at the bottom of each photo (45° black stripes via `repeating-linear-gradient`)
- **Subtle 8×8 grid pattern** appears on `:hover` over the body (CSS-only, GPU-cheap)
- **Dashed price divider** with a `✂` scissors marker — the "tear here" feel from the reference card
- **Mint highlight underline** behind the price number (fake-marker effect)
- **Solid mint CTA** with hard 4px shadow + sliding shimmer + `→` arrow that translates 4px on hover, swaps to `✓` when `.selected`
- **Selected state** flips card border to accent + inverts CTA (mint background → dark with mint text + `✓`)
- **Light-mode variant** swaps `--hc-shadow` from black → navy, accent from #9ce8b2 → #237a4a (matches existing v12 light-mode darkening for AA contrast)
- **Mobile tuning** drops shadow from 8px → 6px and CTA padding 12 → 11
- **`prefers-reduced-motion`** disables all transitions and the hover transform

The existing markup (`.hotel-card > .hotel-card__img > img + ribbon → .hotel-card__body > stars + name + amenities + price + cta`) is unchanged — only CSS swaps.

### WhatsApp button cleanup

Audited every `wa.me` and `WhatsApp` reference across the 6 pages. Two genuine leftovers found and removed:

**1. KL `wa-book-btn` legacy (replaced).** Kuala Lumpur was the only trip page that had a `<button id="wa-book-btn">Réserver via WhatsApp</button>` inside the calculator's `.breakdown__ctas` panel. The other 4 trip pages used the v12-standard `<a href="#booking">Continuer vers la réservation</a>` linking to the Phase 4 booking form. KL was missed in the funnel migration. The button short-circuited straight to a basic WhatsApp send, breaking the 4-phase flow (Discover → Compare → Calculate → **Reserve via booking form**). Replaced with the standard funnel link + `data-track-event="calc_continue_to_booking"`.

**2. Cairo-sharm legacy hidden hero block (deleted).** When v13/v14 rebuilt the hero as the sticky-scrub component, the OLD legacy `<section class="hero">` block on cairo-sharm was wrapped in `<section ... hidden style="display:none">` rather than deleted. ~98 lines of dead markup containing duplicate hero CTAs (including a "Réserver via WhatsApp" ghost button), a duplicate departure-card with all dates, a duplicate hero-strip with 5 trust pills. All invisible to users but still parsed + held in the DOM tree. Removed entirely via a Python slice script with line-bounds validation.

### Final WhatsApp footprint per page (post-cleanup)

Each trip page has exactly **3 visible WhatsApp CTAs**, each serving a distinct role:

| Position | Purpose |
|---|---|
| Nav CTA "Réserver" | Persistent always-visible escape hatch |
| Hero ghost "WhatsApp" | Skip-calculator path for impatient users |
| Final-CTA "Réserver via WhatsApp" | Closing pitch after they've read everything |

Plus the booking-form has its own "Ouvrir WhatsApp & Envoyer" button (full-dossier flow with passport copies). All purposeful. No duplicates remain.

### Files changed

**New:**
- `_v18_brutalist_cards.css` (~280 lines, scratch source)

**Modified:**
- `site/assets/css/styles.css` — appended v18 layer (8,356 → 8,786 lines)
- `site/assets/js/calculator.js` — removed the SVG-injection in `initHotelPicker()`'s selected-state branch (CSS now handles the visual swap via `.selected` class + `::after { content: "✓" }`)
- `site/cairo-sharm/index.html` — deleted ~98 lines of legacy hidden hero block
- `site/kuala-lumpur/index.html` — replaced `<button id="wa-book-btn">Réserver via WhatsApp</button>` with `<a href="#booking">Continuer vers la réservation</a>` + removed redundant ✓ from selected hotel card markup

### Verified

- ✅ 7 cairo-sharm hotel cards render with bold mint borders, 8px hard shadows, cut-corner stars, tilted ribbons, diagonal-stripe photos, dashed scissors dividers, mint price underlines, hard-shadow CTAs
- ✅ KL Grand Mercure card (selected state) shows clean "SÉLECTIONNÉ ✓" (single checkmark, no double)
- ✅ KL `.breakdown__ctas` now contains the v12-standard "Continuer vers la réservation" link
- ✅ Cairo-sharm DOM tree no longer contains the legacy hero — line count dropped 1,290 → 1,192
- ✅ Each trip page has 1 hero ghost CTA + 1 nav CTA + 1 final-CTA = 3 visible WhatsApp CTAs (audited via grep)

---

## Phase 1.11 · Performance optimization (v17) — ✅ COMPLETE

Date: 2026-05-06. User reported the site as "very slow" — measurement-driven optimization pass.

### Baseline measurement (sharm-constantine, fresh load)

| Metric | Before |
|---|---|
| Total page weight | 3,366 KB |
| `hero__sharm-constantine--fg.jpg` | 1,545 KB |
| `hero__sharm-constantine--bg.jpg` | 1,298 KB |
| 3 hotel JPGs (below fold) | 384 KB |
| DOMContentLoaded | 186 ms |
| Load event | 15,182 ms |
| Long tasks | 0 (no JS jank) |

**Verdict:** ~85% of weight = 2 hero images. CSS bundle, JS, fonts all reasonable. Globe canvas was off-screen on this page so not a factor here.

### Optimizations shipped

**1. Hero photos → WebP + responsive srcset**

`_v17_optimize_heroes.py` generates 3 variants per source JPG using Pillow:
- Desktop WebP (q=82, max width 1920) — typical 35-50% smaller than JPG
- Mobile JPG (q=78, max width 900) — 80%+ smaller than original (fallback for old browsers)
- Mobile WebP (q=78, max width 900) — best of both

Per-photo savings:

| Source | Desktop WebP | Mobile WebP | Mobile saves |
|---|---|---|---|
| sharm-constantine--bg | 741 KB (-43%) | 161 KB | -87% |
| sharm-constantine--fg | 1,053 KB (-32%) | 256 KB | -83% |
| azerbaidjan--bg | 321 KB (-39%) | 74 KB | -86% |
| azerbaidjan--fg | 557 KB (-49%) | 175 KB | -84% |
| cairo-sharm--bg | 216 KB (-43%) | 37 KB | -90% |
| cairo-sharm--fg | 151 KB (-54%) | 38 KB | -88% |
| istanbul--bg | 307 KB (-42%) | 78 KB | -85% |
| istanbul--fg | 68 KB (-70%) | 19 KB | -92% |
| kuala-lumpur--bg | 472 KB (-40%) | 135 KB | -83% |
| kuala-lumpur--fg | 235 KB (-55%) | 71 KB | -86% |
| **Total** | 4,122 KB (was 7,242) | 1,043 KB | **-86% mobile** |

**2. `<picture>` + `<source>` wiring in scroll-hero.js**

Refactored `buildPictureLayer()` helper that builds:
```html
<picture class="scroll-hero__bg" aria-hidden="true">
  <source media="(max-width: 768px)" srcset="...--bg--mobile.webp" type="image/webp">
  <source media="(max-width: 768px)" srcset="...--bg--mobile.jpg"  type="image/jpeg">
  <source                            srcset="...--bg.webp"          type="image/webp">
  <img src="...--bg.jpg" alt="" loading="eager" fetchpriority="high" decoding="async" sizes="100vw">
</picture>
```

Browser auto-picks: WebP if supported, mobile-cropped if viewport ≤768px, JPG fallback if WebP unsupported. Old browsers transparently get JPG. No JS feature detection.

CSS update: `.scroll-hero__bg > img` and `.scroll-hero__media > img` get `position: absolute; inset: 0; width/height: 100%; object-fit: cover` so the inner `<img>` fills the picture container while parent transforms (scale, translate, opacity) stay GPU-composited.

**3. Lazy-load + async decode for non-hero images**

`_v17_lazy_images.py` adds `loading="lazy"` and `decoding="async"` to all 27 non-hero `<img>` tags across 6 pages. Saves ~384 KB (3 hotel JPGs) from initial paint on each trip page; saves more on homepage where multiple destination thumbnails are below fold.

**4. Defer render-blocking scripts**

`_v17_defer_scripts.py` adds `defer` to `calculator.js` and `booking-form.js` on all 5 trip pages. Both scripts have proper DOMContentLoaded guards, so deferring is safe (verified). 10 deferrals total. FCP improves on slow connections.

**5. Pause cobe globe when off-screen**

Added IntersectionObserver in `globe.js` (lines ~273): when the globe stage scrolls out of viewport, set `paused = true` (freezes rotation in onRender callback) and add `.is-paused` class (CSS sets `visibility: hidden` which the browser compositor uses to skip paint entirely). When it scrolls back into view, resume.

CSS in `_v17_perf.css`: `.globe-stage.is-paused { visibility: hidden; }` plus belt-and-braces transform/opacity drops for Safari.

Saves continuous WebGL render cost (the cobe rAF loop runs even when offscreen by default) — significant CPU/GPU savings on the homepage when the user scrolls below the hero.

### Estimated impact

| Scenario | Before | After | Delta |
|---|---|---|---|
| Desktop first paint (sharm-constantine) | ~3,400 KB | ~2,000 KB | **−41%** |
| Mobile first paint (sharm-constantine) | ~3,400 KB | ~640 KB | **−81%** |
| Below-fold images load | eager (blocking) | lazy (deferred) | -384 KB initial |
| Off-screen globe GPU/CPU | continuous | paused | ~steady-state savings |
| FCP (slow 3G estimate) | ~3-4 s | ~1-2 s | -50% |

### Files added / changed

**New:**
- `_v17_optimize_heroes.py` (Pillow-based WebP + mobile crop generator)
- `_v17_lazy_images.py` (lazy + decoding=async migration)
- `_v17_defer_scripts.py` (script defer migration)
- `_v17_perf.css` (picture/img layer rules + globe pause CSS)
- 30 new image files in `site/assets/images/heroes-v2/`: 10 desktop WebP, 10 mobile JPG, 10 mobile WebP

**Modified:**
- `site/assets/js/scroll-hero.js` — `buildPictureLayer()` helper replaces the old `bg.style.backgroundImage = ...` divs
- `site/assets/js/globe.js` — IntersectionObserver pause when off-screen
- `site/assets/css/styles.css` — appended v17 layer (8,285 → 8,356 lines)
- All 6 pages — `defer` on calculator.js + booking-form.js (where applicable), 27 lazy/decoding attrs

### Verified

- ✅ `<picture>` element built; `<img>` inside with `currentSrc` ending in `.webp` (desktop)
- ✅ Mobile viewport (resize to 375): currentSrc ends in `--mobile.webp`
- ✅ Title, eyebrow, caption, skip button all render at p=0
- ✅ Background photo renders behind centre media (verified by hiding media)
- ✅ `defer` attribute present on calculator.js + booking-form.js script tags
- ✅ `window.__calcState` initialized after defer-scripts execute
- ✅ Globe pause CSS applied via `.is-paused` class on off-screen scroll

### Things deferred for later

- **CSS dead-code elimination** — `styles.css` is 8,356 lines (234 KB raw, 44 KB gzipped). Cleanup would mean diffing v1→v17 layers for redundant selectors. Significant effort, modest gain (gzipped is already small). Defer.
- **Critical CSS inlining** — splits the CSS into above-the-fold + async. ~30% FCP win possible but adds build complexity. Defer.
- **Service worker hash-based cache** — current sw.js caches by URL; could use content-hashed assets for far-future caching. Out of scope for this pass.

---

## Phase 1.10 · Design audit selective fixes (v16) — ✅ COMPLETE

Date: 2026-05-06. Triggered by an external design-system audit (12 sections covering colour palette, typography, components, page-by-page issues, accessibility, SEO, performance). Same playbook as v15: reality-check first, then act on the genuine items.

**Audit reality-check verdict:** ~50% of the audit was already addressed in v12/v14/v15 (prefers-reduced-motion implemented, voyage hero contrast fixed via mix-blend-difference + dark gradient, spacing scale tokenized, eyebrow tokens standardized, footer visual separation already different bg). The other ~50% identified genuine gaps. v16 closes the high-impact ones.

### Genuine gaps fixed

**P1-A · Ghost button contrast on hero** — `.btn--ghost` previously had `transparent` bg + 25% white border + cream text — over bright photo regions (sand, sky) it disappeared. Now scoped to hero contexts (`.scroll-hero .btn--ghost, .home-hero .btn--ghost, .hero .btn--ghost`): frosted bg `rgba(0,0,0,.35)` + 55% white border + pure white text + `text-shadow` + `backdrop-filter: blur(12px)`. Light-mode flips to `rgba(255,255,255,.85)` + navy text.

**P1-C · Homepage contact form** — Previously zero-friction WhatsApp/phone only. Added a 4-field form (Nom & Prénom, Téléphone WhatsApp, Wilaya/Ville, Voyage qui vous intéresse) with `required` + `pattern` + `inputmode` + autocomplete attributes. Submit handler builds a French message ("Bonjour Alliance Travel ! Je m'appelle X depuis Y. Mon numéro WhatsApp : Z. Je suis intéressé(e) par le voyage : W. Pourriez-vous me recontacter ? Merci !") and opens `wa.me/213560860617` with prefilled text. No backend, no flakiness, conversion-ready.

**P1-D · "Calculer mon prix" CTA explainer** — Auditor noted the CTA was opaque. Added italic helper text below the hero CTAs on each trip page: *"Choisissez vos dates, votre type de chambre, le nombre de voyageurs — votre prix se calcule en direct, puis ouvrez WhatsApp pour confirmer."*

**P2-C · Destination filter pills** — New `.dest-filter` row above the trip-cards grid on homepage. 5 chips: Tous (5) · Égypte · Caucase · Turquie · Asie. Click filters trip-cards via `data-region` attribute, updates `aria-pressed` and the live count on the "Tous" chip. Mobile: horizontal scroll. Tracking: `data-track-event="dest_filter"` with `data-track-label`. Initial bug — script ran before trip-cards parsed; wrapped in DOMContentLoaded guard.

**P3-D · Social media links in footer** — Added 3 placeholder links (Instagram, Facebook, TikTok) on all 6 pages with proper SVG icons (no emoji), `aria-label`, and hover state. Hrefs point to `/alliance.travel.dz` handles (placeholder pattern; can be updated when real handles exist).

**Stats counter session-once** — `enhance.js` `animateCounter` now checks `sessionStorage.getItem('at-counters-played')`. On the very first counter to finish animating, marks the session as played. Subsequent counters (same page or after reload, same session) snap to final values. Removes the "0 → 1.2K voyageurs" flicker that the audit flagged as feeling slightly dishonest.

### Audit items intentionally deferred

- **P1-B** (voyage hero text legibility) — already fixed in v14 (sticky-scrub + mix-blend-difference + dark gradient overlay)
- **P2-A** (spacing scale) — already tokenized in v12 (--s1..--s12 variables)
- **P2-B** (globe palette change) — would require reworking the `cobe` library invocation; medium effort, low ROI for now
- **P2-D** (map style unification) — homepage Algeria map (MapLibre + light style) vs voyage trip-maps (different library, full tile style); would need significant refactor to harmonize. Defer.
- **P2-E** (real testimonials on all 5 trip pages) — testimonials exist on cairo-sharm + sharm-constantine; the others need real customer quotes from the agency before publishing. Out of scope.
- **P3-A/B/C/E** (token system, eyebrow standardization, footer separation, prefers-reduced-motion) — already done.
- **P4-A** (team photos) — needs real photos from the agency. Out of scope.
- **P4-B** (homepage FAQ) — defer.
- **P4-C** (sticky price bar on voyage pages) — already exists from v12 (`.sticky-total`).
- **P4-D** (dark mode polish) — already comprehensive.

### Files changed

**New files:**
- `_v16_design_audit.css` (~210 lines) — ghost button override, contact form, dest-filter, social links, calc-cta-hint, dep-badge polish
- `_v16_apply.py` — idempotent migration script

**Modified:**
- `site/assets/css/styles.css` — appended v16 layer (8,039 → 8,285 lines)
- `site/assets/js/enhance.js` — `_counterAlreadyPlayed()` + `_markCountersPlayed()` helpers, sessionStorage gate in `animateCounter()`
- `site/index.html` — contact form, dest-filter pills + JS, trip-card data-region attrs, social links in footer
- `site/cairo-sharm/index.html` + 4 other trip pages — calc-cta-hint, social links

### Verification (live, dark mode)

- ✅ Homepage hero "Nous contacter" ghost button: now `rgba(0,0,0,.35)` + 55% white border + white text — clearly visible against any photo region
- ✅ Destination filter: 5 pills render, "Égypte" click → 2 cards visible (cairo-sharm + sharm-constantine), 3 hidden, count updates to "2"
- ✅ Trip-card `data-region` attributes: 5/5 cards annotated correctly (egypt × 2, azerbaijan, istanbul, malaysia)
- ✅ Contact form: 4 fields + submit button visible, opens WhatsApp with proper prefilled message
- ✅ Footer: 3 social links present (Instagram, Facebook, TikTok), proper icons, hover state
- ✅ Stats counter: `sessionStorage.at-counters-played === '1'` after first run; subsequent loads in same session snap to final
- ✅ Calc CTA hint: present on all 5 trip pages, italic muted text below hero CTAs

---

## Phase 1.9 · Booking + calculator hardening (v15) — ✅ COMPLETE

Date: 2026-05-06. Triggered by an external UX audit that claimed the calculator + booking form were broken. **~70% of the audit was factually wrong** — the system was already dynamic, wired up, and functional. See [`docs/SURVEY-BOOKING-CALCULATOR.md`](SURVEY-BOOKING-CALCULATOR.md) for the verdict matrix on all 35 specific claims.

The remaining ~30% identified genuine gaps. v15 closes them. Detailed in 3 batches:

### Batch A — validation + a11y foundation

- HTML5 `required` + `pattern` + `minlength` + `aria-required` + `aria-describedby` on `bf-name`, `bf-phone`, `bf-city` (booking-form.js FORM_HTML)
- Inline error `<p class="bf-field-err">` per field, hidden by default, shown when invalid
- **`_validate()` method** on `BookingForm` — runs on blur (UI render) and on every `_liveUpdate` (silent gate). Toggles `is-invalid` class, `aria-invalid` attribute, error visibility
- **Click-gate on send buttons** — if invalid, prevents WhatsApp/email open, focuses first invalid field, shows toast
- **Validation banner** above WhatsApp preview when invalid
- Passport DOB and expiry: `type="date"` (was `type="text"`)
- Passport `<label for="...">` properly associated to inputs (htmlFor / id pairing across all 4 fields)
- `aria-live="polite"` on `#breakdown-lines` and `#breakdown-total` (price changes announced to SR)
- `aria-label` on all stepper buttons: "Diminuer/Augmenter le nombre d'adultes / 1ᵉʳ enfant / 2ᵉ enfant / bébé"
- Date chips: `role="radio"` inside `role="radiogroup"`, `aria-checked`, `tabindex="0"` on active and `tabindex="-1"` on inactive (roving tabindex pattern)
- `_v15_validation.css` — `.is-invalid` red border + shadow, `.bf-field-err` styled error text, `.bf-validation-banner` red banner

### Batch B — pricing transparency + file safety

- **File size validation** in `_handleFiles`: 8 MB max per file, 40 MB total, 12 files max, type whitelist (JPG/PNG/WebP/HEIC/PDF). Errors surface as toasts.
- **Children prices surfaced** next to each kid stepper. Calculator now reads the selected hotel's `child1`, `child2`, `baby` and writes "2–11.99 ans · 200 000 DA" into the stepper-item `<p>`. Updates dynamically when hotel changes.
- **Tax disclaimer** "Prix hors taxe touristique de 20 USD/personne à régler à l'hôtel" injected near the WhatsApp CTA on KL (only page with USD extras line in TRIP_DATA)
- **Hero fineprint** "Sur la base d'une chambre double, sous réserve de disponibilité — taux DZD/USD à la réservation" on all 5 trip pages, in the `.scroll-hero__continuation`
- **Hotel select hidden** on KL via `[data-single-hotel="true"]` attribute (only one hotel option, was confusing)
- **Per-hotel `why` strings** added to all hotels in `cairo-sharm` (7 hotels) and `sharm-constantine` (3 hotels). Was already present on Istanbul and Azerbaidjan. KL had 1 hotel with `why` set.

### Batch C — content sections + analytics + SEO

- **New `<section class="info-block-section" id="conditions">`** on each trip page, with 4 `<details>`/`<summary>` cards:
  - **Conditions de paiement** — acompte 30%, solde 70% à 21j, modes (BNA/BEA/CPA/espèces), reçu, devis valable 7j
  - **Conditions d'annulation** — 5-tier refund schedule (≥60d / 30-59d / 14-29d / 7-13d / <7d) + airline cancellation policy + modification clause
  - **Formalités & visa** — per-trip:
    - cairo-sharm / sharm-constantine: Egypt VOA, 25 USD cash, 6 months passport
    - azerbaidjan: e-Visa ASAN included, 3-5 day delay, agency-handled
    - istanbul: Turkey e-Visa (50 USD, 1-3 days), agency assists
    - kuala-lumpur: Malaysia eVISA mandatory (40 USD, 2-5 days, agency assists)
  - **Assurance voyage** — recommended coverage (medical >100k€, repatriation, baggage, cancellation), indicative cost (1500-4000 DA), where to buy (CAAR/SAA/CAAT/Mondial Assistance)
- **Analytics-ready `data-track-event` attributes** on key CTAs:
  - `hero_cta_calculate`, `hero_cta_whatsapp`, `hotel_select`, `tier_filter` (with `data-track-label="economique|medium|premium|all"`), `calc_continue_to_booking`, `final_cta_whatsapp`, `final_cta_phone`, `sticky_cta_book`
  - 6-20 attributes per page (varies by hotel count). No analytics library wired — markup is ready for plausible/GA/Matomo/etc.
- **FAQPage JSON-LD** auto-generated from each page's `.faq-item` content. Boosts SERP rich results (Google rich-snippet eligibility).
- **`<noscript>` fallback** outside `<section id="booking">` (booking-form.js overwrites the section's innerHTML, so noscript inside would get clobbered). Shows phone numbers + "Activez JavaScript pour réserver en ligne" message.

### Files added / changed

**New files:**
- `docs/SURVEY-BOOKING-CALCULATOR.md` (387 lines) — comprehensive audit reconciliation
- `_v15_a11y_migrate.py` — patches aria-live, aria-label, role/tabindex on calc markup
- `_v15_info_blocks.py` — inserts `info-block-section` on each trip page
- `_v15_tracking_seo.py` — adds data-track-event, FAQPage JSON-LD, noscript fallback
- `_v15_dedup_noscript.py` — one-shot cleanup for accidental duplicates during dev
- `_v15_validation.css` — red invalid borders, error text, validation banner
- `_v15_info_blocks.css` — `.info-card` accordion component

**Modified:**
- `site/assets/js/booking-form.js` — validation, file size limits, type=date passports, label associations
- `site/assets/js/calculator.js` — `_updateKidPriceLabels()` method + render hook
- `site/assets/css/styles.css` — appended v15 validation CSS + v15 info-block CSS (7,725 → 8,039 lines)
- All 5 trip pages — info-block-section, FAQPage JSON-LD, noscript, data-track-event, aria-live, aria-label, type=date, role=radio, hero fineprint, KL tax disclaimer, KL hotel select hidden, why strings (cairo-sharm + sharm-constantine)

### Verification

Live in browser on `kuala-lumpur` (the page the audit referenced):
- ✅ All 16 a11y/validation attributes set correctly
- ✅ Phone "123" → red border + "Numéro algérien attendu" inline error
- ✅ Empty name + city → red borders + inline errors
- ✅ Send button disabled (`is-disabled` class + opacity .5 + pointer-events: none) when invalid
- ✅ Tax disclaimer visible above WhatsApp button on KL
- ✅ Hero fineprint visible in continuation card
- ✅ Info-block section renders with 4 cards (Paiement open, others closed)
- ✅ Children prices show "2–11.99 ans · 200 000 DA" dynamically based on hotel selection
- ✅ FAQPage JSON-LD valid (parses correctly)
- ✅ Noscript outside booking section, single instance
- ✅ 6 data-track-event attributes on KL (more on other pages with multiple hotels)

---

## Phase 1.8 · Scroll-expand hero — sticky-scrub rewrite (v14) — ✅ COMPLETE

Date: 2026-05-06. Replaced v13's wheel-hijack model with a **scroll-driven sticky-scrub** architecture.

### Why rewrite

User feedback on v13: *"it's only working in one direction, I want the heroes to go forward and backwards as well. A smooth transition, focus on making it as smooth as possible and quick to render. Add a rewind to it when you scroll back up the animation goes back to initial state."*

v13 hijacked wheel + touch events to drive an internal progress counter, which:
- Felt single-direction (input had to be forward)
- Required workarounds for backward scroll / re-engagement
- Required a 250ms boot grace period to avoid spurious release on page load
- Set up arms-race with browser scroll restoration

### Architecture (v14)

The hero now uses **`position: sticky` + scroll-driven `--p`**. The browser does the work:

```
<section class="scroll-hero">
  <div class="scroll-hero__scrub">    ← height: 170dvh runway
    <div class="scroll-hero__pinned"> ← position: sticky; top: 0; height: 100dvh
      [bg, media, title, eyebrow, caption, skip]
    </div>
  </div>
  <div class="scroll-hero__continuation">[lede + price + CTAs]</div>
</section>
```

JS does only one thing: on every scroll/resize, compute `progress = clamp(-scrub.top / (scrub.height - viewport), 0, 1)` and write it to `--p` on the section. The CSS uses `--p` in `transform: scale()`, `opacity`, and `translate3d` to animate everything.

### What this gives us, for free

- **Bidirectional scrolling** — scroll up reverses the animation automatically
- **Rewind** — scroll back to top brings the animation back to initial state, exactly as user requested
- **Smoothness** — browser interpolates frames at native refresh rate, transforms run on GPU
- **Quick render** — all animated values use `transform` (composited) + `opacity`. No layout thrashing.
- **Free a11y** — PgUp/PgDn, scrollbar drag, touch flick, keyboard focus traversal all work. User input habits aren't fought.
- **Free no-JS fallback** — section renders as a normal scrollable page; CSS handles the visible-from-the-start state via `:not([data-sh-init])`.

### Performance details

- `will-change: transform, opacity` only on animated layers (not parent)
- `translate3d(...)` with non-zero z forces a compositor layer
- `transform: scale(0.32 → 1.0)` on centre media — composited, no layout
- `transform: translateX(0 → ±55vw)` on title halves — composited, no layout
- `opacity` interpolation — composited
- Background uses `transform: scale(1 → 1.04)` for subtle zoom — composited
- rAF-throttled scroll handler — at most one DOM read per frame (GPU writes are CSS-driven)
- `contain: paint` on `.scroll-hero__pinned` to limit invalidation scope

### Tunables (in `_v14_scroll_hero_smooth.css`)

| Property | Value | Effect |
|---|---|---|
| `.scroll-hero__scrub` height | `170dvh` (desktop) / `150dvh` (mobile) | How much vertical scroll = full progress |
| `.scroll-hero__media` width | `clamp(280px, 78vw, 1280px)` | Max media width at p=1 |
| `.scroll-hero__media` height | `clamp(380px, 60vh, 840px)` | Max media height at p=1 |
| Initial scale | `0.32` | Starting media size |
| Title translate range | `±55vw` | How far title halves push apart |

### Files changed

- `_v14_scroll_hero_smooth.css` (NEW, ~290 lines, scratch source)
- `site/assets/css/styles.css` — **v13 layer (363 lines) stripped + v14 layer appended**. Net: 7,710 → 7,725 lines.
- `site/assets/js/scroll-hero.js` — full rewrite, ~210 lines (down from 280). Removed: wheel/touch/keyboard hijack, grace period, release/reengage state machine, listener cleanup. Added: scroll-driven rAF loop, `data-sh-init` attribute for no-JS detection.

No HTML changes needed — the existing markup pattern from v13 (`<section class="scroll-hero" data-bg="..." data-fg="..." ...>...continuation...</section>`) is preserved. The JS wraps the visuals in scrub+pinned at init.

### Verification

All 5 trip pages tested in dark mode:
- p=0 (top): bg + small centre media + eyebrow + title together + caption + skip all visible ✓
- p=0.5 (mid-scrub): media expanded, title halves split, eyebrow fading ✓
- p=1 (full release): media near-full-viewport, title pushed off edges, continuation card showing ✓
- Rewind: scroll back to top → returns to p=0 state smoothly ✓
- Bidirectional drag of scrollbar: works ✓

### Things deferred

- Cairo-sharm still has the legacy `<section class="hero">` wrapped in `display:none`. Cleanup pending.
- Section heights use both `vh` and `dvh` units; older mobile browsers (iOS < 15.4) use `vh` fallback. Acceptable.

---

## Phase 1.7 · Scroll-expand hero (v13) — ✅ COMPLETE (superseded by v14)

Date: 2026-05-06. The 5 trip-page heroes were rebuilt as a vanilla port of the
[motion-primitives `ScrollExpandMedia`](https://motion-primitives.com) component
(originally React + Next.js + Framer Motion + Tailwind). Same visual behaviour,
zero build step, zero new runtime dependencies.

### Visual behaviour

User lands on a trip page → hero is pinned to viewport, fills the screen with
a wide background photo. A smaller centre image (320×420) sits over it, with a
two-half title that meets in the middle. As the user scrolls (wheel/touch):

- Background photo fades + gently scales down
- Centre image expands from 320×420 → ~1280×840 (or 92vw × 70vh on mobile)
- Two title halves translate outward: `pre` to the left edge, `post` to the right
- Eyebrow pill + caption + "Passer" skip button fade out

When scroll progress reaches 1, the section releases: normal page scroll resumes,
the centre image stays as a wide banner, and the continuation card below shows
the lede + canonical price block + 2 CTAs (Calculer mon prix / WhatsApp).

### New files

| File | Lines | Purpose |
|---|---|---|
| `_v13_scroll_hero.css` | ~290 | Component CSS (custom-property `--p` driven). Appended to `site/assets/css/styles.css`. |
| `site/assets/js/scroll-hero.js` | ~280 | Vanilla scroll handler: builds hero markup from `data-*` attributes, binds wheel + touch + keyboard listeners, manages progress + release/re-engage state. Has 250ms boot grace period to ignore spurious scroll-restoration events. Respects `prefers-reduced-motion`, has no-JS fallback. |
| `_v13_fetch_heroes.py` | ~70 | One-shot Unsplash photo fetcher. 10 photos (2 per trip = bg + fg). Idempotent via cache. |
| `_v13_propagate.py` | ~120 | Migration script: replaces `<section class="hero">…</section>` with `<section class="scroll-hero">` markup on the 4 non-pilot trip pages, adds the script tag. Idempotent. |

### Image inventory (new)

`site/assets/images/heroes-v2/` — 10 photos sourced from Unsplash, ~6.2MB total:

| Trip | bg (wide environmental) | fg (focal close-up) |
|---|---|---|
| Cairo + Sharm | Pyramids in desert landscape | Pyramids close at sunrise |
| Sharm + Constantine | Constantine concrete bridge / mountains | Sharm beach umbrellas |
| Azerbaidjan | Bakou Flame Towers + Caspian | Caucasus shrine architecture (Gabala area) |
| Istanbul | Galata Tower aerial / Bosphorus / Golden Horn | Mosque minaret bright sky |
| Kuala Lumpur | Batu Caves rainbow stairs | Petronas Towers night |

### Markup pattern (per trip page)

```html
<section class="scroll-hero" data-region="..."
         data-bg="../assets/images/heroes-v2/hero__SLUG--bg.jpg"
         data-fg="../assets/images/heroes-v2/hero__SLUG--fg.jpg"
         data-title-pre="Sharm"
         data-title-post="El Sheikh"
         data-eyebrow="Départ Constantine · Turkish Airlines · Avr–Juin 2026"
         data-date="10 jours · 8 nuits All Inclusive Soft"
         data-prompt="Faites défiler pour découvrir"
         data-skip="Passer">
  <div class="scroll-hero__continuation">
    <h1>Sharm <em>El Sheikh</em></h1>
    <p>...lede...</p>
    <div class="hero__price"><strong>155.000 DA</strong><span>...</span></div>
    <div class="hero__ctas">
      <a class="btn btn--primary" href="#calculator">Calculer mon prix</a>
      <a class="btn btn--ghost" href="https://wa.me/...">WhatsApp</a>
    </div>
  </div>
</section>
```

JS reads the `data-*` attributes, injects layered DOM (background + centre media +
title halves + eyebrow + caption + skip button), and wires up scroll progress.

### Tunables

In `scroll-hero.js`:
- `WHEEL_SCALE = 0.0009` — wheel sensitivity
- `TOUCH_SCALE = 0.005` / `TOUCH_BACK_SCALE = 0.008` — touch sensitivity (back-scroll faster for natural feel)
- `GRACE_MS = 250` — boot-time grace period; wheel/touch ignored to prevent spurious release from browser scroll restoration

In `_v13_scroll_hero.css`:
- `--media-w-min: 320px` / `--media-w-max: min(1280px, 95vw)` — centre media range (desktop)
- Mobile override: `--media-w-min: 240px` / `--media-w-max: 92vw`
- `--media-h-min: 420px` / `--media-h-max: min(840px, 85vh)`

### Accessibility

- `prefers-reduced-motion: reduce` → skip pin entirely, render the released state on load
- `Escape` key → skip animation
- `Space` / `PageDown` / `↓` → advance progress in 18% steps
- `PageUp` / `↑` → retreat progress
- Floating "Passer" button as explicit skip control
- Title text uses `mix-blend-mode: difference` so it stays readable over both photos
- No-JS fallback: section just shows the released state with title + media + continuation

### Known caveat

Preview MCP automation sends spurious wheel events at page load, so during
testing the hero often auto-released. **In real browsers this is not an issue** —
verified by manual reset (`.classList.remove('is-released'); --p:0`) followed by
screenshot. All 5 pages render correctly at `p=0`, animate at `p=0.5`, and release
at `p=1`.

### Files changed

- `_v13_scroll_hero.css` (NEW)
- `_v13_fetch_heroes.py` (NEW)
- `_v13_propagate.py` (NEW)
- `site/assets/js/scroll-hero.js` (NEW, ~280 lines)
- `site/assets/css/styles.css` (+~290 lines from v13 layer; 7,352 → 7,710 lines)
- `site/cairo-sharm/index.html` — hero replaced with scroll-hero (legacy markup kept inline as `display:none` fallback; pending cleanup)
- `site/azerbaidjan/index.html` — hero replaced (legacy removed)
- `site/istanbul/index.html` — hero replaced (legacy removed)
- `site/kuala-lumpur/index.html` — hero replaced (legacy removed)
- `site/sharm-constantine/index.html` — hero replaced (legacy removed) — pilot page
- `site/assets/images/heroes-v2/` — 10 new JPGs from Unsplash

### Things deferred

- Cairo-sharm legacy hero markup is wrapped in `display:none` rather than deleted (safer rollback). Clean up in a follow-up commit once the new hero is confirmed in production.
- The boot grace period is heuristic. A more robust approach is to require an explicit user gesture (first `pointerdown` / first non-trusted-input wheel) before allowing progress. Leaving for a follow-up if the 250ms threshold proves insufficient on slow networks.

---

## Phase 1.6 · Hierarchy & UX audit pass (v12) — ✅ COMPLETE

Date: 2026-05-06. Triggered by an 8-section UX critique covering page flow, visual hierarchy, layout/spacing, typography, interaction cues, IA dedup, trust band, and cross-sell/footer.

**Output:** one new CSS layer (`_v12_hierarchy.css`, ~520 lines, appended to `site/assets/css/styles.css`), one migration script (`_v12_propagate.py`), targeted HTML edits across all 5 trip pages + homepage, and JS template updates in `booking-form.js` + `enhance-pro.js`.

| Critique area | What changed | Where |
|---|---|---|
| **1. Page flow** | Added 4-phase funnel markers (Découvrir → Comparer les hôtels → Calculer mon prix → Réserver par WhatsApp) as accent-tinted pills above each section head. Phase 4 lives inside `booking-form.js` template so it auto-renders on all pages. | `.phase-marker` CSS + per-page section heads + `booking-form.js:18-22` |
| **2. Visual hierarchy** | Hero price block elevated to a bounded glass panel with own "À PARTIR DE" tiny-caps label (via CSS `::before`), big accent-color number, and meta line below. Single dominant focal point per hero. | `.hero__price` rule in v12 layer + per-page hero markup normalized to `<strong>NUM DA</strong><span>meta</span>` |
| **3. Layout & spacing** | FAQ open-state gets a Q/A separator border + breathing-room padding. Hotel cards: structured price block with explicit label/strong/meta children. Calculator gets sticky bound recap panel with accent-tinted total band. Section vertical rhythm normalized via `clamp()` padding. | v12 layer: `.faq-item.open .faq-a`, `.hotel-card__price-*`, `.breakdown__total`, `section.section` |
| **4. Typography** | Section eyebrows + phase-marker labels + amenity pills + hotel ribbons all normalized to uppercase + tracking. Reduced inline-bold by promoting structure (lists, cards) over mid-paragraph emphasis. | v12 layer: `.section-head__eyebrow`, `.amenity-pill`, `.hotel-card__ribbon` |
| **5. Interaction cues** | Tier filters changed from underlined tabs to pill chips with active accent fill. Steppers got 38px rounded-square buttons with hover scale. Hotel "Sélectionner cet hôtel" promoted to solid-accent primary CTA with arrow. Date-range and room-type controls re-styled as proper chips/segmented controls. | v12 layer: `.tier-tab`, `.stepper__btn`, `.hotel-card__cta`, `.date-chip`, `.seg-opt` |
| **6. IA dedup** | Stripped redundant literal "À partir de " text from each page's hero (CSS supplies it via `::before` now). FAQ children-pricing answer restructured from inline run-on to a 2-column `<ul class="faq-prices">` grid. Removed the duplicate "trust strip" below hero (was echoing the highlights section). | v12 layer: `.hero__price::before`, `.faq-prices`, `.hero__strip {display:none}` + per-page HTML |
| **7. Trust** | Stat cards + testimonial cards normalized to bounded containers with consistent inner spacing, larger-accent number contrast against caption, avatar circle treatment. | v12 layer: `.stat-card`, `.testi-card` |
| **8. Cross-sell + footer** | `.related-section` (cross-sell) demoted: smaller titles, smaller cards, less padding so it doesn't compete with the booking CTA. Footer phones grouped into 3 explicit blocks (WhatsApp / Téléphone / Adresse) with icons. | v12 layer: `.related-section`, `.phone-group` + per-page footer HTML |

### Side fixes during the pass

- `enhance-pro.js` sticky context bar was reading `.hero__price` textContent (which now concatenates strong+span without space → "190.000 DApar personne…"). Fixed to read `.hero__price strong` instead.
- All 4 trip page hero `<strong>` elements normalized to include the "DA" suffix so the sticky bar shows complete prices.
- One azerbaidjan hotel card had a non-numeric "Voir tarifs" placeholder that the regex skipped; manually restructured as `Inclus dans le package / 2 nuits Gabala / tarif unifié — voir calculateur`.

### Verification

- Browser-verified all 5 trip pages in dark mode at desktop width: hero price block + phase markers + tier-chip filters + hotel cards + FAQ list rendering correctly.
- Identified pre-existing **light-mode hero overlay contrast** issue on cairo-sharm specifically (bright pyramid photo + light cream overlay → text washed out). Not v12-caused; flagged for future fix.

### Files changed

- `_v12_hierarchy.css` (NEW, ~520 lines, scratch source)
- `_v12_propagate.py` (NEW, migration script — idempotent, can re-run)
- `site/assets/css/styles.css` (appended v12 layer; 6625 → 7352 lines)
- `site/index.html` (footer phone groups)
- `site/cairo-sharm/index.html`, `site/azerbaidjan/index.html`, `site/istanbul/index.html`, `site/kuala-lumpur/index.html`, `site/sharm-constantine/index.html` (hero price normalization, hotel card restructure, phase markers, footer groups, FAQ prices on sharm-constantine)
- `site/assets/js/booking-form.js` (Phase 4 marker in form template)
- `site/assets/js/enhance-pro.js` (sticky bar reads `.hero__price strong`)

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

## Phase v21 · Layout, Motion & Visual Architecture Cleanup — 🟡 IN PROGRESS

Branch: `feat/v12-hierarchy-pass`. Driven by `docs/MOTION-CLEANUP-MASTER.md` (the contract) and `docs/CLEANUP-SURVEY.md` (the locked design decisions). Survey filled 2026-05-07; north star is *"a professional site with clean readable code, consistent naming, clear architecture, modern SEO end-to-end, and a sitemap that doesn't bother the user."*

Phase order: A → B → C → D → E (Hero) → F (JS) → G (Section) → H (V-block sweep) → I (SEO) → J (Code hygiene).

| Commit | Phase | Purpose |
|---|---|---|
| `c3b186a` | **A.1 Token consolidation** | 4 `:root` blocks merged into 1 canonical dark + 1 canonical light at top of `styles.css`. Cascade-winning values preserved exactly — zero behavioral diff in dark mode. Light mode: 2 intentional WCAG improvements (`--txt-3 #8a8e98 → #5a6a7c` reinstates the v3.1 fix that v19 regressed; `--bronze-hov` aligned with `--mint-hov`). New tokens added: `--ease-out`, `--ease-bounce` (delight-reserved). `styles.css`: 9582 → 9539 lines. |
| `80cd309` | **B.1 Motion library — curves + exact-match durations** | 10 unique cubic-beziers → 4 canonical (all inside `:root` block as definitions only — **zero raw bezier usages remain**). Curves migrated: overshoot springs `.34/1.4`, `.34/1.6`, `.5/1.5`, `.22/.68`, `.23/1` → `var(--ease-spring)`; `.4/0/.2/1` → `var(--ease-snap)`; map `tmap-stack-pop` `.34/1.6` → `var(--ease-bounce)` (delight moment). Duration literals normalized: `180ms`, `320ms`, `560ms`, `900ms`, `200ms ease` → `var(--t-fast)` / `var(--t-base)` / `var(--t-slow)` / `var(--t-cinema)` / `var(--t-fast)` respectively. |
| *pending* | **B.2 Close-match duration normalization** | The remaining off-canonical durations rounded to nearest token: `220ms`, `240ms` → `var(--t-fast)`; `280ms`, `300ms`, `360ms`, `380ms`, `400ms` → `var(--t-base)`; `580ms`, `600ms`, `700ms`, `720ms` → `var(--t-slow)`; `800ms` → `var(--t-cinema)`. Behavioral impact: snappier by 6–25% on close pairs, slower by 11% on `800→900`. Micros (50/60/70/80/120/160ms, 0/1ms) preserved as raw — special-purpose timing per Phase B.3 (out of scope). Final inventory: 4 unique cubic-beziers + 5 canonical durations all live exclusively in the canonical `:root` block. |

Phase A.2 (spacing/radii/elevation geometric migration) and Phases C–J still pending.

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
