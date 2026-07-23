// site/admin/ui.js — small shared builders so every area is guided the same way:
// an illustrated header that says what the screen is for, and a "?" that explains
// a term in plain French. Kept separate from icons.js (raw glyphs) and illus.js
// (spot art) so each file has one job.
import { t } from "./i18n.js";
import { icon } from "./icons.js";

/** Illustrated area header: icon tile + title + one-line purpose. */
export function areaHead(iconName, titleKey, introKey) {
  const head = document.createElement("header");
  head.className = "areahead";
  const box = document.createElement("div");
  box.className = "areahead__icon";
  box.append(icon(iconName, { size: 24 }));
  const txt = document.createElement("div");
  const h1 = document.createElement("h1");
  h1.textContent = t(titleKey);
  const p = document.createElement("p");
  p.textContent = t(introKey);
  txt.append(h1, p);
  head.append(box, txt);
  return head;
}

/** Inline "?" that reveals a plain-language explanation on tap.
    <details> is used so it works with zero JS state and is keyboard-operable. */
export function help(bodyKey) {
  const d = document.createElement("details");
  d.className = "help";
  const s = document.createElement("summary");
  s.setAttribute("aria-label", t(bodyKey));
  s.append(icon("help", { size: 15 }));
  const body = document.createElement("div");
  body.className = "help__body";
  body.textContent = t(bodyKey);
  d.append(s, body);
  return d;
}

/** A card <h2> with a leading icon (and optional trailing help). */
export function cardHeading(iconName, titleKey, helpKey) {
  const h = document.createElement("h2");
  h.append(icon(iconName, { size: 20 }));
  const span = document.createElement("span");
  span.textContent = t(titleKey);
  h.append(span);
  if (helpKey) h.append(help(helpKey));
  return h;
}
