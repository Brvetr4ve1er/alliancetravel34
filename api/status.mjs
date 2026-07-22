// api/status.mjs — GET: owner-facing health/status for the dashboard.
// Missing or broken GitHub credentials are a STATE ({github:false}), never an
// error: the Accueil card and the Pages banner render from this, and the one
// thing they must not do is show the owner a raw failure.
import { verifyAdmin } from "./_lib/auth.mjs";
import { listCommits } from "./_lib/github.mjs";

export function shapeStatus(commits) {
  const c = Array.isArray(commits) && commits[0] && commits[0].commit;
  if (!c || !c.author) return null;
  return { date: c.author.date, author: c.author.name, message: c.message };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const branch = process.env.GITHUB_BRANCH || null;
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO)
    return res.status(200).json({ github: false, branch, lastPublish: null });

  try {
    const commits = await listCommits({ path: "data/trips", perPage: 1 });
    return res.status(200).json({ github: true, branch, lastPublish: shapeStatus(commits) });
  } catch {
    return res.status(200).json({ github: false, branch, lastPublish: null });
  }
}
