// api/export-leads.mjs — GET: download EVERY lead, for backup / archival.
//
//   /api/export-leads             → CSV  (unchanged default)
//   /api/export-leads?format=xlsx → Excel workbook
//   /api/export-leads?format=json → raw JSON, re-importable
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
// gets a clear 503 "not configured", never a crash.
//
// EVERY BYTE IS BUILT BY site/admin/export.js, the same module the dashboard's
// download button uses. That import is the point of this file's rewrite: the two
// exports used to be independent implementations and had already drifted — the
// browser emitted wa_destination and no id, the server the reverse, while a comment
// in each claimed they were byte-identical. One module, one column list, one set of
// escaping rules. vercel.json's includeFiles keeps site/admin/ in this function's
// bundle (same mechanism save-trip.mjs uses for tools/).
import { verifyAdmin, supabaseEnv } from "./_lib/auth.mjs";
import { buildExport, FORMATS, LEAD_FIELDS } from "../site/admin/export.js";

export { LEAD_FIELDS };

// Service-role key: AT_-prefixed name wins, for the same reason auth.mjs prefers
// AT_SUPABASE_URL — the Vercel<->Supabase marketplace integration can inject and
// clobber the unprefixed SUPABASE_* names, but not names it doesn't manage.
function serviceKey() {
  return process.env.AT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// ?format=… → one of the three writers. Unknown values fall back to CSV rather
// than 400: this is a backup URL typed by a human, and a working file beats an
// error page. Exported so the fallback is testable on its own.
export function pickFormat(query) {
  const raw = query && (Array.isArray(query.format) ? query.format[0] : query.format);
  const f = String(raw || "csv").toLowerCase();
  return Object.prototype.hasOwnProperty.call(FORMATS, f) ? f : "csv";
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

  // 5. Build and send as a download. The CSV writer already puts a UTF-8 BOM in
  //    front so Excel reads the accents; the XLSX is binary, hence the Buffer.
  const out = buildExport(rows, pickFormat(req.query));
  res.setHeader("Content-Type", out.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${out.filename}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(Buffer.from(out.bytes));
}
