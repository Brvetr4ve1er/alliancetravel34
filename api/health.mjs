// api/health.mjs — public health / uptime check. GET only, 200 with a tiny JSON.
//
// Deliberately trivial: NO auth, NO imports, NO env, NO side effects. This is the
// endpoint an external uptime monitor (UptimeRobot, BetterStack, Pingdom…) pings to
// confirm the deployment is alive. It touches nothing — no Supabase, no GitHub — so
// a green check here means "the function runtime is up", never "the leads DB is up".
// The timestamp is computed per request from a fresh Date; that is fine at runtime.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  return res.status(200).json({
    ok: true,
    service: "alliance-travel",
    time: new Date().toISOString(),
  });
}
