// tools/static-page.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { renderStaticVariant, resolverFor, missingKeys, urlForStatic } from "./static-page.mjs";

// A miniature of site/omra/index.html: everything the head rewrites touch, plus
// one of each path shape the variant has to re-point.
const FR = `<!DOCTYPE html>
<html lang="fr">
<head>
  <title>Omra · Alliance Travel</title>
  <meta name="description" content="Description FR"/>
  <meta property="og:title" content="Omra · Alliance Travel"/>
  <meta property="og:description" content="Description FR"/>
  <meta property="og:url" content="https://alliancetravel.app/omra/"/>
  <meta property="og:locale" content="fr_FR"/>
  <meta name="twitter:title" content="Omra · Alliance Travel"/>
  <meta name="twitter:description" content="Description FR"/>
  <link rel="canonical" href="https://alliancetravel.app/omra/"/>
  <link rel="alternate" hreflang="fr" href="https://alliancetravel.app/omra/"/>
  <link rel="alternate" hreflang="en" href="https://alliancetravel.app/en/omra/"/>
  <link rel="alternate" hreflang="ar" href="https://alliancetravel.app/ar/omra/"/>
  <link rel="alternate" hreflang="x-default" href="https://alliancetravel.app/omra/"/>
  <link rel="stylesheet" href="../assets/css/styles.css"/>
  <script>window.AL_TRIP_LANGS=["fr","en","ar"];</script>
</head>
<body data-page="omra">
  <a href="../omra/" aria-current="page" data-i18n="nav.omra">Omra</a>
  <a href="../egypte/" data-i18n="footer.dest_egypte">Égypte</a>
  <a href="../rendez-vous-visa/" data-i18n="nav.visa_rdv">Visa</a>
  <h1 data-i18n="omra.hero.title">Votre Omra</h1>
  <p data-i18n="omra.hero.lede">Texte français.</p>
  <img src="../assets/images/logo.svg" alt="" data-i18n-alt="omra.logo_alt"/>
</body>
</html>`;

const DICT_AR = {
  "omra.meta.title": "العمرة · Alliance Travel",
  "omra.meta.description": "وصف عربي",
  "omra.hero.title": "عمرتكم",
  "omra.hero.lede": "نص عربي.",
  "omra.logo_alt": "الشعار",
};

const render = (lang, dict = DICT_AR, extra = {}) =>
  renderStaticVariant(FR, {
    lang, slug: "omra", langs: ["fr", "en", "ar"],
    resolve: resolverFor(dict), ...extra,
  });

test("urlForStatic puts French at the root and nests the others", () => {
  assert.equal(urlForStatic("fr", "omra"), "https://alliancetravel.app/omra/");
  assert.equal(urlForStatic("ar", "omra"), "https://alliancetravel.app/ar/omra/");
});

test("Arabic gets lang + dir=rtl; English gets lang only", () => {
  assert.match(render("ar"), /<html lang="ar" dir="rtl">/);
  const en = render("en", { "omra.meta.title": "Umrah" });
  assert.match(en, /<html lang="en">/);
  assert.doesNotMatch(en, /dir="rtl"/);
});

test("canonical, og:url and og:locale point at the variant, not the French page", () => {
  const ar = render("ar");
  assert.match(ar, /<link rel="canonical" href="https:\/\/alliancetravel.app\/ar\/omra\/"\/>/);
  assert.match(ar, /<meta property="og:url" content="https:\/\/alliancetravel.app\/ar\/omra\/"\/>/);
  assert.match(ar, /<meta property="og:locale" content="ar_AR"\/>/);
});

test("title and description come from the dictionary, in every meta that carries them", () => {
  const ar = render("ar");
  assert.match(ar, /<title>العمرة · Alliance Travel<\/title>/);
  for (const attr of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
    assert.ok(ar.includes(`<meta ${attr} content="وصف عربي"/>`), `${attr} not localized`);
  }
  assert.ok(ar.includes('<meta property="og:title" content="العمرة · Alliance Travel"/>'));
  assert.ok(!ar.includes("Description FR"), "French description survived");
});

test("the hreflang cluster is carried through byte-identical — reciprocity holds", () => {
  const cluster = (html) => html.match(/<link rel="alternate"[^>]*\/>/g).join("\n");
  assert.equal(cluster(render("ar")), cluster(FR));
  assert.equal(cluster(render("en", { "omra.meta.title": "Umrah" })), cluster(FR));
});

test("the Arabic webfont is injected for ar only, and exactly once", () => {
  const ar = render("ar");
  assert.equal(ar.match(/data-arabic-font="1"/g).length, 1);
  assert.match(ar, /family=Cairo:wght@600;700&family=Noto\+Sans\+Arabic/);
  assert.doesNotMatch(render("en", { "omra.meta.title": "Umrah" }), /data-arabic-font/);
});

test("AL_TRIP_LANGS is not duplicated when the French page already declares it", () => {
  assert.equal(render("ar").match(/AL_TRIP_LANGS/g).length, 1);
});

test("AL_TRIP_LANGS is injected when the French page omits it", () => {
  const bare = FR.replace(/\s*<script>window\.AL_TRIP_LANGS=[^<]*<\/script>/, "");
  const out = renderStaticVariant(bare, {
    lang: "ar", slug: "omra", langs: ["fr", "en", "ar"], resolve: resolverFor(DICT_AR),
  });
  assert.match(out, /window\.AL_TRIP_LANGS=\["fr","en","ar"\]/);
});

test("relative paths become root-absolute — a variant sits one directory deeper", () => {
  const ar = render("ar");
  assert.ok(!/(?:href|src)="\.\.\//.test(ar), "a ../ path survived into the variant");
  assert.ok(ar.includes('href="/assets/css/styles.css"'));
  assert.ok(ar.includes('src="/assets/images/logo.svg"'));
});

test("self-links stay inside the language; pages without that variant do not", () => {
  const ar = render("ar", DICT_AR, { sameLangDirs: new Set(["egypte"]) });
  assert.ok(ar.includes('href="/ar/omra/"'), "self-link left the language");
  assert.ok(ar.includes('href="/ar/egypte/"'), "sibling with an AR variant not re-pointed");
  // /rendez-vous-visa/ publishes French only — linking to /ar/rendez-vous-visa/
  // would be a 404, so it must stay at the root.
  assert.ok(ar.includes('href="/rendez-vous-visa/"'));
});

test("body text and localizable attributes are translated", () => {
  const ar = render("ar");
  assert.ok(ar.includes(">عمرتكم<"));
  assert.ok(ar.includes(">نص عربي.<"));
  assert.ok(ar.includes('alt="الشعار"'));
});

test("an unknown key leaves the French baseline rather than emptying the element", () => {
  const out = renderStaticVariant(FR, {
    lang: "ar", slug: "omra", langs: ["fr", "en", "ar"], resolve: resolverFor({}),
  });
  assert.ok(out.includes(">Votre Omra<"), "French baseline was destroyed by a missing key");
});

test("rendering is deterministic", () => {
  assert.equal(render("ar"), render("ar"));
});

test("a missing head landmark fails loudly instead of shipping a half-localized page", () => {
  const broken = FR.replace(/<link rel="canonical"[^>]*\/>/, "");
  assert.throws(
    () => renderStaticVariant(broken, {
      lang: "ar", slug: "omra", langs: ["fr", "en", "ar"], resolve: resolverFor(DICT_AR),
    }),
    /canonical/
  );
});

test("French is the source, never a variant", () => {
  assert.throws(
    () => renderStaticVariant(FR, { lang: "fr", slug: "omra", langs: ["fr"], resolve: resolverFor({}) }),
    /source/
  );
});

test("missingKeys reports page keys and ignores the shared nav/footer namespaces", () => {
  const missing = missingKeys(FR, DICT_AR);
  // nav.omra, nav.visa_rdv and footer.dest_egypte resolve from the global
  // dictionary in site/assets/js/i18n.js, so they are not this page's problem.
  assert.deepEqual(missing, []);
  assert.deepEqual(missingKeys(FR, {}), [
    "omra.hero.lede", "omra.hero.title", "omra.logo_alt",
  ]);
});

test("missingKeys sees attribute directives too, not just text", () => {
  const partial = { ...DICT_AR };
  delete partial["omra.logo_alt"];
  assert.deepEqual(missingKeys(FR, partial), ["omra.logo_alt"]);
});
