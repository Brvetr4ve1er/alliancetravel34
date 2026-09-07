// api/export-leads.test.mjs
// The handler reaches the network only through global fetch() — once for verifyAdmin's
// Supabase "/auth/v1/user" check (api/_lib/auth.mjs) and once for the "/rest/v1/leads"
// read — so stubbing globalThis.fetch with node:test's `mock` (auto-restored per test)
// intercepts both and lets each test assert whether leads were fetched at all.
//
// The FILE FORMATS themselves are not retested here: every byte now comes from
// site/admin/export.js, whose own suite (site/admin/export.test.mjs) covers CSV
// escaping, XLSX typing and the ZIP container. What is left for this file is the
// endpoint's contract — the gate, the dormancy, the service-role read, and that the
// right bytes leave with the right headers.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler, { pickFormat, LEAD_FIELDS } from "./export-leads.mjs";
import { FORMATS } from "../site/admin/export.js";

// Minimal RFC-4180 reader, used to prove that guarding a cell against formula
// injection does not damage ordinary values.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === "") { quoted = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r" && text[i + 1] === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 2; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Configured (active) baseline. Individual tests override env in try/finally.
process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
delete process.env.AT_SUPABASE_SERVICE_ROLE_KEY;

const SAMPLE = [
  {
    id: 1, created_at: "2026-07-23T10:00:00Z", status: "nouveau",
    name: "Yacine B.", phone: "0555 12 34 56", city: "Oran", trip: "Istanbul",
    hotel: "Grand Hôtel", date: "12 août", room: "double", adults: 2, kids: 1,
    total_da: 185000, channel: "whatsapp", page: "/istanbul/", notes: "Voyage de noces",
  },
  {
    id: 2, created_at: "2026-07-22T09:00:00Z", status: "conclu",
    name: 'O\'Brien, "Sam"', phone: "0770 00 11 22", city: "Alger", trip: "Le Caire",
    hotel: null, date: null, room: null, adults: 1, kids: 0,
    total_da: 90000, channel: "email", page: "/egypte/",
    notes: "Ligne 1\nLigne 2, avec virgule",
  },
];

function fakeRes() {
  return {
    statusCode: null, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; },
  };
}

function fakeReq({ method = "GET", auth = "Bearer tok", query = {} } = {}) {
  const headers = {};
  if (auth !== null) headers.authorization = auth;
  return { method, headers, query };
}

// Dispatches the two fetch() calls the handler's dependencies can make:
//   - Supabase "/auth/v1/user"  (verifyAdmin)  → controlled by adminEmail
//   - Supabase "/rest/v1/leads" (the export)   → returns `rows`
function makeFetch({ adminEmail = "owner@example.com", authOk = true, rows = SAMPLE, leadsOk = true, leadsStatus = 200 } = {}) {
  const calls = { auth: 0, leads: 0 };
  const fn = async (url) => {
    const u = String(url);
    if (u.includes("/auth/v1/user")) {
      calls.auth++;
      if (!authOk) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ email: adminEmail }) };
    }
    if (u.includes("/rest/v1/leads")) {
      calls.leads++;
      return { ok: leadsOk, status: leadsStatus, json: async () => rows };
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  return { fn, calls };
}

// ── The format switch ──────────────────────────────────────────────────
test("pickFormat: known formats pass, anything else falls back to CSV", () => {
  // A backup URL is typed by a human. A working file beats a 400.
  assert.equal(pickFormat({ format: "xlsx" }), "xlsx");
  assert.equal(pickFormat({ format: "JSON" }), "json");
  assert.equal(pickFormat({ format: ["csv", "xlsx"] }), "csv"); // repeated query param
  assert.equal(pickFormat({ format: "pdf" }), "csv");
  assert.equal(pickFormat({}), "csv");
  assert.equal(pickFormat(undefined), "csv");
  // A prototype key must not be mistaken for a format.
  assert.equal(pickFormat({ format: "constructor" }), "csv");
});

// ── The gate ───────────────────────────────────────────────────────────
test("non-GET → 405 before any network call", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ method: "POST" }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(calls.auth + calls.leads, 0);
});

test("non-admin (email not on ADMIN_EMAILS) → 403 and NO leads fetch", async (t) => {
  const { fn, calls } = makeFetch({ adminEmail: "stranger@example.com" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.leads, 0); // PII was never read
});

test("invalid session → 401 and NO leads fetch", async (t) => {
  const { fn, calls } = makeFetch({ authOk: false });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.leads, 0);
});

test("missing bearer token → 401 and NO network call", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ auth: null }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.auth + calls.leads, 0);
});

test("dormant (service key unset) → 503 for a proven admin, no leads fetch", async (t) => {
  const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const { fn, calls } = makeFetch();
    t.mock.method(globalThis, "fetch", fn);
    const res = fakeRes();
    await handler(fakeReq(), res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body.error, /not configured/);
    assert.equal(calls.leads, 0);
    // The dormancy check runs AFTER the admin gate, so a stranger never learns
    // anything about how the deploy is configured.
    assert.equal(calls.auth, 1);
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
  }
});

// ── The payload ────────────────────────────────────────────────────────
test("admin happy path → CSV with French headers and download headers", async (t) => {
  let leadsUrl, leadsOpts;
  const { fn } = makeFetch();
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (String(url).includes("/rest/v1/leads")) { leadsUrl = String(url); leadsOpts = opts; }
    return fn(url, opts);
  });

  const res = fakeRes();
  await handler(fakeReq(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], FORMATS.csv.mime);
  assert.match(res.headers["Content-Disposition"], /attachment; filename="demandes-\d{4}-\d{2}-\d{2}\.csv"/);
  assert.equal(res.headers["Cache-Control"], "no-store");

  // The read used the service-role key, bypassing RLS.
  assert.ok(leadsUrl.includes("/rest/v1/leads"));
  assert.ok(leadsUrl.includes("select=*"));
  assert.equal(leadsOpts.headers.apikey, "service-key");
  assert.match(leadsOpts.headers.Authorization, /^Bearer service-key$/);

  const body = Buffer.from(res.body).toString("utf8");
  assert.ok(body.startsWith("﻿"), "UTF-8 BOM for Excel");
  const lines = body.slice(1).split("\r\n");
  assert.equal(lines[0], LEAD_FIELDS.map((f) => f.label).join(","));
  assert.ok(body.includes("Yacine B."));
  assert.ok(body.includes("185000"));
  assert.ok(body.includes('"O\'Brien, ""Sam"""'));
  assert.ok(body.includes('"Ligne 1\nLigne 2, avec virgule"'));
});

test("?format=xlsx → a real workbook, not a renamed CSV", async (t) => {
  const { fn } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ query: { format: "xlsx" } }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], FORMATS.xlsx.mime);
  assert.match(res.headers["Content-Disposition"], /\.xlsx"$/);
  const buf = Buffer.from(res.body);
  assert.equal(buf.subarray(0, 2).toString("latin1"), "PK"); // ZIP magic
  assert.ok(buf.includes(Buffer.from("xl/worksheets/sheet1.xml")));
  assert.ok(buf.length > 1000);
});

test("?format=json → raw keys and raw values, for re-import", async (t) => {
  const { fn } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ query: { format: "json" } }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], FORMATS.json.mime);
  const parsed = JSON.parse(Buffer.from(res.body).toString("utf8"));
  assert.equal(parsed.count, 2);
  assert.equal(parsed.leads[0].total_da, 185000);              // number, not "185 000 DA"
  assert.equal(parsed.leads[0].created_at, "2026-07-23T10:00:00Z"); // the ISO instant
});

test("the browser and the server export the same columns", async (t) => {
  // These two used to drift — the browser emitted wa_destination and no id, the
  // server the reverse, while a comment in each claimed they were identical.
  // There is now one module, and this asserts the endpoint really uses it.
  const { fn } = makeFetch({ rows: [{ ...SAMPLE[0], wa_destination: "msila" }] });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  const rows = parseCsv(Buffer.from(res.body).toString("utf8").slice(1));
  assert.deepEqual(rows[0], LEAD_FIELDS.map((f) => f.label));
  assert.ok(rows[0].includes("Agence WhatsApp"));
  assert.ok(rows[0].includes("Référence interne"));
  // …and the office slug is resolved to the branch name the owner knows.
  assert.equal(rows[1][rows[0].indexOf("Agence WhatsApp")], "M'Sila");
});

test("end-to-end: a hostile lead name is inert in the downloaded CSV", async (t) => {
  const hostile = [{
    id: 3, created_at: "2026-07-24T08:00:00Z", status: "nouveau",
    name: "=cmd|' /C calc'!A0", phone: "0555 00 00 00", city: "Alger",
    notes: "@SUM(1+1)*cmd|' /C calc'!A0", total_da: -15000,
  }];
  const { fn } = makeFetch({ rows: hostile });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);

  assert.equal(res.statusCode, 200);
  const parsed = parseCsv(Buffer.from(res.body).toString("utf8").slice(1));
  const cell = (label) => parsed[1][parsed[0].indexOf(label)];

  assert.equal(cell("Nom"), "'=cmd|' /C calc'!A0");
  assert.ok(cell("Notes").startsWith("'@"));
  // …and the legitimate negative total is still a number, not text.
  assert.equal(cell("Total (DA)"), "-15000");
  // Nothing in the file starts a field with a raw formula character.
  for (const row of parsed.slice(1)) {
    for (const f of row) {
      assert.ok(!/^[=+\-@\t\r]/.test(f) || /^[+-]?[\d.]/.test(f), `unguarded field: ${JSON.stringify(f)}`);
    }
  }
});

test("empty table → a file with just the header row, never a crash", async (t) => {
  const { fn } = makeFetch({ rows: [] });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 200);
  const body = Buffer.from(res.body).toString("utf8").slice(1);
  assert.equal(body, LEAD_FIELDS.map((f) => f.label).join(",") + "\r\n");
});

test("supabase error status → 502, not a crash", async (t) => {
  const { fn } = makeFetch({ leadsOk: false, leadsStatus: 500 });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /supabase 500/);
});
