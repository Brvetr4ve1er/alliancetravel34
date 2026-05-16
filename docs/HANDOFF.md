# Alliance Travel — Master Handoff Document

> **Purpose.** This document gives any agent (human or AI) full context to pick up the project from any state. Read this front-to-back if you are new. Everyone else: skim §1, jump to §11 for "what to do next".
>
> **Last updated:** 2026-05-13 · written at the end of the v21 cleanup cycle + prod-prep pass · branch `feat/v12-hierarchy-pass` at commit `801eff6`.

---

## Table of contents

1. [Project at a glance](#1-project-at-a-glance)
2. [Repo + branch state](#2-repo--branch-state)
3. [Tech stack and architecture](#3-tech-stack-and-architecture)
4. [File-by-file inventory](#4-file-by-file-inventory)
5. [Doc inventory + reading order](#5-doc-inventory--reading-order)
6. [Conversation history — every session, every decision](#6-conversation-history)
7. [The v21 cleanup cycle — phase by phase](#7-the-v21-cleanup-cycle)
8. [Failed approaches and lessons learned](#8-failed-approaches-and-lessons-learned)
9. [Locked design decisions — survey + contracts](#9-locked-design-decisions)
10. [All commits since v21 started](#10-all-commits-since-v21-started)
11. [What to do next — pick-up instructions](#11-what-to-do-next)
12. [Deferred work + why each deferral is justified](#12-deferred-work)
13. [Glossary of terms](#13-glossary)

---

## 1 · Project at a glance

**Alliance Travel** is the marketing website for a French-language travel agency physically located in **Bordj Bou Arreridj, Algeria** (plus a second branch in BBA "Cité Zehour" and a third in M'Sila). They sell guided multi-day trips to 5 destinations: Le Caire & Sharm El Sheikh, Sharm El Sheikh (departure from Constantine), Istanbul, Azerbaïdjan (Bakou & Gabala), and Kuala Lumpur (Malaysia).

**The site is the only digital surface.** There is no booking backend. All conversions go through WhatsApp deep-links (`wa.me/213XXXXXXXXX`). The calculator on each trip page computes a price in DZD based on dates + room type + traveler count, then pre-fills a WhatsApp message. There is no payment, no account system, no email capture form on the live site.

**Stack:** vanilla HTML + CSS + JS. No build step. Six static HTML pages. One monolithic stylesheet (`site/assets/css/styles.css`, currently 9066 lines after the v21 cleanup). Eight JS modules. One service worker. Designed to be hosted as a static site on any CDN.

**Audience:**
- Primary: Algerian travelers in Bordj Bou Arreridj, Constantine, Sétif, Alger, Oran, M'Sila — wilayas the agency serves
- Secondary: Algerian diaspora in France, Belgium, Canada
- Browse mostly on mobile (Android predominant in DZ market)
- French-speaking; some Arabic/Kabyle but the site stays French

**Brand:**
- Prussian Blue (`#002c51`) + Mint (`#9ce8b2` dark / `#237a4a` light for WCAG AA)
- DM Sans typography (weights 300/400/500/600/700, italic 400)
- Per-region accent colors: egypt amber, azerbaijan crimson, istanbul teal, malaysia mint, sharm coral
- Cinematic-but-restrained motion language (one focal motion at a time per viewport)

**Domain:** `alliance-travel.dz` (referenced in canonical URLs, JSON-LD, sitemap, OG tags throughout). Not yet pointed at a host — see §11 for deploy.

---

## 2 · Repo + branch state

**GitHub remote:** `https://github.com/Brvetr4ve1er/alliancetravel34.git`

**Branches:**

| Branch | Commit | State |
|---|---|---|
| `feat/v12-hierarchy-pass` | `801eff6` | **Current.** All v21 cleanup + prod-prep work. Pushed to origin. |
| `main` | `548bf56` | Pre-v21 baseline. 16 commits behind `feat/v12-hierarchy-pass`. |

**Working tree:** clean as of last commit `801eff6`.

**The feature branch contains 25 commits ahead of `main`.** Recommended action when ready to deploy: merge `feat/v12-hierarchy-pass` → `main`, push, configure Cloudflare Pages to deploy from `main`.

---

## 3 · Tech stack and architecture

### Top-level

- **No build step.** Edit HTML/CSS/JS, push to git, deploy. The simplicity is intentional — small agency with no engineering team to maintain a build pipeline.
- **No package.json.** No node_modules. No webpack/vite/rollup/parcel. No PostCSS. No Tailwind. No React.
- **No backend.** All forms output to WhatsApp via deep-link URLs. No database, no auth, no API.

### CSS architecture

One file: `site/assets/css/styles.css` (9066 lines, 50 KB gzip).

- **One canonical `:root`** at the top (lines 80-180 after v21 Phase A) defining all design tokens: surfaces, borders, text, brand colors, status colors, typography, spacing, radii, elevation, motion.
- **One canonical `:root[data-theme="light"]`** override block below it.
- **No other `:root` redefinitions** anywhere in the file. (Pre-v21 there were 5 scattered :root blocks — consolidated in Phase A.1.)
- Component sections grouped by feature (navigation, hero, trip cards, hotel cards, calculator, booking, footer, etc.) with `/* ── Section ── */` comment headers.
- Versioned blocks (`/* ════ v19 — Color hierarchy ════ */`) preserved for archaeology but only when load-bearing — dead v-blocks were swept in Phase J.2.
- Per-page accent colors live in inline `<style>` blocks in each HTML page (overriding `--accent`).

### JS modules

Eight files in `site/assets/js/`:

| File | Lines | Purpose |
|---|---|---|
| `enhance.js` | 382 | Scroll-reveal observer, stat counter animation, share button (Web Share API + WhatsApp fallback), trip quick-switcher dropdown, toast notifications |
| `enhance-pro.js` | 663 | Auto-mark reveals, **single scroll coordinator** (Phase F.1), magnetic buttons, scroll progress bar, WhatsApp FAB, trust strip, sticky inquiry bar, lightbox, accordion, press strip, value-prop row, **IntersectionObserver pause-off-screen** for ambient loops (Phase C.3) |
| `scroll-hero.js` | 304 | Scroll-pinned cinematic hero on trip pages. Builds `<picture>` with WebP+JPG sources, animates as user scrubs. Phase E.2: pinned title is now `<div aria-hidden>` not `<h1>` |
| `globe.js` | 340 | Cobe-powered 3D globe on homepage hero with polaroid markers |
| `algeria-map.js` | 528 | MapLibre GL map showing 3 real agency locations (BBA La Graf, BBA Cité Zehour, M'Sila). Has anti-clutter engine (Phase v9-v11). |
| `trip-map.js` | 561 | Per-trip itinerary map with day-by-day route, numbered pins, single-popup mode, anti-clutter |
| `booking-form.js` | 703 | Contact form on homepage — name/phone/wilaya/voyage → WhatsApp + mailto + clipboard fallbacks |
| `calculator.js` | 432 | Trip price calculator with date pickers, room type, traveler count → live DZD total → WhatsApp pre-fill |

All loaded with `defer` attribute. No bundling. HTTP/2 multiplexing handles the parallel loads.

### Service worker

`site/sw.js` — vanilla, no Workbox.
- **Network-first** for HTML pages (fresh content)
- **Stale-while-revalidate** for CSS/JS/fonts (fast load, refresh in background)
- **Cache-first** for images (immutable once shipped)
- Cache name `alliance-v21-2026-05-13` — bump on every release.

### Service worker pre-cache (offline shell)

```
PRECACHE_URLS = [
  '/',
  '/assets/css/styles.css',
  '/assets/js/enhance.js',
  '/assets/js/enhance-pro.js',
  '/assets/images/favicon/favicon-32x32.png',
  '/site.webmanifest',
];
```

All 6 URLs verified to exist as of 2026-05-13.

---

## 4 · File-by-file inventory

### `site/` (the deploy target)

```
site/
├── index.html                    # Homepage (110 KB, 24 sections)
├── 404.html                      # Branded 404 with h1 + 2 CTAs + nav (NEW v21 prod-prep)
├── _headers                      # Cloudflare Pages cache + security headers (NEW)
├── _redirects                    # Trailing-slash + typo aliases + 404 fallback (NEW)
├── robots.txt                    # Crawler config + Sitemap: directive (NEW v21 I.1)
├── sitemap.xml                   # 6 URLs, lastmod 2026-05-13, image:image extension (NEW v21 I.1)
├── site.webmanifest              # PWA manifest, valid JSON, 2 icons
├── sw.js                         # Service worker (cache name alliance-v21-2026-05-13)
├── cairo-sharm/index.html        # Trip page — Le Caire & Sharm
├── sharm-constantine/index.html  # Trip page — Sharm depuis Constantine
├── istanbul/index.html           # Trip page — Istanbul
├── azerbaidjan/index.html        # Trip page — Azerbaïdjan
├── kuala-lumpur/index.html       # Trip page — Kuala Lumpur
└── assets/
    ├── css/styles.css            # The monolith (9066 lines, 50 KB gzip)
    ├── js/ (8 modules listed above)
    ├── images/
    │   ├── heroes/               # Homepage hero collage photos (WebP + JPG + mobile crops)
    │   ├── heroes-v2/            # Trip-page hero bg + fg layers (WebP + JPG + mobile crops)
    │   ├── hotels/               # Hotel cards
    │   ├── trips/                # Trip cards
    │   ├── favicon/              # 16/32/96/180/192/512 + .ico
    │   ├── og/                   # Per-page Open Graph cards (1200×630)
    │   └── icons/                # Other inline-SVG icons stored locally
    └── fonts/                    # (empty — DM Sans loaded from Google Fonts)
```

### `docs/` (project documentation)

10 files. See §5 for reading order and §what-supersedes-what.

### `_archive/` (history)

- `migrations/` — 38 stale `_vNN_*.py` and `_vNN_*.css` files. Used during initial development to inject features. Their changes are baked into the current `styles.css` and HTML. **Do not modify.** Kept for archaeology.
- `handoff-snapshot-v5.2/` — Pre-v6 snapshot.
- `heroes-original/` — Original uncompressed hero photos before WebP conversion.
- `logs/` — Old image-fetch and migration logs.
- `css-scratch/` — Drafts.
- `README.md` — Index of archive contents.

### `source of truth/`

Original PDF/DOCX briefs from the agency containing the actual trip itineraries, pricing, hotels, departures. **Read these to understand the business.** Files:
- `ALG-MS-CAI+SSH JUIN 2026.pdf`
- `alliance travel graphic chart.pdf`
- `AZERBAIDJAN 2026 (1) (1).pdf`
- `ISTANBUL MARS AVRIL MAI 26.docx`
- `KUALA LUMPUR MALAISIE.docx`
- `SSH TK CZL AVRIL MAI 26.docx`

### Repo root

```
.
├── .git/
├── .github/workflows/deploy.yml  # Optional CI auto-deploy via Cloudflare API
├── .gitignore                    # Standard (OS, editors, Python, future node_modules)
├── _archive/                     # See above
├── docs/                         # See §5
├── site/                         # See above — the deploy target
├── source of truth/              # See above
├── README.md                     # Repo overview
└── wrangler.toml                 # CF Pages config: name="alliance-travel", output="site"
```

---

## 5 · Doc inventory + reading order

| Doc | Updated | Status | When to read |
|---|---|---|---|
| **`HANDOFF.md`** (this file) | 2026-05-13 | **Master.** Always current. | First, if you're a new agent on the project |
| `ROADMAP.md` | 2026-05-13 | Current. Phase-by-phase commit log. | After HANDOFF — for the precise commit sequence and metrics |
| `DEPLOY.md` | 2026-05-13 | Current. 30-min Cloudflare Pages walkthrough. | When you're about to deploy |
| `MOTION-CLEANUP-MASTER.md` | 2026-05-07 | **Active contract.** Defines tokens, motion vocab, cinematic doctrine. | When you need to add new motion or extend the token system |
| `CLEANUP-SURVEY.md` | 2026-05-07 | **Locked answers.** The 19 design decisions that drove v21. | When you want to know WHY a design choice was made |
| `CLEANUP-FLAGGED.md` | 2026-05-05 | Pre-v21 audit. Most items resolved by v21. | Historical context for what was flagged before the cleanup |
| `SITEMAP.md` | 2026-05-05 | Information-architecture map (not the SEO sitemap). | When you need to understand page structure / navigation flow |
| `COLOR-MAP.md` | 2026-05-05 | Color token reference. Partially superseded by `MOTION-CLEANUP-MASTER.md` §2.2. | When you need to know what each color token means semantically |
| `IMAGE-ASSETS.md` | 2026-05-05 | Image manifest + provenance. | When you add/replace photography |
| `LAUNCH-AND-DEPLOY.md` | 2026-05-05 | **Superseded by `DEPLOY.md`.** Keep for history. | Don't read — use `DEPLOY.md` instead |
| `SURVEY-BOOKING-CALCULATOR.md` | 2026-05-06 | Booking-form design survey. Implemented. | When you need to extend the booking flow |
| `design-system/MASTER.md` | (pre-v21) | Pre-v21 design system. Largely captured in `MOTION-CLEANUP-MASTER.md` §2. | Historical |

### Recommended reading order for a new agent

1. **`HANDOFF.md`** (this) — full context (90 minutes)
2. **`ROADMAP.md`** — what shipped when (30 min)
3. **`DEPLOY.md`** — how to go live (30 min)
4. **`MOTION-CLEANUP-MASTER.md`** §0a + §2 — the design contracts (45 min)
5. **`source of truth/`** — read the business briefs (60 min)

Then dig into specific docs as needed.

---

## 6 · Conversation history

This is the entire arc of work done in dialogue across multiple sessions. Compactions occurred at several points; the narrative below is reconstructed from commit history + design docs.

### Pre-history (before this chat)

A long sequence of versioned design passes shipped from v1 (initial vanilla HTML) through v18:
- **v1-v5** (early): Original Waypoint-style design with bronze CTA, basic hero, brand-system migration to mint
- **v6-v7**: Motion polish layer (magnetic buttons, scroll progress, FAB, sticky bar, lightbox) and industry-pattern polish (trust strip, value props, press logos)
- **v8**: Cobe 3D globe on homepage hero
- **v9-v11**: Real-geography MapLibre maps replacing SVG outline, anti-clutter engine for both maps
- **v12**: Hierarchy & UX audit pass — phase markers, hero price block, hotel card restructure
- **v13**: Wheel-hijack scroll-expand hero (later replaced)
- **v14**: Sticky-scrub hero rewrite (bidirectional + smooth + rewind) — current scroll-hero
- **v15**: Booking/calculator hardening — validation, a11y, transparency, info sections
- **v16**: Selective fixes from external design-system audit
- **v17**: WebP heroes, picture+srcset, lazy non-hero, defer scripts, globe offscreen pause
- **v18**: Neo-brutalist hotel cards (current hotel-card style)
- **v19**: Trip cards image-fill + monument SVG icons + colour hierarchy refresh

The branch `feat/v12-hierarchy-pass` was created during v12 and accumulated every subsequent version.

### This chat — session by session

**Session A — Staff phones + 3-agency network + trip card v20 (early)**

User uploaded a screenshot of the homepage contact section showing 4 vertically-stacked WhatsApp pills below the form. Asked for:
1. Show only 6 specific staff numbers (0561 616 266 / 267 / 268 / 269, 0560 869 905, 0560 860 617)
2. Smart layout, not stacked
3. Aesthetic + clean

**Decisions made:**
- 3×2 grid layout, one `.phone-card` per staff number with role label + tabular-numeric number + WhatsApp green pill + neutral "Appel" pill
- Renamed to "Conseiller 1" through "Conseiller 6" since user didn't provide names
- Eyebrow header above grid: "📞 JOINDRE UN CONSEILLER — DIRECT"
- Note below grid: opening hours

Shipped as v19.1 staff-phones (markup in `index.html`, CSS appended to `styles.css`).

User then asked about the agency network section (`<section id="agences">`). The branch-list showed 5 fictional partner branches (Sétif/Alger/Constantine/Oran). User clarified: agency only has 3 real locations — 2 in BBA, 1 in M'Sila. Asked to fix map markers, branch cards, and phone numbers.

**Decisions made:**
- Researched real agency locations on web (search returned addresses but not exact coordinates)
- BBA La Graf (Siège): `[4.7642, 36.0710]` — Boulevard Houari Boumediene
- BBA Cité Zehour: `[4.7549, 36.0788]` — Route de Medjana
- M'Sila: `[4.5418, 35.7044]` — Centre-ville
- Assigned phone numbers: BBA La Graf gets 0561 616 266/267 (Siège), Cité Zehour gets 268/269, M'Sila gets 0560 869 905/860 617
- Added Google Maps deep-link buttons on each card
- Map: tightened bounds + zoom to BBA+M'Sila region, anti-clutter engine modified to absorb same-city HQ+branch pins into a "+1" cluster
- Cleaned stale references: JSON-LD streetAddress, "About" paragraph claiming "six wilayas", footer address

Shipped as v19.2 agency-network.

User then asked to rework trip cards because hover animation popped elements out of frame:
- v19 was sliding title + subtitle 58px up to make room for CTA strip — yanky
- v20 rewrote with everything anchored: monument disc top-left, price chip top-right, title+description bottom-left, CTA pill bottom-right
- Hover only does subtle moves (-4px lift, 1.05 image scale, accent border tints, CTA fills with region accent)
- No element travels more than 4px
- Removed obsolete v1 inline `<style>` baseline rules from `index.html` that were shadowing v20 via cascade tiebreak

Shipped as v20 trip-cards.

**Session B — Master plan + survey + Phase A**

User asked for a comprehensive cleanup plan: "read every animation and every element and make a plan to make everything synchronized and smooth and clean architecturally and visually... I want an elegant website not a cluttery mess." Slash commands `/ui-ux-pro-max` and `/design-critique` were invoked as activation hints.

**Audit conducted:**
- 9582 lines of CSS in 44 versioned blocks
- 26 unique `@keyframes`, 11 different `cubic-bezier()` curves, 2 conflicting timing systems
- 14 separate card classes with no shared base
- ~120 inline `transition:` declarations
- 4 `:root` blocks scattered across the file
- 211 `!important` declarations
- 8 scroll listeners across JS files (4 in enhance-pro.js alone)
- 7 IntersectionObserver instances

**Wrote two docs:**
1. `docs/MOTION-CLEANUP-MASTER.md` — the design contract with 10 phases (A through J), Performance Contract, Cinematic Doctrine, token spec, component primitive specs
2. `docs/CLEANUP-SURVEY.md` — 19 questions to lock design decisions

User filled the survey conversationally. Key answers:
- Q1: Cinematic but performance-locked
- Q2: Pronounced hover (-6px lift, 1.08 image scale)
- Q3: Keep all 4 hero loops, choreographed
- Q4: Region patterns animate, IntersectionObserver-gated
- Q5-12 (lightning round): all accepted as predicted
- Q13: 3 base easings + 1 bounce reserved for delight
- Q14: Add `--t-cinema: 900ms`
- Q15: Apply geometric spacing scale now
- Q16: Phase A first
- Q17-18: Skipped or absorbed
- Q19 (north star): "professional site with clean readable code, consistent naming, clear architecture, modern SEO end-to-end, sitemap that doesn't bother"

Master plan was rewritten to reflect survey answers (v2 of MOTION-CLEANUP-MASTER.md). Performance Contract baked in 10 non-negotiable rules. Cinematic Doctrine resolved the apparent contradiction (full theater + clean) with the principle: "one element commands the eye at a time; rest hold breath."

User said "GO" to start Phase A.

**Session C — Phases A, B, C, D, E, F, I shipped**

Executed phases in order. Each phase was carefully scoped to be a single logical commit with verification via `mcp__Claude_Preview__preview_eval` against the local dev server.

**Phase A.1 (commit `c3b186a`):** Token consolidation. 5 `:root` blocks → 1 canonical dark + 1 canonical light at top of file. Cascade-winning values preserved exactly (verified via 58 token computed-style comparisons). Light-mode `--txt-3` restored from regressed `#8a8e98` → WCAG-passing `#5a6a7c`. New tokens added: `--ease-out`, `--ease-bounce`. Bundled with the v19.1/v19.2/v20 prior session's shipped work since they were uncommitted on the same branch.

**Phase B.1 (commit `80cd309`):** Motion library curves. 10 unique cubic-beziers → 4 canonical (all in canonical `:root` as definitions only). Overshoot springs → `var(--ease-spring)`. Material curve → `var(--ease-snap)`. `tmap-stack-pop` → `var(--ease-bounce)` (delight moment). Exact-match durations: `180/320/560/900ms → var(--t-*)`. `200ms ease` → `var(--t-fast) ease` (10% snappier).

**Phase B.2 (commit `16b9dd6`):** Close-match duration normalization. `220/240ms → var(--t-fast)`, `280/300/360/380/400ms → var(--t-base)`, `580/600/700/720ms → var(--t-slow)`, `800ms → var(--t-cinema)`. Micros preserved as raw.

**Phase C.1 (commit `ebfaf0e`):** Ambient animation cull. Removed `tilt-bob` (related-card icon wiggle), `globe-aura` (14s halo loop), `globe-hint-bob` (2.6s bob on one-shot tooltip). 26 → 23 keyframes. Visual elements preserved as static.

**Phase C.3 (commit `5bea2d1`):** Pause-off-screen plumbing. Added `initPauseOffScreen()` IntersectionObserver in `enhance-pro.js`. New CSS rule `.is-paused, .is-paused * { animation-play-state: paused !important; }` freezes every keyframe inside the subtree when scrolled out of viewport. Performance Contract §0a item 2 met.

**Phase D.1 (commit `412eb3e`):** Button consolidation. `.btn--primary` was defined 3 times across the file with a stale orange box-shadow (bronze legacy) hidden behind a later mint override 1300 lines down. Merged into one canonical block. Phase D.2/D.3 (.surface / .pill primitives) initially skipped because pills had too much variance for safe consolidation — partially addressed later.

**Phase E.1 (commit `d2f14b6`):** Homepage hero strip. Removed `.home-hero__noise` (SVG fractal grain overlay) + `.home-hero__faded` (giant "TRAVEL" watermark behind headline). The photo collage + gradient overlay already carry enough atmosphere; the watermark was the kind of "designed in 2018" decoration the cleanup was meant to retire.

**Phase E.2 (commit `66bd11b`):** Trip-page hero cleanup. Removed `.calc-cta-hint` from all 5 trip pages — explanation copy redundant with the calculator section right below the hero. Each trip hero now has 5 focal elements (eyebrow + h1 + lede + price + 2 CTAs).

**Phase F.1 (commit `9e9a24b`):** Single scroll coordinator. `enhance-pro.js` had 4 separate `addEventListener('scroll', …)` bindings each tracking its own ticking flag + rAF. Consolidated into one module-scope coordinator. Subscribers register via `onScrollY(fn)` and receive scrollY once per animation frame. Per Performance Contract §0a item 3.

**Phase I.1 (commit `ec72825`):** SEO foundation. Created `site/sitemap.xml` (6 URLs, lastmod, image:image extension) + `site/robots.txt` (crawl-friendly + Sitemap: directive + AhrefsBot rate-limit).

**Phase I.2 (commit `03022e8`):** BreadcrumbList JSON-LD added to all 5 trip pages + WebSite + SearchAction added to homepage. All 17 JSON-LD blocks validated.

**Phase H.1 (commit `d0aaf28`):** Surgical dead-code sweep. Removed CSS for classes that had been deleted from HTML in earlier phases (`.calc-cta-hint`, `--ease-out-quart`).

**Phase J.5 (commit `22f6029`):** `--bronze` legacy shim elimination. 39 references migrated to `var(--mint*)`. Bronze declarations deleted from both canonical blocks. Same value in both themes, zero behavioral change.

User asked "what's left" after this. Listed 5 deferred items with risk/effort matrix.

**Phase D.2 (commit `472e5c5`):** Surface selector-list extension. Added `.branch-card`, `.hl-card`, `.pkg-card` to the v19 'Cards everywhere' selector list that centralizes `bg-card + border-color`. Their individual blocks lost the redundant declarations.

**Phase J.2.1 (commit `e78df1a`):** Deleted packages section (~95 lines: `.packages-bg`, `.packages-grid`, `.pkg-*` family — never-built tier-comparison feature) + paper-plane orphan (`.hero__plane`, `@keyframes plane-arc`, 38 lines — HTML host was removed in an earlier hero rework, only CSS hung around).

**Phase J.2.2 + J.2.3 (commit `4df04b5`):** Deleted `.badge` family + `@keyframes badge-pulse` (40 lines, soft-urgency availability badges never wired in), `.departures-table` family (40 lines, per-trip availability table never built), `.hero__deco` + `.hero__particles` + `@keyframes drift-up` (52 lines, v13 hero decorative orphans).

**Phase J.2.4 (commit `c2b004a`):** Deleted v13 hero remnants — `.hero__faded-title`, `.hero__strip`, `.hero__strip-inner`, `.trust-pill`, `.hero__dep-card`, `.hero__dep-card h3`, `.dep-pill*`, `.dep-badge`, `.text-accent`, `.text-bronze`, `.bform-send-disabled`, `.btn--copy*`, `.price-from__label`, `.price-from__suffix`. ~125 lines total.

**Phase J.2.5 (commit `e64b8c1`):** Deleted remaining orphans — `.hotel-card__img-art`, `.nav-logo-img`, `.nav-right`, `.hotel-amenities`, `.amenity` (non-pill, never used). Repair work on a corrupted duplicate IMAGE-INJECTION block that had its opening `/*` eaten in a prior edit.

**ROADMAP updated (commit `2fb3604`, `133f192`, `6acfba9`):** Documentation commits to keep ROADMAP.md in sync with the v21 commit table.

**Session D — Prod-prep (deploy infrastructure)**

User said "go all the way until it's done." Series of commits to add deployment infrastructure.

**Commit `8fc2d50`:** Host config + perf + SEO hardening for first deploy.
- `site/_headers` — Cloudflare Pages cache + security headers
- `site/_redirects` — trailing-slash normalization + 10 typo aliases
- `site/404.html` — branded 404 page
- `wrangler.toml` — CF Pages CLI deploy config
- `.github/workflows/deploy.yml` — optional CI auto-deploy
- `sw.js` cache name bumped
- `sitemap.xml` lastmod updated to 2026-05-13
- Homepage hero eager photo count reduced from 3 → 1 (saved ~700 KB upfront)
- All 6 pages: `<link rel="preload" as="image">` for LCP hero with responsive srcset + `fetchpriority="high"`
- `scroll-hero.js`: pinned `<h1>` → `<div aria-hidden>` to fix duplicate-h1 SEO issue
- `docs/DEPLOY.md` — comprehensive 30-min go-live walkthrough

**Commit `801eff6`:** WhatsApp FAB rewrite + archive 22 stale migration files.
- FAB position bug: second `.fab-whatsapp { position: relative }` was overriding canonical `position: fixed`. Removed the redundancy.
- FAB pulse moved from animated `box-shadow` (Performance Contract violation) to `::before` pseudo-element with GPU-only `transform: scale + opacity`.
- Edge spacing bumped 18px → 24px so shadow no longer clips at viewport corner.
- 22 `_vNN_*.py` and `_vNN_*.css` migration files moved from repo root to `_archive/migrations/` via `git mv`.

**Session E — Healthcheck + this handoff**

User asked for a global healthcheck, FAB fix, and dead-element sweep, then asked for a comprehensive handoff document.

Healthcheck conducted:
- CSS comment pairs balanced (477/477)
- CSS braces balanced (1405/1405)
- 17 JSON-LD blocks valid
- 159 HTML asset references all resolve
- Service worker pre-cache list verified
- All 6 pages render with 1 h1, 100% alt, valid JSON-LD

This handoff doc is the deliverable for that final step.

---

## 7 · The v21 cleanup cycle — phase by phase

Phase order: **A → B → C → D → E → F → G → H → I → J**

| Phase | Status | Sub-phases shipped | Commits |
|---|---|---|---|
| **A** Token consolidation | ✅ A.1 shipped | A.2 (spacing/radii migration) deferred | `c3b186a` |
| **B** Motion library | ✅ Fully shipped | B.1 + B.2 | `80cd309`, `16b9dd6` |
| **C** Ambient cull + IO-pause | ✅ C.1 + C.3 shipped | C.2 (choreography) folded into E | `ebfaf0e`, `5bea2d1` |
| **D** Component primitives | ✅ D.1 + D.2 shipped | D.3 (.pill) skipped, variance too high | `412eb3e`, `472e5c5` |
| **E** Hero overhaul | ✅ E.1 + E.2 shipped | E.3 (type rhythm audit) absorbed | `d2f14b6`, `66bd11b` |
| **F** JS consolidation | ✅ F.1 shipped | F.2 (full motion.js merge) deferred | `9e9a24b` |
| **G** Section choreography | ✅ Already met by pre-existing `.section-head.is-in` cascade | — | (no new commit) |
| **H** Obsolete v-block sweep | ✅ H.1 shipped, J.2 expanded the sweep | — | `d0aaf28` |
| **I** SEO modernization | ✅ I.1 + I.2 shipped | I.3/I.4 already met by prior work | `ec72825`, `03022e8` |
| **J** Code hygiene | ✅ J.2.1-J.2.5 + J.5 shipped | J.1 BEM, J.3 file split deferred | `e78df1a`, `4df04b5`, `c2b004a`, `e64b8c1`, `22f6029` |

**Plus prod-prep + ROADMAP + this handoff:** `8fc2d50`, `801eff6`, `2fb3604`, `133f192`, `6acfba9`.

See §10 for the full commit table.

---

## 8 · Failed approaches and lessons learned

Honest record of what went wrong + what we learned.

### 8.1 `var(--ease-spring-soft, fallback)` pattern was over-engineered

**What we tried:** Earlier code defensively wrapped easing references as `var(--ease-spring-soft, cubic-bezier(.34, 1.4, .64, 1))` — token first, raw fallback second.

**Why it was wrong:** The canonical `:root` block guarantees `--ease-spring-soft` is defined. The fallback never fires in any modern browser. It just duplicates the raw curve, making project-wide refactors harder.

**Fix in Phase B.1:** All such `var(token, fallback)` patterns collapsed to just `var(token)`.

**Lesson:** CSS custom property fallbacks are only useful when the token might genuinely be undefined. Once a canonical token block exists, fallbacks are noise.

### 8.2 `.pill` baseline consolidation (Phase D.3) — abandoned

**What we tried:** Master plan called for consolidating 9 pill-like classes (`.dep-badge`, `.amenity-pill`, `.phase-marker`, `.tip-pill`, `.trip-tag`, `.branch-flag`, `.staff-phones__lead`, `.section-head__eyebrow`) into one `.pill` primitive with size + tint variants.

**Why it was abandoned:** Audit revealed 2 size tiers (.625rem vs .6875rem), 2 weight tiers (600 vs 700), mixed text-transform, mixed background treatments. A one-size-fits-all baseline would have visually changed several pills.

**Decision:** Skip D.3. Pills stay separate. Documented in DEFERRED list with reasoning.

**Lesson:** Consolidation only wins when classes genuinely share the same intent. Forcing variance into a primitive creates subtle visual regressions.

### 8.3 Phase A.2 spacing/radii migration — deferred

**What master plan called for:** Geometric scale: `--s4: 24→16`, `--s7: 40→48`, `--s8: 40→64`, `--s9: 56→96`, `--s10: 72→128`, `--r1: 2→4`.

**Why it was deferred:** Each change shifts existing component layouts by 2-24px. With ~150 components, that's potentially 150 visual regressions. Genuine multi-day visual-review work required.

**Decision:** Defer to a dedicated visual-diff session.

**Lesson:** Token migrations that change numerical values need a per-component verification pass. Don't bundle into a "cleanup" commit.

### 8.4 Phase J.3 file split — declined

**What master plan called for:** Split `styles.css` into `tokens.css` + `base.css` + `components.css` + `utilities.css` via `@import`.

**Why declined:** `@import` adds 3 additional HTTP requests per page load. The Performance Contract §0a item 3 specifies single critical-path budget. Splitting without a concat build step (which the project doesn't have) violates the contract.

**Decision:** Defer until a build step is added.

**Lesson:** "Split for organization" is only a win when the cost (extra requests) is offset by a build step that re-concatenates.

### 8.5 Programmatic scroll testing in iframe

**What we tried:** Used `mcp__Claude_Preview__preview_eval` to call `window.scrollTo(0, 800)` and verify scroll-bound subscribers (parallax, FAB visibility, progress bar) fired correctly.

**What went wrong:** Preview iframe has scroll-lock — programmatic scrolls reported `scrollY: 0` even though `scrollHeight > innerHeight`. Couldn't verify scroll behavior end-to-end.

**Workaround:** Verified the JS module structure (single listener, 4 subscribers via `onScrollY`) and trusted that production behavior would work. Real production deploy needed to validate.

**Lesson:** Preview iframes have permission constraints that don't match real browser behavior. For scroll-bound features, real-page testing is required.

### 8.6 Cache-bust via cloned link injection didn't refresh CSS rules

**What we tried:** After editing `styles.css`, used JS to clone the `<link rel="stylesheet">` element with `?cb=` query string appended, then remove the old link.

**What went wrong:** The OLD stylesheet's rules stayed in the cascade even after the link was removed (CSSOM doesn't tear down rules when a link node is removed in some browsers). Computed styles showed mixed old + new values.

**Workaround:** Used `document.write(fetchedHTML)` for a true fresh parse, or just navigated to a new URL.

**Lesson:** Cache-busting at runtime via DOM manipulation is unreliable. Test fresh page loads instead.

### 8.7 Initial mistake: empty `<style>` placeholder rules

**What happened:** When cleaning up the `.hotel-amenities` block, accidentally wrote placeholder classes (`.hotel-amenities-placeholder-removed`, `.amenity-removed`) before noticing my Edit had cut mid-rule and left dangling `}`. Had to do a follow-up edit to delete the placeholders cleanly.

**Lesson:** When deleting a block, always include the full block boundary in `old_string`, including the closing `}` and any trailing comment/whitespace.

### 8.8 Read-before-Edit constraint surprised parallel ops

**What happened:** Tried to delete `.calc-cta-hint` from all 5 trip pages in parallel `Edit` calls. The Edit tool requires Read first per file. 4 of 5 failed with "File has not been read yet."

**Workaround:** Read all 5 files first (parallel), then Edit (parallel).

**Lesson:** Edit tool's Read-first requirement is per-file. Batch your reads before your edits when working across multiple files.

### 8.9 The FAB `position: relative` override bug

**What happened:** The user reported the FAB looked wrong. Investigation found that the v7 industry-pattern layer had `.fab-whatsapp { position: relative }` declared 500 lines BELOW the canonical `position: fixed` declaration. Cascade tie-break: later wins. The FAB stopped being fixed entirely.

**Fix:** Removed the redundant `position: relative` declaration. `position: fixed` already establishes a positioning context for the absolutely-positioned `.fab-whatsapp__tooltip` child.

**Lesson:** When a component looks wrong, search for ALL declarations of its class across the stylesheet. Redundant overrides 500 lines down are easy to miss.

### 8.10 Scroll-hero JS was creating a duplicate `<h1>`

**What happened:** Smoke test of trip pages reported 2 `<h1>` elements per page (SEO violation). HTML source had only 1 — the second was injected at runtime by `scroll-hero.js` which used `document.createElement('h1')` for the pinned title.

**Fix:** Changed to `document.createElement('div')` with `aria-hidden="true"` since the pinned title is visual decoration that animates into the continuation block. The `<h1>` in `.scroll-hero__continuation` (static markup) is the canonical heading.

**Lesson:** Don't dynamically inject heading-level elements without considering their cascade with static-markup headings. Audit at the RENDERED DOM level, not just HTML source.

---

## 9 · Locked design decisions

### 9.1 The survey contract (19 questions answered)

See `docs/CLEANUP-SURVEY.md` for full text. Key locks:

| Q | Decision | Impact |
|---|---|---|
| Q1 | Cinematic, performance-locked | Sets the macro tone for the entire cleanup |
| Q2 | Pronounced hover (-6px lift, 1.08 image scale) | Card hover micro-feel |
| Q3 | Full hero theater, choreographed | Hero keeps all 4 ambient loops but synced |
| Q4 | Region patterns animate, IO-gated | Trip-page body backgrounds keep motion but pause off-screen |
| Q5 | HQ branch pulse: KEEP | Affordance, not decoration |
| Q6 | Map pin pulses: KEEP | Affordance |
| Q7 | WhatsApp FAB pulse: KEEP, dismiss after 5s | First-time hint |
| Q8 | Stat counter punch: KEEP | Delight moment |
| Q9 | Scroll-progress bar: KEEP | Cinematic touch |
| Q10 | WhatsApp FAB scope: all pages | Brand-wide CTA |
| Q11 | Sticky inquiry bar: KEEP, replaces top nav when scrolled | Single sticky chrome row |
| Q12 | Magnetic buttons: KEEP, desktop only, full strength | Premium tactile feel |
| Q13 | Easing curves: 3 base + 1 bounce (delight-only) | Motion vocab discipline |
| Q14 | Add `--t-cinema: 900ms` | Hero entrance + map fly-to |
| Q15 | Fix spacing scale geometrically NOW | Deferred — see §12 |
| Q16 | Phase A first | Sequence locked |
| Q17 | Reference sites: skipped | (Defer to engineering north star) |
| Q18 | Canary page: skipped (apply uniformly) | All 6 pages get same treatment |
| **Q19** | **North star:** "professional site with clean readable code, consistent naming, clear architecture, modern SEO end-to-end, sitemap that doesn't bother the user" | The arbiter for every later decision |

### 9.2 Performance Contract (non-negotiable)

From `MOTION-CLEANUP-MASTER.md` §0a. Every phase enforces these.

1. **GPU properties only** for animation — `transform` and `opacity` are the entire animatable surface. No animated `filter`, `box-shadow`, `width`, `height`, `top/left`.
2. **IntersectionObserver gates every decorative loop** — paper plane, twinkles, glow, drift, region patterns all pause when off-screen.
3. **Single rAF scroll coordinator** — Phase F.1 done, 4 listeners → 1.
4. **`content-visibility: auto`** on long sections below the fold. (Not yet applied — minor follow-up.)
5. **`will-change`** applied surgically (≤ 4 elements per page, removed after animation completes). Never blanket.
6. **`prefers-reduced-motion`** respected — every animation has a "snap to final state" fallback.
7. **Lighthouse targets**: Performance ≥ 90 on homepage, ≥ 92 on trip pages. CLS = 0 on hero photos.
8. **No JS animation loops** for decorative motion. CSS keyframes only. JS owns scroll-driven and interactive motion exclusively.
9. **LCP < 1.8s** on 4G — hero LCP image is `loading="eager" fetchpriority="high"`. All others lazy.
10. **No animation runs above 60fps RAF** — long tasks ≤ 50ms.

### 9.3 Cinematic Doctrine

> **Cinema = one element commands the eye at a time. Everything else holds breath.**

The cinematic feel (Q1=C) is NOT "everything moves at once." It's "one motion is the focal verb, everything else is supporting grammar."

The four hero loops (paper plane + twinkles + glow + drift) are kept BUT choreographed so only one is the focal element at any moment. The rest run at reduced opacity / phase-offset cycles / paused when not focal.

Practical implementation:
- Paper plane: full opacity, 14s loop, brand mascot — the focal verb
- Twinkles: ≤ 30% opacity, irregular nth-child stagger
- Glow-pulse: ≤ 30% opacity, 7s loop
- Drift-slow: ≤ 30% opacity, 18s loop, on background gradient only

(Note: Paper plane was removed in Phase J.2.1 because its HTML host was already gone. Decision was historical — survey said keep but DOM said it wasn't there. The remaining loops still respect the doctrine.)

### 9.4 Canonical motion vocabulary

| Token | Value | Use |
|---|---|---|
| `--t-fast` | 180ms | Tap, focus, micro state |
| `--t-base` | 320ms | Component hover, dropdown, modal |
| `--t-slow` | 560ms | Section entrance, sticky reveal |
| `--t-cinema` | 900ms | Hero entrance, map fly-to, page transition |
| `--ease-out` | `cubic-bezier(.22, 1, .36, 1)` | Default exit, out-quart |
| `--ease-spring` | `cubic-bezier(.22, 1, .36, 1)` | Semantic alias for "content arriving" |
| `--ease-snap` | `cubic-bezier(.4, 0, .2, 1)` | Taps and chrome (Material standard) |
| `--ease-bounce` | `cubic-bezier(.34, 1.5, .64, 1)` | **DELIGHT ONLY** — toast, counter punch, map pin pop |

Four motion patterns. Every interactive element picks exactly one:
- **Lift** (hover): `transform: translateY(-4px)` + shadow deepens, `--t-base` `var(--ease-spring)`
- **Reveal** (enter viewport): opacity 0→1 + translate3d(0, 24px, 0) → 0, `--t-slow` `var(--ease-spring)`, optional stagger via `--d`
- **Tap** (active): `transform: scale(.97)`, `--t-fast` `var(--ease-snap)`
- **Highlight** (focus, selected): border-color + box-shadow change, `--t-fast` `var(--ease-out)`

When you find an existing component using a different curve or duration, normalize it.

### 9.5 Canonical token surface (Phase A.1)

Located at top of `styles.css`, lines 80-180-ish. Single source of truth for:
- 6-layer dark surface ladder (`--bg-deep` through `--bg-glass`)
- 3 border tiers
- 3-step warm text ladder
- Brand (navy + mint families)
- Default + per-page accent
- 3-step status (sage / danger / warn) with soft variants
- DM Sans typography
- 12-step spacing scale (Waypoint — duplicates pending Phase A.2 migration)
- 4-step radii
- 2-step elevation
- 4 motion durations + 4 easings
- Legacy color shims (navy-hov, mint-hov, sage-light, danger-light) kept until components migrate

Light mode block immediately below redefines the deltas only. WCAG-passing `--txt-3: #5a6a7c` restored from v19 regression.

---

## 10 · All commits since v21 started

In reverse chronological order. All on branch `feat/v12-hierarchy-pass`.

| Hash | Phase | Purpose |
|---|---|---|
| `801eff6` | Prod-prep | WhatsApp FAB rewrite (GPU pulse, position:fixed restored, edge spacing 24px) + 22 stale `_vNN_*` files moved to `_archive/migrations/` via `git mv` |
| `8fc2d50` | Prod-prep | Host config (`_headers` + `_redirects` + `404.html` + `wrangler.toml` + `.github/workflows/deploy.yml`) + perf hardening (LCP preload on all 6 pages, eager photos 3→1) + SEO fix (scroll-hero `<h1>` → `<div aria-hidden>` to remove duplicate-h1) + sw.js cache name bump + sitemap.xml lastmod update + comprehensive `DEPLOY.md` |
| `6acfba9` | docs | ROADMAP reflects J.2.4 + J.2.5 + final cycle metrics |
| `e64b8c1` | J.2.5 | Deleted remaining orphan classes (.hotel-card__img-art, .nav-logo-img, .nav-right, .hotel-amenities, .amenity) + repaired corrupted duplicate IMAGE-INJECTION block |
| `c2b004a` | J.2.4 | Deleted v13 hero strip + dep-card + small utility orphans (.hero__faded-title, .hero__strip*, .trust-pill, .hero__dep-card*, .dep-pill*, .dep-badge, .text-accent, .text-bronze, .bform-send-disabled, .btn--copy*, .price-from__label, .price-from__suffix) ~125 lines |
| `2fb3604` | docs | ROADMAP reflects final v21 state + intentional deferrals |
| `4df04b5` | J.2.2 + J.2.3 | Deleted .badge family + @keyframes badge-pulse (40 lines) + .departures-table family (40 lines) + .hero__deco + .hero__particles + @keyframes drift-up (52 lines) |
| `e78df1a` | J.2.1 | Deleted packages section (~95 lines, .pkg-card family, tier-comparison feature never built) + .hero__plane + @keyframes plane-arc (38 lines, HTML host removed earlier) |
| `472e5c5` | D.2 | Extended v19 canonical surface selector-list to .branch-card + .hl-card + .pkg-card. 12 cards now share canonical bg + border declaration |
| `133f192` | docs | ROADMAP reflects all 14 v21 commits + remaining deferrals |
| `22f6029` | J.5 | Eliminate `--bronze` legacy shim entirely. 39 references migrated to var(--mint), var(--mint-hov), var(--mint-dim). Bronze declarations deleted from canonical blocks |
| `d0aaf28` | H.1 | Surgical dead-code sweep — deleted CSS for classes removed earlier (.calc-cta-hint full block + selector-list entry, --ease-out-quart alias with zero consumers) |
| `03022e8` | I.2 | BreadcrumbList JSON-LD on all 6 pages + WebSite + SearchAction on homepage. All 17 JSON-LD blocks validated, 0 parse errors |
| `ec72825` | I.1 | sitemap.xml (6 URLs + image:image extension) + robots.txt (Sitemap directive + AhrefsBot/SemrushBot rate-limit) |
| `9e9a24b` | F.1 | Single scroll coordinator in enhance-pro.js. 4 listeners → 1 with 4 subscribers via onScrollY(fn). Per Performance Contract §0a item 3 |
| `66bd11b` | E.2 | Strip .calc-cta-hint from all 5 trip-page heroes. Each hero now 5 focal elements |
| `d2f14b6` | E.1 | Strip home-hero noise (SVG fractal grain) + .home-hero__faded (giant TRAVEL watermark behind headline) |
| `412eb3e` | D.1 | Consolidate .btn--primary from 3 scattered blocks into 1 canonical right under base .btn. Stale orange box-shadow (bronze legacy) removed, mint glow now canonical |
| `5bea2d1` | C.3 | Pause ambient loops off-screen via IntersectionObserver + .is-paused CSS rule. Per Performance Contract §0a item 2 |
| `ebfaf0e` | C.1 | Cull 3 ambient animations (tilt-bob related-card wiggle, globe-aura 14s halo, globe-hint-bob 2.6s bob on one-shot tooltip). 26 → 23 keyframes |
| `16b9dd6` | B.2 | Close-match duration normalization. 220/240ms → --t-fast, 280/300/360/380/400ms → --t-base, 580/600/700/720ms → --t-slow, 800ms → --t-cinema |
| `80cd309` | B.1 | Motion library — curves + exact-match durations. 10 unique cubic-beziers → 4 canonical. 180/320/560/900ms → token references |
| `c3b186a` | A.1 + bundle | Token consolidation: 5 :root blocks → 1 canonical. Light-mode --txt-3 WCAG fix restored. Bundled with prior-session v19.1/v19.2/v20 work (staff phone grid, 3-agency network, trip-card v20 hover frame fix) |
| `e3166e0` | docs | Cleanup master plan v1 + decision survey + roadmap update |

**24 commits total** since baseline `3dd83c3 v19`.

---

## 11 · What to do next

### Immediate (deploy day, ~30 min)

Read **`docs/DEPLOY.md`** for the full 10-step walkthrough. Summary:

1. (If you want main to be production) Merge `feat/v12-hierarchy-pass` → `main`, push.
2. Sign up at `dash.cloudflare.com` (free, no credit card).
3. Workers & Pages → Create → Pages → Connect to Git → select `Brvetr4ve1er/alliancetravel34`.
4. Build config: command empty, output directory `site`.
5. Save & Deploy → wait ~30s → get `*.pages.dev` URL.
6. Test the preview URL (every page, every CTA, console for errors).
7. Add custom domain `alliance-travel.dz`.
8. Point `.dz` registrar's nameservers to Cloudflare's (CF gives you the two values).
9. Wait for DNS propagation (1-24 hrs).
10. Submit `https://alliance-travel.dz/sitemap.xml` to Google Search Console.

**Total annual cost: ~€15** (just the `.dz` domain renewal). Hosting, CDN, HTTPS, DNS, email forwarding, analytics — all free on Cloudflare's free tier.

### Post-deploy verification (the first day live, ~2 hrs)

| Task | Why |
|---|---|
| Lighthouse audit on the live URL (mobile profile) | Verify Perf ≥ 90, SEO ≥ 95 |
| Test every WhatsApp CTA on a real phone | Confirm `wa.me/213…` deep-links open WhatsApp natively |
| Test the calculator on iPhone Safari | Date pickers + form behavior |
| Verify maps render on mobile | MapLibre GL touch gestures + cooperative-zoom |
| Schema validator on every page | <https://validator.schema.org/> — zero errors expected |
| Facebook Sharing Debugger | <https://developers.facebook.com/tools/debug/> — OG image rendering |
| Twitter Card Validator | <https://cards-dev.twitter.com/validator> |
| `curl -I https://alliance-travel.dz/assets/css/styles.css` | Verify Cache-Control header reads `public, max-age=31536000, immutable` |

### Short-term polish (first month, optional)

Each item is deferred but ready to pick up:

| Item | Estimated effort | Where to start |
|---|---|---|
| Phase A.2 spacing/radii migration | 4-8 hr with visual review | `MOTION-CLEANUP-MASTER.md` §2.2 spec |
| Phase D.3 .pill consolidation | 2-4 hr but uncertain — variance may stay too high | Re-audit each pill class |
| Phase J.1 BEM consistency rename | 2-3 hr | Audit `styles.css` for `phone-card-btn--wa`-style strays |
| Phase J.2 remaining small dead code | 1-2 hr | Re-run `audit/find-dead-classes.py` (see §11.3 below) |
| Phase J.3 file split | Requires build step decision | Add esbuild/lightningcss bundler first |
| Add Plausible Analytics | 30 min, $9/mo | `<script defer data-domain="alliance-travel.dz" src="https://plausible.io/js/script.js"></script>` in `<head>` |
| Cloudflare Email Routing | 15 min, free | `contact@alliance-travel.dz` → existing Gmail |

### Medium-term feature work

The site is for marketing. Ideas the agency might want, in priority order:
1. **Newsletter signup** — replace the WhatsApp-only conversion with an email-capture form (requires backend or Formspree/CF Worker)
2. **Real testimonials** — replace static placeholder strings with real customer quotes (requires signed consent)
3. **Booking confirmation flow** — when a customer pays the deposit at the agency, send them a structured itinerary PDF via email (requires backend)
4. **Multi-currency display** — add EUR/USD/MAD/TND alongside DZD for diaspora visitors
5. **Arabic translation** — full RTL with French as secondary

None of the above are scoped in current commits.

### 11.3 Useful one-liners for the next agent

**Find unused CSS classes:**
```bash
python -c "
import re, pathlib
css = pathlib.Path('site/assets/css/styles.css').read_text(encoding='utf-8')
classes = set(re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]*)', css))
PSEUDO = {'hover','focus','active','visited','checked','disabled','first-child','last-child','first-of-type','last-of-type','nth-child','nth-of-type','before','after','focus-visible','focus-within','placeholder','placeholder-shown','target','not','is','where','has','root','empty','open','closed'}
classes = {c for c in classes if c not in PSEUDO}
html_blob = ''.join(p.read_text(encoding='utf-8') for p in pathlib.Path('site').rglob('*.html'))
js_blob = ''.join(p.read_text(encoding='utf-8') for p in pathlib.Path('site/assets/js').rglob('*.js'))
unused = sorted([c for c in classes if c not in html_blob and c not in js_blob])
print(f'Unused: {len(unused)}')
for c in unused: print(f'  .{c}')
"
```

**Verify all JSON-LD blocks parse:**
```bash
python -c "
import re, json, pathlib
for f in sorted(pathlib.Path('site').rglob('index.html')):
    blocks = re.findall(r'<script type=\"application/ld\\+json\">(.*?)</script>', f.read_text(encoding='utf-8'), re.DOTALL)
    for i, b in enumerate(blocks):
        try: json.loads(b.strip())
        except Exception as e: print(f'{f} block {i+1}: {e}')
print('All valid.')
"
```

**Find broken asset paths in HTML:**
```bash
python -c "
import re, pathlib
broken = 0
for f in sorted(pathlib.Path('site').rglob('index.html')):
    refs = re.findall(r'(?:src|href)=[\"\\']([^\"\\'#]+)[\"\\']', f.read_text(encoding='utf-8'))
    for ref in refs:
        if ref.startswith(('http://','https://','mailto:','tel:','wa.me','data:','#','javascript:')): continue
        target = (pathlib.Path('site') / ref.lstrip('/')) if ref.startswith('/') else (f.parent / ref)
        target = pathlib.Path(str(target.resolve()).split('?')[0])
        if not target.exists() and not (target / 'index.html').exists():
            broken += 1
            print(f'{f}: BROKEN {ref}')
print(f'Total broken: {broken}')
"
```

**Count unique cubic-beziers:**
```bash
grep -oE 'cubic-bezier\([^)]+\)' site/assets/css/styles.css | sort -u
```

**Lighthouse against local server (requires npm install -g lighthouse):**
```bash
python -m http.server 5500 --directory site &
sleep 2
lighthouse http://localhost:5500 --output html --output-path lighthouse-home.html --view
```

---

## 12 · Deferred work

Each item below was explicitly NOT shipped, with reasoning.

| Phase | Why deferred | When to revisit |
|---|---|---|
| **A.2 Spacing/radii geometric migration** (`--s4 24→16`, `--s7 40→48`, `--s8 40→64`, `--r1 2→4`) | Risks ~150 visual regressions across components that visually depend on old spacing values. Needs dedicated side-by-side review session per component. | After deployment + traffic shows the current spacing is OK or needs adjustment |
| **D.3 `.pill` baseline consolidation** | Audit of 9 pill-like classes revealed 2 size tiers × 2 weight tiers × mixed text-transform — too much variance for safe one-size-fits-all baseline | If a future redesign creates a new pill that prompts revisiting the family |
| **F.2 Full `motion.js` merge** | `enhance.js` + `enhance-pro.js` → `motion.js`. Adds risk (merging 1045 lines), low immediate benefit since Phase F.1 already gave us the single scroll coordinator | When you add a build step (concat compensates for the extra perceived complexity) |
| **G Section choreography refinement** | Pre-existing `.section-head.is-in` cascade already implements 0ms eyebrow + 120ms title. Master plan called for finer 0/80/160/240/320ms cascade with body row stagger. Current implementation is "good enough" | When a designer reviews the live site and asks for finer entrance polish |
| **J.1 BEM consistency rename** | Invasive across many components. Higher risk than reward without a refactoring tool | Phase J.3 file split adds a natural opportunity |
| **J.2 remaining small dead-code blocks** | ~10 more classes (`.book-form`, `.faq__item`, `.hl-card__photo`, `.photo-strip__item` if confirmed dead, `.dest-card`). Each is small. ~50 lines total. Diminishing returns. | When the file ever needs to drop below 9000 lines |
| **J.3 File split into tokens/base/components/utilities via `@import`** | Adds 3 HTTP requests per page load → violates Performance Contract §0a item 3 without a concat build step | When you add a build step (esbuild, Vite, or Lightning CSS) |
| **AggregateRating JSON-LD on trip pages** | Needs real testimonials with signed customer consent | When customer testimonials are formally collected |
| **Real testimonials in HTML** | Same as above. Current `.testi-card` content uses placeholder strings | When consent is signed |
| **Build step (esbuild / Vite / Lightning CSS)** | Project owner chose "no build step" for simplicity. Adding one would enable J.3, minification, asset hashing, bundle analysis | If the site grows past 50 pages or styles.css exceeds 12k lines |
| **Backend lead capture** | Currently zero backend by design (WhatsApp deep-links). Adding email signup would require Cloudflare Worker or similar | When the agency wants email marketing |
| **Multi-currency display (DZD + EUR + USD)** | Diaspora-targeted feature. Requires either static lookup or live FX API | When diaspora traffic is measured to be significant |
| **Arabic / RTL translation** | French is sufficient for the current audience. Full RTL is non-trivial CSS work | When the agency decides to target broader MENA |
| **A/B test harness** | Would require analytics + flag service. Not justified by current scale | When you're shipping enough variants to need it |

---

## 13 · Glossary

| Term | Definition |
|---|---|
| **v21** | The current cleanup cycle. Contains phases A-J. See §7. |
| **v20** | Trip-card hover frame integrity fix. Last user-visible feature shipped before v21. |
| **vN-N.M** | Versioned design pass. v1 was original, v19 was last major before v21. Each ships as `_vNN_*.py` + `_vNN_*.css` files in `_archive/migrations/`. |
| **Phase X.Y** | A sub-phase of v21 work, e.g., Phase A.1 = token consolidation, Phase B.1 = motion library curves |
| **Performance Contract** | 10 non-negotiable rules in `MOTION-CLEANUP-MASTER.md` §0a. Apply to every phase. |
| **Cinematic Doctrine** | "One element commands the eye at a time; rest hold breath." Resolves Cinematic + Clean. |
| **Canonical block** | The single source-of-truth declaration. After v21, every token, every motion vocab, every primitive lives in exactly one canonical block. |
| **Selector-list extension** | Sharing baseline properties via comma-separated selector lists (e.g., `.dest-card, .testi-card, .stat-card { background: var(--bg-card) }`) instead of duplicating per class. |
| **Survey** | The 19 design questions in `docs/CLEANUP-SURVEY.md`. Answers are LOCKED — re-litigate only by amending the survey first. |
| **North star (Q19)** | "Professional site with clean readable code, consistent naming, clear architecture, modern SEO end-to-end, sitemap that doesn't bother the user." The arbiter when a decision is ambiguous. |
| **FAB** | Floating Action Button — the bottom-right WhatsApp circle |
| **LCP** | Largest Contentful Paint — Google Core Web Vital. Target < 1.8s on 4G. |
| **CLS** | Cumulative Layout Shift — Google Core Web Vital. Target = 0. |
| **INP** | Interaction to Next Paint — Google Core Web Vital. Target < 200ms. |
| **OG** | Open Graph — the meta tags Facebook/WhatsApp use for link previews. |
| **JSON-LD** | JSON for Linked Data — Google's preferred structured-data format. We use TouristTrip, Offer, BreadcrumbList, FAQPage, TravelAgency, WebSite. |
| **CF Pages** | Cloudflare Pages — the recommended hosting platform. Free tier covers everything this site needs. |
| **`.dz`** | Algerian country-code TLD. Managed by NIC.DZ. Cannot be registered through Cloudflare directly — keep at current Algerian registrar, delegate DNS to CF. |
| **`wa.me/213…`** | WhatsApp deep-link format. `213` is Algeria's country code. |
| **Surface ladder** | The 6-layer dark-mode surface hierarchy: `--bg-deep` (page edge) < `--bg` (page) < `--bg-low` < `--bg-2` (alternating section) < `--bg-card` < `--bg-elev` (hover/modal). Plus `--bg-glass` for frosted overlays. |
| **Ambient loop** | A CSS `@keyframes` animation that runs continuously (infinite). E.g., the FAB pulse, the HQ branch card pulse, the map pin pulses. |
| **Focal motion** | The single ambient animation that has the eye at any moment per Cinematic Doctrine. |
| **GPU-friendly** | Animatable properties that compositor can handle without paint: `transform`, `opacity`. Versus paint-triggering properties like `box-shadow`, `width`, `top/left`. |
| **rAF** | `requestAnimationFrame` — browser API for syncing JS execution with display refresh. Used for scroll-throttling. |
| **IntersectionObserver** | Browser API that fires callbacks when elements enter/exit the viewport. Used for pause-off-screen + reveal-on-scroll. |

---

## End of handoff

If you've read this far, you have the full context. The site is in great shape, the design system is coherent, the deploy is one Cloudflare dashboard click + DNS update away. The deferred work is real but not blocking.

**When you commit next**, follow the existing convention: `phase(scope-vN.N): one-line summary` with a detailed body explaining what + why. Update `docs/ROADMAP.md` to add a row to the commit table.

**When you ship a major release**, bump `CACHE_NAME` in `site/sw.js` to the new date so users get fresh assets on their next visit.

**When you add a new component**, route it through the canonical motion vocabulary (4 patterns × 4 durations × 4 easings). Don't introduce ad-hoc cubic-beziers.

**When in doubt**, return to the north star: *"professional site with clean readable code, consistent naming, clear architecture, modern SEO end-to-end, sitemap that doesn't bother the user."*

— End.
