// tools/sw-version.test.mjs
// The SW cache version is what stops a returning visitor being served a stale
// page — including stale PRICES. These tests pin the two properties that make
// it safe to derive automatically: it must change when shipped content changes,
// and it must NOT change for reasons that differ between machines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeSwVersion, syncSwVersion, readSwVersion } from "./sw-version.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "swv-"));
  mkdirSync(join(root, "site", "assets", "css"), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, "site", ...rel.split("/"));
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

const BASE = {
  "index.html": "<h1>Tunisie 41.900 DA</h1>\n",
  "assets/css/styles.css": ".a{color:red}\n",
  "sw.js": "const VERSION    = 'v33-old';\n",
};

test("same content -> same version (deterministic)", () => {
  const a = fixture(BASE), b = fixture(BASE);
  try { assert.equal(computeSwVersion(a), computeSwVersion(b)); }
  finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test("CRLF and LF checkouts produce the SAME version", () => {
  // Windows working tree vs Vercel's Linux checkout. Without normalization the
  // two disagree forever and every deploy churns the cache.
  const lf = fixture(BASE);
  const crlf = fixture(Object.fromEntries(
    Object.entries(BASE).map(([k, v]) => [k, v.replace(/\n/g, "\r\n")]),
  ));
  try { assert.equal(computeSwVersion(lf), computeSwVersion(crlf)); }
  finally { rmSync(lf, { recursive: true, force: true }); rmSync(crlf, { recursive: true, force: true }); }
});

test("a changed PRICE changes the version (the whole point)", () => {
  const before = fixture(BASE);
  const after = fixture({ ...BASE, "index.html": "<h1>Tunisie 55.000 DA</h1>\n" });
  try { assert.notEqual(computeSwVersion(before), computeSwVersion(after)); }
  finally { rmSync(before, { recursive: true, force: true }); rmSync(after, { recursive: true, force: true }); }
});

test("sw.js is excluded from its own hash (reaches a fixed point)", () => {
  const a = fixture(BASE);
  const b = fixture({ ...BASE, "sw.js": "const VERSION    = 'v34-something-else';\n" });
  try { assert.equal(computeSwVersion(a), computeSwVersion(b)); }
  finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test("the admin dashboard is not part of the public cache hash", () => {
  const a = fixture(BASE);
  const b = fixture({ ...BASE, "admin/app.js": "console.log('changed')\n" });
  try { assert.equal(computeSwVersion(a), computeSwVersion(b)); }
  finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test("syncSwVersion rewrites ONLY the version literal", () => {
  const src = "// header\nconst VERSION    = 'v33-2026-08-11';\nconst CACHE_NAME = `alliance-${VERSION}`;\n";
  const { source, changed, current } = syncSwVersion(src, "v34-abc123");
  assert.equal(changed, true);
  assert.equal(current, "v33-2026-08-11");
  assert.equal(readSwVersion(source), "v34-abc123");
  assert.equal(source, src.replace("v33-2026-08-11", "v34-abc123")); // nothing else moved
});

test("syncSwVersion is a no-op when already current (keeps builds idempotent)", () => {
  const src = "const VERSION    = 'v34-abc123';\n";
  const { source, changed } = syncSwVersion(src, "v34-abc123");
  assert.equal(changed, false);
  assert.equal(source, src);
});
