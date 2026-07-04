// tools/templates/trip2.mjs
// Second-generation trip-page renderer. The page is the concatenation of the
// 17 section templates in tools/templates/sections/*.tpl, filled from a
// data/trips/<slug>.json instance. The same templates drive extraction
// (tools/extract-trip.mjs), so the generator and extractor cannot drift.
//
// This supersedes trip.mjs (v21-era markup, kept for reference only) — the
// section templates were derived byte-for-byte from the live 2026 pages and
// verified by round-trip (extract → render) across all 6 single-layout trips.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "./engine.mjs";
import { codecs } from "./codecs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// Page order — matches the live pages' section order exactly.
export const SECTIONS = [
  "head", "nav", "hero", "highlights", "itinerary", "tripmap", "trust",
  "inclus", "faq", "hotels", "calc", "booking", "infoblocks", "related",
  "finalcta", "footer", "scripts",
];

const compiled = new Map();
export function section(name) {
  if (!compiled.has(name)) {
    const tpl = readFileSync(join(HERE, "sections", `${name}.tpl`), "utf8");
    compiled.set(name, compile(tpl, codecs));
  }
  return compiled.get(name);
}

export function renderTrip(data) {
  return SECTIONS.map((name) => section(name).render(data)).join("");
}
