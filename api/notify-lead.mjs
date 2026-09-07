// api/notify-lead.mjs — email the owner the instant a lead lands, so none sits unseen.
//
// Called server-to-server by a Supabase Database Webhook that fires on INSERT into
// public.leads (POST body { type:'INSERT', table:'leads', record:{...} }). The client
// write path (site/assets/js/lead-capture.js) is untouched — this notification hangs
// off the database event, not the browser.
//
// ACTIVATION IS CONFIGURATION, NOT CODE. This route ships live and stays inert
// until the owner provisions three env vars and points the webhook at it:
//   • LEAD_NOTIFY_SECRET unset  → every call is rejected (401); nothing is sent.
//   • RESEND_API_KEY or OWNER_NOTIFY_EMAIL unset → the request is acknowledged with a
//     200 no-op and NO email is attempted.
// So there is nothing to "turn on" here. docs/admin-setup.md § Alertes email is the
// runbook, and Réglages → Configuration shows which of the three are still missing.
//
// This route is PUBLIC — a Supabase webhook can't carry a verifyAdmin session — so a
// shared-secret header (x-notify-secret) is the only guard against a stranger POSTing
// fake alerts. That secret is essential; without it we treat every call as hostile.
//
// The message itself, the env reading and the provider call all live in
// api/_lib/notify.mjs, shared with api/notify-test.mjs so the "send a test" button
// exercises this exact path.
import { notifyEnv, buildLeadEmail, sendEmail } from "./_lib/notify.mjs";

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

export default async function handler(req, res) {
  // 1. Method gate — same shape as save-trip.mjs.
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const env = notifyEnv();

  // 2. Shared-secret gate. An unset secret means "not wired up yet" → refuse every call.
  const provided = (req.headers && (req.headers["x-notify-secret"] || req.headers["X-Notify-Secret"])) || null;
  if (!env.secret || provided !== env.secret) return res.status(401).json({ error: "unauthorized" });

  // 3. DORMANCY. With no email provider configured there is nothing to send: acknowledge
  //    the webhook (200) and do nothing — no fetch, no error, no retries. A non-2xx here
  //    would make Supabase retry a webhook that can never succeed.
  if (!env.apiKey || !env.to) return res.status(200).json({ ok: true, skipped: "notifications not configured" });

  // 4. Parse the Supabase webhook body and pull the inserted row.
  let body;
  try { body = await readBody(req); }
  catch (e) {
    if (e && e.status === 413) return res.status(413).json({ error: "body too large" });
    return res.status(400).json({ error: "invalid JSON body" });
  }
  const record = body && body.record;
  if (!record || typeof record !== "object") return res.status(400).json({ error: "missing record" });

  // 5. Build and send. Same builder and same sender as the Réglages test button.
  const { subject, text, html } = buildLeadEmail(record);
  const sent = await sendEmail({ apiKey: env.apiKey, from: env.from, to: env.to, subject, text, html });

  // A provider failure is surfaced as 502 so Supabase RETRIES the webhook — a lead
  // alert lost to a transient blip is a lost customer. The provider's own message is
  // not echoed here: this response goes to whoever holds the shared secret, not to a
  // verified admin. (api/notify-test.mjs, which is verifyAdmin-gated, does echo it.)
  if (!sent.ok) return res.status(502).json({ error: `email provider ${sent.status || "unreachable"}` });
  return res.status(200).json({ ok: true });
}
