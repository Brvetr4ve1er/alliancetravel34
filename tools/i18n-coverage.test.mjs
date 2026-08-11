// Coverage has to be true, because it is the number a human reads to decide
// whether a language is ready to publish. It used to report 100 % while 26 keys
// per trip sat at state "missing": shared keys (nav.*, footer.*, heroFrom…) are
// translated once in site/assets/js/i18n.js and never in a trip's i18n block, so
// measuring them against the trip block declared every one of them untranslated,
// and the headline figure hid that by counting trip-scope keys only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildManifest, frHash } from "./i18n-manifest.mjs";

const html =
  `<p data-i18n="xA">Un</p><p data-i18n="xB">Deux</p>` +
  `<p data-i18n="nav.skip">Aller au contenu</p><p data-i18n="heroFrom">À partir de</p>`;
const sharedKeys = new Set(["nav.skip", "heroFrom"]);
const trip = {
  i18n: { en: { xA: "One", xB: "Two" }, ar: { xA: "واحد", xB: "اثنان" } },
  i18nHash: { en: { xA: frHash("Un"), xB: frHash("Deux") },
              ar: { xA: frHash("Un"), xB: frHash("Deux") } },
};
const sharedDict = {
  en: { nav: { skip: "Skip to content" }, heroFrom: "From" },
  ar: { nav: { skip: "تخطَّ إلى المحتوى" }, heroFrom: "ابتداءً من" },
};

test("a shared key translated in the sitewide dictionary is 'global', not 'missing'", () => {
  const m = buildManifest({ slug: "t", html, trip, sharedKeys, sharedDict });
  assert.equal(m.keys["nav.skip"].scope, "shared");
  assert.equal(m.keys["nav.skip"].enState, "global");
  assert.equal(m.keys["nav.skip"].arState, "global");
  assert.equal(m.keys["nav.skip"].en, "Skip to content");
  assert.equal(m.keys.heroFrom.arState, "global");
});

test("the page-wide figure counts every bound key, shared ones included", () => {
  const m = buildManifest({ slug: "t", html, trip, sharedKeys, sharedDict });
  assert.deepEqual(m.coverage, { en: 100, ar: 100 });      // trip-scope, unchanged
  assert.deepEqual(m.coveragePage, { en: 100, ar: 100 });  // whole key set
  assert.equal(m.counts.total, 4);
  assert.equal(m.counts.trip, 2);
  assert.equal(m.counts.shared, 2);
});

test("a shared key absent from the sitewide dictionary drags the page figure down", () => {
  const m = buildManifest({
    slug: "t", html, trip, sharedKeys,
    sharedDict: { en: { heroFrom: "From" }, ar: {} }, // nav.skip untranslated, ar empty
  });
  assert.equal(m.keys["nav.skip"].enState, "missing");
  assert.equal(m.keys.heroFrom.enState, "global");
  assert.equal(m.coverage.en, 100);      // the trip's own keys are all translated…
  assert.equal(m.coveragePage.en, 75);   // …but a quarter of the page is not
  assert.equal(m.coveragePage.ar, 50);   // both shared keys missing in Arabic
  assert.equal(m.counts.ar.missing, 2);
  assert.equal(m.counts.en.global, 1);
});

test("an untranslated trip key is missing in both figures", () => {
  const m = buildManifest({
    slug: "t", html, trip: { i18n: { en: { xA: "One" } } }, sharedKeys, sharedDict,
  });
  assert.equal(m.keys.xB.enState, "missing");
  assert.equal(m.coverage.en, 50);
  assert.equal(m.coveragePage.en, 75);
  assert.equal(m.coverage.ar, 0);
  assert.equal(m.coveragePage.ar, 50);
});

test("without a sitewide dictionary the shared keys are reported unknown-as-missing, never as translated", () => {
  const m = buildManifest({ slug: "t", html, trip, sharedKeys });
  assert.equal(m.keys["nav.skip"].enState, "missing");
  assert.equal(m.coverage.en, 100);
  assert.equal(m.coveragePage.en, 50);
});
