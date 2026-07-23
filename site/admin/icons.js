// site/admin/icons.js — inline SVG icon set for the admin.
//
// Zero dependencies and no sprite file: the CSP forbids external assets, and a
// <use xlink:href> sprite would be a second request for ~1 KB of paths. Each
// call builds a FRESH element — an SVG node already in the DOM cannot be reused
// in a second place, so callers must not cache the return value.
//
// Every icon is decorative by default (aria-hidden): the adjacent text is the
// accessible name. For an icon-only control, pass {label} — it becomes
// role="img" + <title>, and the control itself still needs its own aria-label.

const NS = "http://www.w3.org/2000/svg";

// 24×24 grid, stroke-based, matching the nav glyphs already in index.html.
// `p` = <path d> list; `c` = <circle cx cy r> list; `l` = <line x1 y1 x2 y2> list.
const ICONS = {
  home:      { p: ["M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3z"] },
  inbox:     { p: ["M4 5h16v11H8l-4 4z"] },
  file:      { p: ["M6 3h9l4 4v14H6z", "M14 3v5h5"] },
  settings:  { c: [[12, 12, 3]], p: ["M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"] },
  eye:       { p: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"], c: [[12, 12, 3]] },
  whatsapp:  { p: ["M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3A8.5 8.5 0 1 1 20.5 11.5z", "M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-.5l-1.3-1-1.2.6c-1-.4-1.8-1.2-2.2-2.2l.6-1.2-1-1.3s-.5.4-.5 1z"] },
  mail:      { p: ["M3 6h18v12H3z", "m3 7 9 6 9-6"] },
  phone:     { p: ["M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z"] },
  download:  { p: ["M12 3v12", "m7 11 5 5 5-5", "M4 19h16"] },
  search:    { c: [[11, 11, 7]], p: ["m20 20-3.5-3.5"] },
  send:      { p: ["M21 3 10.5 13.5", "M21 3 14 21l-3.5-7.5L3 10z"] },
  back:      { p: ["M20 12H4", "m10 6-6 6 6 6"] },
  help:      { c: [[12, 12, 9]], p: ["M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.6"], l: [[12, 17, 12, 17.01]] },
  check:     { p: ["m4 12.5 5 5L20 6.5"] },
  alert:     { p: ["M12 3 2 20h20z", "M12 9v5"], l: [[12, 17, 12, 17.01]] },
  key:       { c: [[8, 15, 4]], p: ["m11 12 9-9", "m17 6 2 2", "m14 9 2 2"] },
  logout:    { p: ["M14 4H5v16h9", "M18 8l4 4-4 4", "M22 12H10"] },
  database:  { p: ["M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z", "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M20 12c0 1.7-3.6 3-8 3s-8-1.3-8-3"] },
  branch:    { c: [[6, 6, 2.5], [6, 18, 2.5], [18, 8, 2.5]], p: ["M6 8.5v7", "M18 10.5c0 4-4 3-6 5.5"] },
  globe:     { c: [[12, 12, 9]], p: ["M3 12h18", "M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"] },
  chart:     { p: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"] },
  price:     { p: ["M20.5 13.5 13 21l-9-9V4h8z"], c: [[8.5, 8.5, 1.4]] },
  calendar:  { p: ["M4 6h16v15H4z", "M4 11h16", "M8 3v4", "M16 3v4"] },
  seo:       { c: [[11, 11, 7]], p: ["m20 20-3.5-3.5", "M8.5 11h5", "M11 8.5v5"] },
  hotel:     { p: ["M3 21V6l9-3 9 3v15", "M3 21h18", "M9 21v-5h6v5"], c: [[12, 10, 1.4]] },
  plus:      { p: ["M12 5v14", "M5 12h14"] },
  close:     { p: ["m6 6 12 12", "M18 6 6 18"] },
  chevron:   { p: ["m9 6 6 6-6 6"] },
  sparkles:  { p: ["M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z", "M18.5 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"] },
  copy:      { p: ["M9 9h11v11H9z", "M5 15V4h11"] },
};

export function icon(name, opts = {}) {
  const spec = ICONS[name];
  const size = opts.size || 20;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", opts.weight || 1.8);
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("focusable", "false"); // legacy IE/Edge tab-stop guard
  if (opts.className) svg.setAttribute("class", opts.className);
  if (opts.label) {
    svg.setAttribute("role", "img");
    const title = document.createElementNS(NS, "title");
    title.textContent = opts.label;
    svg.appendChild(title);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  if (!spec) return svg; // unknown name renders an empty box, never throws
  for (const d of spec.p || []) {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", d);
    svg.appendChild(el);
  }
  for (const [cx, cy, r] of spec.c || []) {
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", r);
    svg.appendChild(el);
  }
  for (const [x1, y1, x2, y2] of spec.l || []) {
    const el = document.createElementNS(NS, "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    svg.appendChild(el);
  }
  return svg;
}

// Convenience: a button with an icon + a visible label, sized for thumbs.
export function iconButton(name, label, { className = "btn", size = 18, onClick } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.append(icon(name, { size }));
  const span = document.createElement("span");
  span.textContent = label;
  b.appendChild(span);
  if (onClick) b.addEventListener("click", onClick);
  return b;
}

export const ICON_NAMES = Object.keys(ICONS);
