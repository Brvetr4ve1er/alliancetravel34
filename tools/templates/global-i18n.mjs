// tools/templates/global-i18n.mjs
// Build-time loader for the sitewide translation dictionary.
//
// The browser owns the canonical dictionary as `const T = { fr, en, ar }` inside
// site/assets/js/i18n.js (a classic IIFE script, not a module). Rather than
// duplicate ~1000 lines of translations into the build — which would drift —
// this reads that file, slices out the `T` object literal, and evaluates it.
// The literal is pure data (strings only, verified: no functions, no template
// literals, no variable references), and it's our own repository content, so
// evaluating it here is safe — the same technique tools/templates/codecs.mjs
// already uses for the TRIP_DATA blob.
//
// One source of truth, read two ways: the browser executes i18n.js directly,
// the generator slices the same T out of it. sliceTLiteral() throws if the
// `const T = {` literal goes missing or unbalanced; note a RENAMED inner key
// (e.g. meta.azerbaidjan) is NOT caught and would ship the FR fallback text.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_JS = join(HERE, "..", "..", "site", "assets", "js", "i18n.js");

function sliceTLiteral(src) {
  const start = src.indexOf("const T = {");
  if (start === -1) throw new Error("global-i18n: `const T = {` not found in i18n.js");
  // Walk from the first `{` and balance braces, skipping string/template/comment
  // content so a `{` or `}` inside a translated sentence can't fool the counter.
  let i = src.indexOf("{", start);
  const open = i;
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") i++; // skip escaped char
        i++;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") { // line comment
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") { // block comment
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error("global-i18n: unbalanced braces slicing the T literal");
}

let cached = null;

export function loadGlobalI18n() {
  if (cached) return cached;
  const src = readFileSync(I18N_JS, "utf8");
  const literal = sliceTLiteral(src);
  // Trusted, repo-owned, string-only data literal.
  cached = new Function(`"use strict"; return (${literal});`)();
  return cached;
}
