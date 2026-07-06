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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRIPS_DIR = join(ROOT, "data", "trips");
const SITE_DIR = join(ROOT, "site");
const MANIFEST_PATH = join(ROOT, "data", "build-manifest.json");

const CHECK_ONLY = process.argv.includes("--check");

const errors = [];   // [{ file, msg }] — any entry fails the build
const warnings = []; // informational; never fails the build

const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

/* ------------------------------------------------------------------ helpers */

const isStr = (v) => typeof v === "string" && v.length > 0;
const isInt = (v) => Number.isInteger(v);

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function req(file, data, path, check, expect) {
  const v = get(data, path);
  if (!check(v)) err(file, `champ requis invalide ou manquant: "${path}" (attendu: ${expect})`);
  return v;
}

// Walk every string value in the tree, yield [jsonPath, string].
function* strings(node, path = "") {
  if (typeof node === "string") { yield [path, node]; return; }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) yield* strings(v, path ? `${path}.${k}` : k);
  }
}

/* --------------------------------------------------------------- validation */

function validateTrip(file, data, enabled) {
  const slug = req(file, data, "slug", isStr, "string non vide");

  // slug must match the filename — it drives image paths + canonical URL.
  const stem = basename(file, ".json");
  if (isStr(slug) && slug !== stem)
    err(file, `slug "${slug}" ≠ nom du fichier "${stem}"`);

  req(file, data, "region", isStr, "string");
  req(file, data, "dataPage", isStr, "string");
  req(file, data, "meta.title", isStr, "string");
  req(file, data, "meta.description", isStr, "string");
  req(file, data, "meta.ogTitle", isStr, "string");
  req(file, data, "meta.ogDescription", isStr, "string");
  req(file, data, "meta.ogImage", isStr, "string (ex: og-istanbul.jpg)");
  req(file, data, "meta.themeColor", (v) => isStr(v) && /^#[0-9a-fA-F]{3,8}$/.test(v), "couleur hex");
  req(file, data, "accent.color", (v) => isStr(v) && /^#[0-9a-fA-F]{3,8}$/.test(v), "couleur hex");
  req(file, data, "accent.heroGradient", isStr, "dégradé CSS");
  req(file, data, "seo.tripName", isStr, "string");
  req(file, data, "seo.offerPrice", (v) => isStr(v) && /^\d+$/.test(v), "chiffres uniquement");
  req(file, data, "jsonLd.breadcrumbName", isStr, "string");
  req(file, data, "hero.bg", isStr, "chemin image");
  // hero.fg (foreground cutout) is optional — the Aurora hero uses hero.bg full-bleed only.
  req(file, data, "hero.titlePre", isStr, "string");
  req(file, data, "hero.aria", isStr, "string (aria-label du hero, ex: \"Istanbul — Entre deux continents\")");
  req(file, data, "hero.priceFrom", isStr, "string (ex: \"129.000 DA\")");

  // The calculator payload drives the page's core feature.
  req(file, data, "tripData.name", isStr, "string");
  const dates = get(data, "tripData.dates");
  if (!Array.isArray(dates) || dates.length === 0)
    err(file, "tripData.dates: au moins une date de départ requise");
  const calcHotels = get(data, "tripData.hotels");
  const calcIds = new Set();
  if (!Array.isArray(calcHotels) || calcHotels.length === 0) {
    err(file, "tripData.hotels: liste vide ou manquante (grille tarifaire du calculateur)");
  } else {
    calcHotels.forEach((h, i) => {
      const at = `tripData.hotels[${i}]`;
      if (!isStr(h.id)) err(file, `${at}.id manquant`);
      else if (calcIds.has(h.id)) err(file, `${at}.id "${h.id}" en double`);
      else calcIds.add(h.id);
      if (!h.prices || typeof h.prices !== "object") {
        err(file, `${at}.prices manquant`);
      } else {
        for (const [room, price] of Object.entries(h.prices)) {
          if (!isInt(price) || price < 0)
            err(file, `${at}.prices.${room} = ${JSON.stringify(price)} (attendu: entier en DA, ex: 129000)`);
        }
      }
    });
  }

  // The calculator <select> options must reference real price entries.
  const optionsHtml = get(data, "calcUi.optionsHtml");
  if (!isStr(optionsHtml) || !optionsHtml.includes("<option"))
    err(file, "calcUi.optionsHtml: au moins une <option> requise");
  else {
    for (const m of optionsHtml.matchAll(/<option value="([^"]*)"/g)) {
      if (!calcIds.has(m[1]))
        err(file, `calcUi.optionsHtml: option "${m[1]}" absente de tripData.hotels (le calculateur ne trouvera pas les prix)`);
    }
  }
  if (!isStr(get(data, "calcUi.steppersHtml")))
    err(file, "calcUi.steppersHtml: bloc des compteurs voyageurs manquant");
  if (!isStr(get(data, "calcUi.whyHtml")))
    err(file, "calcUi.whyHtml: bloc « Pourquoi ce prix ? » manquant");
  if (!isStr(get(data, "footer.html")) || !get(data, "footer.html").includes("footer.copyright"))
    err(file, "footer.html: contenu du pied de page manquant ou sans clé footer.copyright");
  if (!isStr(get(data, "finalCta.actionsHtml")) || !get(data, "finalCta.actionsHtml").includes("wa.me/"))
    err(file, "finalCta.actionsHtml: bloc d'actions sans lien WhatsApp");
  // Every room type offered must exist in every price grid.
  for (const r of get(data, "calcUi.roomOptions") ?? []) {
    calcHotels?.forEach?.((h, i) => {
      if (h.prices && !(r.room in h.prices))
        err(file, `tripData.hotels[${i}].prices: type de chambre "${r.room}" manquant (offert dans le calculateur)`);
    });
  }
  const chips = get(data, "calcUi.dateChips");
  if (!Array.isArray(chips) || chips.length === 0)
    err(file, "calcUi.dateChips: au moins une date requise");

  // Content sections must not be empty.
  for (const [path, label] of [
    ["highlights", "points forts"], ["itinerary.days", "itinéraire"],
    ["faq", "FAQ"], ["hotels", "cartes hôtels"], ["infoBlocks", "blocs d'information"],
  ]) {
    const v = get(data, path);
    if (!Array.isArray(v) || v.length === 0) err(file, `${path}: liste vide ou manquante (${label})`);
  }

  // Hotel cards.
  for (const [i, h] of (get(data, "hotels") ?? []).entries()) {
    const at = `hotels[${i}]`;
    if (!isStr(h.name)) err(file, `${at}.name manquant`);
    if (!isInt(h.stars) || h.stars < 1 || h.stars > 5) err(file, `${at}.stars: entier de 1 à 5 requis`);
    if (!isStr(h.starsHtml)) err(file, `${at}.starsHtml: rendu des étoiles manquant (ex: ★★★★)`);
    if (!isInt(h.aosDelay)) err(file, `${at}.aosDelay: entier requis (délai d'animation, ex: 0, 60, 120)`);
    if (isStr(h.calcId) && calcIds.size && !calcIds.has(h.calcId))
      warn(file, `${at}.calcId "${h.calcId}" absent de tripData.hotels`);
  }
  for (const [i, d] of (get(data, "itinerary.days") ?? []).entries()) {
    if (!d.active && !isInt(d.aosDelay))
      err(file, `itinerary.days[${i}].aosDelay: entier requis pour les jours non mis en avant`);
  }
  for (const [i, f] of (get(data, "faq") ?? []).entries()) {
    if (!f.open && !isInt(f.aosDelay))
      err(file, `faq[${i}].aosDelay: entier requis pour les questions fermées`);
  }

  // FAQPage JSON-LD must mirror the FAQ section.
  const faq = get(data, "faq") ?? [];
  const faqLd = get(data, "seo.faqJsonLd") ?? [];
  if (faq.length !== faqLd.length)
    err(file, `seo.faqJsonLd: ${faqLd.length} question(s) mais la FAQ en a ${faq.length} — les deux doivent rester synchronisés`);
  else faq.forEach((f, i) => {
    const plain = String(f.question).replace(/<[^>]*>/g, "").trim();
    if (faqLd[i]?.name !== plain)
      warn(file, `seo.faqJsonLd[${i}].name ≠ question FAQ correspondante ("${faqLd[i]?.name}" vs "${plain}")`);
  });

  // Referenced local images must exist. Paths are relative to site/<slug>/.
  for (const [path, value] of strings(data)) {
    if (path.startsWith("i18n.")) continue; // translations may cite examples
    // hero.fg (foreground cutout) is optional — the Aurora hero uses hero.bg full-bleed only.
    if (path === "hero.fg") continue;
    const m = value.match(/^(?:\.\.\/)+(assets\/[^\s"']+\.(?:jpe?g|png|webp|avif|svg))$/i);
    if (!m) continue;
    if (!existsSync(join(SITE_DIR, m[1]))) {
      const msg = `image introuvable: "${value}" (champ ${path})`;
      enabled ? err(file, msg) : warn(file, msg);
    }
  }

  // Related cards should point at existing trip directories.
  for (const [i, r] of (get(data, "related") ?? []).entries()) {
    if (isStr(r.slug) && !existsSync(join(SITE_DIR, r.slug, "index.html")))
      warn(file, `related[${i}].slug "${r.slug}": site/${r.slug}/ introuvable`);
  }
}

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
  validateTrip(rel, data, enabled);
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
