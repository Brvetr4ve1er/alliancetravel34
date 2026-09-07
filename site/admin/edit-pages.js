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
import { listsHtml, wireLists, collectLists } from "./edit-lists.js";
import { imageControl, FIELD_SLOT, loadCatalogue, wireImagePickers } from "./images.js";

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

// [label, json-path, type]
//
// Every path here MUST be read by a template in tools/templates/sections/.
// A path the templates ignore is invisible when wrong: getPath returns
// undefined so the input renders blank, and setPath happily *creates* the key
// on save — the owner edits, sees "Publié ✓", and nothing changes. Two fields
// shipped that way ("hero.titlePre", "finalCta.scarcity").
// tools/check-admin-fields.mjs enforces the rule at build time; every path
// below was checked against the template AST before being added.
//
// Deliberately absent, and each for a reason:
//   • hero.priceFrom, seo.offerPrice, hotels[].priceFrom/priceMeta,
//     calcUi.optionsHtml — owned by tools/value-graph.mjs, which recomputes them
//     from the price grid on every save. An input here would be overwritten.
//   • inclus.includedCount / excludedCount — generated from the list lengths.
//   • hero.titlePre / titlePost / prompt — validated, rendered by nothing.
const FIELDS = [
  // ── Référencement et partage ──
  ["Titre SEO (<title>)", "meta.title", "text"],
  ["Meta description", "meta.description", "textarea"],
  ["Titre de partage (WhatsApp, Facebook)", "meta.ogTitle", "text"],
  ["Image de partage (WhatsApp, Facebook)", "meta.ogImage", "image"],
  ["Description de partage", "meta.ogDescription", "textarea"],
  ["Nom du voyage (données Google)", "seo.tripName", "text"],
  ["Description du voyage (données Google)", "seo.tripDescription", "textarea"],
  ["Fil d'Ariane", "jsonLd.breadcrumbName", "text"],
  // ── Hero ──
  ["Hero — photo de fond", "hero.bg", "image"],
  ["Hero — sur-titre", "hero.eyebrow", "text"],
  // The H1 is two slots: hero.tpl renders {{hero.h1Pre}}<em>{{hero.h1Em}}</em>.
  ["Hero — titre (1re partie)", "hero.h1Pre", "text"],
  ["Hero — titre (partie colorée)", "hero.h1Em", "text"],
  ["Hero — dates/durée", "hero.date", "text"],
  ["Hero — texte d'introduction", "hero.lede", "textarea"],
  ["Hero — unité du prix", "hero.priceUnit", "text"],
  ["Hero — mention en petits caractères", "hero.fineprint", "textarea"],
  ["Hero — description pour lecteur d'écran", "hero.aria", "text"],
  // ── Titres de sections ──
  ["Itinéraire — étape", "itinerary.phaseLabel", "text"],
  ["Itinéraire — sur-titre", "itinerary.eyebrow", "text"],
  ["Itinéraire — titre", "itinerary.titleHtml", "text"],
  ["Hôtels — étape", "hotelsSection.phaseLabel", "text"],
  ["Hôtels — sur-titre", "hotelsSection.eyebrow", "text"],
  ["Hôtels — titre", "hotelsSection.titleHtml", "text"],
  ["Hôtels — sous-titre", "hotelsSection.sub", "textarea"],
  ["Carte — sur-titre", "tripMap.eyebrow", "text"],
  ["Carte — titre", "tripMap.titleHtml", "text"],
  ["Carte — sous-titre", "tripMap.subHead", "textarea"],
  ["Calculateur — étape", "calcUi.phaseLabel", "text"],
  ["Calculateur — sur-titre", "calcUi.eyebrow", "text"],
  ["Calculateur — titre", "calcUi.titleHtml", "text"],
  ["Calculateur — libellé « date de départ »", "calcUi.dateLabel", "text"],
  ["Appel final — titre", "finalCta.titleHtml", "text"],
  ["Appel final — sous-titre", "finalCta.sub", "textarea"],
  ["Appel final — mention de disponibilité", "finalCta.scarcityHtml", "wrapped"],
];

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
const roomLabel = (room) => t("pages.room." + room) || room;

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
        <textarea id="ep-json">${escHtml(JSON.stringify(c, null, 2))}</textarea>
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
  renderEditor(c);
  return true;
}

async function save() {
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
    msg.className = "msg ok";
    msg.textContent = t("pages.published");
    if (r.data.commitUrl) {
      const a = document.createElement("a");
      a.href = r.data.commitUrl; a.textContent = t("pages.viewcommit"); a.target = "_blank"; a.rel = "noopener";
      msg.append(" ", a);
    }
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
  } else if (r.status === 422) {
    msg.className = "msg err";
    // Escape server-provided text before it reaches innerHTML: validator
    // messages interpolate field values verbatim, and the raw-JSON panel is
    // unrestricted — unescaped, a crafted value executes in the admin session.
    msg.innerHTML = "Refusé — l'édition casserait la page :<br>" + (r.data.errors || []).map((e) => "• " + escHtml(e)).join("<br>");
  } else {
    msg.className = "msg err";
    msg.textContent = `Erreur ${r.status}: ${r.data.error || "inconnue"}`;
  }
}

// Undo the last publish of the current trip. The server finds the previous
// committed version and commits it forward (no history rewrite); on success we
// reload the trip so the form reflects the restored content, then confirm.
async function revert() {
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
  } else {
    if (saveBtn) saveBtn.disabled = false;
    if (revBtn) revBtn.disabled = false;
    msg.className = "msg err";
    // Server-provided text goes through textContent, never through markup.
    msg.textContent = fmt("pages.revert.fail", { e: r.data.error || `erreur ${r.status}` });
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
