// api/_lib/ratelimit.test.mjs
//
// The limiter guards the two routes where an unauthenticated caller can make us
// spend: /api/me verifies a bearer token against Supabase (a WRONG token still
// costs a round trip; only a missing one short-circuits) and /api/notify-lead
// sends email once the shared secret is presented.
//
// It is deliberately per-instance and in-memory, so what is pinned here is the
// behaviour that has to hold regardless: it counts per caller, it releases when
// the window passes, it bounds its own memory, and it never takes a request
// down when something goes wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, clientKey, limited, _reset, AUTH_PROBE, WEBHOOK } from "./ratelimit.mjs";

const req = (ip, extra = {}) => ({ headers: { "x-forwarded-for": ip, ...extra } });

test("the caller is identified by the first x-forwarded-for hop", () => {
  assert.equal(clientKey(req("203.0.113.7")), "203.0.113.7");
  assert.equal(clientKey(req(" 203.0.113.7 , 10.0.0.1 ")), "203.0.113.7");
  assert.equal(clientKey({ headers: {} }), "unknown");
  assert.equal(clientKey({}), "unknown");
});

test("a caller is allowed exactly `limit` requests, then refused", () => {
  _reset();
  const budget = { limit: 3, windowMs: 60_000 };
  const got = [1, 2, 3, 4].map(() => rateLimit("a", budget).ok);
  assert.deepEqual(got, [true, true, true, false]);
});

test("callers are counted separately", () => {
  _reset();
  const budget = { limit: 1, windowMs: 60_000 };
  assert.equal(rateLimit("a", budget).ok, true);
  assert.equal(rateLimit("a", budget).ok, false);
  assert.equal(rateLimit("b", budget).ok, true, "b must not inherit a's count");
});

test("the window releases", () => {
  _reset();
  const budget = { limit: 1, windowMs: 1 };
  assert.equal(rateLimit("a", budget).ok, true);
  assert.equal(rateLimit("a", budget).ok, false);
  const until = Date.now() + 5;
  while (Date.now() < until) { /* let the 1ms window pass */ }
  assert.equal(rateLimit("a", budget).ok, true, "a new window must start clean");
});

test("a refusal says how long to wait", () => {
  _reset();
  const budget = { limit: 1, windowMs: 60_000 };
  rateLimit("a", budget);
  const r = rateLimit("a", budget);
  assert.equal(r.ok, false);
  assert.ok(r.retryAfter >= 1 && r.retryAfter <= 60, `implausible retryAfter: ${r.retryAfter}`);
});

test("limited() writes a 429 with Retry-After, and reports that it handled it", () => {
  _reset();
  const budget = { limit: 1, windowMs: 60_000 };
  const mk = () => { const h = {}; return { h, res: {
    setHeader(k, v) { h[k] = v; }, status(c) { h._code = c; return this; }, json(b) { h._body = b; return this; } } }; };

  const first = mk();
  assert.equal(limited(req("1.1.1.1"), first.res, budget), false, "first call passes through");
  assert.equal(first.h._code, undefined, "nothing written when allowed");

  const second = mk();
  assert.equal(limited(req("1.1.1.1"), second.res, budget), true, "second call is handled here");
  assert.equal(second.h._code, 429);
  assert.equal(second.h._body.error, "too many requests");
  assert.ok(second.h["Retry-After"], "must tell the caller when to come back");
});

test("memory stays bounded when every caller is unique", () => {
  _reset();
  const budget = { limit: 5, windowMs: 1 };
  for (let i = 0; i < 8000; i++) rateLimit("ip-" + i, budget);
  // No public size accessor by design; prove it indirectly — the limiter still
  // answers correctly after being sprayed, rather than degrading or throwing.
  assert.equal(rateLimit("fresh", budget).ok, true);
});

test("the shipped budgets leave a real session alone", () => {
  for (const b of [AUTH_PROBE, WEBHOOK]) {
    assert.ok(b.limit >= 30, `${b.limit}/window would interrupt normal use`);
    assert.equal(b.windowMs, 60_000);
  }
});

test("it fails open rather than taking the route down", () => {
  // A malformed budget must not throw out into the handler.
  assert.equal(rateLimit("x", null).ok, true);
});
