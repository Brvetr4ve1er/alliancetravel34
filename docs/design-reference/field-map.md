# Aurora design → JSON field map

**Purpose:** for every dynamic element in the Aurora reference design, which `data/trips/<slug>.json`
path supplies it. This is the Rosetta stone every later section-porting task consumes to know which
`{{field}}` feeds which element — get this wrong and every downstream task inherits the error.

**Method:** built by reading `docs/design-reference/istanbul.html` (the target design) side-by-side
with `data/trips/istanbul.json` (the data available) and `tools/templates/sections/*.tpl` +
`tools/templates/engine.mjs` (the actual, current `{{path}}` / `{{#loop}}` / `{{?cond}}` / `{{k.*}}`
syntax already in production). `data/trips/SCHEMA.md` was consulted for background but is **stale**
in places (pre-dates the Aurora hero rewrite and several field renames — e.g. it documents
`hero.titlePre/titlePost` and a `calculator.*` namespace that no longer match the live JSON's
`hero.h1Pre/h1Em` and `calcUi.*`) — every path below was verified directly against the current JSON
and templates, not copied from SCHEMA.md.

Legend: `{{k.xxx}}` = the i18n hook — an attribute-position slot that template authors use to inject
`data-i18n="..."` (or similar) markers for the JS-side EN/AR switcher. It renders empty string today
on most keys (see `k` object, all values `""`) but the hook exists at every translatable element.

---

## 0. Top-level identity

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<body data-region="...">` | `{{region}}` | — |
| `<body data-page="...">` | `{{dataPage}}` | — |
| directory `site/<slug>/`, image path stem | `{{slug}}` | — |

---

## 1. `<head>` / meta / JSON-LD

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<title>` | `{{meta.title}}` | — |
| `<meta name="description">` | `{{meta.description}}` | — |
| `--accent` (`:root` inline style) | `{{accent.color}}` | — |
| `--accent-dim` | `{{accent.dim}}` | — |
| `--accent-glow` | `{{accent.glow}}` | — |
| `--hero-gradient` | `{{accent.heroGradient}}` | — |
| `<meta property="og:title">` + `<meta name="twitter:title">` | `{{meta.ogTitle}}` | — |
| `<meta property="og:description">` + `<meta name="twitter:description">` | `{{meta.ogDescription}}` | — |
| `<meta property="og:url">` / canonical / hreflang x-default | `https://alliance-travel.dz/{{slug}}/` (derived) | — |
| `<meta name="theme-color">` | `{{meta.themeColor}}` | — |
| hero bg preload `<link rel="preload">` (webp + mobile variant) | `{{=d.hero.bg.replace('--bg.jpg','--bg.webp')}}` / `--bg--mobile.webp` — computed from `{{hero.bg}}` | — |
| BreadcrumbList position-3 name | `{{jsonLd.breadcrumbName}}` | — |
| TouristTrip `name` | `{{seo.tripName}}` | — |
| TouristTrip `description` | `{{seo.tripDescription}}` | — |
| TouristTrip `offers.price` | `{{seo.offerPrice}}` | — |
| FAQPage `mainEntity[]` (whole block) | `{{&faqJsonLd}}` — **codec**, rendered from `seo.faqJsonLd[]` (`{name, text}` per item; mirrors `faq[]` but stored separately, not derived at render time) | — |
| `<meta property="og:image">` / `twitter:image` | `https://alliance-travel.dz/assets/images/og/{{meta.ogImage}}` | — |

---

## 2. Nav

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<nav class="site-nav">` attrs | — | `{{k.navAttrs}}` |
| `<ul class="nav-links">` attrs | — | `{{k.navListRole}}` |
| Nav links text (Programme/Hôtels/FAQ/Réserver/Visa) | shared literal text in template, each has `data-i18n="nav.*"` static keys (not JSON-driven) | `nav.trip_program` etc. (static, in markup) |
| WhatsApp/Réserver CTA text | `{{nav.ctaHtml}}` | — |
| Logo SVG, theme toggle | shared markup (not data-driven) | — |

---

## 3. Hero — ⚠ SEE GAP-1 (template/design mismatch)

The Aurora reference page's hero is `<section class="aurora-hero">` (full-bleed photo, visible
`<h1>`, separate `.aurora-hero__offer` price block, plus a following `<section class="hero-intro">`
slim strip for lede/fineprint). **`tools/templates/sections/hero.tpl` still targets the OLDER
`<section class="scroll-hero">` markup** (data-attribute-driven title, no visible `<h1>`, no
`.aurora-hero__offer`, no `hero-intro` section) — see GAP-1 below. The mapping here is against the
**JSON fields**, which already carry the right values; only the `.tpl` file needs a rewrite in a
later porting task.

| Aurora element | JSON path | i18n hook |
|---|---|---|
| Hero bg image (`<picture>` sources + `<img>`) | `{{hero.bg}}` (jpg; webp/avif variants derived by suffix swap) | — |
| `.aurora-hero__eyebrow` span text | `{{hero.eyebrow}}` | `istHeroEyebrow` (data-i18n, static per-page key) |
| `<h1 class="aurora-hero__title">` pre-em text | `{{hero.h1Pre}}` | part of `istHeroH1` (data-i18n-html) |
| `<h1>` `<em>` text | `{{hero.h1Em}}` | part of `istHeroH1` |
| `.aurora-hero__date` | `{{hero.date}}` | `istHeroDate` |
| `.aurora-hero__from` ("À partir de") | shared label | `heroFrom` |
| `.aurora-hero__amount` (`<strong>`) | `{{hero.priceFrom}}` | — |
| `.aurora-hero__unit` | `{{hero.priceUnit}}` | `istHeroPriceUnit` |
| `.aurora-hero__actions` "Calculer mon prix" CTA text | shared label | `istHeroCtaCalc` |
| `.aurora-hero__wa` WhatsApp CTA | shared markup (wa.me link is shared, not per-trip) | — |
| `.hero-intro__lede` | `{{hero.lede}}` | `istHeroLede` |
| `.hero-intro__fineprint` | `{{hero.fineprint}}` | `istHeroFineprint` |
| unused-in-Aurora JSON fields | `hero.titlePre`, `hero.titlePost`, `hero.prompt`, `hero.skip` — legacy `scroll-hero` attributes; harmless leftovers, not consumed by the Aurora markup | — |

---

## 4. Highlights (`highlights[]`, always 4 cards)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<section class="highlights">` attrs | — | `{{k.hlSection}}` |
| card icon SVG inner markup | `{{.iconSvg}}` (raw `<path>`/`<circle>`/... string, per item) | — |
| `.hl-card__label` ("Jour 2" etc.) | `{{.label}}` | `{{.kLabel}}` |
| `.hl-card__title` | `{{.title}}` | `{{.kTitle}}` |
| `.hl-card__body` | `{{.body}}` | `{{.kBody}}` |
| `data-aos-delay` (0,100,200,300) | computed `{{=i*100}}` — **not stored in JSON**, positional by loop index | — |

---

## 5. Itinerary (`itinerary.*`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| phase-marker label ("Découvrir") | `{{itinerary.phaseLabel}}` | `{{k.itinPhase}}` |
| `.section-head__eyebrow` ("8 jours · 7 nuits") | `{{itinerary.eyebrow}}` (optional — `{{?itinerary.eyebrow}}`) | `{{k.itinEyebrow}}` |
| `<h2>` title HTML | `{{itinerary.titleHtml}}` | `{{k.itinTitle}}` |
| `.section-head__sub` | `{{itinerary.sub}}` (optional; not present on istanbul) | `{{k.itinSub}}` |
| `.tl-node` badge (J1, J2...) | `{{.node}}` | `{{.kNode}}` |
| `tl-day active` class | `{{.active}}` (bool, first day only) | — |
| `data-aos-delay` per day | `{{.aosDelay:int}}` (stored per item from day 2 onward; day 1/active has none — template only emits the `data-aos` attrs inside the `{{?.active}}...{{:}}...{{/?}}` else-branch) | — |
| `.tl-day-label` ("Jour 1") | `{{.dayLabel}}` | `{{.kLabel}}` |
| `.tl-title` | `{{.title}}` | `{{.kTitle}}` |
| `.tl-activities` | `{{.activities}}` | `{{.kAct}}` |
| `.tl-tag` chips (optional per day) | `{{#.tags}}` loop → `{{.t}}` | `{{.k}}` per tag |

---

## 6. Trip map (`tripMap.*`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `.section-head__eyebrow` | `{{tripMap.eyebrow}}` | `{{k.mapEyebrow}}` |
| `<h2>` title | `{{tripMap.titleHtml}}` | `{{k.mapTitle}}` |
| `.section-head__sub` | `{{tripMap.subHead}}` | `{{k.mapSub}}` |
| `#trip-map[aria-label]` | `{{tripMap.ariaLabel}}` | — |
| `.tmap-fallback__title` ("Chargement de la carte…") | shared literal | `{{k.mapLoading}}` |
| `.tmap-fallback__sub` | `{{tripMap.subFallback}}` | — |
| legend "Hôtels" / "Sites visités" / "Excursions guidées" | `{{tripMap.legendHotels}}` / `{{tripMap.legendSites}}` / `{{tripMap.legendTours}}` | `{{k.legendHotels}}` / `{{k.legendSites}}` / `{{k.legendTours}}` |
| `window.TRIP_MAP_DATA` (whole script block) | `{{&tripMapData}}` — **codec**, rendered from `tripMap.data` (`{name, hotels[], sites[], tours[], hubs[], routes[]}`, `loc:[lng,lat]`) | — |

---

## 7. Trust (`trust.*`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `.section-head__eyebrow` ("Plus de 1.200 voyageurs guidés") | shared literal | `{{k.trustEyebrow}}` |
| `<h2>` ("Ils nous ont fait confiance") | shared literal | `{{k.trustTitle}}` |
| `.stat-card__num` | `{{.num}}` per `trust.stats[]` item | `{{.kNum}}` |
| `.stat-card__label` | `{{.label}}` | `{{.k}}` |
| `.testi-text` | `{{.text}}` per `trust.testimonials[]` item | `{{.kText}}` |
| `.testi-avatar` initials | `{{.initials}}` | — |
| `.testi-name` | `{{.name}}` | — |
| `.testi-trip` | `{{.trip}}` | `{{.kTrip}}` |
| `.testi-stars` (★★★★★, always 5) | shared literal, not data-driven | — |

---

## 8. Inclus (`inclus.*`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| section head eyebrow/title/sub | shared literals (identical on all pages) | `{{k.inclEyebrow}}` / `{{k.inclTitle}}` / `{{k.inclSub}}` |
| "Inclus dans le forfait" col title | shared literal | `{{k.inclColTitle}}` |
| `.inclus-col__count` (yes col) | `{{inclus.includedCount}}` | `{{k.inclColCount}}` |
| `.inclus-item--yes span` (each) | `{{.t}}` per `inclus.included[]` item | `{{.k}}` |
| "À prévoir en plus" col title | shared literal | `{{k.exclColTitle}}` |
| `.inclus-col__count` (no col) | `{{inclus.excludedCount}}` | `{{k.exclColCount}}` |
| `.inclus-item--no span` (each) | `{{.t}}` per `inclus.excluded[]` item | `{{.k}}` |

---

## 9. FAQ (`faq[]`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<section id="faq">` attrs | — | `{{k.faqSection}}` |
| section head eyebrow/title | shared literal ("FAQ" / "Questions fréquentes") | `{{k.faqEyebrow}}` / `{{k.faqTitle}}` |
| `.faq-item.open` class + `aria-expanded` | `{{.open}}` (bool, first item `true`) | — |
| `data-aos-delay` (positional, 0/50/100/150) | `{{.aosDelay:int}}` — stored per item (from item 2 onward) | — |
| `.faq-q` button text | `{{.question}}` | `{{.kQ}}` (button itself: `{{.kBtn}}`) |
| `.faq-a` inner HTML | `{{.answerHtml}}` | `{{.kA}}` |

Note: `faq[].question`/`.answerHtml` are the display copy; `seo.faqJsonLd[]` is a **separate**
parallel array feeding the FAQPage JSON-LD (§1) — the build script (`tools/build.mjs`) already warns
if they drift (see bali.json warning observed during `--check`, pre-existing, out of scope here).

---

## 10. Hotels (`hotelsSection` + `hotels[]`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| phase-marker label ("Comparer les hôtels") | `{{hotelsSection.phaseLabel}}` | `{{k.hotelsPhase}}` |
| `.section-head__eyebrow` | `{{hotelsSection.eyebrow}}` (optional) | `{{k.hotelsEyebrow}}` |
| `<h2>` title HTML | `{{hotelsSection.titleHtml}}` | `{{k.hotelsTitle}}` |
| `.section-head__sub` | `{{hotelsSection.sub}}` | `{{k.hotelsSub}}` |
| `.tier-tabs` block (optional — omitted when single-hotel) | `{{?hotelsSection.tierTabs}}` guard | `{{k.tierTabsAria}}` |
| `.tier-tab` button (`data-tier`, label, `aria-pressed`) | `{{.tier}}` / `{{.tier2}}` (== data-track-label) / `{{.label}}` / `{{.active}}` per `hotelsSection.tierTabs[]` item | `{{.k}}` |
| optional hint paragraph below tabs | `{{hotelsSection.hint}}` (guarded — `false` on istanbul → omitted) | `{{k.hotelsHint}}` |
| `.hotel-grid` attrs | — | `{{k.hotelGridAttrs}}` |
| `.hotel-card` root (`data-hotel-id`, `data-tier`) | `{{.calcId}}` / `{{.tier}}` per `hotels[]` item | `{{.kRole}}` (article), `{{.kAria}}` |
| `data-aos-delay` (0,60,120,180) | `{{.aosDelay:int}}` — stored per item | — |
| `.hotel-card__photo` src/alt | `{{.image}}` / `{{.alt}}` | — |
| `.hotel-card__ribbon` class + text | `{{.ribbonClass}}` / `{{.ribbon}}` | `{{.kRibbon}}` |
| `.hotel-card__stars` (★★★★ text, aria-label count) | `{{.starsHtml}}` (rendered string) / `{{.stars:int}}` (count, aria-label only) | — |
| `.hotel-card__name` | `{{.name}}` | — |
| `.amenity-pill` chips | `{{#.amenities}}` → `{{.t}}` per item | `{{.k}}` |
| `.hotel-card__price-label` ("À partir de") | `{{.priceLabel}}` | `{{.kPriceLabel}}` |
| price `<strong>` | `{{.priceFrom}}` | `{{.kPrice}}` |
| `.hotel-card__price-meta` | `{{.priceMeta}}` | `{{.kMeta}}` |
| "Sélectionner" button | shared literal | `{{.kCta}}` |

---

## 11. Calculator (`calcUi.*` + `tripData.*`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| phase-marker label ("Calculer mon prix") | `{{calcUi.phaseLabel}}` | `{{k.calcPhase}}` |
| `.section-head__eyebrow` | `{{calcUi.eyebrow}}` (optional) | `{{k.calcEyebrow}}` |
| `<h2>` title HTML | `{{calcUi.titleHtml}}` | `{{k.calcTitle}}` |
| `.section-head__sub` | `{{calcUi.sub}}` (optional) | `{{k.calcSub}}` |
| `.calc-form` attrs | — | `{{k.calcFormAttrs}}` |
| date label | `{{calcUi.dateLabel}}` | `{{k.calcDateLabel}}` |
| `.date-chips` roving-tabindex container | — | `{{k.dateChipsRole}}` |
| `.date-chip` (`data-date`, active state, display label) | `{{.value}}` / `{{.active}}` / `{{.label}}` per `calcUi.dateChips[]` item | `{{.k}}` |
| optional date hint paragraph | `{{calcUi.dateHint}}` (guarded; not present on istanbul) | `{{k.dateHintAttrs}}` |
| hotel-select label | `{{calcUi.selectLabel}}` | `{{k.calcSelectLabel}}` |
| `<select>` element attrs | — | `{{k.selectAttrs}}` |
| `<option>` list (whole block) | `{{calcUi.optionsHtml}}` — pre-rendered HTML string, NOT a loop | — |
| room-type label | `{{calcUi.roomLabel}}` | `{{k.calcRoomLabel}}` |
| `.segmented` attrs | — | `{{k.segmentedAttrs}}` |
| `.seg-opt` button (`data-room`, active, label) | `{{.room}}` / `{{.active}}` / `{{.label}}` per `calcUi.roomOptions[]` item | `{{.k}}` |
| travellers label | `{{calcUi.travellersLabel}}` | `{{k.calcTravLabel}}` |
| stepper rows (adults + kid steppers, whole block) | `{{calcUi.steppersHtml}}` — pre-rendered HTML string | — |
| "À noter" visa note block (whole block) | `{{calcUi.noteHtml}}` — pre-rendered HTML string | — |
| `#breakdown` attrs | — | `{{k.breakdownAttrs}}` |
| "Récapitulatif" header | shared literal | `{{k.recap}}` |
| `.breakdown__empty` placeholder text | `{{calcUi.emptyMsg}}` | `{{k.recapEmpty}}` |
| "Total estimé" label | shared literal | `{{k.totalLabel}}` |
| "Pourquoi ce prix ?" `<details>` (whole block) | `{{calcUi.whyHtml}}` — pre-rendered HTML string | `{{k.whyAttrs}}` |
| continue-to-booking `<a>` attrs | — | `{{k.continueA}}` |
| continue-to-booking label text | `{{calcUi.continueLabel}}` | `{{k.continue}}` |
| "Étape suivante..." caption | `{{calcUi.nextStep}}` | `{{k.nextStep}}` |
| `window.TRIP_DATA` (whole script block) | `{{&tripData}}` — **codec**, rendered from top-level `tripData` object (`name`, `dates[]`, `hotels[]` with nested `prices{double,triple,single,child1,child2,baby}` + `why`, `extras[]`) | — |
| sticky mobile total bar (label / CTA text) | shared literals | `{{k.stickyLabel}}` / `{{k.stickyCta}}` (bar attrs: `{{k.stickyAria}}`) |

**Kid-stepper hazard (carried over from SCHEMA.md, still true):** the visible rows "Enfants 6–12 ans"
and "Enfants 2–5 ans" bind to `data-kid-type="child_b"` / `"child_a"` respectively (note the swapped
letter/age order vs. `tripData.hotels[].prices.child1`/`child2`) — this mapping lives inside the
pre-rendered `calcUi.steppersHtml` string, not as discrete JSON fields. A later section task must
NOT re-derive this from field names; treat `steppersHtml` as opaque markup to copy verbatim per trip.

---

## 12. Info blocks (`infoBlocks[]`, always shown as `<details>`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| section head eyebrow/title/sub | shared literals | `{{k.infoEyebrow}}` / `{{k.infoTitle}}` / `{{k.infoSub}}` |
| `<details open>` (first block only) | `{{.open}}` per `infoBlocks[]` item | — |
| icon SVG inner markup | `{{.iconSvg}}` (raw path string) | — |
| `.info-card__title` | `{{.title}}` | `{{.kTitle}}` |
| `.info-card__lede` (optional) | `{{.ledeHtml}}` (guarded `{{?.ledeHtml}}`) | `{{.kLede}}` |
| `.info-list > li` (each) | `{{.t}}` per `.list[]` item | `{{.k}}` |
| `.info-card__note` (optional, trailing) | `{{.noteHtml}}` (guarded `{{?.noteHtml}}`) | `{{.kNote}}` |

---

## 13. Related (`related[]`, always 2 cards)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| section head eyebrow/title | shared literals ("Vous aimerez aussi" / "Continuez votre découverte") | `{{k.relEyebrow}}` / `{{k.relTitle}}` |
| card `href` | `../{{.slug}}/` (derived from `.slug`) | — |
| decorative SVG art (whole block) | `{{.artSvg}}` — raw per-slug SVG markup, hand-authored, not further decomposed | — |
| `.related-card__flag` text + inline color | `{{.flag}}` / `style="color:{{.color}}"` | `{{.kFlag}}` |
| `.related-card__title` | `{{.title}}` | `{{.kTitle}}` |
| `.related-card__price` | `{{.priceHtml}}` | `{{.kPrice}}` |
| `.related-card__cta` outer span + color | `style="color:{{.color}}"` | `{{.kCtaOuter}}` |
| "Voir ce voyage" label | shared literal | `{{.kCta}}` |

---

## 14. Final CTA (`finalCta.*`)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<section class="final-cta">` attrs | — | `{{k.finalSection}}` |
| `.final-cta__scarcity` text | `{{finalCta.scarcityHtml}}` | `{{k.finalScarcity}}` |
| `<h2>` title HTML (with `<br>` + `<em>`) | `{{finalCta.titleHtml}}` | `{{k.finalTitle}}` |
| `.final-cta__sub` | `{{finalCta.sub}}` | `{{k.finalSub}}` |
| `.final-cta__actions` (whole block — WhatsApp + phone buttons) | `{{finalCta.actionsHtml}}` — pre-rendered HTML string | — |
| `.contact-row` (whole block) | `{{finalCta.contactHtml}}` — pre-rendered HTML string | — |

---

## 15. Footer — ⚠ SEE GAP-2 (missing footer-cta block in JSON)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| `<footer class="site-footer">` attrs | — | `{{k.footerAttrs}}` |
| entire footer inner HTML | `{{footer.html}}` — one opaque pre-rendered HTML string covering brand/social/nav-columns/contact/copyright | (embedded `data-i18n="footer.*"` attrs live inside the string itself) |

The Aurora reference page's footer opens with a `.footer-cta` block ("Prêt à partir ?" / "Écrivez-nous
sur WhatsApp, réponse le jour même." / "Discuter sur WhatsApp" button, each with `data-i18n="footer.cta_*"`)
**before** `.footer-grid`. `data/trips/istanbul.json`'s `footer.html` string starts directly at
`<div class="footer-grid">` — the `.footer-cta` block is absent. See GAP-2.

---

## 16. Scripts / trailing data — ⚠ SEE GAP-3 (i18n dictionary absent for istanbul)

| Aurora element | JSON path | i18n hook |
|---|---|---|
| sticky total bar | see §11 (calc) | — |
| `window.TRIP_DATA` | see §11 (calc) | — |
| `window.AL_PAGE_I18N` (whole script block, EN + AR dictionaries) | `{{&pageI18n}}` — **codec**, guarded by `{{?i18n}}`; rendered from top-level `i18n.en` / `i18n.ar` objects | — |

`tools/templates/sections/scripts.tpl` line 4: `{{?i18n}}<script>{{&pageI18n}}</script>{{/?}}` — the
whole block is **conditionally omitted** when the trip JSON has no top-level `i18n` key. All 6 other
trips (azerbaidjan, bali, egypte, kuala-lumpur, tunisie, vietnam) carry populated `i18n.en`/`i18n.ar`
dictionaries; istanbul.json does not (confirmed: `Object.keys(istanbul.json)` omits `i18n` entirely).
The reference page nonetheless **does** ship a real `window.AL_PAGE_I18N` block with EN + AR content
for istanbul (see raw HTML tail) — meaning the live/reference page is ahead of the JSON here. This
is a content gap (translated copy), not presentational. See GAP-3.

---

# GAPS

Three gaps found. None were content-safe to fabricate at the "small unambiguous presentational
field" bar this task authorizes — all three are either template-level (not a JSON field at all) or
require real translated/marketing copy. All are **deferred** to a later task; **no JSON files were
edited** in this task.

## GAP-1 — `hero.tpl` targets stale `scroll-hero` markup, not the Aurora `aurora-hero` + `hero-intro` markup
- **Type:** template mismatch (not a missing JSON field — the JSON already has the right values:
  `hero.eyebrow`, `hero.h1Pre`, `hero.h1Em`, `hero.date`, `hero.priceFrom`, `hero.priceUnit`,
  `hero.lede`, `hero.fineprint` all exist and hold Aurora-correct content).
- **What's missing:** `tools/templates/sections/hero.tpl` still emits `<section class="scroll-hero" data-title-pre="..." data-title-post="...">` with no visible `<h1>`, no `.aurora-hero__offer`
  block, and no following `<section class="hero-intro">` — none of which matches the reference
  page's actual markup (`aurora-hero` full-bleed photo hero + slim `hero-intro` strip). A code
  comment in the reference page's script tail confirms this was an intentional, completed redesign
  on the content side: `<!-- v27: scroll-hero.js removed — Horizon Aurora hero is full-bleed and needs no scrub engine. -->`.
- **Classification:** template/code change, not a data gap. Out of scope for this task (JSON-only
  edits per the brief). Flagging so the section-porting task that rewrites `hero.tpl` knows to
  target `aurora-hero` + `hero-intro`, not `scroll-hero`.
- **Unused legacy fields once hero.tpl is rewritten:** `hero.titlePre`, `hero.titlePost`,
  `hero.prompt`, `hero.skip` will likely become dead JSON once the new template stops reading
  `scroll-hero`'s data-attributes — leave them for now (harmless), revisit when hero.tpl is rewritten.

## GAP-2 — `footer.html` is missing the `.footer-cta` block present in the Aurora reference page
- **Exact JSON path to add:** a new field inside `footer` — suggest `footer.ctaHtml` (parallel to
  the existing `footer.html` opaque-string pattern), OR prepend the block directly into the
  existing `footer.html` string. Either is viable; the section-porting task should pick one and
  apply it consistently across all 7 trips (all 7 need the same fix — this is a footer.tpl input,
  not verified per-trip, since the CTA text itself is shared/generic across trips per the reference
  page's own copy).
- **Source value** (read verbatim from `docs/design-reference/istanbul.html`, tail of the `<footer>`
  block, immediately before `.footer-grid`):
  ```html
  <div class="footer-cta">
    <div class="footer-cta__text">
      <h3 data-i18n="footer.cta_title">Prêt à partir ?</h3>
      <p data-i18n="footer.cta_sub">Écrivez-nous sur WhatsApp, réponse le jour même.</p>
    </div>
    <a class="btn btn--primary footer-cta__btn" href="https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener" data-i18n="footer.cta_btn">Discuter sur WhatsApp</a>
  </div>
  ```
- **Classification:** **CONTENT** (marketing copy + a live WhatsApp deep link), not presentational.
  The copy reads as shared/generic ("Prêt à partir ?" is destination-agnostic) so it is *plausibly*
  safe to copy verbatim into all 7 trips — but the task brief's conservative rule is to defer
  anything requiring judgment on whether copy is truly identical across all 7 reference pages, and
  I did not open the other 6 reference pages to confirm byte-identical footer-cta copy on each. A
  later section task should (a) diff this block across all 7 `docs/design-reference/*.html` files
  to confirm it is indeed identical everywhere, then (b) add it once, shared, or per-trip if any
  page diverges.

## GAP-3 — istanbul.json has no top-level `i18n` key; `window.AL_PAGE_I18N` renders empty for istanbul
- **Exact JSON path to add:** top-level `i18n.en` and `i18n.ar` objects (shape confirmed against
  `data/trips/vietnam.json`'s `i18n.en`/`i18n.ar` as a working example — flat key/value dictionary
  matching each page's own `ist*`-prefixed i18n keys).
- **Source value:** the reference page already ships a complete, real `window.AL_PAGE_I18N` block
  for istanbul (see `docs/design-reference/istanbul.html`, script tail, ~40 lines) with both `en`
  and `ar` translations for `heroFrom`, `istHeroEyebrow`, `istHeroH1`, `istHeroDate`,
  `istHeroPriceUnit`, `istHeroCtaCalc`, `istHeroLede`, `istHeroFineprint`, and `footer.cta_*`. This
  is genuine, already-written translated copy — not something to newly author — but transcribing an
  entire bilingual dictionary block-for-block is exactly the kind of content operation the task
  brief asks to defer rather than have me silently copy-paste under a JSON-field-audit task.
- **Classification:** **CONTENT** (translated copy, high transcription risk for Arabic RTL text).
  This aligns with the existing session memory note (`alliance-travel-i18n-state.md`): "FR/EN/AR
  switcher partially restored... pill live, body text not translated yet" — istanbul's missing
  `i18n` block is very likely the exact known gap that note describes. Deferred to a later i18n-focused
  task, which should transcribe `window.AL_PAGE_I18N` from the reference page into
  `data/trips/istanbul.json`'s `i18n.en`/`i18n.ar` verbatim (byte-for-byte, including the `footer.cta_*`
  nested keys which mirror GAP-2) and re-run `node tools/build.mjs --check` to confirm.

---

# Coverage summary

- **~230 distinct dynamic elements** mapped across 16 sections (head/meta/JSON-LD, nav, hero,
  highlights, itinerary, tripmap, trust, inclus, faq, hotels, calc, infoblocks, related, finalcta,
  footer, scripts) — every element in the Aurora reference page that varies per trip now has an
  explicit `{{json.path}}` (or, for opaque pre-rendered HTML fields, the containing string field)
  plus its `{{k.*}}` i18n hook where one exists.
- **3 GAPS found, 0 filled, 3 deferred.** All three required either a template rewrite (GAP-1,
  not a JSON field) or content/translation judgment (GAP-2, GAP-3) — neither qualifies as the "small,
  unambiguous presentational field" bar this task's guardrail sets for filling gaps directly. No
  `data/trips/*.json` files were modified.
- **`node tools/build.mjs --check` baseline:** ran once before starting (no edits made either way,
  but confirmed as the pre-existing state): exits 0, "Build OK — 7 fichier(s) validé(s), 7 rendu(s),
  0 inchangé(s), 0 non publié(s)", with one **pre-existing, unrelated** warning
  (`bali.json`: `seo.faqJsonLd[3].name` differs from the matching FAQ question by an HTML-escaped
  ampersand) — not touched, out of scope.
