// api/_lib/notify.test.mjs
// The shared lead-alert library. These tests exist mainly to hold two lines that
// are easy to break and expensive to break: that notifyConfig() never leaks a
// secret VALUE, and that lead text is escaped before it reaches the HTML body.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FROM, notifyEnv, notifyConfig, waNumber, fmtDzd, esc,
  buildLeadEmail, sendEmail, SAMPLE_LEAD,
} from "./notify.mjs";

const ENV_KEYS = ["LEAD_NOTIFY_SECRET", "RESEND_API_KEY", "OWNER_NOTIFY_EMAIL", "LEAD_NOTIFY_FROM"];
function withEnv(vars, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  try { return fn(); }
  finally {
    for (const k of ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  }
}

test("the default sender is on the live domain", () => {
  // alliance-travel.dz (the previous default) has no DNS, so every send under it
  // was refused for an unverified domain. If this ever points at a domain the
  // owner has not verified with the provider, the feature is silently dead again.
  assert.match(DEFAULT_FROM, /@alliancetravel\.app>?$/);
  withEnv({}, () => assert.equal(notifyEnv().from, DEFAULT_FROM));
  withEnv({ LEAD_NOTIFY_FROM: "x@example.com" }, () => assert.equal(notifyEnv().from, "x@example.com"));
});

test("notifyConfig reports presence and NEVER the secret values", () => {
  withEnv({
    LEAD_NOTIFY_SECRET: "s3cr3t-webhook-value",
    RESEND_API_KEY: "re_live_KEYMATERIAL",
    OWNER_NOTIFY_EMAIL: "owner@example.com",
  }, () => {
    const cfg = notifyConfig();
    assert.deepEqual(
      { secret: cfg.secret, provider: cfg.provider, recipient: cfg.recipient, ready: cfg.ready, missing: cfg.missing },
      { secret: true, provider: true, recipient: true, ready: true, missing: [] },
    );
    // This object is serialised straight into /api/status. Anything that is not a
    // boolean or one of the two addresses must not appear in it.
    const blob = JSON.stringify(cfg);
    assert.doesNotMatch(blob, /s3cr3t-webhook-value/);
    assert.doesNotMatch(blob, /KEYMATERIAL/);
    assert.equal(cfg.to, "owner@example.com"); // the owner's own address, on purpose
  });
});

test("notifyConfig names exactly which pieces are missing", () => {
  withEnv({ RESEND_API_KEY: "k" }, () => {
    const cfg = notifyConfig();
    assert.equal(cfg.ready, false);
    assert.deepEqual(cfg.missing, ["LEAD_NOTIFY_SECRET", "OWNER_NOTIFY_EMAIL"]);
  });
  withEnv({}, () => assert.equal(notifyConfig().missing.length, 3));
});

test("phone → wa.me number, and DZD formatting", () => {
  assert.equal(waNumber("0555 12 34 56"), "213555123456");
  assert.equal(waNumber(null), "");
  assert.equal(fmtDzd(185000).replace(/ | /g, " "), "185 000 DA");
  assert.equal(fmtDzd("pas un nombre"), null);
});

test("lead values are escaped before reaching the HTML body", () => {
  // Every field here comes off the PUBLIC form. Unescaped, this renders as an
  // image tag in the owner's mail client.
  const hostile = { name: '<img src=x onerror="alert(1)">', phone: "0555 12 34 56", notes: "a & b" };
  const { html, text } = buildLeadEmail(hostile);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /a &amp; b/);
  // The plain-text part is not markup, so it carries the value verbatim.
  assert.match(text, /<img src=x/);
  assert.equal(esc('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});

test("empty fields are dropped, not rendered blank", () => {
  const { text, html } = buildLeadEmail({ name: "Amina", phone: "0770 11 22 33", hotel: null, city: "" });
  assert.match(text, /Nom : Amina/);
  assert.doesNotMatch(text, /Hôtel/);
  assert.doesNotMatch(text, /Ville/);
  assert.match(html, /wa\.me\/213770112233/);
});

test("a test email is unmistakable in the inbox", () => {
  // An owner who cannot tell the drill from a real customer will either call a
  // fake number or learn to ignore the alerts. Both are worse than no test.
  const real = buildLeadEmail(SAMPLE_LEAD);
  const drill = buildLeadEmail(SAMPLE_LEAD, { test: true });
  assert.doesNotMatch(real.subject, /TEST/);
  assert.match(drill.subject, /^\[TEST\] /);
  assert.match(drill.text, /email de test/i);
  assert.match(drill.html, /Email de test/i);
});

test("sendEmail returns a result and never throws", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("DNS is on fire"); });
  const r = await sendEmail({ apiKey: "k", from: "a@b.c", to: "d@e.f", subject: "s", text: "t", html: "<p>t</p>" });
  assert.deepEqual(r, { ok: false, status: 0, error: "fournisseur d'email injoignable" });
});

test("a provider refusal forwards the provider's own message", async (t) => {
  // This is the whole diagnostic value of the feature: "the domain is not
  // verified" is actionable, a bare 403 is not.
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false, status: 403,
    json: async () => ({ statusCode: 403, message: "The alliancetravel.app domain is not verified.", name: "validation_error" }),
  }));
  const r = await sendEmail({ apiKey: "k", from: "a@b.c", to: "d@e.f", subject: "s", text: "t", html: "" });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
  assert.match(r.error, /not verified/);
});

test("a refusal with a non-JSON body still yields a usable error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false, status: 502, json: async () => { throw new Error("not json"); },
  }));
  const r = await sendEmail({ apiKey: "k", from: "a@b.c", to: "d@e.f", subject: "s", text: "t", html: "" });
  assert.deepEqual(r, { ok: false, status: 502, error: "erreur 502" });
});

test("a success without a parseable body is still a success", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true, status: 200, json: async () => { throw new Error("empty"); },
  }));
  const r = await sendEmail({ apiKey: "k", from: "a@b.c", to: "d@e.f", subject: "s", text: "t", html: "" });
  assert.equal(r.ok, true);
  assert.equal(r.id, null);
});
