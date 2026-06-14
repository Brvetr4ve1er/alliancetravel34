# Trip Data Schema — Alliance Travel

One JSON file per trip, under `data/trips/<slug>.json`. This document defines every
editable field needed for a generator to reproduce a trip page byte-for-equivalent.

Reference instance: [`cairo-sharm.json`](./cairo-sharm.json) — the most complete page
(7 hotels, split itinerary, extras). Structural deltas of the other 4 pages are in
[`_VARIATIONS.md`](./_VARIATIONS.md).

**Conventions used below**
- *per-page* = author edits this for every trip.
- *derived* = generator can compute it from another field (do **not** duplicate in JSON unless the page overrides it).
- *shared* = identical across all 5 pages; generator should template it, not store it per trip (documented here for completeness).
- All body copy is **French (fr)**, verbatim. Several fields contain inline HTML (`<strong>`, `<em>`, `<br>`) — preserved literally; the generator must emit them unescaped.

---

## 0. Top-level identity

| Field | Type | Notes |
|---|---|---|
| `slug` | string | per-page. Directory name `site/<slug>/`. Drives **all** image paths and the canonical URL. |
| `region` | string | per-page. Value of `<body data-region>` AND `<section class="scroll-hero" data-region>`. Maps to accent color (see §11). |
| `dataPage` | string | per-page. Value of `<body data-page>`. Snake_case analytics id (e.g. `cairo_sharm`). |
| `lang` | string | shared = `"fr"`. `<html lang>`. |

---

## 1. `meta` — `<head>`

| Field | Type | Notes |
|---|---|---|
| `meta.title` | string | per-page. `<title>`. |
| `meta.description` | string | per-page. `<meta name="description">`. |
| `meta.canonical` | string | **derived** = `https://alliance-travel.dz/<slug>/`. Emitted as `<link rel="canonical">` and `<link rel="alternate" hreflang="x-default">` (same URL). |
| `meta.themeColor` | string | per-page hex. `<meta name="theme-color">`. **NOTE:** on cairo-sharm this is `#C9872E` and does **not** equal the CSS `--accent` (`#B2E89C`); on the other 4 pages `theme-color` == `--accent`. Store explicitly; do not derive from accent. |
| `meta.og.type` | string | shared = `"website"`. |
| `meta.og.title` | string | per-page. Often differs from `meta.title` (drops the date suffix). |
| `meta.og.description` | string | per-page. Usually richer than `meta.description`. |
| `meta.og.url` | string | **derived** = canonical. |
| `meta.og.siteName` | string | shared = `"Alliance Travel"`. |
| `meta.og.locale` | string | shared = `"fr_FR"`. |
| `meta.og.image` | string | **derived** = `https://alliance-travel.dz/assets/images/og/og-<slug>.jpg`. |
| `meta.og.imageWidth` / `imageHeight` | int | shared = `1200` / `630`. |
| `meta.twitter.card` | string | shared = `"summary_large_image"`. |
| `meta.twitter.title` / `description` / `image` | string | **derived** = the matching OG values (identical on all 5 pages). |

**Shared `<head>` blocks the generator templates verbatim (not in JSON):** charset/viewport, Google Fonts (DM Sans) preconnect+link, the `html.js` flag script, `../assets/css/styles.css`, the favicon block (`favicon-32x32/16x16`, `apple-touch-icon`, `favicon.ico`, `site.webmanifest`), and the `<link rel="preload">` for the LCP hero bg — preload uses the **webp** variant: `heroes-v2/hero__<slug>--bg.webp` + `--bg--mobile.webp 768w` srcset.

---

## 2. `accent` — inline `<style>:root{}`

| Field | Type | Notes |
|---|---|---|
| `accent.color` | string | per-page. `--accent`. See §11 for the region→color table. |
| `accent.dim` | string | **derived** from `accent.color` at 13% alpha. `--accent-dim`. |
| `accent.glow` | string | **derived** from `accent.color` at 22% alpha. `--accent-glow`. |
| `accent.heroGradient` | string | per-page. `--hero-gradient` (3-stop dark gradient, hand-tuned per region — not derivable). |

---

## 3. `jsonLd` — two `<script type="application/ld+json">` blocks + BreadcrumbList

Three JSON-LD blocks exist: **BreadcrumbList**, **TouristTrip** (with nested Offer + provider TravelAgency), **FAQPage**.

| Field | Type | Notes |
|---|---|---|
| `jsonLd.breadcrumbName` | string | per-page. The position-3 breadcrumb name (e.g. `"Le Caire & Sharm El Sheikh"`). Positions 1 (Accueil) & 2 (Voyages) are shared. |
| `jsonLd.touristTrip.name` | string | **derived** = `meta.og.title`. |
| `jsonLd.touristTrip.description` | string | **derived** = `meta.og.description`. |
| `jsonLd.touristTrip.offerPrice` | string | per-page. The "from" price as a bare integer string (e.g. `"190000"`). Generally equals `hero.priceFrom` with separators stripped. |
| `jsonLd.touristTrip.priceCurrency` | string | shared = `"DZD"`. |

- **TouristTrip `provider`** (TravelAgency: name, telephone `+213561616266`, url, PostalAddress `Boulevard Houari Boumediene, La Graf` / `Bordj Bou Arreridj` / `DZ`) is **shared** — template it.
- **FAQPage `mainEntity`** is **derived from the `faq[]` array** (§6): `name` = `faq[i].question`; `acceptedAnswer.text` = `faq[i].answerHtml` with HTML tags stripped to plain text. Do not store FAQ JSON-LD separately.

---

## 4. `hero` — `<section class="scroll-hero">` + `.scroll-hero__continuation`

| Field | Type | Notes |
|---|---|---|
| `hero.bg` / `hero.fg` | string | per-page. `data-bg` / `data-fg`. **derived** path = `../assets/images/heroes-v2/hero__<slug>--bg.jpg` / `--fg.jpg` (the `.jpg` attrs; webp preload is separate, §1). |
| `hero.titlePre` / `hero.titlePost` | string \| null | per-page. `data-title-pre` / `data-title-post`. **Two-part title variant** (4 of 5 pages). |
| `hero.titleSingle` | string \| null | per-page. `data-title`. **Single-title variant** — only `sharm-constantine` uses this (no pre/post). Generator: if `titleSingle` is set, emit `data-title` and skip pre/post. ⚠ structural fork, see _VARIATIONS. |
| `hero.eyebrow` | string | per-page. `data-eyebrow`. |
| `hero.date` | string | per-page. `data-date`. |
| `hero.prompt` | string | shared = `"Faites défiler pour découvrir"`. `data-prompt`. |
| `hero.skip` | string | shared = `"Passer"`. `data-skip`. |
| `hero.h1Pre` / `hero.h1Em` | string | per-page. The visible `<h1>`: `h1Pre` plus `<em>h1Em</em>`. Usually `h1Pre`==`titlePre`, `h1Em`==`titlePost`, but stored separately because `sharm-constantine` splits "Sharm" / "El Sheikh" differently from its single `data-title`. |
| `hero.lede` | string | per-page. The `<p>` under the h1. |
| `hero.priceFrom` | string | per-page. `.hero__price strong` (formatted, e.g. `"190.000 DA"`). |
| `hero.priceUnit` | string | per-page. `.hero__price span` (e.g. `"par personne · chambre double"` — some pages append the hotel name). |
| `hero.fineprint` | string | shared text = `"Sur la base d'une chambre double…"`. |

**Shared hero CTAs** (template verbatim): `Calculer mon prix` → `#calculator` (`hero_cta_calculate`); `WhatsApp` ghost button → wa.me deep-link (`hero_cta_whatsapp`).

---

## 5. `highlights[]` — `<section class="highlights">` (always 4 cards)

Array of exactly 4 objects:

| Field | Type | Notes |
|---|---|---|
| `icon` | string | per-page. A key for one of the inline SVGs (star/clock/plane/building/home/fire/shield/check/mountain/grid/map-pin/wave…). Generator maps key→SVG markup. The raw SVG is **not** stored; pick a sensible enum. |
| `label` | string | per-page. `.hl-card__label` (eyebrow chip). |
| `title` | string | per-page. `.hl-card__title`. |
| `body` | string | per-page. `.hl-card__body`. |

AOS delays are positional (`0,100,200,300`) — generator assigns by index.

---

## 6. `faq[]` — `<section class="faq-bg">`

Array (4–5 items). Drives both the visible accordion **and** the FAQPage JSON-LD (§3).

| Field | Type | Notes |
|---|---|---|
| `open` | bool | exactly one item (the first) is `true` → gets class `open` + `aria-expanded="true"`. |
| `question` | string | per-page. Button text + JSON-LD `name`. |
| `answerHtml` | string | per-page. `.faq-a` inner HTML (contains `<strong>`). JSON-LD text = this with tags stripped. |

AOS delays positional (`0,50,100,150`).

---

## 7. `itinerary` — `<section class="itinerary-bg">`

| Field | Type | Notes |
|---|---|---|
| `itinerary.eyebrow` | string | per-page. `.section-head__eyebrow` (e.g. `"9 jours · 7 nuits"`). |
| `itinerary.layout` | enum | **`"split"`** (two `.timeline` columns inside `.itinerary-split` grid) or **`"single"`** (one `.timeline`). ⚠ Only `cairo-sharm` is `split`; the other 4 are `single`. See _VARIATIONS. |
| `itinerary.columns[]` | array | For `split`: 2 objects each `{ heading, days[] }` where `heading` is the `<h3>` (e.g. `"Sharm El Sheikh — 5 nuits"`). For `single`: model as **one** column with `heading: null` (generator omits the `<h3>` and the split grid). |

Each `days[]` item:

| Field | Type | Notes |
|---|---|---|
| `node` | string | `.tl-node` badge (e.g. `J1`, `J2`, `J6-7`, `J3-8`). |
| `dayLabel` | string | `.tl-day-label` (e.g. `"Jour 1"`, `"Jours 2–5"`). |
| `active` | bool (opt) | first day of first column = `true` → class `tl-day active`. |
| `title` | string | `.tl-title`. |
| `activities` | string | `.tl-activities`. |
| `tags` | string[] | `.tl-tag` chips; empty array = omit `.tl-tags`. |

Generator appends the mobile responsive override `<style>` (`.itinerary-split{grid-template-columns:1fr}` @max-768) only when `layout=="split"`.

---

## 8. `tripMap` — `<section class="trip-map-section">` + `window.TRIP_MAP_DATA`

| Field | Type | Notes |
|---|---|---|
| `tripMap.present` | bool | All 5 pages = `true`. Kept as a flag in case a future trip omits the map. |
| `tripMap.ariaLabel` | string | per-page. `#trip-map[aria-label]`. |
| `tripMap.subHead` | string | per-page. `.section-head__sub`. |
| `tripMap.subFallback` | string | per-page. `.tmap-fallback__sub` (loading copy). |
| `tripMap.data` | object | per-page. Verbatim `window.TRIP_MAP_DATA`. **Coordinates are `[longitude, latitude]`** (opposite of Google Maps). |

`tripMap.data` shape: `{ name, hotels[], sites[], tours[], hubs[], routes[] }`.
- `hotels[]`: `{ id, name, loc:[lng,lat], stars, area }`.
- `sites[]`: `{ name, loc, day, featured? }` — `day` may be int or string range (`"2-5"`); `featured:true` = pulsing halo.
- `tours[]`: `{ name, loc, day, note }`.
- `hubs[]`: `{ name, loc, days }` (`days` like `"J1–J6"`).
- `routes[]`: `{ from:[lng,lat], to:[lng,lat], label, type }` where `type` ∈ `flight|road`; optional `lift` (number, arc curvature).

Shared: the legend (`Hôtels`/`Sites visités`/`Excursions guidées`), `<div class="tmap-fallback">` title `"Chargement de la carte…"`, and the two `<script src=…map-base.js / trip-map.js defer>`.

---

## 9. `trust` — `<section class="trust-bg">`

| Field | Type | Notes |
|---|---|---|
| `trust.eyebrow` | string | mostly shared (`"Plus de 1.200 voyageurs guidés"`). |
| `trust.stats[]` | array of `{ num, label }` | exactly 4. `num` like `"1.2K+"`; some labels per-page (departures count, hotels count). |
| `trust.testimonials[]` | array | 3 items: `{ stars (int, always 5), text, initials, name, trip }`. `initials` → `.testi-avatar`. |

`<h2>` `Ils nous ont <em>fait confiance</em>` is shared.

---

## 10. `inclus` — `<section class="inclus-section">` (two columns)

| Field | Type | Notes |
|---|---|---|
| `inclus.sub` | string | shared lede. |
| `inclus.includedCount` | string | per-page label, e.g. `"9 prestations couvertes"`. **derived** = `"<n> prestations couvertes"` where n = `included.length`. |
| `inclus.excludedCount` | string | per-page, e.g. `"7 éléments hors forfait"`. **derived** = `excluded.length`. |
| `inclus.included[]` | string[] | per-page. Each item is `.inclus-item--yes span` inner HTML (contains `<strong>`). |
| `inclus.excluded[]` | string[] | per-page. `.inclus-item--no span` inner HTML. |

Column heads (`Inclus dans le <em>forfait</em>` / `À <em>prévoir</em> en plus`) and the check/cross SVGs are shared.

---

## 11. `hotelsSection` + `hotels[]` — `<section class="hotels">`

### `hotelsSection`
| Field | Type | Notes |
|---|---|---|
| `phaseLabel` | string | shared = `"Comparer les hôtels"` (phase-marker #2). |
| `eyebrow` / `title` / `sub` | string | per-page. `title` contains `<em>`. |
| `tierTabs[]` | array of `{ tier, label, active? }` \| **null** | per-page. `data-tier` values: `all`/`economique`/`medium`/`premium`/`luxe`. First tab `active:true`. ⚠ **`null`** when the page has a single hotel and no tabs (kuala-lumpur). |

### `hotels[]`
One object per `.hotel-card` **and** the same `id` keys `window.TRIP_DATA.hotels` and the `<select>` options. Single source of truth — generator renders all three from this array.

| Field | Type | Notes |
|---|---|---|
| `id` | string | per-page. `data-hotel-id`, `<select value>`, and TRIP_DATA `id`. |
| `tier` | string | per-page. `data-tier`. |
| `name` | string | per-page. `.hotel-card__name`. |
| `nameSuffix` | string \| null | optional small `<span class="fs-caption">` after the name (e.g. Pickalbatros "Laguna Vista / Royal Moderna"). |
| `stars` | int | per-page. Number of star SVGs / `★`. **NOTE markup variant:** cairo-sharm renders stars as N inline `<svg polygon>` elements; the other 4 pages render a literal `★★★★` string. Generator picks one renderer; both are equivalent given `stars`. |
| `ribbon` | string | per-page. `.hotel-card__ribbon` text (e.g. `"Économique+"`, `"Médium 5★"`, `"4★ · Bakou"`). Ribbon CSS class = `tier`. |
| `image` | string | **derived** = `../assets/images/hotels/hotel__<imageSlug>.jpg`. ⚠ imageSlug is **not** always `id` (e.g. id `rehana4` → `hotel__rehana-4star.jpg`; id `parkside` → `hotel__parkside-baku.jpg`). Store the full path. |
| `alt` | string | per-page. `<img alt>`. |
| `amenities` | string[] | per-page. `.amenity-pill` chips (1–3). |
| `priceFrom` | string | per-page. `.hotel-card__price strong`, formatted. |
| `priceMeta` | string | per-page. `.hotel-card__price-meta`. |
| `calcName` | string | per-page. The `name` used inside `window.TRIP_DATA.hotels[]` (often `name`+star, e.g. `"Tivoli Aqua Park 4★"`). |
| `selectOption` | string | per-page. `<option>` text in the calculator `<select>` (e.g. `"Tivoli Aqua Park 4★ — dès 192.000 DA"`). |
| `prices` | object | per-page. `{ double, triple, single, child1, child2, baby }` — all integers (DA). **Always all 6 keys present** even when a room type isn't offered in the UI (e.g. KL/istanbul still ship `triple` in TRIP_DATA though the segmented control omits it). |
| `why` | string | per-page. The per-hotel "Pourquoi ce prix" sentence in TRIP_DATA. |

**Special hotel-card layouts** (⚠ _VARIATIONS): some cards swap the `priceFrom` block for an "inclus dans le package / tarif unifié" message (azerbaidjan Yengice). Treat as a `priceDisplayOverride` if needed — see _VARIATIONS.

---

## 12. `calculator` — `<section class="calc-section">` + trailing `window.TRIP_DATA`

| Field | Type | Notes |
|---|---|---|
| `calculator.name` | string | per-page. `TRIP_DATA.name` (e.g. `"Le Caire & Sharm El Sheikh · Juin 2026"`). |
| `calculator.dates[]` | string[] | per-page. `TRIP_DATA.dates` AND the `.date-chip[data-date]` values. First chip `active`. Chip **display** text can be a shortened form of `data-date` (e.g. data-date `"26 Juin – 4 Juillet 2026"` shown as `"26 Juin – 4 Juil 2026"`); store the canonical `data-date` and let the generator shorten, or add `dateChipsDisplay[]` if exactness matters. |
| `calculator.roomTypes[]` | string[] | per-page. `.seg-opt[data-room]` present. cairo-sharm/azerbaidjan/sharm-constantine = `[double,triple,single]`; istanbul/kuala-lumpur = `[double,single]`. |
| `calculator.groupConfig` | object | per-page. Defines the stepper rows. Keys → `{ label (h4), hint (p), kidType?, default? }`. ⚠ **The kid stepper `data-kid-type` mapping is page-specific and inconsistent** — see below + _VARIATIONS. |
| `calculator.extras[]` | array | per-page. `TRIP_DATA.extras`. Each `{ label, amount, currency }` (+ optional UI fields `uiLabel/uiDetail/uiPrice` for the visible `.extra-toggle`). Empty `[]` on most pages. |
| `calculator.whyDefault` | string | per-page. `#breakdown-why-details` default paragraph. |

**`data-kid-type` hazard:** the stepper rows bind to `child_a` / `child_b` / `baby`, but which UI row maps to which key differs per page (cairo-sharm "Enfants"→`child_a`; istanbul/sharm-constantine "1ᵉʳ enfant"→`child_b`, "2ᵉ enfant"→`child_a`). And the `prices` keys are `child1`/`child2`. The generator must keep the **explicit** `groupConfig[].kidType` → which price key mapping rather than inferring. This is the trickiest data-driven area.

Shared calc scaffolding: the breakdown panel (`#breakdown`, total, USD line, "Pourquoi ce prix" `<details>`, "Continuer vers la réservation" CTA), the adults stepper, and the sticky mobile total bar.

---

## 13. `infoBlocks[]` — `<section class="info-block-section">` (always 4 `<details>`)

| Field | Type | Notes |
|---|---|---|
| `icon` | enum | per-page key → SVG: `card` / `no-entry` / `passport` / `shield`. |
| `open` | bool | first block (`Conditions de paiement`) = `true`. |
| `title` | string | `.info-card__title`. |
| `lede` | string \| null | optional `.info-card__lede` (may contain `<strong>`). |
| `listTiered` | bool (opt) | adds `info-list--tiered` modifier. |
| `list[]` | string[] | `<li>` inner HTML. |
| `note` | string \| null | optional `.info-card__note` trailing HTML (with `<br>`). |

Blocks 1 (Paiement), 2 (Annulation), 4 (Assurance) are **identical across all 5 pages** (only the Visa block §3 differs by destination). Generator can template the 3 shared blocks and only data-drive the visa block — but storing all 4 is simpler and harmless.

---

## 14. `related[]` — `<section class="related-section">` (always 2 cards)

| Field | Type | Notes |
|---|---|---|
| `href` | string | per-page. `../<other-slug>/`. |
| `flag` | string | per-page. `.related-card__flag` text (season/departure). |
| `title` | string | per-page. The other trip's display name. |
| `priceFrom` | string | per-page. `.related-card__price strong`. |
| `color` | string | per-page. The **other** trip's accent color (used inline for flag/cta/svg). = that trip's `accent.color`. |

The decorative inline SVG art per card is keyed by the target slug (gradient ids like `cs-cairo-sharm-g`) — generator owns a per-slug art template; not stored as data.

---

## 15. `finalCta` — `<section class="final-cta">`

| Field | Type | Notes |
|---|---|---|
| `finalCta.scarcity` | string | per-page. `.final-cta__scarcity`. |
| `finalCta.title` | string | per-page. `<h2>` with `<br>` + `<em>`. |
| `finalCta.sub` | string | per-page. |
| `finalCta.waReserveText` | string | per-page. The pre-filled WhatsApp message for the reserve button. |
| `finalCta.addressLine` | string | mostly shared address line in `.contact-row`. |

The phone buttons + `.contact-row` phone links are **shared** (same numbers on every page; cairo-sharm shows an extra phone — minor).

---

## 16. Fully shared sections (templated, NOT in JSON)

- **NAV** — logo SVG, links (Programme/Hôtels/FAQ/Réserver/Visa → `../rendez-vous-visa/`), theme toggle, WhatsApp CTA. Identical (cairo-sharm adds a few aria/role attrs; cosmetic).
- **`booking-section`** — `<section id="booking">` is an empty shell hydrated by `booking-form.js`; only the `<noscript>` fallback (WhatsApp/phone) is in markup. Identical.
- **FOOTER** — brand, socials, "Nos Voyages" link list, contact phone groups, copyright. Identical (minor tagline wording differences).
- **Sticky mobile total bar**, and the trailing `<script defer>` list: `scroll-hero.js`, `calculator.js`, `booking-form.js`, `i18n.js`, `enhance.js`.

---

## 17. Image path conventions (derive from `slug` / hotel id)

| Asset | Pattern |
|---|---|
| Hero bg/fg (jpg, attrs) | `../assets/images/heroes-v2/hero__<slug>--bg.jpg` · `--fg.jpg` |
| Hero bg (webp, preload) | `../assets/images/heroes-v2/hero__<slug>--bg.webp` + `--bg--mobile.webp` |
| OG image (absolute) | `https://alliance-travel.dz/assets/images/og/og-<slug>.jpg` |
| Hotel photo | `../assets/images/hotels/hotel__<imageSlug>.jpg` — ⚠ `imageSlug` ≠ hotel `id` in several cases; store full path per hotel. |
| Favicons | shared `../assets/images/favicon/…` |

---

## 18. `region` → `--accent` color map (observed across the 5 pages)

| `data-region` | `--accent` | `theme-color` | Notes |
|---|---|---|---|
| `egypt`      | `#B2E89C` | `#C9872E` | cairo-sharm — **only page where accent ≠ theme-color**. |
| `azerbaijan` | `#3AAFAF` | `#3AAFAF` | azerbaidjan |
| `istanbul`   | `#70b8e0` | `#5B9EC9` | istanbul — accent (`#70b8e0`) and theme-color (`#5B9EC9`) are close but **not equal**; related-card color uses `#5B9EC9`. |
| `malaysia`   | `#4CAF82` | `#4CAF82` | kuala-lumpur |
| `sharm`      | `#28B4D4` | `#28B4D4` | sharm-constantine |

⚠ Region ≠ slug (e.g. region `sharm` ↔ slug `sharm-constantine`; region `malaysia` ↔ slug `kuala-lumpur`). And accent vs theme-color diverge on 2 of 5 pages — **store both, derive neither.**
