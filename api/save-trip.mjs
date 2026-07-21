// api/save-trip.mjs — POST { slug, content, sha }: gate an owner edit and commit it.
// Order: verify admin → validate (generator rules) → dry-run render (must not throw)
// → commit data/trips/<slug>.json to GitHub. A bad edit is rejected, never committed.
import { verifyAdmin } from "./_lib/auth.mjs";
import { getFile, putFile, listTree } from "./_lib/github.mjs";
import { validateTrip } from "../tools/validate-trip.mjs";
import { renderTrip } from "../tools/templates/trip2.mjs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel pre-parses JSON
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  let body;
  try { body = await readBody(req); }
  catch { return res.status(400).json({ error: "invalid JSON body" }); }

  const { slug, content } = body;
  let sha = body.sha;
  if (!SLUG_RE.test(String(slug || ""))) return res.status(400).json({ error: "invalid slug" });
  if (!content || typeof content !== "object") return res.status(400).json({ error: "missing content" });
  if (content.slug !== slug) return res.status(400).json({ error: "content.slug must equal slug" });

  // 1. Schema validation, including image references.
  //
  // site/ is not in the function bundle, so existence is checked against the
  // GitHub tree of the branch we are about to commit to — the same view
  // tools/build.mjs will resolve on disk. Skipping this check is not an option:
  // build.mjs treats a missing image as a fatal error and exits 1, so an edit
  // accepted here with a bad path would block the rebuild of *every* page.
  // A truncated tree cannot prove absence, so fall back to structure-only
  // rather than reject a valid edit.
  let tree;
  try { tree = await listTree(); }
  catch (e) { return res.status(e.status || 502).json({ error: e.message }); }
  const imageExists = tree.truncated ? null : (rel) => tree.paths.has(`site/${rel}`);

  const { errors } = validateTrip(`data/trips/${slug}.json`, content, { enabled: true, imageExists });
  if (errors.length) return res.status(422).json({ errors: errors.map((e) => e.msg) });

  // 2. Dry-run render — renderTrip throws on any missing field/array/codec.
  try { renderTrip(content); }
  catch (e) { return res.status(422).json({ errors: [`rendu impossible: ${e.message}`] }); }

  // 3. Commit (retry once on a stale SHA).
  const path = `data/trips/${slug}.json`;
  const json = JSON.stringify(content, null, 2) + "\n";
  const message = `content(${slug}): edit via dashboard by ${auth.email}`;
  try {
    if (!sha) sha = (await getFile({ path })).sha;
    const { commitUrl } = await putFile({ path, content: json, sha, message });
    return res.status(200).json({ ok: true, commitUrl });
  } catch (e) {
    if (e.status === 409) {
      try {
        const fresh = await getFile({ path });
        const { commitUrl } = await putFile({ path, content: json, sha: fresh.sha, message });
        return res.status(200).json({ ok: true, commitUrl });
      } catch (e2) { return res.status(e2.status || 500).json({ error: e2.message }); }
    }
    return res.status(e.status || 500).json({ error: e.message });
  }
}
