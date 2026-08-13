// api/get-trip.test.mjs
// Read side of the editor: given ?slug=, return the trip JSON + its GitHub blob
// sha. It is a READ, but the slug it is handed still becomes two repo paths, so
// the same gate ordering matters — method, then auth, then slug, then the network.
//
// Same harness as revert-trip.test.mjs / save-trip.test.mjs: every dependency
// (Supabase auth, GitHub contents) reaches the network only through global
// fetch(), so t.mock.method(globalThis, "fetch") intercepts all of it without
// touching a single ES module export binding.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./get-trip.mjs";

process.env.GITHUB_REPO = "owner/repo";
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_BRANCH = "main";
process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com";

const TRIP = { slug: "istanbul", meta: { title: "Istanbul" } };
const MANIFEST = { "meta.title": { en: "Istanbul", ar: "إسطنبول" } };

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function fakeReq(slug, { method = "GET", auth = "Bearer tok" } = {}) {
  const headers = {};
  if (auth !== null) headers.authorization = auth;
  return { method, headers, query: { slug } };
}

// Dispatches every fetch() get-trip.mjs's dependencies can make:
//   - Supabase "/auth/v1/user"                             (verifyAdmin)
//   - GitHub  "/contents/data/trips/<slug>.json"           (the trip)
//   - GitHub  "/contents/data/i18n-manifest/<slug>.json"   (the editing aid)
// `urls` records exactly which repo paths were requested, so a traversal test can
// assert that NO path was ever built from a hostile slug.
function makeFetch({
  authOk = true,
  adminEmail = "owner@example.com",
  tripStatus = 200,
  tripBody = JSON.stringify(TRIP),
  manifestStatus = 200,
} = {}) {
  const calls = { auth: 0, trip: 0, manifest: 0 };
  const urls = [];
  const blob = (body) => ({ ok: true, status: 200, json: async () => ({ content: Buffer.from(body).toString("base64"), sha: "trip-sha" }) });
  const fn = async (url) => {
    const u = String(url);
    if (u.includes("/auth/v1/user")) {
      calls.auth++;
      if (!authOk) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ email: adminEmail }) };
    }
    if (u.includes("/contents/")) {
      urls.push(u);
      if (u.includes("i18n-manifest")) {
        calls.manifest++;
        if (manifestStatus !== 200) return { ok: false, status: manifestStatus, json: async () => ({}) };
        return blob(JSON.stringify(MANIFEST));
      }
      calls.trip++;
      if (tripStatus !== 200) return { ok: false, status: tripStatus, json: async () => ({}) };
      return blob(tripBody);
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  return { fn, calls, urls };
}

// ---- Gate ordering --------------------------------------------------------------

test("non-GET → 405 with ZERO fetch calls", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const res = fakeRes();
    await handler({ method, headers: { authorization: "Bearer tok" }, query: { slug: "istanbul" } }, res);
    assert.equal(res.statusCode, 405, `${method} should be 405`);
  }
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, { auth: 0, trip: 0, manifest: 0 });
});

test("missing bearer → 401 with ZERO fetch calls", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul", { auth: null }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, { auth: 0, trip: 0, manifest: 0 });
});

test("invalid session → 401 and no repo read", async (t) => {
  const { fn, calls } = makeFetch({ authOk: false });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.auth, 1);
  assert.equal(calls.trip, 0);
});

test("valid session but email NOT on ADMIN_EMAILS → 403 and no repo read", async (t) => {
  const { fn, calls } = makeFetch({ adminEmail: "stranger@example.com" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.auth, 1);
  assert.equal(calls.trip, 0);
  assert.equal(calls.manifest, 0);
});

// ---- Slug gate (path traversal) ---------------------------------------------------

test("traversal / malformed slugs → 400 and NO repo path is ever built", async (t) => {
  const hostile = [
    "../../etc/passwd",
    "..%2f",
    "..%2fetc%2fpasswd",
    "Not Valid!",
    "istanbul/../../secrets",
    "istanbul.json",
    "",
    "..",
    "/",
    "../i18n-manifest/istanbul",
    ["istanbul"],            // repeated query param that coerces to a valid slug
    ["istanbul", "bali"],
    undefined,
  ];
  const { fn, calls, urls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  for (const slug of hostile) {
    const res = fakeRes();
    await handler(fakeReq(slug), res);
    assert.equal(res.statusCode, 400, `${JSON.stringify(slug)} should be 400`);
    assert.equal(res.body.error, "invalid slug");
  }
  assert.equal(calls.auth, hostile.length); // auth ran…
  assert.deepEqual(urls, []);               // …and not one contents URL was formed
});

// ---- Happy path --------------------------------------------------------------------

test("happy path: trip + sha + manifest, read from exactly the two expected paths", async (t) => {
  const { fn, calls, urls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.slug, "istanbul");
  assert.deepEqual(res.body.content, TRIP);
  assert.equal(res.body.sha, "trip-sha");
  assert.deepEqual(res.body.manifest, MANIFEST);

  assert.equal(calls.trip, 1);
  assert.equal(calls.manifest, 1);
  assert.ok(urls.some((u) => u.includes("/contents/data/trips/istanbul.json")));
  assert.ok(urls.some((u) => u.includes("/contents/data/i18n-manifest/istanbul.json")));
  // Every path stayed inside its directory.
  for (const u of urls) assert.ok(!u.includes(".."), u);
});

test("a hyphenated slug is accepted and used verbatim", async (t) => {
  const { fn, urls } = makeFetch({ tripBody: JSON.stringify({ slug: "kuala-lumpur" }) });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("kuala-lumpur"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.slug, "kuala-lumpur");
  assert.ok(urls.some((u) => u.includes("/contents/data/trips/kuala-lumpur.json")));
});

// ---- Failure modes -------------------------------------------------------------------

test("missing manifest (404) does NOT fail the editor — manifest is null", async (t) => {
  // A trip added since the last build has no manifest yet; the owner must still
  // be able to open it and fix a French price.
  const { fn } = makeFetch({ manifestStatus: 404 });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.manifest, null);
  assert.deepEqual(res.body.content, TRIP);
});

test("unparseable manifest is ignored, not fatal", async (t) => {
  const { fn } = makeFetch();
  t.mock.method(globalThis, "fetch", async (url) => {
    const u = String(url);
    if (u.includes("i18n-manifest")) return { ok: true, status: 200, json: async () => ({ content: Buffer.from("{ broken").toString("base64"), sha: "m" }) };
    return fn(url);
  });
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.manifest, null);
});

test("missing trip → 404 with a clean message", async (t) => {
  const { fn } = makeFetch({ tripStatus: 404 });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, "trip not found");
});

test("GitHub failure → 502, not a crash", async (t) => {
  const { fn } = makeFetch({ tripStatus: 500 });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 502);
  assert.ok(res.body.error);
});

test("corrupt trip JSON → 500 with a readable reason, never a thrown error", async (t) => {
  const { fn } = makeFetch({ tripBody: "{ not json" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq("istanbul"), res);
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /illisible/);
});
