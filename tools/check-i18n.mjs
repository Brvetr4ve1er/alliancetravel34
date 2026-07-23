// tools/check-i18n.mjs
// Build gate for the translation contract, plus the manifest the admin reads.
//
// WHY THE ERROR RULES ARE WHAT THEY ARE
//
// The plan originally proposed erroring on "a key that resolves nowhere". That
// rule cannot fire: the runtime resolve order is
// AL_PAGE_I18N[lang] → T[lang] → live-FR baseline → T.fr, so a key with no
// translation falls back to the French already in the DOM. The visitor sees
// French, never a raw key. Shipping that rule would have been theatre.
//
// So the errors below are the conditions that genuinely corrupt a page, each
// measured against all 7 trips before being written (all are clean today —
// their job is to stay that way once M3 multiplies the editable surface):
//
//   A. One key bound to two DIFFERENT French strings on the same page. A key is
//      a single translation slot, so translating it necessarily makes one of the
//      two elements wrong.
//   B. A trip-local key that shadows a shared key. Page dictionaries win over
//      the global one, so a trip defining e.g. `nav.skip` silently overrides
//      site-wide navigation for that page only.
//   C. A binding whose French is empty. There is nothing to translate, and the
//      runtime would write an empty string over the element.
//
// Stale and missing translations are WARNINGS, never errors: the owner
// explicitly chose warn-and-allow, so that a one-word French price fix does not
// become a three-language task before anything can ship.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { buildManifest, extractBindings } from "./i18n-manifest.mjs";

/**
 * Key paths of the site-wide dictionary in site/assets/js/i18n.js.
 *
 * That file is a browser module whose `T` object is a JS literal (single
 * quotes, unquoted keys) — not JSON — so it cannot be JSON.parse'd. It is NOT
 * eval'd either: a build step should not carry a code-execution primitive, even
 * over its own source. Instead the literal's strings are blanked out (so
 * apostrophes, colons and braces inside French copy cannot confuse the scan)
 * and the remaining skeleton is walked with a depth counter to recover the
 * dotted key paths. Values are irrelevant here; only names are needed.
 *
 * A parse failure degrades to "no shared keys" plus a warning rather than
 * failing the build, because every trip key would otherwise look like a shadow.
 */
export function loadSharedKeys(root) {
  try {
    const src = readFileSync(join(root, "site", "assets", "js", "i18n.js"), "utf8");
    const m = src.match(/(?:const|var|let)\s+T\s*=\s*(\{[\s\S]*?\n\s{0,4}\};)/);
    if (!m) return { keys: new Set(), warning: "dictionnaire partagé introuvable dans i18n.js" };

    // Blank every string literal, keeping the quotes so the skeleton stays valid.
    const skeleton = m[1].replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");

    const keys = new Set();
    const stack = [];
    // Matches `name:` / `'name':` and the bare braces that open and close scopes.
    const token = /(?:([A-Za-z_$][\w$]*)|'([^']*)')\s*:\s*(\{)?|(\})/g;
    let t;
    while ((t = token.exec(skeleton))) {
      if (t[4]) { stack.pop(); continue; }          // closing brace
      const name = t[1] ?? t[2];
      if (name == null) continue;
      if (t[3]) { stack.push(name); continue; }      // opens a nested object
      // A leaf: its path is the enclosing scopes minus the language root.
      const path = [...stack.slice(1), name].join(".");
      if (path) keys.add(path);
    }
    return { keys, warning: null };
  } catch (e) {
    return { keys: new Set(), warning: `dictionnaire partagé illisible: ${e.message}` };
  }
}

/**
 * @param root         repository root
 * @param htmlBySlug   freshly-rendered pages, keyed by slug. The build passes
 *   what it is about to write; anything absent falls back to the copy on disk.
 *   Without this the gate compared today's French against yesterday's page and
 *   reported "fresh" for the very translation that had just gone stale.
 */
export function checkI18n(root, htmlBySlug = {}) {
  const errors = [];
  const warnings = [];
  const manifests = {};

  const { keys: sharedKeys, warning: sharedWarning } = loadSharedKeys(root);
  if (sharedWarning) warnings.push({ file: "site/assets/js/i18n.js", msg: sharedWarning });

  const tripsDir = join(root, "data", "trips");
  for (const file of readdirSync(tripsDir).filter((f) => f.endsWith(".json"))) {
    const slug = basename(file, ".json");
    const rel = `data/trips/${file}`;
    let trip, html;
    try {
      trip = JSON.parse(readFileSync(join(tripsDir, file), "utf8"));
    } catch (e) {
      errors.push({ file: rel, msg: `JSON invalide: ${e.message}` });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(htmlBySlug, slug)) {
      html = htmlBySlug[slug];
    } else {
      try {
        html = readFileSync(join(root, "site", slug, "index.html"), "utf8");
      } catch {
        // Not every trip JSON is necessarily rendered (manifest-gated). Silent.
        continue;
      }
    }

    const bindings = extractBindings(html);

    // A. one key, two different French strings
    const firstFr = new Map();
    const clashed = new Set();
    for (const b of bindings) {
      if (!firstFr.has(b.key)) firstFr.set(b.key, b.fr);
      else if (firstFr.get(b.key) !== b.fr) clashed.add(b.key);
    }
    for (const key of clashed) {
      errors.push({
        file: `site/${slug}/index.html`,
        msg: `clé i18n "${key}" liée à deux textes français différents — la traduction en cassera un`,
      });
    }

    // C. empty French
    for (const key of new Set(bindings.filter((b) => !b.fr || !b.fr.trim()).map((b) => b.key))) {
      errors.push({ file: `site/${slug}/index.html`, msg: `clé i18n "${key}": texte français vide` });
    }

    // B. trip key shadowing a shared key
    const dictKeys = new Set([
      ...Object.keys(trip.i18n?.en || {}),
      ...Object.keys(trip.i18n?.ar || {}),
    ]);
    for (const key of dictKeys) {
      if (sharedKeys.has(key)) {
        errors.push({ file: rel, msg: `clé "${key}" masque le dictionnaire partagé pour cette page` });
      }
    }

    const manifest = buildManifest({ slug, html, trip, sharedKeys });
    manifests[slug] = manifest;

    // Warnings: coverage and freshness, aggregated so the build stays readable.
    const tripKeys = Object.values(manifest.keys).filter((k) => k.scope === "trip");
    for (const [lang, stateKey] of [["anglaise", "enState"], ["arabe", "arState"]]) {
      const missing = tripKeys.filter((k) => k[stateKey] === "missing").length;
      const stale = tripKeys.filter((k) => k[stateKey] === "stale").length;
      const pct = lang === "anglaise" ? manifest.coverage.en : manifest.coverage.ar;
      if (missing) warnings.push({ file: rel, msg: `${missing} clé(s) sans traduction ${lang} (${pct} % traduit)` });
      if (stale) warnings.push({ file: rel, msg: `${stale} traduction(s) ${lang} à revérifier` });
    }

    // Orphans: translations for bindings that no longer exist. Dead weight, and
    // usually the fingerprint of a field that was renamed or removed — this is
    // how the retired hero.titlePre surfaced.
    const bound = new Set(bindings.map((b) => b.key));
    const orphans = [...dictKeys].filter((k) => !bound.has(k));
    if (orphans.length) {
      warnings.push({
        file: rel,
        msg: `${orphans.length} traduction(s) sans élément correspondant: ${orphans.slice(0, 4).join(", ")}${orphans.length > 4 ? "…" : ""}`,
      });
    }
  }

  // A page that binds almost nothing scores 100 % coverage, because coverage is
  // translated-over-bound. Istanbul bound 7 elements against 183–207 on every
  // other trip and reported a perfect score while being the least translated
  // page on the site — the translations were fine, the `data-i18n` attributes
  // were never rendered, so the runtime had nothing to swap.
  //
  // The comparison is against the other trips rather than a fixed threshold: no
  // constant survives a redesign, whereas six sibling pages built from the same
  // templates are a fair expectation. The limitation is real and accepted — if
  // every trip lost its bindings at once, nothing here would fire. Coverage is
  // never reported to the owner without this count beside it.
  {
    const counts = Object.entries(manifests).map(([slug, m]) => [
      slug,
      Object.values(m.keys).filter((k) => k.scope === "trip").length,
    ]);
    if (counts.length >= 3) {
      const sorted = counts.map(([, n]) => n).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      for (const [slug, n] of counts) {
        if (n < median / 2) {
          warnings.push({
            file: `data/trips/${slug}.json`,
            msg: `seulement ${n} élément(s) traduisible(s) sur la page (médiane ${median}) — ` +
                 `les attributs data-i18n ne sont pas rendus, la traduction n'aura aucun effet visible`,
          });
        }
      }
    }
  }

  return { errors, warnings, manifests };
}

/** Write the manifest the admin reads. Never called in --check mode. */
export function writeManifest(root, manifests) {
  const out = { generated: "build", trips: manifests };
  writeFileSync(join(root, "data", "i18n-manifest.json"), JSON.stringify(out, null, 2) + "\n");
}

if (process.argv[1] && basename(process.argv[1]) === "check-i18n.mjs") {
  const { errors, warnings } = checkI18n(process.cwd());
  for (const w of warnings) console.warn(`⚠️  [${w.file}] ${w.msg}`);
  for (const e of errors) console.error(`❌ [${e.file}] ${e.msg}`);
  console.log(errors.length ? `\n${errors.length} erreur(s) i18n.` : "\nContrat i18n respecté.");
  process.exit(errors.length ? 1 : 0);
}
