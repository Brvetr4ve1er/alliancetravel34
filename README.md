# Alliance Travel — guided-tour static site

Marketing site for **Alliance Travel**, a travel agency based in **Bordj Bou Arreridj (BBA), Algeria**. Six pages: a homepage hub and five guided-tour landing pages (Cairo + Sharm, Azerbaïdjan, Istanbul, Kuala Lumpur, Sharm + Constantine).

Conversion path: pre-filled WhatsApp message — with **email and clipboard fallbacks** for users who don't have WhatsApp.

---

## Quick start

```bash
# Option 1 — Python (no Node needed)
python -m http.server 5500 --directory site

# Option 2 — npx (faster live-reload)
npx serve site -p 5501 --no-clipboard
```

Open <http://localhost:5500/>.

> **Full launch + deploy guide:** [docs/LAUNCH-AND-DEPLOY.md](docs/LAUNCH-AND-DEPLOY.md) — covers preview, smoke-test checklist, deployment to Netlify / Vercel / Cloudflare Pages / GitHub Pages / self-host, custom domain, and post-launch verification.

---

## Project layout

```
alliance-travel/
├── site/                       ← the actual product (deploy this folder)
│   ├── index.html              ← homepage
│   ├── {cairo-sharm,azerbaidjan,istanbul,kuala-lumpur,sharm-constantine}/index.html
│   ├── sw.js                   ← service worker (offline cache)
│   ├── site.webmanifest        ← PWA manifest
│   └── assets/
│       ├── css/styles.css      ← single CSS file (6,625 lines, layered v1–v11)
│       ├── js/                 ← 7 vanilla modules (3,284 lines total)
│       │   ├── enhance.js          theme toggle, reveals, FAB, sw register   (357)
│       │   ├── enhance-pro.js      v6+v7 polish (sticky bar, lightbox, …)    (600)
│       │   ├── calculator.js       price calc per trip page                  (403)
│       │   ├── booking-form.js     WhatsApp / email / copy dossier           (549)
│       │   ├── globe.js            cobe-powered 3D globe (homepage)          (313)
│       │   ├── algeria-map.js      MapLibre branches map (homepage)          (501)
│       │   └── trip-map.js         MapLibre itinerary map (each trip page)   (561)
│       └── images/
│           ├── heroes/         ← 5 destinations × {desktop, mobile} × {jpg, webp} = 20 files
│           ├── trips/          ← homepage trip-card thumbs
│           ├── hotels/         ← hotel card photos (flat — `hotel__*.jpg`)
│           ├── og/             ← 7 social-share images (1200×630)
│           ├── favicon/        ← favicon set (16/32/96/180/192/512 + .ico)
│           ├── logo.svg        ← navy/coral primary mark
│           └── logo-navy.svg   ← navy-on-cream variant
├── docs/                       ← living documentation
│   ├── ROADMAP.md              ← phased plan: shipped / next / deferred
│   ├── CLEANUP-FLAGGED.md      ← every flagged leftover (delete / keep / debt)
│   ├── COLOR-MAP.md            ← all design tokens with WCAG ratios
│   ├── SITEMAP.md              ← page audit + parity gaps
│   ├── IMAGE-ASSETS.md         ← image manifest
│   ├── LAUNCH-AND-DEPLOY.md    ← deploy + smoke-test handbook
│   └── design-system/MASTER.md ← Waypoint-style design blueprint
├── source of truth/            ← client PDFs (immutable)
├── _archive/                   ← frozen historical artifacts (see _archive/README.md)
└── .gitignore
```

---

## Tech stack

- **HTML5** — hand-written, semantic, 6 pages (≈4,568 lines total)
- **CSS** — single layered file, ITCSS-ish ordering by section comments
- **JS** — vanilla ES modules + IIFE; no framework, no bundler, no transpiler
- **Fonts** — DM Sans via Google Fonts (subset: 300/400/500/600/700 + italic 400)
- **3D globe** — [cobe](https://github.com/shuding/cobe) via esm.sh (with graceful fallback)
- **2D maps** — [MapLibre GL JS](https://maplibre.org) via esm.sh + free CARTO basemap tiles (no API key)
- **Server** — any static file server

No build step. Edit files, refresh browser.

---

## Architecture highlights

- `<body data-region="egypt|azerbaijan|istanbul|malaysia|sharm">` is the **single switch** that lights up per-region theming, hero photos, accent colors, and atmospheric SVG patterns. See [docs/COLOR-MAP.md](docs/COLOR-MAP.md).
- **Theme toggle** persists to `localStorage` (`at-theme` key), respects system `prefers-color-scheme` until user explicitly chooses.
- **Calculator → booking-form** communicate via the `calcStateUpdated` custom event. The booking form composes a WhatsApp / email / clipboard payload from the live calc state.
- **Per-region hero photos** are pinned via `[data-region] .hero { background-image: image-set(...) }` with WebP-first + mobile-cropped variants at `(max-width: 768px)`.
- **Sticky inquiry bar** (trip pages only) slides in after scroll; pushes the floating nav down via a `body.has-sticky-bar` class (no `:has()` dependency).
- **Lightbox** is keyboard-accessible (tabindex, Enter/Space activate, Esc/←/→ to navigate, focus restored to trigger on close).
- **Algeria branches map** (homepage): real MapLibre vector map of Algeria with pins at Bordj Bou Arreridj HQ, Sétif, Alger, Constantine, Oran. Accessible loading state + reduced-motion aware.
- **Trip itinerary maps** (each trip page): per-destination MapLibre map with day-by-day route polylines, sequenced numbered pins, hover/click popups.
- **Anti-clutter engine** (shared by both maps): screen-space pin stacking, label collision avoidance, click-to-isolate route, single-popup mode, viewport-aware label visibility — keeps maps readable at every zoom level.

---

## Deployment

Any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront).
Point the document root at `site/`. The service worker requires HTTPS in production (auto-skipped on `http://localhost`).

Set `Cache-Control: public, max-age=31536000, immutable` on `assets/images/**`, `assets/css/**`, `assets/js/**` once you adopt fingerprinted asset names (see [docs/ROADMAP.md](docs/ROADMAP.md)).

---

## What's done · what's next

The current state is the result of **15+ atomic commits across 8 feature branches** (all merged into `main`). Each branch is reviewable in isolation — see `git log --oneline`.

| Status | Item |
|---|---|
| ✅ | Git initialized, atomic-commit history, 8 merged feature branches |
| ✅ | Legacy migration scripts + CSS scratch files archived to `_archive/` |
| ✅ | Favicons (16/32/96/180/192/512 + .ico) + 7 page-specific OG images |
| ✅ | Hero JPGs compressed + WebP variants + mobile crops + `<picture>` |
| ✅ | Booking form: WhatsApp + email + clipboard fallbacks |
| ✅ | localStorage safety, cobe CDN fallback, lightbox a11y, `:has()` fallback |
| ✅ | Press strip honesty audit (no fake media-outlet claims) |
| ✅ | Font subset, mobile globe params, service worker |
| ✅ | Algeria branches MapLibre map (replaces broken SVG outline) |
| ✅ | 5 trip itinerary MapLibre maps (one per trip page, day-sequenced) |
| ✅ | Map readability pass — bigger containers, larger pins, clearer labels |
| ✅ | 8-strategy anti-clutter engine (stack, isolate, single-popup, etc.) |
| ✅ | Dead-CSS cleanup (removed Algeria-SVG-era keyframes + tombstone) |
| ✅ | Deleted unused `site/assets/images/sites/` folder |
| ⏳ | **Deferred** — see [docs/ROADMAP.md](docs/ROADMAP.md) |

Deferred items need a build step (Vite or 11ty) or major module refactor:
- Extract `trips.json` / `hotels.json` / `agency.json` and template-render
- Split 6,625-line `styles.css` into ITCSS modules (4× `.btn--primary` duplicates, 163 `!important`s — see [docs/CLEANUP-FLAGGED.md](docs/CLEANUP-FLAGGED.md) #10–11)
- Split 600-line `enhance-pro.js` into focused ES modules
- Real testimonials, Arabic translation, real backend (lead capture)

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full plan with concrete actions, and **[docs/CLEANUP-FLAGGED.md](docs/CLEANUP-FLAGGED.md)** for every flagged leftover with delete/keep/debt classification.
