# Accessibility & Theme-Contrast Audit — Alliance Travel

Pre-delivery production audit. Dimension: **Accessibility & theme contrast** (WCAG 2.1 AA).
Scope: read-only inspection of `site/**/*.html`, `site/assets/css/styles.css` (9,555 lines), `site/assets/js/*`.
Date: 2026-07-03.

The token system is sound: `:root` (dark, default) and `:root[data-theme="light"]` fully redefine `--bg-*`, `--txt-*`, `--accent`, `--mint`, `--border*`. Contrast failures happen where authors bypassed those tokens with **hardcoded hex/rgb** or reused a **non-flipping brand token** (`--navy`, `--mint`, `--wa-green`) as a text/background pair that only balances in one theme.

---

## KNOWN ISSUE #3 — Light/Dark invisible text (root-caused)

### A11Y-C-01 · `.nav-cta` WhatsApp pill: white text on light mint — invisible in DARK mode (default theme) — HIGH
- `styles.css:575-583` — `.nav-cta { background: var(--mint); color: #fff; }`
- In dark theme `--mint = #9ce8b2` (light mint). `#fff` on `#9ce8b2` ≈ **1.4:1** → fails AA (needs 4.5:1).
- Light mode is *rescued* by `styles.css:3885-3888` (`:root[data-theme="light"] .nav-cta { color:#fff !important }` on `--mint = #237a4a`, ≈ 4.9:1 ✓) — but the **dark base was never fixed**, so the label is unreadable in the site's default theme.
- Fix: change base to `color: var(--navy)` (navy `#002c51` on light mint ≈ 6.5:1 ✓), matching `.btn--primary`. Then the light `!important` override at 3887 can stay (navy→white flip) or be simplified.

### A11Y-C-02 · `.trip-card__cta` / `.related-card__flag` / `.related-card__cta` inline hardcoded accent hex — fail on WHITE cards in light mode — HIGH
Inline `style="color:#…"` overrides the token color; the containing card (`.related-card { background: var(--bg-card) }`, `styles.css:3176`) flips to `#ffffff` in light mode, but the hex text does not.
- `index.html:470,522,575,627,679,731,783` — trip-card CTAs `#C9872E #3AAFAF #5B9EC9 #4CAF82 #19B5B0 #D98E48 #15A88E`
- `voyages/index.html:111,129,147,165,183,201,219`
- `egypte/index.html:1505,1508,1526,1529`; `azerbaidjan/index.html:710,713,732,735`
- `istanbul/index.html:730,733,753,756`; `cairo-sharm/index.html:1005,1008,1026,1029`
- `tunisie/index.html:788,791,810,813`; `bali/index.html:751,754,773,776`
- `vietnam/index.html:756,759,778,781`; `kuala-lumpur/index.html:701,704,723,726`
- On white the worst offenders drop to ≈ 2.4–2.8:1 (`#28B4D4` ≈ 2.4:1, `#3AAFAF` ≈ 2.6:1, `#19B5B0` ≈ 2.7:1, `#5B9EC9` ≈ 2.8:1) → fail AA. Trip-card CTAs sit on a permanently-dark photo/art tile so they are safer; **`.related-card` flag/cta are the real failure** (regular card surface).
- Fix: drop the inline hex on `.related-card__*`; let them inherit `var(--txt-3)` / `var(--accent)` (both AA-tuned per theme). If per-region tint is desired, gate it with a `[data-theme="light"]` darker variant like the hotel-ribbon pattern at `styles.css:8148-8151`.

### A11Y-C-03 · `.u-noscript-card` / `.u-noscript-msg` near-white text on near-white card in light mode — MEDIUM
- `styles.css:263-265` — `background: rgba(255,255,255,.04); color:#fbf8f1;` and `.u-noscript-msg { color:#c9cdd4; }`
- Built for dark. In light mode the page bg is cream `#fbf8f1`; the 4%-white card stays ~cream and `#fbf8f1`/`#c9cdd4` text is **light-on-light, effectively invisible** (< 1.3:1).
- Only shown with JS disabled (noscript booking fallback on 5 region pages), hence MEDIUM.
- Fix: use tokens — `background: var(--bg-card); color: var(--txt-1);` and `.u-noscript-msg { color: var(--txt-2); }`.

### A11Y-C-04 · `.trip-card__share:hover` — white icon on light mint, invisible on hover in DARK mode — MEDIUM
- `styles.css:3388-3392` and reinforced `styles.css:4166-4173` (`color:#ffffff !important` base + `background: var(--mint) !important` on hover).
- Dark `--mint = #9ce8b2`; white glyph ≈ 1.4:1 on hover → icon disappears. Transient/icon-only, so MEDIUM.
- Fix: hover `color: var(--navy)` (icon uses currentColor).

### A11Y-C-05 · `.btn--wa` white text on WhatsApp green below AA — LOW/MEDIUM
- `styles.css:1603-1605` — `background: var(--wa-green) (#25D366); color:#fff;` ≈ **2.1:1** (both themes; brand green is immutable).
- Note the *sibling* pattern `styles.css:9014` (`.phone-card__btn--wa`) correctly uses `color:#052e16` (dark green) on the same green — AA-safe. Inconsistent.
- Fix: switch `.btn--wa` to `color:#052e16` to match the phone-card button (and WhatsApp's own on-green text convention).

### Non-issues verified (documented so they are not "re-fixed")
- `.btn--primary` navy-on-mint: navy `#002c51` is fixed in both themes; on light mint ≈ 6.5:1 ✓ (dark), and light mode forces white via `styles.css:3887` on dark-green mint ≈ 4.9:1 ✓.
- `.hotel-card__ribbon` `#5b9eC9/#5cc4c1/#d8a653` (`styles.css:8144-8146`) **do** have `[data-theme="light"]` overrides at `8148-8151` ✓. (An older, un-overridden duplicate exists at `styles.css:1046-1051` — see A11Y-DEAD-01.)
- `.bf-field-err`, `.req`, `.bf-validation-banner` red `#d04444/#c43d3d` — mid-red readable on both cream and dark; banner has a light override at `7496-7498` ✓.
- Lightbox/map overlay `rgba(255,255,255,…)` text sits on its own dark scrim ✓.
- Print rules `#111 !important` (`3441-3513`) are `@media print` only ✓.

---

## KNOWN ISSUE #1 — Dead / duplicate nav controls (root-caused)

### A11Y-NAV-01 · TWO close affordances in the drawer (hamburger-turns-X **and** a separate `.nav-drawer__close`) — MEDIUM
- The hamburger swaps its own icon to an X when open: `styles.css:634-636` (`.nav-open .nav-hamburger .icon-close { display:block }`), markup injected at `enhance.js:423-427`.
- A **second** dedicated close button `.nav-drawer__close` (another X) is injected at `enhance.js:458-476` and prepended as the drawer's first child.
- Result: users see two X's (top-corner hamburger-X + in-drawer X). This is the client's "nav-drawer close button + a close icon that serve no purpose."
- Fix: keep ONE. Recommend removing the redundant `.nav-drawer__close` block (`enhance.js:458-476`, `508`) and rely on the hamburger-X, OR vice-versa — but not both.

### A11Y-NAV-02 · `.nav-drawer__close` is completely unstyled (no CSS rule anywhere) — MEDIUM
- `enhance.js:458-476` creates it with only inline `width/height:var(--touch-min)`. Grep confirms **no `.nav-drawer__close` selector exists** in `styles.css`.
- It therefore renders as a bare 44×44 button in the drawer's flex flow (no positioning, no top-inline-end placement its own comment promises).

### A11Y-NAV-03 · Redundant WhatsApp CTAs on the visa page — LOW
- `rendez-vous-visa/index.html` has a WA button in the hero (`:198`), a WA sticky-bar button (`:589`), plus `.nav-cta` (`:180`), plus the JS-injected floating FAB (`enhance.js:701`) — 4 concurrent WA entry points. Trip pages additionally carry a final-CTA `.btn--wa` (`egypte:1547`, `istanbul:771`, etc.) plus the injected FAB and sticky inquiry bar (`enhance.js:773-812`). The client's "duplicate `button.btn--wa`" maps here.
- Not an a11y failure per se, but redundant landmarks/labels add screen-reader noise. Consolidate.

---

## KNOWN ISSUE #2 — Mobile nav breaks on resize (root-caused)

### A11Y-NAV-04 · `.nav-drawer__close` X **leaks into the desktop nav bar** after JS runs — HIGH
- `styles.css:599` — `.nav-drawer { display: contents; }` at desktop dissolves the drawer box so its children join the `.site-nav` flex row. That is intended for `.nav-links/.lang-switcher/.theme-toggle/.nav-cta` (moved in at `enhance.js:445-448`).
- BUT the injected `.nav-drawer__close` button (`enhance.js:475`) is also a drawer child and has **no desktop-hiding rule** → on wide viewports (or after resizing a mobile drawer wide) a stray X icon appears in the desktop header. This is a visible "mobile breaks on resize" regression and doubles as the "close icon serves no purpose" report.
- Fix: add `.nav-drawer__close { display:none } … @media(max-width:900px){ .nav-drawer__close{display:grid} }`, or (preferred) remove the button per A11Y-NAV-01.

### A11Y-NAV-05 · Resize handler is off-by-one with the CSS breakpoint — LOW
- `enhance.js:532` closes the open drawer only when `window.innerWidth > 900`; the mobile CSS is `@media (max-width: 900px)` (`styles.css:602`), i.e. active *at* 900. At exactly 900px the mobile layout applies but the auto-close won't fire. Minor.
- Fix: use `>= 901` or align both to the same boundary.

### A11Y-NAV-06 · Drawer is `role="dialog" aria-modal="true"` but has NO focus trap — MEDIUM
- `enhance.js:437-438` sets modal semantics and moves focus to the first item on open (`:498-499`) and back to the hamburger on close (`:501`), and Escape closes (`:510-514`). **But there is no Tab-key trap** — Tab escapes the modal to the page behind it, contradicting `aria-modal="true"`. Background is also not `inert`/`aria-hidden`, so SR users can read hidden page content.
- Fix: add a keydown Tab/Shift+Tab cycle within `drawer.querySelectorAll(focusableSelector)`, or set `inert` on `<main>`/siblings while open.

---

## General accessibility findings

### A11Y-GEN-01 · Theme-toggle never exposes state (`aria-pressed`) — LOW
- Button markup (`index.html:259-262`) has a static `aria-label="Changer de thème"`; the handler (`enhance.js:100-111`) flips `data-theme` but never sets `aria-pressed`/updates the label. SR users can't tell current theme.
- Fix: `btn.setAttribute('aria-pressed', isLight ? 'true':'false')` in the toggle handler; consider announcing via the existing i18n live region.

### A11Y-DEAD-01 · Dead duplicate hotel-ribbon color block (no light override, un-flipping) — LOW
- `styles.css:1046-1052` — older `.hotel-card__ribbon.economique{#8AB4F8}` / `.medium{#8BD5CA}` with **no** `[data-theme="light"]` variant. Superseded by the later, properly-overridden block at `8144-8151` (same specificity, later cascade wins). Harmless today but is stale debt and a light-mode trap if the later block is ever edited.
- Fix: delete `styles.css:1046-1052`.

---

## Positives (no action)
- One `<h1>` per page; heading order sequential (verified egypte h1→h2→h3→h4).
- All `<img>` carry `alt` (decorative use `alt=""` correctly).
- Contact form uses explicit `<label for>` bindings (`index.html:941-965`); booking inputs have focus box-shadow when `outline` is removed.
- Global visible focus ring `:focus-visible { outline: 2px solid var(--mint) }` (`styles.css:3610`); skip-link present and themed.
- Language switcher: `role=group`, `aria-label`, `aria-pressed`, polite live region (`i18n.js:1107-1157`); RTL via `html.dir='rtl'` for Arabic (`i18n.js:984`).
- Admin page is a third-party Sveltia CMS shell with `noindex` — out of scope.
