// site/admin/edit-lists.test.mjs
//
// The list editors are the owner's write path onto the public site, so these
// tests run the real collectLists() against the real trip files and then push
// the result through the same chain api/save-trip.mjs runs. A round-trip that
// "looks right" but fails the build is the exact failure this whole feature
// exists to prevent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LIST_SPECS, inferShape, maxKeyIndex, collectLists } from "./edit-lists.js";
import { validateTrip } from "../../tools/validate-trip.mjs";
import { renderTrip } from "../../tools/templates/trip2.mjs";
import { syncDerivedPrices } from "../../tools/value-graph.mjs";
import { checkRenderedPage } from "../../tools/check-rendered-page.mjs";

const TRIPS_DIR = new URL("../../data/trips/", import.meta.url);
const SLUGS = readdirSync(TRIPS_DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const load = (slug) => JSON.parse(readFileSync(new URL(`${slug}.json`, TRIPS_DIR), "utf8"));
const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);

// ── A DOM small enough to read, faithful enough to drive ───────────────
// collectLists() touches exactly: [data-list], .lister__row, row.dataset.orig,
// [data-lf="…"] (.value + classList + setAttribute) and the pick radio. This
// models that surface and nothing else, so the test exercises the real
// collector rather than a re-implementation of it.
function makeInput(value) {
  return {
    value: String(value ?? ""),
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, has(c) { return this._s.has(c); } },
    setAttribute() {}, removeAttribute() {},
    get invalid() { return this.classList.has("is-invalid"); },
  };
}

function makeRow(spec, item, orig) {
  const fields = new Map(spec.fields.map((f) => [f.name, makeInput(item[f.name])]));
  const radio = spec.choose ? { checked: !!item[spec.choose], type: "radio" } : null;
  return {
    dataset: { orig: orig === null ? "" : String(orig) },
    fields, radio,
    querySelector(sel) {
      const m = /^\[data-lf="(.+)"\]$/.exec(sel);
      if (m) return fields.get(m[1]) || null;
      if (sel.startsWith('input[type="radio"]')) return radio;
      return null;
    },
  };
}

function buildDom(content) {
  const lists = new Map();
  for (const spec of LIST_SPECS) {
    const arr = get(content, spec.path);
    if (!Array.isArray(arr)) continue;
    lists.set(spec.id, { rows: arr.map((item, i) => makeRow(spec, item, i)) });
  }
  return {
    lists,
    querySelector(sel) {
      const m = /^\[data-list="(.+)"\]$/.exec(sel);
      if (!m) return null;
      const l = lists.get(m[1]);
      if (!l) return null;
      return { querySelectorAll: () => l.rows };
    },
    // Test helpers, not part of the real DOM.
    addRow(specId, values) {
      const spec = LIST_SPECS.find((s) => s.id === specId);
      const row = makeRow(spec, {}, null);
      for (const [k, v] of Object.entries(values)) row.fields.get(k).value = String(v);
      lists.get(specId).rows.push(row);
      return row;
    },
    removeRow(specId, i) { lists.get(specId).rows.splice(i, 1); },
    rows(specId) { return lists.get(specId).rows; },
  };
}

function saveTripChain(slug, trip) {
  const { errors } = validateTrip(`data/trips/${slug}.json`, trip, { enabled: false });
  if (errors.length) return { ok: false, why: errors.map((e) => e.msg) };
  const synced = syncDerivedPrices(trip).trip;
  let html;
  try { html = renderTrip(synced); } catch (e) { return { ok: false, why: [`rendu: ${e.message}`] }; }
  const p = checkRenderedPage(html);
  return p.length ? { ok: false, why: p } : { ok: true, why: [] };
}

// ── Key shape inference ────────────────────────────────────────────────
test("the key shape is read off each trip, never assumed", () => {
  // The seven trips do not agree, which is the whole reason this is inferred:
  // azerbaidjan's FAQ answers are azFaqA<n>, egypte's are egFaq<n>A, and
  // istanbul carries no per-item binding at all.
  const faq = LIST_SPECS.find((s) => s.id === "faq");
  const az = inferShape(load("azerbaidjan"), faq, "kA");
  const eg = inferShape(load("egypte"), faq, "kA");
  assert.deepEqual([az.head, az.tail], ["azFaqA", ""]);
  assert.deepEqual([eg.head, eg.tail], ["egFaq", "A"]);
  assert.equal(inferShape(load("istanbul"), faq, "kA"), null);
});

test("a list with two key families takes the dominant one", () => {
  // azerbaidjan's inclusions are azInclItem1-3, azInclHotel1-2, azInclItem6-10.
  // Requiring unanimity would mint no key for a new row, leaving it
  // permanently untranslatable.
  const incl = LIST_SPECS.find((s) => s.id === "included");
  const shape = inferShape(load("azerbaidjan"), incl, "k");
  assert.equal(shape.head, "azInclItem");
});

test("maxKeyIndex counts orphaned dictionary keys, not just live items", () => {
  // Measured: azerbaidjan has 7 itinerary days but keys up to azDay8; bali has
  // 5 and keys up to 11. Handing a new day the number 8 would give it a stale
  // English translation nobody asked for.
  const itin = LIST_SPECS.find((s) => s.id === "itinerary");
  const az = load("azerbaidjan");
  assert.equal(az.itinerary.days.length, 7);
  assert.ok(maxKeyIndex(az, itin) >= 8, "must look past the live items");
  const ba = load("bali");
  assert.ok(maxKeyIndex(ba, itin) > ba.itinerary.days.length);
});

// ── Round-trip ─────────────────────────────────────────────────────────
for (const slug of SLUGS) {
  test(`${slug}: an untouched round-trip still passes the save-trip chain`, () => {
    const trip = load(slug);
    const before = structuredClone(trip);
    const invalid = collectLists(buildDom(trip), trip);
    assert.deepEqual(invalid, [], "an untouched form must refuse nothing");

    // Content is preserved exactly…
    for (const spec of LIST_SPECS) {
      const a = get(before, spec.path), b = get(trip, spec.path);
      if (!Array.isArray(a)) continue;
      assert.equal(b.length, a.length, `${spec.id}: length changed`);
      for (const f of spec.fields) {
        assert.deepEqual(b.map((x) => x[f.name]), a.map((x) => x[f.name]), `${spec.id}.${f.name} changed`);
      }
      // …including everything the editor never shows.
      assert.deepEqual(b.map((x) => x.iconSvg), a.map((x) => x.iconSvg), `${spec.id}: iconSvg lost`);
    }
    const r = saveTripChain(slug, trip);
    assert.equal(r.ok, true, r.why.join(" | "));
  });
}

// ── Adding ─────────────────────────────────────────────────────────────
test("a new FAQ item gets max+1 keys in the trip's own shape", () => {
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  const before = maxKeyIndex(trip, LIST_SPECS.find((s) => s.id === "faq"));
  dom.addRow("faq", { question: "Peut-on payer en plusieurs fois ?", answerHtml: "Oui, <strong>en trois fois</strong>." });
  collectLists(dom, trip);

  const added = trip.faq[trip.faq.length - 1];
  assert.equal(added.kBtn, ` data-i18n="azFaqQ${before + 1}"`);
  assert.equal(added.kA, ` data-i18n-html="azFaqA${before + 1}"`);
  // Both keys of one item share one number, or the pair drifts apart forever.
  assert.equal(added.question, "Peut-on payer en plusieurs fois ?");
  // aosDelay is required by validate-trip on a non-open FAQ item.
  assert.ok(Number.isInteger(added.aosDelay));
  // …and the JSON-LD mirror was regenerated, tags stripped.
  assert.equal(trip.seo.faqJsonLd.length, trip.faq.length);
  assert.equal(trip.seo.faqJsonLd.at(-1).text, "Oui, en trois fois.");
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});

test("a trip with no per-item bindings gets no invented keys", () => {
  // istanbul's FAQ carries none. Minting `istFaqQ1` would create a binding
  // whose translation nobody will ever write, and the item would render an
  // empty string in EN/AR instead of falling back to French.
  const trip = load("istanbul");
  const dom = buildDom(trip);
  dom.addRow("faq", { question: "Une question ?", answerHtml: "Une réponse." });
  collectLists(dom, trip);
  const added = trip.faq.at(-1);
  // Empty string, NOT undefined. The template engine's slot guard rejects an
  // undefined slot, so leaving the property off made renderTrip throw
  // `".kBtn" is missing` — a refusal the owner could do nothing about. "" is
  // exactly what istanbul's existing FAQ items carry.
  assert.equal(added.kBtn, "");
  assert.equal(added.kA, "");
  assert.equal(saveTripChain("istanbul", trip).ok, true);
});

test("a new departure writes BOTH the chip and tripData.dates", () => {
  // Two arrays, same strings — or the owner adds a departure the calculator
  // cannot select and the WhatsApp summary never mentions.
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  dom.addRow("dates", { value: "02 – 10 Octobre 2026", label: "2–10 Oct 2026" });
  collectLists(dom, trip);
  assert.equal(trip.calcUi.dateChips.at(-1).value, "02 – 10 Octobre 2026");
  assert.deepEqual(trip.tripData.dates, trip.calcUi.dateChips.map((c) => c.value));
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});

test("exactly one row stays chosen, whatever the radios say", () => {
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  for (const r of dom.rows("dates")) r.radio.checked = true; // all of them
  collectLists(dom, trip);
  assert.equal(trip.calcUi.dateChips.filter((c) => c.active).length, 1);

  const trip2 = load("azerbaidjan");
  const dom2 = buildDom(trip2);
  for (const r of dom2.rows("dates")) r.radio.checked = false; // none
  collectLists(dom2, trip2);
  assert.equal(trip2.calcUi.dateChips.filter((c) => c.active).length, 1);
  assert.equal(trip2.calcUi.dateChips[0].active, true);
});

// ── Removing ───────────────────────────────────────────────────────────
test("deleting an item deletes its translations", () => {
  const trip = load("azerbaidjan");
  const doomed = trip.faq[1];
  const keys = [/="([^"]+)"/.exec(doomed.kBtn)[1], /="([^"]+)"/.exec(doomed.kA)[1]];
  for (const k of keys) assert.ok(trip.i18n.en[k], `${k} should exist before`);

  const dom = buildDom(trip);
  dom.removeRow("faq", 1);
  collectLists(dom, trip);

  for (const k of keys) {
    assert.equal(trip.i18n.en[k], undefined, `${k} left behind in EN`);
    assert.equal(trip.i18n.ar[k], undefined, `${k} left behind in AR`);
  }
  assert.equal(trip.seo.faqJsonLd.length, trip.faq.length);
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});

test("surviving items keep their original keys after a delete", () => {
  // Renumbering is what binds one key to two French strings — the clash the
  // server refuses. The remaining items must not move.
  const trip = load("azerbaidjan");
  const keptKey = /="([^"]+)"/.exec(trip.faq[2].kBtn)[1];
  const dom = buildDom(trip);
  dom.removeRow("faq", 0);
  collectLists(dom, trip);
  assert.equal(/="([^"]+)"/.exec(trip.faq[1].kBtn)[1], keptKey);
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});

test("delete then add does not recycle the freed number", () => {
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  const freed = /="([^"]+)"/.exec(trip.faq[3].kBtn)[1];
  dom.removeRow("faq", 3);
  dom.addRow("faq", { question: "Nouvelle question ?", answerHtml: "Nouvelle réponse." });
  collectLists(dom, trip);
  assert.notEqual(/="([^"]+)"/.exec(trip.faq.at(-1).kBtn)[1], freed);
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});

// ── Refusing ───────────────────────────────────────────────────────────
test("an emptied field is refused, and nothing is written", () => {
  const trip = load("azerbaidjan");
  const original = trip.faq[0].question;
  const dom = buildDom(trip);
  dom.rows("faq")[0].fields.get("question").value = "   ";
  const invalid = collectLists(dom, trip);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].invalid, true, "the input must be marked for the owner to find");
  assert.equal(trip.faq[0].question, original, "a refused value must not be written");
});

test("a star rating outside 1-5 is refused", () => {
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  dom.rows("hotels")[0].fields.get("stars").value = "9";
  assert.equal(collectLists(dom, trip).length, 1);
  dom.rows("hotels")[0].fields.get("stars").value = "4";
  assert.equal(collectLists(dom, trip).length, 0);
  assert.equal(trip.hotels[0].starsHtml, "★★★★", "starsHtml must follow stars");
});

// ── Generated fields ───────────────────────────────────────────────────
test("counters and JSON-LD are regenerated, never left to the owner", () => {
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  dom.addRow("included", { t: "Assurance voyage <strong>incluse</strong>" });
  dom.removeRow("excluded", 0);
  collectLists(dom, trip);
  assert.match(trip.inclus.includedCount, new RegExp(`^${trip.inclus.included.length}\\b`));
  assert.match(trip.inclus.excludedCount, new RegExp(`^${trip.inclus.excluded.length}\\b`));
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});
