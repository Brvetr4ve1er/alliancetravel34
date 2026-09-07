// site/admin/images.js — the photo picker, shared by the page fields and the
// hotel rows.
//
// The owner never types an image path. A trip's stored value is turned by the
// templates into five more paths by string .replace(), and <picture> shows
// nothing at all when one of those 404s — so a free-text box would let a
// non-technical owner publish an invisible break. The control is a <select>
// listing only images whose whole variant set is already in the repository
// (api/list-images.mjs decides that), which means an unpublishable value is one
// the control cannot hold.
//
// <select> rather than a prettier grid of tiles for three concrete reasons: it
// carries .value, so edit-pages.js's collectInto() and edit-lists.js's
// collectLists() pick it up with no change to either collector; it is keyboard
// and screen-reader navigable for free; and it is focusable, so the existing
// "publication refused, first bad field highlighted" path still works.
import { t } from "./i18n.js";

// Which slot each editable image field draws from. Slots are not
// interchangeable: heroes are ~2000px landscape crops sitting behind text,
// hotel cards are 800x600, og images are 1200x630 social previews, and the CSS
// crops every one of them with object-fit:cover — so a hotel photo dropped into
// a hero frame is not an error the owner could see in a thumbnail.
export const FIELD_SLOT = { "hero.bg": "hero", "meta.ogImage": "og" };

let catalogue = null;      // { hero: [...], hotel: [...], og: [...] }
let inflight = null;

/** Fetch once per dashboard session; every editor render reuses the answer. */
export async function loadCatalogue() {
  if (catalogue) return catalogue;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await window.AT_ADMIN.callApi("/api/list-images");
      catalogue = r && r.ok && r.data && r.data.ok ? r.data.slots : null;
    } catch {
      catalogue = null;    // offline or GitHub down: fall back to read-only below
    }
    inflight = null;
    return catalogue;
  })();
  return inflight;
}

export function getCatalogue() { return catalogue; }
export function resetCatalogue() { catalogue = null; inflight = null; }   // tests

/** Where the dashboard can load a preview of a stored value. */
export function thumbFor(slot, value) {
  const v = String(value ?? "");
  if (!v) return "";
  if (slot === "og") return `/assets/images/og/${v}`;
  return v.replace(/^(?:\.\.\/)+/, "/");
}

/**
 * The control itself. `attr` is the collector hook — data-path="…" for a page
 * field, data-lf="…" for a hotel row — so this one function serves both without
 * either collector learning a new type.
 *
 * When the catalogue is unavailable (offline, GitHub down, tree truncated) the
 * select still renders, holding exactly the current value. The owner can save
 * everything else on the page; they just cannot change the photo this session.
 * Falling back to a text box would be worse than useless — it is the one input
 * whose free-text form is dangerous.
 */
export function imageControl({ id, attr, slot, value }) {
  const list = (catalogue && catalogue[slot]) || null;
  const cur = String(value ?? "");
  let options;
  if (!list) {
    options = `<option value="${esc(cur)}" selected>${esc(labelOf(cur))}</option>`;
  } else {
    const known = list.some((c) => c.value === cur);
    // A stored value the catalogue does not offer is kept and marked, never
    // dropped: silently replacing the owner's photo with the alphabetically
    // first one would be a content change nobody asked for.
    options = (known ? "" : `<option value="${esc(cur)}" selected>${esc(labelOf(cur))} ${esc(t("pages.img.unknown"))}</option>`)
      + list.map((c) => `<option value="${esc(c.value)}"${c.value === cur ? " selected" : ""}>${esc(c.label)}</option>`).join("");
  }
  const note = list ? "" : `<small class="lister__hint">${esc(t("pages.img.offline"))}</small>`;
  return `<div class="imgpick" data-imgpick="${esc(slot)}">` +
    // NOT loading="lazy". Measured in the browser: inside the collapsed
    // <details> the editor uses, a lazy thumb never enters the viewport, so no
    // request is ever issued and the owner opens the section to four empty
    // boxes. There are at most a handful per page and they are the control's
    // real label — a filename like "hero__cairo-sharm--bg.jpg" is not one.
    `<img class="imgpick__thumb" src="${esc(thumbFor(slot, cur))}" alt="" decoding="async" width="96" height="64"/>` +
    `<div class="imgpick__ctl"><select id="${esc(id)}" ${attr} data-slot="${esc(slot)}">${options}</select>${note}</div>` +
    `</div>`;
}

function labelOf(value) {
  const file = String(value ?? "").split("/").pop() || "";
  return file.replace(/^hero__/, "").replace(/^hotel__/, "").replace(/^og-/, "")
    .replace(/--bg\.jpg$/, "").replace(/\.jpg$/, "").replace(/[-_]+/g, " ").trim() || value;
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Keep each preview in step with its select. Bound to an element that is part
 * of the rendered markup, never to a container that outlives the render — the
 * same rule that stopped the list handlers stacking one listener per trip.
 */
export function wireImagePickers(root) {
  if (!root) return;
  root.addEventListener("change", (e) => {
    const sel = e.target.closest("select[data-slot]");
    if (!sel) return;
    const box = sel.closest(".imgpick");
    const img = box && box.querySelector(".imgpick__thumb");
    if (img) img.src = thumbFor(sel.dataset.slot, sel.value);
  });
}
