// tools/check-admin-fields.mjs
// Every path in the admin form's FIELDS list must be read by a template.
//
// The dashboard edits an untyped JSON blob through string paths, so a wrong
// path fails silently in both directions: getPath returns undefined and the
// input renders blank (indistinguishable from an empty value), while setPath
// *creates* the key on save. The owner edits, sees "Publié ✓", and the page
// never changes. Two fields shipped that way — "hero.titlePre" (the H1 is
// really hero.h1Pre + hero.h1Em) and "finalCta.scarcity" (the template reads
// finalCta.scarcityHtml, so every save also wrote a junk key).
//
// Nothing at runtime can catch this, so it is a build gate.
//
// The paths come from the template AST, not from grepping the template bytes.
// A regex over the raw text cannot express "is this path", only "do these
// characters appear": {{...}} slots have no left delimiter around the path, so
// any pattern permissive enough to find "hero.priceFrom" inside
// {{=d.hero.priceFrom.replace(...)}} also matches a bare "priceFrom" — which is
// precisely the typo (a dropped object prefix) this gate exists to catch. It
// also matched "bg.jpg" against the string literal '--bg.jpg'. Parsing gives
// exact paths and ignores literals.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./templates/engine.mjs";

// Data references inside a computed slot {{=expr}}. expr is JS over d/item/i/H,
// e.g. d.hero.priceFrom.replace('.',' ') — so the reference carries a trailing
// method name. Registering every prefix lets "hero.priceFrom" match without
// letting "priceFrom" match, since prefixes only ever shorten from the left.
function addExprPaths(src, out) {
  for (const m of src.matchAll(/\bd\.([A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*)/g)) {
    const parts = m[1].split(".");
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join("."));
  }
}

// Absolute data paths a template reads. `scope` tracks the enclosing {{#loop}}
// so item-relative paths ({{.name}}) resolve to something comparable.
function collect(node, scope, out) {
  const abs = (p) => {
    if (p === "." || p.startsWith("..")) return null; // item itself / parent scope
    if (p.startsWith(".")) return scope ? `${scope}.${p.slice(1)}` : p.slice(1);
    return p;
  };
  switch (node.type) {
    case "slot": {
      const p = abs(node.path);
      if (p) out.add(p);
      break;
    }
    case "cond": {
      const p = abs(node.path);
      if (p) out.add(p);
      for (const c of node.children) collect(c, scope, out);
      for (const c of node.elseChildren || []) collect(c, scope, out);
      break;
    }
    case "loop": {
      const p = abs(node.path);
      if (p) out.add(p);
      for (const c of node.children) collect(c, p || scope, out);
      break;
    }
    case "expr":
      addExprPaths(node.src, out);
      break;
    // "codec" carries a codec name, not a data path — a field rendered only
    // through {{&codec}} would be rejected here. None is today; if that changes,
    // teach this function about the codec's inputs rather than loosening it.
    default:
      for (const c of node.children || []) collect(c, scope, out);
  }
}

// FIELDS is a literal array of [label, path, type] triples. Parsing it beats
// importing it: this is a browser script, and a build-time import would drag in
// its DOM globals.
export function parseFields(src) {
  const block = src.match(/const FIELDS = \[([\s\S]*?)\n\];/);
  if (!block) return null;
  const body = block[1].replace(/^\s*\/\/.*$/gm, ""); // drop comment lines
  const out = [];
  const entry = /\[\s*"(?:[^"\\]|\\.)*"\s*,\s*"([^"]+)"\s*,\s*"[^"]*"\s*\]/g;
  let m;
  while ((m = entry.exec(body))) out.push(m[1]);
  return out;
}

export function templatePaths(root) {
  const dir = join(root, "tools", "templates", "sections");
  const paths = new Set();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".tpl")))
    collect(parse(readFileSync(join(dir, f), "utf8")), "", paths);
  return paths;
}

export function checkAdminFields(root) {
  const rel = "site/admin/edit-pages.js";
  const errors = [];

  let fields, known;
  try {
    fields = parseFields(readFileSync(join(root, "site", "admin", "edit-pages.js"), "utf8"));
    known = templatePaths(root);
  } catch (e) {
    // Unreadable form or unparseable template: fail loudly. Checking nothing
    // silently would defeat the gate at exactly the moment it is needed.
    return [{ file: rel, msg: `contrôle des champs admin impossible: ${e.message}` }];
  }
  if (fields === null) return [{ file: rel, msg: "FIELDS introuvable (format modifié ?)" }];
  if (fields.length === 0) return [{ file: rel, msg: "FIELDS vide ou illisible (format modifié ?)" }];

  for (const p of fields) {
    if (!known.has(p))
      errors.push({ file: rel, msg: `champ admin "${p}" n'est lu par aucun template — l'édition serait sans effet` });
  }
  return errors;
}
