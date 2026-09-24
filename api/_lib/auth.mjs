// api/_lib/auth.mjs — identity + allowlist for privileged endpoints.
// No service-role key: the caller's own Supabase token is verified against
// the Auth server, then the returned email is checked against ADMIN_EMAILS.
import { deadline, AUTH_TIMEOUT_MS } from "./http.mjs";
import { rateLimit, clientKey, AUTH_PROBE } from "./ratelimit.mjs";

export function parseBearer(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export function isAllowed(email) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email).trim().toLowerCase());
}

// AT_-prefixed names take precedence: the Vercel<->Supabase marketplace
// integration injects SUPABASE_URL / SUPABASE_ANON_KEY at deploy time for ITS
// OWN database resource, silently overriding same-named project env vars.
// That misrouted every verifyAdmin call to a stranger project and made all
// logins fail with "invalid session". Names the integration doesn't manage
// cannot be clobbered by it.
export function supabaseEnv() {
  return {
    url: process.env.AT_SUPABASE_URL || process.env.SUPABASE_URL,
    anonKey: process.env.AT_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  };
}

export async function verifyAdmin(req) {
  const token = parseBearer(req);
  if (!token) return { ok: false, status: 401, error: "missing bearer token" };
  // Found by a professional-practices audit, 2026-09-24: a MISSING token
  // short-circuits above with no network call, but a WRONG one still costs a
  // real round trip to Supabase's Auth server — and this function gates all
  // eight admin endpoints (save-trip, get-trip, list-images, revert-trip,
  // status, export-leads, notify-test, me), so any caller holding ANY non-
  // empty bearer token, valid or not, could flood every one of them with
  // Supabase round trips. /api/me already guards this exact cost with its own
  // limited(req, res, AUTH_PROBE) call ahead of verifyAdmin — this extends the
  // same budget to the other seven, which had nothing. Namespaced with a
  // ':verifyAdmin' suffix so the two checks use separate buckets and a real
  // admin session is never charged twice against the same counter for one
  // request.
  const probe = rateLimit(`${clientKey(req)}:verifyAdmin`, AUTH_PROBE);
  if (!probe.ok) return { ok: false, status: 429, error: "too many requests", retryAfter: probe.retryAfter };
  const { url: base, anonKey } = supabaseEnv();
  let res;
  try {
    res = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      signal: deadline(AUTH_TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, status: 502, error: "auth server unreachable" };
  }
  if (!res.ok) return { ok: false, status: 401, error: "invalid session" };
  let user;
  try {
    user = await res.json();
  } catch (e) {
    return { ok: false, status: 502, error: "auth bad response" };
  }
  const email = user && user.email;
  if (!isAllowed(email)) return { ok: false, status: 403, error: "not authorized" };
  return { ok: true, email };
}
