// site/admin/i18n-bindings.js
// Which admin form fields feed which translation key.
//
// WHY THIS IS DECLARED AND NOT DERIVED
//
// Two rules were measured against all seven trips before this table was
// written, and both fail:
//
//   • Naming convention (keyPrefix + PascalCase of the JSON path) matches for
//     hero.eyebrow and hero.date and nothing else — 2 of 8 fields.
//   • Matching on the French text matches the same two, and produces a false
//     positive: kuala-lumpur's hero.h1Pre is "Kuala Lumpur " and an unrelated
//     nav pill klPillKl is "Kuala Lumpur", so a trimmed comparison would wire
//     the H1's translation to the pill.
//
// So the mapping is written down. Anything written down rots, which is why
// tools/check-i18n-bindings.mjs re-derives every entry from the manifest on
// every build and fails if one stops matching.
//
// `compose` exists because a key is not always one field: hero.tpl renders
// {{hero.h1Pre}}<em>{{hero.h1Em}}</em> into the single key <prefix>HeroH1, so
// editing either half changes one translation.
//
// Absent from this table, deliberately:
//   • meta.title, meta.description — <head> carries no data-i18n attributes at
//     all, so these are never translated. English and Arabic visitors get the
//     French <title> in search results. Fixing that needs runtime work in
//     site/assets/js/i18n.js (swap document.title on language change) and is
//     not an editor concern. The editor says so rather than implying an EN/AR
//     box would help.
//   • hero.priceFrom, hero.aria — no binding on the rendered page.

/** @type {Array<[path, {suffix, compose?, fields?}]>} */
export const BINDINGS = [
  ["hero.eyebrow", { suffix: "HeroEyebrow" }],
  ["hero.date", { suffix: "HeroDate" }],
  ["hero.h1Pre", {
    suffix: "HeroH1",
    fields: ["hero.h1Pre", "hero.h1Em"],
    compose: (c) => `${c?.hero?.h1Pre ?? ""}<em>${c?.hero?.h1Em ?? ""}</em>`,
  }],
  ["hero.h1Em", {
    suffix: "HeroH1",
    fields: ["hero.h1Pre", "hero.h1Em"],
    compose: (c) => `${c?.hero?.h1Pre ?? ""}<em>${c?.hero?.h1Em ?? ""}</em>`,
  }],
];

/** Fields the owner can edit that carry no translation, with the reason shown. */
export const UNTRANSLATED = {
  "meta.title": "pages.i18n.head",
  "meta.description": "pages.i18n.head",
};

const MAP = new Map(BINDINGS);

/** The manifest key a field feeds on a given trip, or null. */
export function keyFor(path, trip) {
  const b = MAP.get(path);
  if (!b || !trip || !trip.keyPrefix) return null;
  return trip.keyPrefix + b.suffix;
}

/** The French text that key currently holds, composed the way the template renders it. */
export function frenchFor(path, trip) {
  const b = MAP.get(path);
  if (!b) return null;
  if (b.compose) return b.compose(trip);
  return path.split(".").reduce((x, k) => (x == null ? x : x[k]), trip);
}

/** Every field that contributes to the same key as `path` (itself included). */
export function siblingFields(path) {
  const b = MAP.get(path);
  return (b && b.fields) || (b ? [path] : []);
}

/**
 * FNV-1a over the French source, base36, 8 chars. Stored per translation as
 * i18nHash[lang][key]; a translation is stale when the stored hash no longer
 * matches the hash of the French next to it.
 *
 * It lives here, not in tools/, because BOTH sides must produce identical
 * digests: the build stamps them and the admin re-stamps them when the owner
 * edits a translation. Two copies of a hash function is two chances to drift,
 * and the symptom would be every translation reading stale forever. tools/
 * i18n-manifest.mjs re-exports this one.
 */
export function frHash(text) {
  const str = String(text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(8, "0");
}

/**
 * The French a key currently holds, normalised the way the manifest stores it.
 * check-i18n-bindings.mjs asserts this equals the manifest's `fr` for every
 * declared field on every trip, so hashing this in the browser and hashing the
 * manifest's `fr` at build time cannot disagree without failing the build.
 */
export function composedFr(path, trip) {
  return String(frenchFor(path, trip) ?? "").trim();
}
