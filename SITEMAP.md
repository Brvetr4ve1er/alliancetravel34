# Alliance Travel — Sitemap

> Audited: 2026-04-30
> 6 pages · 11 unique section types · single-domain navigation graph

---

## Top-level structure

```
alliance-travel.dz/                                      (homepage)
├── /cairo-sharm/                                        (Egypt — gold accent)
├── /azerbaidjan/                                        (Azerbaijan — teal accent)
├── /istanbul/                                           (Istanbul — Bosphorus blue)
├── /kuala-lumpur/                                       (Malaysia — tropical jade)
└── /sharm-constantine/                                  (Sharm — Red Sea aqua)
```

All pages share:
- A floating glass-pill nav (logo left · links centered · theme toggle + trip switcher + WhatsApp CTA on the right)
- A skip-link `<a href="#main">`
- Footer with 6 phone numbers + agency address
- A fixed bottom mobile sticky-total bar (trip pages only)

---

## Page 1 — Homepage  (`/`)

**Type**: agency front door
**Title**: Alliance Travel — Voyages Guidés · Sétif · 2026
**Background**: cinematic dark with bronze radial glow

| # | Section | id | Purpose |
|---|---------|-----|---------|
| 1 | `home-hero` | — | Title + globe SVG + agency stats counters |
| 2 | "Programmes 2026" | `voyages` | Grid of 5 trip cards |
| 3 | "Notre histoire" | `agence` | About + 4 stat cards |
| 4 | "Parlez-nous" | `contact` | All 6 phone numbers + address card |

**Internal anchors**: `#voyages`, `#agence`, `#contact`
**Outgoing pages**: links to all 5 trip pages

---

## Page 2 — Le Caire & Sharm  (`/cairo-sharm/`)

**Type**: trip landing
**data-region**: `egypt`
**Accent color**: `#C9872E` (Egyptian gold)
**Departure city**: Alger

| # | Section | id | Purpose |
|---|---------|-----|---------|
| 1 | `hero` | `main` | Visual hero + departure dates card |
| 2 | `highlights` | — | 4 inclusion icons |
| 3 | `itinerary` | `itinerary` | Day-by-day timeline |
| 4 | `trust` | — | **Stats + 3 testimonial cards** ⭐ unique to this page |
| 5 | `inclus-section` | — | Inclus / Non Inclus comparison |
| 6 | `faq` | `faq` | FAQ accordion |
| 7 | `hotels` | `hotels` | Hotel picker (7 hotels: Tivoli, Verginia, Rehana 4★, Rehana Royal, Charmillion, Cleopatra, Pickalbatros) |
| 8 | `calc-section` | `calculator` | Étape 1 — pricing calculator |
| 9 | `booking-section` | `booking` | Étape 2 — passport + WhatsApp dossier |
| 10 | `related-section` | — | "Vous aimerez aussi" cross-trip |
| 11 | `final-cta` | — | Closing pyramids CTA |

---

## Pages 3–6 — Other trip pages

All four trip pages (Azerbaïdjan, Istanbul, Kuala Lumpur, Sharm-Constantine) share **the same 10-section structure**, missing only the `trust` section that Cairo+Sharm has:

| # | Section | id |
|---|---------|-----|
| 1 | hero | `main` |
| 2 | highlights | — |
| 3 | itinerary | `itinerary` |
| 4 | inclus-section | — |
| 5 | faq | `faq` |
| 6 | hotels | `hotels` |
| 7 | calc-section | `calculator` |
| 8 | booking-section | `booking` |
| 9 | related-section | — |
| 10 | final-cta | — |

| Page | Region | Accent | Hotels | Departure |
|------|--------|--------|--------|-----------|
| Azerbaïdjan | azerbaijan | `#3AAFAF` Caspian teal | 2 (PARKSIDE Bakou + Yengice Gabala) | Alger |
| Istanbul | istanbul | `#70b8e0` Bosphorus blue | 4 (Hotel River, Ozer Palace, Alpin Due, Tilia) | Constantine |
| Kuala Lumpur | malaysia | `#4CAF82` Tropical jade | 1 (Grand Mercure KL) | Alger (Air Algérie direct) |
| Sharm-Constantine | sharm | `#28B4D4` Red Sea aqua | 3 (Tivoli, Rehana, Rehana Royal Beach) | Constantine |

---

## ⚠️ Consistency findings

### Section parity
- **Trust section is only on Cairo+Sharm** — the other 4 trip pages lack the testimonials/social proof block. Recommended: either replicate it on all 5 trip pages OR move it to the homepage so it's surfaced once for the whole agency.

### Section ID coverage
- Hero on Cairo+Sharm has `id="main"` (skip-link target)
- Heroes on the other 4 trip pages don't have `id="main"` — skip-link points to `#main` but it doesn't exist on those pages
- **Fix**: add `id="main"` to the `<section class="hero">` on all 4 other trip pages OR wrap content in `<main id="main">`

### Internal anchor inventory (all trip pages)
- `#main` — content start (skip link target)
- `#hotels` — hotel picker
- `#calculator` — calculator (now visually merged with booking)
- `#booking` — booking form (now adjacent to calculator)
- `#faq` — FAQ
- `#itinerary` — day-by-day timeline

### Cross-page navigation
Every trip page links to:
- `../index.html` (logo + footer)
- The 4 sibling trip pages via the trip-switcher dropdown
- The 2 "Vous aimerez aussi" related cards (curated per-trip)

---

## File map

```
site/
├── index.html                                    Homepage
├── cairo-sharm/index.html                        Egypt trip
├── azerbaidjan/index.html                        Azerbaijan trip
├── istanbul/index.html                           Istanbul trip
├── kuala-lumpur/index.html                       Malaysia trip
├── sharm-constantine/index.html                  Sharm-from-Constantine trip
└── assets/
    ├── css/styles.css                            Single-file design system (3500+ lines)
    ├── js/calculator.js                          Pricing engine (per-trip data injection)
    ├── js/booking-form.js                        WhatsApp dossier composer
    ├── js/enhance.js                             Counters, scroll reveals, theme toggle, trip switcher
    └── images/
        ├── heroes/      (5 trip hero photos, 1600×1200)
        ├── trips/       (5 homepage trip card photos, 1280×720)
        ├── hotels/      (17 hotel photos, 800×600)
        ├── sites/       (20 touristic site thumbs, saved for future use)
        ├── og/          (empty — pending OG card composition)
        ├── favicon/     (empty — pending master logo)
        ├── logo.svg     (cream variant for dark bg)
        └── logo-navy.svg (navy variant for light bg)
```
