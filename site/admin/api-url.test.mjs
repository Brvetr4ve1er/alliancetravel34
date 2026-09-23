// site/admin/api-url.test.mjs
//
// Small function, one job, and it is the kind of job that fails invisibly: if
// the slash stops being added nothing BREAKS — vercel's 308 preserves method and
// body — every admin action just silently costs two round trips again. There is
// no error to notice, only latency nobody attributes to this. Hence the tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { apiUrl } from "./api-url.js";

test("a slashless path gets its slash", () => {
  assert.equal(apiUrl("/api/me"), "/api/me/");
  assert.equal(apiUrl("/api/save-trip"), "/api/save-trip/");
});

test("an already-slashed path is left alone", () => {
  // publish-watch.js passes "/api/health/" directly; double-slashing it would
  // produce "/api/health//", which is a different route.
  assert.equal(apiUrl("/api/health/"), "/api/health/");
  assert.equal(apiUrl("/api/status/"), "/api/status/");
});

test("the slash lands before the query string, not after it", () => {
  // /api/get-trip is the only call with a query. "/api/get-trip?slug=x/" would
  // ask for a trip whose slug ends in a slash.
  assert.equal(apiUrl("/api/get-trip?slug=istanbul"), "/api/get-trip/?slug=istanbul");
  assert.equal(apiUrl("/api/get-trip/?slug=istanbul"), "/api/get-trip/?slug=istanbul");
});

test("only the FIRST ? splits — a query value may contain one", () => {
  assert.equal(apiUrl("/api/x?a=1?2&b=3"), "/api/x/?a=1?2&b=3");
});

test("an empty query is preserved rather than quietly dropped", () => {
  assert.equal(apiUrl("/api/x?"), "/api/x/?");
});

test("degenerate input does not throw", () => {
  // callApi is called from event handlers; a throw here would surface as a dead
  // button rather than an error.
  assert.equal(apiUrl(""), "");
  assert.equal(apiUrl(null), "");
  assert.equal(apiUrl(undefined), "");
});

test("every /api/ call site in site/admin/ reaches callApi, which normalises", async () => {
  // The guarantee is "callApi normalises", so it only holds if nothing bypasses
  // callApi with a bare fetch to /api/*. publish-watch.js is the ONE deliberate
  // exception (it polls health without a bearer token) and carries its own slash.
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = new URL("./", import.meta.url);
  const offenders = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".js"))) {
    const src = readFileSync(new URL(f, dir), "utf8");
    for (const m of src.matchAll(/fetch\(\s*["'`](\/api\/[^"'`]*)/g)) {
      if (f === "publish-watch.js") continue;
      offenders.push(`${f}: fetch("${m[1]}") bypasses callApi`);
    }
  }
  assert.deepEqual(offenders, []);
});
