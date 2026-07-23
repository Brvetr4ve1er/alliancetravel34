// tools/templates/langpage.mjs
// Turns the French-rendered trip page into a per-language variant.
//
// The French page is rendered exactly as before (trip2.mjs → the 17 section
// templates) and written unchanged to site/<slug>/index.html. This module is
// the ONLY thing that runs for the /en/ and /ar/ variants, so the French
// output can never drift: a trip with langs:["fr"] is never passed through
// here at all.
//
// Two jobs:
//   • localizeVariant(html, {lang, slug, langs, data, globalT})  — full variant:
//       body text-swap (via localize.mjs, the same data-i18n contract the
//       browser uses), <html lang>/dir, <title>/description/OG, self-canonical,
//       the reciprocal hreflang cluster, and a relative→root-absolute path
//       rewrite so assets resolve from the deeper /en|ar/<slug>/ directory.
//   • injectHreflang(html, {slug, langs}) — for the FRENCH variant of a
//       multi-language trip: it stays byte-identical except for the hreflang
//       cluster, which must list its new siblings.

// localize.mjs (the data-i18n body text-swap) is imported lazily inside
// localizeVariant so a French-only build never loads it.
const ORIGIN = "https://alliance-travel.dz";

// Path segment prefix for a language: French lives at the root, others nest.
const prefixFor = (lang) => (lang === "fr" ? "" : `${lang}/`);
const urlFor = (lang, slug) => `${ORIGIN}/${prefixFor(lang)}${slug}/`;

const OG_LOCALE = { fr: "fr_FR", en: "en_US", ar: "ar_AR" };

const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function lookup(key, dict) {
  if (!key || !dict) return undefined;
  return key.split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), dict);
}

// resolve(key) → translated string, or null to leave the French in place.
// Mirrors i18n.js resolve() order for a non-default language: page-local dict
// first (flat keys like "azHeroEyebrow"), then the sitewide dict (dotted keys
// like "nav.skip"), else null (== the client's fall-through to the live FR text).
function makeResolve(lang, data, globalT) {
  const page = (data.i18n && data.i18n[lang]) || {};
  const global = globalT[lang] || {};
  return (key) => {
    if (key in page) return page[key];
    const g = lookup(key, global);
    return g == null ? null : g;
  };
}

/* -------------------------------------------------------------- hreflang */

// Reciprocal cluster: self + every live sibling + x-default (always the FR URL).
// Generated identically for every variant of a trip from the one langs list, so
// reciprocity holds by construction rather than by hand-syncing each page.
function hreflangCluster(slug, langs) {
  const lines = langs.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${urlFor(l, slug)}"/>`
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${urlFor("fr", slug)}"/>`);
  return lines.join("\n");
}

// The French base page renders exactly one x-default line (see head.tpl). We
// swap that single line for the full cluster; everything else is byte-identical.
function replaceHreflang(html, slug, langs) {
  const current = `<link rel="alternate" hreflang="x-default" href="${urlFor("fr", slug)}"/>`;
  if (!html.includes(current)) {
    throw new Error(`langpage: x-default hreflang line not found for "${slug}" — head.tpl changed?`);
  }
  return html.replace(current, hreflangCluster(slug, langs));
}

export function injectHreflang(html, { slug, langs }) {
  return replaceHreflang(html, slug, langs);
}

/* ------------------------------------------------------- path depth fix */

// /en/<slug>/ and /ar/<slug>/ are one directory deeper than /<slug>/, so the
// pages' relative "../assets/…", "../site.webmanifest", "../index.html",
// "../rendez-vous-visa/" and "../<sibling>/" links (in both the templates and
// the trip data) would resolve one level too high. Rewriting them to
// root-absolute "/…" makes them resolve correctly from any depth. Only the
// localized variants get this — the French page keeps its relative paths.
// Targets "../ " only when it opens an attribute value or a srcset entry, so a
// stray "../" inside body copy can't be caught.
function rootAbsolutePaths(html) {
  return html.replace(/(["'(,]\s*)\.\.\//g, "$1/");
}

/* --------------------------------------------------------- head rewrites */

function replaceOnce(html, find, replacement, label) {
  const i = html.indexOf(find);
  if (i === -1) throw new Error(`langpage: ${label} not found — head.tpl changed?`);
  if (html.indexOf(find, i + find.length) !== -1) {
    throw new Error(`langpage: ${label} appears more than once — expected exactly one`);
  }
  return html.slice(0, i) + replacement + html.slice(i + find.length);
}

// The sitewide meta dict keys pages by data-page slug, which uses underscores
// (kuala_lumpur) where the URL slug uses hyphens (kuala-lumpur).
const metaKey = (slug) => slug.replace(/-/g, "_");

function localizeHead(html, { lang, slug, data, globalT }) {
  const meta = lookup(`meta.${metaKey(slug)}`, globalT[lang]) || {};
  const frUrl = urlFor("fr", slug);
  const selfUrl = urlFor(lang, slug);

  // <html lang="fr"> → <html lang="en"> (+ dir="rtl" for Arabic)
  html = replaceOnce(html, `<html lang="fr">`,
    `<html lang="${lang}"${lang === "ar" ? ' dir="rtl"' : ""}>`, "<html lang>");

  // <title> and meta description — only when a translation exists.
  if (meta.title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(meta.title)}</title>`);
  }
  if (meta.description) {
    html = replaceMetaContent(html, 'name="description"', meta.description);
    html = replaceMetaContent(html, 'property="og:description"', meta.og_description || meta.description);
    html = replaceMetaContent(html, 'name="twitter:description"', meta.og_description || meta.description);
  }
  const ogTitle = meta.og_title || meta.title;
  if (ogTitle) {
    html = replaceMetaContent(html, 'property="og:title"', ogTitle);
    html = replaceMetaContent(html, 'name="twitter:title"', ogTitle);
  }

  // og:url + og:locale + canonical → the variant's own URL/locale.
  html = replaceMetaContent(html, 'property="og:url"', selfUrl);
  html = replaceMetaContent(html, 'property="og:locale"', OG_LOCALE[lang] || "fr_FR");
  html = replaceOnce(html,
    `<link rel="canonical" href="${frUrl}"/>`,
    `<link rel="canonical" href="${selfUrl}"/>`, "canonical");

  // hreflang cluster.
  html = replaceHreflang(html, slug, data._langs);

  // JSON-LD: point the self-referential URLs at this variant, and localize the
  // TouristTrip name/description to the meta strings when available.
  html = html.split(`"item": "${frUrl}"`).join(`"item": "${selfUrl}"`);
  html = html.split(`"url": "${frUrl}"`).join(`"url": "${selfUrl}"`);
  if (meta.title) html = replaceJsonField(html, "name", data.seo.tripName, meta.title);
  if (meta.description) html = replaceJsonField(html, "description", data.seo.tripDescription, meta.description);

  return html;
}

function replaceMetaContent(html, selector, value) {
  // Matches a <meta … selector … content="…"/> in either attribute order.
  const re = new RegExp(`(<meta[^>]*${escapeRe(selector)}[^>]*content=")[^"]*(")`);
  const re2 = new RegExp(`(<meta[^>]*content=")[^"]*("[^>]*${escapeRe(selector)})`);
  if (re.test(html)) return html.replace(re, `$1${escAttr(value)}$2`);
  if (re2.test(html)) return html.replace(re2, `$1${escAttr(value)}$2`);
  throw new Error(`langpage: meta ${selector} not found — head.tpl changed?`);
}

function replaceJsonField(html, field, frValue, value) {
  const find = `"${field}": ${JSON.stringify(frValue)}`;
  const repl = `"${field}": ${JSON.stringify(value)}`;
  return html.includes(find) ? html.split(find).join(repl) : html;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ----------------------------------------------------------------- api */

export async function localizeVariant(html, { lang, slug, langs, data, globalT }) {
  const { localizeHtml } = await import("./localize.mjs");
  data._langs = langs;
  const resolve = makeResolve(lang, data, globalT);
  let out = localizeHtml(html, resolve); // body + attribute data-i18n swap
  out = localizeHead(out, { lang, slug, data, globalT });
  out = rootAbsolutePaths(out);
  return out;
}
