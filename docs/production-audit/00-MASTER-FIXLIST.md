# MASTER FIX-LIST — Alliance Travel (Pre-Delivery Production)

Synthesized from 7 verified audit dimensions (dead-code, responsive, a11y-contrast, visual-consistency, performance, production-config, bug-interactions). All source findings were adversarially checked; refuted ones excluded. This document DEDUPES cross-dimension overlaps, GROUPS by concern, and gives a single-writer-safe execution plan.

- **Total unique items:** 44 (after deduping 12 cross-dimension overlaps down from 56 raw findings)
- **Constraints:** vanilla static multi-page, NO build step, trilingual (FR live DOM / EN / AR-RTL), Vercel deploy (`outputDirectory=site`), light/dark via `data-theme`.
- **Golden rule for the theme fixes:** default `:root` IS the DARK theme; `:root[data-theme="light"]` is the override. Verify both.

---

## LEGEND

- **SAFE-AUTO** = low-risk, mechanical, deterministic; can be applied without a visual judgment call.
- **NEEDS-REVIEW** = requires a human visual/UX/security decision, or touches deploy behavior, or changes rendered appearance.
- **Sev:** critical / high / medium / low. **RR:** regression risk.

---

## DEDUPE MAP (overlaps collapsed into one item)

| Master ID | Absorbs source findings | Reason |
|---|---|---|
| K1-NAV-CLOSE | nav-dead-close-01, resp-02, a11y-contrast-03, a11y-nav-04 | Same injected unstyled `.nav-drawer__close` X leaking to desktop |
| K1-WA-DUP | nav-visa-wa-dup-02, a11y-nav-03 | Same duplicate WhatsApp CTA (visa `.btn--wa` + always-injected FAB) |
| K2-DRAWER-TRAP | resp-01-drawer-trapped-by-transform | Root cause of "mobile breaks on resize" |
| K2-BREAKPOINTS | resp-03, nav-breakpoint-mismatch-05, a11y-nav-05 | 768 vs 900 nav breakpoint split + off-by-one auto-close |
| K2-RESIZE-ONCE | resp-04 | Load-only gating never re-runs on resize |
| K3-NAVCTA | a11y-contrast-01, theme-contrast-01 | Identical `.nav-cta` white-on-mint dark-mode invisibility |
| K3-HEROPRICE | theme-hero-price-invisible-03 | `.aurora-hero__amount` #fff on light cream glass |
| K3-RELATED | a11y-contrast-02, resp-07, theme-contrast-02, inline-cta-color-12 | Same inline-hex related/trip-card CTA colors |
| E-RIBBON | a11y-dead-01, dup-ribbon-03 | Same duplicate `.hotel-card__ribbon` block |
| H-HEADERS | perf-01, prod-config-01 | Same missing vercel.json headers array |
| H-CACHE | perf-01(cache), prod-config-07 | Same Cache-Control tiers absent on Vercel |
| G-FG-IMAGES | dead-code-03, perf-02 | Same 36–42 orphaned `--fg` hero images |

---

# (A) KNOWN-ISSUE ROOT CAUSES

These three are the client-reported symptoms. Fix these first.

## Known Issue #1 — NAV CLEANUP (dead/duplicate nav controls)

### K1-NAV-CLOSE — Injected `.nav-drawer__close` X has zero CSS, leaks as a stray X into the desktop nav on every page
- **Sev:** critical · **RR:** low · **NEEDS-REVIEW** (deletes a control; confirm hamburger-X is the single close affordance)
- **Files:** `site/assets/js/enhance.js:458-476`, `:508`, `:1065`; `site/assets/css/styles.css:599`, `:634-636`
- **Fix:** Delete the `.nav-drawer__close` creation block (`enhance.js:458-476`) and its click listener (`:508`). The hamburger-turns-X (`styles.css:634-636` + icon injected at `enhance.js:423-427`), backdrop-click (`:507`) and Escape (`:510-513`) already close the drawer. Root cause: at `>900px` `.nav-drawer{display:contents}` (`styles.css:599`) dissolves the drawer box so its unstyled first child renders inline in the desktop `.site-nav`; grep confirms `.nav-drawer__close` has NO CSS rule anywhere. This removes the client-flagged "close button + close icon that serve no purpose" AND the two-X redundancy in the open mobile drawer.

### K1-WA-DUP — Visa nav uses `.btn--wa` (not `.nav-cta`) so a duplicate WhatsApp button stays visible on mobile; FAB always injects
- **Sev:** high · **RR:** low · **NEEDS-REVIEW** (consolidation is a UX call)
- **Files:** `site/rendez-vous-visa/index.html:180`; `site/assets/js/enhance.js:445`, `:701-737` (guard at `:702`); `site/assets/css/styles.css:728-731`; `site/egypte/index.html:1547`
- **Fix:** (a) Change the visa nav CTA class at `rendez-vous-visa/index.html:180` from `btn btn--primary btn--wa` to `nav-cta` (keep href/SVG/label) so it matches `.site-nav > .nav-cta{display:none}` (`styles.css:731`) and gets moved into the drawer by `initNavDrawer` (`enhance.js:445`). (b) Gate `initWhatsAppFAB()` so it does not inject when a static on-page `.btn--wa` already exists — its dedup at `enhance.js:702` only checks for an existing `.fab-whatsapp`, never for a static `btn--wa`. Consolidate to one primary in-page WA CTA + the FAB.

## Known Issue #2 — MOBILE BREAKS ON RESIZE (responsive/nav-drawer regression)

### K2-DRAWER-TRAP — Fixed nav drawer trapped inside transformed `.site-nav` on scrolled trip pages (PRIMARY ROOT CAUSE)
- **Sev:** critical · **RR:** medium · **NEEDS-REVIEW** (containing-block fix; test scroll+resize on all trip pages, both themes)
- **Files:** `site/assets/js/enhance.js:450` (`nav.appendChild(drawer)`), `:484` (backdrop already on body); `site/assets/css/styles.css:638-641`, `:665-668`, `:5787-5790`
- **Fix:** Relocate the drawer to the body: `document.body.appendChild(drawer)` instead of `nav.appendChild(drawer)` at `enhance.js:450`, matching the CSS comment at `styles.css:665-668` ("Drawer lives on `<body>`") and the `.nav-backdrop` which is already body-appended (`enhance.js:484`). MOVE (not clone) so listeners survive. Root cause: `body.has-sticky-bar .site-nav{transform:translateY(48px)}` (`styles.css:5787`, NOT in a media query, toggled on scroll past ~85vh at `enhance.js:821`) establishes a containing block, so the `position:fixed` drawer's `top/right/bottom` inset resolves against the ~56px nav box instead of the viewport — the intermittent-on-scroll breakage. Interim alternative: gate the transform with `body.has-sticky-bar:not(.nav-open) .site-nav`.

### K2-BREAKPOINTS — Conflicting nav breakpoints (768px vs 900px), descendant selectors bleeding into the drawer, off-by-one auto-close
- **Sev:** high · **RR:** medium · **NEEDS-REVIEW** (test 760–920px on all pages, FR/EN/AR)
- **Files:** `site/assets/css/styles.css:602`, `:615`, `:3775`, `:4081-4090`, `:4092`, `:4097`, `:649`; `site/assets/js/enhance.js:532`
- **Fix:** (a) Unify collapse breakpoint: change the two `.site-nav .nav-links{display:none}` rules at `styles.css:3775` and `:4090` from `max-width:768px` to `max-width:900px` to match the drawer (`:602`) and JS (`:532`), removing the 769–900px band. (b) Convert `<=768px` control-shrink rules to direct-child selectors — `.site-nav > .nav-cta` (`:4092`), `.site-nav > .theme-toggle` (`:4097`) — so they stop matching the drawer copies that live inside `.site-nav` (depends on K2-DRAWER-TRAP; if drawer is moved to body per K2-DRAWER-TRAP, this bleed is auto-resolved but keep the child-combinator for safety). (c) Drawer `padding-top` (`:649`) uses `calc(var(--nav-h)+16px)`=88px against a 56px mobile nav → dead space; drive it from a token that tracks the real 56px height. (d) Auto-close off-by-one: change `enhance.js:532` from `innerWidth > 900` to `>= 901` (or `matchMedia('(max-width:900px)')`) so JS agrees with the inclusive `max-width:900px` CSS at exactly 900px.

### K2-RESIZE-ONCE — Width/coarse-gated behaviors evaluated once at load, never re-run on resize/rotate
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (behavior change on resize)
- **Files:** `site/assets/js/enhance.js:47-48` (`reduced`/`isCoarse` captured once), `:362`, `:529-536`
- **Fix:** Re-read `window.innerWidth` inside handlers instead of gating attachment once at boot, OR add a single debounced `resize` listener that re-evaluates the coarse/width branches. The existing resize handler (`:529-536`) only closes the drawer when widening past 900 and never rebuilds/tears down drawer state, so a page loaded at desktop keeps stale state. NOTE: if `initHeroMouseParallax` is deleted per G-DEAD-JS, its `:362` width-gate concern disappears — this item then reduces to the drawer resize re-eval only.

## Known Issue #3 — LIGHT/DARK INVISIBLE TEXT (hardcoded colors that don't flip)

### K3-NAVCTA — `.nav-cta` WhatsApp pill: white text on light mint is invisible in DARK mode (default theme, ~1.4:1)
- **Sev:** critical · **RR:** none · **SAFE-AUTO** (one-line, light mode protected by `!important`)
- **Files:** `site/assets/css/styles.css:580` (base `color:#fff`), `:384` (dark `--mint:#9ce8b2`), `:492` (light `--mint:#237a4a`), `:3885-3888` (light `!important` white override)
- **Fix:** In the base rule change `color:#fff` → `color: var(--navy)`. Dark mode then renders navy `#002c51` on light mint `#9ce8b2` (high contrast). Light mode is untouched — the `:root[data-theme="light"] .nav-cta,.btn--primary{color:#fff!important}` at `:3885-3887` keeps white on the darker `#237a4a`. Verified no dark-scoped `.nav-cta` color override exists.

### K3-HEROPRICE — `.aurora-hero__amount` is `color:#fff` on the light-mode cream glass bar (invisible on all trip pages)
- **Sev:** high · **RR:** none · **SAFE-AUTO** (additive light override)
- **Files:** `site/assets/css/styles.css:9415` (`color:#fff`), `:9408` (`.aurora-hero__offer` bg `var(--bg-glass)`), `:475` (light `--bg-glass:rgba(251,248,241,.82)`)
- **Fix:** Add `:root[data-theme="light"] .aurora-hero__amount{ color: var(--txt-1); }` (navy `#002c51`). The glass bar is cream in light mode so white-on-cream is invisible; `.aurora-hero__from/.aurora-hero__unit` use `var(--txt-2)` (readable slate) so they are fine — re-check visually after.

### K3-HERO-SUBTITLE — `.aurora-hero__title em` uses `--txt-1` (navy) over the dark hero photo in light mode
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (over-photo, always; verify text-shadow legibility)
- **Files:** `site/assets/css/styles.css:9398`, `:484` (light `--txt-1:#002c51`)
- **Fix:** Set `.aurora-hero__title em{ color:#fff }` (or a `--hero-fg` token) regardless of theme, keeping its dark `text-shadow`. The em always overlays `.aurora-hero__img`, never a theme surface — navy-on-dark-photo is low contrast in light mode (sibling `.aurora-hero__title` already hardcodes `#fff`). Audit `.aurora-hero__date/from/unit` for the same over-photo pattern.

### K3-RELATED — Related/trip-card CTA + flag colors set inline with region hexes; fail AA on white cards in light mode and never flip with theme
- **Sev:** high · **RR:** low · **NEEDS-REVIEW** (removing inline hex loses per-destination color differentiation — a visual change, not a no-op)
- **Files:** `site/egypte/index.html:1505,1508,1526,1529`; `site/istanbul/index.html:730,733`; `site/cairo-sharm/index.html:1005,1008`; `site/vietnam/index.html:756,759`; plus tunisie/bali/kuala-lumpur/azerbaidjan related sections; `site/assets/css/styles.css:3176`, `:3212`, `:3241`, `:3246`
- **Fix:** Remove the inline `style="color:#XXXX"` on every `.related-card__flag` / `.related-card__cta` so `__cta` inherits `var(--accent)` (`:3241/3246`) and `__flag` inherits `var(--txt-3)` (`:3212`); add `.related-card__flag{color:var(--accent)}` once if flag color is wanted. `.related-card` bg is `#ffffff` in light mode so the light teal/cyan inline hexes (`#19B5B0/#3AAFAF/#28B4D4`) fail WCAG AA (~2.4:1). NOTE: the parallel `.trip-card__cta` inline hexes at `index.html:470,522` are INERT (`.trip-card__cta{color:var(--tc-fg)!important}` at `:8692` + light `color:var(--mint)!important` at `:4228` beat any non-important inline) — for those, just DELETE the dead inline `color` attributes (folded into G-DEAD-INLINE). Flag this as a per-page accent change (only two global `--accent` defs + an egypte body override at `:18`), so all related CTAs on a page will adopt one accent, losing per-destination color.

---

# (B) CORRECTNESS / FUNCTIONAL BUGS

### B-CAIRO-404 — cairo-sharm loads deleted `scroll-hero.js` (404) and uses a removed hero system
- **Sev:** high · **RR:** medium · **NEEDS-REVIEW** (hero migration is a visual build)
- **Files:** `site/cairo-sharm/index.html:1149` (`<script src="../assets/js/scroll-hero.js">`), `:172` (`.scroll-hero`), `:181` (`.scroll-hero__continuation`)
- **Fix:** Migrate cairo-sharm's hero to the `.aurora-hero` system used by the other 7 trip pages (copy from e.g. `istanbul/index.html`, swap cairo-sharm bg imagery). Minimum viable to stop the 404: delete the `<script src="../assets/js/scroll-hero.js">` tag at `:1149` (hero stays unstyled until migrated). Do not ship the 404. cairo-sharm is git-untracked — see prod-config decisions.

### B-SHARM-ROUTE — Broken internal route `../sharm-constantine/` (page does not exist, 404s)
- **Sev:** medium · **RR:** low · **SAFE-AUTO** (repoint two hrefs)
- **Files:** `site/cairo-sharm/index.html:991`, `:1091`
- **Fix:** Repoint both `../sharm-constantine/` links to `../egypte/` (which has a working `data-tier="sharm-constantine"` filter tab at `egypte/index.html:574` + matching hotel cards). Do NOT remove the `hero__sharm-constantine` collage image (separate live homepage tile). Overlaps deploy item H-REDIRECTS (the `_redirects` rule for sharm-constantine is already moot — the folder never existed).

### B-CALC-SCROLL — Duplicate non-throttled scroll listener in calculator.js competes with the shared rAF coordinator
- **Sev:** low · **RR:** low · **NEEDS-REVIEW** (must preserve `.scrolled` toggle — it is the SOLE source)
- **Files:** `site/assets/js/calculator.js:585-591`, `:617`; `site/assets/js/enhance.js:72-80`
- **Fix:** Do NOT just delete `initNav` — `.scrolled` is toggled ONLY at `calculator.js:588` (enhance.js never sets it) and has real CSS at `styles.css:144/541/3637/3998` + light variants. Move the toggle onto the shared coordinator: either expose `onScrollY` globally and subscribe from calculator.js, or move `nav.classList.toggle('scrolled', y>40)` into enhance.js via `onScrollY(...)` and drop `calculator.initNav`. Verify `.scrolled` still triggers on trip pages.

### B-I18N-INJECTED — JS-injected value-props / trust-strip / press-strip are hardcoded French, never translate
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (needs EN/AR copy)
- **Files:** `site/assets/js/enhance.js:990-1024` (value-props), `:740-770` (trust-strip), `:962-987` (press-strip); called from `initAfterHero` `:1074-1079`
- **Fix:** Add `data-i18n` keys to each injected string and register EN/AR translations (i18n.js dictionaries or homepage `AL_PAGE_I18N`), then re-run `translate()` after injection — OR resolve each string for `document.documentElement.lang` at injection time. These run after i18n baseline capture so `translate()` currently can't localize them.

### B-I18N-BOOKING — Booking-form empty-state relies on `data-i18n-en`/`-ar` attributes that i18n.js never reads
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (needs dictionary entry)
- **Files:** `site/assets/js/booking-form.js:654-658`; `site/assets/js/i18n.js:1077-1095`
- **Fix:** Add a `booking.empty_state` entry to EN and AR dictionaries in i18n.js. Remove the misleading `data-i18n-en`/`data-i18n-ar` attrs (translate() only reads `[data-i18n]`, `[data-i18n-html]`, and the aria/title/placeholder/alt ATTRS list). The empty-state is injected dynamically, so `translate()` must run after the innerHTML swap.

### B-I18N-HOTEL — Hotel-filter empty-state + reset button hardcoded French with inline onclick
- **Sev:** low · **RR:** none · **NEEDS-REVIEW** (needs copy + event wiring)
- **Files:** `site/assets/js/calculator.js:571`, `:579-582`
- **Fix:** Localize "Aucun hôtel ne correspond aux filtres." and "Réinitialiser" via i18n (data-i18n keys resolved for active lang or looked up at injection time), and bind the reset button with `addEventListener` referencing the resetFilters logic instead of the inline `onclick="resetFilters()"` coupling to global `window.resetFilters`.

### B-TOAST-ERROR — booking-form.js emits `error` toasts with no matching `.toast--error` style (paired with dead `.toast--success`)
- **Sev:** low · **RR:** none · **NEEDS-REVIEW** (optional additive rule) — see also G-TOAST
- **Fix:** Optionally add a `.toast--error` rule (color via `var(--danger)`); the dead-code half is in G-TOAST.

---

# (C) RESPONSIVE

(Primary responsive root causes K2-* are in Group A.)

### C-HERO-CTA-CLIP — Two hero CTAs forced `flex-wrap:nowrap` between 381–768px can cram/clip long FR/AR/EN labels
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (verify FR/EN/AR at 390/414)
- **Files:** `site/assets/css/styles.css:9437-9438`, `:9552-9554`; `site/egypte/index.html:203`
- **Fix:** Raise the wrap breakpoint so the two CTAs can stack from ~`<=440px` instead of only `<=380px` (move the `@media(max-width:380px)` rule at `:9552` up), OR set `.aurora-hero__actions` to wrap by default and sit side-by-side only above a width where both localized labels fit. The two `flex:1 1 0;min-width:0` buttons squeeze between ~400–520px; `.btn` has no ellipsis/overflow-wrap.

### C-STICKY-HAS — `:has()`-only bottom padding + FAB lift for `.sticky-total` lack the JS fallback used elsewhere
- **Sev:** medium · **RR:** low · **SAFE-AUTO** (mirror existing `has-sticky-bar` pattern)
- **Files:** `site/assets/css/styles.css:2287-2291`, `:2297-2299`, `:5784-5786` (existing precedent); FAB selector `.fab-whatsapp` (`enhance.js:702,707`)
- **Fix:** Add a `body.has-sticky-total` class from JS on trip pages and duplicate the `padding-bottom` (`:2288-2290`) and FAB-lift (`:2298`) rules against `body.has-sticky-total .fab-whatsapp`, mirroring the documented `has-sticky-bar` JS fallback (toggled `enhance.js:821`) so behavior is correct in Firefox<121/older Safari without `:has()`.

### C-GRID-FLOOR — `.grid-cards` auto-fit floors (320/360px) can push edge-tight cards / hairline overflow at 320px
- **Sev:** low · **RR:** low · **SAFE-AUTO** (`min()` wrap)
- **Files:** `site/assets/css/styles.css:218` (`--lg` minmax 320), `:219` (`--xl` minmax 360)
- **Fix:** Lower the floors to `min(320px,100%)` (`:218`) and `min(360px,100%)` (`:219`) so the single-column case can shrink below the floor at 320px rather than overflowing the single track. Base (280) at `:216` and `--sm` (220) at `:217` are safe within a 288px content box.

### C-ZINDEX-DRAWER — Nav drawer ignores `--z-drawer`/`--z-backdrop` tokens; nav pill + sticky bars stack over an open drawer
- **Sev:** medium · **RR:** low · **SAFE-AUTO** (swap hardcoded z-index for existing tokens)
- **Files:** `site/assets/css/styles.css:645` (drawer z:110), `:739` (backdrop z:105), `:628` (hamburger z:120), `:311-313` (unused tokens), `:4731` (`.site-nav` `--z-nav:300 !important`)
- **Fix:** Drawer `z-index:var(--z-drawer)` (400) at `:645`, backdrop `var(--z-backdrop)` (350) at `:739`, hamburger `>400` at `:628`. Puts the open drawer + backdrop above the fixed nav pill (`--z-nav:300`) and sticky bars (`--z-sticky:200`) per the intended hierarchy. Tokens already defined but unused.

---

# (D) ACCESSIBILITY

(K3-NAVCTA, K3-related etc. contrast items are in Group A. K1-* nav a11y in Group A.)

### D-FOCUS-TRAP — Drawer declares `aria-modal="true"` but has no Tab focus-trap and does not inert the background
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (a11y logic, test with SR/keyboard)
- **Files:** `site/assets/js/enhance.js:437-438`, `:498-514`
- **Fix:** Add a Tab/Shift+Tab keydown handler on the open drawer cycling focus among `drawer.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])')` (wrap first↔last), and set `inert` (or `aria-hidden`) on `<main>` + sibling landmarks while `nav-open`, reusing `setOpen` state. Currently focus escapes the modal (WCAG 2.4.3/2.1.2).

### D-BTN-WA-CONTRAST — `.btn--wa` white text on WhatsApp green is below AA (inconsistent with phone-card button)
- **Sev:** low · **RR:** none · **SAFE-AUTO** (one-line color swap)
- **Files:** `site/assets/css/styles.css:1603-1605` (`color:#fff` on `--wa-green:#25D366`), `:9012-9014` (sibling uses `#052e16`), `:406`
- **Fix:** Switch `.btn--wa` to `color:#052e16` (matching `.phone-card__btn--wa`) for AA-safe dark-on-green in both themes. No theme override of `.btn--wa` color exists.

### D-NOSCRIPT — `.u-noscript-card/.u-noscript-msg` near-white text on near-white card in light mode
- **Sev:** medium · **RR:** none · **SAFE-AUTO** (tokenize)
- **Files:** `site/assets/css/styles.css:263-265`, `:470` (light `--bg:#fbf8f1`) — present on 8 region pages
- **Fix:** Use tokens: `.u-noscript-card{ background:var(--bg-card); color:var(--txt-1); }` and `.u-noscript-msg{ color:var(--txt-2); }` so they flip with theme. Current `#fbf8f1` text on 4%-white card = cream-on-cream in light mode.

### D-THEME-PRESSED — Theme toggle never exposes state via `aria-pressed`
- **Sev:** low · **RR:** none · **SAFE-AUTO**
- **Files:** `site/index.html:259-262`; `site/assets/js/enhance.js:100-111`
- **Fix:** In the toggle handler set `btn.setAttribute('aria-pressed', isLight ? 'false' : 'true')` after flipping `data-theme`, and set the initial value at load (`:98-100`). Optionally announce via the i18n polite live region.

---

# (E) VISUAL / DESIGN-SYSTEM

### E-RIBBON — `.hotel-card__ribbon` defined twice; first block is dead and a blanket `!important` neutralizes all per-tier colors
- **Sev:** high · **RR:** low · **NEEDS-REVIEW** (decide if per-tier ribbon color is desired)
- **Files:** `site/assets/css/styles.css:1032-1060` (dead block, incl. low-contrast `.economique#8AB4F8`/`.medium#8BD5CA`), `:8119-8151` (live sticker + light overrides), `:4163` (`.hotel-card__ribbon{color:rgba(255,255,255,.85)!important}` unscoped)
- **Fix:** Delete the superseded block `1032-1060` (dead, contains the 1.68–2.11:1 colors that never render). THEN decide: the blanket `!important` white at `:4163` overrides ALL non-important tier colors, so both the dead block AND the "winning" `8144-8151` tier colors are currently inert. If per-tier ribbon color IS wanted, the real bug is the `!important` at `:4163` — relax it. If not, all tier-color blocks are dead debt and can go.

### E-DANGER-TOKEN — Error/validation text bypasses `--danger` token with raw reds
- **Sev:** low · **RR:** low · **SAFE-AUTO** (token substitution)
- **Files:** `site/assets/css/styles.css:7448,7472,7487,7493,7498` (raw `#d04444/#c43d3d/#b13434`); `--danger:#cf5252`/`--danger-soft` at `:399-400`
- **Fix:** Consolidate onto `var(--danger)`/`var(--danger-soft)`; add a light-mode `--danger` override if the light surface needs it.

### E-TYPE-SCALE — Fluid type scale (`--fs-*`) largely bypassed (~224 raw font-sizes vs 28 token uses)
- **Sev:** medium · **RR:** medium · **NEEDS-REVIEW** (snapping off-scale sizes changes rendering)
- **Files:** `site/assets/css/styles.css:87-91` (defs), `:3213,3245,8126,1036` (examples)
- **Fix:** Migrate token-matching raw sizes to the token; snap off-scale ones to the nearest `--fs-*` rung. Broad, visual — do as a deliberate design pass, not blind replace.

### E-RADIUS-PILL — Pill radius `--r4` abandoned (29 raw `999px`) and radius fallbacks disagree with token values
- **Sev:** medium · **RR:** low · **SAFE-AUTO** (fallbacks) + **NEEDS-REVIEW** (999px migration)
- **Files:** `site/assets/css/styles.css:435`, `:5847,6003` (`var(--r2,12px)` but `--r2`=8), `:5809,6102` (`var(--r3,24px)` but 12), `:7594` (`var(--r3,14px)`), `:8960` (`var(--r2,10px)`)
- **Fix:** SAFE-AUTO: normalize every fallback to its real token value (defensive; only bites if the custom prop fails to resolve). NEEDS-REVIEW: migrate raw `999px` → `var(--r4)`.

### E-RADIUS-OFFSCALE — Off-token border-radii (14/16/18/10/6px) that match no radius token
- **Sev:** low · **RR:** low · **NEEDS-REVIEW** (visual snap)
- **Files:** `site/assets/css/styles.css:1812,5428` (14), `:5544,7630` (10), `:5702` (16), `:8456` (18), `:5350,7084` (6)
- **Fix:** Snap 10/14→`--r3`, 6→`--r2`; review 16/18 case-by-case.

### E-ELEVATION — Elevation tokens abandoned (60 bespoke box-shadows vs 5 `--elev-*` uses)
- **Sev:** medium · **RR:** medium · **NEEDS-REVIEW**
- **Files:** `site/assets/css/styles.css:438-439,505-506` (defs), `:3187,4900,8465` (examples)
- **Fix:** Consolidate common card/dropdown/modal shadows onto `--elev-*`; reserve bespoke for the hotel-card sticker. Visual — deliberate pass.

### E-SPACING — Off-scale spacing in chips, labels, map controls (18/22/70/28/36/90px)
- **Sev:** low · **RR:** low · **NEEDS-REVIEW** (visual nudge)
- **Files:** `site/assets/css/styles.css:5441,5486,5594,5728,4932`
- **Fix:** Nudge to nearest `--space-*/--s*` step; keep intentional hairlines.

### E-TOUCHMIN — `--touch-min` bypassed (22 raw `44px` vs 11 token uses)
- **Sev:** low · **RR:** none · **NEEDS-REVIEW** (confirm each 44px is a touch target, not decorative like `.hl-card__icon` at `:920-921`)
- **Files:** `site/assets/css/styles.css:920,921,1786,5364,7904`
- **Fix:** Replace touch-target `44px` with `var(--touch-min)`; do not blind-replace decorative icon boxes.

### E-TRANSITION-ALL — `transition: all` used 13 times (animates unrelated props, jank risk)
- **Sev:** low · **RR:** low · **SAFE-AUTO** (enumerate per `.btn` pattern)
- **Files:** `site/assets/css/styles.css:1210,1316,2628,3269,3380,6748,6817,6856,7043,7086,7797,7912,8337`
- **Fix:** Enumerate explicit properties (background/color/border-color/transform) per the `.btn` precedent at `:1543-1547`.

---

# (F) PERFORMANCE

(Header/cache items live in Group H. Dead `--fg` images in Group G as G-FG-IMAGES since it is both cruft + weight.)

### F-CSS-BLOCKING — 288 KB / 9,555-line styles.css is render-blocking, shipped whole to every page
- **Sev:** medium · **RR:** medium · **NEEDS-REVIEW** (no build step — refine, don't split)
- **Files:** `site/assets/css/styles.css:1`; loaded blocking at `site/index.html:105`, `site/egypte/index.html:15` (identical across pages)
- **Fix:** Refine not rewrite: (a) SWR via H-CACHE so Vercel caches it; (b) optionally inline critical hero/nav CSS + load rest non-blocking (`media=print onload`); (c) audit the 71 `backdrop-filter` layers — biggest paint win on mid/low mobile, especially on theme toggle. Do NOT split per-page (no-build constraint).

### F-THUMBS — Trip-card + hotel-card thumbnails are over-sized raw JPEGs (no WebP/AVIF, no srcset)
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (needs image pipeline run)
- **Files:** 7 homepage `.trip-card__img` at `index.html:432,484,536,590,642,694,746` (1.9 MB, 1280×720); 25 egypte `.hotel-card__photo` at `egypte/index.html:583,608,...` (800×600, 78–162 KB)
- **Fix:** Generate WebP/AVIF siblings via the existing hero pipeline; wrap in `<picture>` and/or add `srcset` at the grid-slot intrinsic width. WebP-only roughly halves the bytes. `loading=lazy` + width/height already present.

### F-FONTS — Google Fonts stylesheet render-blocking + fragmented across 3 request strings
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW**
- **Files:** `site/index.html:88-89,100-102`; `site/egypte/index.html:12` (adds Sora); 6 destination pages use the opsz variable form; `site/_headers:49` (dead self-host rule)
- **Fix:** Standardize on ONE css2 request string across all pages (the opsz variable form). KEEP Sora on egypte — it IS consumed (`styles.css:9328` `--font-hero-display`, applied `:9391/:9415`). Optionally load fonts CSS non-blocking (`media=print onload`; swap handles fallback) or self-host woff2.

### F-LCP-PRELOAD — Homepage/egypte LCP preload targets WebP while `<picture>` prefers AVIF (wasted fetch on AVIF browsers)
- **Sev:** low · **RR:** low · **NEEDS-REVIEW**
- **Files:** `site/index.html:95-99,282-284`; `site/egypte/index.html:38-42,181-183`
- **Fix:** Preload the AVIF (`type=image/avif`) plus a second `type=image/webp` preload for non-AVIF browsers, or accept the minor waste (WebP still decodes — costs bandwidth not paint).

### F-SW-IMAGES — Service worker treats immutable images as stale-while-revalidate (needless background re-fetch each visit)
- **Sev:** low · **RR:** low · **SAFE-AUTO** (add cache-first branch)
- **Files:** `site/sw.js:8,60-62,91-104,17`
- **Fix:** Add a cache-first branch for `isImage(url)` ahead of the SWR branch (return cached without the background fetch when present); keep SWR for CSS/JS/fonts/CDN only. Bump `CACHE_NAME` (`:17`) on release.

### F-SOURCE-DOCS — ~54 MB of source docs git-tracked (incl. a 31.6 MB PDF); slow clones, no deploy impact
- **Sev:** low · **RR:** low · **NEEDS-REVIEW** (git history decision)
- **Files:** `source of truth/` (34 .pdf + 3 .docx, 54.1 MB); `.gitignore`
- **Fix:** Move source docs out of the repo or into Git LFS and add `source of truth/` to `.gitignore`. History purge optional/higher-risk. Files are outside `site/` so zero page-load impact — repo hygiene only.

---

# (G) DEAD-CODE / CRUFT CLEANUP

### G-DEAD-JS — Dead `initHeroMouseParallax()` + its superseded `.hero__*` CSS family
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (CRITICAL PRESERVE list)
- **Files:** `site/assets/js/enhance.js:359` (def), `:1064` (call); `site/assets/css/styles.css:3571,4541,4770` + region-scoped `.hero__bg` at `3926-3950,4446-4498,4607-4619`
- **Fix:** Delete `initHeroMouseParallax()` and its `boot()` call (NodeList always empty — 0 `.hero__visual` elements). Remove dead `.hero__visual/.hero__visual-art/.hero__visual-img/.hero__bg` (+ all `[data-region]` variants) and the standalone `.hero__inner` rules outside the print block. **CRITICAL PRESERVE:** `.hero__content` (LIVE at `rendez-vous-visa/index.html:190`) shares the compound rule at `:4770` (`.hero__inner, .hero__content`) — split it, keep `.hero__content`; also keep `.hero__price/.hero__ctas/.hero__lede` and print-scoped `.hero__bg` refs at `:3804/3811`.

### G-DEAD-INLINE — Dead inline `color` attributes on `.trip-card__cta` (defeated by `!important` stylesheet rule)
- **Sev:** low · **RR:** none · **SAFE-AUTO** (delete inert attrs)
- **Files:** `site/index.html:470,522`; `site/voyages/index.html:111` (and other trip-card CTAs); overridden by `styles.css:8692` + `:4228`
- **Fix:** DELETE the inert inline `style="color:#..."` on `.trip-card__cta` — a non-important inline style loses to the stylesheet `!important`, so these hexes never render. (The related-card ones that DO render are handled in K3-RELATED.)

### G-TOAST — Duplicate/conflicting `.toast--success` rule
- **Sev:** low · **RR:** none · **SAFE-AUTO**
- **Files:** `site/assets/css/styles.css:3427-3433` (dead `--sage`), `:3705-3706` (intended `--mint`)
- **Fix:** Delete the redundant `--sage` block at `:3427-3433` (later `--mint` rule at same specificity wins). Optionally add `.toast--error` (see B-TOAST-ERROR).

### G-PHOTO-STRIP — Dead `.photo-strip*` CSS block + no-op lightbox selector fragment
- **Sev:** low · **RR:** low · **SAFE-AUTO**
- **Files:** `site/assets/css/styles.css:5733-5769`; `site/assets/js/enhance.js:832`
- **Fix:** Delete `.photo-strip/.photo-strip__item*` rules and drop the `.photo-strip img` fragment from the lightbox selector at `enhance.js:832`. (Injected `.press-strip` is separate/live.)

### G-COMPOUND — Dead members inside otherwise-live compound selectors
- **Sev:** low · **RR:** low · **SAFE-AUTO** (trim, keep live siblings)
- **Files:** `site/assets/css/styles.css:8811,8827,8846,3760,4013,4091,9290-9291,5777,4825,4844,4845,4876`
- **Fix:** Trim dead members: `.dest-card`, `.dep-badge`, `.nav-logo-img`, `.badge--limited`, `.testimonial` (singular), `.book-form button[type=submit]`, `svg.btn__arrow`/`svg.nav-cta__arrow` (RTL). KEEP live siblings `.nav-logo svg`, `.testi-card`, `.bform-*`.

### G-CALC-CSS — Dead calculator/breakdown CSS from an earlier markup iteration
- **Sev:** low · **RR:** low · **SAFE-AUTO**
- **Files:** `site/assets/css/styles.css:7524,7537,7542,7546` + RTL block `9264-9275`
- **Fix:** Delete `.calc-cta__price/.calc-line__amount/.calc-total__amount/.breakdown__amount/.calc-disclaimer/.trip-card__from-amount`. calculator.js renders only `.breakdown__line/__divider/__empty`.

### G-ATOMIC — Dead atomic-utility + fluid-typography CSS layer (confirmed-unused subset)
- **Sev:** medium · **RR:** low · **SAFE-AUTO** (but respect PRESERVE list)
- **Files:** `site/assets/css/styles.css:203,204,205,207,209,217,219,223,228,232,238,240,260,521,522,526`
- **Fix:** Remove `.fs-display-2/.fs-h1/.fs-h2/.fs-h4/.fs-h6; .grid-cards--sm/--xl; .u-block/.u-mt-1/.u-mt-sp4/.u-mb-sp7/.u-measure-sm/.u-link-mint; .container--narrow/--prose; .section-lg`. **DO NOT remove `.fs-display-1`** (LIVE at `index.html:321`). Keep `.fs-h3/.fs-h5/.fs-body/.grid-cards/.grid-cards--lg/.u-hidden/.u-noscript-*`.

### G-FG-IMAGES — 36–42 orphaned heroes-v2 `--fg` images (~6.1 MB dead bundle weight)
- **Sev:** medium · **RR:** low · **SAFE-AUTO** (grep-verify each basename before delete)
- **Files:** `site/assets/images/heroes-v2/hero__{azerbaidjan,bali,istanbul,kuala-lumpur,tunisie,vietnam}--fg.*` (36 files: avif/webp/jpg × desktop/mobile × 6 slugs); inert `data-fg` at `cairo-sharm/index.html:174`
- **Fix:** Delete the 36 unreferenced `*--fg*` files for those six slugs and remove the inert `data-fg` attribute. `grep -rF` each basename first. KEEP all `hero__cairo-sharm--fg.*` (6 files, referenced at `cairo-sharm/index.html:174`). ~6.1 MB removed from deploy.

### G-CZL-IMAGES — Orphaned Constantine-departure (`czl`) hotel images
- **Sev:** low · **RR:** none · **SAFE-AUTO**
- **Files:** `site/assets/images/hotels/hotel__rehana-czl.jpg`, `hotel__rehana-royal-czl.jpg`, `hotel__tivoli-czl.jpg`
- **Fix:** Delete the 3 files (0 grep hits anywhere; live Constantine cards use `sharmcz-*` ids with non-czl image files).

---

# (H) PRODUCTION / DEPLOY CONFIG

### H-DEPLOY-TARGET — CI deploys to Cloudflare Pages, not Vercel; conflicting targets + orphaned token
- **Sev:** high · **RR:** medium · **NEEDS-REVIEW** (infra decision + secret rotation)
- **Files:** `.github/workflows/deploy.yml:1,43-48`; `.github/workflows/build-trips.yml:72-77`; `wrangler.toml:14-16`; `netlify.toml:9-12`
- **Fix:** Decide Vercel is the single target. Delete/repoint `deploy.yml`, REVOKE/ROTATE `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, delete `wrangler.toml` + `netlify.toml` (H-STALE-CONFIG), update the build-trips.yml deploy note. deploy.yml fires on push to main / manual dispatch.

### H-HEADERS — Security headers + CSP dead on Vercel (`_headers` is Cloudflare/Netlify-only)
- **Sev:** high · **RR:** medium · **NEEDS-REVIEW** (CSP must be validated against inline scripts before enforcing)
- **Files:** `site/_headers:16-27,57-59`; `vercel.json:1-9`
- **Fix:** Add a `"headers"` array to vercel.json for `/(.*)` replicating the security set: `X-Content-Type-Options:nosniff`, `X-Frame-Options:SAMEORIGIN`, `Referrer-Policy:strict-origin-when-cross-origin`, `X-XSS-Protection:0`, `Permissions-Policy: camera=(),microphone=(),geolocation=(),interest-cohort=()`. Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` and a CSP. CSP script/style/connect sources must whitelist the real preconnect origins (`cdn.jsdelivr.net`, `basemaps.cartocdn.com`, `fonts.googleapis.com`, `fonts.gstatic.com`); `'unsafe-inline'` for script-src is currently required (inline JSON-LD + `classList.add('js')` bootstraps) unless nonces added. Keep `_headers` for Cloudflare/Netlify.

### H-CACHE — Cache-Control tiers absent on Vercel (incl. `sw.js` no-cache the SW update strategy depends on)
- **Sev:** medium/high · **RR:** low · **SAFE-AUTO** (mechanical port, once headers array exists)
- **Files:** `site/_headers:29-72,57-59`; `site/sw.js:14-17`; `vercel.json:1-9`
- **Fix:** In vercel.json `"headers"`: `/sw.js` → `public, max-age=0, must-revalidate` + `Service-Worker-Allowed: /`; `/assets/images/(.*)` + `/assets/fonts/(.*)` → `public, max-age=31536000, immutable`; `/assets/css/(.*)` + `/assets/js/(.*)` → `public, max-age=600, stale-while-revalidate=86400`; HTML → `max-age=3600, must-revalidate`. Set Content-Type for `site.webmanifest`/`sitemap.xml`/`robots.txt` if Vercel mis-detects. Mirrors `_headers` exactly.

### H-REDIRECTS — All redirects dead on Vercel; `/cairo-sharm/` ships as a live self-canonicalizing duplicate of `/egypte/`
- **Sev:** high · **RR:** medium · **NEEDS-REVIEW** (decide keep-and-redirect vs delete folder)
- **Files:** `site/_redirects:16-19,24-39`; `site/cairo-sharm/index.html:26,32`; `vercel.json:1-9`
- **Fix:** Port `_redirects` into vercel.json `"redirects"` (301 `/cairo-sharm` → `/egypte/`, trailing-slash + typo aliases), OR delete the orphaned `site/cairo-sharm/` folder. cairo-sharm's og:url + canonical both point at itself, duplicating egypte. `sharm-constantine` folder never existed — drop that redirect. Coordinate with B-CAIRO-404/B-SHARM-ROUTE and prod-config-05.

### H-VERCEL-UNTRACKED — vercel.json (the Vercel deploy definition) is untracked / uncommitted
- **Sev:** medium · **RR:** none · **NEEDS-REVIEW** (commit decision + admin/cairo-sharm intentionality)
- **Files:** `vercel.json:1-9`
- **Fix:** After adding headers + redirects, COMMIT vercel.json (a fresh CI checkout currently lacks it). Decide intentionally whether `site/admin/` and `site/cairo-sharm/` should be committed or removed (both currently untracked).

### H-ADMIN-CMS — Public `/admin/` CMS ships with unpinned no-SRI CDN bundle + placeholder backend config
- **Sev:** high · **RR:** low · **NEEDS-REVIEW** (security; real OAuth values needed)
- **Files:** `site/admin/index.html:16,6`; `site/admin/config.yml:16,20`; `site/robots.txt:8-9`
- **Fix:** Pin the CMS bundle to an exact version + SRI (`@sveltia/cms@x.y.z` + `integrity=sha384-...` + `crossorigin`) or vendor same-origin. Replace `OWNER/alliance-travel` (config.yml:16) and `https://YOUR-AUTH-WORKER.workers.dev` (config.yml:20) with real values, OR exclude `site/admin/` from the production build until the OAuth broker exists. Gate `/admin/` at the edge + add `Disallow: /admin/` to robots.txt (H-ROBOTS). admin/ is currently untracked.

### H-STALE-CONFIG — Stale netlify.toml + wrangler.toml committed for a Vercel target
- **Sev:** medium · **RR:** low · **NEEDS-REVIEW** (bundled with H-DEPLOY-TARGET)
- **Files:** `netlify.toml:1-12`; `wrangler.toml:14-16`
- **Fix:** Once Vercel confirmed sole target, delete both. Keep only vercel.json.

### H-ROBOTS — robots.txt asserts no admin paths + does not `Disallow: /admin/`
- **Sev:** low · **RR:** none · **SAFE-AUTO**
- **Files:** `site/robots.txt:1-6,8-9`; `site/admin/index.html:6`
- **Fix:** Add `Disallow: /admin/` under `User-agent: *`; update the outdated comment (lines 2-4 claim "no protected admin paths"). Combine with H-ADMIN-CMS.

### H-THEME-META — theme-color + locale metadata inconsistent, not light/dark-adaptive
- **Sev:** low · **RR:** none · **SAFE-AUTO**
- **Files:** `site/index.html:23,27,79`; `site/voyages/index.html:28`; `site/site.webmanifest:37,41`; `rendez-vous-visa` + `admin` (no theme-color)
- **Fix:** Standardize locale (pick `fr-DZ` OR `fr_FR` across og:locale, JSON-LD inLanguage, manifest lang). Optionally add two `<meta name="theme-color" media="(prefers-color-scheme:...)">`; align manifest `theme_color`. Add theme-color to visa + admin pages.

---

# EXECUTION PLAN (single-writer-safe batching)

**Principle:** each shared file (styles.css, enhance.js, calculator.js, i18n.js, booking-form.js, vercel.json) must be edited by ONE writer at a time. Batches that touch DIFFERENT files run in PARALLEL. Batches on the SAME file are SEQUENTIAL. Per-page HTML edits are independent of each other and of the shared JS/CSS.

### PHASE 0 — Known-issue critical fixes (do first, mostly sequential on shared files)

Order within a file matters; group by writer:

- **Writer ENHANCE-A (enhance.js):** K1-NAV-CLOSE (delete close block) → K2-DRAWER-TRAP (`nav.appendChild`→`body.appendChild`) → K2-RESIZE-ONCE (resize re-eval) → K2-BREAKPOINTS(d) (`:532` off-by-one) → D-FOCUS-TRAP. *All same file — strictly sequential, single writer.*
- **Writer STYLES-A (styles.css):** K3-NAVCTA (`:580`) → K3-HEROPRICE (add light override) → K3-HERO-SUBTITLE → K2-BREAKPOINTS(a,b,c) (breakpoint unify + child combinators + drawer padding) → C-ZINDEX-DRAWER. *Same file — sequential.*
- **Writer HTML-VISA:** K1-WA-DUP (visa nav class) — independent HTML file, parallel with everything.
- **Writer HTML-RELATED (per-page, parallel across pages):** K3-RELATED inline-hex removal on egypte/istanbul/cairo-sharm/vietnam/tunisie/bali/kuala-lumpur/azerbaidjan. Each page independent.

STYLES-A, ENHANCE-A, HTML-VISA, HTML-RELATED all run **in parallel** (different files). K1-WA-DUP's JS half (FAB guard) belongs to ENHANCE-A — sequence it there.

### PHASE 1 — SAFE-AUTO mechanical batches (parallel across files)

- **STYLES-B (styles.css, sequential after STYLES-A):** G-TOAST → G-PHOTO-STRIP(css) → G-COMPOUND → G-CALC-CSS → G-ATOMIC → E-DANGER-TOKEN → E-RADIUS-PILL(fallbacks) → E-TRANSITION-ALL → D-BTN-WA-CONTRAST → D-NOSCRIPT → C-GRID-FLOOR → C-STICKY-HAS(css half). *One writer, ordered; the biggest batch.*
- **ENHANCE-B (enhance.js, sequential after ENHANCE-A):** G-PHOTO-STRIP(js `:832`) → D-THEME-PRESSED → C-STICKY-HAS(js class) → B-I18N-INJECTED.
- **CALC (calculator.js):** B-CALC-SCROLL → B-I18N-HOTEL. Parallel with STYLES/ENHANCE.
- **I18N (i18n.js) + BOOKING (booking-form.js):** B-I18N-BOOKING spans both — treat i18n.js + booking-form.js as one writer pair, parallel with the rest.
- **SW (sw.js):** F-SW-IMAGES. Parallel.
- **IMAGES (filesystem deletes):** G-FG-IMAGES, G-CZL-IMAGES — parallel, no code file lock (grep-verify basenames first).
- **HTML-INLINE (per page):** G-DEAD-INLINE trip-card inline color deletes; H-THEME-META meta edits; B-SHARM-ROUTE href repoints. Per-page, parallel.

### PHASE 2 — Deploy config (mostly one file: vercel.json)

- **VERCEL (vercel.json, single writer, sequential):** H-HEADERS → H-CACHE → H-REDIRECTS → H-VERCEL-UNTRACKED (commit last). One writer.
- **Parallel with VERCEL (different files):** H-DEPLOY-TARGET (delete `.github/workflows/deploy.yml`, rotate secrets) + H-STALE-CONFIG (delete netlify.toml/wrangler.toml) + H-ROBOTS (robots.txt) + H-ADMIN-CMS (admin/index.html + config.yml).

### PHASE 3 — NEEDS-REVIEW visual/design passes (serialize on styles.css; human sign-off)

Do AFTER Phase 1 so the file is already de-crufted. One writer on styles.css:
- E-RIBBON → E-TYPE-SCALE → E-ELEVATION → E-RADIUS-OFFSCALE → E-SPACING → E-TOUCHMIN → E-RADIUS-PILL(999px migration) → G-DEAD-JS(css half). *All styles.css — sequential, each needs a visual check.*
- **G-DEAD-JS(js half):** enhance.js — after ENHANCE-B.
- **B-CAIRO-404 + hero migration:** cairo-sharm/index.html (+ imagery) — independent page, needs design build.
- **F-CSS-BLOCKING, F-THUMBS, F-FONTS, F-LCP-PRELOAD:** perf passes; F-THUMBS needs the image pipeline; the rest touch per-page `<head>` + vercel.json (coordinate with VERCEL writer). F-SOURCE-DOCS is a git-history decision, standalone.

### PARALLELIZATION SUMMARY

Max concurrency (no two writers share a file):
`STYLES` ∥ `ENHANCE` ∥ `CALC` ∥ `I18N+BOOKING` ∥ `SW` ∥ `VERCEL` ∥ `IMAGES` ∥ each `HTML page`.
Within each writer, items are strictly ordered. styles.css is the critical path (longest sequential chain) — schedule its Phase-0/1/3 chain first and run everything else alongside it.

---

## RECONCILIATION — 2026-09-20

Every item above was re-checked against the source as it stands today. This
list was written before several fix waves landed, so most of it is already
closed. Status, so the next pass does not re-chase what is done:

**CLOSED — fixed by an earlier wave or moot (30):**
K1-NAV-CLOSE · K1-WA-DUP · K2-DRAWER-TRAP · K2-BREAKPOINTS · K2-RESIZE-ONCE ·
K3-NAVCTA · K3-HEROPRICE · K3-HERO-SUBTITLE · K3-RELATED · B-CALC-SCROLL ·
B-I18N-INJECTED · B-I18N-BOOKING · B-TOAST-ERROR · D-FOCUS-TRAP ·
D-BTN-WA-CONTRAST · D-NOSCRIPT · D-THEME-PRESSED · E-DANGER-TOKEN ·
E-TRANSITION-ALL · F-LCP-PRELOAD · F-SW-IMAGES · F-SOURCE-DOCS · G-DEAD-JS ·
G-TOAST · G-PHOTO-STRIP · G-CALC-CSS · G-ATOMIC · G-CZL-IMAGES ·
G-DEAD-INLINE · H-DEPLOY-TARGET · H-HEADERS · H-CACHE · H-REDIRECTS ·
H-VERCEL-UNTRACKED · H-STALE-CONFIG · H-ROBOTS · H-THEME-META

**MOOT — the subject no longer exists:**
`B-CAIRO-404`, `B-SHARM-ROUTE`, `H-ADMIN-CMS` — `site/cairo-sharm/` was
removed and there is no `site/admin/config.yml`. Drop these rather than fix.

**FALSE POSITIVES — verified present-and-correct, do not re-open:**
- `B-I18N-HOTEL` — the empty state is localised FR/EN/AR off `<html lang>`
  at injection time. The inline `onclick` is deliberate and commented.
- `G-COMPOUND` — `.dest-card`, `.dep-badge`, `.nav-logo-img` survive only
  inside comments recording their own deletion.
- `F-FONTS` — the three css2 strings are the Latin set, the Arabic set
  (Cairo + Noto Sans Arabic, 8 pages) and the admin CMS. Not drift.

**FIXED 2026-09-20 (7):** C-ZINDEX-DRAWER · C-STICKY-HAS · C-HERO-CTA-CLIP ·
C-GRID-FLOOR · E-RADIUS-PILL (fallback half) · E-RIBBON · G-FG-IMAGES

**STILL OPEN — deliberate visual passes, not mechanical (5):**

| Item | Measured today | Why it is being held |
|---|---|---|
| E-TYPE-SCALE | 243 raw font-sizes vs 27 `--fs-*` uses | Snapping off-scale sizes changes rendering on every page |
| E-ELEVATION | 80 bespoke shadows vs 7 `--elev-*` uses | Same — a deliberate design pass |
| E-RADIUS-OFFSCALE | 12 off-token radii | Visual snap, needs an eye on the result |
| E-SPACING | off-scale 18/22/28/36/70/90px | Visual nudge |
| E-TOUCHMIN | 7 raw `44px` vs 12 token uses | Each must be confirmed a touch target, not a decorative box |

**STILL OPEN — performance, needs tooling or a browser (2):**

| Item | Measured today | Blocker |
|---|---|---|
| F-CSS-BLOCKING | 365 KB / 10,855 lines, render-blocking | Needs real measurement, not reasoning |
| F-THUMBS | 7 homepage trip-card JPEGs | Needs an image-pipeline run |

The five visual items and the two performance items share one blocker: the
Browser pane has been unavailable for this whole run (an MCP name collision
disables every Claude Browser tool for the session), so none of them can be
checked after the change. The fix-list itself calls the E-* group "a
deliberate design pass, not blind replace" — doing it blind would be the
opposite of that.
