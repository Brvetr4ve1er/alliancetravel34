// tools/check-rendered-page.test.mjs
//
// The end-to-end test here is the important one: it runs the EXACT chain
// api/save-trip.mjs runs, over the edits a widened editor makes reachable, and
// asserts which are refused. It exists because of a measured incident class —
// an edit that every save-time check accepted and the next build rejected,
// leaving the owner with "Publié ✓" and a site that had silently stopped
// updating.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkRenderedPage } from "./check-rendered-page.mjs";
import { validateTrip } from "./validate-trip.mjs";
import { renderTrip } from "./templates/trip2.mjs";
import { syncDerivedPrices } from "./value-graph.mjs";

const TRIP_PATH = new URL("../data/trips/azerbaidjan.json", import.meta.url);
const base = JSON.parse(readFileSync(TRIP_PATH, "utf8"));
const clone = () => structuredClone(base);

// ── The module on its own ──────────────────────────────────────────────
test("clean HTML yields no problems", () => {
  assert.deepEqual(checkRenderedPage('<h1 data-i18n="k1">Bonjour</h1><p data-i18n="k2">Salut</p>'), []);
  assert.deepEqual(checkRenderedPage(""), []);
  assert.deepEqual(checkRenderedPage(null), []);
});

test("gate C: a binding with empty French is reported once per key", () => {
  const out = checkRenderedPage('<h1 data-i18n="k1"></h1><p data-i18n="k1">   </p><b data-i18n="k2">ok</b>');
  assert.equal(out.length, 1);
  assert.match(out[0], /"k1".*texte français vide/);
});

test("gate C: whitespace-only counts as empty", () => {
  assert.equal(checkRenderedPage('<p data-i18n="k">\n\t  </p>').length, 1);
});

test("gate A: one key, two different French strings", () => {
  const out = checkRenderedPage('<p data-i18n="k">Un</p><p data-i18n="k">Deux</p>');
  assert.equal(out.length, 1);
  assert.match(out[0], /deux textes français différents/);
  // The two rival strings are quoted, because "which two?" is the first thing
  // anyone asks and the answer is not otherwise visible.
  assert.match(out[0], /"Un"/);
  assert.match(out[0], /"Deux"/);
});

test("gate A: the SAME French twice is legitimate and not reported", () => {
  // A price repeated in the sticky bar is a real pattern on these pages.
  assert.deepEqual(checkRenderedPage('<p data-i18n="k">249.900 DA</p><b data-i18n="k">249.900 DA</b>'), []);
});

test("a key clash is reported once, not once per repetition", () => {
  const out = checkRenderedPage('<p data-i18n="k">A</p><p data-i18n="k">B</p><p data-i18n="k">C</p>');
  assert.equal(out.length, 1);
});

// ── The chain api/save-trip.mjs actually runs ──────────────────────────
function saveTripChain(trip) {
  const { errors } = validateTrip("data/trips/azerbaidjan.json", trip, { enabled: false });
  if (errors.length) return { rejected: true, why: errors.map((e) => e.msg) };
  const synced = syncDerivedPrices(trip).trip;
  let html;
  try { html = renderTrip(synced); }
  catch (e) { return { rejected: true, why: [`rendu impossible: ${e.message}`] }; }
  const problems = checkRenderedPage(html);
  return problems.length ? { rejected: true, why: problems } : { rejected: false, why: [] };
}

test("a live trip passes the whole chain untouched", () => {
  const r = saveTripChain(clone());
  assert.equal(r.rejected, false, r.why.join(" | "));
});

// Each entry is an edit the owner can make through the dashboard. `expect` is
// the substring that must appear in the refusal — a refusal for the wrong
// reason is not a pass.
const MUST_REFUSE = [
  ["a blanked FAQ question", (t) => { t.faq[0].question = ""; }, /texte français vide/],
  ["a blanked hero lede", (t) => { t.hero.lede = "   "; }, /texte français vide/],
  ["a blanked itinerary day title", (t) => { t.itinerary.days[1].title = ""; }, /texte français vide/],
  ["two FAQ items sharing one key", (t) => { t.faq[1].kBtn = t.faq[0].kBtn; }, /deux textes français différents/],
  ["a <script> in an answer", (t) => { t.faq[0].answerHtml += '<script>fetch("//evil")</script>'; }, /<script>/],
  ["an onerror handler in a highlight", (t) => { t.highlights[0].body = "<img src=x onerror=alert(1)>"; }, /gestionnaire d'événement/],
  ["an <iframe> in an info block", (t) => { t.infoBlocks[0].body = "<iframe src=//evil></iframe>"; }, /<iframe>/],
  ["a javascript: URL", (t) => { t.finalCta.actionsHtml = '<a href="javascript:alert(1)">x</a> wa.me/213'; }, /javascript:/],
  ["an emptied date list", (t) => { t.tripData.dates = []; }, /dates/],
  ["an emptied date-chip list", (t) => { t.calcUi.dateChips = []; }, /dateChips/],
  ["a fractional price", (t) => { t.tripData.hotels[0].prices.double = 249900.5; }, /prices/],
];

for (const [name, mutate, expect] of MUST_REFUSE) {
  test(`refused before commit: ${name}`, () => {
    const trip = clone();
    mutate(trip);
    const r = saveTripChain(trip);
    assert.equal(r.rejected, true, `${name} was ACCEPTED — it would break the next build`);
    assert.ok(r.why.some((m) => expect.test(m)), `refused, but for the wrong reason: ${r.why.join(" | ")}`);
  });
}

// The other half of the contract: the guard must not refuse ordinary editing.
// A rule that blocks real work gets worked around, and the workaround is the
// raw-JSON panel.
const MUST_ACCEPT = [
  ["<strong> in an answer", (t) => { t.faq[0].answerHtml = "Oui, <strong>inclus</strong> dans le prix."; }],
  ["<em> in a section title", (t) => { t.itinerary.titleHtml = "Votre <em>programme</em> jour par jour"; }],
  ["the word 'onload' in prose", (t) => { t.faq[0].answerHtml = "Le mot onload apparaît ici, sans danger."; }],
  ["an ampersand in the H1", (t) => { t.hero.h1Em = "Bakou & Gabala & plus"; }],
  ["a new FAQ item with a fresh key", (t) => {
    t.faq.push({
      open: false, aosDelay: 60,
      kBtn: ' data-i18n="azFaqQ9"', kQ: "", question: "Puis-je payer en plusieurs fois ?",
      kA: ' data-i18n-html="azFaqA9"', answerHtml: "Oui, <strong>en trois versements</strong>.",
    });
    t.seo.faqJsonLd.push({ name: "Puis-je payer en plusieurs fois ?", text: "Oui, en trois versements." });
  }],
  ["a new departure date", (t) => {
    t.tripData.dates.push("02 – 10 Octobre 2026");
    t.calcUi.dateChips.push({ active: false, value: "02 – 10 Octobre 2026", k: "", label: "2–10 Oct 2026" });
  }],
];

for (const [name, mutate] of MUST_ACCEPT) {
  test(`still allowed: ${name}`, () => {
    const trip = clone();
    mutate(trip);
    const r = saveTripChain(trip);
    assert.equal(r.rejected, false, `legitimate edit refused: ${r.why.join(" | ")}`);
  });
}
