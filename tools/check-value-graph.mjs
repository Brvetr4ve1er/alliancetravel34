// tools/check-value-graph.mjs
// Build gate: a derived price that no longer agrees with its source fails the
// build. One such disagreement (vietnam) was live on the site and in Google's
// rich result for weeks, because nothing compared the copies.
//
// Errors, not warnings: an advertised price that contradicts the calculator is
// a commercial statement, and the whole point of the gate is that it cannot be
// shipped past.
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { deriveValues } from "./value-graph.mjs";

export function checkValueGraph(root) {
  const dir = join(root, "data", "trips");
  const errors = [];
  const warnings = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const rel = `data/trips/${file}`;
    let trip;
    try {
      trip = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch (e) {
      errors.push({ file: rel, msg: `JSON invalide: ${e.message}` });
      continue;
    }

    const { derived, safe } = deriveValues(trip);
    if (!safe) {
      for (const d of derived) errors.push({ file: rel, msg: `prix: ${d.reason}` });
      continue;
    }
    for (const d of derived) {
      if (d.ok) continue;
      errors.push({
        file: rel,
        msg: `prix incohérent: "${d.path}" affiche ${JSON.stringify(d.current)} ` +
             `mais devrait être ${JSON.stringify(d.expected)} — ${d.reason}`,
      });
    }
    // Surface the un-derivable shapes once per trip so they stay visible
    // without failing anything.
    const nd = derived.find((d) => d.path === "hotels[].priceFrom");
    if (nd) warnings.push({ file: rel, msg: `prix des cartes hôtel non dérivés (${nd.reason})` });
  }

  return { errors, warnings };
}

// Allow a direct run for quick inspection: node tools/check-value-graph.mjs
if (process.argv[1] && basename(process.argv[1]) === "check-value-graph.mjs") {
  const { errors, warnings } = checkValueGraph(process.cwd());
  for (const w of warnings) console.warn(`⚠️  [${w.file}] ${w.msg}`);
  for (const e of errors) console.error(`❌ [${e.file}] ${e.msg}`);
  console.log(errors.length ? `\n${errors.length} incohérence(s) de prix.` : "\nPrix cohérents sur tous les voyages.");
  process.exit(errors.length ? 1 : 0);
}
