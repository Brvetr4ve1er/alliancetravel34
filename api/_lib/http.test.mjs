// api/_lib/http.test.mjs
//
// The deadline policy is only worth anything if every outbound call actually
// carries it, and that is exactly the kind of thing a new route forgets. So the
// assertion here is structural: walk the real source of every route and helper
// in api/, find each `await fetch(`, balance its parentheses, and require a
// `signal:` inside that call.
//
// Why it matters: each fetch already had a try/catch mapping a refused
// connection to 502, which made the gap invisible. A third party that ACCEPTS
// the connection and then stalls never reaches that catch — it held the
// function open until Vercel killed it at maxDuration and returned a bare 504.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { deadline, AUTH_TIMEOUT_MS, GITHUB_TIMEOUT_MS,
         SUPABASE_QUERY_TIMEOUT_MS, EMAIL_TIMEOUT_MS } from "./http.mjs";

const API_DIR = new URL("../", import.meta.url);

/** Every non-test .mjs under api/, including _lib/. */
function sources(dir = API_DIR, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const u = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
    if (e.isDirectory()) sources(u, out);
    else if (e.name.endsWith(".mjs") && !e.name.includes(".test.")) out.push(u);
  }
  return out;
}

/** The full text of each `await fetch( … )` call, parens balanced. */
function fetchCalls(src) {
  const calls = [];
  for (let i = src.indexOf("await fetch("); i !== -1; i = src.indexOf("await fetch(", i + 1)) {
    let depth = 0;
    for (let j = src.indexOf("(", i); j < src.length; j++) {
      if (src[j] === "(") depth++;
      else if (src[j] === ")" && --depth === 0) { calls.push(src.slice(i, j + 1)); break; }
    }
  }
  return calls;
}

test("every outbound fetch in api/ carries a deadline", () => {
  const offenders = [];
  let seen = 0;
  for (const file of sources()) {
    for (const call of fetchCalls(readFileSync(file, "utf8"))) {
      seen++;
      if (!call.includes("signal:")) {
        offenders.push(`${file.pathname.split("/api/")[1]}: ${call.split("\n")[0].trim()}`);
      }
    }
  }
  assert.ok(seen >= 8, `expected to find the known call sites, saw ${seen}`);
  assert.deepEqual(offenders, [], `fetch without a timeout:\n  ${offenders.join("\n  ")}`);
});

test("the budgets fit inside save-trip's 30s ceiling", () => {
  // save-trip is the tightest path: verify the session, read a file, write one.
  assert.ok(AUTH_TIMEOUT_MS + GITHUB_TIMEOUT_MS * 2 < 30000,
    "auth + two GitHub calls must leave headroom under maxDuration");
  for (const ms of [AUTH_TIMEOUT_MS, GITHUB_TIMEOUT_MS, SUPABASE_QUERY_TIMEOUT_MS, EMAIL_TIMEOUT_MS]) {
    assert.ok(Number.isInteger(ms) && ms > 0 && ms <= 30000, `implausible budget: ${ms}`);
  }
});

test("deadline() yields a real AbortSignal that is not already aborted", () => {
  const s = deadline(50);
  assert.ok(s instanceof AbortSignal);
  assert.equal(s.aborted, false);
});
