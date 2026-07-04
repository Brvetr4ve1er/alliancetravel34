#!/usr/bin/env node
// tools/extract-trip.mjs
// Migration tool: parse a live trip page into data/trips/<slug>.json.
//
//   node tools/extract-trip.mjs <slug> [--write]
//
// Steps:
//   1. canonicalize(live bytes)      — documented markup normalizations only
//   2. extract via the section tpls  — inverse of tools/templates/trip2.mjs
//   3. verify the round-trip:
//        render(data) == canonical page byte-for-byte outside inline scripts,
//        and re-extract(render(data)) deep-equals data (script blobs are
//        canonically re-serialized, so they're compared as parsed values)
//   4. with --write: save data/trips/<slug>.json
//
// The tool REFUSES to write when verification fails.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "./templates/engine.mjs";
import { codecs } from "./templates/codecs.mjs";
import { canonicalize, withoutInlineScripts } from "./templates/canon.mjs";
import { SECTIONS, renderTrip } from "./templates/trip2.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const WRITE = process.argv.includes("--write");
if (!slug) {
  console.error("usage: node tools/extract-trip.mjs <slug> [--write]");
  process.exit(2);
}

// One compiled template for the whole page — same source as the renderer.
const fullTpl = SECTIONS
  .map((n) => readFileSync(join(ROOT, "tools", "templates", "sections", `${n}.tpl`), "utf8"))
  .join("");
const page = compile(fullTpl, codecs);

const rawWithBom = readFileSync(join(ROOT, "site", slug, "index.html"), "utf8");
const raw = rawWithBom.replace(/^﻿/, "");
const canon = canonicalize(raw);

const data = page.extract(canon);

// Cleanup: conditionals over OPTIONAL blocks leave `false` markers when the
// block is absent; drop them so the JSON stays clean. (Real boolean flags —
// open/active — are kept, false included.)
const OPTIONAL_KEYS = new Set(["tags", "i18n", "sub", "note", "adultsHint", "tierTabs", "ledeHtml", "noteHtml", "dateHint", "heroKeys"]);
function clean(node) {
  if (Array.isArray(node)) { node.forEach(clean); return node; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (v === false && OPTIONAL_KEYS.has(k)) delete node[k];
      else clean(v);
    }
  }
  return node;
}
clean(data);

data.slug ??= slug; // head derives URLs from it; assert consistency below
if (data.slug !== slug) {
  console.error(`❌ slug mismatch: file says ${data.slug}, directory is ${slug}`);
  process.exit(1);
}

// ── Verification ────────────────────────────────────────────────────
const out = renderTrip(data);
const okHtml = withoutInlineScripts(out) === withoutInlineScripts(canon);
const okData = JSON.stringify(clean(page.extract(out))) === JSON.stringify(data);

// Count lines that differ between raw and canon as multisets (line-shift safe).
const canonDelta = (() => {
  const count = (arr) => arr.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const a = count(raw.split("\n")), b = count(canon.split("\n"));
  let d = 0;
  for (const [l, n] of a) d += Math.max(0, n - (b.get(l) ?? 0));
  for (const [l, n] of b) d += Math.max(0, n - (a.get(l) ?? 0));
  return d;
})();

console.log(`page bytes: ${raw.length} | canon-rule deltas: ${canonDelta} line(s)`);
console.log(`render == canon page (outside scripts): ${okHtml ? "✅" : "❌"}`);
console.log(`re-extract(render) deep-equals data:    ${okData ? "✅" : "❌"}`);

if (!okHtml) {
  const A = withoutInlineScripts(out), B = withoutInlineScripts(canon);
  let i = 0;
  while (i < Math.min(A.length, B.length) && A[i] === B[i]) i++;
  console.error(`first divergence at ${i}:`);
  console.error(`  render: ${JSON.stringify(A.slice(Math.max(0, i - 60), i + 100))}`);
  console.error(`  canon : ${JSON.stringify(B.slice(Math.max(0, i - 60), i + 100))}`);
}
if (!okHtml || !okData) process.exit(1);

if (WRITE) {
  const file = join(ROOT, "data", "trips", `${slug}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`✅ wrote data/trips/${slug}.json (${JSON.stringify(data).length} bytes of data)`);
} else {
  console.log("(dry run — pass --write to save the JSON)");
}
