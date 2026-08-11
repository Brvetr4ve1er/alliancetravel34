// api/_lib/slug.mjs — the one definition of a legal trip slug.
//
// get-trip, save-trip and revert-trip all interpolate a caller-supplied slug into
// `data/trips/${slug}.json` and hand that to the GitHub contents API. Each of them
// carried its own private copy of this regex; three copies of a path-traversal
// guard is three chances for one to drift while the other two look fine. This is
// the single source of truth, imported by all three.
//
// Lowercase alphanumeric words joined by single hyphens: no dot, no slash, no
// percent, no backslash, no leading/trailing/doubled hyphen, no whitespace. So
// "../../etc/passwd", "..%2f", "Not Valid!" and "" can never reach a repo path.
//
// Anchored and deliberately free of the /g flag — a /g regex carries lastIndex
// state between .test() calls and, now that a single instance is shared across
// three modules, would start alternating true/false on identical input.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// The gate the endpoints actually call. Requires an honest string: a JSON body can
// carry `"slug": ["istanbul"]` and a repeated query parameter arrives as an array,
// and String(["istanbul"]) is "istanbul" — so a bare regex test on the coerced
// value silently accepts a shape no legitimate client sends. Type first, then shape.
export function isValidSlug(v) {
  return typeof v === "string" && SLUG_RE.test(v);
}
