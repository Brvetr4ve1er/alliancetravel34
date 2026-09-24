import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseBearer, isAllowed, supabaseEnv, verifyAdmin } from "./auth.mjs";
import { _reset as _resetRateLimit, AUTH_PROBE } from "./ratelimit.mjs";

// verifyAdmin rate-limits its own Supabase round trip per caller (see the
// comment above the check in auth.mjs). Every fake request below shares one
// clientKey() fallback ("unknown", no x-forwarded-for), so reset the shared
// module-level bucket before each test — otherwise this file's own volume of
// verifyAdmin calls would trip the limiter against itself.
beforeEach(() => { _resetRateLimit(); });

test("parseBearer extracts the token", () => {
  assert.equal(parseBearer({ headers: { authorization: "Bearer abc.def" } }), "abc.def");
  assert.equal(parseBearer({ headers: {} }), null);
});

test("isAllowed is case-insensitive and trims", () => {
  process.env.ADMIN_EMAILS = "Owner@Example.com, second@x.io";
  assert.equal(isAllowed("owner@example.com"), true);
  assert.equal(isAllowed("SECOND@X.IO"), true);
  assert.equal(isAllowed("nobody@x.io"), false);
  assert.equal(isAllowed(""), false);
});

// ---- supabaseEnv precedence -------------------------------------------------------
//
// Not cosmetic: the Vercel<->Supabase marketplace integration injects
// SUPABASE_URL / SUPABASE_ANON_KEY for its OWN database at deploy time. When the
// unprefixed names won, every verifyAdmin call was routed to a stranger project
// and all logins failed with "invalid session". The AT_ names must keep winning.

test("supabaseEnv prefers the AT_-prefixed names over the ones Vercel can clobber", () => {
  const saved = { ...process.env };
  try {
    process.env.AT_SUPABASE_URL = "https://ours.supabase.co";
    process.env.AT_SUPABASE_ANON_KEY = "ours-anon";
    process.env.SUPABASE_URL = "https://marketplace.supabase.co";
    process.env.SUPABASE_ANON_KEY = "theirs-anon";
    assert.deepEqual(supabaseEnv(), { url: "https://ours.supabase.co", anonKey: "ours-anon" });

    delete process.env.AT_SUPABASE_URL;
    delete process.env.AT_SUPABASE_ANON_KEY;
    assert.deepEqual(supabaseEnv(), { url: "https://marketplace.supabase.co", anonKey: "theirs-anon" });
  } finally {
    for (const k of ["AT_SUPABASE_URL", "AT_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) {
      if (k in saved) process.env[k] = saved[k]; else delete process.env[k];
    }
  }
});

// ---- verifyAdmin ------------------------------------------------------------------
//
// This is the single gate in front of every privileged endpoint (get-trip,
// save-trip, revert-trip, status, export-leads). It reaches Supabase only through
// global fetch(), so t.mock.method(globalThis, "fetch") — auto-restored per test —
// intercepts every call and lets each case prove what was (or was not) sent.

// Snapshot/restore the auth-relevant env around one test. `await fn()` and not
// `return fn()`: verifyAdmin reads ADMIN_EMAILS *after* awaiting the auth fetch, so
// restoring at the first suspension point would put the real allowlist back under
// the test's feet mid-flight — which is exactly how the empty-allowlist case first
// "passed" against an allowlist it had never set.
async function withEnv(fn) {
  const keys = ["AT_SUPABASE_URL", "AT_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "ADMIN_EMAILS"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try { return await fn(); } finally {
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
}

function configure() {
  process.env.AT_SUPABASE_URL = "https://example.supabase.co";
  process.env.AT_SUPABASE_ANON_KEY = "anon-key";
  process.env.ADMIN_EMAILS = "owner@example.com";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
}

const req = (auth) => ({ headers: auth === null ? {} : { authorization: auth } });

test("verifyAdmin: no bearer → 401 without contacting the auth server", async (t) => {
  await withEnv(async () => {
    configure();
    const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not be called"); });
    const out = await verifyAdmin(req(null));
    assert.deepEqual(out, { ok: false, status: 401, error: "missing bearer token" });
    assert.equal(fetchMock.mock.calls.length, 0);
  });
});

test("verifyAdmin: forwards the caller's own bearer to Supabase with the anon apikey", async (t) => {
  await withEnv(async () => {
    configure();
    let url, opts;
    t.mock.method(globalThis, "fetch", async (u, o) => {
      url = String(u); opts = o;
      return { ok: true, status: 200, json: async () => ({ email: "owner@example.com" }) };
    });
    const out = await verifyAdmin(req("Bearer caller.jwt.here"));
    assert.deepEqual(out, { ok: true, email: "owner@example.com" });

    // Exactly the caller's token — no service-role key, no elevated credential.
    assert.equal(url, "https://example.supabase.co/auth/v1/user");
    assert.equal(opts.headers.Authorization, "Bearer caller.jwt.here");
    assert.equal(opts.headers.apikey, "anon-key");
  });
});

test("verifyAdmin: Supabase 200 but no email on the user → 403, fails closed", async (t) => {
  await withEnv(async () => {
    configure();
    for (const user of [{}, { email: null }, { email: "" }, { id: "uuid-only" }, null]) {
      t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, json: async () => user }));
      const out = await verifyAdmin(req("Bearer tok"));
      assert.equal(out.ok, false, `${JSON.stringify(user)} must not authorise`);
      assert.equal(out.status, 403);
      t.mock.restoreAll();
    }
  });
});

test("verifyAdmin: authenticated but not on ADMIN_EMAILS → 403", async (t) => {
  await withEnv(async () => {
    configure();
    t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, json: async () => ({ email: "stranger@example.com" }) }));
    const out = await verifyAdmin(req("Bearer tok"));
    assert.deepEqual(out, { ok: false, status: 403, error: "not authorized" });
  });
});

test("verifyAdmin: an EMPTY ADMIN_EMAILS allowlist authorises nobody", async (t) => {
  await withEnv(async () => {
    configure();
    for (const list of ["", "   ", ",,,"]) {
      process.env.ADMIN_EMAILS = list;
      t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, json: async () => ({ email: "owner@example.com" }) }));
      const out = await verifyAdmin(req("Bearer tok"));
      assert.equal(out.ok, false, `ADMIN_EMAILS=${JSON.stringify(list)} must authorise nobody`);
      assert.equal(out.status, 403);
      t.mock.restoreAll();
    }
  });
});

test("verifyAdmin: any non-200 from Supabase → 401 invalid session", async (t) => {
  await withEnv(async () => {
    configure();
    for (const status of [400, 401, 403, 404, 429, 500, 503]) {
      t.mock.method(globalThis, "fetch", async () => ({ ok: false, status, json: async () => ({ email: "owner@example.com" }) }));
      const out = await verifyAdmin(req("Bearer tok"));
      assert.deepEqual(out, { ok: false, status: 401, error: "invalid session" }, `upstream ${status}`);
      t.mock.restoreAll();
    }
  });
});

test("verifyAdmin: fetch throwing (auth server unreachable) → 502, never a pass", async (t) => {
  await withEnv(async () => {
    configure();
    t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
    const out = await verifyAdmin(req("Bearer tok"));
    assert.deepEqual(out, { ok: false, status: 502, error: "auth server unreachable" });
  });
});

test("verifyAdmin: an unreadable body from Supabase → 502, never a pass", async (t) => {
  await withEnv(async () => {
    configure();
    t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("not json"); } }));
    const out = await verifyAdmin(req("Bearer tok"));
    assert.deepEqual(out, { ok: false, status: 502, error: "auth bad response" });
  });
});

// ---- Rate limiting (2026-09-24 professional-gaps audit) --------------------------
//
// A MISSING token short-circuits before any network call or rate-limit check —
// so it must never itself be throttled, no matter how many times it is retried.
// A WRONG-but-present token still costs a real Supabase round trip, and
// verifyAdmin gates eight admin endpoints, so that cost needed its own budget.

test("verifyAdmin: a missing token is never rate-limited — every retry stays a plain 401", async (t) => {
  await withEnv(async () => {
    configure();
    const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not be called"); });
    for (let i = 0; i < AUTH_PROBE.limit + 5; i++) {
      const out = await verifyAdmin(req(null));
      assert.deepEqual(out, { ok: false, status: 401, error: "missing bearer token" });
    }
    assert.equal(fetchMock.mock.calls.length, 0);
  });
});

test("verifyAdmin: a wrong-but-present token is throttled to 429 after AUTH_PROBE.limit attempts", async (t) => {
  await withEnv(async () => {
    configure();
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      return { ok: false, status: 401, json: async () => ({}) };
    });
    for (let i = 0; i < AUTH_PROBE.limit; i++) {
      const out = await verifyAdmin(req("Bearer wrong.jwt"));
      assert.deepEqual(out, { ok: false, status: 401, error: "invalid session" }, `attempt ${i + 1}`);
    }
    assert.equal(calls, AUTH_PROBE.limit); // every attempt so far reached Supabase

    // The next attempt is refused BEFORE it reaches Supabase — the whole point
    // of the budget is to stop spending a round trip on a caller who keeps failing.
    const throttled = await verifyAdmin(req("Bearer wrong.jwt"));
    assert.equal(throttled.ok, false);
    assert.equal(throttled.status, 429);
    assert.equal(throttled.error, "too many requests");
    assert.ok(Number.isFinite(throttled.retryAfter) && throttled.retryAfter > 0);
    assert.equal(calls, AUTH_PROBE.limit); // still — the throttled call made no network request
  });
});

test("verifyAdmin: the rate-limit bucket is namespaced separately from api/me's own AUTH_PROBE call", async (t) => {
  // api/me.mjs already calls limited(req, res, AUTH_PROBE) with the bare
  // clientKey(req) ahead of verifyAdmin. verifyAdmin keys its own check
  // `${clientKey(req)}:verifyAdmin` specifically so the two never share a
  // counter — otherwise a real admin session could be charged twice per
  // request against the same budget. Simulate api/me's own bucket by rate-
  // limiting the bare key directly and confirm verifyAdmin is unaffected.
  const { rateLimit, clientKey } = await import("./ratelimit.mjs");
  await withEnv(async () => {
    configure();
    const bareKey = clientKey(req("Bearer tok"));
    for (let i = 0; i < AUTH_PROBE.limit; i++) rateLimit(bareKey, AUTH_PROBE);
    assert.equal(rateLimit(bareKey, AUTH_PROBE).ok, false); // the bare-key bucket is now exhausted

    t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, json: async () => ({ email: "owner@example.com" }) }));
    const out = await verifyAdmin(req("Bearer tok"));
    assert.deepEqual(out, { ok: true, email: "owner@example.com" }); // untouched by the bare key's exhaustion
  });
});
test("verifyAdmin: unset Supabase env fails CLOSED and leaks the token to nobody", async (t) => {
  await withEnv(async () => {
    configure();
    delete process.env.AT_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.AT_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    // With no base URL the request target is the relative string
    // "undefined/auth/v1/user", which real fetch() rejects before any DNS lookup.
    // The stub makes that deterministic and, crucially, records the target so the
    // test can prove no absolute host was ever contacted.
    const seen = [];
    t.mock.method(globalThis, "fetch", async (u) => {
      seen.push(String(u));
      throw new TypeError("Failed to parse URL from undefined/auth/v1/user");
    });

    const out = await verifyAdmin(req("Bearer tok"));
    assert.equal(out.ok, false);            // misconfiguration is never an open door
    assert.equal(out.status, 502);
    assert.equal(seen.length, 1);
    assert.ok(!/^https?:/i.test(seen[0]), `token aimed at a real host: ${seen[0]}`);
  });
});
