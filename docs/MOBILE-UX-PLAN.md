# Alliance Travel — Mobile UX Improvement Plan

_Synthesized 2026-06-20 · branch `refactor/trim-v26` · scope: mobile-first FR/EN/AR (Arabic RTL) static site, Android-skewed Algerian audience on metered data._

---

## 1. Executive summary

The site is already well past the baseline: it has a real 8px spacing scale (`--space-1..--space-10`), a fluid `clamp()` type scale (`--fs-caption..--fs-display-1`), a `--touch-min:44px` token enforced through a `@media (pointer:coarse)` block, RTL numeric isolation done correctly (`unicode-bidi:isolate` on ~30 numeric surfaces), date-aware past-due chip filtering, `inputmode`/`type=tel`/persistent labels on the booking form, and safe-area handling on the sticky bar. These are strengths to **keep**, not re-litigate.

The remaining mobile gaps cluster in five areas:

1. **Conversion-feedback loop is broken on the calculator.** On ≤1024px the itemized `.breakdown` (with its own "Continuer" CTA) stacks *below* the entire form, so the running total a user just changed is off-screen. The `.sticky-total` bar mirrors the number but its button says a generic "Réserver" with **no price echoed**, and — critically — it fires `openWhatsApp()` whose message body is **hardcoded French** regardless of UI language. This is the single highest-intent action on the site sending the wrong-language message to 2 of 3 audiences.
2. **The trip-page scroll-hero gates the value proposition** behind ~1.5 viewport-heights of GPU scrubbing, with a sub-44px "skip" escape hatch.
3. **Form-control alignment & density.** The room-type `.segmented` control resolves (via a late duplicate at L7369) to a left-floating content-width pill, inconsistent with the full-width fields around it; date chips and traveller steppers are vertically heavy and tightly packed.
4. **Heavy chrome cost on mid/low-end Android.** Brutalist hotel cards (3px border + 8px hard shadow + rotated corner) and a render-blocking Google-Fonts fetch (DM Sans on every page; full Cairo+Tajawal 2-family/9-weight for AR).
5. **RTL polish.** No blanket `letter-spacing:0` for Arabic, so Latin-tuned tracking on display/eyebrow/button type leaks onto joined Arabic script.

The fixes below are expressed **only** in existing tokens/selectors. The "Recommended first wave" at the end is the ~8 highest-leverage P0/P1 items.

> **Audit correction:** The audit states the sticky bar "routes to #booking." It does not — `calculator.js:202` wires `sticky-cta-btn` to `this.openWhatsApp()`, opening WhatsApp directly. That makes the French-only/`no-price-label` problem on that button **more** urgent, not less.

---

## 2. Prioritized plan (P0 must-fix · P1 high-value · P2 polish)

Effort key: **S** ≈ <30 min one-selector / one-string · **M** ≈ multi-selector or JS branch · **L** ≈ cross-file refactor + per-page QA.

### Calculator (core conversion surface)

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P0** | `openWhatsApp()` (`calculator.js` ~L411-427) hardcodes the entire message in French — labels (`Hôtel choisi`, `Date de départ`, `Chambre`, `adulte(s)`, `Total estimé`, `Merci!`). AR/EN users who switched language still send French. This is the checkout. | Branch the template on `document.documentElement.lang` (or `window.alGetLang()`); provide `fr`/`en`/`ar` label sets. Keep Western digits + the `fmt()` (`Intl.NumberFormat('fr-DZ')`) price. Wrap each emitted number run so RTL clients keep digit order. | Calculator / WhatsApp CTA | M |
| **P0** | Sticky CTA button label is generic `Réserver` with no value. The live total sits *only* in `.sticky-total__amount`; the button beside it carries no price. Best practice = value-bearing CTA copy. | Have `render()` (which already writes `this.el.stickyTotal`, `calculator.js:340`) also set `#sticky-cta-btn` text to a localized `Réserver · {fmt(totalDA)}`. Reuse the same per-lang strings from the P0 above. No new tokens. | Calculator / sticky bar | S |
| **P1** | At ≤1024px (`styles.css:2184` + dup `:7637`) `.calc-grid`→1col and `.breakdown`→`position:static`, so the itemized total + recap "Continuer" CTA land ~4 form-groups below the controls. Feedback loop broken. | Add a ≤640px order rule so `.breakdown` paints directly under the date/room controls: on `.calc-grid` set the breakdown's `order` ahead of the lower stepper/extras groups (grid `order`), OR move the running-total summary up. Tighten the stacked gap with the existing `--space-4` already applied to `.calc-form` at ≤640px (`:2292`). | Calculator | M |
| **P1** | Sticky bar shows the number but no breakdown; tapping it leaves the page (opens WA) with no chance to review line items the desktop recap shows. | Make `.sticky-total` tappable to expand a mini-breakdown sheet (reuse `breakdown__line` markup already produced in `render()` L321-325) before the WA hand-off; keep height ≥ `--sticky-bar-h` (68px, already > the 56px floor). | Calculator / sticky bar | M |
| **P2** | WhatsApp message collapses children to `Enfants/Bébés : N` and omits enabled **extras** + the **USD-payable-on-site** amount the on-page breakdown shows (`render()` surfaces `+ N USD payable sur place`). Recreates "hidden cost revealed late" over chat. | In `openWhatsApp()` iterate the same `lines[]` `calculate()` returns (incl. per-extra + `currency==='USD'` rows) so the message mirrors the breakdown line-for-line, flagging USD-on-site separately. | Calculator / WhatsApp CTA | M |
| **P2** | Four `.stepper-item` rows (`:1324`, `padding:var(--s3) 0`) each carry a 2-line `.75rem` `--txt-3` helper `p`, stretching the form and pushing the total further down. | On ≤640px tighten `.stepper-item` padding `--s3`→`--space-2`, lift `.stepper-item__info p` (`:1341`) `--txt-3`→`--txt-2` to match the `.calc-form-label` uplift already shipped. Keeps the 44px buttons (`:7657`). | Calculator | S |

### Hero

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P1** | Trip-page `.scroll-hero__scrub` is `150vh/dvh` on mobile (`:8000`); H1/price/CTAs in `.scroll-hero__continuation` only fade in over the last 30% (`opacity:calc(max(0,var(--p)-0.7)/0.3)`, `:7941`). Visitor scrolls ~1.5 screens of GPU scrubbing before the offer is readable. | Shorten the mobile runway to ~`110-120vh/dvh` and start the reveal earlier (lower the `0.7` threshold toward `~0.55`) so the headline arrives sooner. | Hero (trip pages) | M |
| **P1** | `.scroll-hero__skip` escape pill is `padding:5px 10px` at ≤768px (`:8020`) ≈ 27px tall — under `--touch-min`. The one control that bypasses the animation isn't a real tap target. | At ≤768px give `.scroll-hero__skip` `min-height:var(--touch-min)` and pad with `var(--space-2) var(--space-3)`; keep bottom/right at `var(--space-3)`. | Hero (trip pages) | S |
| **P2** | Homepage `.home-hero__inner` (`index.html:139`, inline) keeps `padding:140px … var(--s12)` (128px bottom) at ALL widths — only the grid collapses at ≤1024px (`:213`). On 360×640 that's ~42% of the viewport as empty chrome before the H1. The trip hero already got a reclamation rule (`styles.css:2226`). | Add a ≤768px rule mirroring `.hero__inner`: `padding: calc(var(--nav-h) + var(--space-5)) var(--container-x) var(--section-y)` so headline + CTAs sit higher. | Hero (homepage) | S |

### Hotel cards

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P2** | `.hotel-card` shell (`:8698`) is `3px` border + `8px 8px 0` hard shadow + 64px rotated `::before` corner. Stacked full-width on a phone (`:2240` forces 1col at ≤768px), comparing 6 hotels is a heavy, tall scroll. | At ≤640px reduce `box-shadow` `8px`→`4px` offset and `border` `3px`→`2px` so cards read lighter/shorter; keep the mint selected-ring (`.hotel-card.selected`) for affordance. | Hotel cards | S |
| **P2** | `.hotel-grid` is `auto-fill,minmax(300px,1fr)` (`:1038`), only forced to 1col at ≤768px. In the 600-768px band the 300px floor can strand an orphan/awkward 2-up. | Verify the floor in 600-768px; if it strands, drop `minmax` floor or force 1col earlier. Vertical gap `--s5` is fine. | Hotel cards | S |

### Nav

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P1** | Hamburger trigger lives top-corner (red thumb-zone) and is the **only** affordance to *close* the drawer — there is no explicit X button *inside* `.nav-drawer` itself (`:659`); dismissal relies on the same top-corner hamburger (now showing X) or the backdrop. | Add a `.nav-drawer__close` button at the drawer's top-inline-end, `width/height:var(--touch-min)`, inside the existing `padding:calc(var(--nav-h)+16px)…` zone; wire to the same `setOpen(false)` in `enhance.js`. Reuses the `icon-close` SVG already in markup. | Nav | M |
| **P2** | `.nav-drawer` is `width:min(85vw,360px)` (`:663`); on a 320px phone 85vw = 272px is fine, but the primary nav actions sit in the upper drawer — far from the thumb. | Anchor the drawer's `.nav-cta` (already `margin-top:auto`, `:734`) and lang/theme controls toward the bottom so the high-value WhatsApp CTA lands in the natural thumb zone (already partly true — verify order survives `initNavDrawer()`). | Nav | S |

### Forms

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P1** | The booking form is good (single-column `.bform-field`, persistent labels, `type=tel`+`inputmode=tel`, `type=email`), but the **sticky-total bar** can be covered by the Android keyboard when a calc/booking input is focused, hiding the field. Safe-area is handled (`:2202`) but keyboard overlap is not. | While any `input/textarea` is `:focus`, temporarily un-stick `.sticky-total` (toggle a `body.input-focused` class via JS `focusin/focusout`, set `.sticky-total{position:static}` or `display:none` under it) so the focused field scrolls above it. | Forms / Calculator | M |
| **P2** | Booking-form WhatsApp/email message (`booking-form.js:570`) — confirm it follows the same per-lang branching as the calculator P0 so a switched-language user's submitted summary matches the UI. | Apply the same lang-branch used in calculator `openWhatsApp()`; the empty-state already ships `data-i18n-en/-ar` fallbacks (`:549-551`) — extend that to the live message body. | Forms | M |

### Typography / Density

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P2** | `--fs-body` floor is `0.9375rem` (15px) — a hair under Google's 16px mobile-friendly / Lighthouse "text too small" threshold for body copy; `--fs-caption` floors at 12px (acceptable for captions, not body). | Raise the `--fs-body` clamp floor `0.9375rem`→`1rem` (16px) so body copy never drops below 16px on phones; leave caption/body-sm as-is. One-line token edit. | Typography | S |
| **P2** | Long FR date labels on `.date-chip` wrap to 2-3 rows with only `--s2` (8px) inter-row gap (`:7339`) while chips are 44px tall (coarse rule) → cramped tap cluster on the most important selection. | At ≤640px raise `.date-chips` `gap` `--s2`→`--space-3` (16px) and bump `.date-chip` horizontal padding `14px`→`var(--space-3)` so wrapped rows separate clearly. | Typography / Calculator | S |
| **P2** | `.segmented` resolves to the **late** L7369 rule (`display:inline-flex; padding:3px`), so the room-type control floats left at content width, inconsistent with full-width siblings; `.seg-opt` has no `flex:1` → unequal, ~14px-side hit areas. (The earlier `:1283` `grid 3×1fr` rule is overridden.) | At ≤640px set `.segmented{display:grid;grid-template-columns:repeat(3,1fr);width:100%}` and give `.seg-opt{flex:1}`/full-width so the three options share equal thumb targets aligned to the chips/select; keep the 44px coarse min-height. Cleanest: delete the duplicate L7369 block so the `:1283` grid definition wins. | Typography / Calculator | S |

### RTL / Arabic

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P1** | No blanket Arabic `letter-spacing:0`. Only `.nav-logo` is neutralized (`:10019`). The design system applies tracking (`.04em`-`.18em`) to display/eyebrow/`.btn`/badge type; on joined Arabic this visually breaks the cursive joins — the classic "not really localized" tell. | Add `:root[lang="ar"] *, [dir="rtl"] *{ letter-spacing:0 !important }` (or scope to headings/`.eyebrow`/`.btn`/nav/badges). Also ensure `text-transform:uppercase` eyebrows don't apply under AR (no-op but signals copy-paste). | RTL / Arabic | S |
| **P2** | RTL numeric isolation is correct but maintained as a hand-curated selector list (`:9967-9996`). Any NEW numeric surface added off-list (e.g. the localized WhatsApp summary, a new price chip) can scramble next to Arabic. | For new numeric output, prefer wrapping inline numbers in `<bdi>` / `.num-ltr` in markup (robust default) rather than extending the selector list; audit that the localized WA summary's numbers are wrapped. | RTL / Arabic | M |

### Performance

| Pri | Problem | Concrete fix (tokens / selectors) | Surface | Effort |
|---|---|---|---|---|
| **P1** | `i18n.js ensureArabicFont()` injects `AR_FONT_HREF` = Cairo (5 weights) + Tajawal (4 weights), render-blocking, from `fonts.googleapis.com`. Full Arabic fonts are 300-500KB each; on budget Android/3-4G this can push 1.2s→3.5s. | Self-host a **subset** WOFF2 of Cairo+Tajawal (Arabic + Latin-basic, weights actually used — drop to 400/700 each) with `font-display:swap`; `preconnect`/`preload` only when AR is the active or stored language so FR/EN users never pay for it. | Performance | L |
| **P1** | DM Sans is loaded render-blocking from Google Fonts on **every** page (`<link …css2?family=DM+Sans…>` in each `index.html` head, plus an `@import` at `styles.css:6`) — affects all three locales. | Self-host subset DM Sans WOFF2 with `font-display:swap`; remove the render-blocking `@import` in `styles.css:6` (an `@import` blocks the whole stylesheet). Keep the existing `preconnect` only if a CDN remains. | Performance | M |
| **P2** | Heavy `backdrop-filter` blurs are already capped to 8px at ≤640px (`:148-197`) — good. Confirm the brutalist hotel-card corner triangle (`::before`/`::after`) and `will-change` on scroll-hero layers aren't compositing more than needed on low-end GPUs. | Audit `will-change:transform,opacity` on `.scroll-hero__bg/__media/__title`; drop `will-change` once `--p` settles (JS can toggle it) to free GPU memory on mid/low-end devices. | Performance | M |

---

## 3. Recommended first wave (highest leverage)

Ship these ~8 first — they touch the highest-intent surface (the WhatsApp checkout) and the most-visible mid-range-Android pain, all in existing tokens:

1. **P0 — Localize the calculator WhatsApp message** (`calculator.js openWhatsApp`, branch on `document.documentElement.lang`). Cheapest conversion lift on the most important CTA. _(M)_
2. **P0 — Echo the live price in the sticky CTA label** (`render()` → `#sticky-cta-btn` = localized `Réserver · {fmt(totalDA)}`). _(S)_
3. **P1 — Raise the running total on mobile** so `.breakdown`/total sits directly under the date+room controls at ≤640px via grid `order` (fixes the broken feedback loop). _(M)_
4. **P1 — Make `.scroll-hero__skip` a real 44px target** + shorten the mobile scrub runway (`150vh`→`~115vh`) and reveal the offer earlier. _(S-M)_
5. **P1 — Blanket `letter-spacing:0` for Arabic** (`:root[lang="ar"] *`) — removes the broken-cursive "not localized" tell across all tracked type. _(S)_
6. **P1 — Self-host + subset DM Sans** and drop the render-blocking `@import` at `styles.css:6`; gate the AR Cairo/Tajawal load behind active-language. Direct bounce/LCP win for metered Android. _(M, AR part L)_
7. **P1 — Add an explicit close (X) inside `.nav-drawer`** + keep the primary WhatsApp CTA in the bottom thumb-zone. _(M)_
8. **P2-but-cheap — Fix the room-type `.segmented` to full-width equal thirds** + bump date-chip inter-row `gap` to `--space-3` (delete the duplicate L7369 block). Two small edits that visually de-jank the calculator's middle. _(S)_

All eight respect the design system — no new ad-hoc px where a token (`--space-*`, `--touch-min`, `--sticky-bar-h`, `--fs-*`, `--container-x`, `--section-y`) already exists.
