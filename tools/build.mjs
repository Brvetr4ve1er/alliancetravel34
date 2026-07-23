#!/usr/bin/env node
// tools/build.mjs
// Zero-dependency build step for the admin/CMS pipeline.
//
//   node tools/build.mjs            validate all trips, render manifest-enabled ones
//   node tools/build.mjs --check    validate only (never writes), for CI / pre-commit
//
// Contract (docs/ADMIN-DASHBOARD-PLAN.md §5):
//   • VALIDATE ALWAYS — every data/trips/*.json is schema-checked on every run.
//     Any error → exit 1 → the deploy aborts and the live site keeps its
//     last-good version. This is the "owner can't break the site" gate.
//   • RENDER SELECTIVELY — only trips enabled in data/build-manifest.json are
//     rendered (via tools/templates/trip2.mjs) and written to site/<dir>/index.html.
//   • Output uses UTF-8 BOM + LF + a single trailing newline — the convention
//     of every live trip page (verified across all 7 on 2026-07-02).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateTrip } from "./validate-trip.mjs";
import { checkAdminFields } from "./check-admin-fields.mjs";
import { localizeVariant, injectHreflang } from "./templates/langpage.mjs";
import { loadGlobalI18n } from "./templates/global-i18n.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRIPS_DIR = join(ROOT, "data", "trips");
const SITE_DIR = join(ROOT, "site");
const MANIFEST_PATH = join(ROOT, "data", "build-manifest.json");

const CHECK_ONLY = process.argv.includes("--check");

const errors = [];   // [{ file, msg }] — any entry fails the build
const warnings = []; // informational; never fails the build

const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

/* ------------------------------------------------------------------- render */

function toOutput(html) {
  const lf = html.replace(/\r\n/g, "\n").replace(/\n*$/, "\n"); // exactly one trailing \n
  return "﻿" + lf.replace(/^﻿/, "");                  // UTF-8 BOM + LF
}

function writeIfChanged(outDir, html) {
  const outFile = join(outDir, "index.html");
  const outHtml = toOutput(html);
  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : null;
  const changed = current !== outHtml;
  if (changed && !CHECK_ONLY) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outFile, outHtml);
  }
  return { outFile, changed };
}

// Renders every language variant a trip declares. The French page is rendered
// exactly as before and — for a single-language trip — written untouched, so
// FR output is provably identical unless the trip opts into another language.
// Additional languages nest under site/<lang>/<dir>/ with a reciprocal hreflang
// cluster; the French page of a multi-language trip gains that cluster too.
async function renderVariants(slug, entry, data) {
  const { renderTrip } = await import(pathToFileURL(join(ROOT, "tools", "templates", "trip2.mjs")).href);
  const baseDir = entry.outputDir || slug;
  const langs = Array.isArray(entry.langs) && entry.langs.length ? entry.langs : ["fr"];
  const frHtml = renderTrip(data); // the French base — computed once, localized per language
  const multi = langs.length > 1;
  const globalT = multi ? loadGlobalI18n() : null;

  const results = [];
  for (const lang of langs) {
    const outDir = lang === "fr" ? join(SITE_DIR, baseDir) : join(SITE_DIR, lang, baseDir);
    const html = lang === "fr"
      ? (multi ? injectHreflang(frHtml, { slug: baseDir, langs }) : frHtml)
      : await localizeVariant(frHtml, { lang, slug: baseDir, langs, data, globalT });
    results.push({ lang, ...writeIfChanged(outDir, html) });
  }
  return results;
}

/* --------------------------------------------------------------------- main */

let manifest = { trips: {} };
if (existsSync(MANIFEST_PATH)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch (e) {
    err("data/build-manifest.json", `JSON invalide: ${e.message}`);
  }
} else {
  warn("data/build-manifest.json", "manifest absent — validation seule, aucun rendu");
}

const tripFiles = readdirSync(TRIPS_DIR)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .sort();

const parsed = new Map(); // slug -> data
for (const f of tripFiles) {
  const rel = `data/trips/${f}`;
  let data;
  try {
    data = JSON.parse(readFileSync(join(TRIPS_DIR, f), "utf8"));
  } catch (e) {
    err(rel, `JSON invalide: ${e.message}`);
    continue;
  }
  const slug = basename(f, ".json");
  const enabled = manifest.trips?.[slug]?.enabled === true;
  const { errors: vErr, warnings: vWarn } = validateTrip(rel, data, { enabled, siteDir: SITE_DIR, checkImages: true });
  for (const e of vErr) errors.push(e);
  for (const w of vWarn) warnings.push(w);
  parsed.set(slug, data);
}

// Manifest entries must point at real trip files.
for (const slug of Object.keys(manifest.trips ?? {})) {
  if (!parsed.has(slug))
    err("data/build-manifest.json", `"${slug}" listé mais data/trips/${slug}.json introuvable`);
}

// site/<dir>/index.html must trace back to a manifest-enabled trip or a known
// static page. Anything else is a stale/orphaned page — e.g. a leftover local
// file swept into a commit by a broad `git add`, or a localized variant left
// behind after a language was turned off — that would otherwise sit on the live
// site indefinitely with no generator ever touching it again.
{
  const enabled = Object.entries(manifest.trips ?? {}).filter(([, e]) => e?.enabled === true);
  const outputDir = (slug, e) => e.outputDir || slug;
  // French pages live at site/<dir>/; each enabled non-fr language nests under
  // site/<lang>/<dir>/. Build the expected set per language root.
  const frDirs = new Set(enabled.map(([slug, e]) => outputDir(slug, e)));
  const langDirs = new Map(); // lang -> Set(outputDir) that enable it
  for (const [slug, e] of enabled) {
    for (const lang of (e.langs || ["fr"])) {
      if (lang === "fr") continue;
      if (!langDirs.has(lang)) langDirs.set(lang, new Set());
      langDirs.get(lang).add(outputDir(slug, e));
    }
  }
  const STATIC_SITE_DIRS = new Set(["admin", "assets", "blog", "voyages", "rendez-vous-visa"]);
  const flag = (rel) => err(rel, "page orpheline — aucune entrée data/build-manifest.json ne pointe ici; supprimer le dossier ou l'ajouter au manifest");

  for (const name of readdirSync(SITE_DIR, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (STATIC_SITE_DIRS.has(name.name) || frDirs.has(name.name)) continue;
    if (langDirs.has(name.name)) {
      // A language root (site/en, site/ar): every child must be a trip that
      // still enables this language.
      const expected = langDirs.get(name.name);
      for (const sub of readdirSync(join(SITE_DIR, name.name), { withFileTypes: true })) {
        if (sub.isDirectory() && !expected.has(sub.name) && existsSync(join(SITE_DIR, name.name, sub.name, "index.html")))
          flag(`site/${name.name}/${sub.name}/index.html`);
      }
      continue;
    }
    if (existsSync(join(SITE_DIR, name.name, "index.html"))) flag(`site/${name.name}/index.html`);
  }
}

// Admin form fields must address data the templates actually render, or the
// owner edits them to no effect. Caught here because nothing at runtime can.
for (const e of checkAdminFields(ROOT)) errors.push(e);

// ── Blog: load + validate (rendered after the error gate) ───────────
const { loadPosts, renderPost, renderIndex } = await import(pathToFileURL(join(ROOT, "tools", "blog.mjs")).href);
const siteCfg = JSON.parse(readFileSync(join(ROOT, "data", "site.json"), "utf8"));
const includeDrafts = process.env.AT_BLOG_DRAFTS === "1";
const { posts, errors: blogErrors } = loadPosts({ includeDrafts });
for (const e of blogErrors) err(e.file, e.msg);

for (const w of warnings) console.warn(`⚠️  [${w.file}] ${w.msg}`);
if (errors.length) {
  for (const e of errors) console.error(`❌ [${e.file}] ${e.msg}`);
  console.error(`\nBuild bloqué: ${errors.length} erreur(s). Le site en ligne reste inchangé.`);
  process.exit(1);
}

let rendered = 0, unchanged = 0, skipped = 0;
for (const [slug, data] of parsed) {
  const entry = manifest.trips?.[slug];
  if (entry?.enabled !== true) { skipped++; console.log(`⏭  ${slug} — désactivé dans le manifest (non publié)`); continue; }
  for (const { outFile, changed } of await renderVariants(slug, entry, data)) {
    const relOut = outFile.slice(ROOT.length + 1);
    if (changed) { rendered++; console.log(`${CHECK_ONLY ? "🔍" : "✅"} ${slug} → ${relOut}${CHECK_ONLY ? " (diffère — non écrit, mode --check)" : ""}`); }
    else { unchanged++; console.log(`✅ ${slug} → ${relOut} (déjà à jour)`); }
  }
}

// ── Blog: render published posts + index + sitemap injection ────────
let blogWritten = 0;
if (posts.length) {
  const writeOut = (rel, html) => {
    const f = join(SITE_DIR, rel);
    const outHtml = toOutput(html);
    if (existsSync(f) && readFileSync(f, "utf8") === outHtml) return;
    if (!CHECK_ONLY) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, outHtml); }
    blogWritten++;
  };
  for (const p of posts) writeOut(`blog/${p.slug}/index.html`, renderPost(p, siteCfg));
  writeOut("blog/index.html", renderIndex(posts, siteCfg));
  console.log(`📝 blog: ${posts.length} article(s) publié(s)${includeDrafts ? " (brouillons inclus — AT_BLOG_DRAFTS=1)" : ""}, ${blogWritten} fichier(s) écrit(s)`);
}
// sitemap: (re)generate the blog block between the AT:blog markers
{
  const smPath = join(SITE_DIR, "sitemap.xml");
  const sm = readFileSync(smPath, "utf8");
  const urls = posts.length
    ? [`  <url><loc>${siteCfg.baseUrl}/blog/</loc><lastmod>${posts[0].date}</lastmod></url>`,
       ...posts.map((p) => `  <url><loc>${siteCfg.baseUrl}/blog/${p.slug}/</loc><lastmod>${p.date}</lastmod></url>`)]
    : [];
  const block = `<!-- AT:blog START -->\n${urls.length ? urls.join("\n") + "\n" : ""}<!-- AT:blog END -->`;
  const next = sm.replace(/<!-- AT:blog START -->[\s\S]*?<!-- AT:blog END -->/, block);
  if (next !== sm && !CHECK_ONLY) writeFileSync(smPath, next);
}

console.log(`\nBuild OK — ${tripFiles.length} fichier(s) validé(s), ${rendered} rendu(s), ${unchanged} inchangé(s), ${skipped} non publié(s).`);
