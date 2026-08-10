// api/health.test.mjs — the endpoint has no dependencies (no auth, no fetch, no env),
// so these tests need no mocks: they just drive the handler with a fake req/res.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./health.mjs";

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
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

test("non-GET is handled sanely → 405, no throw", async () => {
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const res = fakeRes();
    await handler({ method, headers: {} }, res);
    assert.equal(res.statusCode, 405, `${method} should be 405`);
    assert.ok(res.body.error, `${method} should carry an error message`);
  }
});
