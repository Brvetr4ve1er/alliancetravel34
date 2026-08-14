// tools/sitemap-langs.test.mjs
// The lang gate must judge CONTENT, not line endings. The committed sitemap
// went CRLF (Windows checkout + a byte-exact write path), and the check's
// `/>\n?` regex stopped at the first \r — truncating every cluster to one
// link line and failing CI on 10+ "desynced" clusters whose content was
// correct. Same brittleness in the sync side's `/>\n` run-matcher, which is
// why a plain build "found nothing to repair" while --check blocked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSitemapLangs, syncSitemapLangs } from "./sitemap-langs.mjs";

const MANIFEST = {
  trips: {
    istanbul: { enabled: true, outputDir: null, langs: ["fr", "ar"] },
  },
};

// A minimal, correct sitemap for that manifest (LF).
const LF_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://alliance-travel.dz/istanbul/</loc>
    <lastmod>2026-06-09</lastmod>
    <xhtml:link rel="alternate" hreflang="fr" href="https://alliance-travel.dz/istanbul/"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://alliance-travel.dz/ar/istanbul/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://alliance-travel.dz/istanbul/"/>
  </url>
  <url>
    <loc>https://alliance-travel.dz/ar/istanbul/</loc>
    <lastmod>2026-06-09</lastmod>
    <xhtml:link rel="alternate" hreflang="fr" href="https://alliance-travel.dz/istanbul/"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://alliance-travel.dz/ar/istanbul/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://alliance-travel.dz/istanbul/"/>
  </url>
</urlset>
`;

test("check: an in-sync LF sitemap passes", () => {
  assert.deepEqual(checkSitemapLangs(LF_XML, MANIFEST), []);
});

test("check: the SAME sitemap with CRLF endings still passes (content, not bytes)", () => {
  const crlf = LF_XML.replace(/\n/g, "\r\n");
  assert.deepEqual(checkSitemapLangs(crlf, MANIFEST), []);
});

test("check: a genuinely missing alternate still fails, in both endings", () => {
  const broken = LF_XML.replace(
    '    <xhtml:link rel="alternate" hreflang="ar" href="https://alliance-travel.dz/ar/istanbul/"/>\n',
    "",
  );
  assert.ok(checkSitemapLangs(broken, MANIFEST).length > 0, "LF break must be caught");
  assert.ok(checkSitemapLangs(broken.replace(/\n/g, "\r\n"), MANIFEST).length > 0, "CRLF break must be caught");
});

test("sync: repairs a drifted cluster even when the file is CRLF", () => {
  const broken = LF_XML.replace(
    '    <xhtml:link rel="alternate" hreflang="ar" href="https://alliance-travel.dz/ar/istanbul/"/>\n',
    "",
  ).replace(/\n/g, "\r\n");
  const { xml } = syncSitemapLangs(broken, MANIFEST);
  assert.deepEqual(checkSitemapLangs(xml, MANIFEST), [], "sync output must satisfy the check");
});
