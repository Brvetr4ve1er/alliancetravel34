# `_archive/` — historical artifacts, not part of the running site

Everything here is **kept for traceability only**. Nothing in this folder is required for the site to run.

> Audited: 2026-05-05 · See [docs/CLEANUP-FLAGGED.md](../docs/CLEANUP-FLAGGED.md) for keep-vs-delete rationale on every item below.

## Structure

| Folder | What lives here | Why kept |
|---|---|---|
| `migrations/` | 15 one-shot Python scripts + 1 PowerShell helper used during the initial site build, the v5.2 → v8 image pipeline, and favicon/OG generation. | Audit trail — proves where the data + assets came from. Don't run again. |
| `css-scratch/` | 10 `_v*.css` files — the historical CSS layers that were appended to `site/assets/css/styles.css` between v1 and v11. | Provenance of the live `styles.css`. Read-only forensic record. |
| `heroes-original/` | 5 hero JPGs at original 1600px resolution (pre-compression). | Lets you re-run `migrations/_compress_heroes.py` with different quality settings without re-fetching from Wikimedia. |
| `logs/` | 3 image-fetch logs + 1 working `_sitemap.tmp`. | Source attribution for Wikimedia Commons photos (matters for license compliance). |
| `handoff-snapshot-v5.2/` | The `agent-handoff/` folder captured at v5.2 (May 1) — 10 markdown files. | Useful only for forensic reading; the post-v8 state lives in `docs/` and the live code. |
| `handoff-snapshot/` | **Empty** — accidentally created during reorganization. | Nothing — flagged for deletion in [docs/CLEANUP-FLAGGED.md](../docs/CLEANUP-FLAGGED.md) #1. |

## Don't add to this folder

If you need to keep something around, write it down in `docs/` — that's the living source of truth. `_archive/` is frozen.

## Inventory

### `migrations/` — 15 Python scripts + 1 PowerShell helper

**Initial build (May 1, archived in `d1401a5`) — 12 scripts:**
- `_enrich.py`, `_assets_fetch.py`, `_design_migrate.py`, `_phone_city_migrate.py`, `_address_fix.py`, `_reorganize_pages.py`, `_hotels_fetch.py`, `_hotels_fetch_v2.py`, `_hotels_save.py`, `_inject_hotel_images.py`, `_inject_images.py`, `_migrate_v2.py`
- `update_trips.ps1` (PowerShell helper)

**Asset pipeline (commits `eef5ad8`, `71cabdd`) — 3 scripts:**
- `_gen_favicons_og.py` — generates favicons (16/32/96/180/192/512 + .ico) and 7 OG cards via Pillow
- `_inject_favicons_og.py` — injects favicon + OG meta tags into all 6 pages
- `_compress_heroes.py` — compresses hero JPGs (q=78), generates WebP variants and 768px mobile crops

### `css-scratch/` — 10 CSS layer files

| File | Layer | Era |
|---|---|---|
| `_v2_styles.css` | v2 polish | initial build |
| `_v4_styles.css` | v4 polish | initial build |
| `_v5_styles.css` | v5 visual upgrade | initial build |
| `_v5_2_styles.css` | v5.2 patch | initial build |
| `_v6_motion.css` | v6 motion / micro-interactions | post-handoff |
| `_v7_industry.css` | v7 industry-style polish | post-handoff |
| `_v8_globe.css` | v8 cobe globe + service worker era | added during refactor |
| `_v9_algeria_map.css` | v9 Algeria branches MapLibre map | Phase 1.5 |
| `_v10_trip_map.css` | v10 trip itinerary maps | Phase 1.5 |
| `_v11_anti_clutter.css` | v11 8-strategy anti-clutter engine | Phase 1.5 |

### `heroes-original/` — 5 pre-compression heroes

`hero__azerbaidjan.jpg`, `hero__cairo-sharm.jpg`, `hero__istanbul.jpg`, `hero__kuala-lumpur.jpg`, `hero__sharm-constantine.jpg` — all at 1600px source resolution. Total ~2.1 MB.

### `logs/` — 3 logs + 1 working file

- `IMAGE-FETCH-LOG.json` — every image URL + license + Wikimedia attribution
- `HOTEL-FETCH-LOG.json` — hotel image fetch trace
- `IMAGE-FETCH-REPORT.md` — human-readable summary of the fetch run
- `_sitemap.tmp` — scratch file from a sitemap-generation experiment

### `handoff-snapshot-v5.2/` — 10 markdown files

`ARCHITECTURE.md`, `CONTACT-DATA.md`, `CONTINUE-HERE.md`, `DESIGN-SYSTEM.md`, `HOW-TO-RUN.md`, `KNOWN-ISSUES.md`, `MIGRATION-SCRIPTS.md`, `PROJECT-STATE.md`, `README.md`, `RECENT-CHANGES.md`. Total ~68 KB.
