// site/admin/api-url.js — one place that knows /api/* wants a trailing slash.
//
// vercel.json sets `trailingSlash: true`, so every slashless call answers 308 and
// is retried. Measured on production, 2026-09-23:
//
//     /api/me                      -> 308      /api/me/                  -> 401
//     /api/get-trip?slug=istanbul  -> 308      /api/get-trip/?slug=…     -> 401
//     POST /api/save-trip          -> 308      POST /api/save-trip/      -> 401
//
// (401 is the function answering; this account's admin auth is separately broken.)
// A 308 preserves method and body, so nothing was ever BROKEN by this — it simply
// cost every admin action two round trips instead of one, which is worst exactly
// where this dashboard is used. It was fixed for the health poll in accd65f and
// nowhere else; normalising inside callApi() covers the other nine call sites and
// any future one.
//
// Its own module because site/admin/app.js touches `window` at module scope and
// so cannot be imported in Node — the same reason site/admin/fields.js exists.

/** "/api/x" -> "/api/x/", "/api/x?q=1" -> "/api/x/?q=1"; already-slashed untouched. */
export function apiUrl(path) {
  const s = String(path == null ? "" : path);
  // Split on the FIRST "?" only: a query value may legitimately contain one, and
  // rejoining the remainder keeps it byte-identical.
  const i = s.indexOf("?");
  const p = i === -1 ? s : s.slice(0, i);
  const q = i === -1 ? "" : s.slice(i);
  if (!p) return s;
  return (p.endsWith("/") ? p : p + "/") + q;
}
