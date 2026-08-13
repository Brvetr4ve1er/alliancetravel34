# 📖 Alliance Travel — PROJECT BIBLE

> Complete handoff. The original builder is gone. This document lets a **developer, designer, AI assistant, marketer, and business owner** continue without losing context. For the *why behind the decisions* and lessons for building a NEW site, see the companion [`PROJECT-INTELLIGENCE.md`](PROJECT-INTELLIGENCE.md). This doc is **how to operate and continue THIS site.**

**Last updated:** 2026-08-11 · **Repo:** `github.com/Brvetr4ve1er/alliancetravel34` · **Domain:** `alliance-travel.dz` (Vercel)

---

## 🔴 READ THIS FIRST — current state (3 things)

1. **Production deploys from `integrate/unified-admin`, on Vercel.** That branch is the repo's default and the one production builds from; CI (`.github/workflows/ci.yml`) runs on it too. **`main` is stale** (190 commits behind) — do not target it. The old first action, "merge `refactor/trim-v26` → `main`", is **obsolete**: `refactor/trim-v26` is fully contained in `integrate/unified-admin` (0 commits ahead).
2. **The data-driven refactor landed.** Trip pages are **generated**, not hand-authored: `data/trips/*.json` + `tools/templates/sections/*.tpl` → `site/<slug>/index.html`, via `node tools/build.mjs` — which is the Vercel `buildCommand` in `vercel.json`. It renders 8 files today (7 trip pages + `/en/azerbaidjan/`). **Never run it without `--check`** unless you mean to rewrite the generated HTML; editing a generated page by hand is pointless, the next build overwrites it.
3. **Governance rules are legal, not stylistic.** Never put visa fees, fake scarcity, partnership claims, or embassy seals on the site. See §Owner and §Marketer. Breaking these creates real liability.

---

## 👤 FOR THE BUSINESS OWNER (non-technical)

**What the site is:** an online brochure for Alliance Travel. It shows your organised trips and visa service, and turns visitors into **WhatsApp/phone inquiries** with a pre-filled message. It does *not* take payments — all booking is via WhatsApp/agency.

**The pages:**
| URL | What it is |
|---|---|
| `/` | Home — hero globe, trip cards, the agency, contact |
| `/voyages/` | List of all trips |
| `/egypte/`, `/azerbaidjan/`, `/istanbul/`, `/kuala-lumpur/`, `/tunisie/`, `/bali/`, `/vietnam/` | One page per trip (itinerary, hotels, **price calculator**, booking) — all 7 generated from `data/trips/*.json` |
| `/rendez-vous-visa/` | Visa appointment service (10 countries) |

The old `/cairo-sharm/` and `/sharm-constantine/` pages no longer exist: both are now permanent (308) redirects to `/egypte/`, declared in `vercel.json`. Don't re-create them — fix the redirect instead.

**How a customer reaches you:** every page has WhatsApp buttons that open a chat to your number with a ready message. Your lines on the site: **+213 561 61 62 66–69**, **+213 560 86 06 17**, **+213 560 86 99 05**. Socials: Instagram `@alliance_travel34`, Facebook `Alliance.Mebarkia` + `visa.bba.9`, TikTok `visa.bba34`. Branches shown: **BBA La Graf** (Bd Houari Boumediene), **BBA Cité Zehour** (Route de Medjana), **M'Sila**.

**How to change content:** the admin dashboard is built — **"Espace Alliance" at `/admin/`**. You sign in with your email and password and you get two things: your **leads** (the enquiries the site collected) and **Pages**, where you pick a trip and edit its search-engine title/description, its hero block (headline, dates, "à partir de" price) and its **hotel prices**, then publish. Publishing rebuilds the page automatically. Anything the form doesn't expose (itinerary text, new destinations, photos, layout) still goes through a developer: give them the updated info, or drop the brochure PDFs into the `source of truth/` folder.

**The `source of truth/` folder** is where you put the agency's official brochure PDFs (hotel prices, dates, inclusions). A developer/AI parses them and updates the trip pages. Keep the newest brochure per destination; old ones get ignored. **This folder is local-only** — it is in `.gitignore` and `.vercelignore` and must never be committed or deployed: the B2B sheets carry supplier names and commission amounts, and the repo is public.

**⛔ What must NEVER go on the public site (legal/compliance — tell every developer/marketer):**
- **No visa fees or prices** → always "devis sur WhatsApp".
- **No promised visa timelines** → "selon l'ambassade".
- **No claiming you're a partner** of VFS/BLS/Capago/embassies → you "accompany" the file.
- **No embassy logos/seals** → only plain country flags.
- **No fake "only 3 seats left" / fake review badges** → only real departure counts.
- **No supplier names or commission amounts** from the B2B brochures (AyaBooking etc.) — those are internal.

**Going live / who controls what:** the site publishes from the `integrate/unified-admin` branch on GitHub, built by **Vercel**. You'll want access to: the **GitHub** account `Brvetr4ve1er`, the **Vercel** dashboard (the project that owns `alliance-travel.dz`), and your **domain registrar** (for `alliance-travel.dz` DNS). Guard these — they are the keys to the site.

---

## 💻 FOR THE SUCCESSOR DEVELOPER

**Stack:** vanilla static HTML/CSS/JS, **no framework, zero dependencies, no bundler** — but there *is* a build step: `node tools/build.mjs` (Node builtins only) generates the trip pages. Deployed on **Vercel**; `api/*.mjs` are serverless functions. Full tech sheet in [`PROJECT-INTELLIGENCE.md §0`](PROJECT-INTELLIGENCE.md).

**Run locally:**
```
# from repo root — serves the site/ folder
python -m http.server 5500 --directory site
# open http://localhost:5500
```
(Also defined in `.claude/launch.json` as "Alliance Travel (Python)" port 5500.)

**Repo map:**
```
site/                      ← the deployable site (Vercel outputDirectory = "site")
  index.html, 404.html
  voyages/  egypte/  azerbaidjan/  istanbul/  kuala-lumpur/  tunisie/  bali/  vietnam/  rendez-vous-visa/
  en/azerbaidjan/          ← the one server-rendered EN page
  admin/                   ← the owner dashboard (leads, trip editing)
  assets/
    css/styles.css         ← ~9,970 lines, ONE file, ships to every page
    js/                     ← IIFE modules, all <script defer>
    images/{heroes-v2,hotels,flags,og,favicon}/
  sw.js  sitemap.xml  robots.txt  site.webmanifest
vercel.json                ← headers, redirects, CSP, buildCommand, outputDirectory
api/                       ← Vercel serverless functions (*.mjs)
data/trips/                ← the trip data model (SCHEMA.md, one JSON per trip, _VARIATIONS.md)
tools/                     ← the generator (build.mjs + templates/) — this is the buildCommand
docs/                      ← all docs (this bible, intelligence, audits, DEPLOY, LESSONS, SCHEMA)
source of truth/           ← agency brochure PDFs (owner drops these) — gitignored, local only
```

**JS modules (what each does):**
| File | Role |
|---|---|
| `enhance.js` (1070) | theme switch, SW register, reveals, single rAF scroll coordinator, nav drawer, FAB, sticky bar, lightbox, counters |
| `i18n.js` (1179) | FR/EN/AR dictionary + `data-i18n*` swap engine, `<html lang/dir>`, lang switcher, aria-live announce |
| `booking-form.js` (741) | the booking form → builds WhatsApp/mailto message (no backend); **escapeHtml on all user input** |
| `calculator.js` | the price calculator: TRIP_DATA × group composition → total + WhatsApp deep-link |
| `map-base.js` | `window.MapBase` shared MapLibre helpers (loadMapLibre SRI'd, lazyBoot, arcCoords, theme swap) |
| `trip-map.js` / `algeria-map.js` / `visa-map.js` | the 3 maps (itinerary / homepage branches / visa centres) |
| `scroll-hero.js` | the parallax bg/fg hero on trip pages |
| `globe.js` | cobe WebGL globe on home hero (desktop-only, graceful fallback) |
| `hero-collage-lazy.js` | homepage hero collage lazy loader |

**CSS:** one `styles.css`. Theming via CSS variables on `:root`; per-trip accent set inline (`--accent`, `--accent-dim`, `--accent-glow`, `--hero-gradient`); light mode via `[data-theme="light"]` overrides; RTL via `:root[lang="ar"]`. **Watch out:** some selectors are defined twice (e.g. `.date-chips`) and some are dead (documented in `docs/SCAN-2026-06-12-naming-perf.md`).

**i18n:** add a string → put `data-i18n="section.key"` on the element, add the key to `T.fr`, `T.en`, `T.ar` in `i18n.js`. Use `data-i18n-html` for HTML, `data-i18n-aria-label` for aria. Numbers in AR need `unicode-bidi:isolate` (already handled for known cases).

**Maps:** all maps go through `window.MapBase`. `lazyBoot(containerId, fn)` boots when the container is ~600px from viewport. MapLibre loads from **jsDelivr with SRI** (don't switch to unpkg — it's unreliable in MENA). Tile host is `basemaps.cartocdn.com` (no API key), preconnected on map pages.

**Globe (`globe.js`):** markers are `[lat, lng]` (cobe order). To add a destination: (1) add to `DESTINATIONS` with `loc:[lat,lng]`, `size`, optional `polaroidId`; (2) if it has a polaroid, add a `<div class="globe-polaroid" data-marker="ID">` in `index.html` + a `rot` entry; (3) the fallback fan is count-agnostic. Desktop-only (≤1024px the globe column is hidden).

**Images:** encode with Pillow → AVIF (q42-50, speed3) + WebP (q70-76, method6) + JPG (q74-80), desktop + `--mobile` crops, in `<picture>`; preload the LCP hero bg (webp). Budget: delivered AVIF <250 KB, LCP <200 KB. Free sources: Pexels CDN `images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?w=…`. **Always verify license AND that the photo is the right place** (we once shipped a Samarkand photo labelled Azerbaijan, and Unsplash+ watermarked comps).

**Caching/SW:** cache headers live in **`vercel.json`** (`headers` array) — CSS/JS `max-age=600, stale-while-revalidate=86400`, images and fonts `immutable`, `sw.js` `must-revalidate`. There is no `_headers`/`_redirects` any more; those were Cloudflare files and are gone — redirects are the `redirects` array in `vercel.json`, and the CSP lives there too. `sw.js` precaches only `/` (keep it minimal — `addAll` is atomic). **Bump `CACHE_NAME` in sw.js when you change image bytes at the same filename** (currently `alliance-v32-2026-07-03`).

**Deploy:** push to `integrate/unified-admin` → Vercel builds (`framework: null`, `buildCommand: node tools/build.mjs`, `outputDirectory: site`, all in `vercel.json`). Any other branch → preview URL. ⚠️ [`docs/DEPLOY.md`](DEPLOY.md) has **not** been updated for Vercel — it still describes the old Cloudflare Pages setup; treat `vercel.json` as the truth.

**Test before commit:** `node --check` every JS file you touch; use the Claude preview tools (or any static server) + resize to 375/768/1024/1440 for responsive; verify maps boot and the calculator totals.

**The generator (done — this is how trip pages work now):**
- `data/trips/*.json` (schema in `data/trips/SCHEMA.md`, per-page quirks in `_VARIATIONS.md`) → `tools/templates/sections/*.tpl` → `site/<slug>/index.html`. Entry point is **`tools/build.mjs`** (there is no `build-trips.mjs`). All 7 trips are extracted to JSON; `/tunisie/` is built; `/egypte/` replaced the old cairo-sharm page.
- `node tools/build.mjs --check` validates without writing — that is the form to run while developing. The bare form rewrites the generated HTML.
- The build also runs the guards: `check-admin-fields.mjs`, `check-i18n.mjs`, `check-i18n-bindings.mjs`, `check-value-graph.mjs`. If one of them errors, the deploy fails — that is deliberate.
- The owner-editing dashboard exists at **`site/admin/`** ("Espace Alliance"), hand-built, not Decap CMS. It is backed by the `api/*.mjs` serverless functions (`save-trip`, `revert-trip`, `get-trip`, `export-leads`, `me`, `status`, `health`).

**Known bugs/debt (live):** see `docs/SCAN-2026-06-12-naming-perf.md` (naming/perf) and `PROJECT-INTELLIGENCE.md §7` (all 15 bug classes). The big ones still partly present: CSS monolith with dupes/dead rules, two reveal systems (AOS + data-fx), nav `backdrop-filter` re-blur on scroll, child-pricing model inconsistency (display vs charged — needs the owner's real tariff rule), cobe not self-hosted.

**⚠️ Process hazard:** multiple AI/dev sessions have run on this one working tree and committed independently, occasionally clobbering each other. **One session per worktree. Check `git status`/`git log` before and after. Commit scoped file lists, never `git add -A`.**

---

## 🎨 FOR THE DESIGNER

**Brand:** dark-default, premium-but-warm. Core palette: Prussian navy `#002c51`, mint `#9ce8b2`, cream `#efe8df`. **Per-trip accent** color theming (egypt mint-green, azerbaijan teal `#3AAFAF`, istanbul blue, malaysia green, sharm cyan, tunisie = Sidi-Bou-Said blue). Note `theme-color` (browser chrome) ≠ `--accent` on some pages — stored separately, don't unify.

**Type:** DM Sans (body) + Fraunces (`--font-display`, headings — added in v28); Arabic uses **Cairo only** — one face for display *and* body, weights 400/600/700, lazy-loaded from Google Fonts on the first AR switch (`AR_FONT_HREF` in `i18n.js`). Tajawal was removed; don't re-add a second Arabic face. Headings often `Word <em>emphasis</em>` (the `<em>` gets the accent color).

**The official brand chart** is `source of truth/alliance travel  graphic chart .pdf` (31 MB) — the agency's logo/color reference. Use it for any new brand asset. It lives in the gitignored local-only folder, so ask the owner for a copy; it is not in the repo.

**Motion:** scroll-reveals + parallax, all through one rAF coordinator; `prefers-reduced-motion` fully respected (everything has a static fallback). Keep new motion on `transform`/`opacity` only (never animate layout properties — that caused the dead ken-burns paint-storm we removed).

**Imagery:** cinematic hero with a **bg layer (the scene) + fg layer (the subject)** for parallax depth; warm, aspirational, *locally-credible* (real destinations, golden hour). Free-licensed only. Mobile gets a different crop, not just a resize.

**Light/dark + RTL:** every component must work in both themes and in RTL (Arabic). Check contrast (we had a `--txt-3` that failed AA — fixed to `#8e857a`). Touch targets ≥44px. Focus rings visible.

**Components to reuse:** hero, highlight cards, itinerary timeline, hotel cards + tier tabs, the price calculator, FAQ accordion, info-blocks, final-CTA, sticky inquiry bar. Anatomy in `PROJECT-INTELLIGENCE.md §3`.

---

## 📣 FOR THE MARKETER

**Conversion model:** WhatsApp-first. Every surface drives to a WhatsApp chat with a pre-filled localized message (sticky bar, floating FAB, hero CTA, final CTA, per-hotel buttons). There is no funnel/checkout — the "conversion" is an inbound WhatsApp/call. Phone lines + socials are in §Owner.

**SEO state (good — protect it):** rich JSON-LD on every page (TravelAgency with geo/contactPoint/sameAs, TouristTrip+Offer, FAQPage, BreadcrumbList, WebSite+SearchAction), full OG/Twitter cards, canonical, geo meta, sitemap + robots. Per-page OG images in `assets/images/og/`.
- **Known SEO limitation:** the site is **French-only for Google.** EN/AR exist but are swapped client-side (JS), so search engines don't index them. If AR/EN organic traffic becomes a goal, that requires an architecture change (`/fr /en /ar` URLs + build) — see `PROJECT-INTELLIGENCE.md §2`.

**Content cadence:** trips are **seasonal** — dates and prices go stale fast. The brochure PDFs in `source of truth/` are the truth; get them updated each season and have a dev/AI apply them. **Stale departure dates are the #1 content rot** (we found past dates shown as current).

**Copy governance (same legal rules as §Owner — non-negotiable in ads + on-page):** no visa fees, no guaranteed timelines, no fake scarcity/badges/ratings, no claimed partnerships, no supplier names. Scarcity language must be *true* (real departure count). Hedge embassy timings. These protect against legal complaints and platform ad rejections.

**Trust assets that work:** "1 200+ voyageurs depuis 2019", real testimonials, the all-inclusive honest price calculator, the 3 physical branches, the visa-service transparency ("non affilié" disclaimer).

---

## 🤖 FOR THE AI ASSISTANT (future Claude / Cursor / etc.)

**Onboard in this order:** (1) this bible, (2) `PROJECT-INTELLIGENCE.md §13` (the paste-ready compressed context block — load it into working memory), (3) `data/trips/SCHEMA.md` if touching trips, (4) `docs/SCAN-*` + `docs/AUDIT-*` for known issues.

**Hard rules for any change:**
- Obey the **governance list** (§Owner) — it's compliance, not preference.
- **Verify both sides of every contract** before "fixing": a JS selector or CSS rule that matches nothing fails silently; don't fix dead code as if it were live (we wasted effort on this twice). Confirm a finding is LIVE.
- **Sync class + ARIA together** for stateful controls (the date-picker bug was exactly this).
- **One reveal system** — don't add `data-fx` to AOS elements (double opacity-0 = stuck-hidden).
- **Scoped commits**, check git state first — concurrent sessions share this tree.
- **Don't break SEO** — preserve JSON-LD, meta, canonical, inline content.
- Prefer **small self-verifying tasks**; large background agents have repeatedly died on session limits mid-task and lost work.
- The project memory + global rules live in `~/.claude/` (CLAUDE.md, the project `memory/`). There's a noted **concurrent-sessions hazard** memory.

**Verification loop:** `node --check` JS, render in a static server, resize 375→1440, check console for errors, screenshot. The preview MCP tools are available.

---

## 📂 SHARED REFERENCE

**Key docs:**
- `docs/PROJECT-INTELLIGENCE.md` — strategic playbook + every lesson + V2 plan + compressed context.
- `docs/DEPLOY.md` — the go-live runbook. **Stale:** written for Cloudflare Pages, never updated for Vercel. `vercel.json` is the truth.
- `docs/SCHEMA.md` (`data/trips/`) — the trip data model + per-page variations.
- `docs/SCAN-2026-06-12-naming-perf.md`, `docs/AUDIT-2026-06-05-MASTER.md` — known issues.
- `docs/LESSONS.md`, `docs/STORY.md` — history.

**Credentials/access a successor needs** (hold these, don't lose them):
| What | Where | For |
|---|---|---|
| GitHub repo | `github.com/Brvetr4ve1er/alliancetravel34` | source + auto-deploy trigger (branch `integrate/unified-admin`) |
| Vercel | the project serving `alliance-travel.dz` | hosting, build, serverless functions, custom domain, env vars |
| Domain registrar | `alliance-travel.dz` | DNS for the custom domain |
| Supabase | project referenced in `site/assets/js/lead-config.js` | admin auth + the leads table |

**Glossary:** *scroll-hero* = parallax bg/fg hero; *TRIP_DATA* = inline calculator data per trip; *MapBase* = shared MapLibre helper; *data-fx / AOS* = the two reveal systems; *inclus* = included/excluded list; *source of truth* = brochure PDF folder (local only, gitignored); *B2B brochure* = supplier sheet (strip commission/supplier).

**Open tasks at handoff:** the 2026-06 handoff list (finish the generator → extract the pages → owner self-editing → parse the PDFs → build Tunisia → merge `refactor/trim-v26`) is **done**. What remains is the standing debt in §Known bugs/debt, plus keeping seasonal trip data current.

---
*If you read only one thing: trip pages are generated (`data/trips/*.json` → `tools/build.mjs`) so edit the JSON, not the HTML; production is Vercel off `integrate/unified-admin`; and never break the governance rules. Everything else is in the two docs.*
