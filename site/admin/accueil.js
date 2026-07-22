// site/admin/accueil.js — the "how is my business doing" screen.
// All dynamic values land via textContent (events/leads are untrusted input).
import { t, fmt, applyI18n } from "./i18n.js";

const $ = (id) => document.getElementById(id);
let DATA = null; // { daily: [], leads: [], leadCount7: n, leadCountPrev: n }

const iso = (d) => d.toISOString().slice(0, 10);
function windows() {
  const now = new Date();
  const d7 = new Date(now); d7.setDate(now.getDate() - 7);
  const d14 = new Date(now); d14.setDate(now.getDate() - 14);
  return { d7, d14 };
}

async function fetchData() {
  const sb = window.AT_ADMIN.supabase;
  const { d7, d14 } = windows();
  const [daily, latest, c7, cPrev] = await Promise.all([
    sb.from("events_daily").select("*").gte("day", iso(d14)),
    sb.from("leads").select("*").order("created_at", { ascending: false }).limit(3),
    sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", d7.toISOString()),
    sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", d14.toISOString()).lt("created_at", d7.toISOString()),
  ]);
  if (daily.error) throw daily.error;
  return { daily: daily.data || [], leads: latest.data || [], leadCount7: c7.count || 0, leadCountPrev: cPrev.count || 0 };
}

function sums(daily, kind, from, to) {
  let n = 0;
  for (const r of daily) if (r.kind === kind && r.day >= iso(from) && (!to || r.day < iso(to))) n += r.n;
  return n;
}
function perPage(daily, kind, from) {
  const m = new Map();
  for (const r of daily) if (r.kind === kind && r.day >= iso(from)) m.set(r.page, (m.get(r.page) || 0) + r.n);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
}
function ago(ts) {
  const min = Math.max(1, Math.round((Date.now() - new Date(ts)) / 60000));
  if (min < 60) return fmt("common.ago.min", { n: min });
  if (min < 1440) return fmt("common.ago.h", { n: Math.round(min / 60) });
  return fmt("common.ago.d", { n: Math.round(min / 1440) });
}

function kpiTile(labelKey, value, prev, breakdown, emptyKey) {
  const tile = document.createElement("div"); tile.className = "kpi";
  const h = document.createElement("h3"); h.textContent = t(labelKey);
  const n = document.createElement("div"); n.className = "n ltr"; n.textContent = String(value);
  tile.append(h, n);
  if (value === 0 && prev === 0) {
    const e = document.createElement("div"); e.className = "bd"; e.textContent = t(emptyKey);
    tile.appendChild(e);
    return tile;
  }
  const d = document.createElement("div");
  const diff = value - prev;
  d.className = "delta " + (diff >= 0 ? "up" : "down");
  d.textContent = `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)} · ${t("kpi.delta")}`;
  tile.appendChild(d);
  const bd = document.createElement("div"); bd.className = "bd"; bd.hidden = true;
  for (const [page, count] of breakdown) {
    const row = document.createElement("div");
    const p = document.createElement("span"); p.textContent = page;
    const c = document.createElement("span"); c.className = "ltr"; c.textContent = String(count);
    row.append(p, c); bd.appendChild(row);
  }
  tile.appendChild(bd);
  tile.addEventListener("click", () => { bd.hidden = !bd.hidden; });
  return tile;
}

function leadCard(r) {
  const card = document.createElement("div"); card.className = "lead-card";
  const top = document.createElement("div"); top.className = "top";
  const name = document.createElement("span"); name.className = "name"; name.textContent = r.name || "—";
  const age = document.createElement("span"); age.className = "age"; age.textContent = ago(r.created_at);
  top.append(name, age);
  const meta = document.createElement("div"); meta.className = "meta";
  meta.textContent = [r.trip, fmt("leads.people", { a: r.adults ?? 0, k: r.kids ?? 0 }),
    r.total_da ? `${t("leads.total")}: ${Number(r.total_da).toLocaleString("fr-DZ")} DA` : null]
    .filter(Boolean).join(" · ");
  const actions = document.createElement("div"); actions.className = "actions";
  if (r.phone) {
    const call = document.createElement("a"); call.className = "btn btn--ghost btn--sm ltr";
    call.href = "tel:" + encodeURIComponent(r.phone); call.textContent = "📞 " + r.phone;
    const wa = document.createElement("a"); wa.className = "btn btn--sm";
    wa.href = "https://wa.me/" + String(r.phone).replace(/^0/, "213").replace(/\D/g, "");
    wa.target = "_blank"; wa.rel = "noopener"; wa.textContent = t("leads.wa");
    actions.append(call, wa);
  }
  card.append(top, meta, actions);
  return card;
}

function render() {
  const c = $("area-accueil");
  c.replaceChildren();
  const { d7, d14 } = windows();
  const v7 = sums(DATA.daily, "view", d7), vPrev = sums(DATA.daily, "view", d14, d7);
  const c7 = sums(DATA.daily, "wa_click", d7), cPrev = sums(DATA.daily, "wa_click", d14, d7);

  const kpis = document.createElement("div"); kpis.className = "kpis";
  kpis.append(
    kpiTile("kpi.visits", v7, vPrev, perPage(DATA.daily, "view", d7), "empty.visits"),
    kpiTile("kpi.clicks", c7, cPrev, perPage(DATA.daily, "wa_click", d7), "empty.visits"),
    kpiTile("kpi.leads", DATA.leadCount7, DATA.leadCountPrev, [], "empty.leads"),
  );
  c.appendChild(kpis);

  if (v7 > 0) {
    const card = document.createElement("div"); card.className = "card";
    const bar = document.createElement("div"); bar.className = "funnel";
    const f1 = document.createElement("i"); f1.className = "f1"; f1.style.width = "100%";
    const f2 = document.createElement("i"); f2.className = "f2"; f2.style.width = Math.max(2, (c7 / v7) * 100) + "%";
    const f3 = document.createElement("i"); f3.className = "f3"; f3.style.width = Math.max(1, (DATA.leadCount7 / v7) * 100) + "%";
    bar.append(f1, f2, f3);
    const cap = document.createElement("p"); cap.className = "msg";
    cap.textContent = fmt("funnel.caption", { v: v7, c: c7, l: DATA.leadCount7 });
    card.append(bar, cap); c.appendChild(card);
  }

  const latest = document.createElement("div"); latest.className = "card";
  const h = document.createElement("h2"); h.textContent = t("home.latest"); latest.appendChild(h);
  if (!DATA.leads.length) { const p = document.createElement("p"); p.className = "msg"; p.textContent = t("empty.leads"); latest.appendChild(p); }
  else for (const r of DATA.leads) latest.appendChild(leadCard(r));
  c.appendChild(latest);

  const st = window.AT_ADMIN.status;
  const sc = document.createElement("div"); sc.className = "card";
  const sh = document.createElement("h2"); sh.textContent = t("home.status"); sc.appendChild(sh);
  const line = document.createElement("p"); line.className = "msg";
  if (st && st.github && st.lastPublish) {
    line.textContent = `${t("status.online")} · ${t("status.lastpub")}: ${new Date(st.lastPublish.date).toLocaleString(document.documentElement.lang)} ${t("status.by")} ${st.lastPublish.author}`;
  } else if (st && !st.github) {
    line.className = "banner"; line.textContent = t("status.nogithub");
  } else {
    line.textContent = t("status.online");
  }
  sc.appendChild(line); c.appendChild(sc);
}

async function load() {
  const c = $("area-accueil");
  c.innerHTML = `<div class="skel"></div><div class="skel"></div><div class="skel"></div>`;
  try { DATA = await fetchData(); render(); }
  catch {
    c.innerHTML = "";
    const p = document.createElement("p"); p.className = "msg err"; p.textContent = t("common.error");
    const b = document.createElement("button"); b.className = "btn btn--ghost btn--sm"; b.textContent = t("common.retry");
    b.addEventListener("click", load);
    c.append(p, b);
  }
}

let loaded = false;
document.addEventListener("admin:area", (e) => { if (e.detail === "accueil" && !loaded) { loaded = true; load(); } });
document.addEventListener("admin:ready", () => { if (!loaded) { loaded = true; load(); } });
document.addEventListener("admin:lang", () => { if (DATA) render(); });
document.addEventListener("admin:status", () => { if (DATA) render(); });
