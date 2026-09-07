// api/_lib/notify.mjs — everything a lead-alert email knows about itself.
//
// Two callers share this module and that sharing is the point:
//   • api/notify-lead.mjs   — fired by a Supabase Database Webhook on every
//                             INSERT into public.leads (the real path).
//   • api/notify-test.mjs   — the "Envoyer un email de test" button in Réglages.
// If the test button built its own message or read its own env, a green test
// would prove nothing about the path that carries real customers. One builder,
// one sender, one env reader — so "the test worked" means "a lead will arrive".
//
// DORMANCY LIVES HERE TOO. With no provider key or no recipient the feature is
// inert: notifyConfig().ready is false and both callers no-op rather than throw.
// Nothing in this file claims the feature is live when it is not.

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

// The default sender. It must be on a domain the owner controls AND has
// verified with the email provider — alliance-travel.dz (the previous default)
// has no DNS at all, so every send would have been refused. The live domain is
// alliancetravel.app.
//
// `alertes@` on the ROOT domain rather than a subdomain is deliberate for this
// account: the only recipient is the owner's own inbox, so sending reputation
// is not a shared asset worth isolating, and one fewer DNS level is one fewer
// thing for a non-technical owner to get wrong. Override with LEAD_NOTIFY_FROM
// (e.g. "onboarding@resend.dev" to test before any DNS exists — see
// docs/admin-setup.md § Alertes email).
export const DEFAULT_FROM = "Alliance Travel <alertes@alliancetravel.app>";

// Raw env, read once per call so a Vercel env change takes effect on the next
// invocation without a redeploy of this module's state.
export function notifyEnv() {
  return {
    secret: process.env.LEAD_NOTIFY_SECRET || null,
    apiKey: process.env.RESEND_API_KEY || null,
    to: process.env.OWNER_NOTIFY_EMAIL || null,
    from: process.env.LEAD_NOTIFY_FROM || DEFAULT_FROM,
  };
}

// What the dashboard may see: PRESENCE of each secret, never its value.
//
// `from` and `to` are the two exceptions and they are not secrets — they are
// the owner's own addresses, and the two things they most need to eyeball
// ("do alerts really go there?"). /api/status is verifyAdmin-gated, so the
// only audience is the owner. The API key and the shared secret never leave
// this function as anything but a boolean.
export function notifyConfig() {
  const e = notifyEnv();
  const missing = [];
  if (!e.secret) missing.push("LEAD_NOTIFY_SECRET");
  if (!e.apiKey) missing.push("RESEND_API_KEY");
  if (!e.to) missing.push("OWNER_NOTIFY_EMAIL");
  return {
    secret: !!e.secret,
    provider: !!e.apiKey,
    recipient: !!e.to,
    from: e.from,
    to: e.to,
    missing,
    ready: missing.length === 0,
  };
}

// "0555 12 34 56" → "213555123456": mirrors site/admin/leads.js's wa.me builder
// exactly (leading 0 → Algeria's 213, then strip every non-digit).
export function waNumber(phone) {
  return String(phone == null ? "" : phone).replace(/^0/, "213").replace(/\D/g, "");
}

// Format an amount the same way the admin inbox does: Intl fr-DZ grouping + " DA".
export function fmtDzd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return new Intl.NumberFormat("fr-DZ").format(v) + " DA";
}

// Escape for safe insertion into the HTML email body. Lead values come off the
// PUBLIC form and are attacker-controlled: a name of `<img src=x onerror=…>`
// is markup the OWNER's mail client would render. Applied to keys as well as
// values so the table cannot be broken from either side.
export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// record → { subject, text, html }. Column names mirror site/admin/leads.js COLS
// exactly, so the alert and the dashboard describe a lead with the same words.
// Empty fields are dropped rather than shown blank: a phone-sized alert should
// carry what is known, not a form with holes in it.
export function buildLeadEmail(record, { test = false } = {}) {
  const r = record || {};
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

  // The test message must be unmistakable in the inbox. An owner who cannot
  // tell a drill from a real customer will either call a fake number or, worse,
  // learn to ignore the alerts.
  const tag = test ? "[TEST] " : "";
  const subject =
    `${tag}Nouveau lead — ${r.name || "sans nom"}${r.city ? ` (${r.city})` : ""}`;

  const preamble = test
    ? "Ceci est un email de test envoyé depuis votre espace d'administration. "
      + "Aucun client n'a rempli ce formulaire.\n\n"
    : "";

  const text =
    preamble +
    rows.map(([k, v]) => `${k} : ${v}`).join("\n") +
    (waLink ? `\n\nRépondre sur WhatsApp : ${waLink}` : "");

  const html =
    (test
      ? `<p style="background:#fff4e5;border-left:4px solid #e0a04a;padding:10px 14px">` +
        `<strong>Email de test.</strong> Envoyé depuis votre espace d'administration — ` +
        `aucun client n'a rempli ce formulaire.</p>`
      : "") +
    `<h2>${test ? "Exemple de lead" : "Nouveau lead"}</h2>` +
    `<table cellpadding="4">` +
    rows.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join("") +
    `</table>` +
    (waLink ? `<p><a href="${esc(waLink)}">Répondre sur WhatsApp</a></p>` : "");

  return { subject, text, html };
}

// The sample used by the test button. Obviously fictional on purpose: the phone
// number is in the reserved 0550-00-00-00 shape and the name says so, because
// an owner who mistakes the drill for a customer will try to call it.
export const SAMPLE_LEAD = {
  name: "Client de test (exemple)",
  phone: "0550 00 00 00",
  city: "Bordj Bou Arréridj",
  trip: "Istanbul",
  hotel: "Hôtel d'exemple",
  date: "12 – 19 Juillet 2026",
  room: "double",
  adults: 2,
  kids: 1,
  total_da: 185000,
  channel: "whatsapp",
  page: "istanbul",
  notes: "Message de test — vous pouvez ignorer cet email.",
};

// One POST to the provider. Returns a RESULT, never throws: both callers have
// to report what happened rather than 500.
//
// Provider-swappable: to move to Brevo / SendGrid / Postmark, change this
// function's endpoint, payload shape and Authorization header. Nothing above
// needs to move.
export async function sendEmail({ apiKey, from, to, subject, text, html }) {
  let resp;
  try {
    resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
  } catch {
    return { ok: false, status: 0, error: "fournisseur d'email injoignable" };
  }

  if (resp.ok) {
    let id = null;
    try { id = (await resp.json()).id || null; } catch { /* an id is a bonus, not a contract */ }
    return { ok: true, status: resp.status, id };
  }

  // A refusal from Resend answers with JSON { statusCode, message, name }, and
  // that `message` is the single most useful string in this entire feature —
  // it is what says "The alliancetravel.app domain is not verified". Swallowing
  // it leaves the owner staring at a bare 403 with nothing to act on, so it is
  // surfaced to the (already authenticated) caller.
  let detail = null;
  try {
    const b = await resp.json();
    detail = b && (b.message || b.error || b.name);
  } catch { /* non-JSON error body — fall back to the status */ }
  return { ok: false, status: resp.status, error: detail || `erreur ${resp.status}` };
}
