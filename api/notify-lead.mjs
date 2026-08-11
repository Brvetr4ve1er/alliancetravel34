// api/notify-lead.mjs — email the owner the instant a lead lands, so none sits unseen.
//
// Called server-to-server by a Supabase Database Webhook that fires on INSERT into
// public.leads (POST body { type:'INSERT', table:'leads', record:{...} }). The client
// write path (site/assets/js/lead-capture.js) is untouched — this notification hangs
// off the database event, not the browser.
//
// DORMANT BY DESIGN — ships live but inactive until the owner provisions secrets:
//   • LEAD_NOTIFY_SECRET unset  → every call is rejected (401); nothing is sent.
//   • RESEND_API_KEY or OWNER_NOTIFY_EMAIL unset → the request is acknowledged with a
//     200 no-op and NO email is attempted.
// So there is nothing to "turn on" in code: the endpoint stays a no-op until the env
// vars in docs/admin-setup.md are set. Nothing here claims the feature is live.
//
// This route is PUBLIC — a Supabase webhook can't carry a verifyAdmin session — so a
// shared-secret header (x-notify-secret) is the only guard against a stranger POSTing
// fake alerts. That secret is essential; without it we treat every call as hostile.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Hard ceiling on the request body, for the same reason as save-trip.mjs: the whole
// thing is buffered before it can be parsed. A lead row is a few hundred bytes, so
// 1 MB is an enormous allowance and still a bound. Kept identical to save-trip's
// limit so there is one number to reason about.
export const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

// Vercel pre-parses a JSON body; fall back to reading the stream (mirrors save-trip.mjs).
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buf.length;
    if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error("body too large"), { status: 413 });
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

// "0555 12 34 56" → "213555123456": mirrors site/admin/leads.js's wa.me builder
// exactly (leading 0 → Algeria's 213, then strip every non-digit).
function waNumber(phone) {
  return String(phone == null ? "" : phone).replace(/^0/, "213").replace(/\D/g, "");
}

// Format an amount the same way the admin inbox does: Intl fr-DZ grouping + " DA".
function fmtDzd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return new Intl.NumberFormat("fr-DZ").format(v) + " DA";
}

// Escape for safe insertion into the HTML email body (lead values are attacker-controlled).
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  // 1. Method gate — same shape as save-trip.mjs.
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  // 2. Shared-secret gate. An unset secret means "not wired up yet" → refuse every call.
  const secret = process.env.LEAD_NOTIFY_SECRET;
  const provided = (req.headers && (req.headers["x-notify-secret"] || req.headers["X-Notify-Secret"])) || null;
  if (!secret || provided !== secret) return res.status(401).json({ error: "unauthorized" });

  // 3. DORMANCY. With no email provider configured there is nothing to send: acknowledge
  //    the webhook (200) and do nothing — no fetch, no error, no retries. See admin-setup.md.
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_NOTIFY_EMAIL;
  if (!apiKey || !to) return res.status(200).json({ ok: true, skipped: "notifications not configured" });

  // 4. Parse the Supabase webhook body and pull the inserted row.
  let body;
  try { body = await readBody(req); }
  catch (e) {
    if (e && e.status === 413) return res.status(413).json({ error: "body too large" });
    return res.status(400).json({ error: "invalid JSON body" });
  }
  const record = body && body.record;
  if (!record || typeof record !== "object") return res.status(400).json({ error: "missing record" });

  // 5. Build the alert. Column names mirror site/admin/leads.js COLS exactly.
  const r = record;
  const total = fmtDzd(r.total_da);
  const wa = waNumber(r.phone);
  const waLink = wa ? `https://wa.me/${wa}` : null;

  const rows = [
    ["Nom", r.name],
    ["Téléphone", r.phone],
    ["Ville", r.city],
    ["Voyage", r.trip],
    ["Hôtel", r.hotel],
    ["Dates", r.date],
    ["Chambre", r.room],
    ["Adultes", r.adults],
    ["Enfants", r.kids],
    ["Total", total],
    ["Canal", r.channel],
    ["Page", r.page],
    ["Notes", r.notes],
  ].filter(([, v]) => v != null && v !== "");

  const subject = `Nouveau lead — ${r.name || "sans nom"}${r.city ? ` (${r.city})` : ""}`;

  const text =
    rows.map(([k, v]) => `${k} : ${v}`).join("\n") +
    (waLink ? `\n\nRépondre sur WhatsApp : ${waLink}` : "");

  const html =
    `<h2>Nouveau lead</h2>` +
    `<table cellpadding="4">` +
    rows.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join("") +
    `</table>` +
    (waLink ? `<p><a href="${esc(waLink)}">Répondre sur WhatsApp</a></p>` : "");

  const from = process.env.LEAD_NOTIFY_FROM || "notifications@alliance-travel.dz";

  // 6. Send via the Resend HTTP API — one fetch POST. Provider-swappable: to move to
  //    Brevo / SendGrid / Postmark, change only this endpoint + the payload shape and
  //    the Authorization header; nothing above needs to move.
  let resp;
  try {
    resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
  } catch {
    return res.status(502).json({ error: "email provider unreachable" });
  }
  // A non-ok Resend response is surfaced as an error status — never thrown uncaught.
  if (!resp.ok) return res.status(502).json({ error: `email provider ${resp.status}` });
  return res.status(200).json({ ok: true });
}
