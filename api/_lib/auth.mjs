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

export async function verifyAdmin(req) {
  const token = parseBearer(req);
  if (!token) return { ok: false, status: 401, error: "missing bearer token" };
  const base = process.env.SUPABASE_URL;
  let res;
  try {
    res = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: token },
    });
  } catch (e) {
    return { ok: false, status: 502, error: "auth server unreachable" };
  }
  if (!res.ok) return { ok: false, status: 401, error: "invalid session" };
  const user = await res.json();
  const email = user && user.email;
  if (!isAllowed(email)) return { ok: false, status: 403, error: "not authorized" };
  return { ok: true, email };
}
