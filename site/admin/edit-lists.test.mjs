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

/**
 * A copy of `trip` whose items in `listPath` carry no per-item binding.
 *
 * The "nothing to infer from" cases below used to borrow whichever real trip
 * happened to be untranslated at the time. That made them hostage to content:
 * wiring istanbul's FAQ for EN/AR — an improvement — turned two green tests
 * red without anything being wrong. The shape of the fixture is the thing
 * under test, so the fixture is built here rather than found.
 */
function withoutItemBindings(trip, listPath) {
  const clone = structuredClone(trip);
  for (const item of get(clone, listPath) ?? []) {
    for (const field of Object.keys(item)) {
      if (field === "k" || /^k[A-Z]/.test(field)) item[field] = "";
    }
  }
  return clone;
}
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

// `content` is only needed for extraFields (hotels' `why`, resolved off a
// DIFFERENT array via getExtra) — every other spec ignores the parameter.
function makeRow(spec, item, orig, content) {
  const fields = new Map(spec.fields.map((f) => [f.name, makeInput(item[f.name])]));
  for (const f of spec.extraFields || []) fields.set(f.name, makeInput(f.getExtra(content, item)));
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
    lists.set(spec.id, { rows: arr.map((item, i) => makeRow(spec, item, i, content)) });
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
      const row = makeRow(spec, {}, null, content);
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
  // azerbaidjan's FAQ answers are azFaqA<n>, egypte's are egFaq<n>A.
  const faq = LIST_SPECS.find((s) => s.id === "faq");
  const az = inferShape(load("azerbaidjan"), faq, "kA");
  const eg = inferShape(load("egypte"), faq, "kA");
  const ist = inferShape(load("istanbul"), faq, "kA");
  assert.deepEqual([az.head, az.tail], ["azFaqA", ""]);
  assert.deepEqual([eg.head, eg.tail], ["egFaq", "A"]);
  assert.deepEqual([ist.head, ist.tail], ["istFaqA", ""]);
  // A list whose items carry no binding at all yields nothing to infer from.
  // Synthetic, deliberately: this used to point at istanbul, which was simply
  // an untranslated page — so finishing its translations broke a test that was
  // never about istanbul.
  assert.equal(inferShape(withoutItemBindings(load("istanbul"), "faq"), faq, "kA"), null);
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
  // Minting `istFaqQ5` on a list that binds nothing would create a binding
  // whose translation nobody will ever write, and the item would render an
  // empty string in EN/AR instead of falling back to French.
  const trip = withoutItemBindings(load("istanbul"), "faq");
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

test("hotels' extraField 'why' reads and writes tripData.hotels, not the display card", () => {
  // why lives on a DIFFERENT array (tripData.hotels, the calculator's price
  // grid) than the card being edited (hotels), matched by calcId — the case
  // extraFields exists for.
  const trip = load("istanbul");
  const dom = buildDom(trip);
  const card = trip.hotels[0];
  const calc = trip.tripData.hotels.find((h) => h.id === card.calcId);
  assert.ok(calc, "fixture assumption: the first card has a matching calc row");

  const input = dom.rows("hotels")[0].fields.get("why");
  assert.equal(input.value, calc.why, "the form must show the CURRENT tooltip text");

  input.value = "Nouveau texte pour le calculateur.";
  assert.deepEqual(collectLists(dom, trip), []);
  assert.equal(calc.why, "Nouveau texte pour le calculateur.", "written to tripData.hotels");
  assert.equal(card.why, undefined, "never written to the display card — it has no such field");
});

test("an emptied 'why' is refused, like every other required text field", () => {
  const trip = load("istanbul");
  const dom = buildDom(trip);
  const calc = trip.tripData.hotels.find((h) => h.id === trip.hotels[0].calcId);
  const before = calc.why;
  dom.rows("hotels")[0].fields.get("why").value = "   ";
  const invalid = collectLists(dom, trip);
  assert.equal(invalid.length, 1);
  assert.equal(calc.why, before, "a refused value must not be written");
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

// ── The silent-i18n-gap bug, found 2026-09-24 ─────────────────────────────
//
// Every test above only proves collectLists() writes SOMETHING and that
// api/save-trip.mjs's gates accept it. Neither catches this bug: the gates
// check whether an EXISTING binding is empty or clashing, never whether a
// binding exists at ALL. A row minted with no key is invisible to all of
// them, renders with no data-i18n attribute, and is French-only forever on
// /en/ and /ar/. These tests inspect the RENDERED HTML directly, the same way
// tools/check-admin-lists.test.mjs proves the build gate, so a future
// regression here fails on the actual defect rather than on a proxy for it.

function renderedHtml(slug, trip) {
  const synced = syncDerivedPrices(trip).trip;
  return renderTrip(synced);
}

test("a new departure date is minted with a real binding, on every trip", () => {
  for (const slug of SLUGS) {
    const trip = load(slug);
    const dom = buildDom(trip);
    const before = maxKeyIndex(trip, LIST_SPECS.find((s) => s.id === "dates"));
    dom.addRow("dates", { value: "01 - 09 Decembre 2027", label: "1-9 Dec 2027" });
    const invalid = collectLists(dom, trip);
    assert.deepEqual(invalid, [], slug);

    const added = trip.calcUi.dateChips.at(-1);
    assert.match(added.k, new RegExp("data-i18n=\"\\w+" + (before + 1) + "\""), slug + ": no key minted");

    const key = /="([^"]+)"/.exec(added.k)[1];
    const html = renderedHtml(slug, trip);
    assert.match(html, new RegExp("data-i18n=\"" + key + "\""),
      slug + ": the new chip rendered with no translation binding at all");
    assert.equal(saveTripChain(slug, trip).ok, true, slug);
  }
});

test("a new FAQ question is minted with a real binding, on all 6 kQ-based trips", () => {
  const kQTrips = SLUGS.filter((s) => s !== "azerbaidjan"); // azerbaidjan alone uses kBtn
  for (const slug of kQTrips) {
    const trip = load(slug);
    const dom = buildDom(trip);
    dom.addRow("faq", { question: "Puis-je annuler apres reservation ?", answerHtml: "Oui, sous conditions." });
    const invalid = collectLists(dom, trip);
    assert.deepEqual(invalid, [], slug);

    const added = trip.faq.at(-1);
    assert.notEqual(added.kQ, "", slug + ": the question text has no binding - untranslatable on EN/AR");

    const key = /="([^"]+)"/.exec(added.kQ)[1];
    const html = renderedHtml(slug, trip);
    assert.match(html, new RegExp("data-i18n=\"" + key + "\""),
      slug + ": the new question rendered with no translation binding at all");
    assert.equal(saveTripChain(slug, trip).ok, true, slug);
  }
});

test("azerbaidjan's FAQ still mints kBtn, not kQ, after the fix", () => {
  // The fix ADDS kQ to the spec; it must not disturb the one trip that
  // legitimately uses the other slot for the same purpose.
  const trip = load("azerbaidjan");
  const dom = buildDom(trip);
  dom.addRow("faq", { question: "Une nouvelle question ?", answerHtml: "Une reponse." });
  collectLists(dom, trip);
  const added = trip.faq.at(-1);
  assert.notEqual(added.kBtn, "");
  assert.equal(added.kQ, "", "azerbaidjan's items never carry kQ - inventing one would be wrong for this trip");
  assert.equal(saveTripChain("azerbaidjan", trip).ok, true);
});

test("a semantic (non-numeric) key family still gets a real, unique binding - kuala-lumpur's FAQ", () => {
  // klFaqVisaQ, klFaqFlightQ, and so on - topic words a human chose, no digit
  // anywhere for the old inferShape to find a pattern in. Confirms the
  // FALLBACK path, not just the declaration fix.
  const trip = load("kuala-lumpur");
  const dom = buildDom(trip);
  dom.addRow("faq", { question: "Le petit-dejeuner est-il inclus ?", answerHtml: "Oui, tous les matins." });
  const invalid = collectLists(dom, trip);
  assert.deepEqual(invalid, []);

  const added = trip.faq.at(-1);
  assert.notEqual(added.kQ, "", "fallback must still mint SOMETHING, not leave it empty");
  assert.notEqual(added.kA, "");
  const qKey = /="([^"]+)"/.exec(added.kQ)[1];
  const aKey = /="([^"]+)"/.exec(added.kA)[1];
  assert.notEqual(qKey, aKey, "the question and answer must not collide on one key");

  const html = renderedHtml("kuala-lumpur", trip);
  assert.match(html, new RegExp("data-i18n=\"" + qKey + "\""));
  assert.match(html, new RegExp("data-i18n-html=\"" + aKey + "\""));
  assert.equal(saveTripChain("kuala-lumpur", trip).ok, true);
});

test("a semantic (non-numeric) key family still gets a real, unique binding - bali's highlights", () => {
  // baHlAccomLabel, baHlStepsLabel, and so on - same shape of gap, different list.
  const trip = load("bali");
  const dom = buildDom(trip);
  dom.addRow("highlights", { label: "Plongee", title: "Sortie snorkeling", body: "Une matinee sur un site de recif." });
  const invalid = collectLists(dom, trip);
  assert.deepEqual(invalid, []);

  const added = trip.highlights.at(-1);
  for (const prop of ["kLabel", "kTitle", "kBody"]) assert.notEqual(added[prop], "", prop);
  const keys = ["kLabel", "kTitle", "kBody"].map((p) => /="([^"]+)"/.exec(added[p])[1]);
  assert.equal(new Set(keys).size, 3, "each field needs its own key");

  const html = renderedHtml("bali", trip);
  for (const key of keys) assert.match(html, new RegExp("data-i18n(?:-html)?=\"" + key + "\""));
  assert.equal(saveTripChain("bali", trip).ok, true);
});

test("two sequential fallback adds on the same trip never collide", () => {
  // The fallback family is brand new per trip, so nothing guards its
  // numbering except maxKeyIndex itself picking it up like any other shape.
  const trip = load("bali");
  const dom = buildDom(trip);
  dom.addRow("highlights", { label: "A", title: "A", body: "A" });
  collectLists(dom, trip);
  dom.addRow("highlights", { label: "B", title: "B", body: "B" });
  collectLists(dom, trip);

  const last2 = trip.highlights.slice(-2);
  const firstKey = /="([^"]+)"/.exec(last2[0].kLabel)[1];
  const secondKey = /="([^"]+)"/.exec(last2[1].kLabel)[1];
  assert.notEqual(firstKey, secondKey);
  assert.equal(saveTripChain("bali", trip).ok, true);
});

test("every real per-item binding is one the editor can mint - the invariant tools/check-admin-lists.mjs enforces at build time", () => {
  // The same exhaustive scan the build gate runs, kept here too so a
  // regression in inferShape's fallback fails a normal `node --test` run and
  // not only the (separately tested) gate's own logic.
  const hasAttr = (v) => /(data-i18n(?:-html)?)\s*=/.test(String(v ?? ""));
  for (const spec of LIST_SPECS) {
    if (spec.addable === false) continue;
    for (const slug of SLUGS) {
      const trip = load(slug);
      const arr = get(trip, spec.path);
      if (!Array.isArray(arr)) continue;
      const propsInUse = new Set();
      for (const item of arr) {
        for (const k of Object.keys(item || {})) {
          if (/^k([A-Z]|$)/.test(k) && hasAttr(item[k])) propsInUse.add(k);
        }
      }
      for (const prop of propsInUse) {
        assert.ok(spec.keys.includes(prop), spec.id + ".keys omits \"" + prop + "\", used by " + slug);
        assert.ok(inferShape(trip, spec, prop), spec.id + "/" + prop + "/" + slug + ": inferShape gives nothing");
      }
    }
  }
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
