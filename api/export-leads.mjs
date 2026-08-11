// api/export-leads.mjs — GET: download EVERY lead as CSV, for backup / archival.
//
// Leads are customer PII (name, phone, party size, spend). This endpoint is ADMIN
// ONLY and mirrors api/save-trip.mjs's gate EXACTLY: verifyAdmin(req) runs first and
// a non-admin is rejected (401 no/invalid session, 403 not on ADMIN_EMAILS) before a
// single row is read. Only after that do we touch Supabase.
//
// Read path — the public anon key CANNOT read leads (row-level security lets it only
// INSERT; see site/assets/js/lead-config.js). The browser admin reads them with the
// signed-in user's JWT; a server backup has no such JWT, so it reads through the
// SERVICE-ROLE key, which bypasses RLS. That key is a SERVER secret and is never sent
// to the client — it only ever lives in this function's env.
//
// DORMANT BY DESIGN — ships live but inert until the owner provisions the service key.
// With SUPABASE_SERVICE_ROLE_KEY unset (or no Supabase URL) an authenticated admin
// gets a clear 503 "not configured", never a crash — same spirit as api/notify-lead.mjs
// and api/status.mjs, which stay no-ops until their secrets exist.
import { verifyAdmin, supabaseEnv } from "./_lib/auth.mjs";

// Canonical column order for the export, matching site/admin/leads.js COLS with the
// primary key in front. leadColumns() appends any *extra* columns present in the data
// (e.g. a future schema addition) so a backup never silently drops a field.
export const LEAD_COLUMNS = [
  "id", "created_at", "status", "name", "phone", "city", "trip", "hotel",
  "date", "room", "adults", "kids", "total_da", "channel", "page", "notes",
];

export function leadColumns(rows) {
  const cols = [...LEAD_COLUMNS];
  const seen = new Set(cols);
  for (const r of rows || []) {
    if (r && typeof r === "object") {
      for (const k of Object.keys(r)) {
        if (!seen.has(k)) { seen.add(k); cols.push(k); }
      }
    }
  }
  return cols;
}

// Characters that make Excel / LibreOffice / Google Sheets treat a cell as a
// FORMULA instead of text. =, + and @ start one outright; - starts one too (it is
// unary minus applied to whatever follows); TAB and CR are stripped by those apps
// before they look at the first character, so they smuggle the other four through.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

// …with one deliberate exception: a bare numeric literal. total_da can legitimately
// be negative (a refund, a credit) and "-15000" is a NUMBER to every spreadsheet, not
// a formula. Prefixing it would turn the owner's arithmetic into text, so anything
// that is exactly a number — optional sign, digits, optional decimal, optional
// exponent — is passed through untouched. "+213 555 12 34 56" is NOT a bare numeral
// and is therefore still guarded, which is also what makes it display correctly.
const BARE_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;

// CSV injection guard (OWASP). Lead name / notes / city come straight off the PUBLIC
// lead form, so `=cmd|' /C calc'!A0` in a name field is code the OWNER executes when
// she opens the backup. Prefixing with a single quote makes the spreadsheet store the
// value as literal text; the quote is the standard, universally understood marker.
// Pure and exported so the rule is testable on its own.
export function csvFormulaGuard(s) {
  if (!FORMULA_LEAD.test(s) || BARE_NUMBER.test(s)) return s;
  return `'${s}`;
}

// RFC 4180 field escaping (pure): quote a field only when it contains a comma, a
// double-quote or a newline, and double any embedded quotes. Objects (jsonb columns)
// are JSON-stringified so structured values survive the round-trip. null/undefined → "".
//
// The formula guard runs BEFORE the quoting, never after: the ' must end up INSIDE
// the RFC-4180 quotes so the CSV reader hands the spreadsheet a single text field.
// Guarding afterwards would put it outside and break the field instead of the attack.
export function csvCell(v) {
  if (v == null) return "";
  const s = csvFormulaGuard(typeof v === "object" ? JSON.stringify(v) : String(v));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// rows → CSV text with a header row and CRLF line endings (RFC 4180).
export function toCsv(rows, columns) {
  const cols = columns || leadColumns(rows);
  const header = cols.map(csvCell).join(",");
  const body = (rows || []).map((r) => cols.map((c) => csvCell(r && r[c])).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

// Service-role key: AT_-prefixed name wins, for the same reason auth.mjs prefers
// AT_SUPABASE_URL — the Vercel<->Supabase marketplace integration can inject and
// clobber the unprefixed SUPABASE_* names, but not names it doesn't manage.
function serviceKey() {
  return process.env.AT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export default async function handler(req, res) {
  // 1. Method gate — same shape as save-trip.mjs / status.mjs.
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  // 2. Admin gate FIRST — leads are PII, so nothing is read for a non-admin.
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // 3. Dormancy — checked only for a proven admin, so config state never leaks.
  const { url: base } = supabaseEnv();
  const key = serviceKey();
  if (!base || !key) {
    return res.status(503).json({
      error: "export not configured",
      detail: "set SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) to enable lead export",
    });
  }

  // 4. Read every lead through the service-role key (bypasses RLS), newest first.
  let resp;
  try {
    resp = await fetch(`${base}/rest/v1/leads?select=*&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
  } catch {
    return res.status(502).json({ error: "supabase unreachable" });
  }
  if (!resp.ok) return res.status(502).json({ error: `supabase ${resp.status}` });
  let data;
  try {
    data = await resp.json();
  } catch {
    return res.status(502).json({ error: "supabase bad response" });
  }
  const rows = Array.isArray(data) ? data : [];

  // 5. Emit CSV as a downloadable attachment. Leading BOM so Excel reads UTF-8
  //    (accents in city/notes) correctly — mirrors site/admin/leads.js's client export.
  const csv = "﻿" + toCsv(rows);
  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="leads-${stamp}.csv"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(csv);
}
