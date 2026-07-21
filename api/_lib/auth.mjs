// api/_lib/auth.mjs — identity + allowlist for privileged endpoints.
// No service-role key: the caller's own Supabase token is verified against
// the Auth server, then the returned email is checked against ADMIN_EMAILS.

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
  const { url: base, anonKey } = supabaseEnv();
  let res;
  try {
    res = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
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
