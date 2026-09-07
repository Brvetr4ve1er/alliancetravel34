// api/notify-test.mjs — POST: send the owner a sample lead alert, on demand.
//
// WHY THIS EXISTS. api/notify-lead.mjs fires from a Supabase Database Webhook, so
// the only way to find out whether the chain (env vars → provider → verified domain
// → inbox) actually works was to wait for a real customer and hope. That is not a
// test, it is a gamble with a lead as the stake. This route runs the same builder
// and the same sender against a sample record, and reports exactly which link broke.
//
// It deliberately does NOT re-implement anything: api/_lib/notify.mjs is shared with
// notify-lead.mjs, so a green result here is evidence about the real path.
//
// AUTH. Unlike notify-lead (public, shared-secret) this is an owner action from the
// dashboard, so it takes the same verifyAdmin gate as save-trip / export-leads. That
// is also what makes it safe to echo the provider's own error text back: the audience
// is an authenticated admin on ADMIN_EMAILS, and that text ("the domain is not
// verified") is the entire diagnostic value of the button.
//
// RESPONSE SHAPE. Every outcome after auth is a 200 with { ok, step, ... }. The
// dashboard has one thing to render — a sentence — and a 502 would make the browser
// treat a perfectly good diagnosis ("your domain is not verified") as a failed
// request. `step` names the link that broke, so the UI never has to parse prose.
import { verifyAdmin } from "./_lib/auth.mjs";
import { notifyEnv, notifyConfig, buildLeadEmail, sendEmail, SAMPLE_LEAD } from "./_lib/notify.mjs";

export default async function handler(req, res) {
  // 1. Method gate — same shape as save-trip.mjs.
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  // 2. Admin gate FIRST. Without it this route is an open email cannon pointed at
  //    the owner's inbox, and a free oracle for which env vars are set.
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  // 3. Configuration check. Naming what is missing is the whole point — "ça ne
  //    marche pas" sends the owner back to a developer; "il manque RESEND_API_KEY"
  //    sends them to the Vercel settings page.
  const cfg = notifyConfig();
  if (!cfg.ready) {
    return res.status(200).json({ ok: false, step: "config", missing: cfg.missing });
  }

  // 4. Send the sample through the real builder and the real sender.
  const env = notifyEnv();
  const { subject, text, html } = buildLeadEmail(SAMPLE_LEAD, { test: true });
  const sent = await sendEmail({ apiKey: env.apiKey, from: env.from, to: env.to, subject, text, html });

  if (!sent.ok) {
    // `error` here is the provider's own sentence, forwarded verbatim. It is the
    // difference between an owner who can fix their DNS and one who cannot.
    return res.status(200).json({
      ok: false, step: "provider", status: sent.status, error: sent.error,
      from: env.from, to: env.to,
    });
  }

  // The provider accepted it. That is not the same as "it arrived" — it can still
  // land in spam — so the dashboard's success copy tells the owner to check there.
  return res.status(200).json({ ok: true, step: "sent", id: sent.id, from: env.from, to: env.to });
}
