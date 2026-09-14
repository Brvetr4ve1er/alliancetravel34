// site/assets/js/calculator.test.mjs
//
// calculator.js is a plain script (no IIFE) that boots on DOMContentLoaded, so
// loading it into a node:vm context with a document stub that never fires the
// event leaves its top-level helpers reachable and nothing else running.
//
// What is pinned here is the departure filter. Until 2026-09-14 it parsed the
// END of a French range and kept any chip whose RETURN date was still ahead —
// so on the 14th, Azerbaïdjan's "10 – 18 Septembre 2026" (gone for four days)
// was still a selectable, bookable chip, and that string went out verbatim in
// the WhatsApp booking message. The date a traveller can still join is the
// start, which is what these tests assert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("./calculator.js", import.meta.url), "utf8");

/** Run calculator.js with the clock pinned to `now`; return its globals. */
function load(now) {
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(now.getTime());
      else super(...args);
    }
  }
  const ctx = {
    window: {},
    document: {
      readyState: "loading",          // boot() is queued on an event we never fire
      documentElement: { getAttribute: () => "fr", style: {} },
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
    },
    Date: FixedDate,
    navigator: { language: "fr" },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx;
}

const AT = (y, m, d) => new Date(y, m, d).getTime();

test("the start of a range is parsed, not the return", () => {
  const { parseDepartureStart } = load(new Date(2026, 8, 14));
  // The month is spelled once, on the end half — the start still belongs to it.
  assert.equal(parseDepartureStart("10 – 18 Septembre 2026").getTime(), AT(2026, 8, 10));
  // Both halves name their own month.
  assert.equal(parseDepartureStart("27 Juin – 04 Juillet 2026").getTime(), AT(2026, 5, 27));
  // A single date is its own start.
  assert.equal(parseDepartureStart("3 Septembre 2026").getTime(), AT(2026, 8, 3));
});

test("a range that wraps past December starts in the previous year", () => {
  const { parseDepartureStart } = load(new Date(2026, 8, 14));
  // One year spelled, on the January half: the December start is 2026.
  assert.equal(parseDepartureStart("28 Décembre – 05 Janvier 2027").getTime(), AT(2026, 11, 28));
  // Both years spelled: the start half's own year wins outright.
  assert.equal(parseDepartureStart("28 Décembre 2026 – 05 Janvier 2027").getTime(), AT(2026, 11, 28));
});

test("a four-digit year is never mistaken for the day", () => {
  const { parseDepartureStart } = load(new Date(2026, 8, 14));
  assert.equal(parseDepartureStart("2026 Septembre 08 – 12").getDate(), 8);
});

test("a departure already under way is not bookable", () => {
  // Today is 14 September 2026. This group left on the 10th and returns on the
  // 18th: the end date is still in the future, which is exactly what the old
  // filter checked.
  const { isFutureDeparture } = load(new Date(2026, 8, 14));
  assert.equal(isFutureDeparture("10 – 18 Septembre 2026"), false);
  assert.equal(isFutureDeparture("06 – 17 Septembre 2026"), false);  // bali
  assert.equal(isFutureDeparture("09 – 15 Septembre 2026"), false);  // tunisie
});

test("a departure still ahead, or leaving today, is bookable", () => {
  const { isFutureDeparture } = load(new Date(2026, 8, 14));
  assert.equal(isFutureDeparture("20 – 27 Septembre 2026"), true);
  assert.equal(isFutureDeparture("14 – 20 Septembre 2026"), true);   // leaves today
});

test("an unparseable label is kept rather than hidden", () => {
  const { isFutureDeparture } = load(new Date(2026, 8, 14));
  assert.equal(isFutureDeparture("Sur demande"), true);
  assert.equal(isFutureDeparture(""), true);
});
