# Responsive Layout Audit — Alliance Travel

Pre-delivery production audit. Dimension: **Responsive layout** (breakpoints 320 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920).
Read-only inspection. Every finding cites real `file:line` locations.

Scope: `site/**/*.html`, `site/assets/css/styles.css` (~9,556 lines), `site/assets/js/*.js`.

---

## Executive summary

The layout system is fundamentally sound: fluid `clamp()` type, `overflow-x: clip` guards on `html`/`body`, `min-width: 0` shrink-guards on the calculator grid, ellipsis truncation on the sticky bar, and a dedicated v27 "responsive polish" block (styles.css L9541–9555) that already fixed several 320–380px issues. The calculator, footer grid, testimonials scroller and destination filter all reflow correctly.

The serious problems are concentrated in the **JS-injected mobile nav drawer** (KNOWN ISSUE #2). Three defects there explain "the mobile version breaks when I resize":

1. The drawer is appended **inside** `.site-nav` and positioned `fixed`; when a trip page scrolls, `.site-nav` receives a `transform` (`body.has-sticky-bar`), which creates a containing block that **traps the fixed drawer** inside the ~56–72px nav box instead of covering the viewport.
2. The drawer's injected **close (X) button has zero CSS**. Because `.nav-drawer { display: contents }` at ≥901px, the X becomes a visible stray element in the desktop nav bar after the drawer is built (it is built on every load, all widths).
3. Overlapping/conflicting `.site-nav` breakpoints (900px drawer system vs 768px floating-pill system) plus descendant selectors that still match controls **after** they are moved into the drawer.

KNOWN ISSUE #1 (dead nav controls) is confirmed: the drawer now ships **two** close affordances (the hamburger's own toggling X + a separate injected `.nav-drawer__close`). KNOWN ISSUE #3 (theme-invisible text) yielded only low-severity dead/hardcoded accent colors on trip/related cards; no dark-on-dark blackout was found in the shared CSS.

---

## Findings

### RESP-01 — Fixed nav drawer trapped by `.site-nav` transform on scrolled trip pages (KNOWN ISSUE #2 root cause) — CRITICAL
- **Where:** `site/assets/js/enhance.js:450` (`nav.appendChild(drawer)`); `site/assets/css/styles.css:638-657` (`.nav-drawer { position: fixed }`), `:5787-5790` (`body.has-sticky-bar .site-nav { transform: translateY(48px) }`).
- The drawer is `position: fixed` but lives **inside** `.site-nav`. The CSS comment at `styles.css:665-668` claims "Drawer lives on `<body>`" — but the JS actually appends it to the nav. A `transform` on `.site-nav` makes it the containing block for the fixed drawer.
- Repro: open any trip page (egypte/istanbul/…), scroll down until the top `.trip-sticky-bar` appears → `body.has-sticky-bar` → `.site-nav` gets `transform: translateY(48px)`. Now tap the hamburger: the drawer's `top:0; bottom:0` resolve against the ~56px nav box, so it renders clipped / mispositioned rather than full-height. Scrolling back to top (transform removed) "fixes" it — matching the intermittent "breaks when I move around" report.
- The `backdrop-filter` was already stripped on mobile (styles.css:605-611) precisely to avoid this containing-block trap, but the `has-sticky-bar` transform re-introduces it.
- **Fix:** move the drawer to `document.body` (append drawer + close btn to `body`, not `nav`), matching the existing comment's intent and the `.nav-backdrop` which is already on body. Alternatively, gate the transform: `body.has-sticky-bar:not(.nav-open) .site-nav`. The body-relocation is the correct, comment-aligned fix.
- **Regression risk:** medium — the moved controls carry live listeners; relocating the drawer node keeps them (move is by reference). Verify RTL `border-inline` + box-shadow still render and that `:scope > .nav-links` hide rule (styles.css:728-731) still applies to the now-empty nav.

### RESP-02 — Injected drawer close button has no CSS → stray "X" in desktop nav (KNOWN ISSUE #1 + #2) — HIGH
- **Where:** `site/assets/js/enhance.js:458-476` injects `.nav-drawer__close`; **no `.nav-drawer__close` rule exists anywhere in** `styles.css` (grep: 0 matches). `.nav-drawer { display: contents }` at `styles.css:599`.
- `initNavDrawer()` runs unconditionally on every load at every width (`enhance.js:1065`, called from `boot()`), so the drawer + close button are built even at 1440/1920px. At ≥901px `.nav-drawer` is `display: contents`, so its first child — the injected X (`drawer.insertBefore(closeBtn, drawer.firstChild)`, enhance.js:475) — participates directly in the desktop `.site-nav` flex row as a stray unstyled button.
- This is also the "close icon serving no purpose" the client flagged: the drawer has **two** close affordances — the hamburger toggles to an X (styles.css:634-636) AND this separate `.nav-drawer__close`.
- **Fix:** add `.nav-drawer__close { display: none }` at base and `display: grid` only inside `@media (max-width: 900px)`, mirroring `.nav-hamburger` (styles.css:598/615). Also position it top-inline-end and size to `--touch-min`. If the client wants the redundant control removed entirely, drop the injected `.nav-drawer__close` and keep the hamburger-as-X.
- **Regression risk:** low — purely additive display gating.

### RESP-03 — Conflicting `.site-nav` breakpoints (900 drawer vs 768 floating-pill) + descendant selectors bleed into drawer — HIGH
- **Where:** `styles.css:602` `@media (max-width:900px)` (drawer/hamburger, solid bg, `padding:12px 16px`) vs `styles.css:4081-4099` `@media (max-width:768px)` (`.site-nav { height:56px; top:10px; left:10px; right:10px }` floating pill, `.site-nav .theme-toggle { width:32px }`, `.site-nav .nav-cta { height:36px }`).
- Because the drawer is inside `.site-nav`, the **descendant** selectors `.site-nav .theme-toggle` / `.site-nav .nav-cta` / `.site-nav .nav-links` (L4090/4092/4097) keep matching those controls **after** they are moved into `.nav-drawer`. Result at ≤768px: the drawer's theme toggle shrinks to 32px (below the 44px `--touch-min` the drawer intends via styles.css:711), and `.nav-drawer .nav-cta`'s full-width pill fights the 36px inline-nav sizing (drawer wins only where it has `!important`).
- The drawer's `padding-top: calc(var(--nav-h) + 16px)` (styles.css:649) assumes `--nav-h:72px`, but the actual nav is 56px at ≤768px → 16px of dead space at the drawer top.
- **Fix:** scope the ≤768px control shrink rules to inline nav only, e.g. `.site-nav > .theme-toggle` / `.site-nav > .nav-cta` (direct-child), so they stop matching the moved-in drawer copies. Set the drawer `padding-top` from a nav-height token that tracks the 56px mobile nav.
- **Regression risk:** medium — touching heavily-overridden nav selectors; test FR/EN/AR at 768/640/375.

### RESP-04 — Resize-only handlers evaluated once at load, never re-run (load↔resize desync) — MEDIUM
- **Where:** `enhance.js:47-48` (`reduced`, `isCoarse` captured once at IIFE start), `:362` (`initHeroMouseParallax` returns early if `innerWidth < 1024`, checked only at boot).
- Loading at ≤1023px then resizing/rotating to ≥1024px never attaches the hero parallax; loading wide then narrowing leaves listeners attached (harmless but wasteful). The drawer resize handler (enhance.js:529-536) only *closes* on widen; it never rebuilds state, so a page loaded at desktop already has the drawer built (see RESP-02).
- **Fix:** re-query `innerWidth` inside the mouse handlers (cheap) rather than gating attachment; or debounce a single `resize` that re-evaluates the coarse/width branches. Low urgency vs RESP-01/02.
- **Regression risk:** low.

### RESP-05 — Two hero CTA buttons forced `flex-wrap:nowrap` between 381–768px can cram/clip long FR/AR labels — MEDIUM
- **Where:** `styles.css:9437-9438` (`.aurora-hero__actions { flex-wrap:nowrap }`, `.btn { flex:1 1 0; min-width:0; padding-inline:var(--space-3) }`); wrap only re-enabled at ≤380px (`styles.css:9552-9554`).
- On trip heroes the two buttons are "Calculer mon prix" + a WhatsApp button (egypte/index.html:203-204). Between ~400–520px, `nowrap` + `flex:1 1 0` + `min-width:0` squeezes both; the longer AR/EN equivalents ("Chat on WhatsApp", Arabic strings) risk internal wrapping or ellipsis-less clipping since `.btn` has no `overflow-wrap`/`hyphens`.
- **Fix:** allow `flex-wrap:wrap` from a higher breakpoint (e.g. ≤440px), or add `white-space:nowrap; text-overflow:ellipsis` isn't ideal for CTAs — better to wrap. Verify each locale's label at 390/414.
- **Regression risk:** low.

### RESP-06 — `:has()`-only bottom-padding & FAB lift for `.sticky-total` have no JS fallback (older Safari/FF) — MEDIUM
- **Where:** `styles.css:2287-2299` (`body:has(.sticky-total) { padding-bottom … }`, `body:has(.sticky-total) .fab-whatsapp { bottom … }`).
- The codebase elsewhere (styles.css:5785) explicitly notes `:has()` is unsupported in Firefox <121 / older Safari and uses a JS body-class fallback for the nav push — but the `.sticky-total` bottom padding and FAB lift rely on bare `:has()` with **no** fallback. On those browsers at ≤1024px: page content sits behind the fixed bottom "Total estimé" bar, and the WhatsApp FAB overlaps it.
- **Fix:** mirror the existing pattern — add a JS-set `body.has-sticky-total` class (trip pages already know they have the bar) and duplicate the two rules against it.
- **Regression risk:** low.

### RESP-07 — Dead / theme-defeating hardcoded accent colors on trip & related cards (KNOWN ISSUE #3, low form) — LOW
- **Where:** inline `style="color:#C9872E|#3AAFAF|#19B5B0|…"` on `.trip-card__cta` (index.html:470,522,575,627,679,731,783) and `.related-card__cta` / `.related-card__flag` (egypte/index.html:1505,1508,1526,1529).
- On `.trip-card__cta` these inline colors are **dead** — overridden by `color: var(--tc-fg) !important` (styles.css:8692). On `.related-card__cta` the inline teal **wins** over `color: var(--accent)` (styles.css:3246), so the CTA ignores the theme's accent token in both light and dark (still legible mid-tone teal, so no blackout — hence low, not a true ISSUE #3 invisibility).
- No genuine dark-on-dark / light-on-light blackout was found in shared CSS: hardcoded `#fff` instances (styles.css:580,1605,2748,…,9530) all sit on self-colored dark chips/badges/CTAs or over hero imagery, valid in both themes.
- **Fix:** delete the dead inline colors on `.trip-card__cta`; replace `.related-card__cta`/`__flag` inline hex with the per-region accent token so it flips with theme.
- **Regression risk:** none (dead code) / low (related cards).

### RESP-08 — `.grid-cards` auto-fit floor (280–360px) can nudge overflow at 320px in gutters — LOW
- **Where:** `styles.css:216-219` (`.grid-cards minmax(280px,1fr)`, `--lg minmax(320px,1fr)`, `--xl minmax(360px,1fr)`).
- At a 320px viewport with the `--container-x` gutter (clamp min 16px each side → ~288px content), a `minmax(320px…)`/`minmax(360px…)` track's floor exceeds the available inline space. Grid handles this by overflowing the track to content width; combined with card padding it can produce a hairline horizontal scroll were it not for the global `overflow-x: clip` (styles.css:22,32) — so it's visually contained but cards can still feel edge-tight. `--sm`/base (220/280) are safe.
- **Fix:** lower `--lg`/`--xl` floors to `min(320px, 100%)` / `min(360px, 100%)` so the single-column case can shrink below the floor at 320px.
- **Regression risk:** low.

---

## Verified-good (no action)

- Global `overflow-x: clip` on html/body (styles.css:22,32) — horizontal-scroll safety net.
- `.calc-grid` collapses `1fr 1fr` → `1fr` at ≤1024px (styles.css:2272-2274) with `min-width:0` shrink guards (styles.css:1181-1184) fixing the `<select>` intrinsic-width clip.
- `.trip-sticky-bar` hides price/meta and truncates name with ellipsis at ≤640px (styles.css:5319-5325).
- Testimonials → horizontal scroll-snap at ≤768px (styles.css:5508-5527); destination filter horizontal scroll at ≤640px (styles.css:7941-7952).
- Touch targets: `--touch-min:44px` applied to hamburger, stepper (pointer:coarse), footer CTA (styles.css:618,9547,9491).
- iOS focus-zoom guard `font-size:max(16px,1rem)` on form controls (styles.css:9544-9545).
- Aurora hero title `overflow-wrap:break-word; hyphens:auto` + inner gutter (styles.css:9549-9550).

---

## Priority order for delivery
1. **RESP-01** (drawer trapped by transform) — CRITICAL, the reported bug.
2. **RESP-02** (stray desktop X / dead close control) — HIGH, visible on every desktop load.
3. **RESP-03** (breakpoint/selector conflicts) — HIGH.
4. RESP-04, RESP-05, RESP-06 — MEDIUM.
5. RESP-07, RESP-08 — LOW.
