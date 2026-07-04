#!/usr/bin/env node
import { readFileSync } from "node:fs";
const slug = process.argv[2];
if (!slug) { console.error("usage: node tools/parity.mjs <slug>"); process.exit(2); }
const strip = (s) => s.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\s+$/g, "");
const gen = strip(readFileSync(`site/${slug}/index.html`, "utf8"));
const ref = strip(readFileSync(`docs/design-reference/${slug}.html`, "utf8"));
if (gen === ref) { console.log(`PARITY OK: ${slug}`); process.exit(0); }
const g = gen.split("\n"), r = ref.split("\n");
let shown = 0;
for (let i = 0; i < Math.max(g.length, r.length) && shown < 25; i++) {
  if (g[i] !== r[i]) { console.log(`L${i+1}\n  gen: ${g[i] ?? "<eof>"}\n  ref: ${r[i] ?? "<eof>"}`); shown++; }
}
console.log(`PARITY DIFF: ${slug} — ${shown} differing lines shown`);
process.exit(1);
