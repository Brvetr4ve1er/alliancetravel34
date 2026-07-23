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

  // Both reads are independent, and opening the editor is a user-facing action,
  // so they go out together rather than one after the other. `slug` is already
  // constrained to SLUG_RE, so neither path can escape its directory.
  const [tripRes, manifestRes] = await Promise.allSettled([
    getFile({ path: `data/trips/${slug}.json` }),
    getFile({ path: `data/i18n-manifest/${slug}.json` }),
  ]);

  if (tripRes.status === "rejected") {
    const e = tripRes.reason;
    if (e.status === 404) return res.status(404).json({ error: "trip not found" });
    return res.status(e.status || 500).json({ error: e.message });
  }

  // The manifest is an editing aid, not part of the trip. It is build output,
  // so it can legitimately be absent — a trip added since the last build has
  // none yet. Never fail the editor over it: the owner must still be able to
  // fix a French price on a page whose manifest is missing. `manifest: null`
  // means "edit in French only".
  let manifest = null;
  if (manifestRes.status === "fulfilled") {
    try { manifest = JSON.parse(manifestRes.value.content); } catch { manifest = null; }
  }

  const { content, sha } = tripRes.value;
  try {
    return res.status(200).json({ slug, content: JSON.parse(content), sha, manifest });
  } catch (e) {
    return res.status(500).json({ error: `trip JSON illisible: ${e.message}` });
  }
}
