// The FRENCH page's reciprocal hreflang cluster (langpage.injectHreflang),
// wired into tools/build.mjs for multi-language trips. Google discards a
// cluster whose members don't point back at each other, so the FR page has to
// name its EN/AR siblings itself — the sitemap's alternates are not enough.
import { test } from "node:test";
import assert from "node:assert/strict";
import { injectHreflang } from "./langpage.mjs";

const ORIGIN = "https://alliancetravel.app";
const frPage = (slug) =>
  `<!DOCTYPE html>\n<html lang="fr">\n<head>\n` +
  `<link rel="canonical" href="${ORIGIN}/${slug}/"/>\n` +
  `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${slug}/"/>\n` +
  `</head>\n<body></body>\n</html>\n`;

test("a 3-language trip gets fr + en + ar + x-default, each exactly once", () => {
  const out = injectHreflang(frPage("bali"), { slug: "bali", langs: ["fr", "en", "ar"] });
  for (const l of ["fr", "en", "ar"]) {
    const line = `<link rel="alternate" hreflang="${l}" href="${ORIGIN}/${l === "fr" ? "" : l + "/"}bali/"/>`;
    assert.equal(out.split(line).length - 1, 1, `expected exactly one ${l} alternate`);
  }
  assert.equal(out.match(/hreflang="x-default"/g).length, 1);
  assert.ok(out.includes(`hreflang="x-default" href="${ORIGIN}/bali/"`)); // x-default → FR
});

test("a 2-language trip gets only the languages it publishes", () => {
  const out = injectHreflang(frPage("azerbaidjan"), { slug: "azerbaidjan", langs: ["fr", "en"] });
  assert.ok(out.includes(`hreflang="en" href="${ORIGIN}/en/azerbaidjan/"`));
  assert.ok(!out.includes('hreflang="ar"'));
  assert.equal(out.match(/rel="alternate"/g).length, 3); // fr + en + x-default
});

test("the canonical is left alone — only the alternates change", () => {
  const out = injectHreflang(frPage("bali"), { slug: "bali", langs: ["fr", "en"] });
  assert.ok(out.includes(`<link rel="canonical" href="${ORIGIN}/bali/"/>`));
});

test("the language list is published for the switcher, before </head>", () => {
  const out = injectHreflang(frPage("bali"), { slug: "bali", langs: ["fr", "en", "ar"] });
  assert.ok(out.includes('<script>window.AL_TRIP_LANGS=["fr","en","ar"];</script>'));
  assert.ok(out.indexOf("AL_TRIP_LANGS") < out.indexOf("</head>"));
});

test("a page without the x-default line throws rather than shipping a half cluster", () => {
  assert.throws(
    () => injectHreflang("<html><head></head></html>", { slug: "bali", langs: ["fr", "en"] }),
    /x-default hreflang line not found/
  );
});
