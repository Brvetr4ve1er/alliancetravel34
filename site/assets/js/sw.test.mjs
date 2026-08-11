// site/assets/js/sw.test.mjs
//
// site/sw.js is a classic worker script: it registers handlers on `self` and
// exports nothing. Following the technique of booking-form.test.mjs, we load
// it into a node:vm context with a fake worker global scope (self, caches,
// fetch) and then dispatch synthetic install / activate / fetch events.
//
// These lock the three staleness bugs fixed on 2026-08-11:
//   1. ONE version constant — bumping it now purges the RUNTIME cache too
//      (which holds every page, stylesheet, script and image). Before, the
//      runtime cache carried its own hand-written version and survived.
//   2. res.ok before caching HTML — a 404/500 error page used to be written
//      into RUNTIME and served as the offline answer for that URL.
//   3. no homepage impersonation — the offline fallback used to be
//      caches.match('/'), so an offline tap on an unvisited URL (including
//      /admin/) rendered the HOME page under that URL. /admin/ and /api/ are
//      now excluded from the worker entirely.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ORIGIN = "https://alliance-travel.dz";

/* A CacheStorage stand-in: name -> Map(url -> Response). */
function makeCaches() {
  const store = new Map();
  const openSync = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name);
  };
  return {
    store,
    entries: (name) => [...(store.get(name) || new Map()).keys()],
    async open(name) {
      const c = openSync(name);
      return {
        async put(req, res) { c.set(typeof req === "string" ? req : req.url, res); },
        async match(req) { return c.get(typeof req === "string" ? req : req.url); },
        async addAll(urls) { urls.forEach((u) => c.set(new URL(u, ORIGIN).href, new Response("precached"))); },
      };
    },
    async match(req) {
      const key = typeof req === "string" ? new URL(req, ORIGIN).href : req.url;
      for (const c of store.values()) if (c.has(key)) return c.get(key);
      return undefined;
    },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
  };
}

function req(path, { mode = "navigate", accept = "text/html", method = "GET" } = {}) {
  return {
    method,
    url: new URL(path, ORIGIN).href,
    mode,
    headers: new Headers(accept ? { accept } : {}),
  };
}

/* Loads sw.js and hands back the captured handlers + the fake environment.
   `fetchImpl` answers every network request the worker makes. */
function loadSW(fetchImpl) {
  const code = readFileSync(new URL("../../sw.js", import.meta.url), "utf8");
  const handlers = {};
  const calls = [];
  const cachesMock = makeCaches();
  const ctx = {
    self: {
      addEventListener: (type, fn) => { handlers[type] = fn; },
      location: { origin: ORIGIN },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: cachesMock,
    fetch: (r) => { calls.push(r.url); return fetchImpl(r); },
    URL, Response, Headers, Promise, setTimeout, console,
  };
  vm.createContext(ctx);
  // The version constants are script-scoped `const`s, so read them out through
  // an appended line rather than off the context object.
  vm.runInContext(code + "\n;globalThis.__sw = { VERSION, CACHE_NAME, RUNTIME };", ctx);
  return { handlers, calls, caches: cachesMock, names: ctx.__sw, ctx };
}

/* Dispatch a fetch event; returns the Response the worker answered with, or
   `undefined` when the worker declined to handle the request at all. */
async function dispatchFetch(sw, request) {
  let answered;
  const event = { request, respondWith: (p) => { answered = p; } };
  sw.handlers.fetch(event);
  return answered === undefined ? undefined : await answered;
}

const waitUntil = async (handler) => {
  let p;
  handler({ waitUntil: (x) => { p = x; } });
  await p;
};

/* ── 1. one version constant ───────────────────────────────────────────── */

test("both cache names are derived from the same VERSION constant", () => {
  const sw = loadSW(async () => new Response("x"));
  const { VERSION, CACHE_NAME, RUNTIME } = sw.names;
  assert.ok(VERSION, "sw.js must declare a VERSION");
  assert.ok(CACHE_NAME.includes(VERSION), "CACHE_NAME must carry VERSION");
  assert.ok(RUNTIME.includes(VERSION), "RUNTIME must carry VERSION — the bug was that it did not");
  assert.notEqual(CACHE_NAME, RUNTIME);
});

test("activate purges the previous release's RUNTIME cache, not just the precache", async () => {
  const sw = loadSW(async () => new Response("x"));
  // Seed a v32-era pair plus the current pair.
  await (await sw.caches.open("alliance-v32-2026-07-03")).put("/old", new Response("old"));
  await (await sw.caches.open("alliance-runtime-v32")).put("/old", new Response("old"));
  await (await sw.caches.open(sw.names.CACHE_NAME)).put("/new", new Response("new"));
  await (await sw.caches.open(sw.names.RUNTIME)).put("/new", new Response("new"));

  await waitUntil(sw.handlers.activate);

  const left = await sw.caches.keys();
  assert.deepEqual(left.sort(), [sw.names.CACHE_NAME, sw.names.RUNTIME].sort(),
    "every cache not carrying the current VERSION must be deleted");
});

/* ── 2. /admin/ and /api/ are outside the worker ───────────────────────── */

for (const path of ["/admin/", "/admin", "/admin/leads.html", "/api/leads", "/api/health.mjs"]) {
  test(`the worker never handles ${path}`, async () => {
    const sw = loadSW(async () => new Response("should not be reached"));
    const res = await dispatchFetch(sw, req(path));
    assert.equal(res, undefined, "respondWith must not be called — the network answers directly");
    assert.equal(sw.calls.length, 0, "the worker must not fetch it either");
  });
}

test("a path that merely starts with the letters 'admin' is still handled", async () => {
  const sw = loadSW(async () => new Response("<h1>ok</h1>", { status: 200 }));
  const res = await dispatchFetch(sw, req("/administration/"));
  assert.ok(res, "/administration/ is a normal page, not the dashboard");
});

/* ── 3. only real pages are cached ─────────────────────────────────────── */

test("a 200 HTML response is stored in RUNTIME and returned", async () => {
  const sw = loadSW(async () => new Response("<h1>Égypte</h1>", { status: 200 }));
  const res = await dispatchFetch(sw, req("/egypte/"));
  assert.equal(res.status, 200);
  assert.deepEqual(sw.caches.entries(sw.names.RUNTIME), [new URL("/egypte/", ORIGIN).href]);
});

for (const status of [404, 500, 503]) {
  test(`a ${status} HTML response is returned but never cached`, async () => {
    const sw = loadSW(async () => new Response("<h1>error</h1>", { status }));
    const res = await dispatchFetch(sw, req("/egypte/"));
    assert.equal(res.status, status, "the error is still passed through to the page");
    assert.deepEqual(sw.caches.entries(sw.names.RUNTIME), [],
      "an error page must never become the offline answer for that URL");
  });
}

/* ── 4. the offline fallback impersonates nothing ──────────────────────── */

test("offline + never visited: a real offline page, NOT the homepage", async () => {
  const sw = loadSW(async () => { throw new Error("offline"); });
  // The homepage IS in the precache — the old fallback returned exactly this.
  await (await sw.caches.open(sw.names.CACHE_NAME)).put(new URL("/", ORIGIN).href, new Response("<h1>Alliance Travel — accueil</h1>"));

  const res = await dispatchFetch(sw, req("/vietnam/"));
  const body = await res.text();
  assert.equal(res.status, 503, "an offline placeholder must not claim to be the page (200)");
  assert.ok(!body.includes("accueil"), "the homepage must never be served under another URL");
  assert.ok(body.includes("Hors ligne"), "the offline page carries its own copy");
  assert.ok(body.includes('lang="ar"'), "…in all three languages");
});

test("offline + previously visited: the cached page is still served", async () => {
  const sw = loadSW(async () => { throw new Error("offline"); });
  await (await sw.caches.open(sw.names.RUNTIME)).put(new URL("/vietnam/", ORIGIN).href, new Response("<h1>Vietnam</h1>"));
  const res = await dispatchFetch(sw, req("/vietnam/"));
  assert.equal(await res.text(), "<h1>Vietnam</h1>");
});

test("offline + the homepage itself: the precached shell still answers", async () => {
  const sw = loadSW(async () => { throw new Error("offline"); });
  await (await sw.caches.open(sw.names.CACHE_NAME)).put(new URL("/", ORIGIN).href, new Response("<h1>accueil</h1>"));
  const res = await dispatchFetch(sw, req("/"));
  assert.equal(await res.text(), "<h1>accueil</h1>");
});

/* ── 5. untouched behaviour ────────────────────────────────────────────── */

test("a POST is never intercepted", async () => {
  const sw = loadSW(async () => new Response("x"));
  const res = await dispatchFetch(sw, req("/egypte/", { method: "POST" }));
  assert.equal(res, undefined);
});

test("images are cache-first and only cached when ok", async () => {
  const ok = loadSW(async () => new Response("img", { status: 200 }));
  await dispatchFetch(ok, req("/assets/images/a.webp", { mode: "no-cors", accept: "image/webp" }));
  assert.equal(ok.caches.entries(ok.names.RUNTIME).length, 1);

  const bad = loadSW(async () => new Response("nope", { status: 404 }));
  await dispatchFetch(bad, req("/assets/images/a.webp", { mode: "no-cors", accept: "image/webp" }));
  assert.equal(bad.caches.entries(bad.names.RUNTIME).length, 0);
});
