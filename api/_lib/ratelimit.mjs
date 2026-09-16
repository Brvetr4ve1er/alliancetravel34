// api/_lib/ratelimit.mjs — a cap on how often one caller can make us spend money.
//
// WHAT THIS IS FOR. Two routes turn an unauthenticated request into an OUTBOUND
// call of ours: /api/me verifies a bearer token against Supabase (a token that
// is merely wrong still costs a round trip — only a MISSING one short-circuits),
// and /api/notify-lead sends email through Resend if the shared secret is
// presented. Neither is a data leak; both are an amplification, where somebody
// else's loop is billed to us and burns function time.
//
// WHAT THIS IS NOT. The counters live in module scope, so they are per instance
// and vanish when it recycles. Vercel keeps instances warm and reuses them, so
// a flood from one source does meet a counter that remembers it — but a caller
// spread across many sources, or arriving after a cold start, will not be
// caught. That makes this a brake on runaway clients, retry storms and casual
// hammering; it is NOT a defence against a distributed attack. Doing that
// properly needs shared state (Vercel KV, Upstash), which is an account, a
// dependency and a secret this repo deliberately does not have. Said plainly
// here so nobody later mistakes this for more than it is.
//
// Fails OPEN by design: if anything in here throws, the request proceeds. A
// rate limiter that takes the site down is worse than no rate limiter.

const buckets = new Map();
const MAX_KEYS = 5000;          // bounded so a spray of unique IPs cannot grow this forever

/** The caller's address, as Vercel reports it. */
export function clientKey(req) {
  const h = (req && req.headers) || {};
  const xff = h["x-forwarded-for"] || h["X-Forwarded-For"];
  const first = Array.isArray(xff) ? xff[0] : String(xff || "").split(",")[0];
  return first.trim() || (req && req.socket && req.socket.remoteAddress) || "unknown";
}

function sweep(now) {
  for (const [k, b] of buckets) if (now - b.start > b.windowMs) buckets.delete(k);
  if (buckets.size > MAX_KEYS) buckets.clear();   // last resort; counters are disposable
}

/**
 * rateLimit(key, { limit, windowMs }) -> { ok, remaining, retryAfter }
 * A fixed window, not a sliding one: simpler to reason about, and the failure
 * mode (a caller gets up to 2x limit across a window boundary) does not matter
 * for a brake.
 */
export function rateLimit(key, budget) {
  try {
    // Destructured INSIDE the try: doing it in the parameter list throws before
    // the catch can fail open, which is the one thing this must never do.
    const { limit, windowMs } = budget || {};
    if (!Number.isFinite(limit) || !Number.isFinite(windowMs)) return { ok: true, remaining: 0, retryAfter: 0 };
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now - b.start >= b.windowMs) {
      buckets.set(key, { count: 1, start: now, windowMs });
      if (buckets.size > 64) sweep(now);
      return { ok: true, remaining: limit - 1, retryAfter: 0 };
    }
    b.count += 1;
    if (b.count > limit) {
      return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((b.start + windowMs - now) / 1000)) };
    }
    return { ok: true, remaining: limit - b.count, retryAfter: 0 };
  } catch {
    return { ok: true, remaining: 0, retryAfter: 0 };   // fail open
  }
}

/** Budgets. Generous enough that a real admin session never notices. */
export const AUTH_PROBE = { limit: 30, windowMs: 60_000 };   // /api/me
export const WEBHOOK    = { limit: 60, windowMs: 60_000 };   // /api/notify-lead

/** Applies a budget and writes the 429 itself. Returns true when it handled the response. */
export function limited(req, res, budget) {
  const r = rateLimit(clientKey(req), budget);
  if (r.ok) return false;
  try { res.setHeader("Retry-After", String(r.retryAfter)); } catch { /* header already sent */ }
  res.status(429).json({ error: "too many requests" });
  return true;
}

/** Tests only. */
export function _reset() { buckets.clear(); }
