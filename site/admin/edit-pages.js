// site/admin/edit-pages.js — pick a trip, edit its content, publish.
//
// Scope note (2026-09-07): this used to expose 7 text fields plus the hotel
// price grid, which is why docs called the dashboard "a narrow trip editor, not
// a CMS". It now covers the page: 32 text fields grouped by where they appear,
// the price grid, and — in edit-lists.js — departures, FAQ, highlights,
// itinerary, hotel cards, inclusions and reviews.
//
// The widening is only safe because the refusal moved with it. api/save-trip.mjs
// validates the schema, re-derives every computed price, dry-renders the page and
// (since 57c6fb0) runs the build's i18n gates on that render, so an edit that
// would break the site is refused with a French explanation instead of being
// committed under a green "Publié ✓" and killing the next build.
import { t, fmt, applyI18n } from "./i18n.js";
import { icon } from "./icons.js";
import { areaHead } from "./ui.js";
import { listsHtml, wireLists, collectLists, LIST_SPECS } from "./edit-lists.js";
import { imageControl, FIELD_SLOT, loadCatalogue, wireImagePickers } from "./images.js";
import { FIELDS } from "./fields.js";
import { explainLine, explainStatus, makeLabelFor, rowRe } from "./save-errors.js";
import { watchPublish, fetchHealthFromBrowser } from "./publish-watch.js";

const SLUGS = ["istanbul", "bali", "tunisie", "vietnam", "azerbaidjan", "kuala-lumpur", "egypte"];
let current = null; // { slug, content, sha }

const el = (id) => document.getElementById(id);
const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const setPath = (o, p, v) => { const k = p.split("."); let x = o; for (const s of k.slice(0, -1)) x = x[s] ?? (x[s] = {}); x[k[k.length - 1]] = v; };
// Escape before interpolating trip content into markup. Browsers decode these
// entities back when you read input/textarea `.value`, so JSON round-trips intact.
// It deliberately does NOT escape `'`: every interpolation site in this file was
// audited and every one of them sits either in element text or inside a
// DOUBLE-quoted attribute (lines with data-path=, value=, id=, for=). If you ever
// add a single-quoted attribute here, add `.replace(/'/g, "&#39;")` first.
const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Some fields store a translation binding and its text in ONE string.
// finalCta.scarcityHtml is plain prose on istanbul and azerbaidjan, and
// `<span data-i18n="tnFinalScarcity">prose</span>` on the other five. Editing
// that raw would let an owner delete the wrapper and silently unbind the
// translation — the reason this field was previously left out of the form
// altogether. So the wrapper is split off for editing and put back on save:
// the owner types prose, the binding survives.
const WRAP_RE = /^(\s*<([a-zA-Z][\w-]*)\b[^>]*>)([\s\S]*)(<\/\2>\s*)$/;
function splitWrap(v) {
  const m = WRAP_RE.exec(String(v ?? ""));
  return m ? { open: m[1], inner: m[3], close: m[4] } : { open: "", inner: String(v ?? ""), close: "" };
}

// FIELDS (the flat [label, path, type] spec) moved to ./fields.js so it can be
// imported without a DOM — by tools/check-admin-fields.mjs and by the tests that
// check every refusal message resolves to one of these labels.

function fieldInput(label, path, type, val) {
  // Associate the label with its control. Without for/id a screen reader
  // announces the input as unlabelled, and tapping the label does nothing —
  // the id is derived from the JSON path, which is unique per form.
  const id = "f-" + path.replace(/[^a-zA-Z0-9]+/g, "-");
  let input;
  if (type === "image") {
    // A <select> of vetted paths, not a text box: see site/admin/images.js.
    return `<div class="field"><label for="${id}">${escHtml(label)}</label>`
      + imageControl({ id, attr: `data-path="${path}"`, slot: FIELD_SLOT[path], value: val })
      + "</div>";
  }
  if (type === "wrapped") {
    const w = splitWrap(val);
    input = `<input id="${id}" data-path="${path}" data-wrap-open="${escHtml(w.open)}" ` +
            `data-wrap-close="${escHtml(w.close)}" value="${escHtml(w.inner)}" />`;
  } else if (type === "textarea") {
    input = `<textarea id="${id}" data-path="${path}" style="min-height:70px">${escHtml(val)}</textarea>`;
  } else {
    input = `<input id="${id}" data-path="${path}" value="${escHtml(val)}" />`;
  }
  return `<div class="field"><label for="${id}">${escHtml(label)}</label>${input}</div>`;
}

// The six room keys every trip uses. Falls back to the raw key so a new room
// type still renders instead of disappearing.
const ROOM_KEYS = ["double", "triple", "single", "child1", "child2", "baby"];
// `t()` returns the KEY itself when a string is missing, never a falsy value,
// so the old `|| room` fallback was unreachable and an unlisted room type
// rendered as the literal "pages.room.suite". Compare against the key instead.
const roomLabel = (room) => {
  const key = "pages.room." + room;
  const label = t(key);
  return label === key ? room : label;
};

function hotelPriceInputs(content) {
  const hs = getPath(content, "tripData.hotels") || [];
  return hs.map((h, i) => {
    // Stable, readable column order rather than JSON key order, then anything
    // unexpected appended so nothing is ever silently uneditable.
    const keys = Object.keys(h.prices || {});
    const ordered = [...ROOM_KEYS.filter((k) => keys.includes(k)),
                     ...keys.filter((k) => !ROOM_KEYS.includes(k))];
    const prices = ordered.map((room) => {
      const path = `tripData.hotels.${i}.prices.${room}`;
      const id = "f-" + path.replace(/[^a-zA-Z0-9]+/g, "-");
      return `<div class="field"><label for="${id}">${escHtml(roomLabel(room))}</label>` +
             `<input id="${id}" data-path="${escHtml(path)}" data-int="1" inputmode="numeric" ` +
             `value="${escHtml(h.prices[room])}" /></div>`;
    }).join("");
    // The owner knows the hotel by name, not by the id the calculator uses.
    const title = h.name || h.id || fmt("pages.hotel.n", { n: i + 1 });
    return `<fieldset class="adv"><legend>${escHtml(title)} — ${escHtml(t("pages.rates"))}</legend><div class="row">${prices}</div></fieldset>`;
  }).join("");
}

// Thirty-two fields in one column is a wall. Grouped by where they appear on
// the page, and collapsed by default except the first — the owner opens the
// part they came to change.
const GROUPS = [
  { key: "pages.group.seo", icon: "seo", open: true, test: (p) => /^(meta|seo|jsonLd)\./.test(p) },
  { key: "pages.group.hero", icon: "sparkles", test: (p) => p.startsWith("hero.") },
  { key: "pages.group.sections", icon: "file", test: (p) => /^(itinerary|hotelsSection|tripMap|calcUi|finalCta)\./.test(p) },
];

function renderList(container) {
  container.innerHTML = `<div class="card"><h2 data-i18n="pages.title"></h2><div class="pagegrid" id="pg"></div></div>
    <div id="pages-banner"></div>`;
  applyI18n(container);
  container.prepend(areaHead("file", "nav.pages", "pages.intro"));
  const grid = container.querySelector("#pg");
  for (const s of SLUGS) {
    const b = document.createElement("button"); b.className = "pagecard";
    const ic = document.createElement("span"); ic.className = "pagecard__icon";
    ic.append(icon("file", { size: 22 }));
    const tt = document.createElement("span"); tt.className = "t"; tt.textContent = s;
    const m = document.createElement("span"); m.className = "m"; m.textContent = t("pages.edit");
    b.append(ic, tt, m);
    b.addEventListener("click", () => loadTrip(s));
    grid.appendChild(b);
  }
  const visa = document.createElement("div"); visa.className = "pagecard is-locked";
  const vic = document.createElement("span"); vic.className = "pagecard__icon";
  vic.append(icon("calendar", { size: 22 }));
  const vt = document.createElement("span"); vt.className = "t"; vt.textContent = t("pages.visa");
  const vm = document.createElement("span"); vm.className = "m"; vm.textContent = t("pages.soon");
  visa.append(vic, vt, vm); grid.appendChild(visa);
  const st = window.AT_ADMIN.status;
  if (st && !st.github) {
    const bn = document.createElement("p"); bn.className = "banner";
    bn.append(icon("alert", { size: 18 }));
    const tx = document.createElement("span"); tx.textContent = t("pages.nogithub");
    bn.append(tx);
    container.querySelector("#pages-banner").appendChild(bn);
  }
}

function renderEditor(container) {
  const c = current.content;
  const grouped = GROUPS.map((g) => ({
    ...g,
    html: FIELDS.filter(([, p]) => g.test(p)).map(([l, p, ty]) => fieldInput(l, p, ty, getPath(c, p))).join(""),
  }));
  const rest = FIELDS.filter(([, p]) => !GROUPS.some((g) => g.test(p)))
    .map(([l, p, ty]) => fieldInput(l, p, ty, getPath(c, p))).join("");
  container.innerHTML = `
    <button id="ep-back" class="btn btn--ghost btn--sm" data-i18n="pages.back"></button>
    <div class="card" id="ep-card">
      <div class="row" style="align-items:center">
        <h2 style="margin:0">${escHtml(current.slug)}</h2>
        <span class="spacer"></span>
        <button id="ep-revert" class="btn btn--ghost btn--sm ep-undo" type="button" data-i18n="pages.revert"></button>
        <button id="ep-save" class="btn" data-i18n="pages.publish"></button>
      </div>
      <p id="ep-msg" class="msg" role="status" aria-live="polite"></p>
      ${grouped.map((g) => `<details class="group"${g.open ? " open" : ""}><summary>${escHtml(t(g.key))}</summary>${g.html}</details>`).join("")}
      ${rest}
      <details class="group"><summary>${escHtml(t("pages.group.prices"))}</summary>${hotelPriceInputs(c)}</details>
      <div id="ep-lists">${listsHtml(c)}</div>
      <details class="adv"><summary data-i18n="pages.advanced"></summary>
        <p class="msg" data-i18n="pages.advanced.warn"></p>
        <div class="field"><label for="ep-json" data-i18n="pages.advanced.json"></label>
        <textarea id="ep-json">${escHtml(JSON.stringify(c, null, 2))}</textarea></div>
      </details>
    </div>`;
  applyI18n(container);
  // Icons go in after innerHTML: icon() builds DOM nodes, not markup strings.
  const back = container.querySelector("#ep-back");
  back.prepend(icon("back", { size: 16 }));
  // ec05f7d gave this button an icon but no handler, so the editor had no way
  // out: the Pages nav button no-ops once the area is initialised, which left a
  // page reload as the only exit.
  dirty = false;
  const card = container.querySelector("#ep-card");
  card.addEventListener("input", () => { dirty = true; });
  // Add/delete are clicks, not inputs: without this, add-then-Retour and
  // delete-then-Retour walked past the unsaved-work prompt.
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-add], [data-del]")) dirty = true;
  });
  back.addEventListener("click", () => {
    if (dirty && !window.confirm(t("pages.back.dirty"))) return;
    // Leaving invalidates anything still in flight for this screen. save()'s
    // re-sync guards on this token and then writes to #ep-json, which does not
    // exist on the list view - without the bump that is a TypeError.
    loadSeq += 1;
    renderList(container);
  });
  container.querySelector("#ep-save").prepend(icon("send", { size: 17 }));
  container.querySelector("#ep-revert").prepend(icon("back", { size: 16 }));
  const legendIcon = {
    "pages.group.seo": "seo", "pages.group.hero": "sparkles", "pages.group.sections": "file",
    "pages.group.prices": "hotel", "pages.list.dates": "calendar", "pages.list.faq": "help",
    "pages.list.highlights": "sparkles", "pages.list.itinerary": "calendar",
    "pages.list.hotels": "hotel", "pages.list.included": "check", "pages.list.excluded": "close",
    "pages.list.testimonials": "chat",
  };
  container.querySelectorAll("details.group > summary").forEach((sm) => {
    const label = sm.textContent.trim().replace(/\s+\d+$/, "");
    const key = Object.keys(legendIcon).find((k) => t(k) === label);
    sm.prepend(icon(legendIcon[key] || "file", { size: 16 }));
  });
  // Add/remove for every list. Delegated, so rows added later are covered
  // without rebinding - but bound to #ep-lists, NOT to `container`.
  // #area-pages outlives every render (only its innerHTML is replaced), so
  // binding there stacked one live listener per trip opened, each still
  // holding the previous trip's `c`. #ep-lists is rebuilt with the markup.
  wireLists(container.querySelector("#ep-lists"), c);
  // Bound to the card, which is rebuilt with every render, so the hotel rows
  // inside #ep-lists are covered by the same listener as the page fields.
  wireImagePickers(card);
  const st = window.AT_ADMIN.status;
  if (st && !st.github) {
    const btn = container.querySelector("#ep-save");
    btn.disabled = true;
    container.querySelector("#ep-revert").disabled = true; // revert also writes to GitHub
    const bn = document.createElement("p"); bn.className = "banner";
    bn.append(icon("alert", { size: 18 }));
    const tx = document.createElement("span"); tx.textContent = t("pages.nogithub");
    bn.append(tx);
    container.querySelector("#ep-msg").after(bn);
  } else {
    container.querySelector("#ep-save").addEventListener("click", save);
    container.querySelector("#ep-revert").addEventListener("click", revert);
  }
}

function collectInto(content) {
  // Returns the inputs it refused, so save() can stop instead of publishing a
  // half-applied edit. A cleared price used to be skipped silently here and the
  // stale value from the raw-JSON base was published under a "Publié ✓".
  const invalid = [];
  document.querySelectorAll("#area-pages [data-path]").forEach((inp) => {
    inp.classList.remove("is-invalid");
    inp.removeAttribute("aria-invalid");
    let v = inp.value;
    if (inp.dataset.int) {
      const raw = String(v).trim();
      const n = Number(raw);
      // A price must be a whole number >= 0: tools/validate-trip.mjs rejects
      // anything else at build time, so accepting it here only moves the
      // failure to a place the owner cannot see.
      if (raw === "" || !Number.isInteger(n) || n < 0) {
        inp.classList.add("is-invalid");
        inp.setAttribute("aria-invalid", "true");
        invalid.push(inp);
        return;
      }
      v = n;
    } else {
      // Every text field here carries a translation binding on the rendered
      // page, and an empty binding fails the build with `texte français vide`
      // — after the owner has been told the edit published. Refuse it at the
      // keyboard instead. (Numbers are covered by the branch above.)
      if (String(v).trim() === "") {
        inp.classList.add("is-invalid");
        inp.setAttribute("aria-invalid", "true");
        invalid.push(inp);
        return;
      }
      // Put back the translation wrapper this field was split out of.
      if (inp.dataset.wrapOpen !== undefined) {
        v = inp.dataset.wrapOpen + v + inp.dataset.wrapClose;
      }
    }
    setPath(content, inp.dataset.path, v);
  });
  return invalid;
}

// Two fast clicks on two different trips race each other. Without a token,
// whichever /api/get-trip resolves LAST wins `current` — the form can end up
// showing trip A while current.slug is B, and then Publier writes A's content
// into B's file. That is silent data corruption on a WRITE surface, not a
// flicker. Same guard as app.js's pendingToken around /api/me: stamp the
// request, and let only the newest response touch `current` or the DOM.
let loadSeq = 0;

// Bumped at the START of every publish and every revert, whatever its outcome.
//
// loadSeq alone could not express this. It moves on a SUCCESSFUL publish (the
// post-publish re-sync), on loadTrip, and on leaving the screen — but NOT on a
// refusal. So a deploy watch armed by publish #1 stayed armed through a publish
// #2 that was REFUSED, and five minutes later it painted "En ligne ✓" over the
// refusal message: the dashboard telling the owner an edit was live when it had
// been rejected and never committed. That is precisely the lie this whole
// feature exists to delete, so the watch's lifetime is tied to the attempt that
// started it rather than to the trip being loaded.
let publishSeq = 0;

// Set by any keystroke in the form, cleared on a fresh render and on a
// successful publish. Only #ep-back reads it: leaving the editor is the one
// action that silently throws typing away.
let dirty = false;

// A dead end with no way out is its own bug: the Pages nav button no-ops once
// the area is initialised, so without these two controls a failed load left the
// owner with nothing but a page reload.
function loadFailed(c, slug, detail) {
  // Server-supplied text is escaped before it reaches markup — same policy as
  // the 422 branch in save() below.
  c.innerHTML = `<p class="msg err">${escHtml(fmt("pages.load.fail", { e: detail }))}</p>`;
  const retry = document.createElement("button");
  retry.className = "btn btn--ghost btn--sm";
  retry.textContent = t("common.retry");
  retry.addEventListener("click", () => loadTrip(slug));
  const back = document.createElement("button");
  back.className = "btn btn--ghost btn--sm";
  back.textContent = t("pages.back");
  back.addEventListener("click", () => renderList(c));
  c.append(retry, back);
}

async function loadTrip(slug) {
  const c = document.getElementById("area-pages");
  const seq = ++loadSeq;
  const p = document.createElement("p"); p.className = "msg";
  p.textContent = fmt("pages.loading", { slug });
  c.replaceChildren(p);

  let r;
  try {
    // In parallel, not in sequence: the photo catalogue is needed before the
    // form is built (a select rendered without it can only hold the current
    // value), and it does not depend on which trip was opened. loadCatalogue()
    // resolves to null rather than throwing, so it cannot fail the load.
    [r] = await Promise.all([
      window.AT_ADMIN.callApi(`/api/get-trip?slug=${encodeURIComponent(slug)}`),
      loadCatalogue(),
    ]);
  } catch {
    // An unguarded throw here used to leave "Chargement de …" on screen forever.
    if (seq !== loadSeq) return false;
    loadFailed(c, slug, t("pages.network"));
    return false;
  }
  // A newer trip was clicked while this request was in flight: this answer is
  // stale, so it must not claim `current` and must not paint anything.
  if (seq !== loadSeq) return false;
  if (!r.ok) { loadFailed(c, slug, r.data.error || r.status); return false; }
  current = { slug, content: r.data.content, sha: r.data.sha };

  // An edit stashed before a forced reconnect comes back here. The SHA stays
  // the server's — the edit is republished on top of current state, exactly as
  // it would have been — but the CONTENT is the owner's unpublished text.
  let restored = null;
  try { restored = takeStash(slug, localStorage); } catch { /* private mode */ }
  if (restored) {
    try {
      const parsed = JSON.parse(restored.json);
      if (parsed && parsed.slug === slug) current.content = parsed;
      else restored = null;
    } catch { restored = null; }
  }

  renderEditor(c);
  if (restored) {
    // After renderEditor, which resets `dirty`: the restored text is still
    // unpublished, so leaving must warn about it like any other unsaved edit.
    dirty = true;
    const m = el("ep-msg");
    if (m) { m.className = "msg"; m.textContent = t("pages.restored"); }
  }
  return true;
}

// ── Refusals, and watching a publish reach the site ─────────────────────

// JSON path → the label printed above the control the owner actually used.
// The resolver itself lives in save-errors.js so it can be tested against the
// refusals the real gates emit; here it is just bound to this form's spec.
const labelFor = makeLabelFor({ fields: FIELDS, lists: LIST_SPECS, t });

/** Reveal and focus the control behind a JSON path — the same treatment save()
    already gives a field IT refuses: open every collapsed ancestor, then scroll. */
function focusPath(path) {
  let node = document.querySelector(`#area-pages [data-path="${path}"]`);
  if (!node) {
    for (const spec of LIST_SPECS) {
      const m = rowRe(spec.path).exec(path);
      if (!m) continue;
      const fs = document.querySelector(`#area-pages [data-list="${spec.id}"]`);
      node = fs ? fs.querySelectorAll(".lister__row")[Number(m[1])] : null;
      break;
    }
  }
  if (!node) return;
  for (let n = node.parentElement; n; n = n.parentElement) if (n.tagName === "DETAILS") n.open = true;
  const target = node.matches("input, textarea, select") ? node : node.querySelector("input, textarea, select");
  if (target) target.focus();
  node.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** One refusal line: "Hero — texte d'introduction — contenu trop court…". */
function refusalItem(raw, content) {
  const ex = explainLine(raw, { labelFor, content, fields: FIELDS });
  const li = document.createElement("li");
  if (ex.label) {
    const name = document.createElement("strong");
    name.textContent = ex.row ? fmt("pages.refused.at", { field: ex.label, n: ex.row }) : ex.label;
    if (ex.path) {
      // Clicking the name is the whole point: a named field the owner still has
      // to hunt for in 34 inputs and 8 list editors is only half an answer.
      name.className = "refusal__jump";
      name.tabIndex = 0;
      name.setAttribute("role", "button");
      const go = () => focusPath(ex.path);
      name.addEventListener("click", go);
      name.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    }
    li.append(name, " — ");
  }
  li.append(document.createTextNode(ex.text));
  if (ex.detail) {
    // Developer-facing text: present, but folded away so it informs the person
    // who can use it without shouting at the person who cannot.
    const d = document.createElement("details");
    const s = document.createElement("summary");
    s.textContent = t("pages.err.detail");
    const pre = document.createElement("pre");
    pre.textContent = ex.detail;
    d.append(s, pre);
    li.append(d);
  }
  return li;
}

/**
 * Paint a 422 as a list of named fields.
 *
 * Built from nodes, never innerHTML. The previous version escaped and then
 * concatenated into innerHTML, which was correct but only as long as every
 * future author remembered the escape — and these strings interpolate the
 * owner's own text, from a raw-JSON panel with no restrictions on it.
 * textContent cannot be got wrong.
 */
function renderRefusal(msg, errors, content) {
  msg.className = "msg err msg--stack";
  msg.replaceChildren();
  const head = document.createElement("p");
  head.textContent = t("pages.refused.title");
  const ul = document.createElement("ul");
  ul.className = "refusal";
  for (const raw of errors || []) ul.append(refusalItem(raw, content));
  msg.append(head, ul);
}

// An expired session is the one refusal whose fix is "leave this page", and
// leaving it used to cost the owner everything they had typed: `dirty` guards
// only the in-app Back button (renderEditor, `pages.back.dirty`), there is no
// beforeunload handler, so location.reload() discards the form without a word.
// That would have made pages.err.401 a lie — it promises "votre texte est
// toujours à l'écran" — on the exact failure the runtime logs show the client
// hitting. So stash the edit before reloading, and hand it back on the way in.
//
// localStorage, not sessionStorage: a magic link is opened from an email client
// and usually lands in a NEW tab, where a sessionStorage stash does not exist.
// Stamped and capped so an edit abandoned days ago cannot resurface over a
// newer one; cleared as soon as it is read.
const STASH = "at_pending_edit";
const STASH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function stashEdit() {
  try {
    localStorage.setItem(STASH, JSON.stringify({
      slug: current.slug, json: el("ep-json").value, at: Date.now(),
    }));
  } catch { /* private mode: nothing to be done, and not worth blocking on */ }
}

/**
 * The stashed edit for `slug`, or null.
 *
 * Validates BEFORE removing, and that order is the whole point. The stash
 * belongs to ONE trip, and after reconnecting the owner lands on Accueil — they
 * may well open a different page first. Clearing on read meant the first
 * unrelated trip they opened silently destroyed the edit we had just promised to
 * keep. A stash for another slug is therefore left exactly where it is; only one
 * that is claimed, unparseable, or expired is cleared.
 */
function takeStash(slug, store, now = Date.now()) {
  let raw = null;
  try { raw = store.getItem(STASH); } catch { return null; /* private mode */ }
  if (!raw) return null;

  const drop = () => { try { store.removeItem(STASH); } catch { /* private mode */ } };

  let s = null;
  try { s = JSON.parse(raw); } catch { s = null; }
  // Garbage, or too old to trust over the server's copy: nothing can ever claim
  // it, so it is safe — and tidier — to clear it now.
  if (!s || typeof s.json !== "string" || !Number.isFinite(s.at) || now - s.at > STASH_MAX_AGE_MS) {
    drop();
    return null;
  }
  if (s.slug !== slug) return null; // someone else's trip — leave it for them

  drop();
  return s;
}

/** Paint a transport/server failure: one sentence, plus a way out where one exists. */
function renderFailure(msg, status, data) {
  const ex = explainStatus(status, data);
  msg.className = ex.detail ? "msg err msg--stack" : "msg err";
  msg.replaceChildren(document.createTextNode(fmt(ex.key, ex.params)));
  if (ex.action === "reconnect") {
    const b = document.createElement("button");
    b.className = "btn btn--ghost btn--sm";
    b.textContent = t("pages.err.reconnect");
    // Reload rather than re-run the login flow in place: app.js owns the whole
    // session state machine, and re-entering it from here would mean keeping
    // two copies of that logic in step. The unpublished text is stashed first,
    // so the reload costs the session and nothing else.
    b.addEventListener("click", () => { stashEdit(); location.reload(); });
    msg.append(" ", b);
  }
  if (ex.detail) {
    const d = document.createElement("details");
    const s = document.createElement("summary");
    s.textContent = t("pages.err.detail");
    const pre = document.createElement("pre");
    pre.textContent = ex.detail;
    d.append(s, pre);
    msg.append(d);
  }
}

/**
 * The page HTML is network-first in sw.js, so a text edit is visible on the very
 * next load regardless. The stylesheet and the GENERATED <slug>/page-i18n.js are
 * stale-while-revalidate — so without this nudge an EN/AR translation edit lags
 * one visit behind the French it shipped with.
 */
function refreshServiceWorker() {
  try {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.getRegistration()
      .then((reg) => { if (reg) reg.update(); })
      .catch(() => { /* storage disabled — nothing to refresh */ });
  } catch { /* no SW support */ }
}

/** Paint one state of the deploy watch. States come from publish-watch.js. */
function renderPublishState(state, info) {
  const msg = el("ep-msg");
  if (!msg) return;
  const KEY = {
    deploying: "pages.watch.deploying",
    live: "pages.watch.live",
    slow: "pages.watch.slow",
    unconfirmable: "pages.published",
  };
  msg.className = state === "deploying" || state === "slow" ? "msg" : "msg ok";
  msg.replaceChildren(document.createTextNode(t(KEY[state] || "pages.published")));
  const a = document.createElement("a");
  a.target = "_blank"; a.rel = "noopener";
  if (state === "live" && info.slug) {
    a.href = `/${info.slug}/`;
    a.textContent = t("pages.viewpage");
  } else if (info.commitUrl) {
    a.href = info.commitUrl;
    a.textContent = t("pages.viewcommit");
  } else { return; }
  msg.append(" ", a);
}

async function save() {
  // Claim #ep-msg for THIS attempt before anything can fail: even the invalid-JSON
  // early return below writes there, and an older watch must not overwrite it.
  const myPublish = ++publishSeq;
  const msg = el("ep-msg");
  // Base = the raw-JSON panel (authoritative for untouched structure), then overlay structured fields.
  let content;
  try { content = JSON.parse(el("ep-json").value); }
  catch (e) { msg.className = "msg err"; msg.textContent = "JSON invalide: " + e.message; return; }
  // Lists first, then the flat fields: collectLists() rebuilds whole arrays
  // from the DOM, and doing it after collectInto() would be harmless but reads
  // backwards. Both return the inputs they refused, in document order.
  const invalid = [...collectLists(document.getElementById("area-pages"), content), ...collectInto(content)];
  if (invalid.length) {
    // Refuse the whole publish. Publishing the valid subset would leave the
    // owner believing the field they just cleared had been saved.
    msg.className = "msg err";
    msg.textContent = fmt("pages.badfield", { n: invalid.length });
    invalid[0].focus();
    // A refused field inside a collapsed group is invisible; open its way out.
    for (let n = invalid[0].parentElement; n; n = n.parentElement) {
      if (n.tagName === "DETAILS") n.open = true;
    }
    invalid[0].scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  // keep the JSON panel in sync so the user sees exactly what will be saved
  el("ep-json").value = JSON.stringify(content, null, 2);

  msg.className = "msg"; msg.textContent = t("pages.publishing");
  const saveBtn = el("ep-save");
  if (saveBtn) saveBtn.disabled = true;
  let r;
  try {
    r = await window.AT_ADMIN.callApi("/api/save-trip", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: current.slug, content, sha: current.sha }),
    });
  } catch {
    msg.className = "msg err";
    msg.textContent = t("pages.save.network");
    return;
  } finally {
    // In `finally`, not after the await: a network throw used to skip the
    // re-enable and leave Publier disabled and stuck on "Publication…" for the
    // rest of the session, with no retry short of reloading the page.
    if (saveBtn) saveBtn.disabled = false;
  }
  if (r.ok) {
    dirty = false;
    const info = { commitUrl: r.data.commitUrl, slug: current.slug };
    renderPublishState(r.data.commitSha ? "deploying" : "unconfirmable", info);
    // Re-sync BOTH the SHA and the content. A full loadTrip() would rebuild the
    // form — losing the "Publié ✓" and every open group — so only `current`,
    // the raw-JSON panel and the list rows' identity are refreshed. Refreshing
    // the SHA alone used to leave the previous document in memory and armed:
    // the next save re-POSTed that stale body, and the 409 retry re-PUT it
    // against a fresh SHA, silently reverting whatever was published between.
    //
    // Stamped with the SAME token as loadTrip(): this is the second
    // /api/get-trip that writes `current`, and #ep-back is never disabled, so
    // the owner can leave - or open another trip - while it is in flight.
    // Both bump loadSeq, which is what makes the guard below hold.
    const seq = ++loadSeq;
    let g = null;
    try { g = await window.AT_ADMIN.callApi(`/api/get-trip?slug=${encodeURIComponent(current.slug)}`); }
    catch { /* keep the "Publié ✓" — the next save re-reads the SHA anyway */ }
    if (seq !== loadSeq) return;
    if (g && g.ok) {
      current.sha = g.data.sha;
      current.content = g.data.content;
      el("ep-json").value = JSON.stringify(g.data.content, null, 2);
      // Rows added in this session are no longer "new" — they are now items in
      // the saved array. Re-stamping data-orig by position keeps a second save
      // from minting a second set of translation keys for the same row.
      document.querySelectorAll("#area-pages [data-list]").forEach((fs) => {
        [...fs.querySelectorAll(".lister__row")].forEach((row, i) => { row.dataset.orig = String(i); });
      });
    }

    // Now follow the commit until it is actually SERVING. Everything above only
    // proves the edit reached GitHub; the owner's question is whether the site
    // changed, and until now the dashboard answered it with a guess ("~1
    // minute") that went unchecked. See publish-watch.js.
    //
    // Guarded by the same loadSeq token as the re-sync above: leaving the trip,
    // opening another, or publishing again abandons the watch rather than
    // writing a stale verdict into a form that has moved on.
    const watchSeq = loadSeq;
    await watchPublish({
      commitSha: r.data.commitSha,
      fetchHealth: fetchHealthFromBrowser,
      sleep: (ms) => new Promise((res) => setTimeout(res, ms)),
      shouldStop: () => publishSeq !== myPublish || loadSeq !== watchSeq || !el("ep-msg"),
      onState: (state) => {
        renderPublishState(state, info);
        if (state === "live") refreshServiceWorker();
      },
    });
  } else if (r.status === 422) {
    renderRefusal(msg, r.data.errors, content);
  } else {
    renderFailure(msg, r.status, r.data);
  }
}

// Undo the last publish of the current trip. The server finds the previous
// committed version and commits it forward (no history rewrite); on success we
// reload the trip so the form reflects the restored content, then confirm.
async function revert() {
  // A revert is also an attempt on this page, so it cancels any watch a previous
  // publish left running — and gets cancelled in turn by the next publish.
  const myPublish = ++publishSeq;
  const msg = el("ep-msg");
  if (!confirm(t("pages.revert.confirm"))) return;

  msg.className = "msg"; msg.textContent = t("pages.reverting");
  const saveBtn = el("ep-save"), revBtn = el("ep-revert");
  if (saveBtn) saveBtn.disabled = true;
  if (revBtn) revBtn.disabled = true;

  let r;
  try {
    r = await window.AT_ADMIN.callApi("/api/revert-trip", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: current.slug }),
    });
  } catch {
    // A throw used to skip both re-enables in the else branch below and leave
    // the editor frozen on "Annulation en cours…" with two dead buttons.
    // (Not a `finally`: on the success path loadTrip() rebuilds the toolbar, so
    // re-enabling these now-detached buttons would be meaningless.)
    if (saveBtn) saveBtn.disabled = false;
    if (revBtn) revBtn.disabled = false;
    msg.className = "msg err";
    msg.textContent = fmt("pages.revert.fail", { e: t("pages.network") });
    return;
  }

  if (r.ok) {
    // Re-render the editor with the restored version, then show the confirmation
    // (loadTrip rebuilds #area-pages, so the message must be set afterwards).
    const slug = current.slug;
    const commitUrl = r.data.commitUrl;
    await loadTrip(slug);
    const m2 = el("ep-msg");
    if (m2) {
      m2.className = "msg ok";
      m2.textContent = t("pages.reverted");
      if (commitUrl) {
        const a = document.createElement("a");
        a.href = commitUrl; a.textContent = t("pages.viewcommit"); a.target = "_blank"; a.rel = "noopener";
        m2.append(" ", a);
      }
    }
    // A rollback has exactly the same gap as a publish: the old content is back
    // in GitHub, and the owner — who is reverting precisely because something
    // looked wrong — has no way to see when the site follows. loadTrip() above
    // rebuilt the form and bumped loadSeq, so capture the token after it.
    const watchSeq = loadSeq;
    await watchPublish({
      commitSha: r.data.commitSha,
      fetchHealth: fetchHealthFromBrowser,
      sleep: (ms) => new Promise((res) => setTimeout(res, ms)),
      shouldStop: () => publishSeq !== myPublish || loadSeq !== watchSeq || !el("ep-msg"),
      onState: (state) => {
        if (state === "deploying") return; // "Rétabli ✓" is the better first word
        renderPublishState(state, { commitUrl, slug });
        if (state === "live") refreshServiceWorker();
      },
    });
  } else {
    if (saveBtn) saveBtn.disabled = false;
    if (revBtn) revBtn.disabled = false;
    renderFailure(msg, r.status, r.data);
  }
}

let inited = false;
document.addEventListener("admin:area", (e) => {
  if (e.detail === "pages" && !inited) { inited = true; renderList(document.getElementById("area-pages")); }
});

// The /api/status prefetch can resolve after the Pages area first renders;
// without this, the no-GitHub banner (and the disabled Publier) never appears
// for an owner who opens Pages quickly. accueil.js listens the same way.
document.addEventListener("admin:status", () => {
  if (!inited) return;
  const c = document.getElementById("area-pages");
  const st = window.AT_ADMIN.status;
  if (!c || !st || st.github) return;
  if (c.querySelector(".banner")) return; // already shown
  if (c.querySelector("#pg")) { renderList(c); return; } // list view: stateless re-render
  // Editor view: mutate in place — re-rendering would discard in-progress edits.
  const btn = c.querySelector("#ep-save");
  if (btn) {
    btn.disabled = true; // a disabled button no longer fires its click listener
    const rev = c.querySelector("#ep-revert"); if (rev) rev.disabled = true;
    const bn = document.createElement("p"); bn.className = "banner"; bn.textContent = t("pages.nogithub");
    const msg = c.querySelector("#ep-msg"); if (msg) msg.after(bn);
  }
});
