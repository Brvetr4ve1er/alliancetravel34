# Alliance Travel — Image Asset Manifest

> Every image placeholder in the site, named, sized, and prompted.
> All photos should match the site's **dark cinematic editorial** aesthetic (think *Condé Nast Traveler* meets *National Geographic*, not stock-photo postcard).

## Universal style guide (apply to every image)

- **Mood**: cinematic, atmospheric, premium, editorial — *never* sunny-stock-photo-bright.
- **Lighting**: golden hour or blue hour. Sidelight beats overhead. Shadows are content.
- **Subjects**: empty/sparse — destinations should feel exclusive. **No tourist crowds, no smiling-couple-pointing-at-map.**
- **Color**: leans toward each trip's signature accent (Egyptian gold, Caspian teal, Bosphorus blue, Tropical jade, Red Sea aqua) — desaturated, with one warm accent.
- **Format**: WebP primary (`.webp`), JPG fallback (`.jpg`). Strip EXIF, optimize aggressively (target ≤200KB hero, ≤80KB hotel, ≤30KB thumb).
- **Negative prompt** (if using AI gen): `no people in foreground, no logos, no text, no watermark, no oversaturation, no HDR halos, no fisheye, no tilt-shift miniature`

## Folder structure to create

```
site/assets/images/
├── heroes/           ← 5 hero photos
├── trips/            ← 5 homepage trip card photos
├── hotels/           ← 17 hotel photos
│   ├── cairo-sharm/
│   ├── azerbaidjan/
│   ├── istanbul/
│   ├── kuala-lumpur/
│   └── sharm-constantine/
├── og/               ← 6 social-share cards (1200×630)
└── favicon/          ← favicon set
```

---

## I. HERO PHOTOS — 5 needed

**Specs**: 1600×1200px (4:3), WebP + JPG, target 180KB max.
**Placement**: Right column of each trip's hero section. Must read clearly even when 50% of viewport.

### `heroes/cairo-sharm.webp`
- **Subject**: Pyramids of Giza at golden hour from a low angle, slight haze.
- **Composition**: One large pyramid dominant left-of-center, a smaller one tucked right, clean sky 60% of frame. Soft sand foreground, no humans, no camels (the camel cliché is in the brochure, not here).
- **Mood**: Mystical, ancient, warm amber tones, deep blue sky transitioning to gold near horizon.
- **AI prompt**:
  > Pyramids of Giza at golden hour, ultra-wide cinematic shot, low camera angle, deep amber light raking across limestone, hazy desert atmosphere, no people no camels, sand-dune foreground, deep blue sky upper third, editorial National Geographic aesthetic, shot on Sony A7R IV with 24mm lens, dramatic single-subject composition, 8k highly detailed, no text no logos
- **Stock keywords**: `pyramids giza dusk wide`, `egypt golden hour empty desert`

### `heroes/azerbaidjan.webp`
- **Subject**: Bakou Flame Towers at blue hour.
- **Composition**: The three flame-shaped skyscrapers silhouetted against a deep teal-purple sky, their LED facades glowing in flame patterns. Caspian Sea or Baku Boulevard reflective surface bottom 25%.
- **Mood**: Futuristic, dramatic, cool teal with warm amber LED glow accents.
- **AI prompt**:
  > Baku Flame Towers at blue hour seen from Baku Boulevard, three iconic flame-shaped skyscrapers with glowing red-orange LED facades, deep teal evening sky, Caspian Sea reflection in foreground, dramatic cinematic angle from below, no people no cars in frame, hyperrealistic editorial photo, atmospheric haze, 8k Sony A7R IV 35mm
- **Stock keywords**: `baku flame towers night`, `azerbaijan skyline blue hour`

### `heroes/istanbul.webp`
- **Subject**: Hagia Sophia or Blue Mosque silhouette over the Bosphorus at sunset.
- **Composition**: Mosque domes and minarets silhouetted right side, Bosphorus water glowing amber lower half, distant Asian shoreline in haze. Dramatic crepuscular rays optional.
- **Mood**: Romantic, layered, warm sunset over cool blue water, the "between two continents" feeling.
- **AI prompt**:
  > Sultan Ahmed Mosque silhouette at sunset over the Bosphorus, dome and four minarets dark against amber sky, calm water reflecting orange light, Asian Istanbul skyline as distant haze layer on horizon, single boat far away as scale element, no crowds, cinematic editorial photography, atmospheric, 8k 70mm telephoto compression
- **Stock keywords**: `bosphorus sunset mosque silhouette`, `istanbul golden hour skyline`

### `heroes/kuala-lumpur.webp`
- **Subject**: Petronas Twin Towers at night with the sky bridge illuminated.
- **Composition**: The twin towers framed dead center but slightly low, looking up. Surrounding green tropical trees in soft bokeh foreground. Black-emerald night sky with very subtle starlight.
- **Mood**: Tropical, modern, ambitious — the wow shot of the trip.
- **AI prompt**:
  > Petronas Twin Towers at night looking up from KLCC park, illuminated sky bridge connecting both towers, deep emerald-tinted sky, tropical palm fronds soft-focus framing the lower thirds, no people, cinematic editorial nightscape, atmospheric, 8k 16mm wide-angle, subtle starlight, no text no signs
- **Stock keywords**: `petronas towers night klcc park`, `kuala lumpur skyline tropical night`

### `heroes/sharm-constantine.webp`
- **Subject**: Red Sea reef shore at sunset with Sinai mountain silhouette.
- **Composition**: Calm aqua water in foreground showing coral hints under surface, white sand on right side, a single fishing dhow far in middle distance, Sinai mountains as a dark blue layered silhouette in the background, sky transitioning amber to deep cyan.
- **Mood**: Tranquil, exotic, the sea as the hero, with mountains adding scale.
- **AI prompt**:
  > Red Sea coast at golden hour with Sinai mountains layered silhouette in distance, calm turquoise water with subtle coral visible underneath, single traditional dhow boat far on horizon, no people, white sand crescent right side, sky transitioning amber to deep cyan, cinematic editorial National Geographic aesthetic, 8k 35mm
- **Stock keywords**: `red sea sinai sunset empty`, `sharm el sheikh dhow boat dawn`

---

## II. HOMEPAGE TRIP CARDS — 5 needed

**Specs**: 1280×720px (16:9), WebP + JPG, target 100KB max.
**Placement**: 5 cards on the homepage's "Nos destinations" grid. These thumbnails preview each trip.
**Style note**: Should feel like *companions* to the heroes — same destination, same mood, but a **different angle/landmark** so the user gets two distinct visuals when they land on the trip page.

### `trips/cairo-sharm.webp`
- **Subject**: Sharm El Sheikh underwater reef OR Nile dinner cruise at twilight.
- **Why different from hero**: Hero shows Egypt-the-monument; card should hint at "2 expériences" by showing the beach/sea side of the trip.
- **AI prompt**:
  > Aerial view of Sharm El Sheikh coral reef in turquoise water with white sand beach edge, calm sea, golden hour light, no people no umbrellas, drone perspective, editorial travel photography, 8k cinematic

### `trips/azerbaidjan.webp`
- **Subject**: Sheki Khan's Palace facade or Gabala mountain road in autumn.
- **Why different**: Hero shows Bakou modern; card shows the cultural/mountain side.
- **AI prompt**:
  > Sheki Khan's Palace 18th-century facade with intricate stained glass shebeke windows, dramatic side lighting at golden hour, no people, low angle, editorial cultural heritage photography, 8k 50mm

### `trips/istanbul.webp`
- **Subject**: Grand Bazar interior arch or a tea-glass on a Bosphorus ferry.
- **Why different**: Hero shows the city panorama; card shows the intimate atmosphere.
- **AI prompt**:
  > Grand Bazaar Istanbul interior arched ceiling with hanging Ottoman lamps casting warm amber light, deep shadows, no people, leading lines down corridor, editorial photography 24mm wide-angle, cinematic atmosphere, 8k

### `trips/kuala-lumpur.webp`
- **Subject**: Batu Caves rainbow staircase OR Genting cable car.
- **Why different**: Hero shows the urban skyline; card shows the natural/cultural side.
- **AI prompt**:
  > Batu Caves rainbow staircase from below, 272 steps climbing up to limestone cave entrance, no people, lush jungle frame on either side, golden morning light, editorial travel photography, 8k 16mm wide-angle, cinematic

### `trips/sharm-constantine.webp`
- **Subject**: Aqua park slide ribbons against blue sky OR poolside lounger at twilight.
- **Why different**: This trip's USP is the relaxed all-inclusive resort experience — hero shows the destination grandeur, card shows the resort comfort.
- **AI prompt**:
  > Empty aqua park water slide ribbons sculpted against deep blue dusk sky, dramatic geometric composition, no people, soft warm pool deck lighting at base, editorial architectural photography, 8k 24mm

---

## III. HOTEL PHOTOS — 17 needed

**Specs**: 800×600px (4:3), WebP + JPG, target 70KB max.
**Placement**: Top of each hotel card in the picker. Currently a colored gradient.
**Style note**: Each photo should immediately communicate the **tier** (Économique → Médium → Premium → Luxe). Use signature features (Aqua Park slides for the 4★, infinity pool for 5★, etc.).

### Cairo + Sharm (7 hotels)

| File | Hotel | Tier | Suggested Subject |
|---|---|---|---|
| `hotels/cairo-sharm/tivoli.webp` | Tivoli Aqua Park | Économique 4★ | Wide angle of the aqua park slides at sunset, no swimmers, water glistening |
| `hotels/cairo-sharm/verginia.webp` | Verginia Aqua Park | Économique+ 4★ | Pool deck with palm umbrellas, evening lighting, deserted |
| `hotels/cairo-sharm/rehana4.webp` | Rehana Aqua Park | Médium 4★ | Beach-front loungers with the Red Sea behind, no people |
| `hotels/cairo-sharm/rehana5.webp` | Rehana Royal Beach | Médium 5★ | Private beach with infinity pool meeting the sea horizon |
| `hotels/cairo-sharm/charmillion.webp` | Charmillion Club | Premium 5★ | Aerial of the club's lagoon-style pool complex |
| `hotels/cairo-sharm/cleopatra.webp` | Cleopatra Luxury | Premium 5★ | Lobby colonnade or grand entrance arch at golden hour |
| `hotels/cairo-sharm/pickalbatros.webp` | Pickalbatros | Luxe 5★ | Wide aerial of the entire resort with Red Sea and pools |

**AI prompt template (adapt per hotel)**:
> [HOTEL FEATURE] at [TIME OF DAY], no people, editorial architectural photography, 8k cinematic, no text no logos, atmospheric haze, premium hospitality aesthetic

### Azerbaijan (2 hotels)

| File | Hotel | Suggested Subject |
|---|---|---|
| `hotels/azerbaidjan/parkside.webp` | PARKSIDE Hotel 4★ Bakou | Hotel facade at twilight with Caspian Sea and Bakou skyline behind |
| `hotels/azerbaidjan/yengice.webp` | Yengice Hotel 5★ Gabala | Resort building nestled in autumn forest, Caucasus mountains as backdrop |

### Istanbul (4 hotels)

| File | Hotel | Suggested Subject |
|---|---|---|
| `hotels/istanbul/river.webp` | Hotel River 3★ | Boutique hotel facade at night, warm interior glow through windows |
| `hotels/istanbul/ozer.webp` | Hotel Ozer Palace 4★ | Sultanahmet rooftop with Hagia Sophia visible in distance |
| `hotels/istanbul/alpin.webp` | Hotel Alpin Due 4★ | Beyoğlu street perspective, hotel entrance with cobblestones |
| `hotels/istanbul/tilia.webp` | Hôtel Tilia 4★ | Bosphorus view from a hotel terrace at sunset |

### Kuala Lumpur (1 hotel)

| File | Hotel | Suggested Subject |
|---|---|---|
| `hotels/kuala-lumpur/grandmercure.webp` | Grand Mercure 5★ | Rooftop infinity pool with Petronas Towers visible in background |

### Sharm El Sheikh — Constantine departure (3 hotels)

| File | Hotel | Suggested Subject |
|---|---|---|
| `hotels/sharm-constantine/tivoli_czl.webp` | Tivoli & Aqua Park 4★ | Aqua park slides at sunrise (alternate angle from cairo-sharm version) |
| `hotels/sharm-constantine/rehana_czl.webp` | Rehana & Aqua Park 4★ | Pool with palm trees, soft morning light |
| `hotels/sharm-constantine/rehana_royal_czl.webp` | Rehana Royal Beach 5★ | Private beach with parasols and Red Sea horizon |

> **Note on hotel image sourcing**: Most hotel chains have official press photos (often free for travel agencies) on their websites or on platforms like booking.com. Using a real photo of the actual hotel is far better than AI-generated. AI generation should be a fallback if no official photo exists.

---

## IV. OPEN GRAPH SOCIAL CARDS — 6 needed

**Specs**: 1200×630px (Facebook/WhatsApp/LinkedIn standard), JPG only, target 150KB max.
**Placement**: `<meta property="og:image">` in each page's `<head>`. Currently missing — this is **critical** because most of your traffic will arrive via WhatsApp shares.

**Style note**: Unlike the hero/card photos, OG cards must include **text overlay** because they appear small in chat previews. Use the signature font (Fraunces) for the title.

### `og/home.jpg`
- Title overlay: "Alliance Travel"
- Subtitle: "Voyages Guidés · Sétif · 2026"
- Background: collage or globe motif similar to the homepage hero illustration
- Bottom badge: "1.200+ voyageurs · 5 destinations"

### `og/cairo-sharm.jpg`
- Title overlay: "Le Caire & Sharm El Sheikh"
- Subtitle: "Juin 2026 · à partir de 190.000 DA"
- Background: cropped pyramids hero photo, darkened by 30%
- Bottom badge: "EgyptAir · All Inclusive · 7 nuits"

### `og/azerbaidjan.jpg`
- Title overlay: "Azerbaïdjan · Bakou & Gabala"
- Subtitle: "2026 · à partir de 219.000 DA"
- Background: cropped Flame Towers hero photo
- Bottom badge: "Turkish Airlines · Visa inclus · 7 nuits"

### `og/istanbul.jpg`
- Title overlay: "Istanbul"
- Subtitle: "Mars–Mai 2026 · à partir de 123.000 DA"
- Background: cropped Bosphorus mosque silhouette
- Bottom badge: "Turkish Airlines · Constantine · 7 nuits"

### `og/kuala-lumpur.jpg`
- Title overlay: "Kuala Lumpur"
- Subtitle: "Mars–Mai 2026 · à partir de 211.000 DA"
- Background: cropped Petronas Towers hero photo
- Bottom badge: "Air Algérie direct · Grand Mercure 5★"

### `og/sharm-constantine.jpg`
- Title overlay: "Sharm El Sheikh"
- Subtitle: "Avril–Juin 2026 · à partir de 155.000 DA"
- Background: cropped Red Sea hero photo
- Bottom badge: "Constantine · All Inclusive · 10 jours"

**Quick way to make these**: Open the hero photo in Figma/Canva at 1200×630, add a 30% black overlay, place the title in Fraunces 96pt at the bottom-left, subtitle below in Inter 32pt. Bronze accent (#C8854A) for the badge text.

---

## V. FAVICON SET — 1 set needed

**Specs**: Multiple sizes derived from one master 512×512 source.
**Placement**: `<link rel="icon">` in every page.

### Master file: `favicon/master.png` (512×512)
- **Concept**: Stylized "AT" monogram or compass rose in bronze (#C8854A) on deep navy (#0C0E12).
- **AI prompt**:
  > Minimal monogram letter mark "AT" in elegant serif typeface, bronze gold color #C8854A on solid dark navy #0C0E12 background, vector style, geometric, premium travel agency logo, square format, 512x512, simple flat design no gradient

### Derived files (export from master):
- `favicon/favicon.ico` (multi-size: 16, 32, 48)
- `favicon/favicon-32.png` (32×32)
- `favicon/apple-touch-icon.png` (180×180)
- `favicon/android-chrome-192.png` (192×192)
- `favicon/android-chrome-512.png` (512×512)
- `favicon/site.webmanifest` (small JSON file pointing to the above)

---

## VI. OPTIONAL — Highlight thumbnails (20 needed)

**Specs**: 320×240px (4:3), WebP, target 30KB max.
**Placement**: Inside the 4 highlight cards at the top of each trip page (currently icon-only).
**Decision needed**: This is *optional* polish. The icon-only version reads cleanly already. Add photos only if you want extra visual richness in the highlights row.

### Cairo + Sharm
- `highlights/cairo-sharm/pyramids.webp` — wide shot of pyramids with sphinx
- `highlights/cairo-sharm/red-sea.webp` — turquoise water with snorkeler hint
- `highlights/cairo-sharm/egyptair.webp` — wing of an Egyptair plane against sky
- `highlights/cairo-sharm/marwa-palace.webp` — Marwa Palace Cairo facade

### Azerbaijan
- `highlights/azerbaidjan/baku-old-city.webp` — Maiden Tower
- `highlights/azerbaidjan/yanar-dag.webp` — flames of Yanar Dag at night
- `highlights/azerbaidjan/gabala-cable-car.webp` — Tufandag téléphérique
- `highlights/azerbaidjan/shahdag.webp` — Shahdag mountain resort

### Istanbul
- `highlights/istanbul/blue-mosque.webp` — Blue Mosque exterior
- `highlights/istanbul/princes-islands.webp` — boat approaching Büyükada
- `highlights/istanbul/ortakoy.webp` — Ortaköy Mosque with bridge behind
- `highlights/istanbul/asian-side.webp` — Maiden's Tower on the water

### Kuala Lumpur
- `highlights/kuala-lumpur/petronas.webp` — Petronas alternate angle
- `highlights/kuala-lumpur/batu-caves.webp` — Batu Caves staircase
- `highlights/kuala-lumpur/genting.webp` — Genting cable car
- `highlights/kuala-lumpur/grand-mercure.webp` — hotel exterior

### Sharm El Sheikh — Constantine
- `highlights/sharm-constantine/red-sea.webp` — Red Sea (different angle from cairo-sharm)
- `highlights/sharm-constantine/all-inclusive.webp` — buffet or restaurant scene
- `highlights/sharm-constantine/soho-square.webp` — Soho Square at night
- `highlights/sharm-constantine/constantine-airport.webp` — airport runway/plane

---

## VII. OPTIONAL — Testimonial portraits (recommended)

**Specs**: 200×200px (1:1, circular crop applied via CSS), WebP, target 15KB max.
**Placement**: Replaces letter-avatar circles in testimonial cards.
**Decision**: The current letter avatars (YB, SM, KA) read as authentic and unfaked. Real photos would be better only if you have actual permission from real customers. **Recommend keeping letter avatars unless you collect explicit consent.**

If you do add photos:
- `testimonials/yacine-b.webp`
- `testimonials/sarah-m.webp`
- `testimonials/karim-a.webp`
- (3 per trip page = 15 total)

---

## VIII. OPTIONAL — Itinerary day photos

**Specs**: 600×400px (3:2), WebP, target 50KB max.
**Placement**: Inside `.tl-content` of each timeline day. Currently text-only.
**Decision**: Strongly recommended. Adds visual rhythm to the day-by-day flow.

### Per trip, photos for the named days:

#### Cairo + Sharm (8 needed)
- `itinerary/cairo-sharm/j1-arrival.webp` — Sharm airport at dusk
- `itinerary/cairo-sharm/j2-naama-bay.webp` — Naama Bay promenade
- `itinerary/cairo-sharm/j3-soho-square.webp` — Soho Square fountain
- `itinerary/cairo-sharm/j4-old-market.webp` — Old Market alley
- `itinerary/cairo-sharm/j6-cairo-arrival.webp` — Cairo skyline
- `itinerary/cairo-sharm/j7-pyramids.webp` — Pyramids close-up
- `itinerary/cairo-sharm/j8-nile-cruise.webp` — Nile dinner cruise boat
- `itinerary/cairo-sharm/j9-departure.webp` — Cairo airport sunset

#### Azerbaijan (7 needed)
- `j1-arrival.webp`, `j2-baku-center.webp`, `j3-heydar-aliyev.webp`, `j4-gobustan.webp`, `j5-sheki.webp`, `j6-7-gabala.webp`, `j8-departure.webp`

#### Istanbul (8 needed)
- `j1-arrival.webp`, `j2-sultanahmet.webp`, `j3-princes-islands.webp`, `j4-ortakoy.webp`, `j5-asian-side.webp`, `j6-7-free.webp`, `j8-departure.webp`

#### Kuala Lumpur (6 needed)
- `j1-arrival.webp`, `j2-city-tour.webp`, `j3-batu-caves.webp`, `j4-genting.webp`, `j5-7-free.webp`, `j8-departure.webp`

#### Sharm Constantine (5 needed)
- `j1-departure.webp`, `j2-checkin.webp`, `j3-8-resort.webp`, `j9-last-day.webp`, `j10-return.webp`

---

## Total counts

| Category | Required | Optional | Total |
|---|---|---|---|
| Heroes | 5 | — | 5 |
| Trip cards | 5 | — | 5 |
| Hotels | 17 | — | 17 |
| OG cards | 6 | — | 6 |
| Favicon set | 1 set (5 derived files) | — | 1 |
| Highlights | — | 20 | 20 |
| Testimonials | — | 15 | 15 |
| Itinerary days | — | 34 | 34 |
| **TOTAL** | **34 files** | **69 files** | **103 files** |

> If working with a budget: ship the 34 required first. Itinerary photos can be added in a v2 push. Highlights are pure polish.

---

## Integration checklist (after assets are generated)

When you have the images ready, ping me and I will:

1. ✅ Replace SVG art in hero blocks with `<img>` tags + `loading="eager"` + `fetchpriority="high"`
2. ✅ Replace gradient div in hotel cards with `<img>` tags + `loading="lazy"`
3. ✅ Add `<link rel="icon">` + `apple-touch-icon` in every page's `<head>`
4. ✅ Add `<meta property="og:image">` to every page (currently missing)
5. ✅ Generate WebP + JPG fallbacks via `<picture>` element where helpful
6. ✅ Add `<img>` `width`/`height` attributes to prevent CLS (Cumulative Layout Shift)
7. ✅ Update `IMAGE-ASSETS.md` itself to mark which assets are ✅ in / ⏳ pending

---

## Quick AI prompt cheat-sheet

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

For OG cards:
```
[HERO PHOTO COMPOSITION] with 30% black gradient overlay bottom half,
title text "[TITLE]" in elegant serif Fraunces typeface bottom-left,
subtitle "[PRICE FROM]" smaller below, bronze accent badge top-right
"[TAGLINE]", premium travel agency social card,
1200x630, cinematic editorial composition
```
