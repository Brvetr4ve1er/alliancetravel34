import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateTrip } from "./validate-trip.mjs";
import { decodeNumericEntities, normalizeForSchemeCheck } from "./validate-trip.mjs";

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

// ── Executable markup (the stored-XSS incident, found 2026-09-24) ────────
//
// The javascript:/data:text/html rules used to test the RAW string. A value
// bound for href="" is decoded by the BROWSER's own attribute-value parser
// before it reads the scheme — HTML character references resolve, and ASCII
// tab/CR/LF vanish — so `&#106;avascript:` and `jav\tascript:` both reached
// production as zero-error content and executed on click, on the same trip
// page as the passport-collecting booking form. This is the test that would
// have caught it; there was none before.
function rejects(field, value) {
  const bad = structuredClone(good);
  bad.faq[0].answerHtml = value;
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  return errors.some((e) => e.msg.includes(field));
}

test("an entity-encoded javascript: URL is rejected (the confirmed bypass)", () => {
  assert.ok(rejects("faq[0].answerHtml", '<a href="&#106;avascript:alert(1)">clic</a>'));
});

test("a tab-obfuscated javascript: URL is rejected (the confirmed bypass)", () => {
  assert.ok(rejects("faq[0].answerHtml", '<a href="jav\tascript:alert(1)">clic</a>'));
});

test("a hex-entity-encoded javascript: URL is rejected", () => {
  assert.ok(rejects("faq[0].answerHtml", '<a href="&#x6a;avascript:alert(1)">clic</a>'));
});

test("an entity-encoded colon in javascript: is rejected", () => {
  assert.ok(rejects("faq[0].answerHtml", '<a href="javascript&#58;alert(1)">clic</a>'));
});

test("a plain, unobfuscated javascript: URL is still rejected", () => {
  assert.ok(rejects("faq[0].answerHtml", '<a href="javascript:alert(1)">clic</a>'));
});

test("entity-obfuscated data:text/html is rejected — the same bypass class on the sibling rule", () => {
  assert.ok(rejects("faq[0].answerHtml", '<a href="d&#97;ta:text/html,alert(1)">clic</a>'));
});

test("legitimate <strong>/<em> formatting is never rejected", () => {
  assert.ok(!rejects("faq[0].answerHtml", "Vol <strong>Turkish Airlines</strong> et <em>transferts</em> inclus."));
});

test("a real inline <svg> icon is never rejected", () => {
  const svg = good.highlights[0].iconSvg;
  assert.ok(isNonEmpty(svg), "fixture assumption: istanbul's first highlight carries an iconSvg");
  assert.ok(!rejects("faq[0].answerHtml", svg));
});
function isNonEmpty(v) { return typeof v === "string" && v.length > 0; }

test("normalizeForSchemeCheck matches what a browser's attribute parser actually does", () => {
  assert.equal(decodeNumericEntities("&#106;avascript"), "javascript");
  assert.equal(decodeNumericEntities("&#x6a;avascript"), "javascript");
  assert.equal(decodeNumericEntities("javascript&#58;"), "javascript:");
  assert.equal(normalizeForSchemeCheck("jav\tascript:"), "javascript:");
  assert.equal(normalizeForSchemeCheck("jav\r\nascript:"), "javascript:");
  // A no-op on plain text — must not mangle ordinary content.
  assert.equal(normalizeForSchemeCheck("Vol Turkish Airlines inclus"), "Vol Turkish Airlines inclus");
});
