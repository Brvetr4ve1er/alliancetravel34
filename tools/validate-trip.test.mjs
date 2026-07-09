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
