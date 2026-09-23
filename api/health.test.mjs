// api/health.test.mjs — the endpoint has no dependencies (no auth, no fetch),
// so these tests need no mocks: they just drive the handler with a fake req/res.
//
// It DOES read two environment variables now (the build identity the dashboard
// polls for), so each test that cares sets and restores them itself rather than
// inheriting whatever the shell happened to export.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./health.mjs";

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

/** Run the handler with an exact env for the two build-identity vars. */
async function withEnv({ commit, deployment }, fn) {
  const prev = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA,
    deployment: process.env.VERCEL_DEPLOYMENT_ID,
  };
  if (commit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
  else process.env.VERCEL_GIT_COMMIT_SHA = commit;
  if (deployment === undefined) delete process.env.VERCEL_DEPLOYMENT_ID;
  else process.env.VERCEL_DEPLOYMENT_ID = deployment;
  try { return await fn(); }
  finally {
    if (prev.commit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = prev.commit;
    if (prev.deployment === undefined) delete process.env.VERCEL_DEPLOYMENT_ID;
    else process.env.VERCEL_DEPLOYMENT_ID = prev.deployment;
  }
}

test("GET → 200 with ok:true and the service name", async () => {
  const res = fakeRes();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, "alliance-travel");
});

test("GET → includes an ISO timestamp derived from a fresh Date", async () => {
  const before = Date.now();
  const res = fakeRes();
  await handler({ method: "GET", headers: {} }, res);
  const after = Date.now();
  assert.equal(typeof res.body.time, "string");
  const t = Date.parse(res.body.time);
  assert.ok(Number.isFinite(t), "time must parse as a date");
  // Generated at request time, so it falls within this call's window.
  assert.ok(t >= before - 1000 && t <= after + 1000);
});

test("GET → reports the running build so the dashboard can confirm a publish", async () => {
  await withEnv({ commit: "abc123def456", deployment: "dpl_xyz" }, async () => {
    const res = fakeRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.body.commit, "abc123def456");
    assert.equal(res.body.deployment, "dpl_xyz");
  });
});

test("GET → build identity is null, never undefined, when the runtime does not expose it", async () => {
  // Reachable two ways: a local static preview, and a Vercel project that does
  // not expose system environment variables to the runtime. The poller reads
  // null as "cannot confirm" and stops; `undefined` would vanish from the JSON
  // body entirely and be indistinguishable from an older deploy's response.
  await withEnv({ commit: undefined, deployment: undefined }, async () => {
    const res = fakeRes();
    await handler({ method: "GET", headers: {} }, res);
    assert.ok("commit" in res.body, "the key must be present even when unset");
    assert.equal(res.body.commit, null);
    assert.equal(res.body.deployment, null);
    assert.equal(res.body.ok, true, "missing build identity is not an outage");
  });
});

test("GET → no-store, so a cached body can never answer 'which build is live?'", async () => {
  const res = fakeRes();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.headers["cache-control"], "no-store");
});

test("non-GET is handled sanely → 405, no throw", async () => {
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const res = fakeRes();
    await handler({ method, headers: {} }, res);
    assert.equal(res.statusCode, 405, `${method} should be 405`);
    assert.ok(res.body.error, `${method} should carry an error message`);
  }
});
