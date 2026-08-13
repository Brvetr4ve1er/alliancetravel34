// site/assets/js/lead-queue.test.mjs
//
// lead-capture.js is an IIFE; like booking-form.test.mjs we run it in a
// node:vm context with a fake browser and drive the delivery half through the
// window.AT_leadInternals test hook.
//
// What is locked here is the 2026-08-11 fix for silently lost leads. The old
// insert was `fetch(...).catch(function () {})`: the WhatsApp tab opened, the
// visitor left satisfied, and a dropped lead was invisible to everyone. The
// contract these tests hold:
//   • the WhatsApp handoff is never awaited — insertLead returns immediately
//     and every failure path is a background promise;
//   • a transient failure is retried once, then persisted for the next visit;
//   • a permanent (4xx) rejection is NOT queued — it could never drain — and
//     raises a non-blocking toast instead;
//   • every POST carries an AbortSignal, so it cannot hang forever.
// contact-form.js carries the same mechanism for the homepage form (the two
// files load on different pages and there is no module system to share it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 8; i++) await tick(); };

function load({ storage = {}, statuses = [] } = {}) {
  const code = readFileSync(new URL("./lead-capture.js", import.meta.url), "utf8");

  const store = new Map(Object.entries(storage));
  const fetches = [];      // { url, opts }
  const toasts = [];
  const timers = [];       // pending setTimeout callbacks (deadlines + the flush)
  let nextTimer = 1;
  const queued = statuses.slice();

  const win = {
    AT_LEADS: { url: "https://db.example", anonKey: "anon-key" },
    AT_showToast: (msg, kind) => { toasts.push({ msg, kind }); },
    addEventListener: () => {},
  };
  const ctx = {
    window: win,
    document: {
      readyState: "complete",
      documentElement: { lang: "fr" },
      getElementById: () => null,   // no booking form in this context
      addEventListener: () => {},
    },
    location: { pathname: "/egypte/" },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    },
    fetch: (url, opts) => {
      fetches.push({ url, opts });
      const next = queued.length ? queued.shift() : 201;
      if (next === "network-error") return Promise.reject(new Error("boom"));
      return Promise.resolve({ status: next, ok: next >= 200 && next < 300 });
    },
    AbortController: class {
      constructor() { this.signal = { aborted: false }; }
      abort() { this.signal.aborted = true; }
    },
    setTimeout: (fn, ms) => { const id = nextTimer++; timers.push({ id, fn, ms }); return id; },
    clearTimeout: (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0,
    clearInterval: () => {},
    Date, JSON, Promise, Array, console,
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);

  const api = win.AT_leadInternals;
  assert.ok(api, "lead-capture.js must expose window.AT_leadInternals");
  return { api, win, store, fetches, toasts, timers };
}

const PAYLOAD = { name: "Ahmed", phone: "0561616266", trip: "Égypte", channel: "whatsapp" };
const queueOf = (env) => JSON.parse(env.store.get("at-lead-queue") || "[]");

/* ── classification ────────────────────────────────────────────────────── */

test("isOk / isTransient: only a no-answer, 408, 429 or 5xx is worth retrying", () => {
  const { api } = load();
  assert.equal(api.isOk(201), true);
  assert.equal(api.isOk(204), true);
  assert.equal(api.isOk(400), false);

  assert.equal(api.isTransient(0), true, "0 = network error / our own timeout");
  assert.equal(api.isTransient(408), true);
  assert.equal(api.isTransient(429), true);
  assert.equal(api.isTransient(500), true);
  assert.equal(api.isTransient(503), true);
  assert.equal(api.isTransient(400), false, "a bad payload fails identically on retry");
  assert.equal(api.isTransient(401), false);
  assert.equal(api.isTransient(403), false, "an RLS refusal would never drain from the queue");
});

/* ── the POST itself ───────────────────────────────────────────────────── */

test("postLead resolves with the HTTP status and never rejects", async () => {
  const env = load({ statuses: [201] });
  assert.equal(await env.api.postLead(PAYLOAD), 201);

  const bad = load({ statuses: ["network-error"] });
  assert.equal(await bad.api.postLead(PAYLOAD), 0, "a network error must resolve as 0, not throw");
});

test("every POST carries an abort signal and keepalive", async () => {
  const env = load({ statuses: [201] });
  await env.api.postLead(PAYLOAD);
  const { url, opts } = env.fetches[0];
  assert.equal(url, "https://db.example/rest/v1/leads");
  assert.equal(opts.keepalive, true, "the WhatsApp navigation must not cancel the insert");
  assert.ok(opts.signal, "no client fetch may hang forever");
  assert.equal(opts.method, "POST");
});

test("the abort deadline is armed before the request and cleared after it", async () => {
  const env = load({ statuses: [201] });
  const before = env.timers.length;
  const p = env.api.postLead(PAYLOAD);
  const armed = env.timers.slice(before);
  assert.equal(armed.length, 1, "one deadline per request");
  assert.equal(armed[0].ms, env.api.TIMEOUT_MS);
  await p;
  assert.equal(env.timers.includes(armed[0]), false, "a settled request must not leave a timer behind");
});

/* ── insertLead: retry, queue, notice ──────────────────────────────────── */

test("insertLead returns synchronously — the WhatsApp handoff is never awaited", () => {
  const env = load({ statuses: [500, 500] });
  assert.equal(env.api.insertLead(PAYLOAD), undefined);
});

test("a first-try success sends once, queues nothing, says nothing", async () => {
  const env = load({ statuses: [201] });
  env.api.insertLead(PAYLOAD);
  await settle();
  assert.equal(env.fetches.length, 1);
  assert.deepEqual(queueOf(env), []);
  assert.deepEqual(env.toasts, []);
});

test("a transient failure is retried once, and a successful retry is silent", async () => {
  const env = load({ statuses: [500, 201] });
  env.api.insertLead(PAYLOAD);
  await settle();
  assert.equal(env.fetches.length, 2, "exactly one retry — not zero, not a loop");
  assert.deepEqual(queueOf(env), [], "it landed, so nothing is parked");
  assert.deepEqual(env.toasts, []);
});

test("two transient failures park the lead in localStorage instead of losing it", async () => {
  const env = load({ statuses: ["network-error", "network-error"] });
  env.api.insertLead(PAYLOAD);
  await settle();
  assert.equal(env.fetches.length, 2);
  const q = queueOf(env);
  assert.equal(q.length, 1, "the lead survives the page — this is the revenue the swallow used to cost");
  assert.deepEqual(q[0].payload, PAYLOAD);
  assert.equal(typeof q[0].at, "number");
  assert.deepEqual(env.toasts, [], "a lead we will retry does not alarm the visitor");
});

test("a permanent 400 is not retried, not queued, and raises one quiet notice", async () => {
  const env = load({ statuses: [400] });
  env.api.insertLead(PAYLOAD);
  await settle();
  assert.equal(env.fetches.length, 1, "a 400 fails identically on retry");
  assert.deepEqual(queueOf(env), [], "an undrainable row must not live in the visitor's storage");
  assert.equal(env.toasts.length, 1);
  assert.equal(env.toasts[0].kind, "error");
  assert.match(env.toasts[0].msg, /WhatsApp/, "the notice points at the channel that still works");
});

test("the notice follows the site language", async () => {
  const env = load({ statuses: [400], storage: { "al-lang": "ar" } });
  env.api.insertLead(PAYLOAD);
  await settle();
  assert.match(env.toasts[0].msg, /واتساب/, "Arabic visitors get the Arabic notice");
});

test("a missing AT_showToast is silent, never a throw into the CTA path", async () => {
  const env = load({ statuses: [400] });
  delete env.win.AT_showToast;
  env.api.insertLead(PAYLOAD);
  await settle();
  assert.deepEqual(queueOf(env), []);
});

/* ── the queue ─────────────────────────────────────────────────────────── */

test("the queue is capped so a broken endpoint cannot fill up storage", () => {
  const env = load();
  for (let i = 0; i < env.api.QUEUE_MAX + 15; i++) env.api.queuePush({ n: i });
  const q = queueOf(env);
  assert.equal(q.length, env.api.QUEUE_MAX);
  assert.equal(q[q.length - 1].payload.n, env.api.QUEUE_MAX + 14, "the newest leads are the ones kept");
});

test("a corrupt or absent queue reads as empty rather than throwing", () => {
  const env = load({ storage: { "at-lead-queue": "{not json" } });
  // .length, not deepEqual: the array comes back from the vm realm.
  assert.equal(env.api.queueRead().length, 0);
});

test("flushQueue re-sends what the last visit could not deliver", async () => {
  const env = load({
    statuses: [201, 201],
    storage: { "at-lead-queue": JSON.stringify([
      { at: Date.now(), payload: { name: "A" } },
      { at: Date.now(), payload: { name: "B" } },
    ]) },
  });
  env.api.flushQueue();
  await settle();
  assert.equal(env.fetches.length, 2);
  assert.deepEqual(queueOf(env), [], "delivered leads leave the queue");
});

test("flushQueue re-parks an entry that fails again", async () => {
  const env = load({
    statuses: ["network-error"],
    storage: { "at-lead-queue": JSON.stringify([{ at: Date.now(), payload: { name: "A" } }]) },
  });
  env.api.flushQueue();
  await settle();
  assert.equal(queueOf(env).length, 1, "still undelivered, still kept");
});

test("flushQueue drops entries older than a week and runs at most once per page", async () => {
  const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const env = load({
    storage: { "at-lead-queue": JSON.stringify([{ at: old, payload: { name: "stale" } }]) },
  });
  env.api.flushQueue();
  await settle();
  assert.equal(env.fetches.length, 0, "a week-old lead is cold — do not resurrect it");
  assert.deepEqual(queueOf(env), []);

  // The guard lives on window so contact-form.js's copy cannot double-send.
  env.api.queuePush({ name: "fresh" });
  env.api.flushQueue();
  await settle();
  assert.equal(env.fetches.length, 0, "a second flush in the same page is a no-op");
  assert.equal(queueOf(env).length, 1, "…and it leaves the queue intact for the next visit");
});
