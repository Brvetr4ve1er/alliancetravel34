// tools/sw-version.mjs
// The service-worker cache version, derived from what the site actually ships.
//
// WHY THIS EXISTS: site/sw.js carried a hand-written `VERSION` with the rule
// "bump on every release". Nobody bumped it — it sat at v33-2026-08-11 through
// a week of deploys (price corrections included). A stale SW cache serves the
// OLD page to returning visitors, so a forgotten bump means clients can be
// quoted prices we already corrected. A manual step on the critical path of
// price accuracy is not a safe design; the build derives it instead.
//
// DETERMINISM RULES (both matter, and both have bitten this repo):
//  1. Line endings are normalized before hashing. The working tree is CRLF on
//     Windows and LF on Vercel's Linux checkout; hashing raw bytes would give
//     two different versions for identical content and churn on every deploy.
//  2. Paths are sorted and stored POSIX-style, so readdir order and the
//     platform separator cannot change the hash.
//
// sw.js itself is EXCLUDED from the hash: its own VERSION line is the output,
// so including it would never reach a fixed point.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Bump when the SW's own logic changes meaning (not its content) — the hash
// covers everything else.
const EPOCH = "v34";

const TEXT_EXT = new Set([".html", ".css", ".js", ".webmanifest"]);
const BIN_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".ico"]);
const SKIP_DIRS = new Set(["admin"]); // dashboard is not part of the public cache

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out);
    } else out.push(join(dir, e.name));
  }
  return out;
}

/**
 * computeSwVersion(root) -> "v34-<12 hex>"
 * Hashes every public asset the SW may serve. Text files by normalized
 * content; binaries by path + byte length (cheap, deterministic, and enough to
 * catch a replaced image).
 */
export function computeSwVersion(root) {
  const siteDir = join(root, "site");
  const swPath = join(siteDir, "sw.js");
  const h = createHash("sha256");

  const files = walk(siteDir)
    .filter((f) => f !== swPath)
    .map((f) => ({ abs: f, rel: relative(siteDir, f).split(sep).join("/") }))
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  for (const { abs, rel } of files) {
    const dot = rel.lastIndexOf(".");
    const ext = dot === -1 ? "" : rel.slice(dot).toLowerCase();
    if (TEXT_EXT.has(ext)) {
      const text = readFileSync(abs, "utf8").replace(/\r\n?/g, "\n");
      h.update(rel).update("\0").update(text).update("\0");
    } else if (BIN_EXT.has(ext)) {
      h.update(rel).update("\0").update(String(statSync(abs).size)).update("\0");
    }
  }
  return `${EPOCH}-${h.digest("hex").slice(0, 12)}`;
}

const VERSION_RE = /(const VERSION\s*=\s*')([^']*)(';)/;

/** Read the VERSION currently written in an sw.js source string. */
export function readSwVersion(src) {
  const m = src.match(VERSION_RE);
  return m ? m[2] : null;
}

/**
 * syncSwVersion(src, version) -> { source, changed, current }
 * Rewrites only the VERSION literal, leaving the rest of the file byte-identical.
 */
export function syncSwVersion(src, version) {
  const current = readSwVersion(src);
  if (current === null) return { source: src, changed: false, current: null };
  if (current === version) return { source: src, changed: false, current };
  return { source: src.replace(VERSION_RE, `$1${version}$3`), changed: true, current };
}
