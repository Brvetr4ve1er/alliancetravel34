// site/admin/publish-watch.js — wait for a commit to actually be serving.
//
// WHY THIS EXISTS. Publishing an edit commits a JSON file; the page the visitor
// sees is rebuilt by Vercel afterwards. The dashboard had no view of that second
// half, so it printed a guess — "Publié ✓ — la page sera à jour dans ~1 minute"
// — and stopped. When the rebuild takes three minutes, or the branch is not the
// one being deployed, or the build fails, the owner refreshes the site, sees the
// old page, and concludes the dashboard did nothing. That is very close to the
// complaint we were handed: "the edits don't go through, nothing changes".
//
// The fix is to stop guessing. api/save-trip.mjs now returns the SHA of the
// commit it made, and /api/health reports the commit SHA of the deployment
// answering right now. Poll one against the other and the dashboard can say
// "en ligne" as a fact, with a timestamp, or admit that it cannot tell.
//
// THREE OUTCOMES, and the third is the point:
//   live          — the running deployment IS this commit. Proven.
//   slow          — the window elapsed. NOT a failure: the commit is safely in
//                   GitHub, and an unexposed env var, an "ignored build step" or
//                   a genuinely slow build all land here. The wording must not
//                   claim the edit was lost, because it was not.
//   unconfirmable — /api/health reports no commit at all (local static preview,
//                   or a project that does not expose system env vars to the
//                   runtime). Stop immediately rather than poll for five minutes
//                   to reach a conclusion we already know we cannot draw.
//
// PURE CORE, injected edges: `fetchHealth`, `sleep` and `onState` are passed in,
// so the whole state machine runs in Node under test with no timers and no DOM.

/**
 * Delays between polls, in ms. Tight at first because the common case is a
 * ~60-90s build, then widening so a slow build costs a handful of requests
 * rather than a steady drumbeat. Sums to ~5 minutes over 20 requests against an
 * endpoint that touches no database and no third party.
 */
export const POLL_DELAYS_MS = [
  8000, 8000, 8000, 8000, 8000, 8000,
  10000, 10000, 10000, 12000, 12000, 15000,
  15000, 20000, 20000, 25000, 25000, 30000, 30000, 30000,
];

/** Total time watchPublish will wait before reporting "slow". */
export const WATCH_WINDOW_MS = POLL_DELAYS_MS.reduce((a, b) => a + b, 0);

/**
 * deployState(health, commitSha) -> "live" | "waiting" | "unconfirmable"
 *
 * `health` is the parsed /api/health body, or null when the request failed.
 * A failed request is "waiting", never "unconfirmable": a single dropped poll
 * mid-deploy is ordinary, and giving up on it would report a healthy publish as
 * unverifiable. Only a body that answers with no commit at all is conclusive
 * about our inability to conclude.
 */
export function deployState(health, commitSha) {
  if (!commitSha) return "unconfirmable";
  if (!health || typeof health !== "object") return "waiting";
  if (!health.commit) return "unconfirmable";
  // Compare full SHAs case-insensitively. GitHub and Vercel both report the
  // 40-character form here, but an abbreviated SHA on either side would make
  // equality silently never true, so accept a prefix match in that direction.
  const live = String(health.commit).toLowerCase();
  const mine = String(commitSha).toLowerCase();
  const match = live === mine || (live.length >= 7 && mine.startsWith(live)) ||
                (mine.length >= 7 && live.startsWith(mine));
  return match ? "live" : "waiting";
}

/**
 * watchPublish({ commitSha, fetchHealth, sleep, onState, shouldStop }) -> final state
 *
 * `onState` is called with each transition so the caller can narrate; the same
 * value is returned at the end. `shouldStop()` is checked before every poll —
 * edit-pages.js passes the same `loadSeq` token its own stale-answer guard uses,
 * so leaving the trip (or opening another) abandons the watch instead of writing
 * into a form that no longer exists.
 */
export async function watchPublish({
  commitSha,
  fetchHealth,
  sleep,
  onState = () => {},
  shouldStop = () => false,
} = {}) {
  if (!commitSha) { onState("unconfirmable"); return "unconfirmable"; }
  onState("deploying");

  for (const delay of POLL_DELAYS_MS) {
    await sleep(delay);
    if (shouldStop()) return "abandoned";

    let health = null;
    // A throw here is a dropped poll, not an outcome — `deployState` reads null
    // as "waiting" and the loop simply tries again on the next tick.
    try { health = await fetchHealth(); } catch { health = null; }
    if (shouldStop()) return "abandoned";

    const state = deployState(health, commitSha);
    if (state === "live") { onState("live"); return "live"; }
    if (state === "unconfirmable") { onState("unconfirmable"); return "unconfirmable"; }
  }

  onState("slow");
  return "slow";
}

/**
 * The browser edge: read /api/health without auth and without any cache.
 *
 * Deliberately NOT routed through AT_ADMIN.callApi — that attaches a bearer
 * token, and this endpoint takes none. `cache: "no-store"` is belt to the
 * handler's braces (it sets Cache-Control: no-store); a cached answer to "which
 * build is live?" would report the PREVIOUS deployment for the whole window.
 * The service worker never touches /api/* (see sw.js `isExcluded`), so nothing
 * else can intervene.
 */
export async function fetchHealthFromBrowser() {
  const res = await fetch("/api/health", { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}
