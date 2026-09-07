// api/list-images.test.mjs
//
// candidates() is pure and takes the repository tree as a Set, so the cases that
// matter can be built by hand: a half-converted image, a stray mobile variant,
// a photo in the wrong directory. None of those exist in the real repo today,
// and the picker's whole job is to never offer one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { candidates } from "./list-images.mjs";
import { requiredImages } from "../tools/image-variants.mjs";

const TRIPS = new URL("../data/trips/", import.meta.url);
const SLUGS = readdirSync(TRIPS).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const load = (s) => JSON.parse(readFileSync(new URL(`${s}.json`, TRIPS), "utf8"));

/** A tree containing one complete hero set. */
function heroSet(name) {
  return [".jpg", ".webp", ".avif"].flatMap((ext) => [
    `site/assets/images/heroes-v2/${name}--bg${ext}`,
    `site/assets/images/heroes-v2/${name}--bg--mobile${ext}`,
  ]);
}
function hotelSet(name) {
  return [".jpg", ".webp", ".avif"].map((ext) => `site/assets/images/hotels/${name}${ext}`);
}

test("a complete hero set is offered, with the exact value the JSON must hold", () => {
  const got = candidates("hero", new Set(heroSet("hero__baku")));
  assert.equal(got.length, 1);
  assert.equal(got[0].value, "../assets/images/heroes-v2/hero__baku--bg.jpg");
  assert.equal(got[0].thumb, "/assets/images/heroes-v2/hero__baku--bg.jpg");
  assert.equal(got[0].label, "baku");
});

test("the emitted value keeps the ../ prefix the build and the gate both require", () => {
  // langpage.mjs rewrites "../" to "/" for /en/ and /ar/; validate-trip's image
  // check only matches values starting with "../". A bare "assets/…" would break
  // the French page and silently disable the guard.
  for (const c of candidates("hero", new Set(heroSet("hero__x")))) {
    assert.ok(c.value.startsWith("../assets/images/"), c.value);
  }
  for (const c of candidates("hotel", new Set(hotelSet("hotel__y")))) {
    assert.ok(c.value.startsWith("../assets/images/"), c.value);
  }
});

test("an image missing one required variant is never offered", () => {
  // The .webp is gone. The .jpg is perfectly real, and a naive picker that
  // listed the directory would offer it — publishing a page whose webp <source>
  // 404s, which <picture> does not recover from.
  const paths = new Set(heroSet("hero__baku").filter((p) => !p.endsWith("--bg.webp")));
  assert.deepEqual(candidates("hero", paths), []);
});

test("a missing AVIF does not disqualify an image", () => {
  const paths = new Set(heroSet("hero__baku").filter((p) => !p.includes(".avif")));
  assert.equal(candidates("hero", paths).length, 1);
});

test("mobile variants are not offered as heroes in their own right", () => {
  // "hero__x--bg--mobile.jpg" ends in the slot suffix by accident. Choosing it
  // would derive "hero__x--bg--mobile.jpg--bg.webp" — a path that cannot exist.
  const got = candidates("hero", new Set(heroSet("hero__x")));
  assert.equal(got.length, 1);
  assert.ok(!got[0].value.includes("--mobile"));
});

test("each slot sees only its own directory", () => {
  const paths = new Set([...heroSet("hero__a"), ...hotelSet("hotel__b"), "site/assets/images/og/og-c.jpg"]);
  assert.deepEqual(candidates("hero", paths).map((c) => c.file), ["hero__a--bg.jpg"]);
  assert.deepEqual(candidates("hotel", paths).map((c) => c.file), ["hotel__b.jpg"]);
  assert.deepEqual(candidates("og", paths).map((c) => c.file), ["og-c.jpg"]);
});

test("og entries are bare filenames, because head.tpl supplies the directory", () => {
  const got = candidates("og", new Set(["site/assets/images/og/og-istanbul.jpg"]));
  assert.equal(got[0].value, "og-istanbul.jpg");
  assert.equal(got[0].thumb, "/assets/images/og/og-istanbul.jpg");
});

test("the old heroes/ directory is never offered", () => {
  // site/index.html and hero-collage-lazy.js use assets/images/heroes/ with a
  // different naming convention and no --bg suffix. Offering one for a trip hero
  // would derive paths that do not exist.
  const paths = new Set(["site/assets/images/heroes/hero__istanbul.jpg", "site/assets/images/heroes/hero__istanbul.webp"]);
  for (const slot of ["hero", "hotel", "og"]) assert.deepEqual(candidates(slot, paths), []);
});

test("nested paths and lookalikes outside the slot dirs are ignored", () => {
  const paths = new Set([
    "site/assets/images/heroes-v2/sub/hero__x--bg.jpg",
    "site/assets/images/heroes-v2xx/hero__y--bg.jpg",
    "docs/heroes-v2/hero__z--bg.jpg",
  ]);
  assert.deepEqual(candidates("hero", paths), []);
});

test("every photo the seven trips already use is offerable", () => {
  // The strongest check available: build the tree from what the trips require,
  // and confirm the picker would offer back exactly what is in use. If it would
  // not, the owner opening the editor sees their own current photo missing from
  // the list.
  const paths = new Set();
  for (const slug of SLUGS) for (const r of requiredImages(load(slug))) paths.add(`site/${r.rel}`);
  const offered = {
    hero: new Set(candidates("hero", paths).map((c) => c.value)),
    hotel: new Set(candidates("hotel", paths).map((c) => c.value)),
    og: new Set(candidates("og", paths).map((c) => c.value)),
  };
  for (const slug of SLUGS) {
    const t = load(slug);
    assert.ok(offered.hero.has(t.hero.bg), `${slug}: hero ${t.hero.bg} not offered`);
    assert.ok(offered.og.has(t.meta.ogImage), `${slug}: og ${t.meta.ogImage} not offered`);
    for (const h of t.hotels) assert.ok(offered.hotel.has(h.image), `${slug}: hotel ${h.image} not offered`);
  }
});

test("results are sorted, so the list does not reshuffle between openings", () => {
  const paths = new Set([...heroSet("hero__zanzibar"), ...heroSet("hero__baku"), ...heroSet("hero__marrakech")]);
  assert.deepEqual(candidates("hero", paths).map((c) => c.label), ["baku", "marrakech", "zanzibar"]);
});
