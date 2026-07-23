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

/** No visits yet — a dawn horizon with bars just starting to grow. */
export function illusVisits() {
  const s = svg(170, 120);
  s.append(
    el("circle", { cx: 85, cy: 62, r: 22, class: "soft" }),
    el("path", { d: "M85 30v-9M85 103v-9M53 62h-9M126 62h-9M62 39l-6-6M114 85l-6-6M108 39l6-6M56 85l6-6", class: "accent", "stroke-width": 2, "stroke-linecap": "round" }),
    el("circle", { cx: 85, cy: 62, r: 13, class: "accent", "stroke-width": 2 }),
    el("path", { d: "M20 100h130", class: "ink", "stroke-width": 2.4, "stroke-linecap": "round" }),
    el("path", { d: "M44 100V86M85 100V74M126 100V62", class: "ink", "stroke-width": 7, "stroke-linecap": "round", opacity: ".28" }),
    el("path", { d: "M44 86 85 74l41-12", class: "dash", "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "4 5" }),
  );
  return s;
}

/** No leads yet — an open envelope and a paper plane leaving a dotted trail. */
export function illusLeads() {
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
export function illusWelcome() {
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

/** Under construction — a folded map with a pin and a dashed route. */
export function illusSoon() {
  const s = svg(170, 120);
  s.append(
    el("path", { d: "M25 36 66 24l38 12 41-12v60l-41 12-38-12-41 12z", class: "soft" }),
    el("path", { d: "M25 36 66 24l38 12 41-12v60l-41 12-38-12-41 12z", class: "ink", "stroke-width": 2.4, "stroke-linejoin": "round" }),
    el("path", { d: "M66 24v60M104 36v60", class: "ink", "stroke-width": 1.6, opacity: ".55" }),
    el("path", { d: "M42 74c14-6 18-22 32-22s20 14 34 8", class: "dash", "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "3 6" }),
    el("path", { d: "M108 42c6 0 10 4 10 10 0 7-10 16-10 16s-10-9-10-16c0-6 4-10 10-10z", class: "accent", "stroke-width": 2.4, "stroke-linejoin": "round" }),
    el("circle", { cx: 108, cy: 52, r: 3.2, class: "accent", "stroke-width": 2 }),
  );
  return s;
}

/** Success / published — a check inside a stamped circle. */
export function illusDone() {
  const s = svg(170, 120);
  s.append(
    el("circle", { cx: 85, cy: 60, r: 36, class: "soft" }),
    el("circle", { cx: 85, cy: 60, r: 36, class: "ink", "stroke-width": 2.4, "stroke-dasharray": "5 4" }),
    el("path", { d: "m67 60 13 13 24-26", class: "accent", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }),
  );
  return s;
}

export const ILLUS = {
  visits: illusVisits,
  leads: illusLeads,
  welcome: illusWelcome,
  soon: illusSoon,
  done: illusDone,
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
