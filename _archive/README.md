# `_archive/` — historical artifacts, not part of the running site

Everything here is **kept for traceability only**. Nothing in this folder is required for the site to run.

## Structure

| Folder | What lives here | Why kept |
|---|---|---|
| `migrations/` | 12 one-shot Python scripts + 1 PowerShell helper used during the initial site build (image fetching, design migration, phone/city migration, etc.) | Audit trail — proves where the data + assets came from. Don't run again. |
| `css-scratch/` | 7 `_v*_styles.css` files — the historical CSS layers that were appended to `site/assets/css/styles.css` between v1 and v8. | Provenance of the live `styles.css`. Read-only. |
| `logs/` | Image-fetch logs (`IMAGE-FETCH-LOG.json`, `HOTEL-FETCH-LOG.json`, `IMAGE-FETCH-REPORT.md`) and the `_sitemap.tmp` working file | Source attribution for Wikimedia Commons photos (matters for license compliance). |
| `handoff-snapshot-v5.2/` | The `agent-handoff/` folder captured at v5.2 (May 1) | Useful only for forensic reading; the post-v8 state lives in `docs/` and the live code. |

## Don't add to this folder

If you need to keep something around, write it down in `docs/` — that's the living source of truth. `_archive/` is frozen.

## What was archived (May 1)

- 12 Python scripts: `_enrich.py`, `_assets_fetch.py`, `_design_migrate.py`, `_phone_city_migrate.py`, `_address_fix.py`, `_reorganize_pages.py`, `_hotels_fetch.py`, `_hotels_fetch_v2.py`, `_hotels_save.py`, `_inject_hotel_images.py`, `_inject_images.py`, `_migrate_v2.py`
- 1 PowerShell helper: `update_trips.ps1`
- 7 CSS scratch files: `_v2_styles.css`, `_v4_styles.css`, `_v5_styles.css`, `_v5_2_styles.css`, `_v6_motion.css`, `_v7_industry.css`, `_v8_globe.css`
- 4 build logs: `IMAGE-FETCH-LOG.json`, `IMAGE-FETCH-REPORT.md`, `HOTEL-FETCH-LOG.json`, `_sitemap.tmp`
- 1 handoff snapshot (9 files): the original `agent-handoff/` folder
