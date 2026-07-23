// tools/check-i18n-bindings.mjs
// Build gate: the admin's field→translation-key table must still describe the
// pages that are actually rendered.
//
// site/admin/i18n-bindings.js is a hand-written map, and hand-written maps rot.
// If it drifts, the editor shows an EN/AR box wired to the wrong key — the
// owner types an English title, publishes, and the English page is unchanged
// while some unrelated element silently becomes their title. That is the exact
// failure mode of the two dead fields this project already shipped
// (hero.titlePre, finalCta.scarcity), so it gets the same treatment: a gate.
//
// The check is not a tautology. Each entry is re-derived from two independent
// sources — the trip JSON the owner edits, and the manifest extracted from the
// rendered HTML — and they must agree. Rename a template slot, split a field,
// change how hero.tpl composes the H1, and this fails.
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { BINDINGS, keyFor, frenchFor } from "../site/admin/i18n-bindings.js";

/**
 * @param root       repository root
 * @param manifests  freshly-computed manifests keyed by slug. The build passes
 *   what it just computed; without it this would read the previous build's
 *   files and validate the table against pages that no longer exist — the same
 *   one-build lag that made the staleness gate report "fresh" on stale
 *   translations. Falls back to disk when run standalone.
 */
export function checkI18nBindings(root, manifests = null) {
  const errors = [];
  const tripsDir = join(root, "data", "trips");
  const manDir = join(root, "data", "i18n-manifest");

  for (const file of readdirSync(tripsDir).filter((f) => f.endsWith(".json"))) {
    const slug = basename(file, ".json");
    const rel = `data/trips/${file}`;
    let trip, manifest;
    try {
      trip = JSON.parse(readFileSync(join(tripsDir, file), "utf8"));
    } catch { continue; } // already reported by the trip validator
    if (manifests) {
      manifest = manifests[slug];
      if (!manifest) continue; // trip not rendered this build
    } else {
      try {
        manifest = JSON.parse(readFileSync(join(manDir, `${slug}.json`), "utf8"));
      } catch { continue; } // not rendered, or first build — nothing to compare
    }
    if (!trip.keyPrefix) continue;

    for (const [path] of BINDINGS) {
      const key = keyFor(path, trip);
      const entry = manifest.keys[key];
      if (!entry) {
        errors.push({
          file: rel,
          msg: `admin: le champ "${path}" prétend alimenter la clé "${key}", absente de la page rendue`,
        });
        continue;
      }
      const expected = String(frenchFor(path, trip) ?? "").trim();
      const actual = String(entry.fr ?? "").trim();
      if (expected !== actual) {
        errors.push({
          file: rel,
          msg: `admin: le champ "${path}" devrait composer ${JSON.stringify(expected)} ` +
               `pour la clé "${key}", mais la page rend ${JSON.stringify(actual)}`,
        });
      }
    }
  }

  return errors;
}

if (process.argv[1] && basename(process.argv[1]) === "check-i18n-bindings.mjs") {
  const errors = checkI18nBindings(process.cwd());
  for (const e of errors) console.error(`❌ [${e.file}] ${e.msg}`);
  console.log(errors.length
    ? `\n${errors.length} liaison(s) admin↔i18n incorrecte(s).`
    : "\nLes champs de l'admin alimentent bien les clés annoncées.");
  process.exit(errors.length ? 1 : 0);
}
