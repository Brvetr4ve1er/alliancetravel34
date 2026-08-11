// api/save-trip.test.mjs
// The price-coherence gate. A save whose price copies disagree must be REJECTED
// here (422) and never committed — otherwise save-trip commits a green "Publié ✓"
// that then fails tools/build.mjs's checkValueGraph, so the Vercel build breaks
// and the site silently never updates (and stays broken until the JSON is hand-
// fixed). Every dependency (Supabase auth, GitHub) is reached through global
// fetch(), so stubbing globalThis.fetch with node:test's `mock` intercepts all
// network without touching any ES-module export binding.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler from "./save-trip.mjs";

process.env.GITHUB_REPO = "owner/repo";
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_BRANCH = "main";
process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com";

// A real, coherent trip — passes schema + render + the price graph as-is, so it
// is the honest baseline: the only difference in the reject case is a broken price.
const REAL = JSON.parse(readFileSync("data/trips/istanbul.json", "utf8"));

function fakeRes() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; return this; },
  };
}
function fakeReq(body) {
  return { method: "POST", headers: { authorization: "Bearer tok" }, body };
}

// Dispatches every fetch save-trip can make:
//   - Supabase "/auth/v1/user"          (verifyAdmin)
//   - GitHub   "/git/trees/..."         (listTree — returned truncated so image
//                                         existence is skipped: structure-only validation)
//   - GitHub   "/contents/<path>" GET   (getFile — current sha)
//   - GitHub   "/contents/<path>" PUT   (putFile — the commit we must NOT reach on a bad edit)
// `calls.put` counts commits.
function makeFetch() {
  const calls = { auth: 0, tree: 0, get: 0, put: 0 };
  const fn = async (url, opts = {}) => {
    const method = opts.method || "GET";
    if (url.includes("/auth/v1/user")) { calls.auth++; return { ok: true, status: 200, json: async () => ({ email: "owner@example.com" }) }; }
    if (url.includes("/git/trees/"))   { calls.tree++; return { ok: true, status: 200, json: async () => ({ tree: [], truncated: true }) }; }
    if (url.includes("/contents/") && method === "GET") { calls.get++; return { ok: true, status: 200, json: async () => ({ content: Buffer.from("{}").toString("base64"), sha: "current-sha" }) }; }
    if (url.includes("/contents/") && method === "PUT") { calls.put++; return { ok: true, status: 200, json: async () => ({ commit: { html_url: "https://github.com/owner/repo/commit/x" } }) }; }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  };
  return { fn, calls };
}

test("rejects a price-inconsistent edit with 422 and never commits", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);

  // Break ONE price copy: hero.priceFrom no longer equals the calculator's
  // headline double. Valid currency format (passes schema + render) but wrong value.
  const content = structuredClone(REAL);
  content.slug = "istanbul";
  content.hero.priceFrom = "999.999 DA";

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content, sha: "sha" }), res);

  assert.equal(res.statusCode, 422);
  assert.ok(Array.isArray(res.body.errors));
  assert.ok(res.body.errors.some((m) => /prix/i.test(m)),
    `expected a price error, got ${JSON.stringify(res.body.errors)}`);
  assert.equal(calls.put, 0); // never committed
});

test("a coherent edit passes the price gate and commits once", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);

  const content = structuredClone(REAL);
  content.slug = "istanbul";

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content, sha: "sha" }), res);

  assert.equal(res.statusCode, 200,
    `expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.ok, true);
  assert.equal(calls.put, 1);
});
