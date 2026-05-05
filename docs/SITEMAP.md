# Alliance Travel — Sitemap

> Audited: 2026-05-05
> 6 pages · 13 unique section types · single-domain navigation graph

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
**Title**: Alliance Travel — Voyages Guidés · Bordj Bou Arreridj · 2026
**Background**: cinematic dark with bronze radial glow

| # | Section | id | Purpose |
|---|---------|-----|---------|
| 1 | `home-hero` | — | Title + cobe 3D globe + agency stats counters |
| 2 | "Programmes 2026" | `voyages` | Grid of 5 trip cards |
| 3 | "Notre histoire" | `agence` | About + 4 stat cards |
| 4 | "Nos agences en Algérie" | `branches` | **MapLibre map of Algeria** with 5 branch pins (BBA HQ + Sétif + Alger + Constantine + Oran) ⭐ added in Phase 1.5 |
| 5 | "Parlez-nous" | `contact` | All 6 phone numbers + address card |

**Internal anchors**: `#voyages`, `#agence`, `#branches`, `#contact`
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
| 4 | `trip-map-section` | `map` | **MapLibre itinerary map** (Cairo → Sharm route, day-numbered pins) ⭐ added in Phase 1.5 |
| 5 | `trust` | — | **Stats + 3 testimonial cards** ⭐ unique to this page |
| 6 | `inclus-section` | — | Inclus / Non Inclus comparison |
| 7 | `faq` | `faq` | FAQ accordion |
| 8 | `hotels` | `hotels` | Hotel picker (7 hotels: Tivoli, Verginia, Rehana 4★, Rehana Royal, Charmillion, Cleopatra, Pickalbatros) |
| 9 | `calc-section` | `calculator` | Étape 1 — pricing calculator |
| 10 | `booking-section` | `booking` | Étape 2 — passport + WhatsApp dossier |
| 11 | `related-section` | — | "Vous aimerez aussi" cross-trip |
| 12 | `final-cta` | — | Closing pyramids CTA |

---

## Pages 3–6 — Other trip pages

All four trip pages (Azerbaïdjan, Istanbul, Kuala Lumpur, Sharm-Constantine) share **the same 11-section structure**, missing only the `trust` section that Cairo+Sharm has:

| # | Section | id |
|---|---------|-----|
| 1 | hero | `main` |
| 2 | highlights | — |
| 3 | itinerary | `itinerary` |
| 4 | trip-map-section | `map` ⭐ |
| 5 | inclus-section | — |
| 6 | faq | `faq` |
| 7 | hotels | `hotels` |
| 8 | calc-section | `calculator` |
| 9 | booking-section | `booking` |
| 10 | related-section | — |
| 11 | final-cta | — |

| Page | Region | Accent | Hotels | Departure | Map route |
|------|--------|--------|--------|-----------|-----------|
| Azerbaïdjan | azerbaijan | `#3AAFAF` Caspian teal | 2 (PARKSIDE Bakou + Yengice Gabala) | Alger | Bakou → Gabala |
| Istanbul | istanbul | `#70b8e0` Bosphorus blue | 4 (Hotel River, Ozer Palace, Alpin Due, Tilia) | Constantine | Sultanahmet → Bosphorus → Bursa loop |
| Kuala Lumpur | malaysia | `#4CAF82` Tropical jade | 1 (Grand Mercure KL) | Alger (Air Algérie direct) | KL → Genting → Putrajaya |
| Sharm-Constantine | sharm | `#28B4D4` Red Sea aqua | 3 (Tivoli, Rehana, Rehana Royal Beach) | Constantine | Sharm-only (Naama Bay + excursions) |

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
- `#map` — itinerary map (added in Phase 1.5)

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
├── sw.js                                         Service worker (cache name 'alliance-v1-2026-05')
├── site.webmanifest                              PWA manifest
└── assets/
    ├── css/styles.css                            Single-file design system (6,625 lines, layered v1–v11)
    ├── js/                                       7 vanilla modules (3,284 lines total)
    │   ├── enhance.js                            Theme toggle, reveals, FAB, sw register     (357)
    │   ├── enhance-pro.js                        v6+v7 polish — sticky bar, lightbox, …      (600)
    │   ├── calculator.js                         Pricing engine (per-trip data injection)    (403)
    │   ├── booking-form.js                       WhatsApp + email + clipboard composer       (549)
    │   ├── globe.js                              Cobe 3D globe (homepage)                    (313)
    │   ├── algeria-map.js                        MapLibre branches map (homepage)            (501)
    │   └── trip-map.js                           MapLibre itinerary map (each trip page)     (561)
    └── images/
        ├── heroes/                               5 trip hero photos × {desktop,mobile} × {jpg,webp} = 20 files
        ├── trips/                                5 homepage trip card photos
        ├── hotels/                               17 hotel photos (flat — `hotel__*.jpg`)
        ├── og/                                   7 social-share images (1200×630 — 6 page-specific + 1 default)
        ├── favicon/                              16/32/96/180/192/512 + .ico
        ├── logo.svg                              cream variant for dark bg
        └── logo-navy.svg                         navy variant for light bg
```
