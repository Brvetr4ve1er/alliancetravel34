// Regression lock for the admin's third-party code path.
//
// site/admin/app.js once did:
//   import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
// No version pin and no integrity check, on the module that holds the session
// authorising repo writes via /api/save-trip. These tests are the tripwire.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const SOURCES = readdirSync(DIR).filter((f) => f.endsWith(".js"));
const read = (f) => readFileSync(join(DIR, f), "utf8");

test("no admin module imports code straight off a CDN", () => {
  // A static ESM import cannot carry an integrity attribute, so whatever it
  // fetches runs unverified. Third-party code belongs behind a <script> tag
  // with SRI + crossorigin (loadSupabaseLib in app.js; anim.js/globe.js/
  // map-base.js on the public site do the same).
  assert.ok(SOURCES.length > 0, "no admin sources found");
  for (const f of SOURCES) {
    assert.equal(
      /^\s*import[^;]*from\s*["']https?:/m.test(read(f)), false,
      `${f} imports from a URL — use an SRI-verified <script> instead`,
    );
  }
});

test("every jsDelivr URL in the admin pins an exact version", () => {
  for (const f of SOURCES) {
    for (const m of read(f).matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/([^"'\s]+)/g)) {
      assert.match(m[1], /@\d+\.\d+\.\d+(?:-[\w.]+)?\//, `${f}: unpinned CDN path "${m[1]}"`);
    }
  }
});

test("the Supabase bundle is loaded with a real SRI hash and crossorigin", () => {
  const src = read("app.js");
  // sha384 is 48 bytes → exactly 64 unpadded base64 characters.
  assert.match(src, /^const SB_SRI = "sha384-[A-Za-z0-9+/]{64}";$/m);
  assert.match(src, /\.integrity = SB_SRI;/);
  assert.match(src, /\.crossOrigin = "anonymous";/);
  // An SRI mismatch surfaces as an error event, so onerror must be wired or the
  // failure is silent and the admin hangs on "Chargement…".
  assert.match(src, /\.onerror = \(\) => reject\(/);
});
