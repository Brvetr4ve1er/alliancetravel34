// tools/image-variants.test.mjs
//
// This module is a transcription of what four .tpl files do with string
// .replace(), so the tests that matter most are the ones that compare it
// against the real templates and the real trip data rather than against my
// idea of them. If a template's replace expression is edited and this module is
// not, the first test here fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  heroVariants, hotelVariants, ogVariants, requiredImages,
  shapeError, slotOf, relToSite, SLOTS,
} from "./image-variants.mjs";
import { validateTrip } from "./validate-trip.mjs";

const ROOT = new URL("../", import.meta.url);
const TRIPS = new URL("data/trips/", ROOT);
const SITE = fileURLToPath(new URL("site/", ROOT));
const SLUGS = readdirSync(TRIPS).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
const load = (s) => JSON.parse(readFileSync(new URL(`${s}.json`, TRIPS), "utf8"));
const tpl = (f) => readFileSync(new URL(`tools/templates/sections/${f}`, ROOT), "utf8");

// ── the templates are the specification ────────────────────────────────
test("every image .replace() in the templates is represented here", () => {
  // Collect the literal replace pairs the templates perform, so a new one shows
  // up as a failure rather than as a broken page months later.
  const found = new Set();
  for (const f of ["hero.tpl", "head.tpl", "hotels.tpl"]) {
    for (const m of tpl(f).matchAll(/\.replace\(\s*(?:'([^']*)'|\/([^/]+)\/i?)\s*,\s*'([^']*)'\s*\)/g)) {
      found.add(m[3]);
    }
  }
  // What hero.bg is turned into, per heroVariants.
  const hero = heroVariants("../a/x--bg.jpg").map((v) => v.value.replace("../a/x", ""));
  for (const suffix of found) {
    if (!suffix.startsWith("--bg")) continue;
    assert.ok(hero.includes(suffix), `hero.tpl/head.tpl derive "${suffix}" but heroVariants does not`);
  }
  // The hotel card replaces the extension.
  const hotel = hotelVariants("../a/x.jpg").map((v) => v.value.replace("../a/x", ""));
  for (const ext of [".avif", ".webp"]) {
    assert.ok(found.has(ext), `hotels.tpl no longer derives ${ext} — is this module stale?`);
    assert.ok(hotel.includes(ext));
  }
});

test("the og directory in head.tpl matches SLOTS.og", () => {
  assert.match(tpl("head.tpl"), /assets\/images\/og\/\{\{meta\.ogImage\}\}/);
  assert.equal(SLOTS.og.dir, "assets/images/og");
});

// ── derivation ─────────────────────────────────────────────────────────
test("hero.bg derives six paths, avif optional", () => {
  const v = heroVariants("../assets/images/heroes-v2/hero__x--bg.jpg");
  assert.equal(v.length, 6);
  assert.deepEqual(v.filter((x) => x.optional).map((x) => x.value), [
    "../assets/images/heroes-v2/hero__x--bg.avif",
    "../assets/images/heroes-v2/hero__x--bg--mobile.avif",
  ]);
  // The mobile variants must not be derived off an already-replaced string.
  assert.ok(v.some((x) => x.value.endsWith("--bg--mobile.webp")));
  assert.ok(!v.some((x) => x.value.includes("--bg.webp--mobile")));
});

test("a hero path of the wrong shape derives nothing", () => {
  // This is the whole reason shapeError exists: "photo.jpg" would .replace()
  // into itself, so all six <source>s would point at one non-existent file.
  assert.equal(heroVariants("../assets/images/heroes-v2/photo.jpg"), null);
  assert.match(shapeError("hero.bg", "../assets/images/heroes-v2/photo.jpg"), /--bg\.jpg/);
  assert.equal(shapeError("hero.bg", "../assets/images/heroes-v2/a--bg.jpg"), null);
});

test("ogImage must be a bare filename", () => {
  assert.deepEqual(ogVariants("og-x.jpg"), [{ value: "../assets/images/og/og-x.jpg", optional: false }]);
  assert.equal(ogVariants("../assets/images/og/og-x.jpg"), null);
  assert.match(shapeError("meta.ogImage", "sub/og-x.jpg"), /sans dossier/);
});

test("slotOf maps only the three editable image fields", () => {
  assert.equal(slotOf("hero.bg"), "hero");
  assert.equal(slotOf("meta.ogImage"), "og");
  assert.equal(slotOf("hotels[3].image"), "hotel");
  assert.equal(slotOf("hero.fg"), null);       // dead field, deliberately not a slot
  assert.equal(slotOf("hero.lede"), null);
});

test("relToSite strips however many ../ hops a page needs", () => {
  assert.equal(relToSite("../assets/images/og/a.jpg"), "assets/images/og/a.jpg");
  assert.equal(relToSite("../../assets/images/og/a.jpg"), "assets/images/og/a.jpg");
  assert.equal(relToSite("assets/images/og/a.jpg"), null);
  assert.equal(relToSite("/etc/passwd"), null);
});

// ── against the real repository ────────────────────────────────────────
test("every required image of every trip exists on disk", () => {
  for (const slug of SLUGS) {
    for (const { rel, field, value, optional } of requiredImages(load(slug))) {
      if (optional) continue;
      assert.ok(existsSync(new URL(rel, `file://${SITE.replace(/\\/g, "/")}/`)) || existsSync(`${SITE}${rel}`),
        `${slug} ${field}: ${value} is required by the render but missing`);
    }
  }
});

test("requiredImages covers hero, og and every hotel of a real trip", () => {
  const t = load("azerbaidjan");
  const req = requiredImages(t);
  const fields = new Set(req.map((r) => r.field));
  assert.ok(fields.has("hero.bg"));
  assert.ok(fields.has("meta.ogImage"));
  assert.ok(fields.has("hotels[0].image"));
  assert.equal(req.filter((r) => r.field === "hero.bg").length, 6);
  assert.equal(req.filter((r) => r.field === "meta.ogImage").length, 1);
});

// ── the gate refuses what it exists to refuse ──────────────────────────
// The filename must match data.slug — validateTrip stops at that mismatch, so
// passing "t.json" would hide every image error behind it.
// errors are {file, msg} records; msgs() is what the assertions read.
const msgs = (r) => r.errors.map((e) => (e && e.msg) || String(e));
const validate = (data) => validateTrip(`${data.slug}.json`, data, {
  enabled: true,
  // Pretend every file the real repo has is present, and nothing else.
  imageExists: (rel) => existsSync(`${SITE}${rel}`),
});

test("a hero photo whose .webp sibling is missing is refused", () => {
  const t = load("azerbaidjan");
  // A real, existing hotel photo renamed into hero shape: the file the JSON
  // names does not exist, and neither do its variants.
  t.hero.bg = "../assets/images/heroes-v2/hero__does-not-exist--bg.jpg";
  const errors = msgs(validate(t));
  assert.ok(errors.some((e) => /image/.test(e) && /hero\.bg/.test(e)), errors.join("\n"));
});

test("a hero photo of the wrong shape is refused even though the file exists", () => {
  const t = load("azerbaidjan");
  // This file is real. Its derived siblings can never be.
  t.hero.bg = "../assets/images/hotels/hotel__blend-club.jpg";
  const errors = msgs(validate(t));
  assert.ok(errors.some((e) => /hero\.bg/.test(e) && /--bg\.jpg/.test(e)),
    "shape must be refused: " + errors.join("\n"));
});

test("a missing og image is refused — it was unchecked before", () => {
  const t = load("azerbaidjan");
  t.meta.ogImage = "og-nope.jpg";
  const errors = msgs(validate(t));
  assert.ok(errors.some((e) => /ogImage/.test(e)), errors.join("\n"));
});

test("an unchanged trip passes cleanly", () => {
  for (const slug of SLUGS) {
    const errors = msgs(validate(load(slug)));
    assert.deepEqual(errors, [], `${slug}: ${errors.join("\n")}`);
  }
});

test("one wrong path is reported once, not twice", () => {
  // The generic walk and the precise block both used to see hotels[].image.
  const t = load("azerbaidjan");
  t.hotels[0].image = "../assets/images/hotels/hotel__nope.jpg";
  const errors = msgs(validate(t));
  const about = errors.filter((e) => /hotels\[0\]\.image/.test(e));
  assert.equal(about.length, 1, about.join("\n"));
});

test("the real case: the chosen photo exists but a derived sibling does not", () => {
  // No such file pair exists in the repo today, so it is synthesised: every
  // required file is present EXCEPT the hero's desktop .webp. This is exactly
  // what a hand-added image or a half-finished conversion looks like, and it is
  // the failure <picture> cannot recover from — the browser picks the webp
  // <source>, gets a 404, and shows nothing rather than falling back to jpeg.
  const t = load("azerbaidjan");
  const gone = t.hero.bg.replace("--bg.jpg", "--bg.webp");
  const r = validateTrip("azerbaidjan.json", t, {
    enabled: true,
    imageExists: (rel) => rel !== relToSite(gone) && existsSync(`${SITE}${rel}`),
  });
  const errors = r.errors.map((e) => e.msg);
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], /image incomplète/);
  assert.match(errors[0], /--bg\.webp/);
  assert.match(errors[0], /hero\.bg/);
});

test("a missing AVIF is tolerated — uploads cannot produce one", () => {
  const t = load("azerbaidjan");
  const avif = t.hero.bg.replace("--bg.jpg", "--bg.avif");
  const r = validateTrip("azerbaidjan.json", t, {
    enabled: true,
    imageExists: (rel) => rel !== relToSite(avif) && existsSync(`${SITE}${rel}`),
  });
  assert.deepEqual(r.errors.map((e) => e.msg), []);
});
