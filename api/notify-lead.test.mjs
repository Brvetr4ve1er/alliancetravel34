// api/notify-lead.test.mjs
// Exercises the endpoint's method → secret → dormancy → send sequencing. The handler
// reaches the network only through global fetch() (a single POST to the Resend HTTP
// API), so stubbing globalThis.fetch with node:test's built-in `mock` (via
// t.mock.method, auto-restored per test) intercepts every send — and lets each test
// assert whether an email was attempted at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./notify-lead.mjs";

// Configured (active) baseline. Individual tests override env in try/finally.
process.env.LEAD_NOTIFY_SECRET = "test-secret";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.OWNER_NOTIFY_EMAIL = "owner@example.com";
delete process.env.LEAD_NOTIFY_FROM; // → handler falls back to the default sender

const SAMPLE = {
  id: 42,
  created_at: "2026-07-23T10:00:00Z",
  status: "nouveau",
  name: "Yacine B.",
  phone: "0555 12 34 56",
  city: "Oran",
  trip: "Istanbul",
  hotel: "Grand Hôtel",
  date: "12 août",
  room: "double",
  adults: 2,
  kids: 1,
  total_da: 185000,
  channel: "whatsapp",
  page: "/istanbul/",
  notes: "Voyage de noces",
};

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function fakeReq({ method = "POST", secret = "test-secret", record = SAMPLE } = {}) {
  const headers = {};
  if (secret !== null) headers["x-notify-secret"] = secret;
  return { method, headers, body: { type: "INSERT", table: "leads", record } };
}

// A fetch stub that records every call and returns a Resend-shaped response.
function makeFetch({ resendOk = true, resendStatus = 200 } = {}) {
  const fn = async (url) => {
    if (String(url).includes("api.resend.com")) {
      return { ok: resendOk, status: resendStatus, json: async () => ({ id: "email_123" }) };
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  return fn;
}

test("rejects non-POST requests before touching the network", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", makeFetch());
  const res = fakeRes();
  await handler(fakeReq({ method: "GET" }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("missing secret header → 401, no email sent", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", makeFetch());
  const res = fakeRes();
  await handler(fakeReq({ secret: null }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchMock.mock.calls.length, 0); // nothing sent to Resend
});

test("wrong secret header → 401, no email sent", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", makeFetch());
  const res = fakeRes();
  await handler(fakeReq({ secret: "not-the-secret" }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("dormant (RESEND_API_KEY unset) → 200 no-op, no fetch attempted", async (t) => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const fetchMock = t.mock.method(globalThis, "fetch", makeFetch());
    const res = fakeRes();
    await handler(fakeReq(), res); // correct secret, but no provider configured
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(fetchMock.mock.calls.length, 0); // did NOT attempt to send
  } finally {
    process.env.RESEND_API_KEY = saved;
  }
});

test("dormant (OWNER_NOTIFY_EMAIL unset) → 200 no-op, no fetch attempted", async (t) => {
  const saved = process.env.OWNER_NOTIFY_EMAIL;
  delete process.env.OWNER_NOTIFY_EMAIL;
  try {
    const fetchMock = t.mock.method(globalThis, "fetch", makeFetch());
    const res = fakeRes();
    await handler(fakeReq(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(fetchMock.mock.calls.length, 0);
  } finally {
    process.env.OWNER_NOTIFY_EMAIL = saved;
  }
});

test("happy path: exactly one POST to Resend carrying the lead + wa.me reply link", async (t) => {
  let sentUrl, sentOpts;
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, opts) => {
    sentUrl = url; sentOpts = opts;
    return { ok: true, status: 200, json: async () => ({ id: "email_123" }) };
  });

  const res = fakeRes();
  await handler(fakeReq(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(fetchMock.mock.calls.length, 1);        // exactly one send
  assert.ok(String(sentUrl).includes("api.resend.com/emails"));
  assert.equal(sentOpts.method, "POST");
  assert.match(sentOpts.headers.Authorization, /^Bearer test-resend-key$/);

  const payload = JSON.parse(sentOpts.body);
  assert.equal(payload.to, "owner@example.com");
  assert.equal(payload.from, "notifications@alliance-travel.dz"); // default sender
  assert.ok(payload.subject.includes("Yacine B."));

  // wa.me link: leading 0 → 213, non-digits stripped (matches admin leads.js).
  assert.ok(payload.text.includes("https://wa.me/213555123456"));
  assert.ok(payload.html.includes("https://wa.me/213555123456"));

  // Total formatted with Intl fr-DZ (+ " DA") — compute the expected the same way
  // to stay robust to the locale's grouping separator.
  const expectedTotal = new Intl.NumberFormat("fr-DZ").format(185000) + " DA";
  assert.ok(payload.text.includes(expectedTotal));

  // Lead fields present in the body.
  assert.ok(payload.text.includes("Oran"));
  assert.ok(payload.text.includes("Istanbul"));
});

test("configurable sender: LEAD_NOTIFY_FROM overrides the default", async (t) => {
  process.env.LEAD_NOTIFY_FROM = "leads@alliance-travel.dz";
  try {
    let sentOpts;
    t.mock.method(globalThis, "fetch", async (url, opts) => {
      sentOpts = opts;
      return { ok: true, status: 200, json: async () => ({ id: "x" }) };
    });
    const res = fakeRes();
    await handler(fakeReq(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(sentOpts.body).from, "leads@alliance-travel.dz");
  } finally {
    delete process.env.LEAD_NOTIFY_FROM;
  }
});

test("Resend non-ok response is surfaced as an error status (not thrown)", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", makeFetch({ resendOk: false, resendStatus: 422 }));
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 502);
  assert.ok(res.body.error.includes("422"));
  assert.equal(fetchMock.mock.calls.length, 1); // it tried once, then reported the failure
});

test("missing record in the webhook body → 400, no email sent", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", makeFetch());
  const res = fakeRes();
  const req = { method: "POST", headers: { "x-notify-secret": "test-secret" }, body: { type: "INSERT" } };
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchMock.mock.calls.length, 0);
});
