# Alliance Travel — Image Asset Manifest

> Audited: 2026-05-05
> Every image placeholder in the site, named, sized, and prompted.
> All photos should match the site's **dark cinematic editorial** aesthetic (think *Condé Nast Traveler* meets *National Geographic*, not stock-photo postcard).

## Universal style guide (apply to every image)

- **Mood**: cinematic, atmospheric, premium, editorial — *never* sunny-stock-photo-bright.
- **Lighting**: golden hour or blue hour. Sidelight beats overhead. Shadows are content.
- **Subjects**: empty/sparse — destinations should feel exclusive. **No tourist crowds, no smiling-couple-pointing-at-map.**
- **Color**: leans toward each trip's signature accent (Egyptian gold, Caspian teal, Bosphorus blue, Tropical jade, Red Sea aqua) — desaturated, with one warm accent.
- **Format**: WebP primary (`.webp`), JPG fallback (`.jpg`). Strip EXIF, optimize aggressively (target ≤200KB hero, ≤80KB hotel, ≤30KB thumb).
- **Negative prompt** (if using AI gen): `no people in foreground, no logos, no text, no watermark, no oversaturation, no HDR halos, no fisheye, no tilt-shift miniature`

---

## Current folder state

```
site/assets/images/
├── heroes/           ← 5 destinations × {desktop,mobile} × {jpg,webp} = 20 files     ✅ shipped
├── trips/            ← 5 homepage trip card photos                                   ✅ shipped
├── hotels/           ← 17 hotel photos, FLAT structure (`hotel__*.jpg`)              ✅ shipped
├── og/               ← 7 social-share cards (1200×630)                               ✅ shipped
├── favicon/          ← 16/32/96/180/192/512 + .ico                                   ✅ shipped
├── logo.svg          ← cream variant for dark bg                                     ✅
└── logo-navy.svg     ← navy variant for light bg                                     ✅

(Pre-compression heroes preserved in `_archive/heroes-original/` at 1600 px so we can
 re-run `_archive/migrations/_compress_heroes.py` with different quality settings.)
```

> **Important** — `hotels/` is **flat**, NOT per-region subfolders. The current naming convention is `hotel__<slug>.jpg` (single underscore prefix, double underscore separator). The previous proposal of `hotels/<region>/<hotel>.webp` was abandoned because flat naming maps 1:1 with the calculator's hotel ID space.

> **Removed** — the `sites/` folder (20 touristic site thumbs reserved for "future use") was deleted in commit `6a65c48`. No section ever rendered them.

---

## I. HERO PHOTOS — ✅ shipped (5 needed, 5 delivered)

**Specs**: 1600×1200px (4:3), WebP + JPG + mobile-cropped variants, target 180KB max.
**Placement**: Right column of each trip's hero section. Pinned via `[data-region] .hero { background-image: image-set(...) }` with `(max-width: 768px)` mobile crops.

| File | Subject | Status |
|---|---|---|
| `heroes/cairo-sharm.{webp,jpg}` + mobile crops | Pyramids of Giza at golden hour | ✅ |
| `heroes/azerbaidjan.{webp,jpg}` + mobile crops | Bakou Flame Towers at blue hour | ✅ |
| `heroes/istanbul.{webp,jpg}` + mobile crops | Hagia Sophia / Blue Mosque silhouette over Bosphorus | ✅ |
| `heroes/kuala-lumpur.{webp,jpg}` + mobile crops | Petronas Twin Towers at night | ✅ |
| `heroes/sharm-constantine.{webp,jpg}` + mobile crops | Red Sea reef shore at sunset | ✅ |

Compression pipeline: `_archive/migrations/_compress_heroes.py` (q=78 JPG + WebP siblings + 768px mobile crop).

---

## II. HOMEPAGE TRIP CARDS — ✅ shipped (5/5)

**Specs**: 1280×720px (16:9), WebP + JPG, target 100KB max.
**Placement**: 5 cards on the homepage's "Programmes 2026" grid via `<picture>` with WebP-first sources.

| File | Subject |
|---|---|
| `trips/cairo-sharm.webp` | Sharm reef / Nile twilight |
| `trips/azerbaidjan.webp` | Sheki Khan's Palace facade |
| `trips/istanbul.webp` | Grand Bazar interior arch |
| `trips/kuala-lumpur.webp` | Batu Caves rainbow staircase |
| `trips/sharm-constantine.webp` | Aqua park slides at twilight |

---

## III. HOTEL PHOTOS — ✅ shipped (17/17)

**Specs**: 800×600px (4:3), JPG (no WebP yet — opportunity for next perf pass).
**Placement**: Top of each hotel card in the picker.
**Naming**: flat `hotel__<slug>.jpg`.

| File | Hotel | Page |
|---|---|---|
| `hotel__tivoli.jpg` | Tivoli Aqua Park | cairo-sharm |
| `hotel__verginia.jpg` | Verginia Aqua Park | cairo-sharm |
| `hotel__rehana-4star.jpg` | Rehana Aqua Park 4★ | cairo-sharm |
| `hotel__rehana-royal.jpg` | Rehana Royal Beach 5★ | cairo-sharm |
| `hotel__charmillion.jpg` | Charmillion Club | cairo-sharm |
| `hotel__cleopatra.jpg` | Cleopatra Luxury | cairo-sharm |
| `hotel__pickalbatros.jpg` | Pickalbatros | cairo-sharm |
| `hotel__parkside-baku.jpg` | PARKSIDE Bakou 4★ | azerbaidjan |
| `hotel__yengice-gabala.jpg` | Yengice Gabala 5★ | azerbaidjan |
| `hotel__river-istanbul.jpg` | Hotel River 3★ | istanbul |
| `hotel__ozer-palace.jpg` | Ozer Palace 4★ | istanbul |
| `hotel__alpin-due.jpg` | Alpin Due 4★ | istanbul |
| `hotel__tilia.jpg` | Hôtel Tilia 4★ | istanbul |
| `hotel__grand-mercure-kl.jpg` | Grand Mercure 5★ | kuala-lumpur |
| `hotel__tivoli-czl.jpg` | Tivoli & Aqua Park 4★ | sharm-constantine |
| `hotel__rehana-czl.jpg` | Rehana & Aqua Park 4★ | sharm-constantine |
| `hotel__rehana-royal-czl.jpg` | Rehana Royal Beach 5★ | sharm-constantine |

> **Deferred:** WebP variants for hotel JPGs. Same `<picture>` pattern that wraps hero photos can wrap hotel cards once the WebP files are generated.

---

## IV. OPEN GRAPH SOCIAL CARDS — ✅ shipped (7/6 needed)

**Specs**: 1200×630px (Facebook/WhatsApp/LinkedIn standard), JPG, ~150KB.
**Placement**: `<meta property="og:image">` in each page's `<head>`. Generated by `_archive/migrations/_gen_favicons_og.py` and injected by `_archive/migrations/_inject_favicons_og.py` (commit `eef5ad8`).

| File | Page |
|---|---|
| `og/og-home.jpg` | `/` |
| `og/og-cairo-sharm.jpg` | `/cairo-sharm/` |
| `og/og-azerbaidjan.jpg` | `/azerbaidjan/` |
| `og/og-istanbul.jpg` | `/istanbul/` |
| `og/og-kuala-lumpur.jpg` | `/kuala-lumpur/` |
| `og/og-sharm-constantine.jpg` | `/sharm-constantine/` |
| `og/og-default.jpg` | catch-all fallback |

---

## V. FAVICON SET — ✅ shipped

**Placement**: `<link rel="icon">` block in every page (injected by `_inject_favicons_og.py`).
**Manifest**: `site/site.webmanifest` references the 192/512 PWA icons.

| File | Size | Use |
|---|---|---|
| `favicon/favicon.ico` | multi (16/32/48) | legacy `.ico` request |
| `favicon/favicon-16.png` | 16×16 | tab |
| `favicon/favicon-32.png` | 32×32 | tab HiDPI |
| `favicon/favicon-96.png` | 96×96 | desktop shortcut |
| `favicon/apple-touch-icon.png` | 180×180 | iOS home screen |
| `favicon/android-chrome-192.png` | 192×192 | Android home / PWA |
| `favicon/android-chrome-512.png` | 512×512 | Android splash / PWA |

---

## VI. DEFERRED — Highlight thumbnails (20 optional)

**Specs**: 320×240px (4:3), WebP, target 30KB max.
**Placement**: Inside the 4 highlight cards at the top of each trip page (currently icon-only).
**Decision**: Optional polish. The icon-only version reads cleanly. Add only if extra visual richness is wanted in the highlights row.

(Suggested filenames live in the **Procurement reference** section at the bottom of this doc.)

---

## VII. DEFERRED — Testimonial portraits (15 optional)

**Specs**: 200×200px (1:1, circular crop applied via CSS), WebP, target 15KB max.
**Decision**: Current letter avatars (YB, SM, KA) read as authentic and unfaked. Real photos would be better only if you have actual permission from real customers. **Recommend keeping letter avatars unless you collect explicit consent.**

---

## VIII. DEFERRED — Itinerary day photos (34 optional)

**Specs**: 600×400px (3:2), WebP, target 50KB max.
**Placement**: Inside `.tl-content` of each timeline day. Currently text-only.
**Decision**: Strongly recommended for a v2 push — adds visual rhythm to the day-by-day flow. Now partially compensated for by the **trip itinerary maps** (Phase 1.5) which give each day a visual anchor on the map.

(Suggested filenames live in the **Procurement reference** section at the bottom of this doc.)

---

## Status totals

| Category | Required | Shipped | Deferred (optional) |
|---|---|---|---|
| Heroes | 5 | ✅ 5 (× WebP+JPG+mobile = 20 files) | — |
| Trip cards | 5 | ✅ 5 | — |
| Hotels | 17 | ✅ 17 (JPG only) | WebP variants |
| OG cards | 6 | ✅ 7 (incl. default fallback) | — |
| Favicon set | 1 set (5+ derived) | ✅ full set | — |
| Highlights | — | — | 20 |
| Testimonials | — | — | 15 |
| Itinerary days | — | — | 34 |
| **Required total** | **34 files** | ✅ **all 34 shipped** | 69 deferred |

---

## Procurement reference (for future additions)

> Kept for reference when adding optional Section VI/VII/VIII assets, or when re-shooting any of the shipped images to match a new style direction.

### Highlight thumbnails (per trip, 4 each)

#### Cairo + Sharm
- `highlights/cairo-sharm/pyramids.webp` — wide shot of pyramids with sphinx
- `highlights/cairo-sharm/red-sea.webp` — turquoise water with snorkeler hint
- `highlights/cairo-sharm/egyptair.webp` — wing of an Egyptair plane against sky
- `highlights/cairo-sharm/marwa-palace.webp` — Marwa Palace Cairo facade

#### Azerbaijan
- `highlights/azerbaidjan/baku-old-city.webp` — Maiden Tower
- `highlights/azerbaidjan/yanar-dag.webp` — flames of Yanar Dag at night
- `highlights/azerbaidjan/gabala-cable-car.webp` — Tufandag téléphérique
- `highlights/azerbaidjan/shahdag.webp` — Shahdag mountain resort

#### Istanbul
- `highlights/istanbul/blue-mosque.webp` — Blue Mosque exterior
- `highlights/istanbul/princes-islands.webp` — boat approaching Büyükada
- `highlights/istanbul/ortakoy.webp` — Ortaköy Mosque with bridge behind
- `highlights/istanbul/asian-side.webp` — Maiden's Tower on the water

#### Kuala Lumpur
- `highlights/kuala-lumpur/petronas.webp` — Petronas alternate angle
- `highlights/kuala-lumpur/batu-caves.webp` — Batu Caves staircase
- `highlights/kuala-lumpur/genting.webp` — Genting cable car
- `highlights/kuala-lumpur/grand-mercure.webp` — hotel exterior

#### Sharm El Sheikh — Constantine
- `highlights/sharm-constantine/red-sea.webp` — Red Sea (different angle from cairo-sharm)
- `highlights/sharm-constantine/all-inclusive.webp` — buffet or restaurant scene
- `highlights/sharm-constantine/soho-square.webp` — Soho Square at night
- `highlights/sharm-constantine/constantine-airport.webp` — airport runway/plane

### Itinerary day photos (per trip)

- **Cairo + Sharm (8):** `j1-arrival`, `j2-naama-bay`, `j3-soho-square`, `j4-old-market`, `j6-cairo-arrival`, `j7-pyramids`, `j8-nile-cruise`, `j9-departure`
- **Azerbaijan (7):** `j1-arrival`, `j2-baku-center`, `j3-heydar-aliyev`, `j4-gobustan`, `j5-sheki`, `j6-7-gabala`, `j8-departure`
- **Istanbul (8):** `j1-arrival`, `j2-sultanahmet`, `j3-princes-islands`, `j4-ortakoy`, `j5-asian-side`, `j6-7-free`, `j8-departure`
- **Kuala Lumpur (6):** `j1-arrival`, `j2-city-tour`, `j3-batu-caves`, `j4-genting`, `j5-7-free`, `j8-departure`
- **Sharm Constantine (5):** `j1-departure`, `j2-checkin`, `j3-8-resort`, `j9-last-day`, `j10-return`

### AI prompt cheat-sheet

Copy-paste into Midjourney / Flux / DALL-E:

```
[SUBJECT], cinematic editorial photography, 8k highly detailed,
no people, no text, no logos, no watermark,
dramatic [GOLDEN HOUR / BLUE HOUR] lighting, atmospheric haze,
shot on Sony A7R IV with [WIDE / TELE] lens,
National Geographic / Condé Nast Traveler aesthetic,
premium travel magazine, [VERTICAL / HORIZONTAL / SQUARE] format,
desaturated palette with one warm accent, --ar 4:3 --v 6 --style raw
```

For OG card refreshes:

```
[HERO PHOTO COMPOSITION] with 30% black gradient overlay bottom half,
title text "[TITLE]" in elegant serif Fraunces typeface bottom-left,
subtitle "[PRICE FROM]" smaller below, bronze accent badge top-right
"[TAGLINE]", premium travel agency social card,
1200x630, cinematic editorial composition
```
