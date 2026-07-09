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

async function renderEnabled(slug, entry, data) {
  const { renderTrip } = await import(pathToFileURL(join(ROOT, "tools", "templates", "trip2.mjs")).href);
  const outDir = join(SITE_DIR, entry.outputDir || slug);
  const outFile = join(outDir, "index.html");
  const html = toOutput(renderTrip(data));

  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : null;
  if (current === html) return { outFile, changed: false };
  if (!CHECK_ONLY) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(outFile, html);
  }
  return { outFile, changed: true };
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
  const { outFile, changed } = await renderEnabled(slug, entry, data);
  const relOut = outFile.slice(ROOT.length + 1);
  if (changed) { rendered++; console.log(`${CHECK_ONLY ? "🔍" : "✅"} ${slug} → ${relOut}${CHECK_ONLY ? " (diffère — non écrit, mode --check)" : ""}`); }
  else { unchanged++; console.log(`✅ ${slug} → ${relOut} (déjà à jour)`); }
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
