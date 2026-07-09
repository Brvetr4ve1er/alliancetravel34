// api/_lib/github.mjs — minimal GitHub contents-API client (fine-grained PAT).
const API = "https://api.github.com";

function repo() { return process.env.GITHUB_REPO; }        // "owner/name"
function branch() { return process.env.GITHUB_BRANCH || "main"; }
function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "alliance-travel-admin",
  };
}

export async function getFile({ path }) {
  const url = `${API}/repos/${repo()}/contents/${path}?ref=${encodeURIComponent(branch())}`;
  let res;
  try {
    res = await fetch(url, { headers: headers() });
  } catch (e) {
    throw Object.assign(new Error("github unreachable"), { status: 502 });
  }
  if (res.status === 404) { const e = new Error("not found"); e.status = 404; throw e; }
  if (!res.ok) { const e = new Error(`github ${res.status}`); e.status = 502; throw e; }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw Object.assign(new Error("github bad response"), { status: 502 });
  }
  const content = Buffer.from(json.content || "", "base64").toString("utf8");
  return { content, sha: json.sha };
}

export async function putFile({ path, content, sha, message }) {
  const url = `${API}/repos/${repo()}/contents/${path}`;
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: branch(),
    ...(sha ? { sha } : {}),
  };
  let res;
  try {
    res = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
  } catch (e) {
    throw Object.assign(new Error("github unreachable"), { status: 502 });
  }
  if (res.status === 409) { const e = new Error("stale sha"); e.status = 409; throw e; }
  if (!res.ok) { const e = new Error(`github ${res.status}`); e.status = 502; throw e; }
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw Object.assign(new Error("github bad response"), { status: 502 });
  }
  return { commitUrl: json.commit && json.commit.html_url };
}
