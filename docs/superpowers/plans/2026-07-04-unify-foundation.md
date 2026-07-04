# Sub-project 1 — Foundation (Unify Branches → Data-Driven Aurora on Vercel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one integration branch where the **new Aurora design is emitted by the data-driven generator** from the admin session's JSON, leads capture is live, and it deploys on Vercel — with every generated trip page matching the current hand-designed page.

**Architecture:** Adopt the admin branch's section-template generator (`tools/build.mjs` + `tools/templates/sections/*.tpl` + `engine.mjs`) onto `feat/hero-redesign` (which has the Aurora design + Vercel config). Rewrite each `.tpl` from the old-design markup to the Aurora markup, consuming the same `{{field}}` interpolations, and verify byte/visual parity against frozen reference copies of the current pages.

**Tech Stack:** Zero-dependency Node ESM generator; mustache-style `{{path}}` + `{{k.*}}` i18n-key templating (`engine.mjs`); Supabase (`@supabase/supabase-js` via CDN, anon key) for leads; Vercel static hosting with `buildCommand`.

## Global Constraints

- **Zero runtime dependencies** in the generator (no `package.json`/npm) — match the project ethos.
- **Output convention:** UTF-8 BOM + LF + single trailing newline (the admin generator's contract; `build.mjs` enforces it).
- **XSS-safe output:** all CMS/JSON-derived values pass through the generator's encoders (`tools/templates/codecs.mjs`); never interpolate raw into `<script>`, attributes, `<style>`, or JSON-LD. (See `.security-hardening/04-critical-fixes.md`.)
- **Trilingual:** FR is the live DOM baseline; EN/AR via `data-i18n` + `{{k.*}}` key hooks + per-page `AL_PAGE_I18N`. Never drop the i18n hooks when porting a template.
- **Governance (hard content rules):** never emit supplier name "AyaBooking"/phones/URLs; no "Commission" amounts; no B2B/partner clauses; no Sétif reseller contact; no raw visa/airport fees in $/USD/DT/€ (hedge "selon l'autorité compétente"); no VFS/Hayya/Emirates partnership claims; no "<25 ans"/"célibataires" clauses.
- **Supabase anon key is public by design** (RLS = insert-only on `leads`) — safe to ship in client JS. The service-role key must NEVER appear in the repo or client.
- **Parity target:** each generated `site/<slug>/index.html` must match its frozen reference in `docs/design-reference/<slug>.html` (ignoring only the leading BOM), and pass a browser check at 390px + desktop, both themes, + AR RTL.

---

### Task 1: Create the integration branch + import the data-driven pipeline

**Files:**
- New branch: `integrate/unified-admin` (from `feat/hero-redesign`)
- Import from `origin/claude/admin-dashboard-owner-h7oydx`: `tools/build.mjs`, `tools/blog.mjs`, `tools/md.mjs`, `tools/extract-trip.mjs`, `tools/templates/` (all), `data/trips/*.json` (7), `data/build-manifest.json`, `site/assets/js/lead-config.js`
- Remove (superseded, untracked scaffolding on my branch): `tools/build-trips.mjs`, `tools/templates/trip.mjs`

**Interfaces:**
- Produces: `node tools/build.mjs --check` (validates all `data/trips/*.json`, exits non-zero on any schema error) and `node tools/build.mjs <slug>` (renders one trip to `site/<slug>/index.html`).

- [ ] **Step 1: Branch from the integration base**

```bash
cd "C:/Users/ROG STRIX/Documents/alliance travel"
git checkout feat/hero-redesign
git checkout -b integrate/unified-admin
```

- [ ] **Step 2: Import the generator + data + leads config from the admin branch**

```bash
B=origin/claude/admin-dashboard-owner-h7oydx
git checkout $B -- tools/build.mjs tools/blog.mjs tools/md.mjs tools/extract-trip.mjs tools/templates data/trips data/build-manifest.json site/assets/js/lead-config.js
# remove the older, superseded generator scaffolding (was never committed on this branch)
rm -f tools/build-trips.mjs tools/templates/trip.mjs
```

- [ ] **Step 3: Validate the imported JSON compiles**

Run: `node tools/build.mjs --check`
Expected: exits 0, prints a validation summary with 0 errors for all 7 trips. If it errors, STOP and report — the JSON import is incomplete.

- [ ] **Step 4: Commit**

```bash
git add tools/ data/trips/ data/build-manifest.json site/assets/js/lead-config.js
git commit -m "chore(integrate): import data-driven generator + trip JSON + leads config from admin branch"
```

---

### Task 2: Freeze the design reference (parity target)

**Files:**
- Create: `docs/design-reference/{istanbul,azerbaidjan,bali,kuala-lumpur,tunisie,vietnam,egypte}.html` (frozen copies of the current hand-designed Aurora pages)
- Create: `tools/parity.mjs` (diff a generated page against its reference, ignoring a leading BOM)

**Interfaces:**
- Produces: `node tools/parity.mjs <slug>` → prints `PARITY OK` (exit 0) or a unified diff of the first N differing lines (exit 1).

- [ ] **Step 1: Snapshot the current Aurora pages as references** (BEFORE any regeneration overwrites them)

```bash
mkdir -p docs/design-reference
for s in istanbul azerbaidjan bali kuala-lumpur tunisie vietnam egypte; do cp "site/$s/index.html" "docs/design-reference/$s.html"; done
```

- [ ] **Step 2: Write the parity checker**

Create `tools/parity.mjs`:

```js
#!/usr/bin/env node
import { readFileSync } from "node:fs";
const slug = process.argv[2];
if (!slug) { console.error("usage: node tools/parity.mjs <slug>"); process.exit(2); }
const strip = (s) => s.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\s+$/g, "");
const gen = strip(readFileSync(`site/${slug}/index.html`, "utf8"));
const ref = strip(readFileSync(`docs/design-reference/${slug}.html`, "utf8"));
if (gen === ref) { console.log(`PARITY OK: ${slug}`); process.exit(0); }
const g = gen.split("\n"), r = ref.split("\n");
let shown = 0;
for (let i = 0; i < Math.max(g.length, r.length) && shown < 25; i++) {
  if (g[i] !== r[i]) { console.log(`L${i+1}\n  gen: ${g[i] ?? "<eof>"}\n  ref: ${r[i] ?? "<eof>"}`); shown++; }
}
console.log(`PARITY DIFF: ${slug} — ${shown} differing lines shown`);
process.exit(1);
```

- [ ] **Step 3: Commit**

```bash
git add docs/design-reference/ tools/parity.mjs
git commit -m "test(parity): freeze Aurora page references + parity checker"
```

---

### Task 3: Audit JSON-field coverage for the Aurora design

**Files:**
- Create: `docs/design-reference/field-map.md` (Aurora design element → JSON path, + gaps)

**Interfaces:**
- Produces: a mapping every later section task consumes to know which `{{field}}` feeds which Aurora element, and a list of any JSON fields to ADD before templating.

- [ ] **Step 1: Diff the hero fields the design needs vs the JSON provides**

For `data/trips/istanbul.json`, list its `hero.*`, `meta.*`, `accent.*`, `highlights[]`, `itinerary.*`, `hotels[]`, `faq[]`, `finalCta.*`, `related[]`, `jsonLd.*` keys. Open `docs/design-reference/istanbul.html` and list the dynamic values the Aurora markup shows per section. Record each as `element → {{json.path}}`; flag any Aurora element with no backing field as a GAP.

Run: `node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('data/trips/istanbul.json','utf8'))))"`
Expected: top-level keys incl. `slug, region, dataPage, meta, accent, hero, highlights, itinerary, hotels, faq, ...`.

- [ ] **Step 2: Write the field map + gap list** to `docs/design-reference/field-map.md`. For any GAP, note the exact JSON path to add and the source value from the reference page. (Add gap fields to all 7 JSONs in this task if any exist — a bad field map breaks every later task.)

- [ ] **Step 3: Commit**

```bash
git add docs/design-reference/field-map.md data/trips/
git commit -m "docs(integrate): Aurora design → JSON field map + fill gaps"
```

---

### Task 4: Port `head.tpl` — meta, fonts (incl. Sora), JSON-LD

**Files:**
- Modify: `tools/templates/sections/head.tpl`
- Reference: `docs/design-reference/istanbul.html` (`<head>`)
- Verify: `site/istanbul/index.html` via `tools/parity.mjs`

**Interfaces:**
- Consumes: `{{meta.title}}`, `{{meta.description}}`, `{{meta.themeColor}}`, `{{accent.*}}`, `{{jsonLd.*}}`, `{{k.*}}` (from field map, Task 3).
- Produces: a `<head>` block matching the reference — the Google-Fonts opsz request **+ Sora** (`&family=Sora:wght@600;700`), all meta/OG/twitter, and JSON-LD emitted via `codecs.mjs` `jsonForScript` (no `</script>` breakout).

- [ ] **Step 1:** Replace the body of `head.tpl` with the reference `<head>` markup, substituting literal values for `{{meta.*}}`/`{{accent.*}}`/`{{jsonLd.*}}` per the field map. Route JSON-LD through the engine's script-safe encoder. Keep the Sora `<link>` on ALL trip pages (fixes the known Sora-only-on-egypte gap; add a `preload` for the Sora woff2 to avoid hero-title FOUT).
- [ ] **Step 2:** Regenerate: `node tools/build.mjs istanbul`
- [ ] **Step 3:** Check parity of the head: `node tools/parity.mjs istanbul` — expect the only remaining diffs to be in `<body>` sections not yet ported. Confirm no `<head>` lines differ.
- [ ] **Step 4: Commit** `git add tools/templates/sections/head.tpl && git commit -m "feat(gen): head.tpl → Aurora meta + Sora fonts + safe JSON-LD"`

---

### Task 5: Port `nav.tpl` — fixed nav + drawer (the resize-safe version)

**Files:**
- Modify: `tools/templates/sections/nav.tpl` (currently 26 KB — the largest)
- Reference: `docs/design-reference/istanbul.html` (`<nav class="site-nav">` … `</nav>`)

**Interfaces:**
- Consumes: nav i18n keys (`{{k.*}}`), `{{meta.title}}` (logo alt).
- Produces: the Aurora nav markup — theme-aware inline SVG logo, `.nav-cta` WhatsApp button (NOT `.btn--wa`), lang switcher, theme toggle, `.nav-hamburger` placeholder. The drawer itself is created by `enhance.js` at runtime (already correct on this branch); the template emits only the static nav.

- [ ] **Step 1:** Replace `nav.tpl` body with the reference `<nav>` markup (drop any `.nav-drawer__close` / `.btn--wa` remnants — those were fixed in Phase 0).
- [ ] **Step 2:** `node tools/build.mjs istanbul`
- [ ] **Step 3:** `node tools/parity.mjs istanbul` — confirm nav lines now match.
- [ ] **Step 4: Commit** `git commit -am "feat(gen): nav.tpl → resize-safe Aurora nav"`

---

### Task 6: Port `hero.tpl` — the Aurora hero

**Files:**
- Modify: `tools/templates/sections/hero.tpl`
- Reference: `docs/design-reference/istanbul.html` (`<section class="aurora-hero">`)

**Interfaces:**
- Consumes: `{{hero.eyebrow}}`, `{{hero.titlePre}}`, `{{hero.titlePost}}`, `{{hero.h1Pre}}`, `{{hero.h1Em}}`, `{{hero.lede}}`, `{{hero.date}}`, `{{hero.priceFrom}}`, `{{hero.priceUnit}}`, `{{hero.bg}}`, `{{region}}`, `{{accent.heroGradient}}`, and hero `{{k.*}}` keys.
- Produces: `.aurora-hero` with `.aurora-hero__sky` (per-region `--hero-a/b/c` tint), Ken-Burns `.aurora-hero__img`, `.aurora-hero__eyebrow`, `.aurora-hero__title` (Sora), and the glass `.aurora-hero__offer` bar (price via `unicode-bidi:isolate`, `heroFrom` key, WhatsApp CTA).

- [ ] **Step 1:** Replace the entire `hero.tpl` (currently the old `.scroll-hero` markup) with the reference `.aurora-hero` section, mapping literals to `{{hero.*}}`/`{{accent.*}}`. Route `heroGradient` through the engine's CSS-safe encoder (`safeCssValue`). Preserve every `data-i18n` / `{{k.*}}` hook.
- [ ] **Step 2:** `node tools/build.mjs istanbul`
- [ ] **Step 3:** `node tools/parity.mjs istanbul` — hero lines must match.
- [ ] **Step 4: Browser spot-check** the hero: start the static server (`python -m http.server 5500 --directory site`), load `http://localhost:5500/istanbul/`, confirm the Aurora hero renders (title in Sora, offer bar visible, 0 console errors) at 390px + desktop, both themes.
- [ ] **Step 5: Commit** `git commit -am "feat(gen): hero.tpl → Aurora hero"`

---

### Task 7: Port `itinerary.tpl` — the alternating spine timeline

**Files:**
- Modify: `tools/templates/sections/itinerary.tpl`
- Reference: `docs/design-reference/istanbul.html` (`.timeline--spine` block)

**Interfaces:**
- Consumes: `{{itinerary.eyebrow}}`, `{{itinerary.layout}}`, `{{itinerary.columns[].days[]}}` (node, dayLabel, title, activities, tags), `{{k.*}}`.
- Produces: `.timeline--spine` with alternating `.tl-day--left/--right`, `.tl-content[data-aos="fade-left/right"]`, `.tl-node` medallions, central gradient spine, RTL-flipped, mobile single-rail.

- [ ] **Step 1:** Replace `itinerary.tpl` with the reference spine-timeline markup, iterating `{{itinerary.columns}}`/`{{days}}` via the engine's loop syntax (mirror the existing loop syntax already used elsewhere in the `.tpl` files — read `sections/hotels.tpl` for the loop pattern first).
- [ ] **Step 2:** `node tools/build.mjs istanbul`
- [ ] **Step 3:** `node tools/parity.mjs istanbul` — timeline lines must match.
- [ ] **Step 4: Commit** `git commit -am "feat(gen): itinerary.tpl → alternating spine timeline"`

---

### Task 8: Port the remaining body sections

**Files (one commit each, same pattern):**
- `tools/templates/sections/highlights.tpl` — `.highlights` (4 cards; `{{highlights[]}}`)
- `tools/templates/sections/hotels.tpl` — hotel grid + tariff table (`{{hotels[]}}`, prices, ribbon — remember E-RIBBON: ribbon is unified white)
- `tools/templates/sections/calc.tpl` — price calculator (`{{calculator.*}}`)
- `tools/templates/sections/faq.tpl` — FAQ (`{{faq[]}}`; answers via `sanitize-html.mjs` allowlist)
- `tools/templates/sections/inclus.tpl` — inclus/non-inclus
- `tools/templates/sections/infoblocks.tpl` — 4 info blocks
- `tools/templates/sections/trust.tpl` — trust strip
- `tools/templates/sections/related.tpl` — related cards (NO inline hex colours — Phase 0 K3-RELATED; inherit `var(--accent)`)
- `tools/templates/sections/finalcta.tpl` — final WhatsApp CTA (`.btn--wa` with `color:#052e16`)
- `tools/templates/sections/footer.tpl` — premium `.footer-cta` brand band + WhatsApp CTA
- `tools/templates/sections/tripmap.tpl` — MapLibre trip map (SRI-pinned; unchanged origins)
- `tools/templates/sections/booking.tpl` — booking form
- `tools/templates/sections/scripts.tpl` — `<script>` includes (order: i18n.js, enhance.js, calculator.js, booking-form.js, map-*.js, lead capture)

**Interfaces:** each consumes its matching `{{json.path}}` per the field map (Task 3) and the reference section markup.

- [ ] For EACH `.tpl` above, in its own step-cycle: replace with the reference section markup mapped to `{{fields}}` (route rich-HTML fields through the sanitizer, prices/attrs through encoders) → `node tools/build.mjs istanbul` → `node tools/parity.mjs istanbul` (that section's lines now match) → commit `feat(gen): <section>.tpl → Aurora`.
- [ ] **Final step of Task 8:** `node tools/parity.mjs istanbul` prints **`PARITY OK: istanbul`** (full page matches the reference). If not, iterate on the remaining diffing sections.

---

### Task 9: Regenerate all 7 trips + full parity + browser verification

**Files:** `site/{istanbul,azerbaidjan,bali,kuala-lumpur,tunisie,vietnam,egypte}/index.html` (regenerated)

- [ ] **Step 1:** Build every enabled trip: `node tools/build.mjs`
- [ ] **Step 2:** Parity across all 7:

```bash
for s in istanbul azerbaidjan bali kuala-lumpur tunisie vietnam egypte; do node tools/parity.mjs "$s" || echo "FAIL: $s"; done
```
Expected: `PARITY OK` for all 7. Investigate any FAIL (usually a per-trip field the template didn't handle — fix the template or the field map, never hand-edit the generated HTML).

- [ ] **Step 3: Browser-verify** (server on :5500): for istanbul + egypte (the richest) confirm at 390px + 1280px, both themes, + AR RTL: hero renders, drawer opens full-height when scrolled, calculator computes, 0 console errors. Spot-check the other 5 at desktop.
- [ ] **Step 4: Commit** `git add site/ && git commit -m "build(gen): regenerate all 7 trips from templates — full design parity"`

---

### Task 10: Wire Supabase leads capture into the lead form

**Files:**
- Modify: the lead/quote form markup (in the relevant `.tpl` or `site/index.html`) to POST to Supabase
- Modify: `site/assets/js/booking-form.js` (or a new `lead-capture.js`) — insert into `leads` via `@supabase/supabase-js` (CDN) using `window.AT_LEADS`
- Modify: `vercel.json` — extend CSP `connect-src` with `https://vxblgxiamtphabfswnxb.supabase.co`

**Interfaces:**
- Consumes: `window.AT_LEADS.{url,anonKey}` from `site/assets/js/lead-config.js` (Task 1).
- Produces: a successful anon `insert` into the `leads` table on form submit.

- [ ] **Step 1:** Add the Supabase JS client via a pinned + SRI CDN `<script>` in `scripts.tpl`/head, and a small handler that, on lead-form submit, calls `supabase.from('leads').insert({...})` with the form fields. Keep the existing WhatsApp/email behaviour as the primary CTA; the insert is additive (fire-and-forget, non-blocking).
- [ ] **Step 2:** Add `https://vxblgxiamtphabfswnxb.supabase.co` to CSP `connect-src` in `vercel.json`.
- [ ] **Step 3: Test locally** (server on :5500): submit the form; in the Supabase dashboard confirm the row appears in `leads`. (Requires the user's Supabase access — flag as a user-assisted verification step.)
- [ ] **Step 4: Commit** `git commit -am "feat(leads): wire lead form → Supabase insert + CSP connect-src"`

---

### Task 11: Vercel build config + full-site smoke test

**Files:**
- Modify: `vercel.json` — set `"buildCommand": "node tools/build.mjs"` (regenerate on deploy)

**Interfaces:**
- Produces: a Vercel deploy that runs the generator, outputs `site/`, serves the Aurora data-driven site.

- [ ] **Step 1:** In `vercel.json`, change `"buildCommand": null` → `"buildCommand": "node tools/build.mjs"`. Keep `outputDirectory: "site"`, `framework: null`.
- [ ] **Step 2: Local production-build dry run:** `node tools/build.mjs && echo BUILD_OK` — expect `BUILD_OK` and all 7 pages regenerated with parity.
- [ ] **Step 3:** Validate JSON: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json valid')"`.
- [ ] **Step 4: Commit** `git commit -am "chore(deploy): Vercel buildCommand runs the generator"`

---

### Task 12: Push the integration branch + final report

- [ ] **Step 1:** Full check: `node tools/build.mjs --check && node tools/build.mjs && for s in istanbul azerbaidjan bali kuala-lumpur tunisie vietnam egypte; do node tools/parity.mjs "$s"; done` — all `PARITY OK`.
- [ ] **Step 2:** Push: `git push -u origin integrate/unified-admin` (only when the user confirms — outward action).
- [ ] **Step 3:** Report: branch pushed; the site is now pretty AND data-driven AND leads-capturing on Vercel. Sub-project 2 (the one-login dashboard) is next, on top of this branch.

---

## Self-Review

**Spec coverage:** Spec §4 Sub-project 1 steps 1–6 → Tasks 1 (branch+import), 3 (schema audit), 4–9 (generator→Aurora + parity), 10 (leads), 11 (Vercel build), 2 (parity harness). ✅ All covered. Sub-projects 2–3 are intentionally out of this plan (separate plans).

**Placeholder scan:** Section-port tasks reference the frozen `docs/design-reference/<slug>.html` as the exact source to reproduce + the field map (Task 3) for literal→`{{field}}` substitution — this is a concrete, executable instruction, not a "TODO". The parity checker (Task 2) is fully specified in code. No "handle edge cases"/"add validation" hand-waves. ✅

**Type consistency:** `node tools/build.mjs [--check|<slug>]` and `node tools/parity.mjs <slug>` are used identically across all tasks. `window.AT_LEADS.{url,anonKey}` is defined in Task 1 (imported `lead-config.js`) and consumed in Task 10. The field map produced in Task 3 is consumed by Tasks 4–8. ✅

**Known risk:** the engine's loop/conditional syntax for repeated sections (itinerary days, hotels, faq, related) must be confirmed by reading an existing `.tpl` that already loops (`hotels.tpl`) before porting — called out in Task 7 Step 1. If the engine can't express a needed construct, extend `engine.mjs` in that task rather than hand-editing generated HTML.
