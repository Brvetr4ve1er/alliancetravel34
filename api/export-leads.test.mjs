// api/export-leads.test.mjs
// The handler reaches the network only through global fetch() — once for verifyAdmin's
// Supabase "/auth/v1/user" check (api/_lib/auth.mjs) and once for the "/rest/v1/leads"
// read — so stubbing globalThis.fetch with node:test's `mock` (auto-restored per test)
// intercepts both and lets each test assert whether leads were fetched at all. The pure
// CSV helpers are exercised directly, no mocks.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler, { csvCell, csvFormulaGuard, toCsv, leadColumns, LEAD_COLUMNS } from "./export-leads.mjs";

// Minimal RFC-4180 reader, used only to prove that guarding a cell against
// formula injection does not damage ordinary values: parse(toCsv(rows)) must
// hand back exactly what went in. Handles quoted fields, doubled quotes and
// CRLF record separators — the three things csvCell() emits.
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

function fakeReq({ method = "GET", auth = "Bearer tok" } = {}) {
  const headers = {};
  if (auth !== null) headers.authorization = auth;
  return { method, headers };
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

// ---- CSV escaping helper (pure) ---------------------------------------------

test("csvCell: leaves plain values untouched", () => {
  assert.equal(csvCell("Oran"), "Oran");
  assert.equal(csvCell(185000), "185000");
});

test("csvCell: null/undefined → empty string", () => {
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
});

test("csvCell: quotes fields containing a comma", () => {
  assert.equal(csvCell("Alger, Algérie"), '"Alger, Algérie"');
});

test("csvCell: quotes and doubles embedded double-quotes", () => {
  assert.equal(csvCell('Sam "the man"'), '"Sam ""the man"""');
});

test("csvCell: quotes fields containing newlines (CR/LF)", () => {
  assert.equal(csvCell("Ligne 1\nLigne 2"), '"Ligne 1\nLigne 2"');
  assert.equal(csvCell("a\r\nb"), '"a\r\nb"');
});

test("csvCell: objects (jsonb) are JSON-stringified then escaped", () => {
  assert.equal(csvCell({ a: 1, b: "x,y" }), '"{""a"":1,""b"":""x,y""}"');
});

// ---- CSV formula injection (OWASP) -------------------------------------------
//
// name / notes / city reach this table straight off the PUBLIC lead form
// (site/assets/js/lead-capture.js → Supabase INSERT). A value whose first
// character is =, +, -, @, TAB or CR is executed as a FORMULA by Excel,
// LibreOffice and Google Sheets when the owner opens the backup — remote code
// execution on the owner's machine, triggered by a web form. Every one of these
// must come out inert.

test("csvFormulaGuard: neutralises every dangerous leading character", () => {
  assert.equal(csvFormulaGuard("=1+1"), "'=1+1");
  assert.equal(csvFormulaGuard("+1+1"), "'+1+1");
  assert.equal(csvFormulaGuard("-1+1"), "'-1+1");
  assert.equal(csvFormulaGuard("@SUM(A1:A9)"), "'@SUM(A1:A9)");
  assert.equal(csvFormulaGuard("\t=1+1"), "'\t=1+1"); // TAB is stripped by Excel first
  assert.equal(csvFormulaGuard("\r=1+1"), "'\r=1+1"); // …so is CR
});

test("csvCell: the classic DDE payload in a lead name is defused", () => {
  // The payload that shells out; it must be stored as literal text.
  const payload = '=cmd|\' /C calc\'!A0';
  const cell = csvCell(payload);
  assert.ok(cell.startsWith("'="), `expected a leading quote, got ${cell}`);
  assert.ok(!cell.startsWith("="));
});

test("csvCell: guard is applied INSIDE the RFC-4180 quotes, not outside", () => {
  // A dangerous prefix AND a comma: the cell must be quoted for the CSV reader
  // and prefixed for the spreadsheet — in that nesting order, or one of the two
  // protections is lost.
  assert.equal(csvCell("=HYPERLINK(1,2)"), `"'=HYPERLINK(1,2)"`);
  assert.equal(csvCell('=A1&"x"'), `"'=A1&""x"""`);
});

test("csvCell: a legitimate negative number is NOT mangled", () => {
  // A refund / credit in total_da is not a formula. Guarding it would corrupt
  // the owner's arithmetic, so plain numeric literals are left exactly alone.
  assert.equal(csvCell(-15000), "-15000");
  assert.equal(csvCell("-15000"), "-15000");
  assert.equal(csvCell("-1500.75"), "-1500.75");
  assert.equal(csvCell("+42"), "+42");
  assert.equal(csvCell("-1.5e3"), "-1.5e3");
});

test("csvCell: a + phone number that is not a bare numeral IS guarded", () => {
  // "+213 555 12 34 56" is not a number; Excel would evaluate it and show
  // #NAME?. Prefixing both defuses it and makes it display correctly.
  assert.equal(csvCell("+213 555 12 34 56"), "'+213 555 12 34 56");
  assert.equal(csvCell("+213555123456"), "+213555123456"); // bare numeral, untouched
});

test("csvCell: ordinary values keep their previous encoding exactly", () => {
  assert.equal(csvCell("Yacine B."), "Yacine B.");
  assert.equal(csvCell('O\'Brien, "Sam"'), '"O\'Brien, ""Sam"""');
  assert.equal(csvCell("Ligne 1\nLigne 2, avec virgule"), '"Ligne 1\nLigne 2, avec virgule"');
  assert.equal(csvCell("Alger, Algérie"), '"Alger, Algérie"');
  assert.equal(csvCell({ a: 1, b: "x,y" }), '"{""a"":1,""b"":""x,y""}"');
});

test("round-trip: ordinary values survive toCsv → parse unchanged", () => {
  const values = [
    "Yacine B.", 'O\'Brien, "Sam"', "Alger, Algérie", "Ligne 1\nLigne 2, avec virgule",
    "-15000", "185000", "0555 12 34 56", "12 août", "", "Grand Hôtel",
  ];
  const rows = values.map((v, i) => ({ id: i, name: v }));
  const parsed = parseCsv(toCsv(rows, ["id", "name"]));
  assert.deepEqual(parsed[0], ["id", "name"]);
  values.forEach((v, i) => assert.equal(parsed[i + 1][1], v, `value ${i} did not round-trip`));
});

test("round-trip: a guarded value comes back as inert text, prefix and all", () => {
  const parsed = parseCsv(toCsv([{ name: "=1+1" }], ["name"]));
  assert.equal(parsed[1][0], "'=1+1"); // read back as text, never evaluated
});

test("toCsv: header row + CRLF-joined records, trailing CRLF", () => {
  const csv = toCsv([{ id: 1, name: "A" }], ["id", "name"]);
  assert.equal(csv, "id,name\r\n1,A\r\n");
});

test("leadColumns: canonical order, plus any extra data columns appended once", () => {
  const cols = leadColumns([{ id: 1, name: "A", ip_hash: "z" }, { id: 2, extra: "y" }]);
  assert.deepEqual(cols.slice(0, LEAD_COLUMNS.length), LEAD_COLUMNS);
  assert.deepEqual(cols.slice(LEAD_COLUMNS.length), ["ip_hash", "extra"]);
});

// ---- Auth gate ---------------------------------------------------------------

test("non-GET → 405 before any network call", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ method: "POST" }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, { auth: 0, leads: 0 });
});

test("non-admin (email not on ADMIN_EMAILS) → 403 and NO leads fetch", async (t) => {
  const { fn, calls } = makeFetch({ adminEmail: "stranger@example.com" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.auth, 1);
  assert.equal(calls.leads, 0); // PII never read for a non-admin
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
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ auth: null }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, { auth: 0, leads: 0 });
});

// ---- Dormancy ----------------------------------------------------------------

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
    assert.equal(calls.auth, 1); // auth ran…
    assert.equal(calls.leads, 0); // …but nothing was read
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
  }
});

// ---- Happy path --------------------------------------------------------------

test("admin happy path → CSV with header row, escaped fields, and download headers", async (t) => {
  let leadsUrl, leadsOpts;
  const { fn } = makeFetch();
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (String(url).includes("/rest/v1/leads")) { leadsUrl = String(url); leadsOpts = opts; }
    return fn(url, opts);
  });

  const res = fakeRes();
  await handler(fakeReq(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "text/csv; charset=utf-8");
  assert.match(res.headers["Content-Disposition"], /attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"/);

  // The read used the service-role key, bypassing RLS.
  assert.ok(leadsUrl.includes("/rest/v1/leads"));
  assert.ok(leadsUrl.includes("select=*"));
  assert.equal(leadsOpts.headers.apikey, "service-key");
  assert.match(leadsOpts.headers.Authorization, /^Bearer service-key$/);

  const body = String(res.body);
  const lines = body.replace(/^﻿/, "").split("\r\n");
  // Header row is the canonical column order.
  assert.equal(lines[0], LEAD_COLUMNS.join(","));
  // Row 1: plain values.
  assert.ok(body.includes("Yacine B."));
  assert.ok(body.includes("185000"));
  // Row 2: comma-, quote-, and newline-bearing fields are quoted/escaped.
  assert.ok(body.includes('"O\'Brien, ""Sam"""'));
  assert.ok(body.includes('"Ligne 1\nLigne 2, avec virgule"'));
  // BOM present for Excel UTF-8.
  assert.ok(body.startsWith("﻿"));
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
  const body = String(res.body).replace(/^﻿/, "");
  const parsed = parseCsv(body);
  const cell = (name) => parsed[1][parsed[0].indexOf(name)];

  assert.equal(cell("name"), "=cmd|' /C calc'!A0".replace(/^=/, "'="));
  assert.ok(cell("notes").startsWith("'@"));
  // …and the legitimate negative total is still a number, not text.
  assert.equal(cell("total_da"), "-15000");
  // Nothing in the file starts a field with a raw formula character.
  for (const row of parsed.slice(1)) {
    for (const f of row) assert.ok(!/^[=+\-@\t\r]/.test(f) || /^[+-]?[\d.]/.test(f), `unguarded field: ${JSON.stringify(f)}`);
  }
});

test("empty table → CSV with just the canonical header row", async (t) => {
  const { fn } = makeFetch({ rows: [] });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 200);
  const body = String(res.body).replace(/^﻿/, "");
  assert.equal(body, LEAD_COLUMNS.join(",") + "\r\n");
});

test("supabase error status → 502, not a crash", async (t) => {
  const { fn } = makeFetch({ leadsOk: false, leadsStatus: 500 });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /supabase 500/);
});
