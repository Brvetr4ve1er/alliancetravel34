// api/list-images.mjs — GET: the photos the owner is allowed to choose from.
//
// WHY THIS EXISTS. The three image fields on a trip page are stored as strings,
// and a wrong string is not a typo the owner can see: the templates derive five
// more paths from it by .replace(), and <picture> shows nothing at all when a
// <source> 404s. A free-text box would hand a non-technical owner a loaded gun.
//
// So the dashboard never lets a path be typed. It offers a list, and this route
// is that list: every image already in the repository whose whole variant set is
// present, grouped by the slot it may fill. A value the picker cannot offer is a
// value the owner cannot publish.
//
// SLOTS ARE NOT INTERCHANGEABLE. heroes-v2/ images are ~2000px landscape crops
// behind text; hotels/ are 800x600 cards; og/ are 1200x630 social previews. The
// CSS crops all of them with object-fit:cover, so a hotel photo in a hero frame
// is not an error the owner would see in a thumbnail — it is a badly framed page
// they would have to be told about. Each field only ever sees its own directory.
//
// AUTH. Admin-only, like save-trip and notify-test. This leaks nothing sensitive
// — the repository is public and so are the images — but an unauthenticated
// listing endpoint is free reconnaissance and free GitHub API quota.
import { verifyAdmin } from "./_lib/auth.mjs";
import { listTree } from "./_lib/github.mjs";
import { SLOTS, relToSite } from "../tools/image-variants.mjs";

// A filename that is already a variant, not a base image: offering
// "hero__x--bg--mobile.jpg" as a hero would derive "…--mobile.jpg--bg.webp".
const IS_DERIVED = /--mobile\.[a-z0-9]+$/i;

/** Human label for a file: the naming convention, minus its scaffolding. */
function labelFor(slot, file) {
  return file
    .replace(/^hero__/, "").replace(/^hotel__/, "").replace(/^og-/, "")
    .replace(/--bg\.jpg$/, "").replace(/\.jpg$/, "")
    .replace(/[-_]+/g, " ").trim();
}

/**
 * Candidates for one slot, from a Set of every path in the repository.
 * Exported and pure so the tests can drive it with a fabricated tree instead of
 * the network — the interesting cases (a half-converted image, a stray variant)
 * do not exist in the real repo and should not have to.
 */
export function candidates(slot, paths) {
  const spec = SLOTS[slot];
  const prefix = `site/${spec.dir}/`;
  const out = [];
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const file = p.slice(prefix.length);
    if (file.includes("/")) continue;              // no nesting in these dirs
    if (!file.endsWith(spec.suffix)) continue;     // not a base image for this slot
    if (IS_DERIVED.test(file)) continue;
    // og stores a bare filename; hero/hotel store a page-relative path. Both are
    // fed through the slot's own variants() so "complete" means the same thing
    // here as it does in the build gate.
    // The "../" prefix is load-bearing twice over: tools/templates/langpage.mjs
    // rewrites "../" to a root-absolute "/" when it builds the /en/ and /ar/
    // pages, and validate-trip's image check only fires on values of that shape.
    // Emitting a bare "assets/…" would break the French page AND switch off the
    // guard that would have caught it.
    const value = slot === "og" ? file : `../${spec.dir}/${file}`;
    const variants = spec.variants(value);
    if (!variants) continue;
    const missing = variants
      .filter((v) => !v.optional)
      .map((v) => relToSite(v.value))
      .filter((rel) => rel && !paths.has(`site/${rel}`));
    if (missing.length) continue;                  // incomplete: cannot be offered
    out.push({ value, file, label: labelFor(slot, file), thumb: `/${spec.dir}/${file}` });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  let tree;
  try {
    tree = await listTree();
  } catch (e) {
    return res.status(e.status || 502).json({ error: e.message || "github unreachable" });
  }
  // A truncated tree cannot prove a file is absent, so it cannot prove a variant
  // set is complete either. Better to show nothing and say why than to offer a
  // photo that publishes a broken page.
  if (tree.truncated) {
    return res.status(200).json({ ok: false, reason: "truncated", slots: {} });
  }

  const slots = {};
  for (const slot of Object.keys(SLOTS)) slots[slot] = candidates(slot, tree.paths);
  return res.status(200).json({ ok: true, slots });
}
