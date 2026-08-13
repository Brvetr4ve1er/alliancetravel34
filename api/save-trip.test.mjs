// api/save-trip.test.mjs
// The highest-authority endpoint in the project: an authenticated caller can
// overwrite data/trips/<slug>.json in the GitHub repo, and the next deploy turns
// that file into a live page. Everything here is about ORDER — which gate runs
// before which side effect — because a gate that fires after the write is not a
// gate. Every assertion therefore also checks how many repo calls happened.
//
// Like revert-trip.test.mjs, every dependency (Supabase auth, GitHub trees/
// contents) reaches the network only through global fetch(), so stubbing
// globalThis.fetch with node:test's built-in `mock` (t.mock.method, auto-restored
// per test) intercepts every call without touching any ES module export binding.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler, { MAX_BODY_BYTES } from "./save-trip.mjs";

process.env.GITHUB_REPO = "owner/repo";
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_BRANCH = "main";
process.env.AT_SUPABASE_URL = "https://example.supabase.co";
process.env.AT_SUPABASE_ANON_KEY = "anon-key";
process.env.ADMIN_EMAILS = "owner@example.com";

// A real, currently-published trip is the only honest happy-path fixture: the
// handler runs the full generator validator AND a dry-run render, so a hand-made
// stub would either fail validation or quietly stop exercising it.
const VALID_TRIP = JSON.parse(
  readFileSync(new URL("../data/trips/istanbul.json", import.meta.url), "utf8"),
);

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function fakeReq(body, { method = "POST", auth = "Bearer tok" } = {}) {
  const headers = {};
  if (auth !== null) headers.authorization = auth;
  return { method, headers, body };
}

// A request with NO pre-parsed body, so readBody() takes the stream path.
function streamReq(chunks, { method = "POST", auth = "Bearer tok" } = {}) {
  const headers = {};
  if (auth !== null) headers.authorization = auth;
  return {
    method, headers,
    async *[Symbol.asyncIterator]() { for (const c of chunks) yield c; },
  };
}

// Dispatches every fetch() call save-trip.mjs's dependencies can make:
//   - Supabase "/auth/v1/user"        (verifyAdmin)
//   - GitHub  "/git/trees/<branch>"   (listTree — image-existence source)
//   - GitHub  "/contents/<path>" GET  (getFile — blob sha when the body omits it)
//   - GitHub  "/contents/<path>" PUT  (putFile — the commit)
//
// The tree defaults to `truncated: true`, which is the documented "cannot prove
// absence" fallback: validateTrip then runs structure-only. That keeps the happy
// path independent of whichever image files happen to be on disk in another lane's
// working tree, while `treeTruncated: false` below still exercises the image gate.
function makeFetch({
  authOk = true,
  adminEmail = "owner@example.com",
  treeTruncated = true,
  treePaths = [],
  currentSha = "current-sha",
  putBehavior = "ok",
} = {}) {
  let putCalls = 0;
  const calls = { auth: 0, tree: 0, getContents: 0, putContents: 0 };
  const fn = async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || "GET";
    if (u.includes("/auth/v1/user")) {
      calls.auth++;
      if (!authOk) return { ok: false, status: 401, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ email: adminEmail }) };
    }
    if (u.includes("/git/trees/")) {
      calls.tree++;
      return {
        ok: true, status: 200,
        json: async () => ({
          truncated: treeTruncated,
          tree: treePaths.map((p) => ({ type: "blob", path: p })),
        }),
      };
    }
    if (u.includes("/contents/") && method === "GET") {
      calls.getContents++;
      return { ok: true, status: 200, json: async () => ({ content: Buffer.from("{}").toString("base64"), sha: currentSha }) };
    }
    if (u.includes("/contents/") && method === "PUT") {
      putCalls++;
      calls.putContents++;
      if (putBehavior === "conflict-then-ok" && putCalls === 1) return { ok: false, status: 409, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ commit: { html_url: "https://github.com/owner/repo/commit/abc" } }) };
    }
    throw new Error(`unexpected fetch: ${method} ${u}`);
  };
  return { fn, calls };
}

const NOTHING_TOUCHED = { auth: 0, tree: 0, getContents: 0, putContents: 0 };

// ---- Method gate --------------------------------------------------------------

test("non-POST → 405 with ZERO fetch calls (the method gate runs first)", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  for (const method of ["GET", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"]) {
    const res = fakeRes();
    await handler({ method, headers: { authorization: "Bearer tok" } }, res);
    assert.equal(res.statusCode, 405, `${method} should be 405`);
  }
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.deepEqual(calls, NOTHING_TOUCHED);
});

// ---- Auth gate ----------------------------------------------------------------

test("missing bearer → 401 with ZERO fetch calls, nothing written", async (t) => {
  const { fn, calls } = makeFetch();
  const fetchMock = t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }, { auth: null }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchMock.mock.calls.length, 0); // not even the auth server is asked
  assert.deepEqual(calls, NOTHING_TOUCHED);
});

test("malformed Authorization header → 401, nothing written", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  for (const auth of ["", "Basic dXNlcjpwYXNz", "Bearer", "token abc"]) {
    const res = fakeRes();
    await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }, { auth }), res);
    assert.equal(res.statusCode, 401, `${JSON.stringify(auth)} should be 401`);
  }
  assert.deepEqual(calls, NOTHING_TOUCHED);
});

test("invalid session (Supabase rejects the token) → 401, nothing written", async (t) => {
  const { fn, calls } = makeFetch({ authOk: false });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls.auth, 1);
  assert.equal(calls.tree, 0);
  assert.equal(calls.putContents, 0);
});

test("valid session but email NOT on ADMIN_EMAILS → 403, nothing written", async (t) => {
  const { fn, calls } = makeFetch({ adminEmail: "stranger@example.com" });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.auth, 1);       // the token was genuinely checked…
  assert.equal(calls.tree, 0);       // …and then the allowlist stopped everything
  assert.equal(calls.putContents, 0);
});

// ---- Slug gate (path traversal) ------------------------------------------------

test("traversal / malformed slugs → 400 BEFORE any repo call", async (t) => {
  const hostile = [
    "../../etc/passwd",
    "..%2f",
    "..%2fetc%2fpasswd",
    "Not Valid!",
    "istanbul/../../secrets",
    "istanbul.json",
    "",
    "..",
    "/",
    "istanbul\0",
    ["../../etc/passwd"],       // array-valued slug
    ["istanbul"],               // …including one that COERCES to a valid slug
    ["istanbul", "bali"],
    null,
    undefined,
    123,
    { slug: "istanbul" },
  ];
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  for (const slug of hostile) {
    const res = fakeRes();
    await handler(fakeReq({ slug, content: { ...VALID_TRIP, slug } }), res);
    assert.equal(res.statusCode, 400, `${JSON.stringify(slug)} should be 400`);
    assert.equal(res.body.error, "invalid slug");
  }
  assert.equal(calls.auth, hostile.length); // auth ran each time…
  assert.equal(calls.tree, 0);              // …and the repo was never touched
  assert.equal(calls.getContents, 0);
  assert.equal(calls.putContents, 0);
});

// ---- Body gates -----------------------------------------------------------------

test("missing/non-object content → 400, nothing written", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  for (const content of [undefined, null, "", "a string", 42]) {
    const res = fakeRes();
    await handler(fakeReq({ slug: "istanbul", content }), res);
    assert.equal(res.statusCode, 400, `${JSON.stringify(content)} should be 400`);
    assert.equal(res.body.error, "missing content");
  }
  assert.equal(calls.tree, 0);
  assert.equal(calls.putContents, 0);
});

test("content.slug !== slug → 400 before any repo call", async (t) => {
  // Otherwise the caller picks the file path with `slug` and the file's identity
  // with `content.slug`, and the two disagree in the committed repo.
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: { ...VALID_TRIP, slug: "bali" } }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /content\.slug/);
  assert.equal(calls.tree, 0);
  assert.equal(calls.putContents, 0);
});

test("unparseable streamed body → 400, nothing written", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(streamReq([Buffer.from("{ not json")]), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "invalid JSON body");
  assert.equal(calls.putContents, 0);
});

test("a body over the cap → 413, nothing written", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const chunk = Buffer.alloc(256 * 1024, 0x61); // 256 KB of 'a'
  const chunks = Array.from({ length: Math.ceil(MAX_BODY_BYTES / chunk.length) + 1 }, () => chunk);
  const res = fakeRes();
  await handler(streamReq(chunks), res);
  assert.equal(res.statusCode, 413);
  assert.equal(res.body.error, "body too large");
  assert.equal(calls.tree, 0);
  assert.equal(calls.putContents, 0);
});

test("the cap leaves room for the largest real trip, and multi-byte text survives chunking", async (t) => {
  // egypte.json, the biggest published trip, is ~166 KB — the cap must not be
  // anywhere near it.
  const biggest = readFileSync(new URL("../data/trips/egypte.json", import.meta.url));
  assert.ok(biggest.length < MAX_BODY_BYTES / 2, `cap ${MAX_BODY_BYTES} too close to ${biggest.length}`);

  // And a character split across a chunk boundary must not be corrupted: the
  // committed bytes are whatever we decode here.
  const payload = Buffer.from(JSON.stringify({ slug: "istanbul", content: { ...VALID_TRIP, region: "Grèce — الشرق" }, sha: "s" }), "utf8");
  const mid = payload.indexOf(Buffer.from("Grèce", "utf8")) + 3; // lands inside "è"
  let seen;
  const { fn } = makeFetch();
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") seen = JSON.parse(opts.body);
    return fn(url, opts);
  });
  const res = fakeRes();
  await handler(streamReq([payload.subarray(0, mid), payload.subarray(mid)]), res);
  assert.equal(res.statusCode, 200);
  assert.match(Buffer.from(seen.content, "base64").toString("utf8"), /Grèce — الشرق/);
});

// ---- Validation gate ------------------------------------------------------------

test("validator errors → 422 and NO write", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: { slug: "istanbul" } }), res);
  assert.equal(res.statusCode, 422);
  assert.ok(Array.isArray(res.body.errors) && res.body.errors.length);
  assert.equal(calls.tree, 1);        // the tree was read to resolve images…
  assert.equal(calls.putContents, 0); // …and nothing was committed
  assert.equal(calls.getContents, 0);
});

test("a missing image is caught by the tree check → 422, no write", async (t) => {
  // Non-truncated tree with zero blobs: every referenced image is "absent", which
  // is exactly what would break the next full rebuild.
  const { fn, calls } = makeFetch({ treeTruncated: false, treePaths: [] });
  t.mock.method(globalThis, "fetch", fn);
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }), res);
  assert.equal(res.statusCode, 422);
  assert.ok(res.body.errors.length);
  assert.equal(calls.putContents, 0);
});

test("an unreachable GitHub tree is surfaced, never written through", async (t) => {
  const { fn, calls } = makeFetch();
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (String(url).includes("/git/trees/")) return { ok: false, status: 500, json: async () => ({}) };
    return fn(url, opts);
  });
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(calls.putContents, 0);
});

// ---- Commit ----------------------------------------------------------------------

test("happy path: exactly one PUT, to the right path, with the caller's sha", async (t) => {
  const { fn, calls } = makeFetch();
  let putUrl, putBody;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") { putUrl = String(url); putBody = JSON.parse(opts.body); }
    return fn(url, opts);
  });

  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP, sha: "caller-sha" }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.commitUrl);

  assert.equal(calls.putContents, 1);   // exactly one write
  assert.equal(calls.getContents, 0);   // the caller supplied the sha, so no re-read

  assert.ok(putUrl.endsWith("/contents/data/trips/istanbul.json"), putUrl);
  assert.equal(putBody.sha, "caller-sha");
  assert.equal(putBody.branch, "main");
  assert.ok(putBody.message.includes("content(istanbul)"));
  assert.ok(putBody.message.includes("owner@example.com")); // the acting admin is on record

  // The committed bytes are the submitted trip, pretty-printed with a trailing
  // newline — byte-identical to what tools/build.mjs reads back off disk.
  const committed = Buffer.from(putBody.content, "base64").toString("utf8");
  assert.equal(committed, JSON.stringify(VALID_TRIP, null, 2) + "\n");
  assert.deepEqual(JSON.parse(committed), VALID_TRIP);
});

test("no sha in the body → the current one is read first, then committed once", async (t) => {
  const { fn, calls } = makeFetch({ currentSha: "fetched-sha" });
  let putBody;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") putBody = JSON.parse(opts.body);
    return fn(url, opts);
  });
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.getContents, 1);
  assert.equal(calls.putContents, 1);
  assert.equal(putBody.sha, "fetched-sha");
});

test("stale sha (409) is retried EXACTLY once: refetch sha, then commit succeeds", async (t) => {
  const { fn, calls } = makeFetch({ putBehavior: "conflict-then-ok", currentSha: "fresh-sha" });
  const putShas = [];
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") putShas.push(JSON.parse(opts.body).sha);
    return fn(url, opts);
  });
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP, sha: "stale-sha" }), res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.commitUrl);
  assert.equal(calls.putContents, 2);          // first attempt (409) + one retry
  assert.equal(calls.getContents, 1);          // the retry re-read the sha
  assert.deepEqual(putShas, ["stale-sha", "fresh-sha"]);
});

test("a 409 that repeats is reported, not retried forever", async (t) => {
  const { fn } = makeFetch();
  let puts = 0; // counted here: this stub answers PUTs itself and never reaches fn
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (opts?.method === "PUT") { puts++; return { ok: false, status: 409, json: async () => ({}) }; }
    return fn(url, opts);
  });
  const res = fakeRes();
  await handler(fakeReq({ slug: "istanbul", content: VALID_TRIP, sha: "stale" }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(puts, 2); // the original + exactly one retry, then stop
});
