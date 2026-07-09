// api/get-trip.mjs — GET ?slug= : return a trip's current JSON + GitHub SHA.
import { verifyAdmin } from "./_lib/auth.mjs";
import { getFile } from "./_lib/github.mjs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const slug = String((req.query && req.query.slug) || "");
  if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "invalid slug" });

  try {
    const { content, sha } = await getFile({ path: `data/trips/${slug}.json` });
    return res.status(200).json({ slug, content: JSON.parse(content), sha });
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ error: "trip not found" });
    return res.status(e.status || 500).json({ error: e.message });
  }
}
