# Alliance Travel — Master Pre-Deploy Audit (2026-06-05)

**Branch:** `refactor/trim-v26` · HEAD `e8da6be` · Today: 2026-06-05
**Source reports** (read these for cited evidence):
- [Pre-deploy failure modes](_archive/audit-2026-06-05-predeploy.md) (3C / 6H / 7M / 6L)
- [SEO + structured data](_archive/audit-2026-06-05-seo.md) (1C / 5H / 8M / 14L)
- [Image curation + sourcing](_archive/audit-2026-06-05-images.md)
- [i18n + a11y integrity](_archive/audit-2026-06-05-i18n-a11y.md) (3C i18n / 3C a11y)
- [Factual + trademark + perf](_archive/audit-2026-06-05-factual-perf.md)

---

## TL;DR

**The site is NOT deploy-ready as of HEAD.** 7 ship-blocking issues sit between the current commit and a clean Cloudflare Pages push. Most are low-effort surgical fixes (≤30 min each). One — past departure dates on 4 of 5 trip pages — needs your input on the next valid windows and is the longest pole.

After the 7 deploy-blockers, there's a high-impact fast-follow tier (12 items, ~3 hr total) that meaningfully improves SEO / a11y / perf. Then a won't-fix-this-deploy tier (5 items, all architectural) flagged for a future session.

---

## DEPLOY-BLOCKERS (must fix before next push)

### B1 · Past trip departure dates on 4 of 5 trip pages
*Source: Lane E (factual)*
**Files:** `site/istanbul/`, `site/kuala-lumpur/`, `site/sharm-constantine/`, `site/azerbaidjan/`
**What:** As of 2026-06-05:
- Istanbul: ALL 10 dates (25 Mar → 14 Mai 2026) **past**. Title "Mars–Mai 2026" stale.
- Kuala Lumpur: ALL 3 dates (29 Mar, 24 Avr, 22 Mai 2026) **past**.
- Sharm depuis Constantine: 3 of 5 past (09/04, 23/04, 07/05). Two future remain.
- Azerbaïdjan: 2 of 4 past (10–18 Avr, 7–15 Mai). Two future remain.
- Cairo-sharm: fully current (12, 19, 26 Juin 2026).

**Impact:** Visitors see "Réserver" CTAs against past dates. WhatsApp inbounds will be confused.
**Fix needed:** **User input required** — what are the next available departure windows per trip? Without that, I either delete the past chips or guess.

---

### B2 · Visa fee "30 USD" disclosed on cairo-sharm page
*Source: Lane E #17 (trademark / user policy)*
**Files:** `site/cairo-sharm/index.html` lines 95 (FAQPage JSON-LD) + 549 (rendered FAQ)
**What:** "taxe de visa **(30 USD)**" violates your **NEVER mention visa fees** rule.
**Fix:** Replace with "selon tarif en vigueur à l'aéroport du Caire" in both the JSON-LD and rendered FAQ. ~5 min.

---

### B3 · Service Worker precache desync + cache-bust policy unimplemented
*Source: Lane A P1 + P3*
**Files:** `site/sw.js:21-27`, `site/_headers:7,35` vs. all HTML `<link>`/`<script>` refs
**What:**
- `PRECACHE_URLS` lists only `enhance.js` + `styles.css` + favicon + manifest. If any other file 404s, `addAll` rejects and **no** precache happens for anyone.
- `_headers` claims CSS/JS are `immutable` AND that `?cb=` query strings will cache-bust on releases — but **zero HTML references actually carry `?cb=`**. First post-deploy CSS update silently hands returning visitors stale CSS against fresh HTML for up to 1 year.

**Fix:**
- Drop `enhance.js` from precache, let runtime SWR handle it (P1's safer option).
- Either implement `?cb=v27` on every CSS/JS reference, or drop `immutable` from `/assets/css/*` + `/assets/js/*` and ship `max-age=600, stale-while-revalidate=86400` instead.

---

### B4 · `404.html` uses relative `assets/js/i18n.js`
*Source: Lane A P2*
**File:** `site/404.html:163`
**What:** `<script src="assets/js/i18n.js" defer>` — no leading slash. CF Pages serves 404 in-place for `/cairo-sharm/typo` → resolves to `/cairo-sharm/assets/js/i18n.js` → 404-in-404 with console error on every wrong URL.
**Fix:** Change to `/assets/js/i18n.js`. Same line is inconsistent with the leading-slash favicon refs at lines 22-23. ~30 sec.

---

### B5 · Visa page missing FAQPage JSON-LD
*Source: Lane B Critical #1*
**File:** `site/rendez-vous-visa/index.html:447-461`
**What:** The visa page has 15 `<details class="faq-item">` Q&A blocks but no `@type:FAQPage` schema. All 5 trip pages already have it. The visa page is the freshest, highest-keyword-density landing surface and forfeits its biggest SERP feature.
**Fix:** Append a FAQPage JSON-LD block alongside the existing Service block, mirroring the cairo-sharm pattern at `site/cairo-sharm/index.html:85-132`. ~30 min.

---

### B6 · WCAG 1.4.3 contrast fail — `--txt-3: #7a7268`
*Source: Lane D #4*
**File:** `site/assets/css/styles.css:399`
**What:** `--txt-3` measures **4.06:1** on `--bg` and **3.55:1** on `--bg-card`. Used by 14+ small-text consumers via `.u-text-3` (eyebrows, captions, fineprint). WCAG 2.2 AA requires 4.5:1 for body text.
**Fix:** Bump to `#8e857a` (4.5:1) or `#988e82` (5:1). 1-line CSS change. ~30 sec.

---

### B7 · 6 of 9 pages missing `<body data-page>` → meta tags never swap
*Source: Lane A P8 + Lane D Critical #2*
**Files:** `site/voyages/index.html:64`, 5 trip pages each at line ~138-148
**What:** `i18n.js:987` reads `document.body?.dataset?.page` to look up `T[lang].meta[pageKey]`. Only home + visa have `data-page`. EN/AR users on 7 pages see French `<title>` and `<meta description>` even after switching language. The 12 `meta.*` dictionary entries are present but never reached.
**Fix:** Add `data-page="voyages"` / `"trip-cairo"` / `"trip-azerbaidjan"` etc. — pick the namespace key already used in the dict. ~10 min for 6 edits.

---

## HIGH-IMPACT FAST-FOLLOW (do in this deploy if time allows)

### F1 · Trim 5 over-long titles + descriptions to ≤60/≤155 chars
*Source: Lane B Critical #2 + #3 + #4*
- Homepage title 65 chars → trim "2026" tail
- Sharm-Constantine title 68 chars → restructure
- Descriptions on home (187), voyages (199), cairo-sharm (167), azerbaijan (175), sharm-constantine (162) — all over Google's truncation point
~20 min total.

### F2 · Sync trip-page schema `streetAddress` to home value
*Source: Lane B #6*
**Files:** 5 trip-page `provider.address.streetAddress` blocks
**What:** Trip pages declare `"Cité 5 Juillet, Bd. de l'ALN"` (stale). Home declares `"Boulevard Houari Boumediene, La Graf"` (canonical). Google sees this as knowledge-graph conflict.
~10 min.

### F3 · Expand homepage TravelAgency schema
*Source: Lane B #7*
Add `email`, `logo`, `sameAs` (Facebook + Instagram), `geo` (36.073°N, 4.761°E), `contactPoint`. ~45 min.

### F4 · Add geo + ICBM meta tags to homepage
*Source: Lane B #9*
4 lines in `<head>`. ~5 min.

### F5 · Re-encode `hero__sharm-constantine--{fg,bg}.*`
*Source: Lane C critical*
Resize from 2000×2667 to 1200×1600 at q85. Saves 2.6 MB across 3 formats; the worst-case hero on the site. ~15 min if tooling is installed.

### F6 · Add SRI hashes to MapLibre + cobe CDN scripts
*Source: Lane E #30 (security HIGH)*
**Files:** `site/assets/js/map-base.js:65-69`, `site/assets/js/globe.js:43`
Add `integrity="sha384-..." crossorigin="anonymous"`. Compromise of unpkg or esm.sh → arbitrary JS in the app. ~15 min.

### F7 · Inline ~10 KB critical CSS into each page `<head>`
*Source: Lane E #27 (perf HIGH)*
Currently the 303 KB sheet render-blocks every page. Inlining above-the-fold (nav, hero, base typography) could cut LCP from ~3.2s to ~1.4s on 3G. Defer the rest via `<link rel="preload" as="style">`. ~1 hr.

### F8 · Add `aria-live` announcement for language switch
*Source: Lane D #9 (WCAG 4.1.3 fail)*
**File:** `site/assets/js/i18n.js:1125-1133`
Add hidden `<div role="status" aria-live="polite">`; write "Language changed to {X}" after `translate()`. ~15 min.

### F9 · Hedge KL "20 USD" tourist tax
*Source: Lane E #18*
Replace with "selon arrêté malaisien en vigueur" in JSON-LD + FAQ. ~3 min.

### F10 · Footer social tap targets <24×24
*Source: Lane D top10-importants #3, WCAG 2.5.8*
Add `padding: 8px; display: inline-flex` to `.footer-social a`. ~3 min.

### F11 · Bump sitemap.xml `lastmod` to today for all touched pages
*Source: Lane A P11 + Lane B #14*
Just before deploy. ~3 min.

### F12 · Generate dedicated `og-visa.jpg`
*Source: Lane B #12 + Lane C G8*
Build a 1200×630 brand card (mint accent on navy, "Rendez-vous Visa · 10 pays" overprint). Replaces shared `og-default.jpg` reference. ~1 hr design.

---

## WON'T FIX THIS DEPLOY (architectural debt, flag for future)

### W1 · 5 trip pages are ~95% hardcoded French
*Source: Lane D #1*
Fixing this is ~2000 lines of `data-i18n` attribution + new `trip_page.*` namespace work. Existing dict has 19 dead `trip_page.*` keys that signal abandoned attempt. Decision: **delete the dead keys to stop signaling completeness**; defer real trip-page i18n to a future session with explicit copy-review budget.

### W2 · Hreflang per-language URLs
*Source: Lane A P14 + Lane B #15*
Switching from client-side i18n to `/fr/`, `/en/`, `/ar/` URL structure requires copywriter retainer per `docs/reference/I18N-SEO.md`. Current `hreflang="x-default"` is the correct signal for the current architecture. Revisit at 1.5K WhatsApp inbounds/month trigger.

### W3 · Self-host MapLibre + cobe
*Source: Lane A P5/P6*
~200 KB of vendor bytes in repo. Worth it for MENA reachability but defer until first real CDN-related outage report. SRI fix (F6) buys most of the security upside without the bytes.

### W4 · CSP header
*Source: Lane A P7*
43 inline `style=""` attributes on homepage alone make strict CSP costly. Defer until inline styles are extracted, OR ship `'unsafe-inline'` policy as a halfway measure later.

### W5 · 404 page i18n + nav switcher
*Source: Lane D #3*
The 404 page has no switcher, no `data-i18n` — entire body hardcoded French. Adding it requires importing the nav structure. Defer to a future polish pass; the 404 page is correctly noindexed so SEO impact is zero.

---

## FIX SEQUENCE

Recommended order (B1 needs user input; remaining 6 blockers are mine to ship):

1. **B1** — Ask user for new trip dates (BLOCKING)
2. **B2** + **B6** — 2 single-line edits, batch them
3. **B4** — single-line edit
4. **B3** — pick cache-bust strategy + bump SW
5. **B7** — 6 `<body>` edits across trip pages + voyages
6. **B5** — write FAQPage JSON-LD for visa page
7. **F1 → F4, F6, F8 → F11** — fast-follows, batch by file
8. **F5, F7, F12** — heavier (image re-encode, critical CSS extract, OG design); do if time allows
9. Final node --check + verify with the deploy gates
10. Bump SW `CACHE_NAME` and `lastmod` dates, commit, push

---

*End of master report. Ready to start B2 immediately while waiting for user input on B1.*
