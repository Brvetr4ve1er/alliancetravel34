import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveValues, headlineDouble, fmtDA, parseDA, driftOf } from "./value-graph.mjs";

const base = (over = {}) => ({
  hero: { priceFrom: "129.000 DA" },
  seo: { offerPrice: "129000" },
  tripData: { hotels: [{ id: "a", prices: { double: 129000 } }, { id: "b", prices: { double: 180000 } }] },
  hotels: [{ priceFrom: "129.000 DA" }, { priceFrom: "180.000 DA" }],
  ...over,
});

test("fmtDA renders the site's dotted format", () => {
  assert.equal(fmtDA(129000), "129.000 DA");
  assert.equal(fmtDA(36000), "36.000 DA");
  assert.equal(fmtDA(1240000), "1.240.000 DA");
});

test("parseDA reads both stored formats", () => {
  assert.equal(parseDA("439.000 DA"), 439000);
  assert.equal(parseDA("439000"), 439000);
  assert.equal(parseDA("3 nuits · Kuta"), 3); // digits exist but it is not money
  assert.equal(parseDA(null), null);
});

test("hero and seo derive from the cheapest double by default", () => {
  const r = deriveValues(base());
  assert.equal(r.derived.find((d) => d.path === "hero.priceFrom").expected, "129.000 DA");
  assert.equal(r.derived.find((d) => d.path === "seo.offerPrice").expected, "129000");
  assert.equal(r.derived.every((d) => d.ok), true);
});

test("drift is reported, never silently corrected", () => {
  const r = deriveValues(base({ hero: { priceFrom: "439.000 DA" } }));
  const hero = r.derived.find((d) => d.path === "hero.priceFrom");
  assert.equal(hero.ok, false);
  assert.equal(hero.current, "439.000 DA");
  assert.equal(hero.expected, "129.000 DA");
});

test("an explicit headline row overrides cheapest (the vietnam two-package case)", () => {
  const trip = base({
    hero: { priceFrom: "180.000 DA" },
    seo: { offerPrice: "180000" },
    tripData: {
      headlineHotelId: "b",
      hotels: [{ id: "a", prices: { double: 129000 } }, { id: "b", prices: { double: 180000 } }],
    },
  });
  const head = headlineDouble(trip);
  assert.equal(head.value, 180000);
  assert.equal(head.source, "headline");
  // The cheaper row exists but must NOT become the advertised price.
  assert.equal(driftOf(trip).length, 0);
});

test("a headlineHotelId naming no row is an error, not a silent fallback", () => {
  const trip = base({ tripData: { headlineHotelId: "ghost", hotels: [{ id: "a", prices: { double: 129000 } }] } });
  const r = deriveValues(trip);
  assert.equal(r.safe, false);
  assert.match(r.derived[0].reason, /matches no row/);
});

test("cards are NOT derived when counts differ (vietnam/KL shape)", () => {
  const r = deriveValues(base({ hotels: [{ priceFrom: "129.000 DA" }] })); // 1 card, 2 rows
  assert.equal(r.derived.some((d) => d.path.startsWith("hotels.")), false);
  assert.match(r.derived.find((d) => d.path === "hotels[].priceFrom").reason, /1 cards vs 2 price rows/);
});

test("cards are NOT derived when priceFrom holds itinerary text (bali shape)", () => {
  const r = deriveValues(base({ hotels: [{ priceFrom: "3 nuits · Kuta" }, { priceFrom: "2 nuits · Ubud" }] }));
  assert.equal(r.derived.some((d) => d.path.startsWith("hotels.")), false);
  assert.match(r.derived.find((d) => d.path === "hotels[].priceFrom").reason, /itinerary text/);
});

test("a card that IS currency and positionally matched gets derived", () => {
  const r = deriveValues(base({ hotels: [{ priceFrom: "129.000 DA" }, { priceFrom: "999.000 DA" }] }));
  const card1 = r.derived.find((d) => d.path === "hotels.1.priceFrom");
  assert.equal(card1.ok, false);
  assert.equal(card1.expected, "180.000 DA");
});

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

test("syncDerivedPrices rewrites each dès token in optionsHtml by hotel id", () => {
  const t = derivableTrip();
  // options carry value="a"/value="b" but in the OPPOSITE order to tripData.hotels
  // rows — an id-based rewrite must give each option ITS OWN row's price.
  t.calcUi = { optionsHtml: '<option value="b">B — dès 999.000 DA</option><option value="a">A — dès 999.000 DA</option>' };
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.calcUi.optionsHtml,
    '<option value="b">B — dès 120.000 DA</option><option value="a">A — dès 100.000 DA</option>');
});

test("syncDerivedPrices leaves an option whose value matches no row unchanged (id-mismatch skip)", () => {
  const t = derivableTrip();
  // one matching option (rewritten) plus one whose value names no priced row (untouched)
  t.calcUi = { optionsHtml: '<option value="a">A — dès 999.000 DA</option><option value="ghost">X — dès 999.000 DA</option>' };
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.calcUi.optionsHtml,
    '<option value="a">A — dès 100.000 DA</option><option value="ghost">X — dès 999.000 DA</option>');
});

test("syncDerivedPrices maps optionsHtml by id, not position (order-divergent)", () => {
  const t = {
    tripData: { hotels: [ { id: "cheap", prices: { double: 100000 } }, { id: "pricey", prices: { double: 200000 } } ] },
    hotels: [ { priceFrom: "100.000 DA" }, { priceFrom: "200.000 DA" } ],
    hero: { priceFrom: "100.000 DA" }, seo: { offerPrice: "100000" },
    // options in the OPPOSITE order to rows, both stale:
    calcUi: { optionsHtml: '<option value="pricey">B — dès 1 DA</option><option value="cheap">A — dès 1 DA</option>' },
  };
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.calcUi.optionsHtml,
    '<option value="pricey">B — dès 200.000 DA</option><option value="cheap">A — dès 100.000 DA</option>');
});

test("syncDerivedPrices does not corrupt tunisie's already-coherent optionsHtml", () => {
  const t = JSON.parse(readFileSync("data/trips/tunisie.json", "utf8"));
  const { trip } = syncDerivedPrices(t);
  assert.equal(trip.calcUi.optionsHtml, t.calcUi.optionsHtml);            // unchanged — no positional swap
});
