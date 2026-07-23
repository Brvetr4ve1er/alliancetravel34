import { test } from "node:test";
import assert from "node:assert/strict";
import { extractBindings, frHash, buildManifest } from "./i18n-manifest.mjs";

test("extracts plain and html bindings with their French text", () => {
  const html = `<p data-i18n="xHero">Bonjour</p><h1 data-i18n-html="xTitle">Ville <em>2026</em></h1>`;
  const b = extractBindings(html);
  assert.deepEqual(b, [
    { key: "xHero", fr: "Bonjour", isHtml: false },
    { key: "xTitle", fr: "Ville <em>2026</em>", isHtml: true },
  ]);
});

test("ignores attributes that are not bindings and survives nesting", () => {
  const html = `<div class="x"><span data-track-event="a">no</span><span data-i18n="k">oui</span></div>`;
  assert.deepEqual(extractBindings(html).map((x) => x.key), ["k"]);
});

test("frHash is stable and changes with the text", () => {
  assert.equal(frHash("Bonjour"), frHash("Bonjour"));
  assert.notEqual(frHash("Bonjour"), frHash("Bonjour "));
});

test("buildManifest marks stale, missing and shared keys", () => {
  const html = `<p data-i18n="xA">Un</p><p data-i18n="xB">Deux</p><p data-i18n="nav.skip">Aller</p>`;
  const trip = { i18n: { en: { xA: "One", xB: "Two" }, ar: { xA: "واحد" } },
                 i18nHash: { en: { xA: frHash("Un") }, ar: {} } };
  const m = buildManifest({ slug: "t", html, trip, sharedKeys: new Set(["nav.skip"]) });
  assert.equal(m.keys.xA.enState, "ok");       // hash matches current FR
  assert.equal(m.keys.xB.enState, "stale");    // has EN but no/old hash
  assert.equal(m.keys.xA.arState, "stale");    // AR exists, no hash
  assert.equal(m.keys.xB.arState, "missing");  // no AR at all
  assert.equal(m.keys["nav.skip"].scope, "shared");
  assert.equal(m.coverage.en, 100); // both trip keys HAVE English (xB is stale, not missing)
  assert.equal(m.coverage.ar, 50);  // xA has Arabic, xB has none
});
