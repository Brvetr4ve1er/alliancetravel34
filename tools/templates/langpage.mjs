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
//   • injectHreflang(html, {slug, langs}) — for the FRENCH page of a
//       multi-language trip: the same reciprocal cluster, plus the langs list.
//       Wired in tools/build.mjs, after the variants are rendered and before
//       the error gate. It was left unwired at first to keep every FR page
//       byte-identical, with reciprocity declared only through the sitemap's
//       xhtml:link alternates; Google treats a cluster whose members do not
//       point back at each other as unconfirmed, so the FR byte-drift is
//       accepted now. A trip with langs:["fr"] never reaches this function, so
//       single-language French pages are still byte-for-byte what they were.

// localize.mjs (the data-i18n body text-swap) is imported lazily inside
// localizeVariant so a French-only build never loads it.
const ORIGIN = "https://alliancetravel.app";

// Arabic webfont, byte-identical to AR_FONT_HREF in site/assets/js/i18n.js.
// The data-arabic-font marker lets the client's ensureArabicFont() skip its own
// injection, so an AR page loads Cairo exactly once — from the <head>, before
// first paint. Injected from JS alone (as it used to be) every Arabic page
// painted its first frame in a Latin fallback and reflowed, and never loaded
// Cairo at all when JS was blocked.
const AR_FONT_HREF = "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=Noto+Sans+Arabic:wght@400;500;600&display=swap";
const AR_FONT_LINK = `<link rel="stylesheet" href="${AR_FONT_HREF}" data-arabic-font="1"/>`;

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

// Tells the client which languages this trip publishes as real URLs, so the
// language switcher navigates between them (rather than swapping text in place).
// Only emitted for multi-language trips, so single-language pages are untouched.
function injectTripLangs(html, langs) {
  const tag = `<script>window.AL_TRIP_LANGS=${JSON.stringify(langs)};</script>\n`;
  const i = html.indexOf("</head>");
  if (i === -1) throw new Error("langpage: </head> not found — head.tpl changed?");
  return html.slice(0, i) + tag + html.slice(i);
}

export function injectHreflang(html, { slug, langs }) {
  return injectTripLangs(replaceHreflang(html, slug, langs), langs);
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
// `sameLangDirs` is the set of trip output-dirs that publish a variant in THIS
// language. Sibling-trip links are re-pointed at that language's URL so an
// Arabic reader stays in Arabic; without this every internal link dropped them
// back into French and left the whole /<lang>/ tree orphaned from internal
// linking (Googlebot saw pages with zero inbound links).
// Pages with no variant — /voyages/, /rendez-vous-visa/, the homepage — keep
// their French URL: inventing /ar/voyages/ would link to a 404.
function rootAbsolutePaths(html, lang, sameLangDirs) {
  let out = html.replace(/(["'(,]\s*)\.\.\//g, "$1/");
  if (lang === "fr" || !sameLangDirs?.size) return out;
  for (const dir of sameLangDirs) {
    // Only an href/src attribute value that IS the trip root, so asset paths
    // (/assets/…) and anchors (/bali/#hotels) are matched deliberately, never
    // substrings of a longer segment.
    out = out.replace(
      new RegExp(`((?:href|src)=")/${escapeRe(dir)}/(?=["#?])`, "g"),
      `$1/${lang}/${dir}/`
    );
  }
  return out;
}

/* ------------------------------------------------------------- nav CTA */

// The nav CTA's visible label comes from trip data (nav.ctaHtml), so unlike
// every other nav item it carries no data-i18n and stayed French on variants —
// an Arabic page whose single most prominent button read "Réserver".
//
// Bound here rather than in nav.tpl on purpose: adding the attribute to the
// template would also rewrite all seven FRENCH pages, and keeping those
// byte-identical is the guarantee the whole per-language pipeline rests on.
//
// Only the LAST text run before </a> is swapped, so egypte's inline WhatsApp
// <svg> (and any future icon markup) survives untouched.
function localizeNavCta(html, resolve) {
  const label = resolve("nav.trip_booking");
  if (!label) return html;
  return html.replace(
    /(<a[^>]*class="[^"]*\bnav-cta\b[^"]*"[^>]*>)([\s\S]*?)(<\/a>)/g,
    (full, open, inner, close) => {
      // Trailing text run = everything after the last '>' (or the whole inner
      // when there is no nested markup). Bail out if it holds no visible text.
      const cut = inner.lastIndexOf(">") + 1;
      const head = inner.slice(0, cut);
      const tail = inner.slice(cut);
      if (!tail.trim()) return full;
      return open + head + tail.replace(/\S[\s\S]*\S|\S/, escText(label)) + close;
    }
  );
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

function localizeHead(html, { lang, slug, langs, data, globalT }) {
  const meta = lookup(`meta.${metaKey(slug)}`, globalT[lang]) || {};
  const frUrl = urlFor("fr", slug);
  const selfUrl = urlFor(lang, slug);

  // <html lang="fr"> → <html lang="en"> (+ dir="rtl" for Arabic)
  html = replaceOnce(html, `<html lang="fr">`,
    `<html lang="${lang}"${lang === "ar" ? ' dir="rtl"' : ""}>`, "<html lang>");

  // Arabic needs Cairo in the HEAD, not injected later by i18n.js. On a
  // server-rendered /ar/ page the client-side language switch never fires, so
  // ensureArabicFont() never runs: the page painted its first frame in a Latin
  // fallback (and with JS blocked, never loaded Cairo at all). Weights match
  // AR_FONT_HREF in site/assets/js/i18n.js — keep the two in step.
  if (lang === "ar") {
    html = replaceOnce(html, "</head>",
      `  ${AR_FONT_LINK}\n</head>`, "</head> for AR font");
  }

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
  html = replaceHreflang(html, slug, langs);

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

// sameLangDirs: output-dirs of every trip publishing a variant in `lang`, used
// to keep sibling-trip links inside this language (see rootAbsolutePaths).
export async function localizeVariant(html, { lang, slug, langs, data, globalT, sameLangDirs }) {
  const { localizeHtml } = await import("./localize.mjs");
  const resolve = makeResolve(lang, data, globalT);
  let out = localizeHtml(html, resolve); // body + attribute data-i18n swap
  out = localizeNavCta(out, resolve);    // the one nav item with no data-i18n
  out = localizeHead(out, { lang, slug, langs, data, globalT });
  out = injectTripLangs(out, langs);
  out = rootAbsolutePaths(out, lang, sameLangDirs);
  return out;
}
