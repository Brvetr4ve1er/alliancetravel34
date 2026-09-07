// tools/check-rendered-page.mjs
// The two i18n rules that can kill a build, in a form api/save-trip.mjs can run.
//
// WHY THIS EXISTS. The build has five gates; save-trip.mjs ran the equivalent of
// three (schema, value-graph, render). The two it could not run live in
// check-i18n.mjs, which walks the whole repository from disk — no use inside a
// serverless function. So this held, and was measured on 2026-09-07:
//
//   • Blank faq[0].question in the Avancé panel.
//   • validateTrip: 0 errors. renderTrip: fine. driftOf: 0.
//   • save-trip commits it, dashboard says "Publié ✓ — en ligne dans ~1 minute".
//   • The next Vercel build dies on `clé i18n "azFaqQ1": texte français vide`,
//     and EVERY page stops updating until someone edits JSON by hand.
//
// That is the worst failure this project can have: the owner is told it worked,
// the site silently freezes, and nothing in the dashboard says why. Widening the
// editor to "edit anything" multiplies the ways to reach it, so the check moves
// to where the edit is refused instead of where it is discovered.
//
// PURE and HTML-only: it takes the string renderTrip() already produced, so it
// costs one extra pass over an existing value and needs no filesystem.
import { extractBindings } from "./i18n-manifest.mjs";

/**
 * checkRenderedPage(html) -> string[] of French problems, empty when fine.
 *
 * Mirrors gates A and C of checkI18n() exactly — same extractBindings, same
 * conditions, deliberately the same wording, so an owner who somehow meets one
 * of these reads the same sentence the build would have printed.
 *
 * Gate B (a trip key shadowing the shared dictionary) is NOT reproduced here:
 * it needs the shared dictionary from disk, and the admin's editors generate
 * keys from the trip's own keyPrefix, so a collision with a shared key is not
 * reachable through the dashboard. The build still enforces it.
 */
export function checkRenderedPage(html) {
  const problems = [];
  const bindings = extractBindings(String(html || ""));

  // A. One key bound to two different French strings. The translation can only
  //    store one, so publishing this silently breaks whichever element loses.
  //    Reachable by a list editor that renumbers keys after a delete — which is
  //    precisely why the editors assign max+1 and never renumber.
  const firstFr = new Map();
  const clashed = new Map();
  for (const b of bindings) {
    if (!firstFr.has(b.key)) firstFr.set(b.key, b.fr);
    else if (firstFr.get(b.key) !== b.fr && !clashed.has(b.key)) {
      clashed.set(b.key, [firstFr.get(b.key), b.fr]);
    }
  }
  for (const [key, [a, b]] of clashed) {
    problems.push(
      `clé i18n "${key}" liée à deux textes français différents — la traduction en cassera un ` +
      `(${JSON.stringify(a)} vs ${JSON.stringify(b)})`
    );
  }

  // C. Empty French. The single most likely way an owner breaks the build:
  //    clear a field that happens to carry a translation binding. Every visible
  //    text on a trip page carries one.
  for (const key of new Set(bindings.filter((b) => !b.fr || !b.fr.trim()).map((b) => b.key))) {
    problems.push(`clé i18n "${key}": texte français vide — ce champ ne peut pas rester vide`);
  }

  return problems;
}
