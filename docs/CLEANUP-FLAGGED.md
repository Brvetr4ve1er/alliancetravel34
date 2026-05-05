# Cleanup — flagged leftovers

> Audited: 2026-05-05 against `main` at `350efdb`.
> Single source for everything that's potentially removable / safely deletable / known cruft.
>
> **Legend:**
> 🟢 safe to delete now (zero references, zero traceability value)
> 🟡 keep but worth knowing (cruft you can live with)
> 🔴 known structural debt (needs a real refactor, not just a delete)

---

## 🟢 Safe-to-delete now

| # | Item | Bytes | Why safe |
|---|---|---|---|
| 1 | **`_archive/handoff-snapshot/`** (empty directory) | 0 | Empty since May 1 — got created and never populated. The actual May-1 snapshot lives in `_archive/handoff-snapshot-v5.2/`. The empty dir is just noise. |
| 2 | **`desktop.ini`** at project root + **`source of truth/desktop.ini`** | ~130 B | Windows OS metadata files. Already covered by `.gitignore` (`desktop.ini` line). They're untracked, but they sit visible in `ls`. Safe to `rm` locally. |
| 3 | **7 stale local Git branches** (all merged into `main`) | — | `feat/algeria-map-real-geography`, `feat/maps-anti-clutter`, `feat/maps-pin-spider`, `feat/trip-itinerary-maps`, `feat/trip-map-readability`, `refactor/audit-execution`, `refactor/cleanup-bloat` — `git branch --merged main` confirms all are fully merged. |

These will be acted on as part of the cleanup commit linked at the bottom.

---

## 🟡 Worth knowing — kept on purpose

| # | Item | Size | Why kept |
|---|---|---|---|
| 4 | **`_archive/heroes-original/`** (5 hero JPGs at original 1600 px resolution) | 2.1 MB | Pre-compression backup. Lets you re-run `_archive/migrations/_compress_heroes.py` with different quality settings without re-fetching from Wikimedia. Single source of truth for the source images. |
| 5 | **`_archive/css-scratch/`** (10 `_v*_*.css` files: v2 / v4 / v5 / v5_2 / v6_motion / v7_industry / v8_globe / v9_algeria_map / v10_trip_map / v11_anti_clutter) | 128 KB | Provenance trail for the live `styles.css`. Each file is the literal block that was appended at that version step. Read-only forensic record. |
| 6 | **`_archive/migrations/`** (15 Python scripts + 1 PowerShell helper) | 152 KB | Audit trail for image fetches, design migrations, phone-number sweeps, favicon/OG generation, hero compression. Useful when a hosted image gets DMCA'd and you need to know where it originally came from. |
| 7 | **`_archive/logs/`** (4 fetch logs + 1 sitemap working file) | 36 KB | Wikimedia attribution data. Matters for license compliance — every hero/site photo's CC-BY source is here. |
| 8 | **`_archive/handoff-snapshot-v5.2/`** (10 markdown files captured May 1 at v5.2) | 68 KB | The pre-cleanup state of the project. Could be deleted now that the project is at v11 and `docs/` is the living source — but 68 KB is cheap to keep for one more rev. |
| 9 | **`source of truth/`** (5 client docs: 3 PDFs + 2 docx) | ~5 MB | Client-provided documents (graphic chart + 3 trip itineraries + 1 dossier). **Immutable. Never edit.** |

---

## 🔴 Structural debt — won't go away with a delete

| # | Item | Severity | Status |
|---|---|---|---|
| 10 | **`site/assets/css/styles.css` is 6,625 lines / 165 KB unminified, layered v1 through v11** | high | Single render-blocking file. Already noted in [ROADMAP.md](ROADMAP.md) Phase 2.2 as needing ITCSS-style modules. Blocked on a build-step decision. |
| 11 | **`.btn--primary` defined 4 times, `.site-nav` defined 5 times, `163` `!important` declarations** | high | Cascade conflicts from the layered v1→v11 history. Same root cause as #10 — modular CSS would eliminate. |
| 12 | **2 inline `<style>` blocks on the homepage + 1 on each trip page = 7 total**, plus **75+ inline `style=""` attributes on the homepage** | medium | Page-specific styles that should live in `styles.css` keyed by page class or `[data-region]`. Bleeding inline = harder to theme + duplicates rules. |
| 13 | **Phone number `+213561616266` hardcoded in 12+ locations** (HTML + 4 JS files) | medium | Every change requires a project-wide regex sweep. ROADMAP Phase 2.1 captures this — needs `agency.json` extraction + build-time substitution. |
| 14 | **Trip price + dates hardcoded across HTML, `calculator.js`, `enhance.js` `ALL_TRIPS` array, `globe.js` `DESTINATIONS`, `trip-map.js` per-page `TRIP_MAP_DATA`** | medium | Same root cause as #13 — needs a JSON data layer. Currently changing a price = 4 file edits. |
| 15 | **`enhance-pro.js` is 600 lines, 14 numbered sections, single IIFE** | medium | No structural ceiling. Adding section 15 just appends. ROADMAP Phase 2.3 — split into focused modules behind a build step. |
| 16 | **`cobe` (3D globe) loaded from `esm.sh` at runtime** | low | External CDN dependency. Self-hosting tried in past commit but the `phenomenon` dep chain was too tangled to bundle without a real bundler. Existing graceful fallback (commit `ec204db`) handles outages. |

---

## Open questions (input needed before action)

1. **Build step (Vite or 11ty)?** Most Phase-2 debt is unblocked the moment this lands.
2. **Delete `_archive/handoff-snapshot-v5.2/`?** It's the only cruft that's clearly past its useful life. 68 KB. Pick: delete now or carry it one more rev.
3. **Delete the 7 merged branches now?** They're fully merged into `main`; deleting only loses local branch refs (the commits stay reachable from main). Default plan: yes, delete after this commit lands.

---

## Proposed actions for this cleanup commit

| Action | Items |
|---|---|
| `git rm -rf` | `_archive/handoff-snapshot/` (empty) |
| `rm` (untracked) | `desktop.ini` × 2 (already in `.gitignore`) |
| `git branch -d` | 7 merged branches listed in #3 |
| Refresh docs | `README.md`, `docs/ROADMAP.md`, `_archive/README.md`, `docs/SITEMAP.md`, `docs/COLOR-MAP.md`, `docs/IMAGE-ASSETS.md`, `docs/design-system/MASTER.md` |
| New file | this `docs/CLEANUP-FLAGGED.md` |
| **No code change** | (ship a doc-only commit; structural debt items 10–16 stay in ROADMAP) |

Net: ~0 KB shipped to users (docs aren't deployed; archive isn't deployed). Pure tidying.
