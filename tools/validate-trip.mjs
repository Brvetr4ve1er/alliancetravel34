// tools/validate-trip.mjs
// Pure, importable trip-JSON validator. Same rules as the build gate, with no
// module state and no process.exit, so it can run inside a serverless function.
// checkImages/siteDir gate the only filesystem-dependent checks.
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

const isStr = (v) => typeof v === "string" && v.length > 0;
const isInt = (v) => Number.isInteger(v);

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
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

// imageExists: optional (relPathUnderSite) => boolean. Supply it when there is
// no filesystem to stat (serverless); it takes precedence over siteDir.
export function validateTrip(file, data, { enabled = false, siteDir = null, checkImages = true, imageExists = null } = {}) {
  const errors = [];
  const warnings = [];
  const err = (f, m) => errors.push({ file: f, msg: m });
  const warn = (f, m) => warnings.push({ file: f, msg: m });
  const req = (f, d, path, check, expect) => {
    const v = get(d, path);
    if (!check(v)) err(f, `champ requis invalide ou manquant: "${path}" (attendu: ${expect})`);
    return v;
  };

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
  // The visible H1 is hero.h1Pre + <em>hero.h1Em</em> (hero.tpl). Both are
  // required: the engine's slot guard only rejects null/undefined, so an empty
  // string renders <h1><em></em></h1> — a page with no heading, past every gate.
  // (hero.titlePre above is legacy: still present in all 7 files, rendered by
  // nothing. Left required so the data stays uniform until it is removed.)
  req(file, data, "hero.h1Pre", isStr, "string (1re partie du titre H1)");
  req(file, data, "hero.h1Em", isStr, "string (partie colorée du titre H1)");
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
  // The build resolves them on disk; the save-trip function has no site/ in its
  // bundle and passes imageExists backed by the GitHub tree instead. Same rule,
  // two sources of truth about what exists.
  const imgExists = imageExists || (checkImages && siteDir ? (rel) => existsSync(join(siteDir, rel)) : null);
  if (imgExists) {
    for (const [path, value] of strings(data)) {
      if (path.startsWith("i18n.")) continue; // translations may cite examples
      // hero.fg (foreground cutout) is optional — the Aurora hero uses hero.bg full-bleed only.
      if (path === "hero.fg") continue;
      const m = value.match(/^(?:\.\.\/)+(assets\/[^\s"']+\.(?:jpe?g|png|webp|avif|svg))$/i);
      if (!m) continue;
      if (!imgExists(m[1])) {
        const msg = `image introuvable: "${value}" (champ ${path})`;
        enabled ? err(file, msg) : warn(file, msg);
      }
    }
  }

  // Related cards should point at existing trip directories.
  if (checkImages && siteDir) {
    for (const [i, r] of (get(data, "related") ?? []).entries()) {
      if (isStr(r.slug) && !existsSync(join(siteDir, r.slug, "index.html")))
        warn(file, `related[${i}].slug "${r.slug}": site/${r.slug}/ introuvable`);
    }
  }

  return { errors, warnings };
}
