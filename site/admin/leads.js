// site/admin/leads.js — Demandes: browse leads, group repeat clients, triage,
// and work a full record without leaving the screen.
// SECURITY: lead values come from the PUBLIC insert path (attacker-controlled).
// Every dynamic value is set via textContent / property assignment — never
// innerHTML. The one innerHTML use below is a single static shell template
// authored here, with zero lead data interpolated into it.
import { t, fmt, applyI18n } from "./i18n.js";
import { icon } from "./icons.js";
import { emptyState } from "./illus.js";
import { areaHead, help } from "./ui.js";

const COLS = ["created_at", "status", "name", "phone", "city", "trip", "hotel", "date", "room", "adults", "kids", "total_da", "channel", "wa_destination", "page", "notes"];
const STATUSES = ["nouveau", "contacté", "conclu"];

// ── State ──────────────────────────────────────────────────────────────
let ROWS = [];
let mode = "list";           // "list" | "clients"
let sortMode = "recent";     // "recent" | "value" | "stale"
let statusFilter = null;     // one of STATUSES | null
let tripFilter = null;
let cityFilter = null;
let periodFilter = null;     // 7 | 30 | null (days)
let q = "";
let openLeadId = null;       // single-record detail currently shown in the panel
let openClientKey = null;    // client group currently drilled into (clients mode)

const $id = (id) => document.getElementById(id);
const area = () => $id("area-demandes");
const normStatus = (s) => (STATUSES.includes(s) ? s : "nouveau");

// ── Small formatting helpers ──────────────────────────────────────────
function ago(ts) {
  const min = Math.max(1, Math.round((Date.now() - new Date(ts)) / 60000));
  if (min < 60) return fmt("common.ago.min", { n: min });
  if (min < 1440) return fmt("common.ago.h", { n: Math.round(min / 60) });
  return fmt("common.ago.d", { n: Math.round(min / 1440) });
}
function money(v) {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("fr-DZ") + " DA";
}
function formatDate(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(document.documentElement.lang === "ar" ? "ar-DZ" : "fr-DZ");
  }
  return String(v);
}
function channelLabel(v) {
  if (v === "whatsapp") return t("leads.channel.whatsapp");
  if (v === "email") return t("leads.channel.email");
  if (v === "copy") return t("leads.channel.copy");
  return v || null;
}
function waHref(phone) {
  return "https://wa.me/" + String(phone).replace(/^0/, "213").replace(/\D/g, "");
}
// Same normalisation as the WhatsApp link: it is how two spellings of the
// same Algerian number ("0555…" and "+213555…") collapse into one client.
function phoneKey(phone) {
  if (!phone) return "";
  return String(phone).replace(/^0/, "213").replace(/\D/g, "");
}
function ltrSpan(text) {
  const s = document.createElement("span"); s.className = "ltr"; s.textContent = text; return s;
}
// A label + its ltr-isolated value as one inline unit, e.g. "Valeur cumulée 450 000 DA" —
// keeps the digits from being reordered without forcing the label's own words into ltr.
function labelValue(labelKey, value) {
  const sp = document.createElement("span");
  sp.append(t(labelKey) + " ", ltrSpan(value));
  return sp;
}
function joinBits(host, bits) {
  bits.forEach((n, i) => { if (i) host.append(" · "); host.append(n); });
}

// ── Data shaping: filter, sort, group ─────────────────────────────────
function filteredRows() {
  let rows = ROWS;
  if (statusFilter) rows = rows.filter((r) => normStatus(r.status) === statusFilter);
  if (tripFilter) rows = rows.filter((r) => (r.trip || "") === tripFilter);
  if (cityFilter) rows = rows.filter((r) => (r.city || "") === cityFilter);
  if (periodFilter) {
    const since = new Date(); since.setDate(since.getDate() - periodFilter);
    rows = rows.filter((r) => new Date(r.created_at) >= since);
  }
  if (q) rows = rows.filter((r) => COLS.some((c) => String(r[c] ?? "").toLowerCase().includes(q)));
  return rows;
}
function sortRows(rows, sm) {
  const arr = rows.slice();
  if (sm === "value") arr.sort((a, b) => (Number(b.total_da) || 0) - (Number(a.total_da) || 0));
  else if (sm === "stale") arr.sort((a, b) => {
    const aDone = normStatus(a.status) === "conclu", bDone = normStatus(b.status) === "conclu";
    if (aDone !== bDone) return aDone ? 1 : -1; // unresolved leads first
    return new Date(a.created_at) - new Date(b.created_at); // oldest of those first
  });
  else arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return arr;
}
function distinctValues(field) {
  const set = new Set();
  for (const r of ROWS) if (r[field]) set.add(String(r[field]));
  return [...set].sort((a, b) => a.localeCompare(b, document.documentElement.lang || "fr"));
}
// Every submission with the same phone number becomes one client entry with
// a leads[] history, a summed value, and the identity of its latest inquiry.
function groupClients(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = phoneKey(r.phone) || ("id:" + r.id);
    let c = map.get(key);
    if (!c) {
      c = { key, name: r.name || "", phone: r.phone || "", city: r.city || "",
        leads: [], totalValue: 0, latestCreated: r.created_at, latestStatus: normStatus(r.status),
        anyOpen: false, oldestOpenCreated: null };
      map.set(key, c);
    }
    c.leads.push(r);
    c.totalValue += Number(r.total_da) || 0;
    if (new Date(r.created_at) > new Date(c.latestCreated)) {
      c.latestCreated = r.created_at; c.latestStatus = normStatus(r.status);
      c.name = r.name || c.name; c.phone = r.phone || c.phone; c.city = r.city || c.city;
    }
    if (normStatus(r.status) !== "conclu") {
      c.anyOpen = true;
      if (!c.oldestOpenCreated || new Date(r.created_at) < new Date(c.oldestOpenCreated)) c.oldestOpenCreated = r.created_at;
    }
  }
  for (const c of map.values()) c.leads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return [...map.values()];
}
function sortClients(clients, sm) {
  const arr = clients.slice();
  if (sm === "value") arr.sort((a, b) => b.totalValue - a.totalValue);
  else if (sm === "stale") arr.sort((a, b) => {
    if (a.anyOpen !== b.anyOpen) return a.anyOpen ? -1 : 1;
    const at = new Date(a.anyOpen ? a.oldestOpenCreated : a.latestCreated);
    const bt = new Date(b.anyOpen ? b.oldestOpenCreated : b.latestCreated);
    return at - bt;
  });
  else arr.sort((a, b) => new Date(b.latestCreated) - new Date(a.latestCreated));
  return arr;
}
// Pipeline: always computed from ALL leads, never the active filters — the
// owner's "how much business is on the table" number must not wobble
// because a search box happens to be full.
function statusTotals() {
  const m = new Map(STATUSES.map((s) => [s, { count: 0, da: 0, byTrip: new Map() }]));
  for (const r of ROWS) {
    const b = m.get(normStatus(r.status));
    b.count++;
    const v = Number(r.total_da) || 0;
    b.da += v;
    const trip = r.trip || "—";
    b.byTrip.set(trip, (b.byTrip.get(trip) || 0) + v);
  }
  return m;
}

// ── Status mutation (shared by the list chip and the panel toggle) ────
async function applyStatus(r, next) {
  const prev = r.status;
  r.status = next; syncStatusUI(r);
  const { error } = await window.AT_ADMIN.supabase.rpc("update_lead_status", { lead_id: r.id, new_status: next });
  if (error) { r.status = prev; syncStatusUI(r); }
}
function cycleStatus(r) {
  const next = STATUSES[(STATUSES.indexOf(normStatus(r.status)) + 1) % STATUSES.length];
  applyStatus(r, next);
}
// Repaints every on-screen control tied to this lead's status: the pipeline
// tiles, its card in the browse list (if visible), and the detail panel's
// toggle (if this same lead is open) — without rebuilding the panel, which
// would blow away an in-progress, unsaved note.
function syncStatusUI(r) {
  renderPipeline();
  const card = [...area().querySelectorAll(".lead-card[data-lead-id]")].find((c) => c.dataset.leadId === String(r.id));
  if (card) {
    card.className = "lead-card lead-card--" + normStatus(r.status);
    const chip = card.querySelector(".statuschip");
    if (chip) paintStatusChip(chip, r.status);
  }
  const group = area().querySelector(".status-toggle");
  if (group && group.dataset.leadId === String(r.id)) {
    group.querySelectorAll(".chip").forEach((c, i) => {
      const on = normStatus(r.status) === STATUSES[i];
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-pressed", String(on));
    });
  }
}
function paintStatusChip(chip, status) {
  chip.className = "chip statuschip chip--" + normStatus(status);
  chip.textContent = t("leads.status." + normStatus(status));
}

// ── Contact actions (call / WhatsApp / copy) ───────────────────────────
async function copyPhone(phone, feedbackEl) {
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(phone);
      ok = true;
    } else {
      const ta = document.createElement("textarea");
      ta.value = phone; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
  } catch { ok = false; }
  if (feedbackEl) {
    feedbackEl.className = "msg " + (ok ? "ok" : "err");
    feedbackEl.textContent = ok ? t("leads.copied") : t("common.error");
    setTimeout(() => { feedbackEl.textContent = ""; feedbackEl.className = "msg"; }, 2200);
  }
}
// Compact pair used inside a browse card: call + WhatsApp only. Copy lives in
// the fuller detail panel — three buttons on every card would crowd the list.
function appendContactActions(container, phone) {
  if (!phone) return;
  const call = document.createElement("a"); call.className = "btn btn--ghost btn--sm";
  call.href = "tel:" + encodeURIComponent(phone);
  call.setAttribute("aria-label", t("leads.call"));
  call.append(icon("phone", { size: 16 }), ltrSpan(phone));
  const wa = document.createElement("a"); wa.className = "btn btn--sm";
  wa.href = waHref(phone); wa.target = "_blank"; wa.rel = "noopener";
  const wt = document.createElement("span"); wt.textContent = t("leads.wa");
  wa.append(icon("whatsapp", { size: 16 }), wt);
  container.append(call, wa);
}
// Full trio for the detail panel: call, WhatsApp, copy.
function panelActions(phone, feedbackEl) {
  const row = document.createElement("div"); row.className = "row";
  if (!phone) return row;
  const call = document.createElement("a"); call.className = "btn btn--ghost";
  call.href = "tel:" + encodeURIComponent(phone);
  call.append(icon("phone", { size: 17 }), ltrSpan(phone));
  const wa = document.createElement("a"); wa.className = "btn";
  wa.href = waHref(phone); wa.target = "_blank"; wa.rel = "noopener";
  const wt = document.createElement("span"); wt.textContent = t("leads.wa");
  wa.append(icon("whatsapp", { size: 17 }), wt);
  const cp = document.createElement("button"); cp.type = "button"; cp.className = "btn btn--ghost";
  const ct = document.createElement("span"); ct.textContent = t("leads.copy");
  cp.append(icon("copy", { size: 17 }), ct);
  cp.addEventListener("click", () => copyPhone(phone, feedbackEl));
  row.append(call, wa, cp);
  return row;
}

// ── Notes ───────────────────────────────────────────────────────────────
async function saveNotes(r, ta, btn, msg) {
  const val = ta.value.slice(0, 2000);
  btn.disabled = true;
  msg.className = "msg"; msg.textContent = t("common.loading");
  const { error } = await window.AT_ADMIN.supabase.rpc("update_lead_notes", { lead_id: r.id, new_notes: val });
  btn.disabled = false;
  if (error) { msg.className = "msg err"; msg.textContent = t("common.error"); return; }
  r.notes = val;
  msg.className = "msg ok"; msg.textContent = t("leads.notes.saved");
}

// ── Browse cards ───────────────────────────────────────────────────────
function metaLine(r) {
  const meta = document.createElement("span"); meta.className = "meta";
  const bits = [];
  if (r.city) bits.push(document.createTextNode(r.city));
  if (r.trip) bits.push(document.createTextNode(r.trip));
  if (r.hotel) bits.push(document.createTextNode(r.hotel));
  // Anonymous WhatsApp-click leads carry no city/trip/hotel — show the page so
  // the owner still sees where the enquiry came from.
  if (!r.city && !r.trip && !r.hotel && r.page) bits.push(document.createTextNode(r.page));
  if (r.adults != null || r.kids != null) bits.push(ltrSpan(fmt("leads.people", { a: r.adults ?? 0, k: r.kids ?? 0 })));
  const m = money(r.total_da);
  if (m) bits.push(ltrSpan(m));
  joinBits(meta, bits);
  return meta;
}
function leadCard(r) {
  const card = document.createElement("div");
  card.className = "lead-card lead-card--" + normStatus(r.status);
  card.dataset.leadId = String(r.id);

  const top = document.createElement("div"); top.className = "top";
  const chip = document.createElement("button"); chip.type = "button";
  paintStatusChip(chip, r.status);
  chip.setAttribute("aria-label", t("leads.status." + normStatus(r.status)));
  chip.addEventListener("click", () => cycleStatus(r));
  const name = document.createElement("span"); name.className = "name"; name.textContent = r.name || (r.phone ? "—" : t("leads.anon"));
  const age = document.createElement("span"); age.className = "age"; age.textContent = ago(r.created_at);
  top.append(chip, name, age);

  const open = document.createElement("button"); open.type = "button"; open.className = "lead-card__open";
  open.appendChild(metaLine(r));
  open.addEventListener("click", () => { openLeadId = r.id; renderPanel(); applyPanelVisibility(); });

  const actions = document.createElement("div"); actions.className = "actions";
  appendContactActions(actions, r.phone);

  card.append(top, open, actions);
  return card;
}
function clientCard(c) {
  const card = document.createElement("div");
  card.className = "lead-card lead-card--" + normStatus(c.latestStatus);

  const top = document.createElement("div"); top.className = "top";
  const chip = document.createElement("span"); // read-only: a client can have several statuses at once
  chip.className = "chip chip--" + normStatus(c.latestStatus);
  chip.textContent = t("leads.status." + normStatus(c.latestStatus));
  const name = document.createElement("span"); name.className = "name"; name.textContent = c.name || c.phone || "—";
  const age = document.createElement("span"); age.className = "age"; age.textContent = ago(c.latestCreated);
  top.append(chip, name, age);

  const open = document.createElement("button"); open.type = "button"; open.className = "lead-card__open";
  const meta = document.createElement("span"); meta.className = "meta";
  const bits = [];
  if (c.city) bits.push(document.createTextNode(c.city));
  bits.push(document.createTextNode(fmt("leads.count", { n: c.leads.length })));
  const mv = money(c.totalValue);
  if (mv) bits.push(labelValue("leads.client.total", mv));
  joinBits(meta, bits);
  open.appendChild(meta);
  open.addEventListener("click", () => { openClientKey = c.key; openLeadId = null; renderPanel(); applyPanelVisibility(); });

  const actions = document.createElement("div"); actions.className = "actions";
  appendContactActions(actions, c.phone);

  card.append(top, open, actions);
  return card;
}

// ── Detail panel ───────────────────────────────────────────────────────
function backButton(onClick) {
  const b = document.createElement("button"); b.type = "button"; b.className = "btn btn--ghost btn--sm";
  const s = document.createElement("span"); s.textContent = t("leads.back");
  b.append(icon("back", { size: 16 }), s);
  b.addEventListener("click", onClick);
  return b;
}
function statusToggle(r) {
  const wrap = document.createElement("div"); wrap.className = "chiprow status-toggle";
  wrap.dataset.leadId = String(r.id);
  wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", t("leads.status.group"));
  for (const s of STATUSES) {
    const b = document.createElement("button"); b.type = "button";
    const on = normStatus(r.status) === s;
    b.className = "chip chip--" + s + (on ? " is-on" : "");
    b.textContent = t("leads.status." + s);
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => applyStatus(r, s));
    wrap.appendChild(b);
  }
  return wrap;
}
function addDetailRow(dl, labelKey, value, opts = {}) {
  if (value == null || value === "") return;
  const dt = document.createElement("dt"); dt.textContent = t(labelKey);
  const dd = document.createElement("dd");
  if (opts.ltr) dd.appendChild(ltrSpan(value)); else dd.textContent = value;
  dl.append(dt, dd);
}
function leadDetailPanel(r, backTo) {
  const wrap = document.createElement("div");
  const head = document.createElement("h2");
  head.append(backButton(() => {
    openLeadId = null;
    if (backTo !== "client") openClientKey = null;
    renderPanel(); applyPanelVisibility();
  }));
  const name = document.createElement("span"); name.textContent = r.name || (r.phone ? "—" : t("leads.anon"));
  head.append(name);
  wrap.appendChild(head);

  wrap.appendChild(statusToggle(r));

  const feedback = document.createElement("p"); feedback.className = "msg"; feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite");
  wrap.appendChild(panelActions(r.phone, feedback));
  wrap.appendChild(feedback);

  const dl = document.createElement("dl"); dl.className = "detail-grid";
  addDetailRow(dl, "leads.field.city", r.city);
  addDetailRow(dl, "leads.field.trip", r.trip);
  addDetailRow(dl, "leads.field.hotel", r.hotel);
  addDetailRow(dl, "leads.field.date", formatDate(r.date), { ltr: true });
  addDetailRow(dl, "leads.field.room", r.room);
  if (r.adults != null || r.kids != null) addDetailRow(dl, "leads.field.people", fmt("leads.people", { a: r.adults ?? 0, k: r.kids ?? 0 }), { ltr: true });
  const m = money(r.total_da);
  if (m) addDetailRow(dl, "leads.total", m, { ltr: true });
  addDetailRow(dl, "leads.field.channel", channelLabel(r.channel));
  addDetailRow(dl, "leads.field.page", r.page);
  if (r.created_at) {
    const dt = document.createElement("dt"); dt.textContent = t("leads.field.received");
    const dd = document.createElement("dd");
    const dateStr = new Date(r.created_at).toLocaleString(document.documentElement.lang === "ar" ? "ar-DZ" : "fr-DZ");
    dd.append(ltrSpan(dateStr), " · " + ago(r.created_at));
    dl.append(dt, dd);
  }
  wrap.appendChild(dl);

  const notesField = document.createElement("div"); notesField.className = "field";
  const label = document.createElement("label"); label.textContent = t("leads.notes");
  const ta = document.createElement("textarea"); ta.className = "notes"; ta.maxLength = 2000;
  ta.value = r.notes || ""; ta.placeholder = t("leads.notes.placeholder");
  const notesMsg = document.createElement("p"); notesMsg.className = "msg"; notesMsg.setAttribute("role", "status"); notesMsg.setAttribute("aria-live", "polite");
  const saveBtn = document.createElement("button"); saveBtn.type = "button"; saveBtn.className = "btn btn--sm";
  saveBtn.textContent = t("leads.notes.save");
  saveBtn.addEventListener("click", () => saveNotes(r, ta, saveBtn, notesMsg));
  notesField.append(label, ta, saveBtn, notesMsg);
  wrap.appendChild(notesField);

  return wrap;
}
function inquiryRow(r) {
  const b = document.createElement("button"); b.type = "button"; b.className = "pagecard";
  const title = document.createElement("div"); title.className = "t"; title.textContent = r.trip || "—";
  const badge = document.createElement("span");
  badge.className = "chip chip--" + normStatus(r.status);
  badge.textContent = t("leads.status." + normStatus(r.status));
  const m = document.createElement("div"); m.className = "m";
  m.append(ago(r.created_at));
  const mv = money(r.total_da);
  if (mv) m.append(" · ", ltrSpan(mv));
  b.append(title, badge, m);
  b.addEventListener("click", () => { openLeadId = r.id; renderPanel(); applyPanelVisibility(); });
  return b;
}
function clientDetailPanel(c) {
  const wrap = document.createElement("div");
  const head = document.createElement("h2");
  head.append(backButton(() => { openClientKey = null; openLeadId = null; renderPanel(); applyPanelVisibility(); }));
  const name = document.createElement("span"); name.textContent = c.name || c.phone || "—";
  head.append(name);
  wrap.appendChild(head);

  const metaP = document.createElement("p"); metaP.className = "msg";
  const bits = [];
  if (c.city) bits.push(document.createTextNode(c.city));
  bits.push(document.createTextNode(fmt("leads.count", { n: c.leads.length })));
  const mv = money(c.totalValue);
  if (mv) bits.push(labelValue("leads.client.total", mv));
  joinBits(metaP, bits);
  wrap.appendChild(metaP);

  const feedback = document.createElement("p"); feedback.className = "msg"; feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite");
  wrap.appendChild(panelActions(c.phone, feedback));
  wrap.appendChild(feedback);

  const histHead = document.createElement("p"); histHead.className = "msg";
  const strong = document.createElement("strong"); strong.textContent = t("leads.client.history");
  histHead.append(strong);
  wrap.appendChild(histHead);

  const list = document.createElement("div"); list.className = "stack";
  for (const lead of c.leads) list.appendChild(inquiryRow(lead));
  wrap.appendChild(list);

  return wrap;
}
function renderPanel() {
  const panel = area().querySelector("#leads-panel");
  if (!panel) return;
  panel.replaceChildren();
  if (openLeadId) {
    const r = ROWS.find((x) => x.id === openLeadId);
    if (!r) { openLeadId = null; renderPanel(); return; }
    panel.appendChild(leadDetailPanel(r, openClientKey ? "client" : "list"));
    return;
  }
  if (openClientKey) {
    const c = groupClients(ROWS).find((g) => g.key === openClientKey);
    if (!c) { openClientKey = null; renderPanel(); return; }
    panel.appendChild(clientDetailPanel(c));
    return;
  }
  panel.appendChild(emptyState("welcome", { title: t("leads.panel.placeholder"), body: t("leads.panel.placeholder.body") }));
}

// ── Pipeline (money) ───────────────────────────────────────────────────
const PIPELINE_ICON = { nouveau: "sparkles", "contacté": "whatsapp", conclu: "check" };
function pipelineTile(status, data) {
  const tile = document.createElement("button"); tile.type = "button";
  tile.className = "kpi" + (status === "conclu" ? " kpi--gold" : "");
  const head = document.createElement("div"); head.className = "kpi__head";
  const ib = document.createElement("span"); ib.className = "kpi__icon";
  ib.append(icon(PIPELINE_ICON[status] || "chart", { size: 20 }));
  const h = document.createElement("h3"); h.textContent = t("leads.status." + status);
  head.append(ib, h);
  const n = document.createElement("div"); n.className = "n ltr"; n.textContent = money(data.da) || "0 DA";
  const sub = document.createElement("p"); sub.className = "msg"; sub.style.margin = "2px 0 0"; sub.textContent = fmt("leads.count", { n: data.count });
  tile.append(head, n, sub);
  const bd = document.createElement("div"); bd.className = "bd"; bd.hidden = true;
  const topTrips = [...data.byTrip.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [trip, v] of topTrips) {
    const row = document.createElement("div");
    const tn = document.createElement("span"); tn.textContent = trip;
    row.append(tn, ltrSpan(money(v) || "0 DA"));
    bd.appendChild(row);
  }
  tile.appendChild(bd);
  tile.addEventListener("click", () => { bd.hidden = !bd.hidden; });
  return tile;
}
function renderPipeline() {
  const host = area().querySelector("#leads-pipeline");
  if (!host) return;
  const totals = statusTotals();
  host.replaceChildren(...STATUSES.map((s) => pipelineTile(s, totals.get(s))));
}

// ── Controls (search, sort, filters, view toggle) ──────────────────────
function fillSelect(sel, values, current, allLabelKey) {
  sel.replaceChildren();
  const optAll = document.createElement("option"); optAll.value = ""; optAll.textContent = t(allLabelKey);
  sel.appendChild(optAll);
  for (const v of values) {
    const o = document.createElement("option"); o.value = v; o.textContent = v;
    sel.appendChild(o);
  }
  sel.value = current || "";
}
function fillSortSelect(sel) {
  sel.replaceChildren();
  for (const [val, key] of [["recent", "leads.sort.recent"], ["stale", "leads.sort.stale"], ["value", "leads.sort.value"]]) {
    const o = document.createElement("option"); o.value = val; o.textContent = t(key);
    sel.appendChild(o);
  }
  sel.value = sortMode;
}
function fillPeriodSelect(sel) {
  sel.replaceChildren();
  for (const [val, key] of [["", "leads.filter.period.all"], ["7", "leads.filter.period.7"], ["30", "leads.filter.period.30"]]) {
    const o = document.createElement("option"); o.value = val; o.textContent = t(key);
    sel.appendChild(o);
  }
  sel.value = periodFilter ? String(periodFilter) : "";
}
function buildViewToggle(container) {
  container.replaceChildren();
  container.setAttribute("aria-label", t("leads.view.label"));
  for (const [val, key] of [["list", "leads.mode.list"], ["clients", "leads.mode.clients"]]) {
    const b = document.createElement("button"); b.type = "button";
    const on = mode === val;
    b.className = "chip chip--all" + (on ? " is-on" : "");
    b.textContent = t(key);
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => {
      if (mode === val) return;
      mode = val; openLeadId = null; openClientKey = null;
      buildViewToggle(container); paint(); applyPanelVisibility();
    });
    container.appendChild(b);
  }
}
function buildStatusFilterChips(container) {
  container.replaceChildren();
  container.setAttribute("aria-label", t("leads.all"));
  const all = document.createElement("button"); all.type = "button";
  all.className = "chip chip--all" + (!statusFilter ? " is-on" : "");
  all.textContent = t("leads.all");
  all.setAttribute("aria-pressed", String(!statusFilter));
  all.addEventListener("click", () => { statusFilter = null; buildStatusFilterChips(container); paint(); });
  container.appendChild(all);
  for (const s of STATUSES) {
    const b = document.createElement("button"); b.type = "button";
    const on = statusFilter === s;
    b.className = "chip" + (on ? " is-on" : "");
    b.textContent = t("leads.status." + s);
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", () => { statusFilter = s; buildStatusFilterChips(container); paint(); });
    container.appendChild(b);
  }
}

// ── Paint (data-driven refresh, no shell rebuild) ──────────────────────
function noResultsBlock() {
  const wrap = document.createElement("div"); wrap.className = "card";
  const h = document.createElement("p"); h.className = "empty__title"; h.style.margin = "0 0 4px"; h.textContent = t("leads.noresults.title");
  const body = document.createElement("p"); body.className = "msg"; body.textContent = t("leads.noresults.body");
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "btn btn--ghost btn--sm"; btn.textContent = t("leads.reset");
  btn.addEventListener("click", () => { statusFilter = null; tripFilter = null; cityFilter = null; periodFilter = null; q = ""; render(); });
  wrap.append(h, body, btn);
  return wrap;
}
function renderBrowse(filtered) {
  const browse = area().querySelector("#leads-browse");
  if (!browse) return;
  if (!filtered.length) { browse.replaceChildren(noResultsBlock()); return; }
  if (mode === "clients") browse.replaceChildren(...sortClients(groupClients(filtered), sortMode).map(clientCard));
  else browse.replaceChildren(...sortRows(filtered, sortMode).map(leadCard));
}
function paint() {
  const filtered = filteredRows();
  renderBrowse(filtered);
  renderPanel();
  const count = area().querySelector("#leads-count");
  if (count) count.textContent = fmt("leads.count", { n: filtered.length });
}

// Mobile shows either the browse list or the open panel, never both at once
// (no room); desktop keeps them side by side, panel sticky.
const mqDesktop = window.matchMedia("(min-width: 900px)");
function applyPanelVisibility() {
  const browse = area().querySelector("#leads-browse");
  const panel = area().querySelector("#leads-panel");
  if (!browse || !panel) return;
  const open = !!(openLeadId || openClientKey);
  const desktop = mqDesktop.matches;
  browse.hidden = !desktop && open;
  panel.hidden = !desktop && !open;
  if (!desktop && open) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
mqDesktop.addEventListener("change", () => { if (loaded && ROWS.length) applyPanelVisibility(); });

function exportCsv(rows) {
  const escC = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => escC(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "demandes.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Shell ──────────────────────────────────────────────────────────────
function render() {
  const c = area();
  // Static shell only — no lead data is interpolated here; every dynamic
  // value below is attached afterwards via textContent / property assignment.
  c.innerHTML = `
    <div class="card">
      <div class="row">
        <input id="leads-search" type="search" data-i18n-ph="leads.search" />
        <button id="leads-csv" class="btn btn--ghost" style="flex:0"><span data-i18n="leads.export"></span></button>
      </div>
      <div class="chiprow" id="leads-view" role="group" style="margin-top:var(--s3)"></div>
      <div class="row" style="margin-top:var(--s2)">
        <select id="leads-sort"></select>
        <select id="leads-trip"></select>
        <select id="leads-city"></select>
        <select id="leads-period"></select>
      </div>
      <div class="chiprow" id="leads-filters" role="group" style="margin-top:var(--s2)"></div>
      <p id="leads-count" class="msg" role="status" aria-live="polite"></p>
    </div>
    <div class="rowline"><strong data-i18n="leads.pipeline.title"></strong></div>
    <div class="kpis" id="leads-pipeline"></div>
    <div class="leads-split" id="leads-split">
      <div class="leads-browse" id="leads-browse"></div>
      <div class="leads-panel card" id="leads-panel" hidden></div>
    </div>`;
  c.prepend(areaHead("inbox", "nav.leads", "demandes.intro"));
  applyI18n(c);

  c.querySelector("#leads-csv").prepend(icon("download", { size: 17 }));
  const search = c.querySelector("#leads-search");
  search.setAttribute("aria-label", t("leads.search"));
  search.value = q;
  search.addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); paint(); });

  c.querySelector(".rowline").appendChild(help("leads.pipeline.help"));

  buildViewToggle(c.querySelector("#leads-view"));
  buildStatusFilterChips(c.querySelector("#leads-filters"));

  const sortSel = c.querySelector("#leads-sort");
  fillSortSelect(sortSel);
  sortSel.setAttribute("aria-label", t("leads.sort.label"));
  sortSel.addEventListener("change", () => { sortMode = sortSel.value; paint(); });

  const tripSel = c.querySelector("#leads-trip");
  fillSelect(tripSel, distinctValues("trip"), tripFilter, "leads.filter.trip.all");
  tripSel.setAttribute("aria-label", t("leads.filter.trip.label"));
  tripSel.addEventListener("change", () => { tripFilter = tripSel.value || null; paint(); });

  const citySel = c.querySelector("#leads-city");
  fillSelect(citySel, distinctValues("city"), cityFilter, "leads.filter.city.all");
  citySel.setAttribute("aria-label", t("leads.filter.city.label"));
  citySel.addEventListener("change", () => { cityFilter = citySel.value || null; paint(); });

  const periodSel = c.querySelector("#leads-period");
  fillPeriodSelect(periodSel);
  periodSel.setAttribute("aria-label", t("leads.filter.period.label"));
  periodSel.addEventListener("change", () => { periodFilter = periodSel.value ? Number(periodSel.value) : null; paint(); });

  c.querySelector("#leads-csv").addEventListener("click", () => exportCsv(sortRows(filteredRows(), sortMode)));

  renderPipeline();
  paint();
  applyPanelVisibility();
}

async function load() {
  const c = area();
  c.innerHTML = `<div class="skel"></div>`;
  const { data, error } = await window.AT_ADMIN.supabase
    .from("leads").select("*").order("created_at", { ascending: false });
  if (error) {
    c.innerHTML = "";
    c.append(areaHead("inbox", "nav.leads", "demandes.intro"));
    const p = document.createElement("p"); p.className = "msg err"; p.textContent = t("common.error");
    const b = document.createElement("button"); b.className = "btn btn--ghost btn--sm"; b.textContent = t("common.retry");
    b.addEventListener("click", load); c.append(p, b); return;
  }
  ROWS = data || [];
  if (!ROWS.length) {
    c.innerHTML = "";
    c.append(
      areaHead("inbox", "nav.leads", "demandes.intro"),
      emptyState("leads", { title: t("empty.leads.title"), body: t("empty.leads") }),
    );
    return;
  }
  render();
}

let loaded = false;
document.addEventListener("admin:area", (e) => { if (e.detail === "demandes" && !loaded) { loaded = true; load(); } });
document.addEventListener("admin:lang", () => { if (loaded && ROWS.length) render(); });
