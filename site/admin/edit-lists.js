// site/admin/edit-lists.js — the repeatable content of a trip page: departures,
// FAQ, highlights, itinerary, hotel cards, inclusions, reviews.
//
// WHY A SEPARATE MODULE. edit-pages.js's FIELDS must stay a flat literal array:
// tools/check-admin-fields.mjs parses it with a regex and resolves each path
// against the template AST. List paths carry indices (`faq.3.question`) that no
// template mentions, so they live here and are collected separately — the same
// split hotelPriceInputs() already used.
//
// WHY DESCRIPTORS. Eight content types through one engine, rather than eight
// hand-written editors: each of them has to get the same invariants right, and
// writing that eight times is eight chances to get one wrong.
//
// THE INVARIANTS, all load-bearing:
//
//  1. TRANSLATION KEYS ARE ASSIGNED max+1 AND NEVER RENUMBERED. Each item owns
//     keys like `azFaqQ3`, under which the EN/AR text is stored. Renumber after
//     a delete and one key ends up bound to two different French strings —
//     which the server refuses (tools/check-rendered-page.mjs, gate A). Reuse a
//     freed number and an old English answer silently reappears under a new
//     French question. Measured: azerbaidjan's itinerary has 7 days but keys up
//     to azDay8, bali's has 5 days and keys up to 11 — orphans from past edits
//     are already there, so max+1 must consider the dictionary, not just the
//     items.
//  2. THE KEY SHAPE IS INFERRED, NEVER ASSUMED. The 7 trips do not agree:
//     azerbaidjan's itinerary days are `data-i18n="azDay1Title"`, egypte's are
//     `data-i18n-html="egStep1Title"`, and istanbul's carry no binding at all.
//     Hardcoding one shape would mint keys in the wrong shape for the others —
//     a binding no translation ever fills. So the shape is read off the items
//     that exist; where none carries a binding, new items get none either,
//     matching that trip's own convention.
//  3. DELETING AN ITEM DELETES ITS TRANSLATIONS, or the dictionary grows
//     entries nothing renders and a later max+1 can collide with one.
//  4. NO FIELD MAY BE LEFT EMPTY. Every visible string here carries a
//     translation binding, and an empty binding fails the build with `texte
//     français vide` — after a green "Publié ✓". Refused at the keyboard.
//  5. GENERATED FIELDS ARE NEVER SHOWN: aosDelay, starsHtml, the k* attributes,
//     seo.faqJsonLd, the inclusion counters. Machinery, derived on save. Asking
//     the owner to maintain machinery is how machinery drifts.
import { t, fmt } from "./i18n.js";

const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const setPath = (o, p, v) => {
  const k = p.split(".");
  let x = o;
  for (const s of k.slice(0, -1)) x = x[s] ?? (x[s] = {});
  x[k[k.length - 1]] = v;
};
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A k* property holds a whole attribute, e.g. ` data-i18n="azFaqQ1"`, because
// the template drops it into the tag verbatim.
const keyOf = (v) => { const m = /="([^"]+)"/.exec(String(v || "")); return m ? m[1] : null; };
const attrOf = (v) => { const m = /(data-i18n(?:-html)?)\s*=/.exec(String(v || "")); return m ? m[1] : null; };

// Plain text for the JSON-LD mirror of the FAQ, which must not contain markup.
const plain = (html) => String(html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// ── Descriptors ────────────────────────────────────────────────────────
// `keys` names the item properties that carry a translation binding. Their key
// shape and attribute are inferred per trip (invariant 2), so nothing here
// encodes a naming convention.
const SPECS = [
  {
    id: "dates",
    hint: "pages.list.dates.hint",
    path: "calcUi.dateChips",
    addable: true,
    min: 1,
    // Departures carry NO bindings — every chip in all 7 trips has k:"" — so
    // the editor the owner most needs is also the one with no i18n
    // consequences whatsoever.
    keys: [],
    choose: "active", // exactly one row is the preselected chip
    fields: [
      { name: "value", labelKey: "pages.f.date.value", hintKey: "pages.f.date.value.hint", type: "text" },
      { name: "label", labelKey: "pages.f.date.label", hintKey: "pages.f.date.label.hint", type: "text" },
    ],
    blank: () => ({ active: false, k: "" }),
    // tripData.dates feeds the calculator and the WhatsApp summary;
    // calcUi.dateChips is what the page renders. Different arrays, same strings
    // — or the owner adds a departure nobody can select.
    after: (rows, content) => setPath(content, "tripData.dates", rows.map((r) => r.value)),
  },
  {
    id: "faq",
    hint: "pages.list.faq.hint",
    path: "faq",
    addable: true,
    min: 1,
    keys: ["kBtn", "kA"],
    choose: "open",
    fields: [
      { name: "question", labelKey: "pages.f.faq.q", type: "text" },
      { name: "answerHtml", labelKey: "pages.f.faq.a", hintKey: "pages.f.html.hint", type: "textarea" },
    ],
    blank: () => ({ open: false, kQ: "" }),
    // seo.faqJsonLd must mirror faq exactly: a length mismatch is a hard 422
    // from validate-trip. Regenerating beats asking the owner to keep two
    // lists in step.
    after: (rows, content) =>
      setPath(content, "seo.faqJsonLd", rows.map((r) => ({ name: plain(r.question), text: plain(r.answerHtml) }))),
  },
  {
    id: "highlights",
    hint: "pages.list.highlights.hint",
    path: "highlights",
    addable: true,
    min: 1,
    keys: ["kLabel", "kTitle", "kBody"],
    fields: [
      { name: "label", labelKey: "pages.f.hl.label", type: "text" },
      { name: "title", labelKey: "pages.f.hl.title", type: "text" },
      { name: "body", labelKey: "pages.f.hl.body", type: "textarea" },
    ],
    // A new highlight needs an icon and there is no picker: copy the first
    // existing one rather than render a card with a hole in it.
    blank: (arr) => ({ iconSvg: (arr[0] && arr[0].iconSvg) || "" }),
  },
  {
    id: "itinerary",
    hint: "pages.list.itinerary.hint",
    path: "itinerary.days",
    addable: true,
    min: 1,
    keys: ["kLabel", "kTitle", "kAct"],
    choose: "active",
    fields: [
      { name: "node", labelKey: "pages.f.day.node", hintKey: "pages.f.day.node.hint", type: "text" },
      { name: "dayLabel", labelKey: "pages.f.day.label", type: "text" },
      { name: "title", labelKey: "pages.f.day.title", type: "text" },
      { name: "activities", labelKey: "pages.f.day.acts", type: "textarea" },
    ],
    blank: () => ({ active: false, kNode: "" }),
  },
  {
    id: "hotels",
    hint: "pages.list.hotels.hint",
    path: "hotels",
    // Deliberately NOT addable. A hotel card needs an image file already in the
    // repository, a calcId matching tripData.hotels, a tier and a full price
    // row — none of which can be supplied from here, and half of which would
    // fail the build. Renaming and re-rating the cards that exist is the safe
    // ninety per cent.
    addable: false,
    keys: [],
    fields: [
      { name: "name", labelKey: "pages.f.hotel.name", type: "text" },
      { name: "stars", labelKey: "pages.f.hotel.stars", type: "int", min: 1, max: 5 },
    ],
    // starsHtml is what the page prints and validate-trip requires; nothing
    // keeps it in step with `stars` on its own.
    after: (rows) => rows.forEach((r) => {
      r.starsHtml = "★".repeat(Math.max(1, Math.min(5, Number(r.stars) || 1)));
    }),
  },
  {
    id: "included",
    hint: "pages.list.included.hint",
    path: "inclus.included",
    addable: true,
    min: 1,
    keys: ["k"],
    fields: [{ name: "t", labelKey: "pages.f.incl", hintKey: "pages.f.html.hint", type: "textarea" }],
    after: (rows, content) =>
      setPath(content, "inclus.includedCount", fmt("pages.count.included", { n: rows.length })),
  },
  {
    id: "excluded",
    hint: "pages.list.excluded.hint",
    path: "inclus.excluded",
    addable: true,
    min: 1,
    keys: ["k"],
    fields: [{ name: "t", labelKey: "pages.f.excl", type: "textarea" }],
    after: (rows, content) =>
      setPath(content, "inclus.excludedCount", fmt("pages.count.excluded", { n: rows.length })),
  },
  {
    id: "testimonials",
    hint: "pages.list.testimonials.hint",
    path: "trust.testimonials",
    addable: true,
    min: 1,
    keys: ["kText", "kTrip"],
    fields: [
      { name: "text", labelKey: "pages.f.testi.text", type: "textarea" },
      { name: "name", labelKey: "pages.f.testi.name", type: "text" },
      { name: "initials", labelKey: "pages.f.testi.initials", hintKey: "pages.f.testi.initials.hint", type: "text" },
      { name: "trip", labelKey: "pages.f.testi.trip", type: "text" },
    ],
    blank: () => ({}),
  },
];

export const LIST_IDS = SPECS.map((s) => s.id);
export { SPECS as LIST_SPECS };

// ── Key shape, inferred ────────────────────────────────────────────────
/**
 * What key does property `prop` use on this trip's items?
 * → { head, tail, attr } such that the key for index n is `head + n + tail`,
 *   or null when no item carries a binding for that property (istanbul).
 *
 * Read off the data instead of assumed, because the trips disagree — see
 * invariant 2. Every existing sample must agree on the shape; one that does not
 * means an assumption here is wrong, and minting keys on a wrong assumption is
 * worse than minting none.
 */
export function inferShape(content, spec, prop) {
  const arr = getPath(content, spec.path) || [];
  // Tally rather than require unanimity. Some lists carry two key families at
  // once — azerbaidjan's inclusions are azInclItem1-3, azInclHotel1-2, then
  // azInclItem6-10 — and demanding agreement there would mint no key at all
  // for a new row, leaving it untranslatable. The dominant shape is the one a
  // new item should join.
  const tally = new Map();
  for (const item of arr) {
    const raw = item && item[prop];
    const key = keyOf(raw);
    if (!key) continue;
    const m = /^(.*?)(\d+)(.*)$/.exec(key);
    if (!m) continue; // a key with no index is not a per-item pattern
    const id = `${m[1]}\u0000${m[3]}`;
    const hit = tally.get(id) || { head: m[1], tail: m[3], attr: attrOf(raw) || "data-i18n", n: 0 };
    hit.n += 1;
    tally.set(id, hit);
  }
  let best = null;
  for (const s of tally.values()) if (!best || s.n > best.n) best = s;
  return best;
}

/**
 * The highest index already used by this list, across the items AND both
 * translation dictionaries. The dictionary half is not theoretical: measured
 * 2026-09-07, azerbaidjan has 7 itinerary days and keys up to azDay8, bali has
 * 5 and keys up to 11. Handing a new day the number 8 would give it a stale
 * English translation nobody asked for.
 */
export function maxKeyIndex(content, spec) {
  let max = 0;
  const shapes = spec.keys.map((p) => inferShape(content, spec, p)).filter(Boolean);
  if (!shapes.length) return 0;
  const patterns = shapes.map((s) => new RegExp(`^${escRe(s.head)}(\\d+)${escRe(s.tail)}$`));
  const consider = (key) => {
    if (!key) return;
    for (const re of patterns) {
      const m = re.exec(key);
      if (m) max = Math.max(max, Number(m[1]));
    }
  };
  for (const item of getPath(content, spec.path) || []) {
    for (const p of spec.keys) consider(keyOf(item[p]));
  }
  for (const lang of ["en", "ar"]) {
    for (const key of Object.keys((content.i18n && content.i18n[lang]) || {})) consider(key);
  }
  return max;
}

// ── Rendering ──────────────────────────────────────────────────────────
const fieldId = (specId, i, name) => `l-${specId}-${i}-${name}`;

function fieldHtml(spec, i, f, value) {
  const id = fieldId(spec.id, i, f.name);
  const hint = f.hintKey ? `<small class="lister__hint">${esc(t(f.hintKey))}</small>` : "";
  const common = `id="${id}" data-lf="${esc(f.name)}"`;
  const input = f.type === "textarea"
    ? `<textarea ${common} rows="3">${esc(value)}</textarea>`
    : f.type === "int"
      ? `<input ${common} type="number" inputmode="numeric" min="${f.min ?? 0}" max="${f.max ?? 9999}" value="${esc(value)}" />`
      : `<input ${common} value="${esc(value)}" />`;
  return `<div class="field"><label for="${id}">${esc(t(f.labelKey))}</label>${input}${hint}</div>`;
}

// `orig` is the item's index in the ORIGINAL array, or "" for a row the owner
// just added. collectLists() uses it to reuse the existing object (keeping the
// properties this editor never shows) instead of rebuilding it.
function rowHtml(spec, item, i, orig) {
  const pick = spec.choose
    ? `<label class="lister__pick"><input type="radio" name="pick-${spec.id}"${item[spec.choose] ? " checked" : ""} />` +
      `<span>${esc(t("pages.list.pick." + spec.id))}</span></label>`
    : "";
  const del = spec.addable
    ? `<button type="button" class="lister__del" data-del="${spec.id}" title="${esc(t("pages.list.remove"))}" aria-label="${esc(t("pages.list.remove"))}">✕</button>`
    : "";
  return `<div class="lister__row" data-orig="${orig}">` +
    `<div class="lister__num" aria-hidden="true">${i + 1}</div>` +
    `<div class="lister__body">${spec.fields.map((f) => fieldHtml(spec, i, f, item[f.name])).join("")}${pick}</div>` +
    del + `</div>`;
}

/** Every list fieldset, as one HTML string. */
export function listsHtml(content) {
  return SPECS.map((spec) => {
    const arr = getPath(content, spec.path);
    // A trip without this section simply does not show it, rather than
    // offering an editor that writes a key the template never reads.
    if (!Array.isArray(arr)) return "";
    const rows = arr.map((item, i) => rowHtml(spec, item, i, i)).join("");
    const add = spec.addable
      ? `<button type="button" class="btn btn--ghost btn--sm" data-add="${spec.id}">+ ${esc(t("pages.list.add." + spec.id))}</button>`
      : "";
    return `<details class="group lister" data-list="${spec.id}">` +
      `<summary>${esc(t("pages.list." + spec.id))} <span class="lister__count">${arr.length}</span></summary>` +
      `<p class="lister__note">${esc(t(spec.hint))}</p>` +
      `<div class="lister__rows">${rows}</div>${add}</details>`;
  }).join("");
}

/** Wire add and remove. Called once, after listsHtml() is in the DOM. */
export function wireLists(root, content) {
  root.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const spec = SPECS.find((s) => s.id === add.dataset.add);
      const box = root.querySelector(`[data-list="${spec.id}"] .lister__rows`);
      const blank = spec.blank ? spec.blank(getPath(content, spec.path) || []) : {};
      // rowHtml interpolates only declared field values (all through esc()) and
      // dictionary strings from i18n.js. A blank row carries no trip data at
      // all, so nothing unescaped reaches this string.
      box.insertAdjacentHTML("beforeend", rowHtml(spec, blank, box.children.length, ""));
      renumber(root, spec);
      const first = box.lastElementChild.querySelector("input, textarea");
      if (first) first.focus();
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      const spec = SPECS.find((s) => s.id === del.dataset.del);
      const box = root.querySelector(`[data-list="${spec.id}"] .lister__rows`);
      if (box.children.length <= (spec.min || 1)) {
        // validate-trip requires at least one of each of these, so emptying the
        // list is a refused publish. Saying so here beats saying it after.
        alert(fmt("pages.list.atleast", { n: spec.min || 1 }));
        return;
      }
      del.closest(".lister__row").remove();
      renumber(root, spec);
    }
  });
}

function renumber(root, spec) {
  const fs = root.querySelector(`[data-list="${spec.id}"]`);
  const rows = [...fs.querySelectorAll(".lister__row")];
  rows.forEach((row, i) => {
    const n = row.querySelector(".lister__num");
    if (n) n.textContent = String(i + 1);
  });
  const count = fs.querySelector(".lister__count");
  if (count) count.textContent = String(rows.length);
}

// ── Collecting ─────────────────────────────────────────────────────────
/**
 * Read every list back out of the DOM into `content`.
 *
 * Rebuilt wholesale from the rows, not patched by index: after an add or a
 * remove, index-based writing (what edit-pages.js's [data-path] collector does)
 * writes row 3 into item 4. Existing objects are REUSED, never recreated, so
 * everything this editor does not show — iconSvg, image, amenities, tier,
 * calcId — survives untouched.
 *
 * Returns the inputs it refused, in document order, so save() can stop and put
 * the cursor on the first one.
 */
export function collectLists(root, content) {
  const invalid = [];
  for (const spec of SPECS) {
    const fs = root.querySelector(`[data-list="${spec.id}"]`);
    if (!fs) continue;
    const arr = getPath(content, spec.path) || [];
    const shapes = Object.fromEntries(spec.keys.map((p) => [p, inferShape(content, spec, p)]));
    let next = maxKeyIndex(content, spec);
    const out = [];
    const kept = new Set();

    for (const row of fs.querySelectorAll(".lister__row")) {
      const orig = row.dataset.orig;
      const isNew = orig === "";
      const item = isNew ? (spec.blank ? spec.blank(arr) : {}) : arr[Number(orig)];
      if (!item) continue; // a row pointing at nothing is dropped, not crashed on
      if (!isNew) kept.add(Number(orig));

      if (isNew) {
        // One number for the whole item, so its keys stay a matched set.
        //
        // Where the trip carries no bindings for this list (istanbul), shapes
        // are null and the property is set to "" rather than left undefined.
        // That distinction is not cosmetic: the template engine's slot guard
        // rejects undefined outright, so `renderTrip` threw `".kBtn" is
        // missing` and the publish was refused — correctly, but for a reason
        // the owner could do nothing about. An empty string is exactly what
        // istanbul's existing items carry.
        const n = next + 1;
        let minted = false;
        for (const p of spec.keys) {
          const s = shapes[p];
          if (s) { item[p] = ` ${s.attr}="${s.head}${n}${s.tail}"`; minted = true; }
          else if (item[p] === undefined) item[p] = "";
        }
        if (minted) next = n;
      }

      for (const f of spec.fields) {
        const inp = row.querySelector(`[data-lf="${f.name}"]`);
        if (!inp) continue;
        inp.classList.remove("is-invalid");
        inp.removeAttribute("aria-invalid");
        const raw = String(inp.value).trim();
        const refuse = () => {
          inp.classList.add("is-invalid");
          inp.setAttribute("aria-invalid", "true");
          invalid.push(inp);
        };
        if (f.type === "int") {
          const n = Number(raw);
          if (raw === "" || !Number.isInteger(n) || n < (f.min ?? 0) || n > (f.max ?? 9999)) { refuse(); continue; }
          item[f.name] = n;
        } else {
          // Empty is never acceptable (invariant 4): these strings carry
          // translation bindings, and an empty binding fails the build.
          if (raw === "") { refuse(); continue; }
          item[f.name] = raw;
        }
      }

      if (spec.choose) {
        const radio = row.querySelector(`input[type="radio"][name="pick-${spec.id}"]`);
        item[spec.choose] = !!(radio && radio.checked);
      }
      out.push(item);
    }

    // Exactly one chosen row. None breaks the calculator's default selection;
    // two paint two chips as active at once.
    if (spec.choose && out.length) {
      let seen = false;
      for (const x of out) {
        if (x[spec.choose] && !seen) seen = true;
        else if (x[spec.choose]) x[spec.choose] = false;
      }
      if (!seen) out[0][spec.choose] = true;
    }

    // aosDelay: required by validate-trip on every item that is not the
    // open/active one, forbidden-by-convention on the one that is. Animation
    // timing is machinery, so it is derived from position and never shown.
    out.forEach((item, i) => {
      if (spec.choose && item[spec.choose]) delete item.aosDelay;
      else if (!Number.isInteger(item.aosDelay)) item.aosDelay = i * 60;
    });

    // Invariant 3: translations of deleted items go with them.
    arr.forEach((old, i) => {
      if (kept.has(i)) return;
      for (const p of spec.keys) {
        const key = keyOf(old[p]);
        if (!key) continue;
        for (const lang of ["en", "ar"]) {
          if (content.i18n && content.i18n[lang]) delete content.i18n[lang][key];
          if (content.i18nHash && content.i18nHash[lang]) delete content.i18nHash[lang][key];
        }
      }
    });

    setPath(content, spec.path, out);
    if (spec.after) spec.after(out, content);
  }
  return invalid;
}
