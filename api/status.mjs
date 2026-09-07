// api/status.mjs — GET: owner-facing health/status for the dashboard.
// Missing or broken GitHub credentials are a STATE ({github:false}), never an
// error: the Accueil card and the Pages banner render from this, and the one
// thing they must not do is show the owner a raw failure.
import { verifyAdmin } from "./_lib/auth.mjs";
import { listCommits, branch as publishBranch } from "./_lib/github.mjs";
import { notifyConfig } from "./_lib/notify.mjs";

export function shapeStatus(commits) {
  const c = Array.isArray(commits) && commits[0] && commits[0].commit;
  if (!c || !c.author) return null;
  return { date: c.author.date, author: c.author.name, message: c.message };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const branch = publishBranch();

  // Email-alert configuration travels on every status response so Réglages can
  // show a checklist. It is deliberately computed OUTSIDE the GitHub try//catch:
  // the two subsystems are independent, and a GitHub outage must not make the
  // dashboard report the email alerts as unconfigured. notifyConfig() returns
  // presence booleans plus the two non-secret addresses — never a key.
  const notify = notifyConfig();

  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO)
    return res.status(200).json({ github: false, branch, lastPublish: null, notify });

  try {
    const commits = await listCommits({ path: "data/trips", perPage: 1 });
    return res.status(200).json({ github: true, branch, lastPublish: shapeStatus(commits), notify });
  } catch {
    return res.status(200).json({ github: false, branch, lastPublish: null, notify });
  }
}
