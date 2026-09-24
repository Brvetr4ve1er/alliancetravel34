// site/admin/illus.js — spot illustrations for empty states and guidance.
//
// Line art in the brand's own register (travel, warm, hand-drawn feel) rather
// than stock art: the CSP blocks external images, and an inline SVG costs ~1 KB,
// scales to any DPI, and inherits the theme's colours via currentColor.
//
// These are DECORATIVE by contract: every place one appears also carries a
// heading and a sentence of text. They are aria-hidden so a screen reader is
// not made to narrate a drawing that adds nothing the text does not say.

const NS = "http://www.w3.org/2000/svg";

function svg(w, h) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${h}`);
  s.setAttribute("width", w);
  s.setAttribute("height", h);
  s.setAttribute("fill", "none");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  s.setAttribute("class", "illus");
  return s;
}
// el("path", { d: "...", class: "ink" }) — terse element builder.
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// Stroke classes are styled in admin.css so the palette lives in ONE place:
//   .illus .ink   → brand green    .illus .accent → gold
//   .illus .soft  → tinted fill    .illus .dash   → dotted motion trail

/**
 * No leads yet — an open envelope and a paper plane leaving a dotted trail.
 *
 * Only `emptyState()` below is imported anywhere in the repo (confirmed by a
 * repo-wide grep, 2026-09-24), so the five variants it can select — visits,
 * leads, welcome, soon, done — are the actual live surface, not these
 * functions' own export status. Two are genuinely reachable (`emptyState()`
 * is called with "leads" from accueil.js/leads.js and "welcome" from leads.js
 * only); illusVisits/illusSoon/illusDone had no caller passing "visits"/
 * "soon"/"done" anywhere and are removed rather than kept as unreachable
 * art. The visits KPI's own empty state (kpiTile(..., "empty.visits"))
 * renders as plain text through a different path, with no illustration.
 */
function illusLeads() {
  const s = svg(170, 120);
  s.append(
    el("path", { d: "M28 58h74v46H28z", class: "soft" }),
    el("path", { d: "M28 58h74v46H28z", class: "ink", "stroke-width": 2.4, "stroke-linejoin": "round" }),
    el("path", { d: "m28 58 37 26 37-26", class: "ink", "stroke-width": 2.4, "stroke-linejoin": "round" }),
    el("path", { d: "M70 60c14-16 30-26 48-30", class: "dash", "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "3 6" }),
    el("path", { d: "m118 30 34-12-13 32-7-12z", class: "accent", "stroke-width": 2.4, "stroke-linejoin": "round" }),
    el("path", { d: "m132 38 20-20", class: "accent", "stroke-width": 2 }),
  );
  return s;
}

/** Welcome / orientation — a compass rose. */
function illusWelcome() {
  const s = svg(170, 120);
  s.append(
    el("circle", { cx: 85, cy: 60, r: 42, class: "soft" }),
    el("circle", { cx: 85, cy: 60, r: 42, class: "ink", "stroke-width": 2.4 }),
    el("circle", { cx: 85, cy: 60, r: 33, class: "ink", "stroke-width": 1.2, opacity: ".5", "stroke-dasharray": "2 6" }),
    el("path", { d: "m85 24 11 32 32 11-32 11-11 32-11-32-32-11 32-11z", class: "accent", "stroke-width": 2.4, "stroke-linejoin": "round" }),
    el("circle", { cx: 85, cy: 60, r: 4, class: "ink", "stroke-width": 2 }),
  );
  return s;
}

// Not exported: emptyState() below is the only consumer, and nothing else in
// the repo imports ILLUS directly (confirmed by grep). The two live kinds are
// the two callers actually pass — "leads" and "welcome" — see the comment on
// illusLeads for the three that were removed (illusSoon and illusDone with
// it: both were exported and never called, same class of dead art).
const ILLUS = {
  leads: illusLeads,
  welcome: illusWelcome,
};

/** Build an illustrated empty state: art + heading + explanation + optional hint. */
export function emptyState(kind, { title, body, hint } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "empty";
  const make = ILLUS[kind];
  if (make) wrap.appendChild(make());
  if (title) {
    const h = document.createElement("p");
    h.className = "empty__title";
    h.textContent = title;
    wrap.appendChild(h);
  }
  if (body) {
    const p = document.createElement("p");
    p.className = "empty__body";
    p.textContent = body;
    wrap.appendChild(p);
  }
  if (hint) {
    const p = document.createElement("p");
    p.className = "empty__hint";
    p.textContent = hint;
    wrap.appendChild(p);
  }
  return wrap;
}
