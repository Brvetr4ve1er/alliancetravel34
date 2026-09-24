// tools/check-admin-lists.mjs
// Every k*-prefixed item property that carries a real translation binding on
// ANY shipped trip must be listed in that list's LIST_SPECS.keys, and
// inferShape() must be able to mint SOMETHING for it — or a brand-new row
// added through the dashboard ships with that binding simply ABSENT. That is
// invisible to every other gate: checkRenderedPage's i18n check only catches a
// binding that is present-but-EMPTY, never one that never existed at all, so
// the render succeeds, the commit lands, and only a bilingual visitor loading
// /en/ or /ar/ ever notices the new sentence never translated.
//
// Mirrors check-admin-fields.mjs's role (a template-vs-editor structural
// check) for the list editors in edit-lists.js, and reuses their REAL
// inferShape() rather than re-implementing key-shape detection — a second
// implementation is a second place for the same assumption to go stale.
//
// Found live 2026-09-24, by an audit that read the trip JSON rather than the
// code's own comment about it: `dates` declared keys:[] under a comment
// claiming no chip carries a binding, when every trip's dateChips do; `faq`
// omitted `kQ`, which binds the QUESTION on 6 of 7 trips (only azerbaidjan
// uses kBtn there) — invisible because the one regression test for "add an
// FAQ item" exercised azerbaidjan only, the one trip where the gap happened
// to be invisible.
//
// Async, unlike check-admin-fields.mjs: edit-lists.js (unlike edit-pages.js)
// is safely importable in plain Node — its own test suite already does
// exactly this — so importing the real LIST_SPECS/inferShape beats
// re-parsing a far more irregular data shape (nested objects, functions) with
// a regex the way FIELDS' flat [label, path, type] triples allow.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const K_PROP_RE = /^k([A-Z]|$)/;
const ATTR_RE = /(data-i18n(?:-html)?)\s*=/;

const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);

export async function checkAdminLists(root) {
  const rel = "site/admin/edit-lists.js";
  let mod;
  try {
    mod = await import(pathToFileURL(join(root, "site", "admin", "edit-lists.js")).href);
  } catch (e) {
    // Unreadable/unparseable module: fail loudly. Checking nothing silently
    // would defeat the gate at exactly the moment it is needed.
    return [{ file: rel, msg: `contrôle des listes admin impossible: ${e.message}` }];
  }
  const { LIST_SPECS, inferShape } = mod;
  if (!Array.isArray(LIST_SPECS) || !LIST_SPECS.length)
    return [{ file: rel, msg: "LIST_SPECS vide ou illisible (format modifié ?)" }];
  if (typeof inferShape !== "function")
    return [{ file: rel, msg: "inferShape introuvable (format modifié ?)" }];

  const tripsDir = join(root, "data", "trips");
  let tripFiles;
  try {
    tripFiles = readdirSync(tripsDir).filter((f) => f.endsWith(".json"));
  } catch (e) {
    return [{ file: rel, msg: `data/trips illisible: ${e.message}` }];
  }

  const errors = [];
  for (const spec of LIST_SPECS) {
    // A `keys` omission only has a behavioural consequence where a row can be
    // ADDED (minted with no key) or REMOVED (its translations orphaned or, for
    // a SHARED key, wrongly deleted out from under a sibling row that still
    // uses it). `hotels` is `addable: false` — no add or delete button ever
    // renders (edit-lists.js:340-341,357) — so neither path is reachable, and
    // several of its k* properties (kRibbon, kPriceLabel, kCta) are in fact
    // SHARED across every hotel card of a trip, not per-item at all: adding
    // them here would be actively wrong advice, since the fix a `keys` entry
    // implies — mint-or-delete per item — is the one thing that must NOT
    // happen to a shared string.
    if (spec.addable === false) continue;
    for (const file of tripFiles) {
      const slug = file.slice(0, -5);
      let content;
      try {
        content = JSON.parse(readFileSync(join(tripsDir, file), "utf8"));
      } catch (e) {
        errors.push({ file: `data/trips/${file}`, msg: `JSON illisible: ${e.message}` });
        continue;
      }
      const arr = getPath(content, spec.path);
      if (!Array.isArray(arr)) continue;

      // Every k*-shaped property this trip's OWN items actually carry a real
      // binding for — read off the data, not assumed, same discipline
      // inferShape itself is built on (invariant 2 in edit-lists.js's header).
      const propsInUse = new Set();
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        for (const k of Object.keys(item)) {
          if (K_PROP_RE.test(k) && ATTR_RE.test(String(item[k] ?? ""))) propsInUse.add(k);
        }
      }

      for (const prop of propsInUse) {
        if (!spec.keys.includes(prop)) {
          errors.push({
            file: rel,
            msg: `LIST_SPECS["${spec.id}"].keys omet "${prop}" — ${slug} l'utilise pour une vraie ` +
                 `traduction ; une ligne ajoutée depuis le tableau de bord ne recevrait aucune clé pour ce champ`,
          });
          continue; // the shape check below is meaningless if it isn't even declared
        }
        if (!inferShape(content, spec, prop)) {
          errors.push({
            file: rel,
            msg: `LIST_SPECS["${spec.id}"].keys inclut "${prop}" mais inferShape() n'en tire rien pour ` +
                 `${slug} — une ligne ajoutée recevrait une clé vide pour ce champ`,
          });
        }
      }
    }
  }
  return errors;
}
