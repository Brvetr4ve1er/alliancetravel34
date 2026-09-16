// api/me.mjs — GET: confirm the caller is an allowlisted admin.
import { verifyAdmin } from "./_lib/auth.mjs";
import { limited, AUTH_PROBE } from "./_lib/ratelimit.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  // A wrong token still costs a Supabase round trip; a missing one does not.
  if (limited(req, res, AUTH_PROBE)) return;
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  return res.status(200).json({ email: auth.email, admin: true });
}
