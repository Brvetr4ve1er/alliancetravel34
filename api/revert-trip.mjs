// api/revert-trip.mjs — POST { slug }: undo the last publish of a trip.
//
// Order mirrors save-trip.mjs: verify admin → resolve the previous committed
// version → commit it forward. This endpoint writes to the repo, so it is
// locked down exactly like save-trip: POST-only, verifyAdmin, the same SLUG_RE,
// and {error}/.status error plumbing.
//
// "Revert" here is a FORWARD commit that restores the file's prior bytes — never
// a force-push or history rewrite. The previous version was already validated
// when it was first committed, so it is known-good by construction.
import { verifyAdmin } from "./_lib/auth.mjs";
import { getFile, putFile, listCommits } from "./_lib/github.mjs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const API = "https://api.github.com";

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel pre-parses JSON
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

// getFile in _lib/github.mjs only reads the branch HEAD, and _lib is a shared
// module I must not extend, so read the historical blob here — same headers and
// same {status}-on-error style as github.mjs, just pinned to a commit ref.
async function getFileAtRef({ path, ref }) {
  const url = `${API}/repos/${process.env.GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "alliance-travel-admin",
      },
    });
  } catch {
    throw Object.assign(new Error("github unreachable"), { status: 502 });
  }
  if (res.status === 404) { const e = new Error("not found"); e.status = 404; throw e; }
  if (!res.ok) { const e = new Error(`github ${res.status}`); e.status = 502; throw e; }
  let json;
  try {
    json = await res.json();
  } catch {
    throw Object.assign(new Error("github bad response"), { status: 502 });
  }
  return { content: Buffer.from(json.content || "", "base64").toString("utf8"), sha: json.sha };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  let body;
  try { body = await readBody(req); }
  catch { return res.status(400).json({ error: "invalid JSON body" }); }

  const { slug } = body;
  if (!SLUG_RE.test(String(slug || ""))) return res.status(400).json({ error: "invalid slug" });

  const path = `data/trips/${slug}.json`;

  // 1. The last two commits that changed this file. commits[0] is the publish we
  // are undoing; commits[1] is the state to restore. Fewer than two = nothing to
  // roll back to (a trip committed exactly once).
  let commits;
  try { commits = await listCommits({ path, perPage: 2 }); }
  catch (e) { return res.status(e.status || 502).json({ error: e.message }); }
  if (!Array.isArray(commits) || commits.length < 2 || !commits[1] || !commits[1].sha)
    return res.status(409).json({ error: "aucune version précédente à restaurer" });

  // 2. The file's bytes as of that earlier commit — what we will re-publish.
  let previous;
  try { previous = await getFileAtRef({ path, ref: commits[1].sha }); }
  catch (e) { return res.status(e.status || 502).json({ error: e.message }); }

  // 3. Commit those bytes forward, overwriting HEAD (retry once on a stale SHA).
  //    putFile needs the CURRENT blob sha, not a commit sha, so read it now.
  const message = `revert(${slug}): roll back last publish by ${auth.email}`;
  try {
    const current = await getFile({ path });
    const { commitUrl } = await putFile({ path, content: previous.content, sha: current.sha, message });
    return res.status(200).json({ ok: true, commitUrl });
  } catch (e) {
    if (e.status === 409) {
      try {
        const fresh = await getFile({ path });
        const { commitUrl } = await putFile({ path, content: previous.content, sha: fresh.sha, message });
        return res.status(200).json({ ok: true, commitUrl });
      } catch (e2) { return res.status(e2.status || 500).json({ error: e2.message }); }
    }
    return res.status(e.status || 500).json({ error: e.message });
  }
}
