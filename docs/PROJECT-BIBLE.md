# 📖 Alliance Travel — PROJECT BIBLE

> Complete handoff. The original builder is gone. This document lets a **developer, designer, AI assistant, marketer, and business owner** continue without losing context. For the *why behind the decisions* and lessons for building a NEW site, see the companion [`PROJECT-INTELLIGENCE.md`](PROJECT-INTELLIGENCE.md). This doc is **how to operate and continue THIS site.**

**Last updated:** 2026-06-13 · **Repo:** `github.com/Brvetr4ve1er/alliancetravel34` · **Domain:** `alliance-travel.dz` (Cloudflare Pages)

---

## 🔴 READ THIS FIRST — current state (3 things)

1. **Production is BEHIND.** All recent work lives on branch **`refactor/trim-v26`**, which is **~22 commits ahead of `main`**. Production (`alliance-travel.dz`) deploys from `main`. **To ship everything done recently (visa page, image fixes, bug fixes, globe/map work): merge `refactor/trim-v26` → `main`.** Until then it's only visible on the branch preview URL.
2. **A big refactor is mid-flight.** The site is being migrated from hand-authored HTML to **data-driven pages** (`data/trips/*.json` + a generator in `tools/`). The generator is **not finished** (parity not reached; agents hit session limits). The live site still runs the hand-authored pages. Don't assume the generator works yet — see §Dev / In-flight.
3. **Governance rules are legal, not stylistic.** Never put visa fees, fake scarcity, partnership claims, or embassy seals on the site. See §Owner and §Marketer. Breaking these creates real liability.

---

## 👤 FOR THE BUSINESS OWNER (non-technical)

**What the site is:** an online brochure for Alliance Travel. It shows your organised trips and visa service, and turns visitors into **WhatsApp/phone inquiries** with a pre-filled message. It does *not* take payments — all booking is via WhatsApp/agency.

**The pages:**
| URL | What it is |
|---|---|
| `/` | Home — hero globe, trip cards, the agency, contact |
| `/voyages/` | List of all trips |
| `/cairo-sharm/`, `/azerbaidjan/`, `/istanbul/`, `/kuala-lumpur/`, `/sharm-constantine/` | One page per trip (itinerary, hotels, **price calculator**, booking) |
| `/rendez-vous-visa/` | Visa appointment service (10 countries) |

**How a customer reaches you:** every page has WhatsApp buttons that open a chat to your number with a ready message. Your lines on the site: **+213 561 61 62 66–69**, **+213 560 86 06 17**, **+213 560 86 99 05**. Socials: Instagram `@alliance_travel34`, Facebook `Alliance.Mebarkia` + `visa.bba.9`, TikTok `visa.bba34`. Branches shown: **BBA La Graf** (Bd Houari Boumediene), **BBA Cité Zehour** (Route de Medjana), **M'Sila**.

**How to change content TODAY (until the admin is built):** you can't edit it yourself yet. You give updated info (or drop brochure PDFs into the `source of truth/` folder) and a developer applies it. **The planned admin** (a "Decap CMS" dashboard at `/admin`) will let you edit trips/prices/photos yourself and have them go live automatically — it's not built yet (a developer needs to finish §Dev Phase 3).

**The `source of truth/` folder** is where you put the agency's official brochure PDFs (hotel prices, dates, inclusions). A developer/AI parses them and updates the trip pages. Keep the newest brochure per destination; old ones get ignored.

**⛔ What must NEVER go on the public site (legal/compliance — tell every developer/marketer):**
- **No visa fees or prices** → always "devis sur WhatsApp".
- **No promised visa timelines** → "selon l'ambassade".
- **No claiming you're a partner** of VFS/BLS/Capago/embassies → you "accompany" the file.
- **No embassy logos/seals** → only plain country flags.
- **No fake "only 3 seats left" / fake review badges** → only real departure counts.
- **No supplier names or commission amounts** from the B2B brochures (AyaBooking etc.) — those are internal.

**Going live / who controls what:** the site auto-publishes when a developer pushes to `main` on GitHub (Cloudflare rebuilds in ~1 min). You'll want access to: the **GitHub** account `Brvetr4ve1er`, the **Cloudflare** dashboard (project `alliance-travel`), and your **domain registrar** (for `alliance-travel.dz` DNS). Guard these — they are the keys to the site.

---

## 💻 FOR THE SUCCESSOR DEVELOPER

**Stack:** vanilla static HTML/CSS/JS, **no framework, no build step (yet)**, deployed on Cloudflare Pages. Full tech sheet in [`PROJECT-INTELLIGENCE.md §0`](PROJECT-INTELLIGENCE.md).

**Run locally:**
```
# from repo root — serves the site/ folder
python -m http.server 5500 --directory site
# open http://localhost:5500
```
(Also defined in `.claude/launch.json` as "Alliance Travel (Python)" port 5500.)

**Repo map:**
```
site/                      ← the deployable site (Cloudflare output dir = "site")
  index.html, 404.html
  voyages/  cairo-sharm/  azerbaidjan/  istanbul/  kuala-lumpur/  sharm-constantine/  rendez-vous-visa/
  assets/
    css/styles.css         ← ~9,970 lines, ONE file, ships to every page
    js/                     ← 11 IIFE modules, all <script defer>
    images/{heroes-v2,hotels,flags,og,favicon}/
  _headers  _redirects  sw.js  sitemap.xml  robots.txt  site.webmanifest
data/trips/                ← NEW data model (SCHEMA.md, cairo-sharm.json, _VARIATIONS.md)
tools/                     ← NEW generator (incomplete)
docs/                      ← all docs (this bible, intelligence, audits, DEPLOY, LESSONS, SCHEMA)
source of truth/           ← agency brochure PDFs (owner drops these)
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

**Caching/SW:** `_headers` → HTML short-cache, CSS/JS `max-age=600, stale-while-revalidate`, images immutable. `sw.js` precaches only `/` (keep it minimal — `addAll` is atomic). **Bump `CACHE_NAME` in sw.js when you change image bytes at the same filename** (currently `alliance-v29-2026-06-09`).

**Deploy:** push to `main` → Cloudflare auto-builds (framework None, build command empty, output `site/`). Any other branch → preview URL. Full runbook: [`docs/DEPLOY.md`](DEPLOY.md). **First action for a successor: merge `refactor/trim-v26` → `main`** to ship the backlog.

**Test before commit:** `node --check` every JS file you touch; use the Claude preview tools (or any static server) + resize to 375/768/1024/1440 for responsive; verify maps boot and the calculator totals.

**In-flight work (don't trip over it):**
- `data/trips/` + `tools/` = the **data-driven migration**. `SCHEMA.md` + `cairo-sharm.json` + `_VARIATIONS.md` are solid; the generator (`tools/build-trips.mjs` + template) is **incomplete** (cairo-sharm parity not yet achieved). Plan in `PROJECT-INTELLIGENCE.md §12` and tasks below.
- **Pending phases:** (1) finish generator → (2) extract the other 4 pages to JSON → (3) stand up Decap CMS at `/admin` + wire CF build → (4) parse `source of truth/` PDFs to update trips + build the new **Tunisia** page (one page, 3 destinations Hammamet/Sousse/Djerba, bus-based) and replace cairo-sharm with **Caire & Hurghada** → (5) responsive sweep + final polish.
- **Decided but not done:** Tunisia hero images already exist (`heroes-v2/hero__tunisie--*`); globe already has Tunisie/Hurghada/Djerba markers; the `/tunisie/` page itself isn't built.

**Known bugs/debt (live):** see `docs/SCAN-2026-06-12-naming-perf.md` (naming/perf) and `PROJECT-INTELLIGENCE.md §7` (all 15 bug classes). The big ones still partly present: CSS monolith with dupes/dead rules, two reveal systems (AOS + data-fx), nav `backdrop-filter` re-blur on scroll, child-pricing model inconsistency (display vs charged — needs the owner's real tariff rule), cobe not self-hosted.

**⚠️ Process hazard:** multiple AI/dev sessions have run on this one working tree and committed independently, occasionally clobbering each other. **One session per worktree. Check `git status`/`git log` before and after. Commit scoped file lists, never `git add -A`.**

---

## 🎨 FOR THE DESIGNER

**Brand:** dark-default, premium-but-warm. Core palette: Prussian navy `#002c51`, mint `#9ce8b2`, cream `#efe8df`. **Per-trip accent** color theming (egypt mint-green, azerbaijan teal `#3AAFAF`, istanbul blue, malaysia green, sharm cyan, tunisie = Sidi-Bou-Said blue). Note `theme-color` (browser chrome) ≠ `--accent` on some pages — stored separately, don't unify.

**Type:** DM Sans (display + body, Google Fonts); Arabic uses Cairo + Tajawal (lazy-loaded on first AR switch). Headings often `Word <em>emphasis</em>` (the `<em>` gets the accent color).

**The official brand chart** is `source of truth/alliance travel  graphic chart .pdf` (31 MB) — the agency's logo/color reference. Use it for any new brand asset.

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
- `docs/DEPLOY.md` — the 30-min go-live runbook.
- `docs/SCHEMA.md` (`data/trips/`) — the trip data model + per-page variations.
- `docs/SCAN-2026-06-12-naming-perf.md`, `docs/AUDIT-2026-06-05-MASTER.md` — known issues.
- `docs/LESSONS.md`, `docs/STORY.md` — history.

**Credentials/access a successor needs** (hold these, don't lose them):
| What | Where | For |
|---|---|---|
| GitHub repo | `github.com/Brvetr4ve1er/alliancetravel34` | source + auto-deploy trigger |
| Cloudflare Pages | project `alliance-travel` | hosting, build, custom domain |
| Domain registrar | `alliance-travel.dz` | DNS (CNAME → pages.dev) |
| Decap CMS (future) | GitHub OAuth app | owner self-editing |

**Glossary:** *scroll-hero* = parallax bg/fg hero; *TRIP_DATA* = inline calculator data per trip; *MapBase* = shared MapLibre helper; *data-fx / AOS* = the two reveal systems; *inclus* = included/excluded list; *source of truth* = brochure PDF folder; *B2B brochure* = supplier sheet (strip commission/supplier).

**Open tasks at handoff:** finish data-driven generator → extract 4 pages → Decap CMS + build → parse PDFs (update 4 trips, replace cairo-sharm with Caire & Hurghada, build Tunisia page) → perf/responsive/polish → **merge `refactor/trim-v26` to `main` to deploy.**

---
*If you read only one thing: merge the branch to ship the backlog, finish the data-driven migration so the owner can self-edit, and never break the governance rules. Everything else is in the two docs.*
