// site/assets/js/calculator.test.mjs
// calculator.js is a plain (non-module) browser script: TripCalculator's
// constructor wires itself straight to document.querySelectorAll/getElementById,
// so it cannot be `new`'d outside a real DOM. Its pricing math, however — the
// calculate()/roomLabel()/kidPriceKey() methods, plus the module-level
// parseDepartureEnd()/isFutureDeparture() date helpers — reads only plain
// data (this.trip/this.state, or a string argument) and never touches
// document/window. So: load the file into a node:vm context (same technique
// tools/lead-payload.test.mjs uses for lead-capture.js), grab the class via a
// second vm script (top-level `class` declarations become part of the
// context's lexical scope, not own properties of the sandbox object, so a
// second runInContext is what surfaces them — verified below), and build
// instances with Object.create(TripCalculator.prototype) to run the pure
// methods WITHOUT ever invoking the DOM-coupled constructor. No behavior in
// calculator.js is changed to make this possible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function load() {
  const code = readFileSync(new URL("./calculator.js", import.meta.url), "utf8");
  const ctx = {
    window: {},
    // Only ever called at top level to *register* the DOMContentLoaded
    // listener (never invoked here) — a no-op stub is enough to load the file.
    document: { addEventListener() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return {
    TripCalculator: vm.runInContext("TripCalculator", ctx),
    parseDepartureEnd: ctx.parseDepartureEnd,
    isFutureDeparture: ctx.isFutureDeparture,
  };
}

function calc(trip, state) {
  const { TripCalculator } = load();
  const inst = Object.create(TripCalculator.prototype);
  inst.trip = trip;
  inst.state = state;
  return inst;
}

const hotel = {
  id: "h1",
  name: "Hotel Test",
  prices: { double: 100000, triple: 90000, single: 150000, baby: 5000, child1: 40000, child2: 35000 },
};

test("calculate(): prices adults at the room-type rate, keyed off state.room", () => {
  const c = calc({ hotels: [hotel] }, { hotelId: "h1", room: "double", adults: 2, kids: [], extras: [] });
  const r = c.calculate();
  assert.equal(r.lines[0].amount, 100000 * 2);
  assert.equal(r.totalDA, 200000);
  assert.equal(r.totalUSD, 0);
  assert.equal(r.hotel, hotel);
});

test("calculate(): triple/single rates select the matching price key", () => {
  const triple = calc({ hotels: [hotel] }, { hotelId: "h1", room: "triple", adults: 1, kids: [], extras: [] }).calculate();
  assert.equal(triple.lines[0].amount, 90000);
  const single = calc({ hotels: [hotel] }, { hotelId: "h1", room: "single", adults: 1, kids: [], extras: [] }).calculate();
  assert.equal(single.lines[0].amount, 150000);
});

test("calculate(): falls back to the double rate, then to 0, when a price is missing", () => {
  const partial = { id: "h2", name: "Partial", prices: { double: 100000 } };
  const singleFallback = calc({ hotels: [partial] }, { hotelId: "h2", room: "single", adults: 1, kids: [], extras: [] }).calculate();
  assert.equal(singleFallback.lines[0].amount, 100000); // single missing → double

  const empty = { id: "h3", name: "Empty", prices: {} };
  const zeroFallback = calc({ hotels: [empty] }, { hotelId: "h3", room: "double", adults: 1, kids: [], extras: [] }).calculate();
  assert.equal(zeroFallback.lines[0].amount, 0);
});

test("calculate(): returns null when no hotel matches state.hotelId", () => {
  const c = calc({ hotels: [hotel] }, { hotelId: "does-not-exist", room: "double", adults: 1, kids: [], extras: [] });
  assert.equal(c.calculate(), null);
});

test("calculate(): kids are priced by TYPE (child_b=1st/child1, child_a=2nd/child2, baby), never by array order", () => {
  const c = calc(
    { hotels: [hotel] },
    { hotelId: "h1", room: "double", adults: 1, kids: [{ type: "child_a" }, { type: "child_b" }, { type: "baby" }], extras: [] }
  );
  const r = c.calculate();
  const kidLines = r.lines.slice(1); // [0] is the adult line
  assert.equal(kidLines[0].label.startsWith("2ᵉ"), true);
  assert.equal(kidLines[0].amount, 35000); // child_a → child2
  assert.equal(kidLines[1].label.startsWith("1ᵉʳ"), true);
  assert.equal(kidLines[1].amount, 40000); // child_b → child1
  assert.equal(kidLines[2].amount, 5000); // baby
});

test("calculate(): only checked extras are billed, and currency defaults to DA", () => {
  const c = calc(
    { hotels: [hotel] },
    {
      hotelId: "h1", room: "double", adults: 1, kids: [],
      extras: [
        { label: "Assurance", amount: 3000, checked: true },       // no currency → DA
        { label: "Excursion", amount: 50, currency: "USD", checked: true },
        { label: "Skipped", amount: 99999, currency: "DA", checked: false },
      ],
    }
  );
  const r = c.calculate();
  const billed = r.lines.slice(1);
  assert.equal(billed.length, 2);
  assert.equal(billed[0].label, "Assurance");
  assert.equal(billed[1].label, "Excursion");
  assert.equal(r.totalDA, 100000 + 3000);
  assert.equal(r.totalUSD, 50);
});

test("roomLabel()/kidPriceKey(): known mappings plus safe fallback for unknown input", () => {
  const c = calc({ hotels: [] }, {});
  assert.equal(c.roomLabel("triple"), "Triple");
  assert.equal(c.roomLabel("single"), "Individuelle");
  assert.equal(c.roomLabel("quad"), "quad"); // unmapped → echoed back, never undefined
  assert.equal(c.kidPriceKey("child_b"), "child1");
  assert.equal(c.kidPriceKey("child_a"), "child2");
  assert.equal(c.kidPriceKey("baby"), "baby");
  assert.equal(c.kidPriceKey("mystery"), "child1"); // documented fallback
});

test("roomLabelL()/_labels(): per-language strings, called with an explicit lang so no document access is needed", () => {
  const c = calc({ hotels: [] }, {});
  assert.equal(c.roomLabelL("single", "en"), "Single");
  assert.equal(c.roomLabelL("single", "ar"), "فردية");
  assert.equal(c.roomLabelL("weird-room", "en"), "weird-room");

  const en = c._labels("en");
  assert.equal(en.greeting("Bali"), "Hello Alliance Travel! I'd like to book the trip Bali.");
  assert.equal(en.adults(1), "1 adult");
  assert.equal(en.adults(2), "2 adults");

  // Unknown lang falls back to the French set (sets[lang] || sets.fr) — compare
  // by value (each _labels() call builds a fresh object with fresh closures,
  // so reference/deep-equality would be a false negative, not the fallback
  // actually being wrong).
  const fallback = c._labels("xx-unknown");
  const fr = c._labels("fr");
  assert.equal(fallback.hotel, fr.hotel);
  assert.equal(fallback.reserve, fr.reserve);
  assert.equal(fallback.greeting("Bali"), fr.greeting("Bali"));
});

// parseDepartureEnd() returns a Date built with the vm context's OWN Date
// constructor (a different realm from this test's), so it fails
// assert.deepEqual/deepStrictEqual even when the value is correct — compare
// via getTime() (a primitive, realm-independent) instead.
const asTime = (d) => (d ? d.getTime() : d);

test("parseDepartureEnd(): reads the END date out of a French departure-range label", () => {
  const { parseDepartureEnd } = load();
  assert.equal(asTime(parseDepartureEnd("3 Septembre 2026")), new Date(2026, 8, 3).getTime());
  assert.equal(asTime(parseDepartureEnd("13 – 20 Juin 2026")), new Date(2026, 5, 20).getTime());
  assert.equal(asTime(parseDepartureEnd("27 Juin – 04 Juillet 2026")), new Date(2026, 6, 4).getTime());
  assert.equal(asTime(parseDepartureEnd("15 Aout 2026")), new Date(2026, 7, 15).getTime()); // unaccented month spelling
});

test("parseDepartureEnd(): a single-year range that wraps the new year rolls the end date to year+1", () => {
  const { parseDepartureEnd } = load();
  // Only one 4-digit year is present (2026) and the range crosses into January —
  // the end date must be resolved to January of the FOLLOWING year, not the same one.
  assert.equal(asTime(parseDepartureEnd("27 Décembre – 3 Janvier 2026")), new Date(2027, 0, 3).getTime());
});

test("parseDepartureEnd(): unparseable input returns null", () => {
  const { parseDepartureEnd } = load();
  assert.equal(parseDepartureEnd(""), null);
  assert.equal(parseDepartureEnd(null), null);
  assert.equal(parseDepartureEnd("no month or day here"), null);
});

test("isFutureDeparture(): fails open on unparseable strings, otherwise compares against today", () => {
  const { isFutureDeparture } = load();
  assert.equal(isFutureDeparture("garbage"), true); // unparseable → keep, don't hide (documented behavior)
  assert.equal(isFutureDeparture("3 Janvier 2099"), true);
  assert.equal(isFutureDeparture("3 Janvier 2020"), false);
});
