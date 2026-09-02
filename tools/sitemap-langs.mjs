// tools/sitemap-langs.mjs
// Keeps site/sitemap.xml's language data in step with data/build-manifest.json.
//
// WHY THIS EXISTS
// The sitemap is hand-maintained and carries curated per-page content —
// <image:title>/<image:caption> copy, lastmod, changefreq, priority — that no
// generator should invent. But two things in it MUST derive from the manifest,
// because when they drift the drift is invisible and expensive:
//
//   1. the <xhtml:link> alternate cluster on every trip URL, and
//   2. the existence of a <url> block per published language variant.
//
// Before this module, enabling Arabic on 7 trips left the sitemap declaring
// fr+en+x-default while the pages themselves declared fr+en+ar+x-default.
// Conflicting hreflang annotation sets for one cluster is a documented reason
// for Google to discard the annotations entirely — so the sitemap silently
// defeated the very hreflang work it was supposed to support. The 7 Arabic
// pages were also absent, leaving them with no discovery path.
//
// APPROACH
// Curated content is never touched. A variant's <url> block is CLONED from its
// French sibling (inheriting that page's image copy and lastmod) with only the
// <loc> swapped, and every block in a cluster gets the same generated alternate
// list. Blocks for pages that are not manifest trips — the homepage, /voyages/,
// /rendez-vous-visa/ — are passed through untouched.

const ORIGIN = "https://alliancetravel.app";

const prefixFor = (lang) => (lang === "fr" ? "" : `${lang}/`);
export const urlFor = (lang, dir) => `${ORIGIN}/${prefixFor(lang)}${dir}/`;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Alternate cluster for one trip: self + every sibling + x-default (always FR).
// Identical for every member of the cluster, which is what makes it reciprocal
// by construction rather than by hand-syncing each entry.
export function alternatesFor(dir, langs, indent = "    ") {
  const lines = langs.map(
    (l) => `${indent}<xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(l, dir)}"/>`
  );
  lines.push(
    `${indent}<xhtml:link rel="alternate" hreflang="x-default" href="${urlFor("fr", dir)}"/>`
  );
  return lines.join("\n");
}

// The trips a manifest actually publishes, as { dir, langs }.
export function publishedTrips(manifest) {
  const out = [];
  for (const [slug, e] of Object.entries(manifest?.trips ?? {})) {
    if (e?.enabled !== true) continue;
    const langs = Array.isArray(e.langs) && e.langs.length ? e.langs : ["fr"];
    out.push({ dir: e.outputDir || slug, langs });
  }
  return out;
}

// Split the document into <url>…</url> blocks plus the text between them, so
// everything we do not understand survives byte-identically.
function splitBlocks(xml) {
  const re = /[ \t]*<url>[\s\S]*?<\/url>\n?/g;
  const parts = [];
  let last = 0;
  for (let m; (m = re.exec(xml)); ) {
    if (m.index > last) parts.push({ text: xml.slice(last, m.index) });
    parts.push({ block: m[0] });
    last = m.index + m[0].length;
  }
  parts.push({ text: xml.slice(last) });
  return parts;
}

const locOf = (block) => (block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || null;

// Replace a block's alternate lines with `alts`, or insert them after
// <priority> (or <lastmod>, or <loc>) when the block has none yet.
function setAlternates(block, alts) {
  const existing = /(?:[ \t]*<xhtml:link[^>]*\/>\n)+/;
  if (existing.test(block)) return block.replace(existing, `${alts}\n`);
  const anchor = /([ \t]*<(?:priority|changefreq|lastmod|loc)>[^<]*<\/(?:priority|changefreq|lastmod|loc)>\n)/g;
  let lastMatch = null;
  for (let m; (m = anchor.exec(block)); ) lastMatch = m;
  if (!lastMatch) return block;
  const at = lastMatch.index + lastMatch[0].length;
  return block.slice(0, at) + alts + "\n" + block.slice(at);
}

const swapLoc = (block, loc) => block.replace(/<loc>[^<]+<\/loc>/, `<loc>${loc}</loc>`);

/**
 * Synchronise the sitemap's clusters and variant URLs with the manifest.
 * Returns { xml, added, updated, problems }. Never throws on content it does
 * not recognise — unknown blocks are passed through.
 */
export function syncSitemapLangs(xml, manifest) {
  // Judge content, not bytes: a Windows checkout (or a byte-exact write path)
  // can hand us CRLF, and every run-matcher below assumes bare \n. Normalize
  // once at the boundary; the synced output is canonically LF.
  xml = xml.replace(/\r\n?/g, "\n");
  const trips = publishedTrips(manifest);
  const byLoc = new Map(); // loc → { dir, langs }
  for (const t of trips) {
    for (const l of t.langs) byLoc.set(urlFor(l, t.dir), t);
  }

  const parts = splitBlocks(xml);
  const seen = new Set();
  const problems = [];
  let updated = 0;

  // Pass 1 — fix the alternates on every block we recognise.
  for (const p of parts) {
    if (!p.block) continue;
    const loc = locOf(p.block);
    if (!loc) continue;
    seen.add(loc);
    const trip = byLoc.get(loc);
    if (!trip) continue; // homepage, /voyages/, /rendez-vous-visa/, blog…
    const alts = alternatesFor(trip.dir, trip.langs);
    const next = setAlternates(p.block, alts);
    if (next !== p.block) { p.block = next; updated++; }
  }

  // Pass 2 — add a block for every published variant that has none, cloned
  // from its French sibling so curated image copy and lastmod carry over.
  const added = [];
  for (const t of trips) {
    const frLoc = urlFor("fr", t.dir);
    const frPart = parts.find((p) => p.block && locOf(p.block) === frLoc);
    if (!frPart) {
      problems.push(`aucune entrée <url> pour ${frLoc} — variantes non ajoutées`);
      continue;
    }
    for (const lang of t.langs) {
      if (lang === "fr") continue;
      const loc = urlFor(lang, t.dir);
      if (seen.has(loc)) continue;
      const clone = setAlternates(swapLoc(frPart.block, loc), alternatesFor(t.dir, t.langs));
      const at = parts.indexOf(frPart);
      parts.splice(at + 1, 0, { block: clone });
      seen.add(loc);
      added.push(loc);
    }
  }

  return {
    xml: parts.map((p) => p.block ?? p.text).join(""),
    added,
    updated,
    problems,
  };
}

/**
 * Drift check for --check mode and CI: every published URL must be present and
 * carry exactly the alternates the manifest implies. Returns a list of human
 * -readable problems (empty when in sync).
 */
export function checkSitemapLangs(xml, manifest) {
  // Same boundary normalization as the sync: the gate failed CI on a CRLF
  // sitemap whose content was correct (the `/>\n?` run-matcher stopped at \r).
  xml = xml.replace(/\r\n?/g, "\n");
  const problems = [];
  const parts = splitBlocks(xml);
  const blocks = new Map();
  for (const p of parts) {
    if (!p.block) continue;
    const loc = locOf(p.block);
    if (loc) blocks.set(loc, p.block);
  }
  for (const t of publishedTrips(manifest)) {
    const want = alternatesFor(t.dir, t.langs).trim();
    for (const lang of t.langs) {
      const loc = urlFor(lang, t.dir);
      const block = blocks.get(loc);
      if (!block) { problems.push(`${loc} absent du sitemap`); continue; }
      const got = (block.match(/(?:[ \t]*<xhtml:link[^>]*\/>\n?)+/) || [""])[0].trim();
      if (got !== want) problems.push(`${loc}: cluster hreflang désynchronisé du manifest`);
    }
  }
  return problems;
}
