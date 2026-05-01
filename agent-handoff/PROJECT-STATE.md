# Project State (snapshot 2026-05-01)

## Tree (depth 3, abridged)

```
alliance travel/
├── .claude/
│   └── launch.json                    # 2 dev-server profiles (python http.server / npx serve)
├── agent-handoff/                     # ← you are here
├── design-system/
│   └── MASTER.md                      # original Waypoint-style design blueprint
├── site/                              # the actual website (this is what gets served)
│   ├── index.html                     # homepage
│   ├── cairo-sharm/index.html         # data-region="egypt"
│   ├── azerbaidjan/index.html         # data-region="azerbaijan"
│   ├── istanbul/index.html            # data-region="istanbul"
│   ├── kuala-lumpur/index.html        # data-region="malaysia"
│   ├── sharm-constantine/index.html   # data-region="sharm"
│   ├── trips/                         # legacy/empty subfolder
│   └── assets/
│       ├── css/styles.css             # 4,531 lines — all styling
│       ├── js/
│       │   ├── calculator.js          # live pricing, exposes window.__calcState
│       │   ├── booking-form.js        # WhatsApp dossier composer, listens to calcStateUpdated
│       │   └── enhance.js             # theme toggle, counters, reveals, share, trip switcher
│       └── images/
│           ├── heroes/                # 5 region hero JPGs
│           ├── trips/                 # 5 trip cards (homepage thumbs)
│           ├── hotels/                # 17 hotel JPGs
│           ├── sites/                 # 20 destination-detail JPGs
│           ├── og/                    # EMPTY (open-graph share images TODO)
│           ├── favicon/               # EMPTY (favicons TODO)
│           ├── logo.svg               # cream-on-dark variant
│           └── logo-navy.svg          # navy-on-light variant
├── source of truth/                   # client-provided originals
│   ├── alliance travel graphic chart .pdf  # brand bible — PRUSSIAN BLUE + TEAL DEER + Nexa typography
│   ├── Cairo + Sharm el sheikh ALL INCLUSIVE.pdf
│   ├── azerbaidjan all inclusive .pdf
│   ├── kuala lumpur all inclusive.pdf
│   ├── sharm constantine all inclusive .pdf
│   └── Voyage Istanbul.docx
├── alliance travel logo .svg          # original navy logo (root)
├── COLOR-MAP.md                       # all design tokens, dark + light, with WCAG ratios
├── SITEMAP.md                         # page audit + parity gaps flagged
├── IMAGE-ASSETS.md                    # image manifest + naming convention
├── IMAGE-FETCH-REPORT.md              # Wikimedia source attribution
├── IMAGE-FETCH-LOG.json               # log of fetched URLs/files
├── HOTEL-FETCH-LOG.json               # hotel-specific fetch log
├── _enrich.py                         # original HTML enrichment driver
├── _assets_fetch.py                   # Wikimedia Commons image scraper
├── _hotels_fetch.py                   # hotel image fetch (v1)
├── _hotels_fetch_v2.py                # hotel image fetch (v2 with cache + dedupe)
├── _hotels_save.py                    # save fetched hotel images
├── _inject_images.py                  # inject <img> tags into pages
├── _inject_hotel_images.py            # inject hotel images specifically
├── _design_migrate.py                 # Waypoint design system migration driver
├── _migrate_v2.py                     # v2 migration (phones, calc-merge, theme toggle)
├── _phone_city_migrate.py             # Sétif → Bordj Bou Arreridj + phone numbers
├── _address_fix.py                    # address line fix
├── _reorganize_pages.py               # reorder section hierarchy on trip pages
├── _v2_styles.css                     # CSS layer 2 (appended, scratch copy)
├── _v4_styles.css                     # CSS layer 4 (appended, scratch copy)
├── _v5_styles.css                     # CSS layer 5 (appended, scratch copy)
├── _v5_2_styles.css                   # CSS layer 5.2 (appended, scratch copy) ← LAST APPLIED
└── update_trips.ps1                   # PowerShell trip-update helper
```

## Page count

| Page | HTML present | data-region | Hero photo CSS rule | Trust section |
|---|---|---|---|---|
| `/index.html` (home) | ✅ | n/a | n/a (uses `.home-hero__photos` collage) | n/a |
| `/cairo-sharm/index.html` | ✅ | `egypt` | ✅ | ✅ |
| `/azerbaidjan/index.html` | ✅ | `azerbaijan` | ✅ | ❌ MISSING |
| `/istanbul/index.html` | ✅ | `istanbul` | ✅ | ❌ MISSING |
| `/kuala-lumpur/index.html` | ✅ | `malaysia` | ✅ | ❌ MISSING |
| `/sharm-constantine/index.html` | ✅ | `sharm` | ✅ | ❌ MISSING |

## Image inventory

| Folder | Count | Purpose |
|---|---|---|
| `assets/images/heroes/` | 5 | Hero backdrops (one per trip, full-bleed) |
| `assets/images/trips/` | 5 | Homepage trip-card thumbnails |
| `assets/images/hotels/` | 17 | Hotel cards on trip pages |
| `assets/images/sites/` | 20 | Destination detail / itinerary visuals |
| `assets/images/og/` | 0 | TODO — open-graph share images |
| `assets/images/favicon/` | 0 | TODO — favicons |

All photos sourced from Wikimedia Commons. Attribution log in `IMAGE-FETCH-REPORT.md`.

## CSS layer history

The single `site/assets/css/styles.css` was built up by appending CSS layers across the conversation. Each layer is also kept as a scratch file at project root for reference:

| Layer | Source file at root | Lines added | What it did |
|---|---|---|---|
| v1 | (original) | ~3,200 | Initial design system, tokens, components, layouts |
| v2 | `_v2_styles.css` | ~250 | Logo placement, theme toggle, calculator+booking merge, light mode polish |
| v4 | `_v4_styles.css` | ~270 | Algeria map, branch cards, route animations, paper-plane keyframes |
| v5 | `_v5_styles.css` | ~520 | Per-region SVG patterns + hero deco silhouettes + particle layers |
| v5.2 | `_v5_2_styles.css` | ~150 | **LATEST** — Per-region full-bleed hero photo backgrounds + nav z-index fix + homepage 5-photo collage |

**The real CSS is `site/assets/css/styles.css` (4,531 lines). The `_v*_styles.css` files at root are append-source copies kept for traceability. Don't edit them — edit `styles.css`.**

## Stable / "don't touch" surface

These have been deliberately calibrated and shouldn't be changed without a clear reason:

- **`:root` token block** in `styles.css` (top of file) — colors, type scale, spacing scale, motion tokens
- **`:root[data-theme="light"]` overrides** — calibrated for WCAG AA on cream
- **`.site-nav { z-index: 100 !important; }`** at the bottom of styles.css — fixes the navbar layering bug
- **`window.__calcState` schema** in `calculator.js` — booking-form.js depends on it
- **Phone numbers** — see [CONTACT-DATA.md](CONTACT-DATA.md). 6 numbers, exhaustively migrated.
- **City: Bordj Bou Arreridj** — replaces Sétif as the home city. Don't revert.

## Recently changed surface (this session)

See [RECENT-CHANGES.md](RECENT-CHANGES.md) for the chronological log. High-level:

- All 5 trip pages got `data-region` body attribute, hero deco layers, particle layers, paper-plane SVG
- Homepage got the Algeria branches map section (`#agences`) and the 5-photo collage hero strip
- "Notre histoire" copy rewritten around Bordj Bou Arreridj
- Phone numbers migrated to the official 6
- Booking form placeholder updated
- 5 hero JPGs added to `assets/images/heroes/`
- v5.2 nav-layering bug fixed
