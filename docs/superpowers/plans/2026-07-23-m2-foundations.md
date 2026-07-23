# M2 Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development. Steps use
> checkbox (`- [ ]`) syntax. Dispatch with `subagent_type: "alliance-implementer"`, review with
> `alliance-reviewer`.

**Goal:** Make it impossible to publish a French edit that silently leaves English/Arabic wrong, or a
price that contradicts itself across the page — before M3 multiplies both hazards across 100+ fields.

**Architecture:** Two build-time contracts, each with a gate wired into `tools/build.mjs`'s existing
error collection. The translation contract is *extracted from rendered HTML* (the only place all
214–224 bindings coexist). The value graph *derives* the duplicated price copies from one source.
Neither migrates existing data: `k.*` is never touched.

**Spec:** `docs/superpowers/specs/2026-07-23-m2-foundations-design.md`

## Global Constraints

- Zero npm dependencies; Node built-ins and `node --test` only; no `package.json`.
- Branch `integrate/unified-admin`. Deploys are manual: `vercel deploy --prod --yes`.
- `const FIELDS = [ … ];` in `site/admin/edit-pages.js` stays byte-identical unless a task says otherwise.
- Never run `node tools/build.mjs` without `--check` except where a task explicitly requires a rebuild.
- New admin strings go in BOTH `fr` and `ar` in `site/admin/i18n.js`; parity test must stay green.
- `git add <explicit paths>` — never `-A`.
- Working directory: `C:/Users/ROG STRIX/Documents/alliance travel`.

## File Structure

| File | Responsibility |
|---|---|
| Create `tools/i18n-manifest.mjs` | extract every binding + FR text + hash from rendered HTML |
| Create `tools/i18n-manifest.test.mjs` | unit tests for the extractor |
| Create `tools/check-i18n.mjs` | build gate: unresolvable bindings = error, stale/missing = warning |
| Create `tools/value-graph.mjs` | derive price copies; report drift |
| Create `tools/value-graph.test.mjs` | unit tests incl. the bali/KL "do not touch" guard |
| Create `tools/check-value-graph.mjs` | build gate: derived value mismatch = error |
| Modify `tools/build.mjs` | call both gates; emit `data/i18n-manifest.json` |
| Modify `data/trips/*.json` | one-time drift repair (T5) + Istanbul backfill (T6) |
| Modify `api/get-trip.mjs` | return the manifest slice for the slug |
| Modify `site/admin/edit-pages.js` | FR/EN/AR side-by-side + stale marks + derived badges |
| Modify `site/admin/i18n.js`, `admin.css` | strings and styles for the above |

---

### Task 1: i18n manifest extractor

**Files:** Create `tools/i18n-manifest.mjs`, `tools/i18n-manifest.test.mjs`

**Interfaces:**
- Produces `extractBindings(html) -> [{ key, fr, isHtml }]` and
  `buildManifest({ slug, html, trip, sharedKeys }) -> { slug, coverage: {en, ar}, keys: { [key]: {fr, frHash, en, ar, enHash, arHash, scope} } }`
- `frHash(text) -> string` — short stable hash, exported for reuse by the gate and the admin.

- [ ] **Step 1: Write the failing test** — `tools/i18n-manifest.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractBindings, frHash, buildManifest } from "./i18n-manifest.mjs";

test("extracts plain and html bindings with their French text", () => {
  const html = `<p data-i18n="xHero">Bonjour</p><h1 data-i18n-html="xTitle">Ville <em>2026</em></h1>`;
  const b = extractBindings(html);
  assert.deepEqual(b, [
    { key: "xHero", fr: "Bonjour", isHtml: false },
    { key: "xTitle", fr: "Ville <em>2026</em>", isHtml: true },
  ]);
});

test("ignores attributes that are not bindings and survives nesting", () => {
  const html = `<div class="x"><span data-track-event="a">no</span><span data-i18n="k">oui</span></div>`;
  assert.deepEqual(extractBindings(html).map((x) => x.key), ["k"]);
});

test("frHash is stable and changes with the text", () => {
  assert.equal(frHash("Bonjour"), frHash("Bonjour"));
  assert.notEqual(frHash("Bonjour"), frHash("Bonjour "));
});

test("buildManifest marks stale, missing and shared keys", () => {
  const html = `<p data-i18n="xA">Un</p><p data-i18n="xB">Deux</p><p data-i18n="nav.skip">Aller</p>`;
  const trip = { i18n: { en: { xA: "One", xB: "Two" }, ar: { xA: "واحد" } },
                 i18nHash: { en: { xA: frHash("Un") }, ar: {} } };
  const m = buildManifest({ slug: "t", html, trip, sharedKeys: new Set(["nav.skip"]) });
  assert.equal(m.keys.xA.enState, "ok");       // hash matches current FR
  assert.equal(m.keys.xB.enState, "stale");    // has EN but no/old hash
  assert.equal(m.keys.xA.arState, "stale");    // AR exists, no hash
  assert.equal(m.keys.xB.arState, "missing");  // no AR at all
  assert.equal(m.keys["nav.skip"].scope, "shared");
  assert.equal(m.coverage.en, 50);             // shared keys excluded from the count
});
```

- [ ] **Step 2: Run it, watch it fail** — `node --test tools/i18n-manifest.test.mjs` → cannot find module.

- [ ] **Step 3: Implement `tools/i18n-manifest.mjs`.** Key decisions to honour:
  - Parse with a regex over the rendered HTML — no DOM library exists here and none may be added.
    Match `data-i18n(-html)?="KEY"` then capture the element's inner text up to its matching close tag.
    For `data-i18n-html` keep the inner markup verbatim; for `data-i18n` strip tags and collapse
    whitespace, because that is what the runtime `applyI18n` compares against.
  - `frHash`: FNV-1a over the trimmed string, base36, 8 chars. Deterministic, no crypto import needed.
  - `scope`: `"shared"` when the key is in `sharedKeys` (from the site-wide dict), else `"trip"`.
  - State per language: `missing` (no value) · `stale` (value exists, stored hash absent or ≠ current
    `frHash`) · `ok`. Coverage = % of **trip-scope** keys whose state is `ok` or `stale` (i.e. present).
  - `i18nHash` is a NEW optional block on the trip JSON. Absent on every trip today, so every existing
    translation reads as `stale` on first run — that is correct and honest, and T5 stamps them.

- [ ] **Step 4: Run tests** → 4 pass.
- [ ] **Step 5: Commit** — `git add tools/i18n-manifest.mjs tools/i18n-manifest.test.mjs`, message:
  `feat(i18n): extract the translation contract from rendered pages`

---

### Task 2: i18n gate wired into the build

**Files:** Create `tools/check-i18n.mjs`; Modify `tools/build.mjs`

**Interfaces:** Consumes Task 1. Produces `checkI18n({ root, pages }) -> { errors, warnings, manifest }`
and writes `data/i18n-manifest.json`.

- [ ] **Step 1: Write the gate.** Rules:
  - **ERROR** — a key rendered on a page that exists in neither the trip dict nor the shared dict, in
    *any* language including FR fallback. That binding would render a raw key to a visitor.
  - **WARNING** — `stale` or `missing` translations, aggregated per trip:
    `"istanbul: 16 clés sans traduction anglaise (33 % traduit)"`.
  - Never error on stale — the owner chose warn-and-allow.
- [ ] **Step 2: Wire into `tools/build.mjs`** next to the existing `checkAdminFields` call, pushing into
  the same `errors` / `warnings` arrays so the existing gate prints and exits consistently. Write
  `data/i18n-manifest.json` only when NOT in `--check` mode (`--check` must never write).
- [ ] **Step 3: Verify** — `node tools/build.mjs --check` prints warnings for all 7 trips, still exits 0,
  and writes nothing (`git status --short data/` must be empty). Then a real `node tools/build.mjs`
  produces `data/i18n-manifest.json`.
- [ ] **Step 4: Commit** — `git add tools/check-i18n.mjs tools/build.mjs data/i18n-manifest.json`,
  message: `feat(i18n): build gate — unresolvable bindings fail, stale translations warn`

---

### Task 3: value graph

**Files:** Create `tools/value-graph.mjs`, `tools/value-graph.test.mjs`

**Interfaces:** Produces `deriveValues(trip) -> { derived: [{path, current, expected, ok, reason}], safe: bool }`.

- [ ] **Step 1: Write the failing test** covering the three cases that matter:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveValues, fmtDA } from "./value-graph.mjs";

const base = (over = {}) => ({
  hero: { priceFrom: "129.000 DA" }, seo: { offerPrice: "129000" },
  tripData: { hotels: [{ prices: { double: 129000 } }, { prices: { double: 180000 } }] },
  hotels: [{ priceFrom: "129.000 DA" }, { priceFrom: "180.000 DA" }],
  ...over,
});

test("fmtDA renders the site's dotted format", () => {
  assert.equal(fmtDA(129000), "129.000 DA");
});

test("hero and seo derive from the cheapest double", () => {
  const r = deriveValues(base());
  const hero = r.derived.find((d) => d.path === "hero.priceFrom");
  assert.equal(hero.expected, "129.000 DA");
  assert.equal(hero.ok, true);
  assert.equal(r.derived.find((d) => d.path === "seo.offerPrice").expected, "129000");
});

test("drift is reported, not silently corrected", () => {
  const r = deriveValues(base({ hero: { priceFrom: "439.000 DA" } }));
  const hero = r.derived.find((d) => d.path === "hero.priceFrom");
  assert.equal(hero.ok, false);
  assert.equal(hero.expected, "129.000 DA");
});

test("cards are NOT derived when counts differ (bali/KL shape)", () => {
  const r = deriveValues(base({ hotels: [{ priceFrom: "3 nuits · Kuta" }] })); // 1 card, 2 rows
  assert.equal(r.derived.some((d) => d.path.startsWith("hotels.")), false);
});

test("cards are NOT derived when the value is not currency", () => {
  const r = deriveValues(base({ hotels: [{ priceFrom: "3 nuits · Kuta" }, { priceFrom: "2 nuits" }] }));
  assert.equal(r.derived.some((d) => d.path.startsWith("hotels.")), false);
});
```

- [ ] **Step 2: Run it, watch it fail.**
- [ ] **Step 3: Implement.** Rules, exactly:
  - cheapest = `Math.min(...tripData.hotels[].prices.double)` ignoring non-finite values.
  - `hero.priceFrom` ← `fmtDA(cheapest)` (dotted, `" DA"` suffix). `seo.offerPrice` ← `String(cheapest)`.
  - `hotels[i].priceFrom` ← `fmtDA(tripData.hotels[i].prices.double)` **only if**
    `hotels.length === tripData.hotels.length` **and** every card's current `priceFrom` matches
    `/^[\d.\s]+DA$/`. If either fails, emit nothing for cards and record `reason: "not derivable"`.
- [ ] **Step 4: Tests pass (5).**
- [ ] **Step 5: Commit** — `feat(pricing): derive the duplicated price copies from one source`

---

### Task 4: value-graph gate + repair the live drift

**Files:** Create `tools/check-value-graph.mjs`; Modify `tools/build.mjs`, `data/trips/vietnam.json` (and any other drifted trip)

- [ ] **Step 1: Write the gate** — for each trip, any `derived` entry with `ok:false` is an **ERROR**
  naming the path, current and expected values.
- [ ] **Step 2: Wire into `build.mjs`** alongside the i18n gate.
- [ ] **Step 3: Run `node tools/build.mjs --check`. It MUST fail**, reporting vietnam's
  `hero.priceFrom` / `seo.offerPrice` (439.000 advertised vs 420.000 real). Paste the failure — this is
  the proof the gate works, and this drift is live on the site today.
- [ ] **Step 4: Repair the data** — correct the drifted values in the trip JSON to the derived ones.
  Do not change the calculator prices; the cheapest real room is the source of truth.
- [ ] **Step 5: `node tools/build.mjs --check` → Build OK.** Then `node tools/build.mjs` to regenerate,
  and confirm the rendered vietnam page shows the corrected price.
- [ ] **Step 6: Commit** — `git add tools/check-value-graph.mjs tools/build.mjs data/trips site`,
  message: `fix(pricing): vietnam advertised 439.000 DA against a real floor of 420.000`

---

### Task 5: stamp existing translations as current

**Files:** Modify `data/trips/*.json` (adds `i18nHash`), `tools/` one-off script (not committed)

Every existing EN/AR translation currently reads as `stale`, because no hash was ever stored. They are
in fact correct — they were written against today's French. Stamp them once so the warning reflects
reality and the owner's first edit produces a *meaningful* stale mark.

- [ ] **Step 1:** For each trip, for each key present in `i18n.en` / `i18n.ar` whose binding exists in
  the manifest, write `i18nHash.en[key] = frHash(currentFrench)` (same for `ar`).
- [ ] **Step 2: Verify** — `node tools/build.mjs --check` warnings drop to *missing-only* (istanbul's 16,
  and any genuinely untranslated keys elsewhere); zero `stale`.
- [ ] **Step 3: Commit** — `chore(i18n): stamp existing translations against current French`

---

### Task 6: Istanbul backfill

**Files:** Modify `data/trips/istanbul.json`

Istanbul renders 24 bindings and translates 8 (33%). English and Arabic visitors read French.

- [ ] **Step 1:** From the manifest, list istanbul's `missing` keys with their French text.
- [ ] **Step 2:** Translate each into EN and AR, matching the register used by the other six trips
  (read vietnam's `i18n.en`/`i18n.ar` for tone). Preserve any inline markup in `-html` keys exactly.
- [ ] **Step 3:** Write into `i18n.en` / `i18n.ar` plus matching `i18nHash` entries.
- [ ] **Step 4: Verify** — manifest coverage for istanbul reaches parity with the other trips; rebuild;
  load `/istanbul/` and switch to AR, confirming the page is genuinely Arabic and numerals are not
  reordered.
- [ ] **Step 5: Commit** — `fix(i18n): istanbul was 33% translated — English and Arabic read French`

---

### Task 7: expose the manifest to the admin

**Files:** Modify `api/get-trip.mjs`

- [ ] **Step 1:** Read `data/i18n-manifest.json` from the repo via the existing GitHub client and return
  `manifest` for the requested slug alongside `content` and `sha`. If the file is missing, return
  `manifest: null` — never fail the editor over a missing manifest.
- [ ] **Step 2:** Verify with a real token: `/api/get-trip?slug=istanbul` returns a `manifest` object.
- [ ] **Step 3: Commit** — `feat(admin): serve the translation manifest with the trip`

---

### Task 8: FR/EN/AR side-by-side editing

**Files:** Modify `site/admin/edit-pages.js`, `site/admin/i18n.js`, `site/admin/admin.css`

- [ ] **Step 1:** For each field in `FIELDS` whose JSON path maps to a rendered binding (via the
  manifest), render three inputs — FR (the existing one), EN, AR — with the AR input `dir="rtl"`.
  Fields with no binding keep a single input. **`FIELDS` itself stays byte-identical.**
- [ ] **Step 2:** Editing FR marks EN and AR stale live (amber chip, `aria-live` announcement). Editing
  EN or AR clears that language's mark.
- [ ] **Step 3:** On save, write `i18n.en[key]` / `i18n.ar[key]` and re-stamp `i18nHash` for languages
  the owner touched; leave stale marks for ones they did not.
- [ ] **Step 4:** Publish summary line states what remains stale; it warns, never blocks.
- [ ] **Step 5:** Page shows its coverage figure from the manifest.
- [ ] **Step 6: Verify** — parity test green, FIELDS gate `GATE OK`, `build --check` OK, and a manual
  edit round-trip in the browser.
- [ ] **Step 7: Commit** — `feat(admin): edit French, English and Arabic together`

---

## Self-Review

- **Spec coverage:** §3.1 → T1 · §3.2 → T7, T8 · §3.3 → T2, T6 · §3.4 → T2 · §4.1 → T3 · §4.2 → T8 ·
  §4.3 → T4 · §6 testing → per-task.
- **Ordering:** T5 must follow T1–T2 (needs `frHash` and the manifest) and precede T8 (or every field
  opens already-stale). T4 must repair before the gate can stay green.
- **Type consistency:** `frHash` is defined in T1 and reused by T2, T5, T8. `deriveValues` shape is
  fixed in T3 and consumed by T4 and T8. `manifest` shape fixed in T1, consumed by T7 and T8.
- **Known risk:** the T1 regex extractor is the weakest link — nested identical tags could mis-capture
  inner text. Mitigated by testing against all 7 real rendered pages in T2, not just fixtures.
