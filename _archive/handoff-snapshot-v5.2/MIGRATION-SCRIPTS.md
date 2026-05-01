# Migration Scripts (project root)

These are one-shot, idempotent migration scripts created across the conversation. They've already been run — keep them as the audit trail of what changed. Don't delete unless you know the live site has the changes baked in.

## CSS layer scratch files

Every CSS layer was first written as a standalone `_v#_styles.css`, then **appended** to `site/assets/css/styles.css` via `cat >>`. The scratch files are kept at root for traceability.

| File | Lines | Appended? | What it added |
|---|---|---|---|
| `_v2_styles.css` | ~250 | ✅ | Logo placement (cream/navy variants), theme toggle button, calc+booking visual merge, light-mode polish |
| `_v4_styles.css` | ~270 | ✅ | Algeria branches map, branch cards, route-draw + pin-drop + halo-pulse keyframes, paper-plane (plane-arc) keyframe |
| `_v5_styles.css` | ~520 | ✅ | Per-region SVG patterns (5 regions), hero deco silhouettes, particle layers, body-pattern blend modes |
| `_v5_2_styles.css` | ~150 | ✅ | **LATEST** — Per-region full-bleed hero photo backgrounds, navbar z-index fix, homepage 5-photo collage |

The actual cumulative CSS lives in `site/assets/css/styles.css` (~4,531 lines). When making CSS changes, **edit `styles.css` directly** — don't write a new `_v6_styles.css`.

## Python migration scripts

All scripts use idempotent patterns (re-running them won't double-apply). Most operate on `site/**/*.html` via regex search-and-replace.

### `_enrich.py` (oldest, 21KB)

Original HTML enrichment driver. Pre-redesign. Built the initial trip-page structure from the source-of-truth PDFs/docx. Largely supplanted by later scripts but kept as the original "page builder."

### `_assets_fetch.py` (10KB)

Wikimedia Commons image scraper. Given a list of search terms (per page/section), downloads the top-relevance Commons image and saves to `site/assets/images/sites/`. Logs to `IMAGE-FETCH-LOG.json` and `IMAGE-FETCH-REPORT.md` with full attribution.

### `_inject_images.py` (6.6KB)

Reads the fetch log and injects `<img src="…">` tags into the relevant HTML sections. Match-and-replace style.

### `_hotels_fetch.py` (9KB) → `_hotels_fetch_v2.py` (7KB)

Two iterations of hotel-image fetcher. v2 adds:
- URL bytes cache (avoid re-fetching same Commons file)
- Polite 0.6s delay between requests (avoid Wikimedia 429)
- `shutil.copy2` to reuse already-downloaded images for shared physical hotels (e.g., `rehana-royal` and `rehana-royal-czl` are the same building under different package names)

### `_hotels_save.py` (1.7KB)

Lightweight save-helper used by the hotel fetcher. Probably can be inlined.

### `_inject_hotel_images.py` (3.9KB)

Inserts `<img>` into hotel cards on each trip page based on `HOTEL-FETCH-LOG.json`.

### `_design_migrate.py` (15KB) — biggest

Waypoint-style design system migration driver. Created the initial token system, replaced legacy CSS with the design tokens, restructured component classes. Run once.

### `_migrate_v2.py` (8.7KB)

V2 round of migrations: phone number normalization, calculator+booking visual merge (removed duplicate WhatsApp button), theme toggle button HTML.

### `_phone_city_migrate.py` (5.2KB)

The "Sétif → Bordj Bou Arreridj + 6 phone numbers" migration. Targeted at user-facing pages only (`site/**/*.html`). Did not touch docs at root. See `KNOWN-ISSUES.md` item 4.

### `_address_fix.py` (671 bytes)

Single-purpose: fix the address line in the contact section after the city migration.

### `_reorganize_pages.py` (9.3KB)

Restructured the trip-page section order: `itinerary → trust → inclus → FAQ → hotels → calculator+booking`. Was applied to all 5 trip pages.

## PowerShell helper

### `update_trips.ps1` (1.7KB)

Trip-update helper. Can re-run hotel image injection across all trips. Used during the hotel-image fetch debugging.

## What to run when

| If you want to… | Run |
|---|---|
| Fetch new hotel images for a new trip | Adapt `_hotels_fetch_v2.py` (point it at new search terms) |
| Add a new design token / refactor CSS | Just edit `site/assets/css/styles.css` directly |
| Add a new region | Add `data-region="..."` body attribute, add CSS rules in `styles.css`, add hero JPG to `assets/images/heroes/` |
| Run a global text replace across pages | Make a new `_migrate_*.py` patterned after `_phone_city_migrate.py` |
| Re-fetch all images from scratch | Run `_assets_fetch.py` (slow, hits Wikimedia) |

## Keep or archive?

When the project stabilizes, consider moving these to `tools/migrations/` or `_archive/`. For now: leave at root as the audit trail.

`_sitemap.tmp` is a leftover scratch file from `SITEMAP.md` generation — safe to delete anytime.
