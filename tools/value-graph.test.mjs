import { test } from "node:test";
import assert from "node:assert/strict";
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
