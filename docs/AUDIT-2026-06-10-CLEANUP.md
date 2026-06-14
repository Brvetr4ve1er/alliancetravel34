# Cleanliness Audit — 2026-06-10 (cleaner agent)

Scope: unused files, obsolete assets, dead config, repo hygiene, dependencies.
Companion report: `AUDIT-2026-06-10-ARCHITECTURE.md` (design & architecture flaws).
**No changes made — audit only.** Branch: `refactor/trim-v26`.

**Method note:** every "unused" claim survived a second pass against dynamically-constructed
paths in JS. Three scripts build asset URLs at runtime: `scroll-hero.js` (derives
`.avif`/`.webp`/`--mobile.*` siblings from `data-bg`/`data-fg` jpg paths),
`hero-collage-lazy.js` (builds `heroes/hero__<slug>` × 6 variants from `data-lazy-hero`),
and `visa-map.js` (builds `flags/${c.flagId}.svg`). A naive filename grep flags ~52 hero
files as unused — **all are false positives** and are excluded below.

## 1. Unused assets in `site/assets/`

Only **3 of 153** asset files are genuinely unreferenced:

| File | Size | Evidence | Confidence | Action |
|---|---|---|---|---|
| `site/assets/images/logo-navy.svg` | 25.1 KB | Zero refs in any HTML/CSS/JS/manifest. Only mentions are in docs (`docs/AUDIT.md`, `docs/reference/IMAGE-ASSETS.md`, `docs/reference/SITEMAP.md`). Content differs from `logo.svg` (different md5) — a real navy brand variant, never wired up | certain (unused) / needs-human-check (brand asset may be wanted later) | archive |
| `site/assets/images/favicon/favicon-96x96.png` | 3.2 KB | Not in any HTML `<link>`, not in `site.webmanifest`. Only mention: archived generator `_archive/migrations/_gen_favicons_og.py` | certain | delete |
| `site/assets/images/flags/dz.svg` | 294 B | `visa-map.js` flagId values are fr/tr/de/es/cn/ru/eg/sa/us/ca — no `dz`. Only mention: `docs/_archive/visa-map-data-2026-06-03.md` | likely (tiny; may be an intentional placeholder for the Algeria home flag) | delete or keep, trivial |

Everything else — all heroes, heroes-v2, hotels, trips cards, og images, favicons, 11 flags —
is referenced statically or via the JS patterns above.

**Watch-out (not a bug):** `globe.js:32` mentions `assets/images/heroes/hero__sharm.jpg`,
which doesn't exist — but it's inside a doc comment showing how to add a future polaroid, never fetched.

## 2. Duplicate / redundant image formats

- **heroes-v2/** (scroll heroes, 5 trips × bg/fg × 6 variants): HTML carries only the `.jpg` in
  `data-bg`/`data-fg` plus `<link rel=preload>` for some webp; `scroll-hero.js` builds the full
  `<picture>` (avif → webp → jpg, mobile + desktop). **No orphaned variants.**
- **heroes/** (home collage): eager tile 1 (cairo-sharm) has a full static `<picture>` with all
  6 variants in `site/index.html`; tiles 2–5 get all 6 variants injected by `hero-collage-lazy.js`.
  **No orphaned variants.**
- **jpg-only families** (no webp/avif siblings exist, so nothing orphaned): `hotels/` (17 files),
  `trips/card__home__*.jpg` (5 files, 183–409 KB each), `og/` (7 files — jpg-only is correct for OG).
  The trip cards are a *perf* opportunity (no modern formats), not a cleanliness issue.
- **`_archive/heroes-original/*.jpg`** (5 files, ~2 MB): same filenames as
  `site/assets/images/heroes/*.jpg` but **different md5s** — pre-compression originals, not
  duplicates. Legitimate archive; committed to git (see §6).

## 3. One-off scripts

**Repo root: clean — zero loose `.py`/`.ps1`/`.cjs` files.** The expected `_*.py` migrations were
already moved to `_archive/migrations/` (28 `.py` + `update_trips.ps1` + 7 scratch `.css`), all
one-time migrations that already ran (their effects are in the committed site). Examples:
`_phone_city_migrate.py`, `_address_fix.py`, `_gen_favicons_og.py`, `_v12_propagate.py` …
`_v27_social_whatsapp.py`. Status: archived correctly, keep as-is.

| File | Purpose | One-time? | Action |
|---|---|---|---|
| `scripts/reencode-heroes.cjs` (5 KB) | One-shot re-encode of 3 heavy heroes-v2 layers (Jun 5 audit F5); backs up to `_hero-reencode-backup/`, has `--revert` | Yes — already ran (commits `49690ff`, `5db2791`) | keep until prod verified, then move to `_archive/migrations/` |
| `scripts/_hero-reencode-backup/` (4.0 MB, 6 files) | Local revert safety for the above; **gitignored, untracked** | n/a | delete locally once re-encode confirmed good in prod (shipped Jun 5–9; likely safe now) |

## 4. Dead JS / CSS + service worker

- **All 11 JS files are loaded**: i18n.js (9 pages), enhance.js (8), map-base.js (7),
  booking-form/calculator/scroll-hero/trip-map (5 each), algeria-map/globe/hero-collage-lazy/visa-map
  (1 each — page-specific). No dead JS.
- **styles.css**: loaded by 8/9 pages. `site/404.html` intentionally self-contained (inline styles,
  only loads `i18n.js`) — by design, not a gap.
- **`site/sw.js` precache** (`alliance-v29-2026-06-09`): `['/', '/assets/images/favicon/favicon-32x32.png',
  '/site.webmanifest']` — all 3 exist. **No stale entries.**

## 5. Stale config / docs

- **`site/_redirects`**: all 15 rules target the 5 existing trip dirs. Clean.
- **`site/_headers`**: one dead rule — `/assets/fonts/*` (line 49) but **no `site/assets/fonts/`
  directory exists** (fonts come from Google Fonts CDN). Harmless; delete the block or keep for
  future self-hosting (architecture report B2 recommends self-hosting — in that case keep).
  Also `/assets/images/og/*` rule is redundant (already covered by `/assets/images/*` with
  identical header). Cosmetic.
- **`site/sitemap.xml`**: 8 URLs — all exist; all indexable pages present; 404 correctly excluded.
  **Clean.** `robots.txt` points to it correctly.
- **Stale docs:**
  - `docs/AUDIT.md` — a 2026-05-26 snapshot: says "8 HTML pages", zero mention of
    `rendez-vous-visa/` (9th page). Superseded by `docs/AUDIT-2026-06-05-MASTER.md`.
    Action: move to `docs/_archive/`. Confidence: certain.
  - `docs/reference/IMAGE-ASSETS.md:28` and `docs/reference/SITEMAP.md:153` list `logo-navy.svg`
    with a ✅ as an active asset — it's unused (§1). Minor correction needed.

## 6. Repo hygiene

| Item | Finding | Action |
|---|---|---|
| `.gitignore` | Exists, sensible (node_modules, `.obsidian/`, `scripts/_*-backup/`, env, pycache) | keep |
| `source of truth/` | **6 files, ~34 MB, committed to git** (client PDFs/DOCX incl. 31.6 MB `ALG-MS-CAI+SSH JUIN 2026.pdf`). Largest blobs in history. Not deployed (publish dir is `site/`), but bloats every clone | needs-human-check — keep files but consider Git LFS or removing from history (`git filter-repo`) if clone size matters |
| `_archive/` | 70 files, 2.7 MB, committed. Intentional, documented (`_archive/README.md`) | keep (acceptable) |
| `scripts/_hero-reencode-backup/` | 4 MB, **NOT committed** (gitignore works) | delete locally when ready |
| Git object store | `count-objects`: **1,552 loose objects, 88.25 MiB, zero packs — never gc'd/packed.** `.git` = 92 MB. History also carries multiple superseded generations of heroes-v2 images (1.0–1.6 MB blobs) | run `git gc --aggressive` (safe, local); expect meaningful shrink |
| Deploy scope | `wrangler.toml` → `pages_build_output_dir = "site"`; `.github/workflows/deploy.yml` → `pages deploy site`. **Root junk never ships.** | keep — confirmed correct |

## 7. Dependencies

**Confirmed: no `package.json`, no `requirements.txt`, no lockfiles anywhere** (outside `.git`).
Zero-build static site by design. Only implicit dep: `scripts/reencode-heroes.cjs` requires `sharp`
(run ad hoc via npx/global). Nothing to audit.

---

## Summary

| Metric | Value |
|---|---|
| Deployed dead weight in `site/` | **~28.6 KB** (3 files) — site is remarkably clean |
| Local-only reclaimable now | **~4.0 MB** (`scripts/_hero-reencode-backup/`, untracked) |
| Git-side reclaimable | `git gc` on 88 MiB of unpacked loose objects (mechanical win); optionally ~34 MB history rewrite for `source of truth/` |
| Files safe to delete (certain) | 2 (`favicon-96x96.png`, backup dir contents ×6) |
| Files to archive (certain) | 2 (`reencode-heroes.cjs` after verification, `docs/AUDIT.md`) |
| Needing human review | 4 (`logo-navy.svg` brand intent, `dz.svg` intent, `source of truth/` in git history, `_archive/heroes-original/` retention) |
| Stale-doc corrections | 3 lines (`IMAGE-ASSETS.md`, `SITEMAP.md`, dead `/assets/fonts/*` block in `_headers`) |

Biggest takeaway: the deployed site has essentially no cruft; the real weight is git-side — an
unpacked object store and 34 MB of client PDFs in history. The "many root `_*.py` scripts" no
longer exist; they were already swept into `_archive/migrations/` in a prior cleanup.
