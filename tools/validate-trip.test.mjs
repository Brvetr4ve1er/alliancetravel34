import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateTrip } from "./validate-trip.mjs";

const good = JSON.parse(readFileSync(new URL("../data/trips/istanbul.json", import.meta.url), "utf8"));

test("a known-good trip validates with zero errors (images skipped)", () => {
  const { errors } = validateTrip("data/trips/istanbul.json", good, { checkImages: false });
  assert.deepEqual(errors, []);
});

test("a missing required field is reported as an error", () => {
  const bad = structuredClone(good);
  delete bad.meta.title;
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.title")));
});

test("a negative hotel price is reported", () => {
  const bad = structuredClone(good);
  const firstHotelId = Object.keys(bad.tripData.hotels[0].prices)[0];
  bad.tripData.hotels[0].prices[firstHotelId] = -5;
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("prices")));
});

// ── Content-quality bands (the blank-title incident + siblings) ─────────

test("a title blanked to a single space is rejected", () => {
  const bad = structuredClone(good);
  bad.meta.title = " "; // passes isStr (length 1) but trims to nothing — the real incident
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.title")));
});

test("a title clipped to the bare city name (below the SEO floor) is rejected", () => {
  const bad = structuredClone(good);
  bad.meta.title = "Istanbul"; // 8 chars, under the 10-char minimum
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.title")));
});

test("an over-long title (above the SEO ceiling) is rejected", () => {
  const bad = structuredClone(good);
  bad.meta.title = "x".repeat(71); // over the 70-char maximum
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.title")));
});

test("a too-short meta description is rejected", () => {
  const bad = structuredClone(good);
  bad.meta.description = "Trop court."; // under the 50-char minimum
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.description")));
});

test("an over-long meta description is rejected", () => {
  const bad = structuredClone(good);
  bad.meta.description = "x".repeat(201); // over the 200-char maximum
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.description")));
});

test("a hero priceFrom blanked to spaces is rejected", () => {
  const bad = structuredClone(good);
  bad.hero.priceFrom = "   "; // passes isStr, trims to empty
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("hero.priceFrom")));
});

test("a blank seo.offerPrice is rejected", () => {
  const bad = structuredClone(good);
  bad.seo.offerPrice = "";
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("seo.offerPrice")));
});

test("the known-good trip's title and description sit inside the bands", () => {
  // Regression guard: the incident-driven bands must never reject a live trip.
  const { errors } = validateTrip("data/trips/istanbul.json", good, { checkImages: false });
  assert.ok(!errors.some(e => e.msg.includes("meta.title")));
  assert.ok(!errors.some(e => e.msg.includes("meta.description")));
});
