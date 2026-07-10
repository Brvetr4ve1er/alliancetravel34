// site/admin/leads.js — authenticated leads table + search + CSV export.
// SECURITY: lead values come from the PUBLIC insert path (attacker-controlled).
// Every cell is filled with textContent (never innerHTML), so a value like
// "<img src=x onerror=...>" can never execute in the owner's browser.
const COLS = ["created_at", "name", "phone", "city", "trip", "hotel", "date", "room", "adults", "kids", "total_da", "channel", "page", "notes"];
let ROWS = [];

function makeRow(r) {
  const tr = document.createElement("tr");
  for (const c of COLS) {
    const td = document.createElement("td");
    const val = r[c] == null ? "" : String(r[c]);
    td.textContent = val;   // safe: no HTML parsing
    td.title = val;         // .title is a property assignment — also safe
    tr.appendChild(td);
  }
  return tr;
}

function paint(container, rows) {
  const body = container.querySelector("#leads-body");
  body.replaceChildren(...rows.map(makeRow));
  container.querySelector("#leads-count").textContent = `${rows.length} lead(s)`;
}

function render(container, rows) {
  // Static shell only (no lead data interpolated here).
  const head = COLS.map((c) => `<th>${c}</th>`).join("");
  container.innerHTML = `
    <div class="row" style="align-items:center;margin-bottom:12px">
      <input id="leads-search" placeholder="Rechercher (nom, téléphone, voyage…)" />
      <button id="leads-csv" class="btn btn--ghost" style="flex:0">Exporter CSV</button>
      <span id="leads-count" class="who"></span>
    </div>
    <div style="overflow:auto;max-height:70vh"><table><thead><tr>${head}</tr></thead><tbody id="leads-body"></tbody></table></div>`;
  paint(container, rows); // fill rows via textContent
  container.querySelector("#leads-search").addEventListener("input", (e) => filter(container, e.target.value));
  container.querySelector("#leads-csv").addEventListener("click", () => exportCsv(ROWS));
}

function filter(container, q) {
  q = q.trim().toLowerCase();
  const rows = !q ? ROWS : ROWS.filter((r) => COLS.some((c) => String(r[c] ?? "").toLowerCase().includes(q)));
  paint(container, rows);
}

function exportCsv(rows) {
  const escC = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => escC(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  URL.revokeObjectURL(url);
}

async function load() {
  const c = document.getElementById("tab-leads");
  c.innerHTML = `<p class="msg">Chargement des leads…</p>`;
  const { data, error } = await window.AT_ADMIN.supabase
    .from("leads").select("*").order("created_at", { ascending: false });
  if (error) { c.innerHTML = `<p class="msg err">Erreur: ${error.message}</p>`; return; }
  ROWS = data || [];
  if (!ROWS.length) { c.innerHTML = `<p class="msg">Aucun lead pour le moment.</p>`; return; }
  render(c, ROWS);
}

// Load lazily the first time the Leads tab is opened.
let loaded = false;
document.addEventListener("admin:tab", (e) => { if (e.detail === "leads" && !loaded) { loaded = true; load(); } });
