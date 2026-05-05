# Alliance Travel — Master Design System

> Audited: 2026-05-05
>
> ⚠️ **This is the original design blueprint** that shaped the project. Implementation has deliberately diverged from several proposals here — the live site is the source of truth, not this document.
>
> **For current state, prefer:**
> - [COLOR-MAP.md](../COLOR-MAP.md) — actual tokens shipping in `styles.css` (cinematic dark mode primary, mint accent, DM Sans family)
> - [SITEMAP.md](../SITEMAP.md) — actual page structure (homepage + 5 trip pages, current section order)
> - [IMAGE-ASSETS.md](../IMAGE-ASSETS.md) — actual image manifest
>
> **Notable deviations from this blueprint:**
> - Typography: blueprint proposes Fraunces + Inter — **actual** uses **DM Sans only** (single family for cohesion + perf budget; subset hardened in commit `27ae633`)
> - Color: blueprint proposes warm-cream-with-bronze — **actual** is **dark-mode-primary with mint** (Prussian Blue `#002c51` + Teal Deer `#9ce8b2`); light mode is the variant, not the default
> - Imagery: hero is per-region with `image-set()` WebP-first + mobile crops, not "single dominant"
> - Maps: blueprint did not anticipate the homepage **Algeria branches map** or the 5 **trip itinerary maps** added in Phase 1.5
>
> The strategy + UX-logic sections (psychology, conversion triggers, hotel picker, pricing calc) **are still accurate** — those drove the implementation faithfully.

A high-conversion blueprint for a **Bordj Bou Arreridj-based** curated-travel agency selling guided trips to Egypt, Azerbaijan, Türkiye, and Malaysia.

> Pattern: **Trust & Authority + Conversion**
> Mood: **Editorial luxury travel meets fintech transparency**

---

## 1. Strategic Foundation

### 1.1 Target user psychology
The Alliance Travel buyer is a **middle-class Algerian family or couple** planning a once-or-twice-a-year guided trip. They are price-sensitive but **not cheap**: they will pay for safety, smooth logistics, and a "tout est inclus" peace-of-mind formula. They have been burned before — by hidden fees, fake all-inclusive packages, agencies that disappeared after the deposit. They book over WhatsApp, pay via CCP, and decide as a couple/family after comparing 2–3 offers.

### 1.2 Core pain points
1. **Trust** — "Is this agency real? Will my deposit disappear?"
2. **Price confusion** — Triple vs. Double, child tariffs, single supplements, visa, taxes; the *real* total is opaque.
3. **Choice overload** — 7 hotels × 3 dates × 4 room types = 84 combinations, presented as a wall of numbers.
4. **Logistics anxiety** — Visa, transfers, language barriers, what's included.
5. **Decision pressure** — "How do I know I'm not missing a better date/hotel?"

### 1.3 Conversion triggers
- **Transparency** — every dinar accounted for, in a live breakdown.
- **Specificity** — "06 places restantes pour le 19 juin" beats "Last spots!"
- **Authority** — IATA-style markers, Tour Operator license, agency address, real numbers ("Plus de 1.200 voyageurs guidés depuis 2019").
- **Frictionless contact** — WhatsApp deep links, not contact forms.
- **Anchor pricing** — Économique → Médium → Premium → Luxe, with the recommended tier visually emphasized.

---

## 2. Visual System

### 2.1 Why we deviate from the default Bodoni Moda + Jost
The recommended pairing is `Bodoni Moda + Jost` (luxury minimalist). Bodoni's high-contrast modern serif reads as fashion/jewelry, not travel. We swap to **Fraunces (display) + Inter (body)**:

- **Fraunces** has variable optical sizing and a warmer, more editorial feel — closer to *Condé Nast Traveler* than to *Vogue Italia*.
- **Inter** has tabular numerics out of the box — critical for the pricing calculator (no shifting columns when prices update).

### 2.2 Type scale (modular, 1.250 ratio)

| Token       | Size          | Weight | Usage                                  |
|-------------|---------------|--------|----------------------------------------|
| display-xl  | clamp(48,7vw,96)px | 500 | Hero headline                          |
| display-lg  | clamp(36,4.5vw,64)px | 500 | Section eyebrows (Fraunces italic)     |
| h1          | 40px          | 600    | Trip name                              |
| h2          | 32px          | 600    | Section heads                          |
| h3          | 24px          | 600    | Card titles                            |
| body-lg     | 18px / 1.6    | 400    | Lede paragraphs                        |
| body        | 16px / 1.6    | 400    | Default text                           |
| body-sm     | 14px / 1.5    | 400    | Captions, helper text                  |
| label       | 12px / 1      | 600    | Uppercase eyebrows, badge labels       |
| price       | 28–48px       | 600    | Tabular figures with `font-feature-settings: 'tnum'` |

### 2.3 Color tokens

#### Brand (universal, every page)
```
--ink:        #0B1929   /* Deep navy, primary text + dark surfaces */
--canvas:     #FAF7F2   /* Warm cream, page background */
--surface:    #FFFFFF   /* Cards */
--bronze:     #B8865A   /* Signature accent — primary CTA, premium markers */
--bronze-700: #8E6541   /* Hover */
--gold:       #D4A574   /* Highlights, anchor badges */
--sage:       #2E5D4F   /* "Booked / confirmed" affirmative */
--sand:       #E8DDC8   /* Section dividers, soft fills */
--slate:      #475569   /* Secondary text */
--slate-300:  #94A3B8   /* Muted */
--line:       #E5E1D8   /* Dividers, input borders */
--danger:     #B23A3A   /* Errors, scarcity flag */
```

#### Per-trip accent (overrides --accent only)
```
Cairo + Sharm (Egypt):  --accent: #1B7AB8  (Nile blue)
Azerbaijan:             --accent: #0E7C7B  (Caspian teal)
Istanbul:               --accent: #1E5670  (Bosphorus)
Kuala Lumpur:           --accent: #0F7155  (Tropical jade)
Sharm El Sheikh (CZL):  --accent: #0E8AAB  (Red Sea aqua)
```

The accent sits *next to* bronze, never replaces it. Bronze stays the conversion color so muscle memory survives across destinations.

### 2.4 Spacing scale (4 / 8 system)
`4 8 12 16 20 24 32 40 56 72 96 128 160` — exposed as `--s-1` … `--s-13`. Sections vertical: 96–128. Card padding: 24–32. Form gap: 16.

### 2.5 Radius
`6 / 12 / 20 / 32` — small for chips, medium for buttons, large for cards. Hero panel = 32. No fully rounded pills except status badges.

### 2.6 Elevation
Three steps only: `0` (flush), `1` (subtle, `0 1px 0 rgba(11,25,41,.04), 0 4px 12px rgba(11,25,41,.05)`), `2` (sticky calculator and modal: `0 12px 40px rgba(11,25,41,.12)`). No drop-shadow on text. No glassmorphism — it would clash with the editorial seriousness.

### 2.7 Imagery direction
- **No stock-photo cliché** (no smiling-couple-pointing-at-map). Use destination-specific landmarks treated with a desaturated, slightly warm grade.
- Hero image is **single, dominant, muted** — color comes from typography and badges, not the photo.
- Card images use a 4:3 ratio with a subtle inner border (`box-shadow: inset 0 0 0 1px rgba(11,25,41,.06)`).

---

## 3. Information architecture per landing page

```
[ Sticky nav: logo · trips switcher · contact CTA ]

1.  HERO            — Eyebrow / Headline / Lede / Price-from / Two CTAs / Trust strip
2.  TRUST RAIL      — 3 inclusion icons (vol direct, hôtels triés, accompagnement)
3.  HOTEL PICKER    — Tier tabs + filter bar + cards grid + selection sync
4.  PRICING CALC    — Live form left, transparent breakdown right, sticky CTA
5.  ITINERARY       — Day-by-day vertical timeline
6.  PACKAGES        — Good / Better / Best (anchor on Better)
7.  TRUST LAYER     — Stats + testimonials + license/agency facts
8.  FAQ             — Accordion (visa, paiement, check-in, annulation)
9.  FINAL CTA       — Scarcity flag + WhatsApp deep links + agency address
[ Footer ]
```

Each section must do one job. No section repeats a CTA goal — the calculator is the only "build a quote" surface; the final CTA is the only "talk to a human now" surface.

---

## 4. Hotel picker — UX + logic

### 4.1 Layout
- **Tabs** at top: `Toutes` · `Économique` · `Médium` · `Premium` · `Luxe`. Tab triggers an `aria-pressed` filter, no page reload.
- **Filter bar** (collapses to a sheet on mobile): max-price slider (in DA), star rating chips (`4★ 5★`), amenity chips (`Aqua Park`, `Plage privée`, `All Inclusive`, `Ultra All Inclusive`).
- **Cards grid** — 1 col mobile / 2 cols tablet / 3 cols desktop. Each card: 4:3 image with a tier ribbon (Économique / Médium / Premium / Luxe), star count, hotel name in Fraunces, two amenity pills, "À partir de **190.000 DA / pers**" in Inter tnum, primary action "Sélectionner".

### 4.2 States
- **Hover** — card lifts 4px, image scales 1.02 (300ms ease-out), shadow goes from elev-1 to elev-2.
- **Selected** — bronze 2px outer ring, "Sélectionner" becomes "Sélectionné ✓" in sage. The selected hotel ID syncs to the calculator below (smooth scroll + flash highlight on calculator title).
- **Filter no-match** — empty state with "Aucun hôtel ne correspond. Réinitialiser les filtres."

### 4.3 Micro-interactions
- Tier-tab change → cards crossfade (180ms).
- Slider drag → debounced 120ms before re-filter.
- Card image lazy-loads (`loading="lazy"`).
- Keyboard: tier tabs are arrow-navigable, Enter selects, Esc clears.

---

## 5. Pricing calculator — UX + logic

### 5.1 Inputs
| Input              | Control                 | Notes |
|--------------------|-------------------------|-------|
| Date de départ     | Chip group (radio)      | Only the trip's published dates. |
| Hôtel              | Auto-bound from picker  | Editable via dropdown if no selection. |
| Type de chambre    | Segmented (Double/Triple/Single) | Drives base rate. |
| Adultes            | Stepper, min 1 max 8    | "+1 adulte" ≈ 1 berth in current room type. |
| Enfants 6–12 ans   | Stepper, max 4          | First child uses `child1` rate; second uses `child2`. |
| Enfants 2–5 ans    | Stepper, max 4 (Istanbul/SSH only) | Discounted rate where the trip defines one. |
| Bébés (0–2 ans)    | Stepper, max 2          | Flat baby rate, no bed. |
| Suppléments        | Toggle list             | Visa, Musée Égyptien, taxes locales, etc. |

### 5.2 Real-time outputs
The right column shows a **transparent breakdown** that animates in (200ms slide-up + fade) every time a field changes:

```
Tivoli Aqua Park 4★ — Double × 2 adultes        2 × 192.000  =  384.000 DA
1ᵉʳ enfant (2-12 ans), avec lit                            115.000 DA
Bébé (0-2 ans)                                              25.000 DA
                                                           ────────────
Sous-total hébergement + vol                              524.000 DA
Lettre de garantie pour visa (à payer en USD)        ≈ 30 USD à l'arrivée
                                                           ────────────
TOTAL                                                     524.000 DA
```

A subtle "Pourquoi ce prix?" expander reveals the rule (e.g., "Le 1ᵉʳ enfant 2-11.99 ans bénéficie d'un tarif réduit en chambre double avec extra-bed").

### 5.3 Calculation rules

```js
// Pseudocode used by /assets/js/calculator.js
function priceQuote(state, hotel, trip) {
  const room = state.room; // 'double' | 'triple' | 'single'
  const adults = state.adults;
  const lines = [];

  // Adult berths
  const baseRate = hotel.prices[room];
  lines.push({
    label: `${hotel.name} — ${room} × ${adults} adulte(s)`,
    qty: adults,
    unit: baseRate,
    total: adults * baseRate,
  });

  // Children
  state.kids.forEach((kid, idx) => {
    if (kid.age < 2) {
      lines.push({ label: `Bébé`, qty: 1, unit: hotel.prices.baby, total: hotel.prices.baby });
    } else if (idx === 0) {
      lines.push({ label: `1ᵉʳ enfant (2–11.99)`, qty: 1, unit: hotel.prices.child1, total: hotel.prices.child1 });
    } else {
      lines.push({ label: `${idx + 1}ᵉ enfant (2–11.99)`, qty: 1, unit: hotel.prices.child2, total: hotel.prices.child2 });
    }
  });

  // Extras
  state.extras.filter(e => e.checked).forEach(e => {
    lines.push({ label: e.label, qty: 1, unit: e.amount, total: e.amount, currency: e.currency });
  });

  const totalDA = lines.filter(l => l.currency !== 'USD').reduce((s, l) => s + l.total, 0);
  const totalUSD = lines.filter(l => l.currency === 'USD').reduce((s, l) => s + l.total, 0);
  return { lines, totalDA, totalUSD };
}
```

### 5.4 Sticky CTA bar (mobile)
On viewports < 1024px, a bottom-fixed bar shows: `Total 524.000 DA · Réserver` to keep the conversion target visible while users scroll the breakdown.

---

## 6. Conversion analysis (per section)

| Section          | Why it converts                                           | Where users drop                                    | Mitigation                                              |
|------------------|-----------------------------------------------------------|------------------------------------------------------|----------------------------------------------------------|
| Hero             | Specific price-from + named departures = trust + scarcity | "Is this real?" — generic feel                       | Real licence number + agency address + WhatsApp number  |
| Hotel picker     | Removes 84-combo overload via tier-anchored choice        | Decision paralysis on filter bar                     | Default state: tab "Médium" pre-selected (golden middle) |
| Pricing calc     | Transparent breakdown beats hidden surcharges             | Shock at single-supplement                           | Inline tooltip: "Vous voyagez seul? Optimisez en partageant une triple" |
| Itinerary        | Concretizes the experience, kills "what do we actually do?" | Skipped on mobile                                  | Collapse to 3 highlight cards on mobile, "Voir le programme complet" |
| Packages         | Anchor on "Médium" makes Premium feel reasonable          | Confusion if duplicates hotel picker                 | Frame as **bundles** (e.g., "Lune de miel", "Famille 2+2") not raw hotels |
| Trust            | Quantified track record + named testimonials              | Generic "5 stars" stock testimonials read fake       | Use first names + city ("Yacine, Sétif") + dated trip   |
| FAQ              | Pre-empts top 5 objections (visa, CCP, baby, refund, transfer) | Long-scroll fatigue                              | Show first 4 expanded, rest collapsed                   |
| Final CTA        | One decisive verb + scarcity-with-numbers                 | Phone-call friction                                  | WhatsApp deep links open the chat with prefilled message |

---

## 7. Frontend execution

- **No build step.** Vanilla HTML5 + modern CSS (custom properties, `clamp()`, container queries on hotel cards) + ES modules. Runs from `file://` or any static host.
- **Why not React/Next?** The agency team will hand this off to a webmaster; HTML they can edit beats a build pipeline they can't.
- **State** lives in `data-*` attributes and a single `state` object per page; the calculator binds to `input` events and re-renders the breakdown via `requestAnimationFrame`.
- **Accessibility**: skip link, semantic `<main>`/`<section>`/`<nav>`/`<dialog>`, ARIA on tabs and accordion, focus-visible rings everywhere.
- **Performance budget**: < 80kB CSS, < 25kB JS, hero image < 200kB (WebP, `loading="eager" fetchpriority="high"`), other images lazy. CLS target < 0.05 by reserving image dimensions.
- **Responsiveness**: mobile-first, breakpoints 640 / 1024 / 1280. Hotel cards use container queries on `.hotel-grid` so they reflow cleanly inside any container width.

---

## 8. Pre-delivery checklist (every page must pass)

- [ ] No emojis used as structural icons (Lucide SVG inline)
- [ ] All clickable elements have `cursor: pointer` and a visible focus ring
- [ ] Touch targets ≥ 44 × 44 px
- [ ] Body text contrast ≥ 4.5:1 against the chosen surface
- [ ] `prefers-reduced-motion` disables all transitional animations
- [ ] All images declare `width` + `height` or use `aspect-ratio` (no CLS)
- [ ] Tabular figures on every price (`font-variant-numeric: tabular-nums`)
- [ ] Calculator is keyboard-fully-operable
- [ ] WhatsApp / phone CTAs are real `tel:` and `https://wa.me/...` links
- [ ] Mobile sticky total bar appears below 1024px
- [ ] Empty states (filter no-match, calculator zero-pax) exist and are kind
