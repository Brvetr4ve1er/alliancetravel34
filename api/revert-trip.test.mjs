// api/revert-trip.test.mjs
// Exercises the endpoint's auth -> find-previous -> commit sequencing.
// Like save-trip, every dependency (Supabase auth, GitHub commits/contents)
// talks to the network only through global fetch(), so stubbing globalThis.fetch
// with node:test's built-in `mock` (t.mock.method, auto-restored per test)
// intercepts every call without touching any ES module export bindings.
import { test } from "node:test";
import assert from "node:assert/strict";
import handler, { MAX_BODY_BYTES } from "./revert-trip.mjs";

process.env.GITHUB_REPO = "owner/repo";
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_BRANCH = "main";
process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com";

// The bytes of the file as of the commit BEFORE the last publish — what a
// successful revert must re-publish verbatim.
const priorContent = '{\n  "slug": "istanbul",\n  "meta": { "title": "Version precedente" }\n}\n';

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function fakeReq(body) {
  return { method: "POST", headers: { authorization: "Bearer tok" }, body };
}

// A request with NO pre-parsed body, so readBody() takes the stream path
// (mirrors save-trip.test.mjs / notify-lead.test.mjs).
function streamReq(chunks) {
  return {
    method: "POST", headers: { authorization: "Bearer tok" },
    async *[Symbol.asyncIterator]() { for (const c of chunks) yield c; },
  };
}

// Dispatches every fetch() call revert-trip.mjs's dependencies can make:
//   - Supabase "/auth/v1/user"                  (verifyAdmin)
//   - GitHub  "/commits?path=..."               (listCommits)
//   - GitHub  "/contents/<path>?ref=<prevSha>"  (getFileAtRef — the prior blob)
//   - GitHub  "/contents/<path>?ref=main" GET   (getFile — current blob sha)
//   - GitHub  "/contents/<path>" PUT            (putFile — the forward revert)
// `commits` defaults to two entries (a publish + a prior version); pass one
// entry to exercise the "nothing to roll back to" path.
function makeFetch({
  authOk = true,
  commits = [{ sha: "commit-new" }, { sha: "commit-prev" }],
  putBehavior = "ok",
} = {}) {
  let putCalls = 0;
  const calls = { auth: 0, commits: 0, getAtRef: 0, getCurrent: 0, putContents: 0 };
  const fn = async (url, opts = {}) => {
    const method = opts.method || "GET";
    if (url.includes("/auth/v1/user")) {
      calls.auth++;
      if (!authOk) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ email: "owner@example.com" }) };
    }
    if (url.includes("/commits")) {
      calls.commits++;
      return { ok: true, status: 200, json: async () => commits };
    }
    if (url.includes("/contents/") && method === "GET" && url.includes("ref=commit-prev")) {
      calls.getAtRef++;
      return { ok: true, status: 200, json: async () => ({ content: Buffer.from(priorContent).toString("base64"), sha: "prev-blob-sha" }) };
    }
    if (url.includes("/contents/") && method === "GET") {
      calls.getCurrent++;
      return { ok: true, status: 200, json: async () => ({ content: Buffer.from("{}").toString("base64"), sha: "current-sha" }) };
    }
    if (url.includes("/contents/") && method === "PUT") {
      putCalls++;
      calls.putContents++;
      if (putBehavior === "conflict-then-ok" && putCalls === 1) return { ok: false, status: 409, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ commit: { html_url: "https://github.com/owner/repo/commit/rev" } }) };
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  };
  return { fn, calls };
}

test("rejects non-POST requests before touching the network", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, { auth: 0, commits: 0, getAtRef: 0, getCurrent: 0, putContents: 0 });
});

test("auth failure short-circuits — nothing is read or committed", async (t) => {
  const { fn, calls } = makeFetch({ authOk: false });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul" }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.auth, 1);
  assert.equal(calls.commits, 0);
  assert.equal(calls.putContents, 0);
});

test("invalid slug is rejected before any repo call", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "Not Valid!" }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.commits, 0);
  assert.equal(calls.putContents, 0);
});

test("no previous version → clean error, nothing committed", async (t) => {
  const { fn, calls } = makeFetch({ commits: [{ sha: "only-commit" }] });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul" }), res);
  assert.equal(res.statusCode, 409);
  assert.ok(res.body.error); // a human-readable reason, not a crash
  assert.equal(calls.getAtRef, 0);
  assert.equal(calls.putContents, 0);
});

test("happy path: commits the prior version back exactly once", async (t) => {
  const { fn, calls } = makeFetch();
  let putUrl, putBody;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") { putUrl = url; putBody = JSON.parse(opts.body); }
    return fn(url, opts);
  });

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.commitUrl);

  assert.equal(calls.commits, 1);
  assert.equal(calls.getAtRef, 1);     // read the prior blob
  assert.equal(calls.getCurrent, 1);   // read the current sha to overwrite HEAD
  assert.equal(calls.putContents, 1);  // exactly one forward commit

  assert.ok(putUrl.endsWith("/contents/data/trips/istanbul.json"));
  assert.equal(putBody.sha, "current-sha"); // overwrites HEAD, not the old blob
  const decoded = Buffer.from(putBody.content, "base64").toString("utf8");
  assert.equal(decoded, priorContent); // restores the previous bytes verbatim
  assert.ok(putBody.message.includes("revert(istanbul)"));
  assert.ok(putBody.message.includes("owner@example.com"));
});

// ── body handling ─────────────────────────────────────────────────────
// save-trip.mjs and notify-lead.mjs both cap the streamed body at the same
// 1 MB; this endpoint used to accumulate `raw += chunk` with no cap at all.
// Its body is only {slug}, so nothing was exploitable here — but the cap is
// documented across the three routes as "one number to reason about", and a
// route that opts out quietly makes that sentence false.

test("a streamed body over the cap → 413, nothing read or committed", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const chunk = Buffer.alloc(256 * 1024, 0x61); // 256 KB of 'a'
  const chunks = Array.from({ length: Math.ceil(MAX_BODY_BYTES / chunk.length) + 1 }, () => chunk);
  const res = fakeRes();
  await handler(streamReq(chunks), res);
  assert.equal(res.statusCode, 413);
  assert.equal(res.body.error, "body too large");
  assert.equal(calls.auth, 1);        // auth runs first, by design
  assert.equal(calls.commits, 0);
  assert.equal(calls.putContents, 0); // the repo is never touched
});

test("the cap matches the other write route, so there is one number", async () => {
  const { MAX_BODY_BYTES: saveCap } = await import("./save-trip.mjs");
  assert.equal(MAX_BODY_BYTES, saveCap);
});

test("an ordinary streamed body still reverts, split mid-character", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  // The slug is ASCII, but the decode must survive a chunk boundary inside a
  // multi-byte character all the same — accumulating strings would mangle it.
  const payload = Buffer.from(JSON.stringify({ slug: "istanbul", note: "Béjaïa" }), "utf8");
  const mid = payload.indexOf(Buffer.from("Béjaïa", "utf8")) + 2; // inside "é"
  const res = fakeRes();
  await handler(streamReq([payload.subarray(0, mid), payload.subarray(mid)]), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.putContents, 1);
});

test("an unparseable streamed body → 400, nothing committed", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(streamReq([Buffer.from("{ not json")]), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "invalid JSON body");
  assert.equal(calls.putContents, 0);
});

test("stale sha (409) is retried exactly once: refetch sha, then commit succeeds", async (t) => {
  const { fn, calls } = makeFetch({ putBehavior: "conflict-then-ok" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul" }), res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.commitUrl);
  assert.equal(calls.putContents, 2); // first attempt (409) + retry
  assert.equal(calls.getCurrent, 2);  // initial sha read + the retry's re-read
});
