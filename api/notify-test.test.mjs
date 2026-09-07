// api/notify-test.test.mjs
// The "Envoyer un email de test" route. Its contract is unusual and worth pinning:
// after the auth gate EVERY outcome is a 200 carrying { ok, step, … }, because the
// dashboard renders a sentence and a 502 would make a perfectly good diagnosis
// ("your domain is not verified") look like a broken request.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "./notify-test.mjs";

const ENV_KEYS = ["LEAD_NOTIFY_SECRET", "RESEND_API_KEY", "OWNER_NOTIFY_EMAIL", "LEAD_NOTIFY_FROM",
                  "ADMIN_EMAILS", "AT_SUPABASE_URL", "AT_SUPABASE_ANON_KEY"];
function withEnv(vars, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  return (async () => { try { return await fn(); } finally {
    for (const k of ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
  } })();
}

const ADMIN_ENV = {
  ADMIN_EMAILS: "owner@example.com",
  AT_SUPABASE_URL: "https://project.supabase.co",
  AT_SUPABASE_ANON_KEY: "anon-key",
};
const CONFIGURED = {
  LEAD_NOTIFY_SECRET: "s", RESEND_API_KEY: "re_k", OWNER_NOTIFY_EMAIL: "owner@example.com",
};

function fakeRes() {
  return {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; return this; },
  };
}
const req = (method = "POST") => ({ method, headers: { authorization: "Bearer tok" } });

// verifyAdmin calls the Supabase auth server over fetch; this stub answers that
// call and passes anything else to `rest`, so a test can decide what the email
// provider does without also having to reimplement auth.
function stubFetch(t, { user = { email: "owner@example.com" }, rest } = {}) {
  return t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (String(url).includes("/auth/v1/user")) {
      return user ? { ok: true, json: async () => user } : { ok: false, status: 401 };
    }
    if (rest) return rest(url, opts);
    throw new Error(`unexpected fetch: ${url}`);
  });
}

test("rejects non-POST before anything else", async () => {
  const res = fakeRes();
  await handler(req("GET"), res);
  assert.equal(res.statusCode, 405);
});

test("a non-admin never learns which env vars are set", async (t) => {
  // Without the auth gate this route is a free configuration oracle — and an
  // open email cannon pointed at the owner's inbox.
  await withEnv({ ...ADMIN_ENV, ...CONFIGURED }, async () => {
    stubFetch(t, { user: { email: "stranger@example.com" } });
    const res = fakeRes();
    await handler(req(), res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.missing, undefined);
    assert.equal(res.body.to, undefined);
  });
});

test("unconfigured → 200 naming exactly what is missing, no send attempted", async (t) => {
  await withEnv({ ...ADMIN_ENV, RESEND_API_KEY: "re_k" }, async () => {
    const f = stubFetch(t); // no `rest`: any provider call would throw
    const res = fakeRes();
    await handler(req(), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      ok: false, step: "config", missing: ["LEAD_NOTIFY_SECRET", "OWNER_NOTIFY_EMAIL"],
    });
    // exactly one fetch — the auth check — and none to the provider
    assert.equal(f.mock.calls.length, 1);
  });
});

test("happy path: one POST to the provider carrying a clearly-marked test email", async (t) => {
  await withEnv({ ...ADMIN_ENV, ...CONFIGURED }, async () => {
    let sent = null;
    stubFetch(t, {
      rest: async (url, opts) => {
        assert.match(String(url), /api\.resend\.com/);
        sent = JSON.parse(opts.body);
        return { ok: true, status: 200, json: async () => ({ id: "email_abc" }) };
      },
    });
    const res = fakeRes();
    await handler(req(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.step, "sent");
    assert.equal(res.body.id, "email_abc");
    assert.equal(res.body.to, "owner@example.com");
    assert.match(res.body.from, /alliancetravel\.app/);
    // The message itself must be recognisable as a drill, and must go to the
    // configured owner — not to whoever pressed the button.
    assert.match(sent.subject, /^\[TEST\] /);
    assert.equal(sent.to, "owner@example.com");
  });
});

test("a provider refusal is a 200 diagnosis, not a 502", async (t) => {
  await withEnv({ ...ADMIN_ENV, ...CONFIGURED }, async () => {
    stubFetch(t, {
      rest: async () => ({
        ok: false, status: 403,
        json: async () => ({ message: "The alliancetravel.app domain is not verified." }),
      }),
    });
    const res = fakeRes();
    await handler(req(), res);
    assert.equal(res.statusCode, 200); // the request worked; the SEND did not
    assert.equal(res.body.ok, false);
    assert.equal(res.body.step, "provider");
    assert.equal(res.body.status, 403);
    // The provider's own sentence reaches the owner — this is the button's
    // entire reason to exist.
    assert.match(res.body.error, /not verified/);
  });
});

test("an unreachable provider is reported, not thrown", async (t) => {
  await withEnv({ ...ADMIN_ENV, ...CONFIGURED }, async () => {
    stubFetch(t, { rest: async () => { throw new Error("network down"); } });
    const res = fakeRes();
    await handler(req(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.step, "provider");
    assert.match(res.body.error, /injoignable/);
  });
});
