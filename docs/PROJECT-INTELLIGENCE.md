# Alliance Travel — Project Intelligence & Reusable Build Playbook

> Purpose: rebuild a *better* agency website (next: Nomara Voyage, etc.) without re-discovering these solutions or repeating these mistakes. Grounded in the real codebase — 9 pages, 11 JS modules (~5.5k LoC), one ~10k-line CSS file, 154 images, 120 commits, deployed on Cloudflare Pages.

---

## 0. TECH SHEET (the stack, exactly)

| Layer | Choice | Notes |
|---|---|---|
| Rendering | **Vanilla MPA, zero runtime deps, no build** (until the data-driven migration) | Each page = hand-authored `index.html` under `site/<slug>/`. |
| Pages | 9: `index` (home), `voyages` (trip index), 5 trip pages, `rendez-vous-visa`, `404` | |
| CSS | **single `styles.css` ~9,970 lines**, shipped to every page | CSS variables for theming (`--accent`, region tokens), light/dark via `data-theme` on `<html>`. |
| JS | 11 IIFE modules, all `defer`, no bundler | `enhance.js` (1070), `i18n.js` (1179), `booking-form.js` (741), `calculator.js`, `trip-map.js`, `globe.js`, `scroll-hero.js`, `algeria-map.js`, `map-base.js`, `visa-map.js`, `hero-collage-lazy.js`. |
| i18n | **client-side FR/EN/AR**, FR canonical | `data-i18n*` attributes, `window.alTranslations`, localStorage `al-lang`, `<html lang/dir>` swap. |
| Maps | **MapLibre GL 4.7.1** via shared `window.MapBase`, lazy-booted | jsDelivr CDN + **SRI** + `crossorigin`; CARTO basemaps (no key). |
| Globe | **cobe** (WebGL), homepage hero | `esm.sh` dynamic `import()`, graceful CSS fallback, desktop-only gate. |
| Images | **AVIF + WebP + JPG** via Pillow, `<picture>`, hero bg/fg parallax | mobile crops, LCP preload. |
| SEO | JSON-LD (TravelAgency, TouristTrip+Offer, FAQPage, BreadcrumbList, WebSite+SearchAction), OG/Twitter, canonical, `hreflang=x-default`, geo meta | |
| Hosting | **Cloudflare Pages**; `_headers`, `_redirects`, `sw.js` (PWA) | `main` → production, any other branch → preview URL. |
| Deploy gate | branch preview before `main` merge | wrangler.toml documents it. |

**Non-negotiable from day 1 (carry forward):** pre-rendered static HTML (SEO + speed), graceful degradation on every external dep, FR-first content, governance rules (§6).

---

## 1. WHAT IT IS / WHY

- **Business goal:** a small Algerian travel agency (Bordj Bou Arreridj) sells *organised group trips* (vol/bus + hotel + guide, all-inclusive price) and *visa-appointment services*. The site is a **lead-gen brochure → WhatsApp**, not an e-commerce checkout. Conversions = WhatsApp/phone inquiries with a pre-filled message.
- **User goal:** an Algerian traveller compares destinations/hotels, sees an honest all-in price for *their* group composition, and contacts the agency in one tap.
- **Vision:** look premium-but-accessible, locally rooted, multilingual (AR/FR), trustworthy on a sensitive product (visas, money, travel).

---

## 2. ARCHITECTURE DECISIONS (chosen / why / tradeoff)

1. **Vanilla MPA, no framework, no build** — chosen for SEO (content in initial HTML), longevity (no dep rot), and the owner's hosting simplicity. **Tradeoff that bit us:** no componentisation → nav/footer/scripts copied across 9 files; CSS became a monolith; trip *data* lived inline in HTML → no single source of truth. **V2:** keep static *output*, but generate it (SSG) from data.
2. **Client-side i18n (FR canonical, JS swaps EN/AR)** — cheap, no build, one URL per page. **Tradeoff:** Google only indexes the FR surface; EN/AR are invisible to search. Documented as acceptable until traffic justifies the cost. **V2 at scale:** `/fr /en /ar` subpaths with build-time translated HTML.
3. **Inline `window.TRIP_DATA`** (calculator data) + hand-authored HTML for everything else — fast to ship one page. **Tradeoff:** prices ended up in 3 places per page (card, TRIP_DATA, JSON-LD) and *drifted*; updating a trip = editing 9 files. This single decision forced the eventual **data-driven generator + Decap CMS** migration.
4. **External CDN libs (MapLibre, cobe)** — avoids self-hosting/bundling. **Tradeoff:** `unpkg` was unreliable on MENA edges → moved to **jsDelivr + SRI**; cobe via dynamic `import()` can't take SRI → self-hosting is the real fix (still pending).
5. **No backend (static)** → an "admin where the owner edits content" is a hard fork: **git-CMS (Decap/Sveltia) + build step** (chosen) vs serverless (D1/KV) vs export-file. The CMS choice *requires* the data-driven refactor first.
6. **Cloudflare Pages** — free, fast, branch-preview deploys, `_headers`/`_redirects`. Good fit.

---

## 3. SECTION-BY-SECTION REASONING (trip page = the core template)

A trip page has **15 sections** (this is the reusable anatomy):
`nav → scroll-hero → highlights(4) → itinerary(split|single) → trip-map → trust/testimonials → inclus(included+excluded) → faq → hotels(tier-tabs + cards) → calculator → booking → info-blocks(4: paiement/annulation/visa/assurance) → related(2) → final-cta → footer`.

| Section | Problem it solves | Key reasoning |
|---|---|---|
| **scroll-hero** (bg+fg parallax) | first-impression + LCP | bg = LCP (preloaded webp), fg = subject layer (`fetchpriority=low`); cinematic without a video. |
| **highlights (4)** | scannable "why this trip" | fixed 4 keeps layout stable. |
| **itinerary** | builds desire, sets expectations | day-by-day timeline; `split` (2 cols) only when the trip has 2 legs. |
| **trip-map** | geographic trust + "we planned the route" | MapLibre, lazy-booted, static fallback. |
| **inclus (included/excluded)** | kills "what's the catch?" objection | explicit two-column list; honesty = conversion. |
| **hotels (tier tabs + cards)** | choice without overwhelm | economique→luxe tiers; each card = the calculator's data source. |
| **calculator** | the killer feature: honest per-group price | composes adults + child tiers + room type + extras → total + WhatsApp deep-link. |
| **booking-form** | capture without a backend | builds a WhatsApp message / mailto; no server. |
| **info-blocks** | pre-empt the FAQ-by-phone | 3 blocks identical across trips, only the **visa** block varies by destination. |
| **final-cta** | last conversion push | scarcity that is *factually true* (real departure count), never fabricated. |

---

## 4. UX / DESIGN SYSTEM (what + why)

- **Theme:** dark-default, warm cream text on Prussian-navy, mint accent; per-trip `--accent` (egypt mint, azerbaijan teal, etc.). `theme-color` ≠ `--accent` on some pages (stored separately — don't derive).
- **Motion:** scroll-reveals + scroll-hero parallax via a **single rAF scroll coordinator** (`enhance.js`) — one listener, many subscribers (don't add per-feature scroll listeners). `prefers-reduced-motion` respected everywhere.
- **Conversion:** WhatsApp is the primary CTA on every surface (sticky bar, FAB, hero, final-cta), always with a pre-filled localized message.
- **Trust:** real testimonials (no fake aggregate badges), partner names as **text** (nominative fair use, not logos), honest pricing, "1 200+ voyageurs depuis 2019" stated consistently.
- **A11y:** focus-visible rings, 44px touch targets, semantic landmarks, ARIA on custom controls (radiogroup date-chips, checkbox extras) — **and keep ARIA in sync with class state** (see §6 bug #4).

---

## 5. COMPONENT INVENTORY (reusable, with the gotchas)

| Component | States | Known edge cases / gotchas |
|---|---|---|
| Date-chip radiogroup | active/idle, focus, kbd | **must sync `.active` + `aria-checked` + roving `tabindex` together**; CSS paints `[aria-checked]` so a stale attr = stuck selection. |
| Room segmented control | active/idle | class-only (no aria) — fine. |
| Hotel tier tabs | pressed via `aria-pressed` | synced correctly; copy this pattern. |
| Extras checkbox | checked/unchecked | sync `aria-checked` with state (was missing). |
| Calculator | empty (no hotel), valid, NaN-guard | guard `fmt()` against non-finite → never render "NaN DA"; child pricing must use an **explicit** type→price-key map. |
| scroll-hero | loading→ready, reduced-motion | no hardcoded intrinsic dims → image swaps are layout-safe. |
| MapBase.lazyBoot | pre-boot, booted, fallback | rootMargin **600px** (boot ~1 viewport early); 30s hard-timeout; teardown listeners on boot. |
| cobe globe | desktop-only, fallback, paused-offscreen | markers `[lat,lng]`; adding a location = polaroid DOM + DESTINATIONS entry + `rot` map + count-agnostic fallback. |
| Reveal system | **pick ONE** (AOS *or* data-fx) | running both = double opacity-0 masters = stuck-hidden risk. |

---

## 6. BUSINESS LOGIC & GOVERNANCE (the legal landmines — bake these in)

**Travel/visa content has real liability. Hard rules:**
1. **Never list visa fees** → "Devis personnalisé sur WhatsApp".
2. **Never promise processing times** → hedge: "selon ambassade / subject to embassy / حسب السفارة".
3. **Never claim partnership** with VFS/BLS/Capago/etc. → nominative fair use, with a "non affilié" disclaimer.
4. **Never show embassy seals / national arms** → public-domain **civil flags** only (lipis/flag-icons MIT).
5. **Never fabricate scarcity/badges/ratings** → scarcity must equal the *real* departure count.
6. **Strip B2B internals** from public pages: supplier names (AyaBooking), **commission amounts**, partner-agency clauses, `<25 ans` restrictions (owner-only note).
7. **Honest disclosure** of hard truths (Saudi e-visa limits for ordinary DZ passports, USA visa-bond pilot, Capago replaced VFS/TLScontact 2025).
8. **Pricing model is business logic** — store the child/baby tier → price-key mapping **explicitly per hotel**; the public price = "Tarif" only (commission removed); one canonical price feeds card + calculator + JSON-LD.

---

## 7. PROBLEM → SOLUTION DATABASE (every real mistake, so V2 skips it)

| # | Problem (what actually happened) | Root cause | Fix / lesson |
|---|---|---|---|
| 1 | Trip data drift (card price ≠ TRIP_DATA ≠ JSON-LD) | data inline in 3 places, no SoT | **One JSON per trip → generate** card+calculator+JSON-LD from it. |
| 2 | 10k-line CSS shipped to every page; dupes (`.date-chips` defined twice), conflicting same-specificity rules | monolith, no module boundaries | split per-page; inline critical CSS; lint duplicate selectors. |
| 3 | Reveals/animations silently not firing | **dead selectors** (`.hotels-grid`≠`.hotel-grid`, `.faq__list`≠`.faq-list`, `.hero__visual`, ken-burns on `[data-region] .hero` matched nothing) | a selector matching nothing **fails silently** — verify both sides; delete dead CSS/JS (it's pure bloat). |
| 4 | Date-picker: first chip stuck selected | toggled `.active` but not `aria-checked`; CSS painted `[aria-checked]` | **sync class + ARIA in one function**; single source of selection state. |
| 5 | "Fixing" a dead selector would hide cards | **two reveal systems** (AOS + data-fx) both force `opacity:0` | run exactly ONE reveal system. |
| 6 | Watermarked heroes ("Unsplash+") + an Azerbaijan hero that was **Samarkand, Uzbekistan** | unlicensed premium comps + unverified subject | verify **license AND subject/geography**; use Pexels/Unsplash-free/Wikimedia-CC or buy. |
| 7 | 17 MB heroes; 1.5 MB JPG LCP | no size budget, 6 MP for small render | resize to retina dims; AVIF q42-50 + WebP + JPG; mobile crops; preload LCP. Budget: delivered AVIF <250 KB, LCP bg <200 KB. |
| 8 | Cache-bust never implemented (assets `immutable` but no `?cb=`) | doc said one thing, HTML did another | CSS/JS = `max-age=600, stale-while-revalidate`; images immutable only at stable filenames; **bump SW cache name when image bytes change at same path**. |
| 9 | SW would precache nothing if any URL 404s | `addAll` is atomic | keep precache to `/` only; runtime SWR covers the rest. |
| 10 | unpkg/esm.sh slow/blocked in MENA | CDN reachability | jsDelivr + SRI; preconnect to CDN + tile host; self-host as the real fix. |
| 11 | Stale departure dates shown as current | dates hardcoded in markup | dates are **data**; plan a refresh / compute relative. |
| 12 | Child price displayed ≠ charged | order-based calc vs type-based labels; per-page inconsistent kid-type map | store the mapping explicitly; one model. |
| 13 | Audits over-flagged dead code as "framerate culprits" | scanner didn't check selectors were live | **verify a finding is LIVE before fixing.** |
| 14 | Maps slow to appear | lazy rootMargin 200px, no preconnect | rootMargin 600px + preconnect `basemaps.cartocdn.com` + `cdn.jsdelivr.net`. |
| 15 | **Concurrent Claude sessions** on one tree clobbered each other / duplicated work (two did F1/F10/F11) | shared worktree, independent commits | one session per worktree; check `git log/status` every step; commit **scoped file lists**, never `git add -A`. |

---

## 8. HIDDEN ASSUMPTIONS (make them explicit in V2)

- Users are mostly **mobile, 4G, Algeria** → weight budgets are non-negotiable; globe/maps are desktop-only.
- Users are **bilingual AR/FR**; numbers stay Latin even in RTL (`unicode-bidi:isolate`).
- The owner is **non-technical** → admin must be a managed dashboard, not "edit JSON in git".
- Content volume is **small** (≤10 trips) → inline data *seemed* fine; it wasn't, because of *update frequency*, not volume.
- Trips change seasonally → the site must be *editable by the owner*, which the original architecture didn't allow.

---

## 9. DEBT / FAILURE ANALYSIS (state at handoff)

- **Tech debt:** CSS monolith; nav/footer duplicated ×9; inline data; second reveal system; dead CSS/JS still partly present; cobe not self-hosted.
- **Unfinished:** data-driven generator (Phase 1, parity not yet reached when sessions hit limits), Decap CMS (Phase 3), source-of-truth PDF → page updates + Tunisia page (Phase 4), responsive sweep (Phase 5).
- **Process debt:** multiple concurrent sessions caused rework; background agents repeatedly died on **session limits** mid-task (lost work) — prefer smaller, self-verifying agent tasks and commit early.

---

## 10. REUSABLE FRAMEWORKS (lift these directly)

1. **Trip-page schema** (`data/trips/SCHEMA.md`) — 18-section JSON model; every fork documented (title variant, itinerary layout, nullable tier-tabs, kid-type map, theme-color≠accent, priceDisplayOverride).
2. **Image encode pipeline** (Pillow): crop-to-aspect → resize → `save .jpg(q74-80)/.webp(q70-76, method6)/.avif(q42-50, speed3)`, desktop + `--mobile` variants. Free-source via Pexels CDN URL `images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?w=…`.
3. **MapBase shared helper** — STYLES, currentStyle, arcCoords, loadMapLibre (SRI'd), escapeHtml, lazyBoot (IO + scroll fallback + 30s timeout). Reuse verbatim.
4. **i18n attribute system** — `data-i18n` / `-html` / `-aria-label`, dict `T.{fr,en,ar}`, `setHtmlAttrs` (lang+dir+data-lang), aria-live announce on switch.
5. **Governance checklist** (§6) — a pre-publish gate for any travel/visa site.
6. **SEO JSON-LD set** — TravelAgency (geo/sameAs/contactPoint), TouristTrip+Offer, FAQPage (derive from FAQ data), BreadcrumbList, WebSite+SearchAction.
7. **Calculator pattern** — explicit per-hotel price object `{double,triple,single,child1,child2,baby}` + explicit groupConfig kid-type map; NaN-guarded formatter; WhatsApp deep-link output.

---

## 11. PROJECT DNA — top decisions/lessons (high-signal)

**Top 10 technical lessons:** (1) static output but **generate from data**; (2) a non-matching selector **fails silently** — verify both sides; (3) keep **class + ARIA** in sync; (4) **one** reveal system; (5) verify image **license + subject**; (6) set **weight budgets** (AVIF<250/LCP<200KB); (7) cache headers + SW cache-name must match reality; (8) keep SW precache to `/`; (9) jsDelivr+SRI > unpkg, self-host > CDN; (10) one Claude session per worktree, commit scoped.

**Top 5 design/UX:** WhatsApp-first conversion; honest pricing/scarcity as a trust lever; calculator as the hero feature; per-trip accent theming; reduced-motion + 44px targets baked in.

**Top 5 business/governance:** no visa fees; no fake scarcity/badges; civil flags not seals; strip B2B commission/supplier; hedge all embassy timings.

**Top 5 product:** owner must self-edit (CMS); content separate from markup; dates are data; AR/FR multilingual; mobile-4G-first.

---

## 12. VERSION 2 PLAN (for the next agency site)

- **KEEP exactly:** static pre-rendered output, the SEO/JSON-LD discipline, the image pipeline, MapBase, graceful degradation, the governance rules, WhatsApp-first conversion, the calculator.
- **IMPROVE:** data-driven from commit #1 (JSON + a tiny zero-dep generator); ONE reveal system; split CSS (or Tailwind w/ purge); self-host MapLibre + cobe.
- **REDESIGN:** i18n → URL-per-locale, build-time translated HTML (real multilingual SEO).
- **REMOVE:** inline data, duplicate nav/footer (use template partials), dead CSS/JS, the second reveal system.
- **AUTOMATE:** the build (generator), owner editing (Decap/Sveltia CMS + GitHub OAuth), image encoding in CI, a lint for dead-selectors / ARIA-sync / price-parity.
- **SIMPLIFY:** one price object per hotel → derive card + calculator + JSON-LD (never hand-type a price twice).
- **SCALE:** Cloudflare Pages build hook; media in repo (small) or R2 (large).

---

## 13. COMPRESSED CONTEXT PACKAGE  *(paste this into a fresh AI chat to bootstrap the next build)*

```
PROJECT: Algerian travel-agency brochure site (group trips + visa services). Lead-gen → WhatsApp, not e-commerce.
STACK: pre-rendered static HTML (SSG from per-trip JSON), zero runtime deps, Cloudflare Pages. CSS variables + data-theme dark/light. IIFE JS, all defer. PWA (sw.js, precache "/" only, SWR runtime).
I18N: build-time /fr /en /ar subpaths (NOT client-side — that hides EN/AR from Google). Latin digits in RTL via unicode-bidi:isolate.
DATA MODEL: data/trips/<slug>.json is the single source of truth → generator renders card + calculator + JSON-LD from it. ONE price object/hotel {double,triple,single,child1,child2,baby} + explicit kid-type→price-key map. Never type a price twice.
ADMIN: Decap/Sveltia git-CMS editing the JSON + media; GitHub OAuth; CF build on commit. (Static site has no backend — CMS or serverless are the only "owner can edit" options.)
MAPS: MapLibre via a shared MapBase helper, jsDelivr+SRI+crossorigin, lazyBoot rootMargin 600px, preconnect tile host. GLOBE: cobe, desktop-only, [lat,lng] markers, graceful CSS fallback.
IMAGES: AVIF(q42-50)+WebP+JPG via Pillow, <picture>, mobile crops, LCP preloaded. Budget: AVIF<250KB, LCP<200KB. VERIFY license AND subject/geography (we shipped Unsplash+ watermarks and a wrong-country hero once). Pexels/Unsplash-free/Wikimedia-CC.
GOVERNANCE (travel/visa): NO visa fees; NO promised processing times (hedge "selon ambassade"); NO partnership claims (nominative fair use + disclaimer); NO embassy seals (civil flags only); NO fake scarcity/badges (real counts only); STRIP B2B commission/supplier names; honest disclosure of hard visa truths.
BUG CLASSES TO LINT: dead selectors (JS/CSS targets matching nothing fail silently); class↔ARIA desync (sync .active + aria-checked together); two reveal systems both forcing opacity:0; price drift across card/data/JSON-LD; stale hardcoded dates; cache headers vs SW cache-name mismatch.
PROCESS: one agent/session per git worktree; check git state every step; commit scoped file lists (never git add -A); small self-verifying agent tasks (big background agents die on session limits mid-task).
CONVERSION: WhatsApp-first everywhere with pre-filled localized message; honest per-group price calculator is the hero feature.
```

---
*Source: Alliance Travel build, 120 commits, ~15 sessions. This doc supersedes scattered notes in `docs/LESSONS.md`, `docs/AUDIT-*.md`, `docs/SCAN-*.md` for the purpose of bootstrapping a new agency site.*
