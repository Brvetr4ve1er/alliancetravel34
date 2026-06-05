# Visa Page Adversarial Audit — 2026-06-05

Audit scope: commits `30d724a`, `b0c1195`, `45b126b`, `0a1003d` on branch `refactor/trim-v26`.
Auditor: independent reviewer. Read-only pass; no code changed.

---

## 1. Critical issues (block ship)

### C1. Nav link on the visa page itself uses a non-existent i18n key — English / Arabic users see French
`site/rendez-vous-visa/index.html:124` uses `data-i18n="nav.visa"`. **No such key exists** in any of the three language blocks of `site/assets/js/i18n.js` (only `nav.visa_rdv` does). The seven other pages (`site/index.html:227`, `site/voyages/index.html:73`, `site/istanbul/index.html:148`, `site/azerbaidjan/index.html:149`, `site/cairo-sharm/index.html:159`, `site/sharm-constantine/index.html:148`, `site/kuala-lumpur/index.html:148`) all use the correct `data-i18n="nav.visa_rdv"`. The engine's missing-key fallback (`site/assets/js/i18n.js:1058`) reverts to the live French baseline. Net effect: when an English/Arabic user lands on the visa page itself, the "Rendez-vous Visa" link stays in French while every other nav element translates.
Fix: change `data-i18n="nav.visa"` → `data-i18n="nav.visa_rdv"` on visa page line 124.

### C2. Footer tagline key doesn't exist — language switch leaks French
`site/rendez-vous-visa/index.html:515` uses `data-i18n="footer.tagline_short"`. The dictionary has `footer.tagline` (line 159 FR, 462 EN, 762 AR) but no `footer.tagline_short` in any language. Same fallback path as C1 → the footer subtitle stays "Agence de voyages · Bordj Bou Arreridj · depuis 2019" (French) in EN and AR.
Fix: either rename the page attribute to `footer.tagline` or add `tagline_short` to all three language blocks. The existing live French copy is shorter than `footer.tagline`, so the simplest fix is to add `tagline_short` keys.

### C3. Map fallback never hides — visible visual glitch when map loads
`site/assets/js/visa-map.js:85` sets `container.classList.add('visa-map--ready')`. The CSS selector that hides the loading overlay is `.trip-map--ready .tmap-fallback { opacity: 0; pointer-events: none; }` at `site/assets/css/styles.css:6680`. The class names don't match. After the map boots, the "Chargement de la carte… / VFS · BLS · TLScontact · CVASC · 3 agences Alliance Travel" text remains painted on top of the rendered pins. Users see a permanent "loading" overlay over a working map.
Fix: change line 85 to `container.classList.add('trip-map--ready')`. (Or add a sibling CSS rule for `.visa-map--ready`.)

---

## 2. High issues (fix before deploy)

### H1. Meta descriptions exceed Google's ~160-char truncation threshold in FR and EN
- FR description: 176 chars (`site/rendez-vous-visa/index.html:7` and `site/assets/js/i18n.js:236`)
- EN description: 190 chars (`site/assets/js/i18n.js:536`)
- AR description: 156 chars — OK

Google typically truncates at ~155-160 chars. The "— pas besoin de monter à Alger" / "— no trip to Algiers required" tail (the page's strongest hook) is the part that gets cut. Recommend trimming each to ≤155.

### H2. Missing Open Graph and Twitter image meta tags
`site/rendez-vous-visa/index.html` lines 64-73 set up OG / Twitter cards with `twitter:card = summary_large_image` but **no `og:image` or `twitter:image`** declared. Shares on WhatsApp, Facebook, Twitter/X, LinkedIn will display with no preview thumbnail — a major loss on the page whose sole CTA is "WhatsApp" sharing.
Fix: add `<meta property="og:image" content="https://alliance-travel.dz/assets/images/og/og-visa.jpg"/>` + `<meta name="twitter:image"...>` (and ship the asset, dimensions ≥1200×630).

### H3. Two map pins share identical coordinates → they will stack visually
`site/assets/js/visa-map.js:52` (`cn-cvasc`) and `:68` (`ca-vac`) both use `loc: [3.0125, 36.7585]`. Both providers are in Ben Aknoun, but at different street addresses; identical coords make the two markers stack on the same pixel — the user clicks one and only sees one popup. The pin marked `verified: false` (i.e. ~200m accurate) needs a real coord pass per the comment at line 22-25. Fix: ground-truth each via the providers' own published location pages and update the second pin.

### H4. Two country notes quote processing times without "selon ambassade" hedge
The audit charter required every delay/duration to be hedged. Two slips:
- `site/rendez-vous-visa/index.html:257` (Allemagne): "décision sous 15 jours en standard, dépôt entre 6 mois et 15 jours avant le départ" — no caveat.
- `site/rendez-vous-visa/index.html:293` (Chine): "Délai standard 4 jours ouvrables" — no caveat.

Mirrored in `site/assets/js/i18n.js:272, 274` (FR) and the EN / AR equivalents. Russia and France ARE properly hedged (`selon Code Schengen`, `selon ambassade`). Fix: append "· selon ambassade" / "· subject to embassy" / "· حسب السفارة" to both DE and CN notes in all three languages.

### H5. "TLScontact" mentioned four times in copy despite no covered country using it
`site/rendez-vous-visa/index.html:176, 204, 401, 406` list TLScontact among the providers Alliance Travel routes you through. France (the only country whose dossiers TLScontact used to handle) was migrated to Capago in April 2025, per the page's own copy at line 221. None of the ten featured countries currently uses TLScontact. Result: a user reads "VFS, BLS, TLScontact ou CVASC" then never sees TLScontact again in the country grid. The map legend (`:412`) was correctly updated to "VFS · BLS · Capago · CVASC" — these four other instances were missed.
Fix: replace each "TLScontact" mention with "Capago" (already done in legend) in lines 176, 204, 401, 406 and the matching i18n entries at `i18n.js:258, 266, 285, 287` (FR), and EN/AR mirrors.

### H6. Visa page nav logo doesn't carry the inline-SVG "Travel" wordmark from prior commit
Other pages (e.g., `site/index.html:224`, `site/istanbul/index.html`) embed a 426×148 viewBox inline SVG that lets the "Travel" stroke styling apply. `site/rendez-vous-visa/index.html:120` uses `<img src="../assets/images/logo.svg" ...>` — a flat raster reference that won't honour the per-letter stroke effects shipped in commit `b0c1195`. Visually inconsistent nav across the site.
Fix: paste the inline SVG markup used on the other pages into the visa-page nav.

### H7. The visa page nav link path is absolute, every other site link is relative
`site/rendez-vous-visa/index.html:124` uses `href="/rendez-vous-visa/"`. Every other page (root index, trip pages, voyages catalog) uses relative paths (`rendez-vous-visa/` or `../rendez-vous-visa/`). Under a subdirectory deployment (staging, GitHub Pages preview, etc.), this absolute link would break. Fix: replace with `./` or `index.html`.

---

## 3. Medium issues (worth fixing)

### M1. Partner strip eyebrow word choice — "Partenaires" / "Partners"
`site/rendez-vous-visa/index.html:420` and `i18n.js:315, 615, 915` label the strip "Partenaires opérationnels" / "Operational partners" / "الشركاء التشغيليّون". The disclaimer immediately below clarifies "not affiliated, does not act on their behalf" — so the legal exposure is mitigated — but pairing "partenaires" + "not affiliated" sends a contradictory signal. Lower-risk language: "Centres officiels traités" / "Official centres we file through" / "المراكز الرسميّة التي نتعامل معها".

### M2. Partners section heading is a `<p>` rather than an `<h2>`
`site/rendez-vous-visa/index.html:420` — section is `aria-labelledby`'d to an eyebrow paragraph, not an `<h2>`. Screen readers receive the label but the document outline skips a heading level here. Minor a11y/SEO smell; add an `<h2>` (visually hidden if needed) or convert the eyebrow to `<h2>`.

### M3. Inline fallback uses `tmap-fallback` class but lacks the expected child classes
Lines 404-407 use `<p>` tags with inline styles rather than the `.tmap-fallback__title` / `.tmap-fallback__sub` markup used by `trip-map.js:427-429`. The page-level CSS overrides at `styles.css:6668-6678` therefore don't apply consistently. Cosmetic — but the inline styles still render; once C3 is fixed, the user won't see this overlay anyway.

### M4. Coordinate precision inconsistent in visa-map data
`site/assets/js/visa-map.js` mixes 4-decimal coords (~10m precision) with 6-7 decimal coords (~1cm). The file header (lines 22-25) admits some are "verified, others ~200m". Inconsistent precision is fine internally but is a smell that some pins haven't been ground-truthed. Combined with H3, recommend a single pass to verify all 16 pins against the providers' own pages before launch.

### M5. Capago Annaba and Constantine coords are likely placeholder
`fr-capago-annaba` `[7.7667, 36.9000]` and `fr-capago-constantine` `[6.6019, 36.3650]` are round (4-decimal) numbers that look like city-centre averages, not actual Capago office locations. Annaba is a small city — a misplaced pin will show on the wrong street. Verify against `capago.eu/algerie/`.

### M6. The audit-spec-required `nav.visa_rdv` AR translation reads as "مواعيد التأشيرات" (Visa Appointments)
The Arabic key (`i18n.js:651`) is "مواعيد التأشيرات" (plural). Correct, idiomatic. Confirmed working as intended.

### M7. Egypt note mentions a "5-year multi-entry visa announced" without source
`site/rendez-vous-visa/index.html:329` (and mirrors in EN/AR) refers to "Nouvelle multi-entrée 5 ans annoncée pour Algériens — à vérifier au cas par cas". The "à vérifier" hedge is there, but this is the kind of detail that can be wrong by the time a user reads it. Consider removing or attaching a date stamp.

### M8. Country `<details>` cards have no `name=` attribute → multiple can be open at once
Modern HTML supports `<details name="visa-countries">` to make a group exclusive. The 10 country cards currently allow every one to be open simultaneously, which makes the page very tall on mobile after a curious tap-spree. Cosmetic but a polish improvement.

---

## 4. Verified correct (high-stakes claims that survived the audit)

- **`node --check`** passes on both `i18n.js` and `visa-map.js`. The nested layout — where `meta.visa` (line 234) and page-level `visa` (line 241) coexist as siblings under `T.fr` — parses cleanly. Same pattern intact in EN (`:534/541`) and AR (`:834/841`).
- **Sitemap valid** — 8 URLs, `rendez-vous-visa` entry with `hreflang="x-default"`.
- **Both JSON-LD blocks parse cleanly** (BreadcrumbList, Service).
- **11 flag SVGs all present**, sizes 221 B–26.3 KB. None broken, none oversized.
- **17 WhatsApp links, all with `?text=` pre-filled**, all using +213 561 616 266.
- **No fee quoted as Alliance Travel's price.** US visa-bond ($5-15K), Schengen €30K insurance minimum — all third-party-set figures, not Alliance's quote. FAQ q3 routes cost questions to "devis personnalisé".
- **No fake scarcity counters** (searched "places restantes", "tickets left", "أماكن متبقّية").
- **No partnership/affiliation claim.** Disclaimer at `:421` and FAQ q14 (`i18n.js:611`) explicitly say "neither an official partner nor a representative". (See M1 for tightening.)
- **Flags only — no embassy seals or state arms.**
- **France = Capago.** No leftover VFS-for-France anywhere.
- **Saudi tourist e-visa restriction disclosed honestly** (`:347`).
- **Hajj excluded, Umrah routed via Nusuk** (`:347`, FAQ q7).
- **USA visa bond labelled as pilot**, not a guarantee (`:365`).
- **`<body data-page="visa">`** matches the `meta.visa` dict key — title/description i18n wired.
- **Single `<h1>`**, six `<h2>`s, no duplicates.
- **All 7 `<section>` blocks `aria-labelledby`'d** to existing target ids.
- **44×44 touch targets** apply via `@media (pointer: coarse)` to `summary` + `a[href]`.
- **Sticky bar gated `@media (max-width: 768px)`**.
- **Map lazy-loads** via `MapBase.lazyBoot` (IO + scroll + 30s safety).
- **145 of 147 `data-i18n*` keys resolve** in all three languages. The two that don't are C1 and C2.

---

## 5. Cross-checks not performed (out of scope / unverifiable from code)

- **Lighthouse / CWV score** — can't run a browser. Design patterns (lazy-map, SVG flags) are correct, but real numbers depend on production CDN.
- **MapLibre CDN reachability** — `MB.loadMapLibre()` and basemap host availability are live-network-dependent.
- **Embassy / visa-centre hours** — CVASC "dim. + jeu. 09:00-15:00" plausible but unverified against the centre's own page.
- **Alliance Travel's licensing / branch count claims** (depuis 2019, 1 200+ dossiers, 3 agences) — assumed in good faith.
- **WhatsApp number ownership** — +213 561 616 266 assumed correct.
- **Post-deploy RTL rendering** — i18n checks were static lookups; no `dir="rtl"` smoke test on the country-card chip layout.
- **All five trip-page nav insertions diffed** — I sampled three; the rest looked similar but were not line-checked.

---

### Summary

Three issues block ship: **C1** (visa page own-nav doesn't translate), **C2** (footer subtitle key missing), **C3** (map fallback never hides). All three are one-line fixes. Of the high issues, **H2** (no OG image) is the highest-impact business-side miss because the entire CTA chain ends in social sharing. **H4** and **H5** are the highest legal-exposure misses on the page (a missing hedge on processing time, and dead-name provider references). Everything else is polish.
