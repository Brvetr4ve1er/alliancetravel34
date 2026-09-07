// api/save-trip.mjs — POST { slug, content, sha }: gate an owner edit and commit it.
// Order: verify admin → validate (generator rules) → dry-run render (must not throw)
// → commit data/trips/<slug>.json to GitHub. A bad edit is rejected, never committed.
import { verifyAdmin } from "./_lib/auth.mjs";
import { getFile, putFile, listTree } from "./_lib/github.mjs";
import { isValidSlug } from "./_lib/slug.mjs";
import { validateTrip } from "../tools/validate-trip.mjs";
import { renderTrip } from "../tools/templates/trip2.mjs";
import { driftOf, syncDerivedPrices } from "../tools/value-graph.mjs";
import { checkRenderedPage } from "../tools/check-rendered-page.mjs";

// Hard ceiling on the request body. The whole body is buffered in memory before it
// can be parsed, so without a cap one client can stream until the function dies.
// The largest real trip in data/trips/ is egypte.json at ~166 KB, so 1 MB is ~6x
// headroom for any legitimate edit and still a bound.
export const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel pre-parses JSON
  // Chunks are kept as Buffers and decoded once at the end. Byte counting has to be
  // exact for the cap to mean anything, and decoding chunk-by-chunk would mangle a
  // multi-byte character split across a chunk boundary — this body is full of
  // accented French and Arabic, and a mangled one would be committed as-is.
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buf.length;
    if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error("body too large"), { status: 413 });
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  let body;
  try { body = await readBody(req); }
  catch (e) {
    if (e && e.status === 413) return res.status(413).json({ error: "body too large" });
    return res.status(400).json({ error: "invalid JSON body" });
  }

  const { slug, content } = body;
  let sha = body.sha;
  if (!isValidSlug(slug)) return res.status(400).json({ error: "invalid slug" });
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

  // 2. Single-source: recompute every derived display copy from tripData.hotels prices.
  const synced = syncDerivedPrices(content).trip;

  // 2b. Dry-run render the SYNCED content — renderTrip throws on any missing field.
  let html;
  try { html = renderTrip(synced); }
  catch (e) { return res.status(422).json({ errors: [`rendu impossible: ${e.message}`] }); }

  // 2b-bis. Run the build's i18n gates on that render.
  //
  // This closes a measured hole. Blanking faq[0].question passed validateTrip
  // (0 errors), renderTrip and driftOf — so the edit was committed under a
  // "Publié ✓" — and then killed the next Vercel build with
  // `clé i18n "azFaqQ1": texte français vide`, freezing EVERY page until
  // someone hand-edited the JSON. The owner had no way to know. Refusing here
  // costs one pass over a string we already have.
  const pageProblems = checkRenderedPage(html);
  if (pageProblems.length) return res.status(422).json({ errors: pageProblems });

  // 2c. Price coherence backstop on the synced content (unresolvable cases still 422).
  const drift = driftOf(synced);
  if (drift.length) {
    return res.status(422).json({
      errors: drift.map((d) =>
        d.expected == null
          ? `prix: ${d.reason}`
          : `prix incohérent: "${d.path}" affiche ${JSON.stringify(d.current)} ` +
            `mais devrait être ${JSON.stringify(d.expected)} — ${d.reason}`
      ),
    });
  }

  // 3. Commit the SYNCED content (retry once on a stale SHA).
  const path = `data/trips/${slug}.json`;
  const json = JSON.stringify(synced, null, 2) + "\n";
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
