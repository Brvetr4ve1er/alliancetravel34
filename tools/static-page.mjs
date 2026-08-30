// tools/static-page.mjs
// Publishes language variants of a HAND-AUTHORED page.
//
// WHY THIS EXISTS
// The trip pipeline turns one JSON into /fr/, /en/ and /ar/ URLs. Hand-authored
// pages had no equivalent: /voyages/, /rendez-vous-visa/ and the homepage each
// ship a single French file and translate themselves in the browser. That is
// fine for a page whose audience already reads French — and wrong for the Omra
// page, whose audience overwhelmingly searches in Arabic. Client-side swapping
// gives Google one URL with a French <title>, so an Arabic query never finds it.
//
// This module closes that gap without dragging a static page through the trip
// schema (which hard-requires a hotel price grid and a calculator payload it has
// no business inventing — see tools/validate-trip.mjs).
//
// APPROACH — identical in spirit to tools/templates/langpage.mjs:
// the FRENCH file is the single source of truth and is never rewritten. Each
// variant is derived from it, so EN/AR cannot structurally drift from FR; the
// only thing that varies is text the dictionary provides. What differs from
// langpage.mjs is that we do NOT parse a trip's head.tpl contract: a static
// page owns its own <head>, so the rewrites here are narrow and explicit and
// each one throws loudly rather than silently producing a half-localized page.

import { localizeHtml } from "./templates/localize.mjs";

const ORIGIN = "https://alliance-travel.dz";

// Byte-identical to AR_FONT_HREF in site/assets/js/i18n.js and langpage.mjs.
// The data-arabic-font marker lets the client's ensureArabicFont() skip its own
// injection, so an AR page loads Cairo exactly once — from <head>, before first
// paint, instead of reflowing out of a Latin fallback.
const AR_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=Noto+Sans+Arabic:wght@400;500;600&display=swap";
const AR_FONT_LINK = `<link rel="stylesheet" href="${AR_FONT_HREF}" data-arabic-font="1"/>`;

const OG_LOCALE = { fr: "fr_FR", en: "en_US", ar: "ar_AR" };

const prefixFor = (lang) => (lang === "fr" ? "" : `${lang}/`);
export const urlForStatic = (lang, slug) => `${ORIGIN}/${prefixFor(lang)}${slug}/`;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const escText = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace one attribute value on the single tag matching `pattern`. Throws when
// the tag is absent: a missing canonical or og:url would ship a variant that
// declares itself to be the French page, which is worse than a failed build.
function setAttr(html, pattern, value, what) {
  const re = new RegExp(pattern);
  if (!re.test(html)) throw new Error(`static-page: ${what} introuvable — le <head> a changé ?`);
  return html.replace(re, (m, pre, _old, post) => pre + escAttr(value) + post);
}

/* ------------------------------------------------------------------ paths */

// Variants sit one directory deeper than the French page, so every "../foo"
// would resolve to "/<lang>/foo". Rewrite them root-absolute, then re-point the
// links that DO have a sibling in this language.
function rootAbsolutePaths(html, lang, slug, sameLangDirs) {
  let out = html.replace(/(["'(,]\s*)\.\.\//g, "$1/");
  if (lang === "fr") return out;

  // Self-links (nav aria-current, footer) must stay inside this language.
  out = out.replace(
    new RegExp(`((?:href|src)=")/${escapeRe(slug)}/(?=["#?])`, "g"),
    `$1/${lang}/${slug}/`
  );

  // Sibling trip pages that publish this language too.
  for (const dir of sameLangDirs ?? []) {
    out = out.replace(
      new RegExp(`((?:href|src)=")/${escapeRe(dir)}/(?=["#?])`, "g"),
      `$1/${lang}/${dir}/`
    );
  }
  return out;
}

/* ------------------------------------------------------------------- head */

function localizeHead(html, { lang, slug, title, description }) {
  // <html lang> + dir. Arabic is the only RTL language we publish.
  const htmlTag = lang === "ar" ? `<html lang="ar" dir="rtl">` : `<html lang="${lang}">`;
  if (!/<html lang="fr">/.test(html)) {
    throw new Error('static-page: <html lang="fr"> introuvable');
  }
  html = html.replace('<html lang="fr">', htmlTag);

  if (title) {
    if (!/<title>[\s\S]*?<\/title>/.test(html)) throw new Error("static-page: <title> introuvable");
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escText(title)}</title>`);
    html = setAttr(html, '(<meta property="og:title" content=")([^"]*)(")', title, "og:title");
    html = setAttr(html, '(<meta name="twitter:title" content=")([^"]*)(")', title, "twitter:title");
  }
  if (description) {
    html = setAttr(html, '(<meta name="description" content=")([^"]*)(")', description, "meta description");
    html = setAttr(html, '(<meta property="og:description" content=")([^"]*)(")', description, "og:description");
    html = setAttr(html, '(<meta name="twitter:description" content=")([^"]*)(")', description, "twitter:description");
  }

  const self = urlForStatic(lang, slug);
  html = setAttr(html, '(<link rel="canonical" href=")([^"]*)(")', self, "canonical");
  html = setAttr(html, '(<meta property="og:url" content=")([^"]*)(")', self, "og:url");
  html = setAttr(html, '(<meta property="og:locale" content=")([^"]*)(")', OG_LOCALE[lang] || "fr_FR", "og:locale");

  // The hreflang cluster is authored in full on the French page and is identical
  // for every variant (self + siblings + x-default→FR), so it is deliberately
  // NOT rewritten here — reciprocity holds by construction.
  return html;
}

// Tells the client which languages this page publishes as real URLs, so the
// switcher navigates between them instead of swapping text in place. The global
// is named AL_TRIP_LANGS for the trip pipeline; site/assets/js/i18n.js reads it
// generically (tripLangs(), used by navTargetFor) and does not care that this
// page is not a trip.
function injectLangs(html, langs) {
  // The French page declares this itself (it needs the switcher to navigate too),
  // and localizeHtml carries it through untouched — so this is a no-op on a
  // well-formed page and only a safety net if the declaration is ever dropped.
  if (html.includes("AL_TRIP_LANGS")) return html;
  const tag = `<script>window.AL_TRIP_LANGS=${JSON.stringify(langs)};</script>\n`;
  const i = html.indexOf("</head>");
  if (i === -1) throw new Error("static-page: </head> introuvable");
  return html.slice(0, i) + tag + html.slice(i);
}

function injectArabicFont(html) {
  const i = html.indexOf("</head>");
  if (i === -1) throw new Error("static-page: </head> introuvable");
  return html.slice(0, i) + AR_FONT_LINK + "\n" + html.slice(i);
}

/* ------------------------------------------------------------------ public */

/**
 * Render one language variant of a hand-authored French page.
 *
 * @param {string} frHtml   the French page, exactly as committed
 * @param {object} opts
 * @param {string} opts.lang          target language ("en" | "ar")
 * @param {string} opts.slug          URL directory, e.g. "omra"
 * @param {string[]} opts.langs       every language this page publishes
 * @param {(key:string)=>string|null} opts.resolve  dictionary lookup
 * @param {Set<string>} [opts.sameLangDirs] sibling dirs that publish `lang`
 * @returns {string} the variant HTML
 */
export function renderStaticVariant(frHtml, { lang, slug, langs, resolve, sameLangDirs }) {
  if (lang === "fr") throw new Error("static-page: la page française est la source, pas une variante");
  if (typeof resolve !== "function") throw new Error("static-page: resolve manquant");

  let html = localizeHtml(frHtml, resolve);

  const title = resolve(`${slug}.meta.title`);
  const description = resolve(`${slug}.meta.description`);
  html = localizeHead(html, { lang, slug, title, description });

  html = injectLangs(html, langs);
  if (lang === "ar") html = injectArabicFont(html);
  html = rootAbsolutePaths(html, lang, slug, sameLangDirs);

  return html;
}

/**
 * Build a resolver over a flat page dictionary for one language, e.g.
 * { "omra.hero.lede": "…" }. Returns null for unknown keys so localizeHtml
 * leaves the French baseline in place rather than emptying the element.
 */
export function resolverFor(dict) {
  const d = dict || {};
  return (key) => (key in d ? d[key] : null);
}

/**
 * Which keys does a page's markup bind that the dictionary does not translate?
 * Nothing else gates a hand-authored page's i18n coverage — tools/check-i18n.mjs
 * only ever walks data/trips — so without this a variant can silently ship whole
 * sections still in French, which is exactly what /voyages/ does today.
 */
export function missingKeys(frHtml, dict) {
  const keys = new Set();
  const re = /data-i18n(?:-html|-aria-label|-title|-placeholder|-alt)?="([^"]+)"/g;
  for (let m; (m = re.exec(frHtml)); ) keys.add(m[1]);
  const d = dict || {};
  // nav.* / footer.* resolve from the global dictionary in site/assets/js/i18n.js,
  // which the page shares with every other page; only page-owned keys are ours.
  return [...keys].filter((k) => !(k in d) && !/^(nav|footer)\./.test(k)).sort();
}

/**
 * Turn a flat dotted dictionary into the nested tree the BROWSER expects.
 *
 * site/assets/js/i18n.js resolves a key with
 *   key.split('.').reduce((o, k) => (o && k in o) ? o[k] : null, dict)
 * — it walks objects. A flat map resolves to null on the first segment, which
 * is why a page-local dictionary written flat silently does nothing at runtime.
 * The on-disk dictionary stays flat because that is what the markup's
 * data-i18n attributes look like and it is what missingKeys() diffs against.
 */
export function expandDict(flat) {
  const out = {};
  for (const key of Object.keys(flat)) {
    const parts = key.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (typeof node[k] === "string") {
        throw new Error(`static-page: cle "${key}" en conflit avec "${parts.slice(0, i + 1).join(".")}"`);
      }
      node[k] ??= {};
      node = node[k];
    }
    const leaf = parts[parts.length - 1];
    if (node[leaf] != null && typeof node[leaf] === "object") {
      throw new Error(`static-page: cle "${key}" en conflit avec une branche existante`);
    }
    node[leaf] = flat[key];
  }
  return out;
}
