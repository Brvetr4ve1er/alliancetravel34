# Production Audit — Dead Code & Cruft

**Project:** Alliance Travel (vanilla trilingual static site, deploy target Vercel `outputDirectory=site`)
**Dimension:** Dead code & cruft
**Date:** 2026-07-03
**Mode:** Read-only inspection. No files were modified.

## Method

- Enumerated every page (`site/**/index.html`, `404.html`), every JS module (`site/assets/js/*.js`), and the single shared stylesheet (`site/assets/css/styles.css`, 9,555 lines).
- Cross-referenced **all 594 distinct CSS class tokens** against the combined HTML + JS corpus with a Node script using word-boundary matching, then hand-vetted every candidate to remove false positives caused by:
  - **JS-injected markup** — `enhance.js` builds nav-drawer, toast, FAB, trust-strip, sticky-bar, lightbox, trip-switcher, press-strip at runtime (their classes are absent from HTML but live).
  - **Dynamic class construction** — `toast--${kind}` etc.
  - **Library runtime classes** — `maplibregl-*` injected by the MapLibre CDN bundle.
  - **Defensive `@media print` / `[dir=rtl]` selector lists** — reference classes that may or may not exist by design.
- Diffed every image/font asset basename on disk against references in HTML/CSS/JS/JSON/YAML, with a special guard for the homepage's dynamically-built hero collage slugs (`data-lazy-hero`).
- Every "dead" claim below states **how** it was confirmed unreferenced.

## Severity legend

Severity reflects impact on the production deploy (broken requests > shipped-but-unused bytes > cosmetic cruft). Regression risk reflects how dangerous the *fix* is.

---

## Findings

### DC-01 — `cairo-sharm` loads deleted `scroll-hero.js` (404) and uses a removed hero system  [HIGH]

`site/cairo-sharm/index.html:1149` still has `<script src="../assets/js/scroll-hero.js" defer></script>`, but that file **does not exist** — it was deleted in commit `4e596d7` ("drop dead globe/scroll-hero JS"). Its `.scroll-hero` CSS was likewise removed in `6730984` ("remove 691 lines of dead CSS scroll-hero + globe rules").

The page's hero is built on that dead system: `<section class="scroll-hero" data-region="egypt">` (line 172) + `.scroll-hero__continuation` (line 181). `grep` confirms `.scroll-hero` has **zero** matching rules in `styles.css` (only 4 mentions, all in comments) and the page has **zero** `aurora-hero` markup — unlike the 7 migrated trip pages which replaced scroll-hero with the CSS-only Aurora hero and left only a cleanup comment where the script tag used to be.

**Confirmation:** `ls site/assets/js/scroll-hero.js` → not found; `git log` shows deletion in `4e596d7`; the 7 tracked trip pages carry only a `<!-- scroll-hero.js removed -->` comment at the same spot, cairo-sharm is the lone un-migrated (and git-untracked, `?? site/cairo-sharm/`) page.

**Fix:** Migrate cairo-sharm's hero to the Aurora hero used by the other trip pages, or (minimum) delete the broken `<script>` tag and re-add scroll-hero styles. Do not ship the page with a 404 script request.

---

### DC-02 — Dead hero-parallax JS + its entire `.hero__*` CSS family (superseded design)  [MEDIUM]

`enhance.js` `initHeroMouseParallax()` (defined 359, called in `boot()` at 1064) queries `.hero__visual` and `.hero__visual-art > svg`. **No page contains a `.hero__visual` element** — trip pages use `.aurora-hero*`, the homepage uses `.home-hero*`. The function attaches listeners to an empty NodeList every page load: dead in effect.

The matching CSS is an entire superseded single-hero design that no live markup references (confirmed absent from every `class="…"` attribute in all HTML and from all JS injection):
`.hero__visual`, `.hero__visual-art` (3571, 3580), `.hero__visual-img`, `.hero__bg` (758, 4541, 4747), `.hero__inner` (4770), `.hero__plane`, `.hero__noise`, `.hero__strip`, `.hero__strip-inner`, `.hero__faded-title`, `.hero__dep-card`, `.hero__sub`, `.hero__meta`. (Note `.hero__price`, `.hero__ctas`, `.hero__lede` ARE still used and must be kept; `.hero__bg` occurrences inside the `@media print` block at 3438+ are defensive and harmless.)

**Confirmation:** exact `class="…"` token scan across all HTML = 0 hits for each; JS grep = 0 injection; `.hero__visual` only appears in `enhance.js` selectors + print/RTL defensive lists.

**Fix:** Delete `initHeroMouseParallax()` and its call site (1064), and the dead `.hero__*` rules (outside the print block). Keep `.hero__price/__ctas/__lede`.

---

### DC-03 — Orphaned "v2" foreground hero images (36 files)  [MEDIUM]

`site/assets/images/heroes-v2/` was a 2-layer hero (`--bg` background + `--fg` foreground). Trip pages now reference **only** the `--bg` variants. The `--fg` set for **azerbaidjan, bali, istanbul, kuala-lumpur, tunisie, vietnam** is referenced nowhere (6 slugs × {avif, webp, jpg} × {desktop, --mobile} = **36 files**). Only `hero__cairo-sharm--fg.*` is still referenced (`cairo-sharm/index.html:174`).

**Confirmation:** `grep -o "heroes-v2/hero__…--fg…"` across HTML/CSS/JS returns only the `cairo-sharm` slug; all six other `--fg` slugs have 0 references.

**Fix:** Delete the 36 unreferenced `*--fg*` files under `heroes-v2/`. Zero regression risk (never fetched).

---

### DC-04 — Orphaned hotel images (Constantine-departure "czl" variants)  [LOW]

`hotel__rehana-czl.jpg`, `hotel__rehana-royal-czl.jpg`, `hotel__tivoli-czl.jpg` under `site/assets/images/hotels/` are referenced by **no** HTML/JS (the "czl" = Constantine-departure hotel variants; the live cards use the non-czl images).

**Confirmation:** `grep -rn "czl"` across HTML/JS = 0 hits; basename never appears in the corpus.

**Fix:** Delete the 3 files. Zero regression risk.

---

### DC-05 — Broken internal route: `../sharm-constantine/` (page does not exist)  [MEDIUM]

`site/cairo-sharm/index.html` links to `href="../sharm-constantine/"` (lines 991 and 1091), but there is **no** `site/sharm-constantine/` directory — the route 404s. (Distinct from the `hero__sharm-constantine` image, which is legitimately used as a homepage collage tile via `data-lazy-hero="sharm-constantine"` and must be kept.)

**Confirmation:** `ls site/sharm-constantine/` → not found; the slug appears as a nav/related-card link target with no backing page.

**Fix:** Either create the `sharm-constantine` page or repoint/remove the two links (e.g. to `../egypte/` with the sharm-constantine tier filter, which already exists).

---

### DC-06 — Dead atomic-utility & fluid-typography layer  [MEDIUM]

`styles.css` ships a design-system utility layer (lines ~201–267) where a large subset is used by **no** `class="…"` attribute anywhere. Confirmed dead (0 class-attribute hits in HTML/JS):

- Fluid typography: `.fs-display-2` (203), `.fs-h1` (204), `.fs-h2` (205), `.fs-h4` (207), `.fs-h6` (209) — plus `.fs-display-1`, `.fs-lg`, `.fs-sm` variants. (`.fs-h3`, `.fs-h5`, `.fs-body` ARE used — keep.)
- Grid: `.grid-cards--sm` (217), `.grid-cards--xl` (219). (`.grid-cards`, `.grid-cards--lg` used — keep.)
- Atomic: `.u-block` (223), `.u-mt-1` (228), `.u-mt-sp4` (232), `.u-mb-sp7` (238), `.u-measure-sm` (240), `.u-link-mint` (260), plus `.u-flex`, `.u-center`. (`.u-hidden`, `.u-noscript-*` used — keep.)
- Containers: `.container--narrow` (521), `.container--prose` (522).
- `.section-lg` (526).

**Confirmation:** dedicated Node scan restricted to `class="…"` occurrences; each listed token = 0.

**Fix:** Remove the confirmed-dead individual utilities. Low regression risk (utilities have no side effects), but low individual value — batch as one cleanup. Keep the used members listed above.

---

### DC-07 — Dead calculator / breakdown CSS from an earlier markup iteration  [LOW]

The calculator (`calculator.js`) renders only `.breakdown__line`, `.breakdown__empty`, `.breakdown__divider` (and print uses `.breakdown__total-amount`). These CSS classes are referenced by no HTML/JS: `.calc-cta__price`, `.calc-line__amount`, `.calc-total__amount`, `.breakdown__amount`, `.calc-disclaimer`, `.trip-card__from-amount`.

**Confirmation:** `grep 'class="…calc-…/breakdown__amount…"'` = 0; the actual rendered class list from `calculator.js` was enumerated and does not include any of these.

**Fix:** Delete the dead rules. Low risk.

---

### DC-08 — Duplicate + conflicting `.toast--success` rule  [LOW]

`.toast--success` is defined twice at the **same specificity, both outside media queries**:
- `styles.css:3427–3433` → `border-color: var(--sage)` / svg `color: var(--sage)`
- `styles.css:3705–3706` → `border-color: var(--mint)` / svg `color: var(--mint)`

The later rule wins, so the first block (3427–3433) is fully overridden dead code, and the two disagree on the accent token (`--sage` vs `--mint`).

**Confirmation:** duplicate-selector scan; both are top-level rules; `.toast--success` is live (default `showToast(msg, kind='success')` in `enhance.js:216`, exported as `window.AT_showToast`).

**Fix:** Keep one (the intended `--mint`) and delete the other. Zero visual regression.

Related (not dead code, flagged for the theme/QA lens): `booking-form.js` calls `AT_showToast(msg, 'error')` in 4 places (lines 392, 408, 766, 809) producing `class="toast toast--error"`, but **no `.toast--error` rule exists** — error toasts fall back to base styling. That is a missing-style gap, not dead CSS.

---

### DC-09 — Dead `.photo-strip*` block + no-op lightbox selector  [LOW]

`.photo-strip`, `.photo-strip__item` and descendants (`styles.css` ~5740–5769) are used by no HTML. `.photo-strip` appears only inside the lightbox trigger selector in `enhance.js:832` (`'.hotel-card img, .site-card img, .photo-strip img, …'`), where it matches nothing.

**Confirmation:** 0 `class="…photo-strip…"` in HTML; the only JS mention is that one dead selector fragment. (The injected `.press-strip` is a different, live element — do not confuse the two.)

**Fix:** Delete the `.photo-strip*` rules and drop the `.photo-strip img` fragment from the lightbox selector.

---

### DC-10 — Dead members inside otherwise-live compound selectors  [LOW]

Several classes exist only as non-functional members of grouped selectors whose other members are live, so they are harmless but removable:
- `.dest-card` (8811, 8827) — card-surface + hover groups (siblings live).
- `.dep-badge` (8846) — mint-dim group with live `.amenity-pill`/`.phase-marker`.
- `.nav-logo-img` (3760, 4013, 4091), `.btn__arrow` / `.nav-cta__arrow` (9290–9291, RTL) — comments in the file state these were "deleted", but the tokens survive in compound selectors alongside the live `.nav-logo svg` / `.btn svg` halves.
- Standalone unused: `.badge--limited` (5777), `.book-form button…` (4825, 4844, 4845 — the real form is `.bform-*`), `.testimonial` (singular; live class is `.testimonials-grid`/`.testi-card`).

**Confirmation:** each token = 0 `class="…"` hits; siblings verified live.

**Fix:** Trim the dead members. Low value, batch with DC-06/07.

---

## Client-reported issues touched by this dimension

- **"Nav cleanup — dead close button / close icon / duplicate WhatsApp CTA":** The mobile drawer (`enhance.js:initNavDrawer`) provides **two** close affordances — the hamburger button itself (which swaps to an `.icon-close` X when open, 423–427) **and** a separate injected `.nav-drawer__close` button (453–476). That redundancy matches the client's "close button + close icon that serve no purpose." Not dead code per se (both are wired), but a genuine duplicate control worth consolidating. The static nav `.nav-cta` WhatsApp button coexists with the JS-injected `.fab-whatsapp` FAB — the likely "duplicate WhatsApp CTA." (Full root-cause belongs to the nav/UX lens; noted here because it overlaps the "duplicate controls" brief.)

## What is NOT dead (verified, to prevent false removals)

- `hero-collage-lazy.js` — live; homepage has 4 `data-lazy-hero` pictures and AVIF/WebP/JPG assets exist.
- `map-base.js` / `trip-map.js` / `algeria-map.js` / `visa-map.js` — each loaded by its page(s); `maplibregl-*` classes are library runtime, not dead.
- `sw.js`, `site.webmanifest` — both present; SW registration is guarded to https/non-localhost.
- Only **7 `console.warn`** calls exist across all JS (legitimate error handling); no `console.log`/debug noise.
- No large commented-out code blocks in JS.
- `.press-strip`, `.trust-strip`, `.trip-sticky-bar`, `.lightbox*`, `.trip-switcher*`, `.fab-whatsapp*`, `.nav-drawer*`, `.nav-hamburger`, `.toast` — all injected by `enhance.js`; "absent from HTML" is expected.
