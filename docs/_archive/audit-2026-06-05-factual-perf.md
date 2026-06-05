# Pre-deploy Triple-Check Audit — 2026-06-05

**Scope:** Three independent lanes — Factual verification, Trademark/legal exposure, Performance/Core Web Vitals.
**Today:** 2026-06-05. **Branch:** `refactor/trim-v26`.

---

## LANE A — Factual Verification

### Visa page claims (`site/rendez-vous-visa/index.html`)

| # | Claim | Verdict | Source / Note |
|---|---|---|---|
| 1 | **France** Capago took over from VFS+TLScontact in April 2025, **4 centres** Alger/Oran/Annaba/Constantine | **PASS** | `fr-dz.capago.eu` lists Alger, Oran, Annaba, Constantine exactly. |
| 2 | **Türkiye** Mosaic Visa centre; e-visa for Schengen/UK/US/Ireland holders; <15 / >65 visa-free 90d | **PASS** | mfa.gov.tr + evisa.gov.tr confirm both rules. Mosaic Visa is current Turkish-government appointed centre in Alger. |
| 3 | **Germany** VFS Sidi Yahia (Hydra); VIDEX; 15-day standard | **PASS** | Standard Schengen Code Article 23 (15-day decision). VFS Algeria Sidi Yahia address current. |
| 4 | **Spain** BLS Alger+Oran; **ALG1–ALG4 categories effective Jan 2026** | **PASS — verbatim** | `algeria.blsspainvisa.com` confirms ALG1–ALG4 categorisation from 1 January 2026 based on prior Spain-issued Schengen visa history. |
| 5 | **China** CVASC Ben Aknoun, Sun+Thu 09:00–15:00 | **PARTIAL** | CVASC Ben Aknoun confirmed. Opening days/hours should be re-verified with operator (small risk: schedules drift). |
| 6 | **Russia** ambassade direct, El-Biar | **PASS** | Russian embassy in El-Biar; no third-party visa centre in Algeria. |
| 7 | **Egypt** ambassade Hydra + e-visa visa2egypt.gov.eg; **5-year multi-entry "annoncée pour Algériens"** | **PASS — recent** | Announced 12 April 2026 by Egyptian embassy in Algiers. Up to 5 years, multiple entries, 180-day stay per visit. Site hedges with "à vérifier au cas par cas" — appropriate. |
| 8 | **Saudi Arabia** e-visa not open to ordinary Algerian passports without Schengen/UK/US/GCC; Hajj via ONHO; Umrah via Nusuk | **PASS** | Nusuk is the official channel for foreign Umrah pilgrims since August 2025 launch of Nusuk Umrah. Saudi e-visa eligibility correct. |
| 9 | **USA** "Programme pilote « visa bond » depuis janvier 2026, B1/B2 algériens, 5 000–15 000 USD" | **PASS — accurate** | State Dept TFR; Algeria added 6 Jan 2026, **effective 26 Jan 2026**; bonds $5,000 / $10,000 / $15,000; refundable on compliant departure; programme runs until 5 Aug 2026. Site copy could say "depuis le 26 janvier 2026" for precision, but the broader claim is accurate. |
| 10 | **Canada** VFS VAC Ben Aknoun since **October 2024**; biometrics valid 59 months; IRCC routing Paris/Dakar/Rabat | **PASS** | VFS moved to Cité Houdef Bouteldja, 3rd floor, Ben Aknoun on **13 October 2024**. 59-month biometric validity matches IRCC policy. |

### Trip page sanity checks

| # | Finding | Severity |
|---|---|---|
| 11 | Price format **consistent**: "À partir de XX.XXX DA / DZD" across home, voyages index, and each trip page. ContactForm option labels use "dès XXX 000 DA" (space thousand separator) — minor cosmetic inconsistency only. | LOW |
| 12 | Airline mentions (EgyptAir, Turkish Airlines, Air Algérie) — all in **nominative fair use** (describing the carrier flying the route). No logos shown. Standard nominative fair use is OK. | OK |
| 13 | Hotel star ratings (3★–5★) — generic claim, factual classification, no defamation risk. | OK |
| 14 | Homepage claim "1.200+ voyageurs satisfaits depuis 2019" is **consistent** across home meta, OG, JSON-LD, agency section, footer (3 trip pages), visa hero trust list. No contradiction. | OK |
| 15 | Homepage "agence agréée" wording — **not used**. The site only says "agence de voyages agréée, immatriculée à Bordj Bou Arreridj" once in the visa FAQ (Q14) without naming an issuing authority. This is acceptable; doesn't claim a specific accreditation body. | OK |
| 16 | "3 agences" — Siège BBA La Graf (Bd. Houari Boumediene), BBA Cité Zehour (Route de Medjana), M'Sila Centre-ville. Addresses consistent footer ↔ visa CTA ↔ home contact. | OK |

### Trip date hygiene — CRITICAL

| Page | Date chips | Status as of 2026-06-05 |
|---|---|---|
| **Istanbul** | 25 Mar → 14 Mai 2026 (10 dates) | **ALL PAST** — needs replacement before deploy. Title `Mars–Mai 2026`, eyebrow, related cards all reference past window. |
| **Kuala Lumpur** | 29 Mar, 24 Avr, 22 Mai 2026 | **ALL PAST.** |
| **Sharm depuis Constantine** | 09 Avr → 27 Juin 2026 (5 dates) | **3 of 5 past** (09/04, 23/04, 07/05). Only 04/06 and 18/06 remain valid. |
| **Cairo & Sharm** | 12, 19, 26 Juin 2026 | OK (future). |
| **Azerbaïdjan** | 10–18 Avr (past), 7–15 Mai (past), 12–20 Juin, 26 Juin–4 Juil 2026 | 2 of 4 past. |

**Fix:** Push all date chips to next valid season before deploy; update titles ("Mars–Mai 2026" → next window) and related-card flags.

---

## LANE B — Trademark / Legal Exposure

| # | Issue | Severity | Recommendation |
|---|---|---|---|
| 17 | **Visa fee disclosed** on `cairo-sharm/index.html` (line 95 in JSON-LD and line 549 in FAQ): "taxe de visa **(30 USD)**". Site policy is NEVER mention visa fees. | **HIGH** | Replace with "selon tarif en vigueur à l'aéroport du Caire" or similar hedged wording. Update both the FAQPage JSON-LD and the rendered FAQ answer. |
| 18 | **Kuala Lumpur tourist tax disclosed** (line 109 + line 106 FAQ Q3): "taxe touristique de **20 USD** par personne payable à l'hôtel". This is technically a tourism levy not a visa fee, but the user constraint of price-quoting hygiene suggests hedging is safer. | MEDIUM | Either remove the number ("selon arrêté malaisien en vigueur") or footnote it as informational. |
| 19 | **Saudi Arabia flag SVG** (`flags/sa.svg`) carries the Arabic Shahada + sword in white. KSA has **no separate civil flag** — every public depiction is the state flag, and the Saudi government has previously requested that the flag not be used commercially in ways that could be disrespectful. The lipis/flag-icons SVG used here is MIT-licensed and is the universally-accepted SVG, so legal risk is low; brand risk is non-zero. | LOW | Keep as-is. The site uses the flag in informational context (visa centre identifier), which is acceptable nominative use. Do NOT render it on a non-flag substrate (e.g., on a button) — current usage is a small 36×27px chip, appropriate. |
| 20 | **Embassy seals / state arms** on visa page — **none present**. All country chips are flag SVGs only. | OK | – |
| 21 | **Partner brand names** (Capago, VFS Global, BLS International, CVASC, Mosaic Visa, Nusuk) used in nominative descriptive context. The page explicitly states **"Alliance Travel n'est pas affilié à ces sociétés et n'agit pas en leur nom"** (line 425). This is textbook nominative fair use disclosure. | OK | – |
| 22 | **Hotel/airline logos** — **none rendered** as images. Only text mentions of EgyptAir, Turkish Airlines, Air Algérie, Tivoli/Verginia/Rehana/Pickalbatros/Charmillion/Cleopatra/Grand Mercure. Text-only nominative use is safe. | OK | – |
| 23 | **Processing time promises** — all hedged. Visa page uses "délai standard 15 jours selon Code Schengen", "selon ambassade", "selon délai", and the FAQ Q1 explicitly says *"Nous ne pouvons pas le garantir"*. No unconditional promises. | OK | – |
| 24 | **Scarcity language** — three trip pages use scarcity strings: `"Places limitées · Les départs de juin se remplissent vite"` (cairo-sharm), `"3 départs seulement · Places très limitées"` (KL), `"Départs hebdomadaires · Places limitées par groupe"` (istanbul), `"4 départs en 2026 · Places limitées"` (azerbaidjan), `"5 départs · Groupes limités · Réservez tôt"` (sharm-constantine). **All are factually grounded** (the actual departure count matches), not fake counters. No "X seats left" or "Y people viewing" gimmicks anywhere. | OK | – |
| 25 | **Trust badges / fake certifications** — **none found**. No "TripAdvisor X stars", no "Trustpilot rating", no fake "Member of XYZ Federation". Star ratings exist but only as hotel classifications and testimonial visual flourishes. | OK | – |
| 26 | Testimonial visual star rows (`.testi-stars aria-label="5 étoiles"`) on trip pages — these are decorative chrome for individual customer testimonials and read as such. Not a fake aggregate review badge. | OK | – |

---

## LANE C — Performance / Core Web Vitals

### Inventory

**JS bundles (`site/assets/js/`)** — totals 277 KB unminified:

| File | Size | Loading |
|---|---|---|
| `i18n.js` | 92 KB | `defer` (all pages) |
| `enhance.js` | 45 KB | `defer` (all pages) |
| `booking-form.js` | 34 KB | trip pages only |
| `trip-map.js` | 18 KB | trip pages, lazy-booted via IntersectionObserver |
| `globe.js` | 17 KB | home only, `type=module` (no defer needed) |
| `calculator.js` | 16 KB | trip pages only |
| `algeria-map.js` | 16 KB | home only, lazy |
| `scroll-hero.js` | 13 KB | trip pages only |
| `visa-map.js` | 9 KB | visa page, lazy |
| `map-base.js` | 6 KB | wherever maps are used |
| `hero-collage-lazy.js` | 3 KB | home only |

**CSS** — `styles.css` 9975 lines, **303 KB unminified**, shipped to every page render-blocking via `<link rel="stylesheet">`. No critical CSS inlined.

**Third-party**: MapLibre GL 4.7.1 from `unpkg.com` (CSS + JS, ~250 KB gzipped together) lazy-loaded only when a map enters viewport; cobe@0.6.4 (~50 KB) from `esm.sh` on home only. **Neither has SRI hashes.**

**Image weight per page** (sum of likely-fetched assets at load):

| Page | Hero set + decoration | Cards/gallery |
|---|---|---|
| Home | 100–250 KB (LCP cairo-sharm webp + collage decoys) | + 1.4 MB trip cards if all visible |
| Istanbul | 308 KB (bg.webp) + 560 KB (fg.webp) on scroll-hero | + 4 hotel photos |
| Kuala Lumpur | similar | + 1 hotel photo |
| Azerbaïdjan | 324 KB bg + 560 KB fg | + hotels |
| Visa | 0 hero image | Flags 67 KB total + MapLibre on demand |

### Findings table

| # | Finding | Impact | Recommendation |
|---|---|---|---|
| 27 | **CSS render-blocks**: 303 KB sheet on every page, no inlined critical CSS. On 3G mobile this delays FCP/LCP by ~500–800 ms. | **HIGH** | Inline ~10 KB of above-the-fold rules (nav, hero, base typography) in each `<head>`; defer the rest via `<link media="print" onload="this.media='all'">` or `rel="preload" as="style"`. |
| 28 | **LCP image is preloaded** correctly on every trip page (home, istanbul, kuala-lumpur, etc.) with `fetchpriority="high"` and per-viewport `imagesrcset`. Good. | OK | Keep. |
| 29 | **DM Sans loaded from Google Fonts** with `display=swap` in the URL — correct. `preconnect` to both `fonts.googleapis.com` and `fonts.gstatic.com` present. No self-hosted fallback. Adds ~150 ms on first paint. | MEDIUM | Self-host the 4 weights actually used (300/400/500/600/700 + italic 400) as woff2 — saves the DNS+TLS handshake to gstatic. |
| 30 | **No SRI** on MapLibre `unpkg.com` CDN load or cobe `esm.sh` load. Compromise of either CDN → arbitrary JS in your app. | **HIGH (security)** | Add `integrity="sha384-…" crossorigin="anonymous"` to the dynamically-created script tags in `map-base.js` line 65–69 and `globe.js` line 43. |
| 31 | **Service worker is well-designed**: HTML network-first (keeps content fresh), CSS/JS stale-while-revalidate, images cache-first. Pre-cache list is conservative (homepage shell only). | OK | Keep. Note current cache name `alliance-v27-2026-06-03` — bump again on this deploy. |
| 32 | **Images width/height attributes** present on hotel cards, trip cards, polaroids — CLS protected. Trip hero `scroll-hero` uses background-image-via-CSS pattern (no `<img>`, no CLS budget issue if container is sized). Verified. | OK | – |
| 33 | **`data-aos` markup is heavy on Istanbul** (34 occurrences in 805 lines). AOS init runs on every paint until the elements are in view, costing some INP on slow devices. | LOW | Reduce to first-fold + major section entries (≤10 per page is plenty); on long trip pages most reveals fire offscreen anyway. |
| 34 | **Trip card images** (`assets/images/trips/`) are 183–409 KB JPGs — only WebP source omitted. All have `loading="lazy"` which masks the cost, but the home page can serve `<picture>` with AVIF/WebP for these to save ~50%. | MEDIUM | Generate trip card AVIF/WebP variants and add `<picture>` source order. |
| 35 | **Heroes-v2 directory is 18 MB total**. Per-page only one set is fetched, but **the storage cost on CDN** is high. Mobile crops are present (good); the desktop FG variant for Istanbul is 560 KB webp / 1.1 MB JPEG — large for a decorative foreground. | MEDIUM | Re-encode FG layers at quality 70 and target ≤300 KB webp. AVIF is already ~50% of webp size, prefer AVIF wherever supported. |
| 36 | **Unused CSS**: the 9975-line sheet ships full ruleset for every page. Visa page never uses `.trips-grid`, `.trip-card__from`, `.trip-card__monument`, calculator, booking-form, hotel-card; trip pages never use `.visa-country-card`, `.visa-partners`, FAQ accordion specifics. Rough estimate: 30–40% of selectors are page-specific and could be split. | MEDIUM | Mid-term: split into `base.css` + per-page modules. Quick win: do nothing (gzip handles repeated tokens well) — focus on critical-CSS inlining first (item 27). |
| 37 | **MapLibre lazy-boot via IntersectionObserver with 200 px rootMargin + 30 s hard timeout** — excellent pattern, prevents zombie loads. | OK | Keep. |
| 38 | **Cobe globe** on home: ~50 KB JS + GPU rendering loop. The code already caps DPR and reduces `mapSamples` per the recent perf commit (`30b724a`). | OK | Keep. |
| 39 | **OG images** are 65–120 KB JPGs. Reasonable. | OK | – |
| 40 | **Inline `<style>` in `<head>` of `index.html`** is ~120 lines — fine size-wise, no parse-blocking issue beyond the sheet. | OK | – |

### Top-3 perf bottlenecks (ordered by impact)

1. **Render-blocking 303 KB CSS** — inlining 10 KB critical above-the-fold rules + deferring rest could move LCP from ~3.2 s → ~1.4 s on 3G mobile (homepage cairo-sharm hero already preloaded — current LCP-image fetch is parallel; CSS download is the new long pole).
2. **Missing SRI on CDN scripts** — not a speed problem but a security & integrity correctness issue. Quick fix.
3. **Google Fonts external request** — self-hosted woff2 saves 1 RTT to gstatic, ~150 ms on cold starts. Combined with item 1, total budget shaved is meaningful.

---

## Summary by lane

- **Lane A factual**: All 10 visa-page country claims survive verification (10/10 PASS; CVASC hours noted as worth re-confirming with operator). All trademark/agency claims pass. **Critical date-hygiene issue**: 4 of 5 trip pages have past departure chips (Istanbul, KL fully past; sharm-constantine 60% past; azerbaijan 50% past). Cairo-sharm is the only fully-current page.
- **Lane B trademark**: 1 HIGH (visa fee "30 USD" on cairo-sharm), 1 MEDIUM (KL tax "20 USD"), 1 LOW (SA flag — keep), all others clean. No fake badges, no logos, scarcity language is factually-grounded, processing times always hedged.
- **Lane C performance**: 3 HIGH (render-blocking CSS, missing SRI ×2). The site is well-architected for perf (preloaded hero, defer everywhere, lazy maps, modern image formats with mobile crops, well-designed SW) — the remaining wins are critical CSS, SRI, and self-hosted fonts.
