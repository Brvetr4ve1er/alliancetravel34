// site/admin/edit-pages.js — pick a trip, edit high-value fields (+ raw JSON), save.
const SLUGS = ["istanbul", "bali", "tunisie", "vietnam", "azerbaidjan", "kuala-lumpur", "egypte"];
let current = null; // { slug, content, sha }

const el = (id) => document.getElementById(id);
const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const setPath = (o, p, v) => { const k = p.split("."); let x = o; for (const s of k.slice(0, -1)) x = x[s] ?? (x[s] = {}); x[k[k.length - 1]] = v; };
// Escape before interpolating trip content into markup. Browsers decode these
// entities back when you read input/textarea `.value`, so JSON round-trips intact.
const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// [label, json-path, type]
const FIELDS = [
  ["Titre SEO (<title>)", "meta.title", "text"],
  ["Meta description", "meta.description", "textarea"],
  ["Hero — sur-titre", "hero.eyebrow", "text"],
  ["Hero — titre", "hero.titlePre", "text"],
  ["Hero — dates/durée", "hero.date", "text"],
  ["Hero — prix « à partir de »", "hero.priceFrom", "text"],
  ["Hero — aria-label", "hero.aria", "text"],
  ["CTA final — accroche urgence", "finalCta.scarcity", "text"],
];

function fieldInput(label, path, type, val) {
  const input = type === "textarea"
    ? `<textarea data-path="${path}" style="min-height:70px">${escHtml(val)}</textarea>`
    : `<input data-path="${path}" value="${escHtml(val)}" />`;
  return `<div class="field"><label>${escHtml(label)}</label>${input}</div>`;
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

function renderForm(container) {
  const c = current.content;
  container.innerHTML = `
    <div class="row" style="align-items:center;margin-bottom:14px">
      <select id="ep-slug">${SLUGS.map((s) => `<option ${s === current.slug ? "selected" : ""}>${s}</option>`).join("")}</select>
      <span class="spacer"></span>
      <button id="ep-save" class="btn">Publier</button>
    </div>
    <p id="ep-msg" class="msg" role="status" aria-live="polite"></p>
    ${FIELDS.map(([l, p, t]) => fieldInput(l, p, t, getPath(c, p))).join("")}
    ${hotelPriceInputs(c)}
    <details class="adv"><summary>Avancé — JSON brut (tout le reste)</summary>
      <p class="msg">Modifiez avec précaution. La sauvegarde est refusée si le JSON est invalide.</p>
      <textarea id="ep-json">${escHtml(JSON.stringify(c, null, 2))}</textarea>
    </details>`;
  el("ep-slug").addEventListener("change", (e) => loadTrip(e.target.value));
  el("ep-save").addEventListener("click", save);
}

function collectInto(content) {
  // 1. structured fields
  document.querySelectorAll("#tab-pages [data-path]").forEach((inp) => {
    let v = inp.value;
    if (inp.dataset.int) { v = parseInt(v, 10); if (!Number.isFinite(v)) return; }
    setPath(content, inp.dataset.path, v);
  });
  return content;
}

async function loadTrip(slug) {
  const c = el("tab-pages");
  c.innerHTML = `<p class="msg">Chargement de ${slug}…</p>`;
  const r = await window.AT_ADMIN.callApi(`/api/get-trip?slug=${encodeURIComponent(slug)}`);
  if (!r.ok) { c.innerHTML = `<p class="msg err">Erreur: ${r.data.error || r.status}</p>`; return; }
  current = { slug, content: r.data.content, sha: r.data.sha };
  renderForm(c);
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

  msg.className = "msg"; msg.textContent = "Publication…";
  el("ep-save").disabled = true;
  const r = await window.AT_ADMIN.callApi("/api/save-trip", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: current.slug, content, sha: current.sha }),
  });
  el("ep-save").disabled = false;
  if (r.ok) {
    msg.className = "msg ok";
    msg.innerHTML = `Publié ✓ — la page sera à jour dans ~1 minute. ` +
      (r.data.commitUrl ? `<a href="${r.data.commitUrl}" target="_blank" rel="noopener">Voir le commit</a>` : "");
    await loadTrip(current.slug); // refresh SHA for the next save
  } else if (r.status === 422) {
    msg.className = "msg err";
    msg.innerHTML = "Refusé — l'édition casserait la page :<br>" + (r.data.errors || []).map((e) => "• " + e).join("<br>");
  } else {
    msg.className = "msg err";
    msg.textContent = `Erreur ${r.status}: ${r.data.error || "inconnue"}`;
  }
}

let inited = false;
document.addEventListener("admin:tab", (e) => { if (e.detail === "pages" && !inited) { inited = true; loadTrip(SLUGS[0]); } });
