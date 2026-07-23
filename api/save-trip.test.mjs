// api/save-trip.test.mjs
// Exercises the endpoint's auth -> validate -> dry-run -> commit sequencing.
// api/_lib/github.mjs and api/_lib/auth.mjs both talk to the network only via
// the global fetch(), so stubbing globalThis.fetch with node:test's built-in
// `mock` (via t.mock.method, auto-restored per test) intercepts every call —
// Supabase auth check, GitHub tree listing, and GitHub content reads/writes —
// without needing to touch any ES module export bindings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler from "./save-trip.mjs";

const goodContent = JSON.parse(readFileSync(new URL("../data/trips/istanbul.json", import.meta.url), "utf8"));

process.env.GITHUB_REPO = "owner/repo";
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_BRANCH = "main";
process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com";

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function fakeReq(body) {
  return { method: "POST", headers: { authorization: "Bearer tok" }, body };
}

// Dispatches every fetch() call save-trip.mjs's dependencies can make:
//   - Supabase "/auth/v1/user"           (api/_lib/auth.mjs verifyAdmin)
//   - GitHub "/git/trees/<branch>"       (api/_lib/github.mjs listTree)
//   - GitHub "/contents/<path>" GET/PUT  (api/_lib/github.mjs getFile/putFile)
// `truncated: true` on the tree response makes save-trip.mjs's imageExists
// null, which is exactly how validateTrip is told to skip image-path checks
// (see the "A truncated tree cannot prove absence" comment in github.mjs) —
// letting these tests reuse a real trip fixture without staging fake images.
function makeFetch({ authOk = true, putBehavior = "ok", getShaResponse = "fresh-sha" } = {}) {
  let putCalls = 0;
  const calls = { auth: 0, tree: 0, getContents: 0, putContents: 0 };
  const fn = async (url, opts = {}) => {
    const method = opts.method || "GET";
    if (url.includes("/auth/v1/user")) {
      calls.auth++;
      if (!authOk) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ email: "owner@example.com" }) };
    }
    if (url.includes("/git/trees/")) {
      calls.tree++;
      return { ok: true, status: 200, json: async () => ({ tree: [], truncated: true }) };
    }
    if (url.includes("/contents/") && method === "GET") {
      calls.getContents++;
      return { ok: true, status: 200, json: async () => ({ content: Buffer.from("{}").toString("base64"), sha: getShaResponse }) };
    }
    if (url.includes("/contents/") && method === "PUT") {
      putCalls++;
      calls.putContents++;
      if (putBehavior === "conflict-then-ok" && putCalls === 1) return { ok: false, status: 409, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ commit: { html_url: "https://github.com/owner/repo/commit/abc" } }) };
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  };
  return { fn, calls };
}

test("rejects non-POST requests before touching the network", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, { auth: 0, tree: 0, getContents: 0, putContents: 0 });
});

test("auth failure short-circuits — validate/render/commit never run", async (t) => {
  const { fn, calls } = makeFetch({ authOk: false });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: goodContent }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.auth, 1);
  assert.equal(calls.tree, 0);
  assert.equal(calls.putContents, 0);
});

test("schema validation failure returns 422 and never reaches commit", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const bad = structuredClone(goodContent);
  delete bad.meta.title; // required by validateTrip
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: bad }), res);
  assert.equal(res.statusCode, 422);
  assert.ok(Array.isArray(res.body.errors));
  assert.ok(res.body.errors.some((m) => m.includes("meta.title")));
  assert.equal(calls.tree, 1); // listTree runs before validate
  assert.equal(calls.putContents, 0);
});

test("dry-run render failure (schema-valid but unrenderable) blocks commit", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const bad = structuredClone(goodContent);
  delete bad.calcUi.titleHtml; // not checked by validateTrip, but required by the templates
  // Confirm the fixture actually isolates the render-only gate before asserting on it.
  const { validateTrip } = await import("../tools/validate-trip.mjs");
  assert.deepEqual(validateTrip("data/trips/istanbul.json", bad, { enabled: true, imageExists: null }).errors, []);

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: bad }), res);
  assert.equal(res.statusCode, 422);
  assert.ok(res.body.errors[0].includes("rendu impossible"));
  assert.equal(calls.putContents, 0);
});

test("successful edit: fetches the sha then commits exactly once with the right slug/content", async (t) => {
  const { fn, calls } = makeFetch();
  let putUrl, putBody;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") { putUrl = url; putBody = JSON.parse(opts.body); }
    return fn(url, opts);
  });

  const content = structuredClone(goodContent);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content }), res); // no sha → getFile runs first
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.commitUrl);
  assert.equal(calls.getContents, 1);
  assert.equal(calls.putContents, 1);
  assert.ok(putUrl.endsWith("/contents/data/trips/istanbul.json"));
  assert.equal(putBody.sha, "fresh-sha");
  const decoded = Buffer.from(putBody.content, "base64").toString("utf8");
  assert.equal(decoded, JSON.stringify(content, null, 2) + "\n");
});

test("stale sha (409) is retried exactly once: refetch sha, then commit succeeds", async (t) => {
  const { fn, calls } = makeFetch({ putBehavior: "conflict-then-ok", getShaResponse: "fresh-sha" });
  t.mock.method(globalThis, "fetch", fn);

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: goodContent, sha: "stale-sha" }), res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.commitUrl);
  assert.equal(calls.putContents, 2); // first attempt (409) + retry
  assert.equal(calls.getContents, 1); // only the retry re-fetches the sha
});

test("invalid slug is rejected before any network call", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "Not Valid!", content: goodContent }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.tree, 0);
  assert.equal(calls.putContents, 0);
});
