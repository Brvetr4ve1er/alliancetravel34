// api/me.mjs — GET: confirm the caller is an allowlisted admin.
import { verifyAdmin } from "./_lib/auth.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  return res.status(200).json({ email: auth.email, admin: true });
}
