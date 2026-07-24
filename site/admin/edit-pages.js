// site/admin/edit-pages.js — pick a trip, edit high-value fields (+ raw JSON), save.
import { t, applyI18n } from "./i18n.js";
import { icon } from "./icons.js";
import { areaHead } from "./ui.js";

const SLUGS = ["istanbul", "bali", "tunisie", "vietnam", "azerbaidjan", "kuala-lumpur", "egypte"];
let current = null; // { slug, content, sha }

const el = (id) => document.getElementById(id);
const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const setPath = (o, p, v) => { const k = p.split("."); let x = o; for (const s of k.slice(0, -1)) x = x[s] ?? (x[s] = {}); x[k[k.length - 1]] = v; };
// Escape before interpolating trip content into markup. Browsers decode these
// entities back when you read input/textarea `.value`, so JSON round-trips intact.
const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// [label, json-path, type]
//
// Every path here MUST be read by a template in tools/templates/sections/.
// A path the templates ignore is invisible when wrong: getPath returns
// undefined so the input renders blank, and setPath happily *creates* the key
// on save — the owner edits, sees "Publié ✓", and nothing changes. Two fields
// shipped that way ("hero.titlePre", "finalCta.scarcity").
// tools/check-admin-fields.mjs enforces the rule at build time.
const FIELDS = [
  ["Titre SEO (<title>)", "meta.title", "text"],
  ["Meta description", "meta.description", "textarea"],
  ["Hero — sur-titre", "hero.eyebrow", "text"],
  // The H1 is two slots: hero.tpl renders {{hero.h1Pre}}<em>{{hero.h1Em}}</em>.
  ["Hero — titre (1re partie)", "hero.h1Pre", "text"],
  ["Hero — titre (partie colorée)", "hero.h1Em", "text"],
  ["Hero — dates/durée", "hero.date", "text"],
  ["Hero — prix « à partir de »", "hero.priceFrom", "text"],
  ["Hero — aria-label", "hero.aria", "text"],
  // No CTA scarcity field: finalCta.scarcityHtml stores the sentence and its
  // data-i18n binding in one string (plain text on istanbul, a bound <span> on
  // the other six), so a plain input would let an edit silently unbind the
  // translation. Re-add it once the i18n contract lands.
];

function fieldInput(label, path, type, val) {
  // Associate the label with its control. Without for/id a screen reader
  // announces the input as unlabelled, and tapping the label does nothing —
  // the id is derived from the JSON path, which is unique per form.
  const id = "f-" + path.replace(/[^a-zA-Z0-9]+/g, "-");
  const input = type === "textarea"
    ? `<textarea id="${id}" data-path="${path}" style="min-height:70px">${escHtml(val)}</textarea>`
    : `<input id="${id}" data-path="${path}" value="${escHtml(val)}" />`;
  return `<div class="field"><label for="${id}">${escHtml(label)}</label>${input}</div>`;
}

function hotelPriceInputs(content) {
  const hs = getPath(content, "tripData.hotels") || [];
  return hs.map((h, i) => {
    const prices = Object.entries(h.prices || {}).map(([room, p]) =>
      `<div class="field"><label>${escHtml(room)}</label><input data-path="tripData.hotels.${i}.prices.${escHtml(room)}" data-int="1" value="${escHtml(p)}" /></div>`
    ).join("");
    return `<fieldset class="adv"><legend>${escHtml(h.id || ("hôtel " + i))} — tarifs (DA)</legend><div class="row">${prices}</div></fieldset>`;
  }).join("");
}

const GROUPS = [
  { key: "pages.group.seo", test: (p) => p.startsWith("meta.") },
  { key: "pages.group.hero", test: (p) => p.startsWith("hero.") },
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
  const grouped = GROUPS.map((g) => ({ ...g, html: FIELDS.filter(([, p]) => g.test(p)).map(([l, p, ty]) => fieldInput(l, p, ty, getPath(c, p))).join("") }));
  const rest = FIELDS.filter(([, p]) => !GROUPS.some((g) => g.test(p))).map(([l, p, ty]) => fieldInput(l, p, ty, getPath(c, p))).join("");
  container.innerHTML = `
    <button id="ep-back" class="btn btn--ghost btn--sm" data-i18n="pages.back"></button>
    <div class="card">
      <div class="row" style="align-items:center">
        <h2 style="margin:0">${escHtml(current.slug)}</h2>
        <span class="spacer"></span>
        <button id="ep-revert" class="btn btn--ghost btn--sm ep-undo" type="button">Annuler la dernière publication</button>
        <button id="ep-save" class="btn" data-i18n="pages.publish"></button>
      </div>
      <p id="ep-msg" class="msg" role="status" aria-live="polite"></p>
      ${grouped.map((g) => `<fieldset class="group"><legend>${escHtml(t(g.key))}</legend>${g.html}</fieldset>`).join("")}
      ${rest}
      <fieldset class="group"><legend>${escHtml(t("pages.group.prices"))}</legend>${hotelPriceInputs(c)}</fieldset>
      <details class="adv"><summary data-i18n="pages.advanced"></summary>
        <p class="msg" data-i18n="pages.advanced.warn"></p>
        <textarea id="ep-json">${escHtml(JSON.stringify(c, null, 2))}</textarea>
      </details>
    </div>`;
  applyI18n(container);
  // Icons go in after innerHTML: icon() builds DOM nodes, not markup strings.
  const back = container.querySelector("#ep-back");
  back.prepend(icon("back", { size: 16 }));
  container.querySelector("#ep-save").prepend(icon("send", { size: 17 }));
  container.querySelector("#ep-revert").prepend(icon("back", { size: 16 }));
  const legendIcon = { "pages.group.seo": "seo", "pages.group.hero": "sparkles", "pages.group.prices": "hotel" };
  container.querySelectorAll("fieldset.group > legend").forEach((lg) => {
    const key = Object.keys(legendIcon).find((k) => t(k) === lg.textContent.trim());
    lg.prepend(icon(legendIcon[key] || "file", { size: 16 }));
  });
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
  // 1. structured fields
  document.querySelectorAll("#area-pages [data-path]").forEach((inp) => {
    let v = inp.value;
    if (inp.dataset.int) { v = parseInt(v, 10); if (!Number.isFinite(v)) return; }
    setPath(content, inp.dataset.path, v);
  });
  return content;
}

async function loadTrip(slug) {
  const c = document.getElementById("area-pages");
  c.innerHTML = `<p class="msg">Chargement de ${slug}…</p>`;
  const r = await window.AT_ADMIN.callApi(`/api/get-trip?slug=${encodeURIComponent(slug)}`);
  if (!r.ok) { c.innerHTML = `<p class="msg err">Erreur: ${r.data.error || r.status}</p>`; return; }
  current = { slug, content: r.data.content, sha: r.data.sha };
  renderEditor(c);
}

async function save() {
  const msg = el("ep-msg");
  // Base = the raw-JSON panel (authoritative for untouched structure), then overlay structured fields.
  let content;
  try { content = JSON.parse(el("ep-json").value); }
  catch (e) { msg.className = "msg err"; msg.textContent = "JSON invalide: " + e.message; return; }
  collectInto(content);
  // keep the JSON panel in sync so the user sees exactly what will be saved
  el("ep-json").value = JSON.stringify(content, null, 2);

  msg.className = "msg"; msg.textContent = t("pages.publishing");
  el("ep-save").disabled = true;
  const r = await window.AT_ADMIN.callApi("/api/save-trip", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: current.slug, content, sha: current.sha }),
  });
  el("ep-save").disabled = false;
  if (r.ok) {
    msg.className = "msg ok";
    msg.textContent = t("pages.published");
    if (r.data.commitUrl) {
      const a = document.createElement("a");
      a.href = r.data.commitUrl; a.textContent = t("pages.viewcommit"); a.target = "_blank"; a.rel = "noopener";
      msg.append(" ", a);
    }
    // Re-sync BOTH the SHA and the content, without wiping the form + this
    // confirmation (a full loadTrip() would re-render the panel and hide the
    // "Publié ✓"). Refreshing only the SHA used to leave the previous document
    // in memory and armed: the next save would re-POST that stale body, and the
    // 409 retry re-PUTs it against a fresh SHA — silently reverting whatever
    // anyone else published in between.
    const g = await window.AT_ADMIN.callApi(`/api/get-trip?slug=${encodeURIComponent(current.slug)}`);
    if (g.ok) {
      current.sha = g.data.sha;
      current.content = g.data.content;
      el("ep-json").value = JSON.stringify(g.data.content, null, 2);
    }
  } else if (r.status === 422) {
    msg.className = "msg err";
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
  if (!confirm("Annuler la dernière publication et restaurer la version précédente ?\n"
    + "Cette action crée un nouveau commit et remplacera les modifications non enregistrées de cette page.")) return;

  msg.className = "msg"; msg.textContent = "Annulation en cours…";
  const saveBtn = el("ep-save"), revBtn = el("ep-revert");
  if (saveBtn) saveBtn.disabled = true;
  if (revBtn) revBtn.disabled = true;

  const r = await window.AT_ADMIN.callApi("/api/revert-trip", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: current.slug }),
  });

  if (r.ok) {
    // Re-render the editor with the restored version, then show the confirmation
    // (loadTrip rebuilds #area-pages, so the message must be set afterwards).
    const slug = current.slug;
    const commitUrl = r.data.commitUrl;
    await loadTrip(slug);
    const m2 = el("ep-msg");
    if (m2) {
      m2.className = "msg ok";
      m2.textContent = "Dernière publication annulée — version précédente restaurée.";
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
    // Escape server-provided text before it reaches innerHTML.
    msg.innerHTML = "Annulation impossible : " + escHtml(r.data.error || `erreur ${r.status}`);
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
