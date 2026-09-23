// site/admin/publish-watch.test.mjs
//
// The state machine that replaced "la page sera à jour dans ~1 minute" with a
// checked answer. Every edge is injected, so none of this waits on a clock.
//
// What these lock, in order of how much they cost when wrong:
//   • "live" is never claimed without evidence — that is the whole feature.
//   • a runtime that cannot name its build stops immediately instead of
//     spending five minutes to reach a verdict its first answer ruled out.
//   • a dropped poll is not an outcome; the watch keeps going.
//   • leaving the page abandons the watch, so it cannot write into a form the
//     owner has already navigated away from.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deployState, watchPublish, POLL_DELAYS_MS, WATCH_WINDOW_MS, HEALTH_URL } from "./publish-watch.js";

const SHA = "1f0c2b7a4e5d6c8b9a0f1e2d3c4b5a6978695847";

/** A watch whose sleeps are instant and whose polls come from a script. */
function run({ commitSha = SHA, answers = [], onState = () => {}, shouldStop = () => false } = {}) {
  let i = 0;
  const polls = [];
  return watchPublish({
    commitSha,
    sleep: async () => {},
    shouldStop,
    onState,
    fetchHealth: async () => {
      // The last scripted answer repeats, so a test only lists the transitions.
      const a = answers[Math.min(i, answers.length - 1)];
      i++;
      polls.push(a);
      if (a instanceof Error) throw a;
      return a;
    },
  }).then((state) => ({ state, polls: i }));
}

const serving = (commit) => ({ ok: true, commit, deployment: "dpl_x" });
const other = serving("0000000000000000000000000000000000000000");

// ── deployState, the one decision everything else defers to ──────────────

test("live only when the running deployment IS this commit", () => {
  assert.equal(deployState(serving(SHA), SHA), "live");
  assert.equal(deployState(other, SHA), "waiting");
});

test("a failed poll is 'waiting', not a verdict", () => {
  // A single dropped request mid-deploy is ordinary. Treating it as conclusive
  // would report a perfectly good publish as unverifiable.
  assert.equal(deployState(null, SHA), "waiting");
  assert.equal(deployState(undefined, SHA), "waiting");
  assert.equal(deployState("not json", SHA), "waiting");
});

test("a runtime that reports no commit is conclusive about being inconclusive", () => {
  assert.equal(deployState({ ok: true, commit: null }, SHA), "unconfirmable");
  assert.equal(deployState({ ok: true }, SHA), "unconfirmable");
});

test("with no commit of our own there is nothing to compare against", () => {
  assert.equal(deployState(serving(SHA), null), "unconfirmable");
  assert.equal(deployState(serving(SHA), undefined), "unconfirmable");
});

test("an abbreviated SHA matches only well above the length where it could collide", () => {
  // Neither API abbreviates today. If one ever did, requiring exact equality
  // would silently never hold and every publish would time out looking
  // healthy-but-unconfirmed — so a prefix is accepted, but with a 12-character
  // floor rather than git's DISPLAY default of 7.
  //
  // The two failure directions are not symmetric, which is what sets the floor:
  // failing to match costs a "slow" message on a publish that was fine; matching
  // the WRONG commit tells the owner an edit is live when it is not. The bar
  // therefore sits where the safe failure is the cheap one.
  assert.equal(deployState(serving(SHA.slice(0, 12)), SHA), "live");
  assert.equal(deployState(serving(SHA), SHA.slice(0, 12)), "live");
  assert.equal(deployState(serving(SHA.slice(0, 7)), SHA), "waiting",
    "7 hex characters is a display convenience, not an identity");
  assert.equal(deployState(serving(SHA.slice(0, 4)), SHA), "waiting");
});

test("SHA comparison ignores case", () => {
  assert.equal(deployState(serving(SHA.toUpperCase()), SHA), "live");
});

// ── watchPublish ─────────────────────────────────────────────────────────

test("it waits through the old build and reports live on the poll that flips", async () => {
  const seen = [];
  const { state, polls } = await run({
    answers: [other, other, other, serving(SHA)],
    onState: (s) => seen.push(s),
  });
  assert.equal(state, "live");
  assert.equal(polls, 4, "it stopped on the answer that proved it, not later");
  assert.deepEqual(seen, ["deploying", "live"]);
});

test("a build that never arrives ends in 'slow' — which is not 'failed'", async () => {
  // The commit is in GitHub either way. An unexposed env var, an ignored build
  // step, or a genuinely slow build all land here, and none of them means the
  // owner's text was lost — so the state is named for the wait, not a failure.
  const seen = [];
  const { state, polls } = await run({ answers: [other], onState: (s) => seen.push(s) });
  assert.equal(state, "slow");
  assert.equal(polls, POLL_DELAYS_MS.length, "it used the whole window before giving up");
  assert.deepEqual(seen, ["deploying", "slow"]);
});

test("no commit to watch: it says so without a single request", async () => {
  let polled = 0;
  const seen = [];
  const state = await watchPublish({
    commitSha: null,
    sleep: async () => {},
    fetchHealth: async () => { polled++; return serving(SHA); },
    onState: (s) => seen.push(s),
  });
  assert.equal(state, "unconfirmable");
  assert.equal(polled, 0);
  assert.deepEqual(seen, ["unconfirmable"], "and it never claimed to be deploying");
});

test("a runtime that will not name its build stops on the first answer", async () => {
  const { state, polls } = await run({ answers: [{ ok: true, commit: null }] });
  assert.equal(state, "unconfirmable");
  assert.equal(polls, 1, "five minutes of polling cannot make a blind runtime talk");
});

test("dropped polls are survived, not surrendered to", async () => {
  const { state, polls } = await run({
    answers: [new Error("offline"), new Error("offline"), serving(SHA)],
  });
  assert.equal(state, "live");
  assert.equal(polls, 3);
});

test("leaving the page abandons the watch before it can paint anything", async () => {
  // edit-pages.js passes its loadSeq token here. Without this, a watch started
  // on one trip could write "En ligne ✓" into the editor of another.
  const seen = [];
  let gone = false;
  const { state } = await run({
    answers: [other, serving(SHA)],
    shouldStop: () => gone,
    onState: (s) => { seen.push(s); gone = true; },
  });
  assert.equal(state, "abandoned");
  assert.deepEqual(seen, ["deploying"], "no verdict was reported after the owner left");
});

test("the polling window is about five minutes, spread over ~20 requests", () => {
  // /api/health touches no database and no third party, but this is still a
  // budget and it should stay a deliberate one.
  assert.ok(WATCH_WINDOW_MS >= 4 * 60_000, `window is only ${WATCH_WINDOW_MS}ms`);
  assert.ok(WATCH_WINDOW_MS <= 6 * 60_000, `window is ${WATCH_WINDOW_MS}ms — too long to sit watching`);
  assert.ok(POLL_DELAYS_MS.length <= 24, `${POLL_DELAYS_MS.length} requests is more than this needs`);
  assert.ok(POLL_DELAYS_MS.every((d) => d >= 5000), "no delay tight enough to look like a hammer");
});

test("the health URL keeps its trailing slash", () => {
  // vercel.json sets trailingSlash:true, so "/api/health" answers 308. Without
  // the slash every poll is two round trips — forty requests for twenty
  // questions — and it would never show up as a bug, only as latency.
  assert.equal(HEALTH_URL, "/api/health/");
  assert.ok(HEALTH_URL.startsWith("/"), "same-origin, so no host to get wrong");
});
