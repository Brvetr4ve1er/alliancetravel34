// site/admin/save-errors.test.mjs
//
// The point of this suite is that it does NOT invent the refusal strings.
//
// save-errors.js exists to recognise what api/save-trip.mjs says when it says
// no. A suite built from hand-written fixtures would only prove the explainer
// recognises strings I typed out of the same assumption I wrote the parser
// with — and that assumption has already been wrong once here: the k* fields in
// a trip file hold ` data-i18n="istFaqQ1"`, a whole attribute fragment, not the
// bare key, so the obvious `=== key` lookup resolves nothing and every test
// written against a fixture of `"istFaqQ1"` would have passed anyway.
//
// So: break real trips in the ways an owner actually breaks them, run the REAL
// gate chain in the REAL order save-trip.mjs runs it, and assert on whatever
// comes out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { validateTrip } from "../../tools/validate-trip.mjs";
import { renderTrip } from "../../tools/templates/trip2.mjs";
import { syncDerivedPrices, driftOf } from "../../tools/value-graph.mjs";
import { checkRenderedPage } from "../../tools/check-rendered-page.mjs";
import { FIELDS } from "./fields.js";
import { LIST_SPECS } from "./edit-lists.js";
import {
  explainLine, explainStatus, extractPath, extractI18nKey,
  findKeyPath, pathCandidates, makeLabelFor, soleEmptyField, EXTRA_LABELS,
} from "./save-errors.js";

const TRIPS_DIR = new URL("../../data/trips/", import.meta.url);
const SLUGS = readdirSync(TRIPS_DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const load = (slug) => JSON.parse(readFileSync(new URL(`${slug}.json`, TRIPS_DIR), "utf8"));

// The dashboard's own resolver, with the dashboard's own specs. `t` returns the
// key, so an assertion can name "pages.list.faq" without depending on the French.
const labelFor = makeLabelFor({ fields: FIELDS, lists: LIST_SPECS, t: (k) => k });

/**
 * Every refusal api/save-trip.mjs would produce for this content, in its order:
 * schema → derived prices → render → i18n gates → price coherence.
 */
function refusalsFor(content, slug) {
  const { errors } = validateTrip(`data/trips/${slug}.json`, content, { enabled: true, imageExists: null });
  if (errors.length) return errors.map((e) => e.msg);

  const synced = syncDerivedPrices(content).trip;
  let html;
  try { html = renderTrip(synced); }
  catch (e) { return [`rendu impossible: ${e.message}`]; }

  const pageProblems = checkRenderedPage(html);
  if (pageProblems.length) return pageProblems;

  return driftOf(synced).map((d) =>
    d.expected == null
      ? `prix: ${d.reason}`
      : `prix incohérent: "${d.path}" affiche ${JSON.stringify(d.current)} ` +
        `mais devrait être ${JSON.stringify(d.expected)} — ${d.reason}`);
}

const broken = (slug, mutate) => { const c = load(slug); mutate(c); return c; };

// The ways an owner actually breaks a page: clearing a box, emptying a list,
// wiping a price. Each is a real control in the dashboard.
const BREAKAGES = [
  ["an emptied hero intro", (c) => { c.hero.lede = ""; }],
  ["an emptied SEO description", (c) => { c.meta.description = ""; }],
  ["an emptied FAQ answer", (c) => { c.faq[0].answerHtml = ""; }],
  ["an emptied FAQ question", (c) => { c.faq[0].question = ""; }],
  ["an emptied highlight title", (c) => { c.highlights[0].title = ""; }],
  ["an emptied itinerary day title", (c) => { c.itinerary.days[1].title = ""; }],
  ["an emptied inclusion", (c) => { c.inclus.included[0].t = ""; }],
  ["an emptied testimonial", (c) => { c.trust.testimonials[0].text = ""; }],
  ["a hotel card with no name", (c) => { c.hotels[0].name = ""; }],
  ["a wiped price in the grid", (c) => { c.tripData.hotels[0].prices.double = null; }],
  ["no departures at all", (c) => { c.tripData.dates = []; c.calcUi.dateChips = []; }],
  ["an emptied final call to action", (c) => { c.finalCta.titleHtml = ""; }],
];

test("every breakage is actually refused — otherwise this suite proves nothing", () => {
  for (const [what, mutate] of BREAKAGES) {
    const out = refusalsFor(broken("istanbul", mutate), "istanbul");
    assert.ok(out.length > 0, `${what} was accepted; the fixture no longer breaks anything`);
  }
});

test("every refusal a real breakage produces resolves to a control the owner can see", () => {
  const unresolved = [];
  let checked = 0;
  for (const slug of SLUGS) {
    for (const [what, mutate] of BREAKAGES) {
      let content;
      // Trips differ in shape (not all have the same list lengths), so a
      // breakage that cannot be applied is skipped rather than faked.
      try { content = broken(slug, mutate); } catch { continue; }
      for (const raw of refusalsFor(content, slug)) {
        checked++;
        const ex = explainLine(raw, { labelFor, content, fields: FIELDS });
        // A "rendu impossible" is deliberately label-less: it is a JS error, and
        // explainLine answers it with a sentence plus a folded technical detail.
        if (!ex.label && !ex.detail) unresolved.push(`${slug} / ${what}: ${raw}`);
      }
    }
  }
  // Guard against the whole loop silently not running — the failure mode that
  // let a green i18n test ship while its regex matched nothing.
  assert.ok(checked >= 40, `only ${checked} refusals were examined; the fixtures stopped breaking`);
  assert.deepEqual(unresolved, [], "these refusals would reach the owner as a raw JSON path");
});

test("an emptied FAQ question names the FAQ and its row, not the translation key", () => {
  // The documented real-world incident: blanking faq[0].question passed every
  // other gate, was committed under a green "Publié ✓", and killed the next
  // build with `clé i18n "azFaqQ1": texte français vide`. The owner had no way
  // to connect that key to anything on their screen.
  const content = broken("azerbaidjan", (c) => { c.faq[0].question = ""; });
  const raws = refusalsFor(content, "azerbaidjan");
  const i18nLine = raws.find((r) => /clé i18n/.test(r));
  assert.ok(i18nLine, `expected an i18n refusal, got: ${JSON.stringify(raws)}`);

  const ex = explainLine(i18nLine, { labelFor, content, fields: FIELDS });
  assert.equal(ex.label, "pages.list.faq", "the list the owner was editing");
  assert.equal(ex.row, 1, "…and which row of it");
  assert.match(ex.text, /ne peut pas rester vide/);
  assert.equal(ex.detail, null, "resolved, so the raw key is not also dumped on them");
});

test("a wiped price points at the price grid, climbing past paths with no input", () => {
  const content = broken("istanbul", (c) => { c.tripData.hotels[0].prices.double = null; });
  const raws = refusalsFor(content, "istanbul");
  const ex = explainLine(raws[0], { labelFor, content, fields: FIELDS });
  assert.equal(ex.label, EXTRA_LABELS["tripData.hotels"]);
  assert.doesNotMatch(ex.text, /^tripData/, "the path is replaced by the label, not repeated");
});

test("a flat field is named by the label printed above its box", () => {
  const content = broken("istanbul", (c) => { c.hero.lede = ""; });
  const ex = explainLine(refusalsFor(content, "istanbul")[0], { labelFor, content, fields: FIELDS });
  assert.equal(ex.label, "Hero — texte d'introduction",
    "reached through the cleared-box fallback: the key istHeroLede is template-derived "
    + "and stored nowhere in the content");
  assert.equal(ex.path, "hero.lede", "…and keeps the path, so the name can be clicked");
});

test("a render crash becomes one plain sentence with the stack folded away", () => {
  const ex = explainLine("rendu impossible: Cannot read properties of undefined (reading 'map')", {});
  assert.match(ex.text, /n'a pas pu être fabriquée/);
  assert.doesNotMatch(ex.text, /undefined/, "no JavaScript in the sentence the owner reads");
  assert.equal(ex.detail, "Cannot read properties of undefined (reading 'map')");
});

test("an unrecognised refusal is passed through, never swallowed", () => {
  const ex = explainLine("quelque chose d'entièrement nouveau", { labelFor });
  assert.equal(ex.text, "quelque chose d'entièrement nouveau");
  assert.equal(ex.label, null);
});

// ── the parsers, at their edges ──────────────────────────────────────────

test("extractPath takes a path but not a quoted value", () => {
  assert.equal(extractPath("hero.lede: contenu trop court"), "hero.lede");
  assert.equal(extractPath("tripData.hotels[2].prices.double = null"), "tripData.hotels[2].prices.double");
  assert.equal(extractPath(`prix incohérent: "hotels[0].priceMeta" affiche X`), "hotels[0].priceMeta");
  // A bare word is a sentence, not a field: `prix: …` must not resolve to a
  // field called "prix".
  assert.equal(extractPath("prix: la grille ne permet pas de conclure"), null);
  assert.equal(extractPath(`slug "istanbul" ≠ nom du fichier "bali"`), null);
});

test("findKeyPath reads the attribute fragment the trip files really store", () => {
  const istanbul = load("istanbul");
  // Taken from the file itself rather than typed here, so this cannot drift
  // away from the real key shape.
  const attr = istanbul.faq[0].kQ;
  const key = /data-i18n(?:-html)?="([^"]+)"/.exec(attr)[1];
  assert.equal(findKeyPath(istanbul, key), "faq[0].kQ");
  assert.equal(findKeyPath(istanbul, "a-key-that-is-in-no-trip"), null);
});

test("findKeyPath finds a key in every list that carries one", () => {
  const istanbul = load("istanbul");
  const cases = [
    ["faq[0].kA", istanbul.faq[0].kA],
    ["highlights[0].kTitle", istanbul.highlights[0].kTitle],
    ["calcUi.dateChips[0].k", istanbul.calcUi.dateChips[0].k],
    ["inclus.included[0].k", istanbul.inclus.included[0].k],
  ];
  for (const [expected, attr] of cases) {
    const key = /data-i18n(?:-html)?="([^"]+)"/.exec(attr)[1];
    assert.equal(findKeyPath(istanbul, key), expected, `key ${key}`);
  }
});

test("findKeyPath is bounded, so a pathological document cannot freeze the editor", () => {
  let deep = { k: "leaf" };
  for (let i = 0; i < 500; i++) deep = { nested: deep };
  assert.equal(findKeyPath(deep, "nothing-here", 50), null);
});

test("pathCandidates broadens from the exact path up to its root", () => {
  assert.deepEqual(pathCandidates("tripData.hotels[2].prices.double"), [
    "tripData.hotels[2].prices.double",
    "tripData.hotels[2].prices",
    "tripData.hotels[2]",
    "tripData.hotels",
    "tripData",
  ]);
  assert.deepEqual(pathCandidates("hero"), ["hero"]);
});

test("extractI18nKey reads the key out of both i18n gate messages", () => {
  assert.equal(extractI18nKey(`clé i18n "azFaqQ1": texte français vide — ce champ…`), "azFaqQ1");
  assert.equal(extractI18nKey(`clé i18n "x1" liée à deux textes français différents — …`), "x1");
  assert.equal(extractI18nKey("hero.lede: contenu trop court"), null);
});

// ── status codes ─────────────────────────────────────────────────────────

test("every status the API can return has a sentence, and 401 offers a way out", () => {
  // The statuses api/save-trip.mjs and its libs actually produce.
  for (const status of [400, 401, 403, 404, 405, 413, 422, 429, 500, 502]) {
    const ex = explainStatus(status, { error: "something" });
    assert.ok(ex.key.startsWith("pages.err."), `${status} → ${ex.key}`);
  }
  assert.equal(explainStatus(401, {}).action, "reconnect",
    "an expired session is the one failure the owner can fix themselves, in one click");
  assert.equal(explainStatus(403, {}).action, null, "…but a missing allowlist entry is not");
});

test("the two 502s are distinguished by their server text", () => {
  assert.equal(explainStatus(502, { error: "github unreachable" }).key, "pages.err.502github");
  assert.equal(explainStatus(502, { error: "auth server unreachable" }).key, "pages.err.502auth");
  assert.equal(explainStatus(502, { error: "" }).key, "pages.err.502");
});

test("an unmapped status keeps its raw text as a folded detail", () => {
  const ex = explainStatus(418, { error: "i am a teapot" });
  assert.equal(ex.key, "pages.err.unknown");
  assert.equal(ex.params.status, "418");
  assert.equal(ex.detail, "i am a teapot");
});

test("soleEmptyField names the cleared box, and refuses to guess between two", () => {
  const base = load("istanbul");
  assert.equal(soleEmptyField(base, FIELDS), null, "an intact trip has no cleared box");

  const one = broken("istanbul", (c) => { c.hero.lede = ""; });
  assert.equal(soleEmptyField(one, FIELDS), "hero.lede");

  // Two empties and one key: naming either would be a coin flip, and naming the
  // wrong field sends the owner to edit something that was never the problem.
  const two = broken("istanbul", (c) => { c.hero.lede = ""; c.hero.fineprint = ""; });
  assert.equal(soleEmptyField(two, FIELDS), null);
});

test("two cleared boxes still refuse legibly, just without pointing at one", () => {
  const content = broken("istanbul", (c) => { c.hero.lede = ""; c.finalCta.sub = ""; });
  const raws = refusalsFor(content, "istanbul").filter((r) => /clé i18n/.test(r));
  assert.ok(raws.length >= 1);
  for (const raw of raws) {
    const ex = explainLine(raw, { labelFor, content, fields: FIELDS });
    assert.match(ex.text, /ne peut pas rester vide/, "the owner still learns what is wrong");
    assert.ok(ex.detail, "…and keeps the key, which is the only handle left");
  }
});

test("the price-grid refusal does not render as an orphan '='", () => {
  // Measured in a browser: "Grille tarifaire du calculateur — = null (…)".
  const ex = explainLine("tripData.hotels[2].prices.double = null (attendu: entier en DA, ex: 129000)",
    { labelFor });
  assert.equal(ex.label, EXTRA_LABELS["tripData.hotels"]);
  assert.equal(ex.text, "null (attendu: entier en DA, ex: 129000)");
});
