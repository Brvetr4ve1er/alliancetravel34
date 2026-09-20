# Production Audit — Bug Hunt & Interactions

**Project:** Alliance Travel (trilingual vanilla static multi-page site)
**Dimension:** Bug hunt & interactions
**Date:** 2026-07-03
**Method:** Static read of HTML/CSS/JS + live browser drive (Playwright) against a local static server, resize/theme/nav interaction testing, contrast measurement, JSON-LD validation.

All findings cite real `file:line` locations opened during the audit. Severity/confidence/regression-risk assigned per finding. Screenshots referenced were captured live and then removed (test artifacts); the observations are recorded below.

---

## Executive summary

The three client-reported issues are all confirmed and root-caused:

1. **Dead / duplicate nav controls (KNOWN ISSUE #1)** — three distinct problems converge:
   - `.nav-drawer__close` (X button) is created in JS (`enhance.js:458-476`) but has **zero CSS**. Because `.nav-drawer` is `display:contents` at desktop, this bare X **renders as a stray black icon in the desktop nav bar on every page**, and at mobile it duplicates the hamburger's own close (X) toggle.
   - The **visa page** nav CTA uses `class="btn btn--primary btn--wa"` instead of `.nav-cta`, so it is **never hidden on mobile and never moved into the drawer** — leaving a redundant green WhatsApp pill crammed into the top bar next to the logo + hamburger.

2. **Mobile breaks on resize (KNOWN ISSUE #2)** — the nav-drawer system activates at `max-width:900px` while the floating-pill nav hides `.nav-links` only at `max-width:768px`, and four separate un-media-queried `.site-nav`/`.nav-links`/`.nav-cta` rule blocks (L529, L3749, L3974, L4121) fight each other. The homepage survives because controls are moved into the drawer, but the mismatched breakpoints + the visa page's non-`.nav-cta` button are the visible "breaks on resize" symptom.

3. **Invisible text on theme toggle (KNOWN ISSUE #3)** — `.aurora-hero__amount { color:#fff }` (`styles.css:9415`) sits on the glass offer bar (`--bg-glass`), which flips to near-white cream (`rgba(251,248,241,.82)`) in light mode → **white hero price on cream = invisible** on all 7 trip pages. Measured contrast 1.06:1.

Additional bugs found: JS-injected sections (value-props, trust-strip, press-strip) are hardcoded French and never translate; the booking-form empty-state relies on `data-i18n-en/-ar` attributes that i18n.js never reads; the nav drawer ignores the `--z-drawer`/`--z-backdrop` design tokens and hardcodes lower z-indexes, letting the nav pill and sticky bars stack over an open drawer; a duplicate raw (non-throttled) scroll listener in `calculator.js`.

No invalid JSON-LD, no broken same-page anchors, no missing hero images were found.

---

## Findings

### BUG-01 — Dead `.nav-drawer__close` button renders as a stray X in the desktop nav (CRITICAL)
**Locations:** `site/assets/js/enhance.js:458-476`, `site/assets/js/enhance.js:508`, `site/assets/css/styles.css` (no rule exists)

`initNavDrawer()` builds a `.nav-drawer__close` button and `insertBefore(...drawer.firstChild)`. There is **no CSS anywhere** for `.nav-drawer__close` (grep of styles.css returns nothing). Live check: `position:static`, transparent background, `44×44px`. Because `.nav-drawer { display:contents }` at ≥901px, the button's `<svg class="icon-close">` is laid out inline in the nav row — a **bare black X appears right after the "Alliance" logo on every page at desktop width** (visually confirmed on the egypte page). At mobile, when the drawer is open, the hamburger already swaps to its own close (X) via `.site-nav.nav-open .nav-hamburger .icon-close { display:block }` (`styles.css:634-636`), so this second X is redundant.

**Fix:** This is exactly the "close button + close icon that serve no purpose" the client flagged. Simplest correct fix: delete the `.nav-drawer__close` creation block (`enhance.js:458-476`) and its listener (`enhance.js:508`) — the hamburger + backdrop-click + Esc already close the drawer. If a keyboard-focusable in-drawer close is desired for a11y, instead add a scoped CSS rule that shows it **only** inside `@media (max-width:900px)` and position it absolute top-inline-end, so it never leaks to desktop.
**Regression risk:** low (removal only; three other close affordances remain).

---

### BUG-02 — Visa page nav CTA uses `.btn--wa` not `.nav-cta`: duplicate WhatsApp button, not hidden/moved on mobile (HIGH)
**Locations:** `site/rendez-vous-visa/index.html:180`, `site/assets/js/enhance.js:445`, `site/assets/css/styles.css:728-731`

Every other page's nav CTA is `class="nav-cta"`. The visa page uses `class="btn btn--primary btn--wa"`. Consequences:
- The mobile rule `.site-nav > .nav-cta { display:none }` (`styles.css:731`) does **not** match it → it stays visible in the top bar at mobile.
- `initNavDrawer()` only moves `.nav-cta` into the drawer (`enhance.js:445`) → it is **not** relocated.

Live check at 600px: the button is a direct child of `.site-nav`, visible (165px wide). Visually confirmed: a large green "WhatsApp" pill sits between the logo and the hamburger, crowding both, and duplicates the hero's own WhatsApp CTA ("Message an advisor"). This is the client's "duplicate WhatsApp CTA button.btn--wa".

**Fix:** Change the visa nav CTA to `class="nav-cta"` (keep the WhatsApp href/label). It will then be hidden on mobile and moved into the drawer like every other page. (The in-content `.btn--wa` CTAs elsewhere on the visa page are legitimate and should stay.)
**Regression risk:** low (aligns visa nav with the 11 other pages).

---

### BUG-03 — Invisible hero price in light mode: `.aurora-hero__amount{color:#fff}` on light glass bar (HIGH)
**Locations:** `site/assets/css/styles.css:9415`, token `styles.css:475` (`--bg-glass: rgba(251,248,241,.82)`)

`.aurora-hero__amount` (the "169 000 DA" hero price) is hardcoded `color:#fff` with no `[data-theme="light"]` override. It sits inside `.aurora-hero__offer { background: var(--bg-glass) }`. In dark mode `--bg-glass` is dark (`rgba(20,26,36,.72)`) so white reads; in light mode it becomes near-white cream, so the white price becomes invisible. Measured contrast **1.06:1**. Affects all 7 trip pages (egypte, istanbul, azerbaidjan, kuala-lumpur, tunisie, bali, vietnam — all use `aurora-hero`).

**Fix:** Add `:root[data-theme="light"] .aurora-hero__amount { color: var(--txt-1); }` (or a navy token). Consider the same for `.aurora-hero__from`/`.aurora-hero__unit` which are `--txt-2` (OK) but verify against the glass fill.
**Regression risk:** none (additive light-mode override).

---

### BUG-04 — Aurora hero subtitle `<em>` uses `--txt-1` (navy) over a dark photo in light mode (MEDIUM)
**Locations:** `site/assets/css/styles.css:9398` (`.aurora-hero__title em { color: var(--txt-1) }`)

The subtitle line (e.g. "Red Sea & Pyramids · 5 programmes") uses `color: var(--txt-1)`, which in light mode is navy `rgb(0,44,81)`. It renders over the dark portion of the hero photo backdrop → measured contrast ~1.35:1 (dark-on-dark). Its `text-shadow:0 1px 12px rgba(0,0,0,.6)` is a *dark* glow, which helps only on light text — it does not rescue navy text. Because the hero is a photo (not a theme surface), the subtitle should stay light in both themes like `.aurora-hero__title` (which correctly hardcodes `#fff` + shadow).

**Fix:** Set `.aurora-hero__title em { color:#fff }` (or a `--hero-fg` token) regardless of theme, matching the title, and keep the existing dark text-shadow. Do the same audit for `.aurora-hero__date` / `.aurora-hero__from` / `.aurora-hero__unit` which use `--txt-2` over the photo.
**Regression risk:** low (hero text is always over a photo; light text + shadow is the safe default).

---

### BUG-05 — Mismatched nav breakpoints (768px vs 900px) + 4 competing `.site-nav` rule blocks (HIGH)
**Locations:** `styles.css:602` (drawer `@media max-width:900px`), `enhance.js:532` (`innerWidth > 900`), `styles.css:3773-3777` (`@media max-width:768px` hides `.nav-links`), `styles.css:4081-4099` (`@media max-width:768px` pill), plus un-media-queried `.site-nav` blocks at `styles.css:529, 3749, 3974, 4121`

The drawer/hamburger system is gated at `max-width:900px`, but the floating-pill nav only collapses `.nav-links` at `max-width:768px`. Four separate `.site-nav` definitions (grid at 3749, flex-pill `!important` at 3974, logo-left overrides at 4121) with layered `!important` fight for the same selectors; the drawer's in-drawer rules need `!important` (L681-709) specifically to beat the later `.site-nav .nav-links` descendant rules that still match after JS moves links into the drawer. This fragile stack is the root of "mobile breaks when I resize." The homepage happens to survive (controls moved into drawer), but any page whose nav CTA is not `.nav-cta` (see BUG-02) or any future markup change will break in the 769–900px band.

**Fix (refine, do not redesign):** Unify the nav collapse breakpoint. Change the pill/`.nav-links` collapse from `768px` to `900px` (matching the drawer + `enhance.js`), so there is a single mobile threshold. Longer term, consolidate the four `.site-nav` blocks into one; short term, aligning the breakpoints removes the dead band.
**Regression risk:** medium (touches nav layout across all pages; test the 760–920px range on every page and both themes).

---

### BUG-06 — JS-injected sections are hardcoded French — never translate to EN/AR (MEDIUM)
**Locations:** `enhance.js:990-1024` (`initValueProps`), `enhance.js:740-770` (`initTrustStrip`), `enhance.js:962-987` (`initPressStrip`)

These homepage sections are created in JS with hardcoded French strings and **no `data-i18n` keys**. Live check in EN mode surfaced leaked French: "Guides francophones locaux", "Vol, hôtel & visa inclus", "Petits groupes pour une expérience humaine et personnalisée…", "Des accompagnateurs qui parlent votre langue…", plus the trust-strip ("4,9 / 5 · 320 voyageurs", "Tout inclus — vol, hôtel, excursions", "Annulation flexible"). Since they carry no keys and are injected after i18n's baseline capture, the switcher cannot localize them.

**Fix:** Add `data-i18n` keys to each injected string and register EN/AR translations in `i18n.js` (or the homepage `AL_PAGE_I18N`), then call the i18n re-translate after injection — or inject the already-resolved string for the current `document.documentElement.lang`.
**Regression risk:** low.

---

### BUG-07 — Booking-form empty-state relies on `data-i18n-en/-ar` attributes that i18n.js never reads (MEDIUM)
**Locations:** `site/assets/js/booking-form.js:654-658`, `site/assets/js/i18n.js:1074-1098`

The empty-state uses `data-i18n="booking.empty_state"` with `data-i18n-en` / `data-i18n-ar` fallback attributes. But `i18n.js` `translate()` only resolves `data-i18n` keys via `AL_PAGE_I18N`/global `T` (`i18n.js:1077-1080`); it does **not** read `data-i18n-en`/`data-i18n-ar`. And `booking.empty_state` does **not** exist in `i18n.js` (grep: 0 matches). Result: the booking preview empty-state stays French in EN/AR.

**Fix:** Add a `booking.empty_state` entry to the EN and AR dictionaries in `i18n.js` (the `data-i18n` key will then resolve). Remove the misleading `data-i18n-en/-ar` attributes or teach `translate()` to honor them.
**Regression risk:** low.

---

### BUG-08 — Nav drawer ignores `--z-drawer`/`--z-backdrop` tokens; nav pill & sticky bars stack over an open drawer (MEDIUM)
**Locations:** `styles.css:628` (hamburger z:120), `styles.css:645` (drawer z:110), `styles.css:739` (backdrop z:105); tokens `styles.css:311-313` (`--z-nav:300, --z-backdrop:350, --z-drawer:400`), sticky bars `--z-sticky:200`

The drawer (110), backdrop (105) and hamburger (120) use hardcoded values **below** the fixed nav pill (`--z-nav:300`) and the sticky bars (`--z-sticky:200`). Live check confirmed `nav z-index 300 > drawer 110`. The drawer avoids the nav visually only via top padding; but any `.trip-sticky-bar` / calculator sticky bar (z:200) will render **over** the open drawer + backdrop, and the fixed nav pill floats above the drawer.

**Fix:** Use the design tokens: backdrop `var(--z-backdrop)` (350), drawer `var(--z-drawer)` (400), and raise the hamburger above the drawer. This puts the open drawer above the nav pill and all sticky bars, matching the token hierarchy that already exists.
**Regression risk:** low (tokens were designed for exactly this).

---

### BUG-09 — Duplicate, non-throttled scroll listener in calculator.js (LOW)
**Locations:** `site/assets/js/calculator.js:585-591` (`initNav`)

`enhance.js` provides a single rAF-throttled scroll coordinator (`onScrollY`), and `enhance.js` already toggles nav state. `calculator.js` `initNav()` adds a **second, raw (un-throttled)** `scroll` listener that fires `nav.classList.toggle('scrolled', …)` on every scroll event on trip pages. Redundant work per scroll tick.

**Fix:** Remove `initNav()`/its listener from `calculator.js` (let `enhance.js` own nav scroll state), or subscribe via the shared coordinator. Verify `.scrolled` is still applied on trip pages after removal.
**Regression risk:** low (confirm the `.scrolled` styling still triggers).

---

### BUG-10 — Hotel-filter empty-state + reset button are hardcoded French with inline onclick (LOW)
**Locations:** `site/assets/js/calculator.js:571` ("Aucun hôtel ne correspond…", "Réinitialiser", `onclick="resetFilters()"`)

The dynamically injected "no hotels match" message and its reset button are hardcoded French and use an inline `onclick` global. Stays French in EN/AR; inline handler couples markup to a global function.

**Fix:** Localize the two strings via i18n and bind the reset with `addEventListener`.
**Regression risk:** none.

---

## Checked and clean (no finding)

- **JSON-LD validity** — all 2–3 blocks on all 11 content pages parse as valid JSON (validated in-browser). No finding.
- **Same-page anchor links** — homepage `a[href^="#"]` all resolve to existing IDs. No broken in-page anchors.
- **Hero images** — every referenced `heroes/` and `heroes-v2/` source (avif/webp/jpg, desktop + mobile) exists on disk. No broken hero images.
- **Admin CMS** — `site/admin/config.yml` exists; Sveltia CMS is CDN-loaded (out of scope for the static site's runtime).
- **Homepage drawer resize** — desktop→mobile and mobile→desktop cycles reconcile correctly (auto-close past 900px, scroll-lock released). The homepage nav itself is robust; the resize symptom is driven by BUG-02/BUG-05.
- **Booking form validation** — required fields, inline errors, file type/size/count guards, toast feedback, WhatsApp/email gating are all well-implemented.

## Notes / low-signal

- Preload warning "resource … hero__cairo-sharm--bg--mobile.webp preloaded but not used" is expected at desktop widths (the mobile `imagesrcset` candidate isn't chosen); the preload markup itself is correct (`egypte/index.html:38-42`). Not a bug.
