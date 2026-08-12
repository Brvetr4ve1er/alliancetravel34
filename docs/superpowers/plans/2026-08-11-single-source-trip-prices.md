# Single-source trip prices (sync-on-save) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `tripData.hotels[].prices` the single source for a trip's prices — `save-trip` recomputes every derived display copy from it before commit, so an owner price change propagates and the build passes.

**Architecture:** A new pure `syncDerivedPrices(trip)` in `tools/value-graph.mjs` clones the trip and rewrites the derived copies (reusing `deriveValues`' safe-derivation for hero/SEO/hotel-cards, plus guarded string rewrites for `priceMeta` and `calcUi.optionsHtml`). `api/save-trip.mjs` calls it between validation and commit, then keeps `driftOf` as a backstop and commits the synced JSON. The `hero.priceFrom` guided admin field is removed since it's now derived.

**Tech Stack:** Vanilla ES modules (`.mjs`), `node:test` (no npm/package.json), `node --test` runner, `node tools/build.mjs` build gate.

## Global Constraints

- No npm / no bundler / no new dependencies. Node built-ins only.
- Tests run from repo root: `node --test <file>` (CWD = repo root; fixtures load via `data/trips/...`).
- Trips are plain JSON — deep-clone with `JSON.parse(JSON.stringify(x))` (no `structuredClone` dependency needed, and it documents the JSON-only assumption).
- Money format is `fmtDA(n)` → dotted thousands + `" DA"` (e.g. `129000` → `"129.000 DA"`). Reuse it; never re-implement.
- Only rewrite a copy when its guard provably holds; otherwise leave it byte-for-byte unchanged. The build's `checkValueGraph` remains the backstop.
- Full suite (`node --test api/*.test.mjs tools/*.test.mjs`) and `node tools/build.mjs` must stay green + idempotent (`0 rendu(s)`) after every task.
- Commit after each task. Branch: `integrate/unified-admin` (canon). Do not push unless asked.

---

### Task 1: `syncDerivedPrices` — the value-graph-covered copies (hero, SEO, hotel cards)

**Files:**
- Modify: `tools/value-graph.mjs` (add `syncDerivedPrices` + two path helpers, after `driftOf`)
- Test: `tools/value-graph.test.mjs` (extend)

**Interfaces:**
- Consumes: existing `deriveValues(trip)` → `{ derived:[{path,current,expected,ok,reason}], safe }`, and `fmtDA(n)`.
- Produces: `syncDerivedPrices(trip) → { trip, changes:[{path,from,to}] }` — pure (clones input), idempotent. Task 2 extends the same function; Task 3 consumes it.

- [ ] **Step 1: Write the failing test** — append to `tools/value-graph.test.mjs`:

```js
import { syncDerivedPrices } from "./value-graph.mjs";

// Minimal trip in the derivable shape: cards count == price-row count, card
// priceFrom values are currency. No headlineHotelId → headline = cheapest double.
const derivableTrip = () => ({
  tripData: { hotels: [
    { id: "a", prices: { double: 100000, single: 130000 } },
    { id: "b", prices: { double: 120000, single: 150000 } },
  ] },
  hero: { priceFrom: "999.000 DA" },
  seo:  { offerPrice: "999000" },
  hotels: [
    { priceFrom: "999.000 DA" },
    { priceFrom: "999.000 DA" },
  ],
});

test("syncDerivedPrices rewrites hero, seo and hotel cards from the source doubles", () => {
  const { trip, changes } = syncDerivedPrices(derivableTrip());
  assert.equal(trip.hero.priceFrom, "100.000 DA");        // cheapest double
  assert.equal(trip.seo.offerPrice, "100000");
  assert.equal(trip.hotels[0].priceFrom, "100.000 DA");   // positional
  assert.equal(trip.hotels[1].priceFrom, "120.000 DA");
  assert.ok(changes.some((c) => c.path === "hero.priceFrom" && c.to === "100.000 DA"));
});

test("syncDerivedPrices does not mutate its input", () => {
  const input = derivableTrip();
  syncDerivedPrices(input);
  assert.equal(input.hero.priceFrom, "999.000 DA"); // untouched
});

test("syncDerivedPrices is idempotent on coherent content", () => {
  const once = syncDerivedPrices(derivableTrip()).trip;
  const { trip: twice, changes } = syncDerivedPrices(once);
  assert.deepEqual(twice, once);
  assert.equal(changes.length, 0);
});

test("syncDerivedPrices leaves cards untouched when they are not currency (bali/KL shape)", () => {
  const t = derivableTrip();
  t.hotels[0].priceFrom = "3 nuits · Kuta";   // itinerary text, not a price
  t.hotels[1].priceFrom = "4 nuits · Ubud";
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.hotels[0].priceFrom, "3 nuits · Kuta");
  assert.equal(trip.hotels[1].priceFrom, "4 nuits · Ubud");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/value-graph.test.mjs`
Expected: FAIL — `syncDerivedPrices` is not exported (`SyntaxError`/`undefined is not a function`).

- [ ] **Step 3: Write minimal implementation** — add to `tools/value-graph.mjs` (after `driftOf`):

```js
function getAt(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt(obj, path, val) {
  const keys = path.split(".");
  const last = keys.pop();
  const parent = keys.reduce((o, k) => (o == null ? o : o[k]), obj);
  if (parent != null) parent[last] = val;
}

/**
 * syncDerivedPrices(trip) -> { trip, changes }
 * Clones the trip and rewrites every derived price copy from tripData.hotels
 * prices (the source). Reuses deriveValues' guards for hero.priceFrom,
 * seo.offerPrice and hotels[i].priceFrom; anything not provably safe is left
 * exactly as-is. Pure and idempotent. (priceMeta + optionsHtml added in Task 2.)
 */
export function syncDerivedPrices(trip) {
  const out = JSON.parse(JSON.stringify(trip)); // trips are plain JSON
  const changes = [];

  const { derived, safe } = deriveValues(out);
  if (safe) {
    for (const d of derived) {
      if (d.ok || d.expected == null) continue; // already agrees, or not derivable
      const from = getAt(out, d.path);
      if (from === d.expected) continue;
      setAt(out, d.path, d.expected);
      changes.push({ path: d.path, from, to: d.expected });
    }
  }

  return { trip: out, changes };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/value-graph.test.mjs`
Expected: PASS (all new tests + the existing value-graph tests).

- [ ] **Step 5: Commit**

```bash
git add tools/value-graph.mjs tools/value-graph.test.mjs
git commit -m "feat(prices): syncDerivedPrices for hero/seo/hotel-card copies"
```

---

### Task 2: extend `syncDerivedPrices` to `priceMeta` + `calcUi.optionsHtml`

**Files:**
- Modify: `tools/value-graph.mjs` (`syncDerivedPrices` body)
- Test: `tools/value-graph.test.mjs` (extend)

**Interfaces:**
- Consumes: `fmtDA(n)`, the source `tripData.hotels[].prices.{single,double}`.
- Produces: same `syncDerivedPrices` signature; now also rewrites `hotels[i].priceMeta` (the `Single <currency>` token) and `calcUi.optionsHtml` (each `dès <currency>`), guarded.

- [ ] **Step 1: Write the failing test** — append to `tools/value-graph.test.mjs`:

```js
test("syncDerivedPrices rewrites only the Single token in priceMeta", () => {
  const t = derivableTrip();
  t.hotels[0].priceMeta = "Double · pers · Single 999.000 DA";
  t.hotels[1].priceMeta = "Double · pers · Single 999.000 DA";
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.hotels[0].priceMeta, "Double · pers · Single 130.000 DA");
  assert.equal(trip.hotels[1].priceMeta, "Double · pers · Single 150.000 DA");
});

test("syncDerivedPrices leaves priceMeta without a Single token untouched", () => {
  const t = derivableTrip();
  t.hotels[0].priceMeta = "Double · pers"; // no Single token
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.hotels[0].priceMeta, "Double · pers");
});

test("syncDerivedPrices rewrites each dès token in optionsHtml positionally", () => {
  const t = derivableTrip();
  t.calcUi = { optionsHtml: '<option>A — dès 999.000 DA</option><option>B — dès 999.000 DA</option>' };
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.calcUi.optionsHtml,
    '<option>A — dès 100.000 DA</option><option>B — dès 120.000 DA</option>');
});

test("syncDerivedPrices leaves optionsHtml untouched when token count != hotel count", () => {
  const t = derivableTrip();
  t.calcUi = { optionsHtml: '<option>dès 999.000 DA</option><option>dès 999.000 DA</option><option>dès 999.000 DA</option>' };
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.calcUi.optionsHtml, t.calcUi.optionsHtml); // 3 tokens vs 2 hotels → skip
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/value-graph.test.mjs`
Expected: FAIL — priceMeta/optionsHtml assertions fail (values still `999.000 DA`); the Task 1 tests still pass.

- [ ] **Step 3: Write minimal implementation** — insert before `return { trip: out, changes };` in `syncDerivedPrices`:

```js
  const rows = (out.tripData && out.tripData.hotels) || [];
  const cards = out.hotels || [];

  // priceMeta: rewrite only the "Single <currency>" number, per hotel.
  cards.forEach((card, i) => {
    const single = rows[i] && rows[i].prices && rows[i].prices.single;
    if (!card || typeof card.priceMeta !== "string" || !Number.isFinite(single)) return;
    const next = card.priceMeta.replace(/(\bSingle\s+)([\d.\s]+DA)/, (_, lead) => lead + fmtDA(single));
    if (next !== card.priceMeta) {
      changes.push({ path: `hotels.${i}.priceMeta`, from: card.priceMeta, to: next });
      card.priceMeta = next;
    }
  });

  // calcUi.optionsHtml: rewrite each "dès <currency>" positionally — only when the
  // "dès" tokens line up 1:1 with priced hotels (else the mapping is unproven).
  const opts = out.calcUi && out.calcUi.optionsHtml;
  const doubles = rows.map((r) => r && r.prices && r.prices.double);
  if (typeof opts === "string") {
    const tokens = opts.match(/dès\s+[\d.\s]+DA/g) || [];
    if (tokens.length > 0 && tokens.length === doubles.length && doubles.every(Number.isFinite)) {
      let k = 0;
      const next = opts.replace(/(dès\s+)([\d.\s]+DA)/g, (_, lead) => lead + fmtDA(doubles[k++]));
      if (next !== opts) {
        changes.push({ path: "calcUi.optionsHtml", from: opts, to: next });
        out.calcUi.optionsHtml = next;
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/value-graph.test.mjs`
Expected: PASS (all value-graph tests, old and new).

- [ ] **Step 5: Commit**

```bash
git add tools/value-graph.mjs tools/value-graph.test.mjs
git commit -m "feat(prices): syncDerivedPrices also syncs priceMeta + calc options"
```

---

### Task 3: wire `syncDerivedPrices` into `api/save-trip.mjs`

**Files:**
- Modify: `api/save-trip.mjs` (import + steps 2–3, commit synced content)
- Test: `api/save-trip.test.mjs` (extend)

**Interfaces:**
- Consumes: `syncDerivedPrices(content)` and existing `driftOf(content)` from `../tools/value-graph.mjs`.
- Produces: no new export; behavior change — the committed JSON is the synced one.

- [ ] **Step 1: Write the failing test** — append to `api/save-trip.test.mjs`:

```js
import { driftOf } from "../tools/value-graph.mjs";

test("syncs derived price copies from an edited calculator price before commit", async (t) => {
  let putBody;
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") putBody = JSON.parse(opts.body);
    return fn(url, opts);
  });

  // Bump the first hotel's source double; leave the display copies stale.
  const content = structuredClone(REAL);
  content.slug = "istanbul";
  content.tripData.hotels[0].prices.double = 999000;

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content, sha: "sha" }), res);

  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(calls.put, 1);

  const committed = JSON.parse(Buffer.from(putBody.content, "base64").toString("utf8"));
  assert.equal(committed.tripData.hotels[0].prices.double, 999000);   // source preserved
  assert.equal(committed.hotels[0].priceFrom, "999.000 DA");          // card synced
  assert.equal(driftOf(committed).length, 0);                        // globally coherent
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/save-trip.test.mjs`
Expected: FAIL — committed `hotels[0].priceFrom` is still `"129.000 DA"` (save commits raw content; no sync yet).

- [ ] **Step 3: Write minimal implementation** — in `api/save-trip.mjs`:

Add the import beside the others:
```js
import { driftOf, syncDerivedPrices } from "../tools/value-graph.mjs";
```
(Remove the separate `import { driftOf } ...` line added in `2c1eadd` if present — merge into one.)

Replace the render + drift block so it acts on synced content, and commit the synced JSON:
```js
  // 2. Single-source: recompute every derived display copy from tripData.hotels prices.
  const synced = syncDerivedPrices(content).trip;

  // 2b. Dry-run render the SYNCED content — renderTrip throws on any missing field.
  try { renderTrip(synced); }
  catch (e) { return res.status(422).json({ errors: [`rendu impossible: ${e.message}`] }); }

  // 2c. Price coherence backstop on the synced content (unresolvable cases still 422).
  const drift = driftOf(synced);
  if (drift.length) {
    return res.status(422).json({
      errors: drift.map((d) =>
        d.expected == null
          ? `prix: ${d.reason}`
          : `prix incohérent: "${d.path}" affiche ${JSON.stringify(d.current)} ` +
            `mais devrait être ${JSON.stringify(d.expected)} — ${d.reason}`
      ),
    });
  }

  // 3. Commit the SYNCED content (retry once on a stale SHA).
  const path = `data/trips/${slug}.json`;
  const json = JSON.stringify(synced, null, 2) + "\n";
```
(The rest of step 3 — `message`, `getFile`/`putFile`, 409 retry — is unchanged; it already references `json`.)

- [ ] **Step 4: Run test to verify it passes, then the full suite + build**

Run: `node --test api/save-trip.test.mjs`
Expected: PASS (new sync test + the existing reject/coherent tests).

Run: `node --test api/*.test.mjs tools/*.test.mjs`
Expected: PASS, 0 fail.

Run: `node tools/build.mjs`
Expected: `Build OK — … 0 rendu(s) …` (idempotent; the 7 live trips are already coherent so sync is a no-op).

- [ ] **Step 5: Commit**

```bash
git add api/save-trip.mjs api/save-trip.test.mjs
git commit -m "feat(admin): sync derived prices on save so a price edit propagates"
```

---

### Task 4: remove the now-derived `hero.priceFrom` guided admin field

**Files:**
- Modify: `site/admin/edit-pages.js:32` (delete the `hero.priceFrom` FIELDS entry)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. `checkAdminFields` (build gate) only errors on FIELDS paths *not* read by a template, so removing an entry is always safe; `hero.priceFrom` stays readable by `hero.tpl`.

This is a configuration edit (per TDD's config exception, approved in the spec). It is verified by the existing admin-fields build gate, not a new unit test.

- [ ] **Step 1: Delete the field** — remove this exact line from `site/admin/edit-pages.js`:

```js
  ["Hero — prix « à partir de »", "hero.priceFrom", "text"],
```

- [ ] **Step 2: Verify the admin-fields gate + build stay green**

Run: `node tools/build.mjs`
Expected: `Build OK …` with no `champ admin "hero.priceFrom"` error and no new warnings (the gate now checks one fewer path; the remaining fields are unchanged).

- [ ] **Step 3: Confirm the field is gone and no other file references it as a guided field**

Run: `grep -n "hero.priceFrom" site/admin/edit-pages.js`
Expected: no output (the FIELDS entry is gone; the value is still produced by `syncDerivedPrices` and read by `hero.tpl`).

- [ ] **Step 4: Commit**

```bash
git add site/admin/edit-pages.js
git commit -m "chore(admin): drop hero.priceFrom guided field (now derived on save)"
```

---

## Self-Review

**1. Spec coverage:**
- Source of truth `tripData.hotels[].prices` → Tasks 1–2 read it; Task 3 wires it. ✓
- Derivation table (hero, seo, card, priceMeta, optionsHtml) → Task 1 (first three via `deriveValues`), Task 2 (priceMeta, optionsHtml). ✓
- `syncDerivedPrices` contract (pure, `{trip,changes}`, idempotent, safe-only) → Task 1 tests (mutation, idempotence, skip) + Task 2 skip tests. ✓
- save-trip integration order (validate → sync → render synced → driftOf → commit synced) → Task 3 Step 3. ✓
- Admin `hero.priceFrom` removal → Task 4. ✓
- Tests: value-graph unit + save-trip integration + green build/idempotent → Tasks 1–3 Step 4. ✓
- Out of scope (home/voyages/enhance/i18n/related) → not touched by any task. ✓

**2. Placeholder scan:** No TBD/TODO; every code + test step has literal content; the unchanged tail of save-trip step 3 is described by exact variable name (`json`). ✓

**3. Type consistency:** `syncDerivedPrices(trip) → { trip, changes }` used identically in Tasks 1, 2, 3. `driftOf`/`deriveValues`/`fmtDA` names match `tools/value-graph.mjs`. `makeFetch`/`fakeRes`/`fakeReq`/`REAL` reused from the existing `api/save-trip.test.mjs` (defined there in `2c1eadd`). Path helper names `getAt`/`setAt` consistent. ✓

**Note for the implementer (Task 3):** `api/save-trip.test.mjs` already imports `structuredClone`-able `REAL` and defines `makeFetch`/`fakeRes`/`fakeReq` (from commit `2c1eadd`); the new test reuses them and adds a `driftOf` import at the top.
