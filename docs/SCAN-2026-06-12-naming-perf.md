# Scan — Naming Conventions & Rendering Performance

**Date:** 2026-06-12
**Scope:** `site/` (HTML/CSS/JS, no build step). `styles.css` = 9,977 lines.
**Method:** static read + grep. No code changed — report only.

Overall the codebase is in good shape: it has clearly been through several perf
passes (mobile `will-change` gates, `backdrop-filter: none` on phones, single rAF
scroll coordinator, IntersectionObserver pause-off-screen, DPR cap on the globe,
lazy hero injection). Most findings below are polish or dead-selector bugs rather
than systemic problems. Two naming mismatches actually break behavior silently.

---

## LANE 1 — Naming-convention problems

Convention baseline: kebab-case + occasional BEM (`.hl-card__title`,
`.scroll-hero__bg`) for CSS; camelCase JS; kebab-case `data-*`.

| # | Sev | File:line | Current | Suggested | Why |
|---|-----|-----------|---------|-----------|-----|
| N1 | **High** | `assets/js/enhance.js:505` | `.hotels-grid` | `.hotel-grid` | The real class everywhere (CSS `styles.css:1038`, all trip HTML, `calculator.js:383`) is **singular** `.hotel-grid`. The plural selector in `autoMarkReveals()` matches **nothing**, so hotel grids never get the `data-fx-stagger` reveal. Silent dead selector caused purely by a naming slip. |
| N2 | **High** | `assets/js/enhance.js:510` | `.faq__list` | `.faq-list` | Real class is kebab `.faq-list` (6 HTML files). BEM `__` variant matches nothing → FAQ lists skip the stagger reveal. Mixing `__` and `-` for the same node. |
| N3 | **Med** | `assets/js/enhance.js:507,509` | `.branches-grid`, `.programme-list` | remove or rename to real classes | Neither selector exists in any HTML. Dead entries in the `autoMarkReveals` card-group list — misleading, implies markup that was renamed/removed. |
| N4 | **Med** | `assets/js/booking-form.js` (throughout) | two prefixes: `bform-*` (9 classes) **and** `bf-*` (24 classes/ids) for the **same** component | pick one prefix (e.g. `bf-` for everything, or `bform-` for everything) | `bform-grid/-left/-block/-field/-row-2` coexist with `bf-name/-phone/-trip-summary/-upload-zone/...`. Two abbreviations for one feature is the single biggest readability cost in the JS. New contributors can't guess which prefix a class uses. |
| N5 | **Med** | `assets/js/calculator.js:285-288` | `child_a → priceKey:'child2'`, `child_b → priceKey:'child1'` | align the letter/number ordering (e.g. `child_a→child1`, `child_b→child2`) or rename to age-based keys | The `_a`/`_b` suffixes are **crossed** against the `child1`/`child2` price keys (a maps to 2, b maps to 1). Both carry the same age range `2–11.99 ans`, so nothing visually breaks, but it is a latent foot-gun: any future edit that assumes `a→1` will mis-price a child tier. |
| N6 | **Low** | `assets/js/calculator.js:77,82,286-288`; HTML `data-kid-type="child_a\|child_b\|baby"` | `child_a` / `child_b` (snake_case values) | `child-a` / `child-b` (kebab) | Every other `data-*` value in the codebase is kebab or a plain token. These three are the only **snake_case** attribute values, inconsistent with the house style. |
| N7 | **Low** | globals across modules | `AT_showToast` (enhance), `AllianceScrollHero` (scroll-hero), `alSetLang`/`alGetLang`/`alTranslations` (i18n), `MapBase` (map-base), `__calcState` (calculator), `TRIP_DATA`/`TRIP_MAP_DATA` (page data) | settle on one window-namespace convention | Six different prefix styles (`AT_`, `Alliance`, `al`, bare PascalCase, `__`, `SCREAMING`) for the project's own globals. Not a bug, but confusing when grepping for the public surface. |
| N8 | **Low** | `data-from` vs `data-price-from` | two `*from*` attrs with different meaning | document or disambiguate (`data-route-from` vs `data-price-from`) | `data-from` (map route origin) and `data-price-from` (sticky-bar price) read similarly; easy to confuse when scanning HTML. |
| N9 | **Low** | `assets/css/styles.css` BEM mix | `.bform-row-2`, `.value-props-3` carry numeric suffixes; siblings use modifiers like `--prev/--next` | `.bform-row--2col`, `.value-props--3` | Numeric suffix vs `--modifier` is applied inconsistently for variant counts. |

**Notes / non-findings:** `data-i18n*` family is fully consistent (`data-i18n`, `-html`,
`-title`, `-aria-label`, etc., all read via matching `dataset.i18nHtml` keys). No
camelCase CSS classes found in HTML. `scroll-hero__*`, `trip-card__*`, `lightbox__*`,
`bform-block__*` BEM blocks are internally consistent.

---

## LANE 2 — Rendering / bloat / framerate

| # | Impact | File:line | Problem | Fix |
|---|--------|-----------|---------|-----|
| P1 | **High** | `assets/css/styles.css:4801-4810` (`@keyframes ken-burns`) | Animates **`background-size` + `background-position`** on `[data-region] .hero` (full-viewport) on an **infinite 26s loop**, pinned with `will-change: background-size, background-position`. Both are paint-triggering (not composited) — the whole hero repaints continuously, even when idle. `will-change` on a non-composited prop keeps a layer warm for nothing. This runs on every trip page. | Switch to a child `::before`/img layer animated with `transform: scale()` + a tiny `translate` (composited), and set `will-change: transform`. Same Ken-Burns look, zero per-frame repaint. |
| P2 | **High** | `assets/js/enhance.js:357-375` (`initHeroMouseParallax`) | `mousemove` handler with **no rAF throttle** does a layout read (`getBoundingClientRect`) **and** a `querySelector('.hero__visual-art > svg')` **and** a style write on every pointer move → forced synchronous layout + repeated DOM query in the hottest event on desktop. | Cache the `art` node once outside the handler; coalesce into the existing rAF scroll coordinator (or a dedicated `requestAnimationFrame` guard); store the rect on `mouseenter`, not per-move. |
| P3 | **Med** | `assets/js/enhance.js:587-617` (`initMagneticButtons`) | Each `.btn--primary/.btn--ghost/.nav-cta/.calc-cta` gets its own `mousemove` listener that calls `getBoundingClientRect()` every move (layout read) and writes 4 CSS vars. Multiple magnetic buttons can be hovered in sequence; no rAF. | Read rect on `mouseenter` only; write vars inside a single rAF; the values are transforms so writes are cheap — it's the per-move `getBoundingClientRect` that thrashes. |
| P4 | **Med** | `assets/css/styles.css:3855-3857` | Fixed site-nav uses `backdrop-filter: blur(24px) saturate(180%)` — the heaviest blur in the file, on a **permanently on-screen, full-width** bar that overlaps all scrolling content → GPU re-blurs the backdrop every scroll frame. (Mitigated on phones by the `blur→none` gate at `:626`, so this is desktop/tablet only.) | Drop to `blur(12-16px)` and remove `saturate()` (saturate roughly doubles the blur cost), or composite-isolate the nav. 16px reads nearly identically. |
| P5 | **Med** | `assets/css/styles.css:5930` | `.globe-polaroid { will-change: opacity, transform, filter, left, top }` lists **`left, top, filter`** that the v26 `globe.js` (`:193-209`) **no longer animates** (it pins `left:0/top:0` and drives a single `transform`). Over-broad `will-change` forces extra compositor layers / memory for props that never change, on up to 5 polaroids. | Reduce to `will-change: transform, opacity`. The `transition: opacity, filter` at `:5928` can stay. |
| P6 | **Low-Med** | `assets/css/styles.css:7732,7745` | `.scroll-hero__media` animates `border-radius: calc(20px - var(--p)*8px)` per scroll frame with `will-change: border-radius`. Border-radius changes trigger **paint** (not pure composite), so this single element repaints every frame during the hero scrub. | Either drop the radius animation (keep a fixed radius) or accept it — single element, so impact is bounded. Remove `border-radius` from `will-change` regardless (paint props don't benefit). |
| P7 | **Low** | `assets/css/styles.css` — 13× `transition: all` (`:1246,1352,2499,3139,3250,7028,7097,7136,7323,7355,8408,8514,9010`) | `transition: all` animates **every** changed property on hover, including any layout props that change in the `:hover` rule, and forces the engine to watch all of them. Bloat + accidental reflow risk. | Enumerate the props actually animated (almost always `transform, box-shadow, border-color, background`). |
| P8 | **Low** | `assets/js/map-base.js:95-107` (`attachDashAnimation`) | "Ants-marching" route dash uses `setInterval(…, 70ms)` calling `map.setPaintProperty('line-dasharray', …)` — a `setInterval` animation loop (not rAF) that forces a MapLibre repaint ~14×/s the whole time the map is visible. | Gate is decent (skips on reduced-motion; map is lazy-booted). If FPS matters on low-end, drive it from rAF with an elapsed-time check, or stop the interval when the map scrolls out of view. |
| P9 | **Low** | `assets/js/map-base.js:159-166` | `checkVisible` `scroll` listener (does `getBoundingClientRect`) is added but **never removed** after `safeBoot()` — `booted` short-circuits the body, so it's a no-op-but-still-attached passive listener. Tiny leak. | `removeEventListener` inside `safeBoot`, or use `{ once: false }` + detach. |

**Strengths confirmed (no action):**
- `scroll-hero.js` — rAF-throttled scroll/resize, writes one CSS var, quantized to skip
  redundant writes. CSS drives the animation via `transform: scale()` + `opacity`
  (composited). Textbook.
- `globe.js` — DPR capped at 2, mapSamples reduced, per-frame polaroid math skipped when
  paused/reduced-motion, single `translate3d` transform (no left/top thrash), IO pause
  off-screen, deferred to `load`+`requestIdleCallback`, desktop-only gate.
- `enhance.js` — single shared rAF scroll coordinator (`onScrollY`) feeds parallax,
  progress bar, FAB, sticky bar — exactly the right pattern. `initPauseOffScreen` freezes
  ambient keyframes off-screen.
- `hero-collage-lazy.js` — defers tiles 2–5 past LCP via `requestIdleCallback`.
- One shared `styles.css` (cached once, not duplicated per page); inline `<style>` blocks
  are small critical-CSS only (≤126 lines on index, ≤7 elsewhere) — **not** duplicated heavy CSS.
- Map keyframes (`amap-pulse`, `tmap-pulse`) use `transform: scale()` + `opacity`, not
  box-shadow. `background-attachment: fixed` is **not** used anywhere.

---

### Severity recap
- **Naming:** 9 findings — 2 High (silent dead selectors), 3 Med, 4 Low.
- **Performance:** 9 findings — 2 High, 3 Med, 1 Low-Med, 3 Low.
