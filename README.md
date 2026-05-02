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
│       ├── css/styles.css      ← single CSS file (5,888 lines, layered v1–v8)
│       ├── js/                 ← 5 vanilla modules
│       │   ├── enhance.js          theme toggle, reveals, FAB, sw register
│       │   ├── enhance-pro.js      v6+v7 polish (sticky bar, lightbox, …)
│       │   ├── calculator.js       price calc per trip page
│       │   ├── booking-form.js     WhatsApp / email / copy dossier
│       │   └── globe.js            cobe-powered 3D globe (homepage)
│       └── images/
│           ├── heroes/         ← 5 destinations × {desktop, mobile} × {jpg, webp} = 20 files
│           ├── trips/          ← homepage trip-card thumbs
│           ├── hotels/         ← hotel card photos
│           ├── sites/          ← destination-detail photos
│           ├── og/             ← 6 social-share images (1200×630)
│           └── favicon/        ← favicon set (16/32/96/180/192/512 + .ico)
├── docs/                       ← living documentation
│   ├── COLOR-MAP.md            ← all design tokens with WCAG ratios
│   ├── SITEMAP.md              ← page audit + parity gaps
│   ├── IMAGE-ASSETS.md         ← image manifest
│   └── design-system/MASTER.md ← Waypoint-style design blueprint
├── source of truth/            ← client PDFs (immutable)
├── _archive/                   ← frozen historical artifacts (see _archive/README.md)
└── .gitignore
```

---

## Tech stack

- **HTML5** — hand-written, semantic
- **CSS** — single file, layered, ITCSS-ish ordering by section comments
- **JS** — vanilla ES modules + IIFE; no framework, no bundler, no transpiler
- **Fonts** — DM Sans via Google Fonts (subset: 300/400/500/600/700 + italic 400)
- **3D globe** — [cobe](https://github.com/shuding/cobe) via esm.sh (with graceful fallback)
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

---

## Deployment

Any static host (Netlify, Vercel, Cloudflare Pages, S3+CloudFront).
Point the document root at `site/`. The service worker requires HTTPS in production (auto-skipped on `http://localhost`).

Set `Cache-Control: public, max-age=31536000, immutable` on `assets/images/**`, `assets/css/**`, `assets/js/**` once you adopt fingerprinted asset names (see [docs/ROADMAP.md](docs/ROADMAP.md)).

---

## What's done · what's next

The current state is the result of a 6-commit refactor pass on the `refactor/audit-execution` branch. Each commit is atomic and reviewable in isolation — see `git log --oneline`.

| Status | Item |
|---|---|
| ✅ | Git initialized, atomic-commit history |
| ✅ | Legacy migration scripts + CSS scratch files archived |
| ✅ | Favicons (16/32/96/180/192/512 + .ico) + 6 page-specific OG images |
| ✅ | Hero JPGs compressed + WebP variants + mobile crops + `<picture>` |
| ✅ | Booking form: WhatsApp + email + clipboard fallbacks |
| ✅ | localStorage safety, cobe CDN fallback, lightbox a11y, `:has()` fallback |
| ✅ | Press strip honesty audit (no fake media-outlet claims) |
| ✅ | Font subset, mobile globe params, service worker |
| ⏳ | **Deferred** — see [docs/ROADMAP.md](docs/ROADMAP.md) |

Deferred items need a build step (Vite or 11ty) or major module refactor:
- Extract `trips.json` / `hotels.json` / `agency.json` and template-render
- Split `styles.css` into ITCSS modules
- Split `enhance-pro.js` into focused ES modules
- Real testimonials, Arabic translation, real backend (lead capture)

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full plan with concrete actions.
