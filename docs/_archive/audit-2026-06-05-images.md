# Image Audit — Alliance Travel (2026-06-05)

Scope: every `<img>`, `<picture>`, `<source>` and OG/preload reference across 9 HTML pages, plus a sweep of `site/assets/images/` folders. Branch: `refactor/trim-v26`. Lens: Algerian travel agency, mostly mobile/4G viewers, warm-but-premium tone, locally rooted.

---

## 1. Inventory

| Folder | Files | Formats | Total | Notes |
|---|---|---|---|---|
| `heroes/` (v1) | 30 | jpg+webp+avif (3×) × 5 dest × 2 viewports | **3.45 MB** | Still wired on **homepage** (collage + globe polaroids) |
| `heroes-v2/` | 60 | jpg+webp+avif (3×) × 5 dest × **bg/fg** × 2 viewports | **17.12 MB** | Wired on **5 destination pages** via `scroll-hero` (parallax bg + portrait fg) |
| `trips/` | **5** | **jpg only** | 1.33 MB | `card__home__*.jpg` 1280×720. Missing AVIF/WebP variants |
| `hotels/` | 17 | jpg only | 1.87 MB | All ≤130 KB, OK. No AVIF/WebP — minor |
| `og/` | 7 | jpg only | 0.67 MB | All 1200×630, good. No `og-visa.jpg` — visa page reuses `og-default.jpg` |
| `flags/` | 11 | svg only | 47 KB | Includes DZ + 10 visa countries. `es.svg` (26 KB) + `sa.svg` (10 KB) heavier than the others (1 KB avg) — they ship complex coats of arms |
| `favicon/` | 10 | png + ico | 102 KB | Full PWA set, fine |
| **Total raster on disk** | **129** files | — | **~25 MB** | — |

### Naming convention
Consistent and excellent: `hero__<dest>--bg--mobile.avif`, `hotel__<slug>.jpg`, `card__home__<dest>.jpg`, `og-<dest>.jpg`, `<iso2>.svg`. Two-folder split (`heroes` vs `heroes-v2`) is the only ambiguity — v1 is the homepage collage source, v2 is the destination-page parallax. Both are live; neither is orphan.

### Orphan / ghost scan
- `heroes/` still referenced from `site/index.html` (preload, picture, polaroids: 9 hits) and from `assets/js/hero-collage-lazy.js` which rebuilds `<source>` URLs at runtime. **Not orphan** — but the duplication with v2 is worth flagging.
- No 404s on referenced images. No images sitting in folders that are unreachable from HTML/JS.

### Outsized files (>500 KB JPG, >250 KB WebP, >200 KB AVIF)
13 offenders, all in `heroes-v2/`:

| File | Size | Format | Comment |
|---|---|---|---|
| `hero__sharm-constantine--fg.jpg` | **1,545 KB** | JPG | 2000×2667 portrait, single biggest asset on the site |
| `hero__sharm-constantine--bg.jpg` | 1,298 KB | JPG | |
| `hero__azerbaidjan--fg.jpg` | 1,089 KB | JPG | |
| `hero__sharm-constantine--fg.webp` | 1,053 KB | **WebP** | WebP shouldn't exceed 250 KB |
| `hero__sharm-constantine--fg.avif` | 820 KB | **AVIF** | AVIF target was 120 KB |
| `hero__kuala-lumpur--bg.jpg` | 791 KB | JPG | |
| `hero__sharm-constantine--bg.webp` | 741 KB | **WebP** | |
| `hero__azerbaidjan--fg.webp` | 557 KB | **WebP** | |
| `hero__sharm-constantine--bg.avif` | 540 KB | **AVIF** | |
| `hero__istanbul--bg.jpg` | 533 KB | JPG | |
| `hero__azerbaidjan--bg.jpg` | 528 KB | JPG | |
| `hero__kuala-lumpur--fg.jpg` | 522 KB | JPG | |
| `hero__kuala-lumpur--bg.webp` | 472 KB | **WebP** | |

Root cause: `--fg` (foreground) crops are shipped at full pixel res (e.g. 2000×2667) instead of being trimmed to actual viewport bbox. Compounded by very gentle compression (q88-92 territory).

---

## 2. Per-page image audit

| Page | Hero img | Below-fold imgs | Critical issues |
|---|---|---|---|
| `site/index.html` (home) | `hero__cairo-sharm.{avif,webp,jpg}` via `<picture>` + 4 lazy collage tiles + 4 globe polaroids | 5 trip cards (1280×720 JPG only), 0 hotel imgs, 5 og refs | (a) Trip cards have **no `<picture>` wrapper** → JPG only, ~1.3 MB just for 5 thumbnails. (b) Globe polaroids load the **full 273 KB hero JPG** to render a 120 px thumbnail. (c) `alt=""` on trip cards (decorative? but they're inside `<a>` with `aria-label` — acceptable). Preload + fetchpriority + width/height all present on LCP ✅ |
| `site/voyages/index.html` | (none — text-only h1) | 5 trip cards same as home | Same JPG-only issue. Width/height ✅. No hero LCP candidate — no preload needed. OG = `og-home.jpg` ✅ |
| `site/cairo-sharm/index.html` | `heroes-v2/hero__cairo-sharm--bg/fg.*` via `scroll-hero` JS | 7 hotel JPGs + voyages cross-link cards | Hotel imgs are JPG-only (no picture). `<img>` has width/height/decoding/lazy ✅. Preload + fetchpriority ✅. Sharm-constantine fg/bg are the worst-case oversized assets. |
| `site/azerbaidjan/index.html` | `heroes-v2/hero__azerbaidjan--bg/fg.*` | 2 hotel JPGs (parkside, yengice) | Hotel imgs OK. Hero fg 1.1 MB JPG fallback → on slow conn the JPG path triggers. |
| `site/istanbul/index.html` | `heroes-v2/hero__istanbul--bg/fg.*` | 3 hotel JPGs (river, ozer-palace, tilia) | Istanbul fg is actually **smallest** in the set (32 KB AVIF) — sign it's a different crop strategy; consider applying it to the others. |
| `site/kuala-lumpur/index.html` | `heroes-v2/hero__kuala-lumpur--bg/fg.*` | 2 hotel JPGs | Heavy kuala bg/fg. |
| `site/sharm-constantine/index.html` | `heroes-v2/hero__sharm-constantine--bg/fg.*` | hotel JPGs | Worst-case page weight if JPG fallback triggers (≈2.8 MB hero alone). |
| `site/rendez-vous-visa/index.html` | **NONE — text-only hero** | 10 flag SVGs (36×27), 1 Leaflet map | (a) No hero photo — flat color hero, weak first impression. (b) Country cards use flag SVG only — neutral but cold. (c) **OG reuses `og-default.jpg`** (Bordj skyline / generic) — visa page misses sharability. |
| `site/404.html` | — | — | Minimal, fine. OG = `og-default.jpg` ✅ |

### Universal `<img>` attribute findings
- `loading="lazy"` + `decoding="async"` are **applied consistently** below the fold. ✅
- `width`/`height` are **applied on every `<img>`** on every page I checked (1280×720 for trip cards, 800×600 for hotels). CLS protection in place. ✅
- `<picture>` + AVIF fallback **only on heroes**. Trip cards + hotel cards skip it. — gap.
- `alt=""` is used on decorative imgs inside `<a aria-label>` wrappers — semantically correct, but hotel cards have real alt text. ✅
- Hero LCP preload + `fetchpriority="high"` present on all 6 photo-hero pages. ✅
- Mobile vs desktop art direction: heroes have a real mobile crop (`--mobile.*`). Trip cards do **not** — single 1280×720 source. Acceptable since cards render at ≈340×191 max, but means mobile downloads 247 KB JPG for a 5 KB on-screen area.

---

## 3. Gaps & missing assets

### G1. No `<picture>` for trip cards
`card__home__*.jpg` (5 files, 1.3 MB) are referenced as `<img src>` on home + voyages. Re-encoding to AVIF (≈40 KB each) + WebP (≈80 KB) would cut **~1 MB**. No alt-text changes needed.

### G2. No `<picture>` for hotel cards
17 hotel JPGs (1.9 MB). Lower priority since they're filtered/hidden and tier-tabbed.

### G3. Visa page hero is photo-less
The new `/rendez-vous-visa/` page ships with a flat color hero. The brand voice (warm, premium) is served better by a single confident photo. Three directions:

| Direction | Subject | Tone fit | Risk |
|---|---|---|---|
| **A. Passport in hand** | Close-up of an Algerian passport (green) being slid across an agent's desk, soft window light, neutral background | High — "we hold the paper for you" literal | Has to be an Algerian passport specifically (green); not the EU/maghreb stock variant |
| **B. Aerial Alger embassy district** | Wide shot El-Biar / Hydra at golden hour, no specific embassy flag visible | Medium — geographic anchor | Easy to look generic |
| **C. Hands sorting documents** | Top-down flat-lay: laid-out passport, application form, photos, calendar — no faces, no embassy seals | High — service-as-craft | Stock-feel risk if not curated; can be tightly art-directed |

**Recommended: C** — fits "vous restez à Bordj, on fait la route" exactly, no cultural minefields, no embassy seals. Pair with the existing `hero--service` styling, just add a `--fg/--bg` pair behind it.

### G4. Visa country grid: flag-only vs photo
Current implementation: flag SVG + name + tier chips inside `<details>`. **Recommendation: keep flag-only**. Reasons:
- Flag = neutral political symbol, low risk on KSA/USA cards
- Adding mood photos would force decisions on every country (Hajj/Umrah exclusion on KSA is real)
- Country cards are utility (dossier info), not inspiration
- The visual hierarchy already differentiates via the green/grey tier chips
- Adding 10 thumbnails = 10 × ~30 KB = 300 KB for a page that loads fast today

If photos *must* be added later, they should be **abstract, no-people, no-monument-cliché** — e.g. tea glass + Turkish carpet pattern for TR; teal Mediterranean wave for FR Côte d'Azur; not Eiffel Tower.

### G5. KSA photo
If a photo ever joins the KSA card: AlUla rock formations, Edge of the World near Riyadh, or Red Sea coast at Yanbu. **NOT** the Kaaba, Mecca, Medina mosque, or anything that could read as religious-pilgrimage product (ONHO-licensed, hors périmètre by user statement).

### G6. USA photo (visa bond context)
The visa bond pilot is policy-sensitive. The card should read as "we hold your hand through a hard process," not "celebrate America." Subject suggestion if ever added: empty NYC skyline silhouette at dawn (forward-looking, neutral) **NOT** Statue of Liberty, flag, or anything celebratory. Better: leave flag-only.

### G7. Algeria-rooted imagery missing
Current homepage hero collage = 5 destinations abroad (Cairo, Sharm, Istanbul, Baku, KL). Zero shots of Algeria itself, despite "agence à Bordj Bou Arreridj" being the positioning. Recommend **adding 1 Algeria anchor shot** to the `agence` section: La Graf office storefront, BBA market at golden hour, or Cité 5 Juillet. Strengthens "locally rooted" claim — costs zero brand risk.

### G8. No dedicated visa OG image
Currently `https://alliance-travel.dz/assets/images/og/og-default.jpg` is shared. **Recommend: create `og-visa.jpg`** (1200×630):
- Subject: stylized passport + green checkmark composition, brand mint accent, "Rendez-vous Visa · 10 pays" overprint
- Title overlay at 60 px DM Sans, "Alliance Travel" small mint top-left, no embassy seals
- Build alongside the existing OG set; same q85 JPG target as the rest

---

## 4. Sourcing recommendations (royalty-free)

For each recommendation: ≥3 specific search queries + license note. All Unsplash queries assume the standard Unsplash license (attribution appreciated, not required, commercial OK).

### Visa hero (G3, direction C)
- Unsplash: `"flat lay passport documents"` + `"travel documents desk"` + photographer `@christianw` / `@danfreemanphoto`
- Pexels: `passport application` (filter portrait, indoor)
- Wikimedia: avoid for this — too political-document risk
- License: Unsplash/Pexels OK. CC0 preferred so no attribution chip needed in footer
- Target: 2400×1350 (16:9), q85 AVIF (target <100 KB), WebP (<180 KB), JPG fallback (<220 KB)

### Replace `hero__sharm-constantine--*` (biggest offender)
- Unsplash queries: `"sharm el sheikh beach"` + `"naama bay"` + photographer `@reisetopia` + `"red sea egypt"` (skip the bright-sun shots — Algerian-MENA viewers know the colour; pick gold-hour or twilight)
- Avoid: lone swim-up bar (luxury Western cliché)
- Cultural check: ensure no alcohol in frame; modest beachwear preferred
- Target dims: bg 1920×1080, fg portrait 1200×1500 (NOT 2000×2667)

### Replace `hero__azerbaidjan--fg.jpg` (1.1 MB)
- Unsplash: `"baku flame towers"` + `"baku old city"` + photographer `@orxangr` (local Azeri shooters often have nicer light) + `"shahdag mountains"`
- Pair with a fg trim crop — current portrait fg seems oversized for the layout

### Add `og-visa.jpg` (G8)
- Build in-repo using Figma → export 1200×630 JPG, q85, target <100 KB
- Don't pull stock — typeset composition is more brand-aligned
- Use `--mint` (#9ce8b2) accent, DM Sans display, navy background — match site nav header

### Algeria anchor shot (G7)
- Wikimedia: `"Bordj Bou Arreridj"` (CC-BY — attribution required, footer chip)
- Unsplash: `"algerian market"` + `"kabylie landscape"` + photographer `@yas_b_d`
- License: Wikimedia CC-BY needs an attribution line; Unsplash doesn't. Prefer Unsplash for cleanliness

---

## 5. Performance budget

Targets (mobile 4G in Algeria):

| Slot | Budget | Today | Verdict |
|---|---|---|---|
| Total page weight | <1.5 MB | Home: ~0.85 MB images served (LCP + below-fold lazy queue) | ✅ |
| Hero LCP image | <120 KB AVIF | Home: 230 KB AVIF (`hero__cairo-sharm.avif`); Sharm-Constantine: **820 KB AVIF** | ⚠️ Sharm-Constantine fails. Most others OK |
| Trip cards (5×) | 5×50 KB = 250 KB total | Currently 5×~250 KB JPG = **~1.3 MB if not lazy** | ❌ (lazy attribute saves it, but first-paint scroll exposes them) |
| Below-fold image queue | <400 KB cumulative | OK except destination pages with hotel grids | ✅ marginal |

### Compression action plan
| Asset | Action | Est. saving |
|---|---|---|
| `hero__sharm-constantine--fg.{jpg,webp,avif}` | Re-encode at q85 + resize to 1200×1600 | -2.6 MB total across 3 formats |
| `hero__sharm-constantine--bg.*` | Same | -1.7 MB |
| `hero__azerbaidjan--fg.*` | Same | -1.4 MB |
| `hero__kuala-lumpur--{bg,fg}.*` | Same | -1.1 MB |
| `hero__istanbul--bg.*` | Same | -0.6 MB |
| `card__home__*.jpg` (5×) | Add AVIF (q60) + WebP (q80) siblings | Cut transferred trip-card weight by ~70% |
| `hotel__*.jpg` (17×) | Add AVIF/WebP siblings | -1.4 MB transferred |

Total estimated transfer reduction across heroes-v2 + trip cards: **~8 MB on-disk, ~60% bandwidth on first paint**.

---

## 6. Production checklist

### Re-encode commands
```bash
# AVIF (libavif's avifenc, target q60 for hero, q50 for trip cards)
avifenc --min 0 --max 63 --speed 4 -q 60 input.png hero__foo.avif

# WebP (cwebp from libwebp)
cwebp -q 82 -m 6 -mt input.png -o hero__foo.webp

# JPG fallback (mozjpeg)
cjpeg -quality 85 -optimize -progressive input.png > hero__foo.jpg
```

### srcset pattern for trip cards (add to home + voyages)
```html
<picture>
  <source media="(max-width:768px)" type="image/avif" srcset="card__home__cairo-sharm--mobile.avif">
  <source media="(max-width:768px)" type="image/webp" srcset="card__home__cairo-sharm--mobile.webp">
  <source type="image/avif" srcset="card__home__cairo-sharm.avif">
  <source type="image/webp" srcset="card__home__cairo-sharm.webp">
  <img class="trip-card__img" src="card__home__cairo-sharm.jpg" alt="" width="1280" height="720" loading="lazy" decoding="async">
</picture>
```

### Alt-text guidelines
- Decorative images inside `<a aria-label>` → `alt=""` (current pattern ✅)
- Hotel cards → real alt with hotel name (current pattern ✅)
- Country flags on visa page → `alt=""` (decorative; name in adjacent text) (current ✅)
- Hero photos → `alt=""` (decorative; `aria-labelledby` on the section uses the title) (current ✅)
- OG images: alt isn't surfaced; skip
- Algeria anchor shot (when added) → `alt="Notre agence à Bordj Bou Arreridj"` or similar

### File-naming convention to keep
- Use `--mobile` suffix for 768w crops
- Use `--bg` / `--fg` for parallax pairs
- Lowercase, hyphens, double-underscore between concept groups
- No file extension uppercase; no spaces

### Pre-deploy gates
1. Run `find site/assets/images -size +500k -name "*.jpg"` — expect zero hits after rework
2. Run `find site/assets/images -size +250k -name "*.webp"` — expect zero
3. Run `find site/assets/images -size +200k -name "*.avif"` — expect zero
4. Grep that every `<picture>` block has AVIF→WebP→JPG order; every `<img>` outside `<picture>` has `width` + `height`
5. Confirm `og-visa.jpg` exists if visa page goes live with social sharing in mind

---

## 7. Top deploy risks

1. **`hero__sharm-constantine--fg.jpg` is 1.5 MB** — the moment a Sharm-Constantine viewer's browser falls back to JPG (older Safari, no AVIF, no WebP), they pull 1.5 MB before they see a button. Mobile 4G in Algeria = 6–12s LCP.
2. **Trip cards have no AVIF/WebP path** — even though they're lazy-loaded, scrolling on the home page in 2026 is the primary "sales" flow. Saving ~1 MB here directly improves the bounce after-hero.
3. **Visa page has no OG image** — every WhatsApp share will pull `og-default.jpg` (Bordj skyline) instead of a visa-themed card. Low-effort fix, high social ROI.

## 8. Top 5 high-impact replacements

| # | Slot | Current | Recommended replacement | Source query |
|---|---|---|---|---|
| 1 | Sharm-Constantine hero fg | 1.5 MB portrait crop | 1200×1600 re-encode of same shot, q85 | Re-process in-repo (no new photo needed) |
| 2 | Visa page hero | Flat color | Flat-lay passport + documents | Unsplash `"flat lay passport documents"` + `@christianw` |
| 3 | Trip-card AVIF siblings (5×) | JPG-only | AVIF q60 + WebP q82 added | Re-encode in-repo |
| 4 | `og-visa.jpg` | Missing | Custom 1200×630 brand card | Build in Figma using mint + navy palette |
| 5 | Algeria anchor on home `agence` section | Missing | Single Bordj market or office storefront shot | Unsplash `"kabylie market"` or commission a phone-shot of La Graf |

---

End of audit.
