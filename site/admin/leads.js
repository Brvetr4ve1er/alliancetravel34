// site/admin/leads.js — Demandes inbox + minimal CRM.
// SECURITY: lead values come from the PUBLIC insert path (attacker-controlled).
// Every dynamic value is set via textContent / property assignment — never innerHTML.
import { t, fmt, applyI18n } from "./i18n.js";

const COLS = ["created_at", "status", "name", "phone", "city", "trip", "hotel", "date", "room", "adults", "kids", "total_da", "channel", "page", "notes"];
const STATUSES = ["nouveau", "contacté", "conclu"];
let ROWS = [];
let statusFilter = null;
let q = "";

const $id = (id) => document.getElementById(id);
const area = () => $id("area-demandes");

function ago(ts) {
  const min = Math.max(1, Math.round((Date.now() - new Date(ts)) / 60000));
  if (min < 60) return fmt("common.ago.min", { n: min });
  if (min < 1440) return fmt("common.ago.h", { n: Math.round(min / 60) });
  return fmt("common.ago.d", { n: Math.round(min / 1440) });
}

async function cycleStatus(r, chip) {
  const next = STATUSES[(STATUSES.indexOf(r.status || "nouveau") + 1) % STATUSES.length];
  const prev = r.status;
  r.status = next; paintChip(chip, next); // optimistic
  const { error } = await window.AT_ADMIN.supabase.rpc("update_lead_status", { lead_id: r.id, new_status: next });
  if (error) { r.status = prev; paintChip(chip, prev); }
}
function paintChip(chip, status) {
  chip.className = "chip chip--" + (status || "nouveau");
  chip.textContent = t("leads.status." + (status || "nouveau"));
}

function leadCard(r) {
  const card = document.createElement("div"); card.className = "lead-card";
  const top = document.createElement("div"); top.className = "top";
  const chip = document.createElement("button"); paintChip(chip, r.status);
  chip.addEventListener("click", (e) => { e.stopPropagation(); cycleStatus(r, chip); });
  const name = document.createElement("span"); name.className = "name"; name.textContent = r.name || "—";
  const age = document.createElement("span"); age.className = "age"; age.textContent = ago(r.created_at);
  top.append(chip, name, age);
  const meta = document.createElement("div"); meta.className = "meta";
  meta.textContent = [r.city, r.trip, r.hotel, fmt("leads.people", { a: r.adults ?? 0, k: r.kids ?? 0 }),
    r.total_da ? Number(r.total_da).toLocaleString("fr-DZ") + " DA" : null].filter(Boolean).join(" · ");
  const actions = document.createElement("div"); actions.className = "actions";
  if (r.phone) {
    const call = document.createElement("a"); call.className = "btn btn--ghost btn--sm ltr";
    call.href = "tel:" + encodeURIComponent(r.phone); call.textContent = "📞 " + r.phone;
    call.addEventListener("click", (e) => e.stopPropagation());
    const wa = document.createElement("a"); wa.className = "btn btn--sm";
    wa.href = "https://wa.me/" + String(r.phone).replace(/^0/, "213").replace(/\D/g, "");
    wa.target = "_blank"; wa.rel = "noopener"; wa.textContent = t("leads.wa");
    wa.addEventListener("click", (e) => e.stopPropagation());
    actions.append(call, wa);
  }
  card.append(top, meta, actions);
  if (r.notes || r.date || r.room || r.channel || r.page) card.addEventListener("click", () => detail(r));
  return card;
}

function detail(r) {
  const wrap = document.createElement("div"); wrap.className = "card";
  for (const c of COLS) {
    if (r[c] == null || r[c] === "") continue;
    const row = document.createElement("div"); row.className = "meta";
    const label = document.createElement("strong"); label.textContent = c + " : ";
    const val = document.createElement("span"); val.textContent = String(r[c]);
    if (c === "phone" || c === "total_da") val.className = "ltr";
    row.append(label, val); wrap.appendChild(row);
  }
  const close = document.createElement("button"); close.className = "btn btn--ghost btn--block";
  close.textContent = t("leads.close");
  const host = area();
  close.addEventListener("click", () => { wrap.remove(); });
  wrap.appendChild(close);
  host.prepend(wrap);
  wrap.scrollIntoView({ behavior: "smooth", block: "start" });
}

function visible() {
  let rows = ROWS;
  if (statusFilter) rows = rows.filter((r) => (r.status || "nouveau") === statusFilter);
  if (q) rows = rows.filter((r) => COLS.some((c) => String(r[c] ?? "").toLowerCase().includes(q)));
  return rows;
}

function paint() {
  const list = area().querySelector("#leads-list");
  const rows = visible();
  list.replaceChildren(...rows.map(leadCard));
  area().querySelector("#leads-count").textContent = fmt("leads.count", { n: rows.length });
}

function render() {
  const c = area();
  c.innerHTML = `
    <div class="card">
      <div class="row">
        <input id="leads-search" data-i18n-ph="leads.search" />
        <button id="leads-csv" class="btn btn--ghost" style="flex:0" data-i18n="leads.export"></button>
      </div>
      <div class="chiprow" id="leads-filters" style="margin-top:var(--s2)"></div>
      <p id="leads-count" class="msg"></p>
    </div>
    <div id="leads-list" class="area"></div>`;
  applyI18n(c);
  const filters = c.querySelector("#leads-filters");
  const all = document.createElement("button"); all.className = "chip is-on"; all.textContent = t("leads.all");
  all.addEventListener("click", () => { statusFilter = null; markFilters(all); paint(); });
  filters.appendChild(all);
  for (const s of STATUSES) {
    const b = document.createElement("button"); b.className = "chip"; b.textContent = t("leads.status." + s);
    b.addEventListener("click", () => { statusFilter = s; markFilters(b); paint(); });
    filters.appendChild(b);
  }
  function markFilters(on) { filters.querySelectorAll(".chip").forEach((x) => x.classList.toggle("is-on", x === on)); }
  c.querySelector("#leads-search").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); paint(); });
  c.querySelector("#leads-csv").addEventListener("click", () => exportCsv(ROWS));
  paint();
}

function exportCsv(rows) {
  const escC = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => escC(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "demandes.csv"; a.click();
  URL.revokeObjectURL(url);
}

async function load() {
  const c = area();
  c.innerHTML = `<div class="skel"></div>`;
  const { data, error } = await window.AT_ADMIN.supabase
    .from("leads").select("*").order("created_at", { ascending: false });
  if (error) {
    c.innerHTML = "";
    const p = document.createElement("p"); p.className = "msg err"; p.textContent = t("common.error");
    const b = document.createElement("button"); b.className = "btn btn--ghost btn--sm"; b.textContent = t("common.retry");
    b.addEventListener("click", load); c.append(p, b); return;
  }
  ROWS = data || [];
  if (!ROWS.length) { c.innerHTML = ""; const p = document.createElement("p"); p.className = "msg"; p.textContent = t("empty.leads"); c.appendChild(p); return; }
  render();
}

let loaded = false;
document.addEventListener("admin:area", (e) => { if (e.detail === "demandes" && !loaded) { loaded = true; load(); } });
document.addEventListener("admin:lang", () => { if (loaded && ROWS.length) render(); });
