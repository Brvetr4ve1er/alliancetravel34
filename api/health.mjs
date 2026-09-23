// api/health.mjs — public health / uptime check. GET only, 200 with a tiny JSON.
//
// Deliberately trivial: NO auth, NO imports, NO side effects. This is the
// endpoint an external uptime monitor (UptimeRobot, BetterStack, Pingdom…) pings to
// confirm the deployment is alive. It touches nothing — no Supabase, no GitHub — so
// a green check here means "the function runtime is up", never "the leads DB is up".
// The timestamp is computed per request from a fresh Date; that is fine at runtime.
//
// It also reports WHICH build is answering, and that is the one thing here that
// is not just for uptime monitors. After the dashboard commits an edit it had no
// way to tell the owner when that edit was actually serving — it said "à jour
// dans ~1 minute", which is a guess printed as a status. The client's complaint
// ("the edits don't go through, nothing changes") is exactly what a guess looks
// like when the wait is longer than the sentence claims. `commit` is the commit
// SHA of the running deployment, so the editor can poll until it equals the SHA
// GitHub returned for its own commit and then say "en ligne" from evidence.
//
// Both fields are read defensively. VERCEL_GIT_COMMIT_SHA is only present when
// the project exposes system environment variables to the runtime, and NEITHER
// exists on a local static preview — so both may be null, and the caller must
// treat null as "cannot confirm", never as "not deployed". `deployment` is the
// weaker fallback: it changes on every deploy without identifying which commit,
// which is enough to notice that *a* new build took over.
export default async function handler(req, res) {
  // HEAD as well as GET: this endpoint's stated audience is uptime monitors, and
  // HEAD is a common probe mode for them — answering their default with a 405
  // reads as an outage. The runtime drops the body for a HEAD itself.
  if (req.method !== "GET" && req.method !== "HEAD")
    return res.status(405).json({ error: "method not allowed" });
  // Without this a CDN or an intermediary may hand the poller a cached body, and
  // a cached answer to "which build is live?" is worse than no answer: it would
  // report the previous deployment as current for the whole polling window.
  if (typeof res.setHeader === "function") res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    service: "alliance-travel",
    time: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID || null,
  });
}
