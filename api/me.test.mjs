// api/me.test.mjs
// The dashboard's "am I allowed in?" probe. It is the smallest privileged
// endpoint, which is exactly why it is worth pinning down: the admin UI decides
// whether to render the editor at all from this answer, so a `me` that says yes
// to a stranger unlocks the whole dashboard shell.
//
// Same harness as the other api/*.test.mjs files: verifyAdmin reaches Supabase
// only through global fetch(), so t.mock.method(globalThis, "fetch") sees
// everything and can prove when nothing was sent at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./me.mjs";

process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com, second@x.io";

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function fakeReq({ method = "GET", auth = "Bearer tok", query, ...rest } = {}) {
  const headers = {};
  if (auth !== null) headers.authorization = auth;
  return { method, headers, ...(query ? { query } : {}), ...rest };
}

function makeFetch({ authOk = true, adminEmail = "owner@example.com" } = {}) {
  const calls = { auth: 0 };
  const urls = [];
  const fn = async (url) => {
    const u = String(url);
    urls.push(u);
    if (u.includes("/auth/v1/user")) {
      calls.auth++;
      if (!authOk) return { ok: false, status: 401, json: async () => ({}) };
      // adminEmail === null models a 200 from Supabase with no email on the user.
      return { ok: true, status: 200, json: async () => (adminEmail === null ? {} : { email: adminEmail }) };
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  return { fn, calls, urls };
}

// ---- Gate ordering --------------------------------------------------------------

test("non-GET → 405 with ZERO fetch calls", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  for (const method of ["POST", "PUT", "DELETE", "PATCH", "HEAD"]) {
    const res = fakeRes();
    await handler(fakeReq({ method }), res);
    assert.equal(res.statusCode, 405, `${method} should be 405`);
  }
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.equal(calls.auth, 0);
});

test("missing bearer → 401 with ZERO fetch calls", async (t) => {
  const { fn } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ auth: null }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.admin, undefined);
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("malformed Authorization header → 401, no token is forwarded anywhere", async (t) => {
  const { fn } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  for (const auth of ["", "Basic dXNlcjpwYXNz", "Bearer", "token abc", "Bearer   "]) {
    const res = fakeRes();
    await handler(fakeReq({ auth }), res);
    assert.equal(res.statusCode, 401, `${JSON.stringify(auth)} should be 401`);
  }
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("invalid session → 401, never {admin:true}", async (t) => {
  const { fn, calls } = makeFetch({ authOk: false });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.auth, 1);
  assert.notEqual(res.body.admin, true);
});

test("valid session but email NOT on ADMIN_EMAILS → 403, never {admin:true}", async (t) => {
  const { fn, calls } = makeFetch({ adminEmail: "stranger@example.com" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.auth, 1);
  assert.notEqual(res.body.admin, true);
  // The rejection must not leak who IS allowed.
  assert.ok(!JSON.stringify(res.body).includes("owner@example.com"));
});

test("a session with no email at all → not admin", async (t) => {
  const { fn } = makeFetch({ adminEmail: null });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 403);
  assert.notEqual(res.body.admin, true);
});

// ---- No path input ------------------------------------------------------------------

test("me takes NO path input: hostile query/body params are inert", async (t) => {
  // The traversal question for this endpoint is whether one exists at all. It has
  // no slug and no repo access, so a hostile parameter must change nothing: the
  // only request made is still the single Supabase auth check.
  const { fn, calls, urls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({
    query: { slug: "../../etc/passwd", path: "../../.env", email: "stranger@example.com" },
    body: { email: "stranger@example.com", admin: true },
  }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.email, "owner@example.com"); // from the verified session only
  assert.equal(calls.auth, 1);
  assert.equal(urls.length, 1);
  for (const u of urls) {
    assert.ok(u.startsWith("https://example.supabase.co/auth/v1/user"), u);
    assert.ok(!u.includes(".."), u);
  }
});

test("the answer comes from the verified session, not from the caller's claim", async (t) => {
  const { fn } = makeFetch({ adminEmail: "second@x.io" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ body: { email: "owner@example.com" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.email, "second@x.io");
});

// ---- Happy path -------------------------------------------------------------------------

test("allowlisted admin → 200 {email, admin:true} after exactly one auth check", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { email: "owner@example.com", admin: true });
  assert.equal(calls.auth, 1);
});
