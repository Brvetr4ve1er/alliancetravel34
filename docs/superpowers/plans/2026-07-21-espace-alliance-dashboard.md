# Espace Alliance — Owner Dashboard v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/admin/` from the SP2 skeleton into a phone-first, branded (Alliance green + DM Sans), FR/AR owner dashboard with live funnel metrics (visites → clics WhatsApp → demandes), a leads inbox with minimal status CRM, and honest degraded states.

**Architecture:** Vanilla static admin (ES modules, zero deps) talking to Supabase (`vxblgxiamtphabfswnxb`) through the browser anon client for reads (`events_daily` view, `leads`) and one RPC (`update_lead_status`), plus the existing `verifyAdmin`-gated Vercel functions (new: `api/status.mjs`). A cookieless beacon on the public site feeds a new `events` table. Spec: `docs/superpowers/specs/2026-07-21-admin-dashboard-redesign-design.md`.

**Tech Stack:** Plain HTML/CSS/JS ES modules · supabase-js (CDN, already used) · Node built-ins + `node --test` · Supabase migrations via MCP `apply_migration` · manual `vercel deploy --prod`.

## Global Constraints

- Zero npm dependencies; no build framework; no chart library (CSS bars only).
- Branch: `integrate/unified-admin`. Deploys are manual: `vercel deploy --prod --yes`.
- Env: serverless code reads Supabase config ONLY via `supabaseEnv()` (AT_-prefix precedence) from `api/_lib/auth.mjs`.
- `tools/check-admin-fields.mjs` build gate must stay green; the `const FIELDS = [ ... ];` block in `site/admin/edit-pages.js` must remain byte-identical (comments inside it included).
- Lead/event values are attacker-controlled: render ONLY via `createElement`/`textContent`, never innerHTML interpolation.
- All user-facing admin strings come from `site/admin/i18n.js` (FR + AR); no hardcoded French in new render code.
- AR mode: `dir="rtl"` on `<html>`, numerals/phones/amounts wrapped in class `ltr` (LTR isolate).
- New DB objects follow the lockdown pattern of migration `lock_down_is_lead_reader_execute` (revoke PUBLIC/anon, grant narrowly).
- Working directory: `C:/Users/ROG STRIX/Documents/alliance travel`.

## File Structure

| File | Responsibility |
|---|---|
| DB migration `create_events_funnel` | `events` table, RLS, grants, `events_daily` view |
| DB migration `leads_status_crm` | `leads.status` column + `update_lead_status(uuid, text)` |
| Create `site/assets/js/beacon.js` | cookieless funnel beacon (pure `buildEvent` + wiring) |
| Create `site/assets/js/beacon.test.mjs` | unit tests for `buildEvent` |
| Modify `api/_lib/github.mjs` | add `listCommits({ path, perPage })` |
| Create `api/status.mjs` | admin-gated publish/config status (pure `shapeStatus` exported) |
| Create `api/status.test.mjs` | unit tests for `shapeStatus` |
| Create `site/admin/i18n.js` | FR/AR dict, `t()`, `getLang()`, `setLang()`, `applyI18n()` |
| Create `site/admin/i18n.test.mjs` | FR↔AR key-parity test |
| Rewrite `site/admin/index.html` | 4-area shell (login + setpw kept) |
| Rewrite `site/admin/admin.css` | brand visual system, bottom nav, RTL, components |
| Modify `site/admin/app.js` | area nav, lang toggle, Réglages, config health (auth logic untouched) |
| Create `site/admin/accueil.js` | KPIs, funnel strip, latest leads, status card |
| Rewrite `site/admin/leads.js` | Demandes inbox + status CRM + CSV |
| Modify `site/admin/edit-pages.js` | list-of-cards + grouped editor + token banner (FIELDS untouched) |
| Modify `tools/templates/sections/scripts.tpl` + static pages | beacon include |

---

### Task 1: Migration — events table, RLS, events_daily view

**Files:** none in repo (DB migration via MCP `apply_migration`, project `vxblgxiamtphabfswnxb`).

**Interfaces:**
- Produces: table `public.events(kind text 'view'|'wa_click', page text, event text, created_at)`; anon INSERT only. View `public.events_daily(day date, kind text, page text, n bigint)` readable by `authenticated` who pass `is_lead_reader()`.

- [ ] **Step 1: Apply migration** — MCP `apply_migration`, name `create_events_funnel`:

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('view','wa_click')),
  page text not null check (char_length(page) <= 64),
  event text check (event is null or char_length(event) <= 64)
);
alter table public.events enable row level security;

-- Supabase default privileges grant broadly; start from zero.
revoke all on public.events from public, anon, authenticated;
grant insert on public.events to anon;

create policy "anon can insert events" on public.events
  for insert to anon
  with check (kind in ('view','wa_click') and char_length(page) <= 64);

-- No SELECT policy on the raw table for anyone: reads go through the view.
-- The view runs with owner rights (bypasses RLS) but filters on the CALLER's
-- is_lead_reader() — same boundary as the leads table.
create view public.events_daily as
  select created_at::date as day, kind, page, count(*)::bigint as n
  from public.events
  where public.is_lead_reader()
  group by 1, 2, 3;

revoke all on public.events_daily from public, anon, authenticated;
grant select on public.events_daily to authenticated;
```

- [ ] **Step 2: Verify anon INSERT works and reads are sealed.** Bash (anon key extracted from lead-config.js):

```bash
cd "C:/Users/ROG STRIX/Documents/alliance travel"
KEY=$(node -e 'const s=require("fs").readFileSync("site/assets/js/lead-config.js","utf8");console.log(s.match(/anonKey:\s*"([^"]+)"/)[1])')
B="https://vxblgxiamtphabfswnxb.supabase.co/rest/v1"
# insert: expect HTTP 201
curl -s -o /dev/null -w "insert:%{http_code}\n" "$B/events" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '{"kind":"view","page":"plan-verify"}'
# anon select raw table: expect 401/403/empty-error (NOT rows)
curl -s -w "\nselect-raw:%{http_code}\n" "$B/events?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# anon select view: expect 401/403 (view granted to authenticated only)
curl -s -w "\nselect-view:%{http_code}\n" "$B/events_daily?select=*" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Expected: `insert:201`; both selects rejected (`401`/`403`/`permission denied`).

- [ ] **Step 3: Clean the probe row** — MCP `execute_sql`: `delete from public.events where page = 'plan-verify';`

- [ ] **Step 4: Run security advisors** — MCP `get_advisors` type `security`. Expected: no NEW findings beyond the known accepted ones (leads insert `WITH CHECK (true)`; the same INFO may now also list nothing for `events` since it has a policy). If `events_daily` is flagged SECURITY DEFINER-view style, note it as accepted (that is the design).

### Task 2: Migration — leads status + update_lead_status

**Files:** none in repo (MCP `apply_migration`).

**Interfaces:**
- Consumes: `public.is_lead_reader()` (SECURITY DEFINER, EXECUTE: authenticated).
- Produces: `leads.status text not null default 'nouveau'`; RPC `update_lead_status(lead_id uuid, new_status text) returns void`, EXECUTE: authenticated only. Callable from supabase-js as `.rpc('update_lead_status', { lead_id, new_status })`.

- [ ] **Step 1: Apply migration** — name `leads_status_crm`:

```sql
alter table public.leads
  add column status text not null default 'nouveau'
  check (status in ('nouveau','contacté','conclu'));

create or replace function public.update_lead_status(lead_id uuid, new_status text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.leads
     set status = new_status
   where id = lead_id
     and public.is_lead_reader()
     and new_status in ('nouveau','contacté','conclu');
$$;

revoke execute on function public.update_lead_status(uuid, text) from public, anon;
grant execute on function public.update_lead_status(uuid, text) to authenticated;
```

- [ ] **Step 2: Verify lockdown.** Bash (same `$KEY`/`$B` as Task 1):

```bash
curl -s -w "\nrpc-anon:%{http_code}\n" "$B/rpc/update_lead_status" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"lead_id":"00000000-0000-0000-0000-000000000000","new_status":"contacté"}'
```

Expected: `rpc-anon:401` or `403` (anon has no EXECUTE). Owner-path behavior is exercised in Task 12.

### Task 3: Beacon — pure builder + tests + file

**Files:**
- Create: `site/assets/js/beacon.js`
- Create: `site/assets/js/beacon.test.mjs`

**Interfaces:**
- Produces: ES module exporting `buildEvent(kind, page, eventName) -> {kind,page,event}|null`. When loaded in a browser it self-wires: one `view` per load, one `wa_click` per `[data-track-event]` click. Skips on `localhost`/`127.0.0.1` unless `?beacon=force`, and when `navigator.doNotTrack === "1"`.

- [ ] **Step 1: Write the failing test** — `site/assets/js/beacon.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvent } from "./beacon.js";

test("buildEvent shapes a view", () => {
  assert.deepEqual(buildEvent("view", "egypte", null), { kind: "view", page: "egypte", event: null });
});
test("buildEvent shapes a click with its event name", () => {
  assert.deepEqual(buildEvent("wa_click", "istanbul", "hero_cta_whatsapp"),
    { kind: "wa_click", page: "istanbul", event: "hero_cta_whatsapp" });
});
test("buildEvent clamps page and event to 64 chars", () => {
  const long = "x".repeat(200);
  const e = buildEvent("view", long, long);
  assert.equal(e.page.length, 64);
  assert.equal(e.event.length, 64);
});
test("buildEvent rejects unknown kinds and empty page", () => {
  assert.equal(buildEvent("purchase", "p", null), null);
  assert.equal(buildEvent("view", "", null), null);
  assert.equal(buildEvent("view", null, null), null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd "C:/Users/ROG STRIX/Documents/alliance travel" && node --test site/assets/js/beacon.test.mjs`
Expected: FAIL — cannot find module `./beacon.js`.

- [ ] **Step 3: Write `site/assets/js/beacon.js`** (fill the two `CFG` values by copying `url` and `anonKey` from `site/assets/js/lead-config.js` — they are public, already shipped to every browser):

```js
// site/assets/js/beacon.js — cookieless funnel counter (view / wa_click).
// No PII, no cookies, no fingerprinting, no IP handling: one row per event
// with page id + optional data-track-event name. Fire-and-forget like
// lead-capture.js; a failed send is swallowed and never blocks the page.
// Config duplicated from lead-config.js so this file loads standalone on
// pages that don't carry the booking form.
const CFG = {
  url: "https://vxblgxiamtphabfswnxb.supabase.co",
  anonKey: "PASTE-FROM-lead-config.js",
};

export function buildEvent(kind, page, eventName) {
  if (kind !== "view" && kind !== "wa_click") return null;
  if (!page || typeof page !== "string") return null;
  return {
    kind,
    page: page.slice(0, 64),
    event: eventName == null ? null : String(eventName).slice(0, 64),
  };
}

function send(payload) {
  if (!payload) return;
  try {
    fetch(CFG.url + "/rest/v1/events", {
      method: "POST",
      headers: {
        apikey: CFG.anonKey,
        Authorization: "Bearer " + CFG.anonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      keepalive: true, // survives the navigation a WhatsApp click triggers
    }).catch(() => {});
  } catch { /* never surface */ }
}

if (typeof document !== "undefined") {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    && !location.search.includes("beacon=force");
  const dnt = typeof navigator !== "undefined" && navigator.doNotTrack === "1";
  if (!local && !dnt) {
    const page = (document.body && document.body.dataset.page) || location.pathname;
    send(buildEvent("view", page, null));
    let lastClick = "";
    let lastAt = 0;
    document.addEventListener("click", (e) => {
      const el = e.target.closest && e.target.closest("[data-track-event]");
      if (!el) return;
      const name = el.getAttribute("data-track-event");
      const now = Date.now();
      if (name === lastClick && now - lastAt < 2000) return; // double-tap noise
      lastClick = name; lastAt = now;
      send(buildEvent("wa_click", page, name));
    }, { capture: true, passive: true });
  }
}
```

- [ ] **Step 4: Fill `CFG.anonKey` from lead-config.js** (exact command, idempotent):

```bash
cd "C:/Users/ROG STRIX/Documents/alliance travel" && node -e '
const fs = require("fs");
const key = fs.readFileSync("site/assets/js/lead-config.js","utf8").match(/anonKey:\s*"([^"]+)"/)[1];
const f = "site/assets/js/beacon.js";
fs.writeFileSync(f, fs.readFileSync(f,"utf8").replace("PASTE-FROM-lead-config.js", key));
console.log("anonKey injected:", key.slice(0,12) + "…");'
```

- [ ] **Step 5: Run tests to verify pass**

Run: `node --test site/assets/js/beacon.test.mjs` — Expected: 4 pass.

- [ ] **Step 6: Commit**

```bash
git add site/assets/js/beacon.js site/assets/js/beacon.test.mjs
git commit -m "feat(analytics): cookieless funnel beacon (view / wa_click) with tested payload builder"
```

### Task 4: api/status.mjs — publish + config status

**Files:**
- Modify: `api/_lib/github.mjs` (append)
- Create: `api/status.mjs`
- Create: `api/status.test.mjs`

**Interfaces:**
- Consumes: `verifyAdmin(req)` and `supabaseEnv()` from `api/_lib/auth.mjs`; `repo()/branch()/headers()` internals of github.mjs.
- Produces: `GET /api/status` → `200 { github: boolean, branch: string|null, lastPublish: { date, author, message } | null }`. Exported pure `shapeStatus(commitsJson)` for tests. Never returns 5xx for a missing/broken token — that is `github:false`.

- [ ] **Step 1: Write the failing test** — `api/status.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { shapeStatus } from "./status.mjs";

test("shapeStatus extracts the newest commit", () => {
  const gh = [{ commit: { author: { name: "Owner", date: "2026-07-21T10:00:00Z" }, message: "content(egypte): edit via dashboard" } }];
  assert.deepEqual(shapeStatus(gh), { date: "2026-07-21T10:00:00Z", author: "Owner", message: "content(egypte): edit via dashboard" });
});
test("shapeStatus returns null on empty or malformed input", () => {
  assert.equal(shapeStatus([]), null);
  assert.equal(shapeStatus(null), null);
  assert.equal(shapeStatus([{}]), null);
});
```

- [ ] **Step 2: Run to verify failure** — `node --test api/status.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Append `listCommits` to `api/_lib/github.mjs`:**

```js
// Newest commits touching a path on the target branch (for /api/status).
export async function listCommits({ path, perPage = 1 }) {
  const url = `${API}/repos/${repo()}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(branch())}&per_page=${perPage}`;
  let res;
  try {
    res = await fetch(url, { headers: headers() });
  } catch {
    throw Object.assign(new Error("github unreachable"), { status: 502 });
  }
  if (!res.ok) { const e = new Error(`github ${res.status}`); e.status = 502; throw e; }
  try {
    return await res.json();
  } catch {
    throw Object.assign(new Error("github bad response"), { status: 502 });
  }
}
```

- [ ] **Step 4: Create `api/status.mjs`:**

```js
// api/status.mjs — GET: owner-facing health/status for the dashboard.
// Missing or broken GitHub credentials are a STATE ({github:false}), never an
// error: the Accueil card and the Pages banner render from this, and the one
// thing they must not do is show the owner a raw failure.
import { verifyAdmin } from "./_lib/auth.mjs";
import { listCommits } from "./_lib/github.mjs";

export function shapeStatus(commits) {
  const c = Array.isArray(commits) && commits[0] && commits[0].commit;
  if (!c || !c.author) return null;
  return { date: c.author.date, author: c.author.name, message: c.message };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const branch = process.env.GITHUB_BRANCH || null;
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO)
    return res.status(200).json({ github: false, branch, lastPublish: null });

  try {
    const commits = await listCommits({ path: "data/trips", perPage: 1 });
    return res.status(200).json({ github: true, branch, lastPublish: shapeStatus(commits) });
  } catch {
    return res.status(200).json({ github: false, branch, lastPublish: null });
  }
}
```

- [ ] **Step 5: Run tests** — `node --test api/status.test.mjs api/_lib/auth.test.mjs` → all pass. Also `node --check api/status.mjs api/_lib/github.mjs`.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/github.mjs api/status.mjs api/status.test.mjs
git commit -m "feat(admin): /api/status — last publish + config health, degrades to github:false"
```

### Task 5: Admin i18n — FR/AR dict

**Files:**
- Create: `site/admin/i18n.js`
- Create: `site/admin/i18n.test.mjs`

**Interfaces:**
- Produces: `t(key) -> string` (current lang, FR fallback), `getLang() -> 'fr'|'ar'`, `setLang(lang)` (persists `at_admin_lang`, sets `document.documentElement` `lang`+`dir`, re-applies), `applyI18n(root?)` (fills every `[data-i18n]` via textContent), `fmt(key, vars)` (replaces `{x}` placeholders). All later tasks reference keys defined here — the dict below is the complete v1 key set.

- [ ] **Step 1: Write the failing parity test** — `site/admin/i18n.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { STRINGS } from "./i18n.js";

test("fr and ar carry exactly the same keys", () => {
  const fr = Object.keys(STRINGS.fr).sort();
  const ar = Object.keys(STRINGS.ar).sort();
  assert.deepEqual(ar, fr);
});
test("no empty strings", () => {
  for (const lang of ["fr", "ar"])
    for (const [k, v] of Object.entries(STRINGS[lang]))
      assert.ok(typeof v === "string" && v.length > 0, `${lang}.${k}`);
});
```

- [ ] **Step 2: Run to verify failure** — `node --test site/admin/i18n.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Create `site/admin/i18n.js`:**

```js
// site/admin/i18n.js — admin-local FR/AR dictionary. Deliberately independent
// of the public site's i18n.js (different lifecycle, ~70 keys vs 1300 lines).
export const STRINGS = {
  fr: {
    "app.title": "Espace Alliance",
    "nav.home": "Accueil", "nav.leads": "Demandes", "nav.pages": "Pages", "nav.settings": "Réglages",
    "login.title": "Espace administrateur",
    "login.sub": "Connectez-vous pour gérer vos pages et vos demandes.",
    "login.email": "Email", "login.password": "Mot de passe", "login.submit": "Se connecter",
    "login.nopw": "Je n'ai pas encore de mot de passe",
    "login.nopw.help": "Recevez un lien de connexion à usage unique par email. Une fois connecté, définissez un mot de passe.",
    "login.magic": "Recevoir un lien par email",
    "setpw.title": "Mot de passe", "setpw.sub": "Choisissez un mot de passe d'au moins 8 caractères.",
    "setpw.new": "Nouveau mot de passe", "setpw.confirm": "Confirmer", "setpw.save": "Enregistrer", "setpw.back": "Retour",
    "kpi.visits": "Visites", "kpi.clicks": "Clics WhatsApp", "kpi.leads": "Demandes",
    "kpi.window": "7 derniers jours", "kpi.delta": "vs 7 jours précédents",
    "funnel.caption": "Sur {v} visites, {c} ont cliqué WhatsApp, {l} ont laissé une demande.",
    "empty.visits": "Les visites apparaîtront dès demain — le compteur vient d'être activé.",
    "empty.leads": "Aucune demande pour le moment. Elles apparaîtront ici dès qu'un visiteur enverra le formulaire.",
    "home.latest": "Dernières demandes", "home.status": "État du site",
    "status.online": "Site en ligne ✓", "status.lastpub": "Dernière publication",
    "status.by": "par", "status.nogithub": "Publication non configurée — jeton GitHub manquant",
    "leads.search": "Rechercher (nom, téléphone, voyage…)", "leads.export": "Exporter CSV",
    "leads.count": "{n} demande(s)", "leads.all": "Toutes",
    "leads.status.nouveau": "Nouveau", "leads.status.contacté": "Contacté", "leads.status.conclu": "Conclu",
    "leads.call": "Appeler", "leads.wa": "WhatsApp",
    "leads.people": "{a} adulte(s), {k} enfant(s)", "leads.total": "Total estimé",
    "leads.notes": "Notes", "leads.close": "Fermer",
    "pages.title": "Vos pages", "pages.edit": "Modifier", "pages.soon": "Bientôt — édition en cours de construction",
    "pages.visa": "Rendez-vous visa", "pages.back": "← Toutes les pages",
    "pages.group.seo": "Référencement (Google)", "pages.group.hero": "En-tête de la page", "pages.group.prices": "Tarifs hôtels (DA)",
    "pages.advanced": "Avancé — réservé au développeur",
    "pages.advanced.warn": "Modifier ce bloc peut casser la page. La sauvegarde est refusée si le contenu est invalide.",
    "pages.publish": "Publier", "pages.publishing": "Publication…",
    "pages.published": "Publié ✓ — la page sera à jour dans ~1 minute.",
    "pages.nogithub": "Publication non configurée — jeton GitHub manquant. Les modifications ne peuvent pas être enregistrées.",
    "settings.title": "Réglages", "settings.lang": "Langue de l'interface",
    "settings.password": "Changer le mot de passe", "settings.logout": "Se déconnecter",
    "settings.config": "Configuration", "settings.supabase": "Base de données (Supabase)",
    "settings.github": "Publication (GitHub)", "settings.branch": "Branche de publication",
    "settings.ok": "Connecté", "settings.ko": "Non configuré",
    "common.loading": "Chargement…", "common.retry": "Réessayer",
    "common.error": "Une erreur est survenue — réessayez.",
    "common.ago.min": "il y a {n} min", "common.ago.h": "il y a {n} h", "common.ago.d": "il y a {n} j",
  },
  ar: {
    "app.title": "فضاء أليانس",
    "nav.home": "الرئيسية", "nav.leads": "الطلبات", "nav.pages": "الصفحات", "nav.settings": "الإعدادات",
    "login.title": "فضاء الإدارة",
    "login.sub": "سجّل الدخول لإدارة صفحاتك وطلباتك.",
    "login.email": "البريد الإلكتروني", "login.password": "كلمة المرور", "login.submit": "تسجيل الدخول",
    "login.nopw": "ليست لدي كلمة مرور بعد",
    "login.nopw.help": "استلم رابط دخول لمرة واحدة عبر البريد. بعد الدخول، عيّن كلمة مرور.",
    "login.magic": "استلام رابط عبر البريد",
    "setpw.title": "كلمة المرور", "setpw.sub": "اختر كلمة مرور من 8 أحرف على الأقل.",
    "setpw.new": "كلمة المرور الجديدة", "setpw.confirm": "التأكيد", "setpw.save": "حفظ", "setpw.back": "رجوع",
    "kpi.visits": "الزيارات", "kpi.clicks": "نقرات واتساب", "kpi.leads": "الطلبات",
    "kpi.window": "آخر 7 أيام", "kpi.delta": "مقارنة بالأيام السبعة السابقة",
    "funnel.caption": "من بين {v} زيارة، نقر {c} على واتساب، وترك {l} طلباً.",
    "empty.visits": "ستظهر الزيارات ابتداءً من الغد — تم تفعيل العداد للتو.",
    "empty.leads": "لا توجد طلبات حالياً. ستظهر هنا فور إرسال زائر للنموذج.",
    "home.latest": "أحدث الطلبات", "home.status": "حالة الموقع",
    "status.online": "الموقع يعمل ✓", "status.lastpub": "آخر نشر",
    "status.by": "بواسطة", "status.nogithub": "النشر غير مُهيأ — رمز GitHub مفقود",
    "leads.search": "بحث (الاسم، الهاتف، الرحلة…)", "leads.export": "تصدير CSV",
    "leads.count": "{n} طلب(ات)", "leads.all": "الكل",
    "leads.status.nouveau": "جديد", "leads.status.contacté": "تم التواصل", "leads.status.conclu": "تم الاتفاق",
    "leads.call": "اتصال", "leads.wa": "واتساب",
    "leads.people": "{a} بالغ، {k} طفل", "leads.total": "المجموع التقديري",
    "leads.notes": "ملاحظات", "leads.close": "إغلاق",
    "pages.title": "صفحاتك", "pages.edit": "تعديل", "pages.soon": "قريباً — التعديل قيد الإنشاء",
    "pages.visa": "مواعيد التأشيرات", "pages.back": "← كل الصفحات",
    "pages.group.seo": "الظهور في غوغل", "pages.group.hero": "ترويسة الصفحة", "pages.group.prices": "أسعار الفنادق (دج)",
    "pages.advanced": "متقدم — مخصص للمطوّر",
    "pages.advanced.warn": "تعديل هذا الجزء قد يعطّل الصفحة. يُرفض الحفظ إذا كان المحتوى غير صالح.",
    "pages.publish": "نشر", "pages.publishing": "جارٍ النشر…",
    "pages.published": "تم النشر ✓ — ستُحدَّث الصفحة خلال دقيقة تقريباً.",
    "pages.nogithub": "النشر غير مُهيأ — رمز GitHub مفقود. لا يمكن حفظ التعديلات.",
    "settings.title": "الإعدادات", "settings.lang": "لغة الواجهة",
    "settings.password": "تغيير كلمة المرور", "settings.logout": "تسجيل الخروج",
    "settings.config": "الإعداد", "settings.supabase": "قاعدة البيانات (Supabase)",
    "settings.github": "النشر (GitHub)", "settings.branch": "فرع النشر",
    "settings.ok": "متصل", "settings.ko": "غير مُهيأ",
    "common.loading": "جارٍ التحميل…", "common.retry": "إعادة المحاولة",
    "common.error": "حدث خطأ — أعد المحاولة.",
    "common.ago.min": "منذ {n} د", "common.ago.h": "منذ {n} س", "common.ago.d": "منذ {n} يوم",
  },
};

const KEY = "at_admin_lang";
let lang = "fr";
try { lang = localStorage.getItem(KEY) === "ar" ? "ar" : "fr"; } catch { /* node / private mode */ }

export function getLang() { return lang; }
export function t(k) { return STRINGS[lang][k] ?? STRINGS.fr[k] ?? k; }
export function fmt(k, vars) {
  let s = t(k);
  for (const [name, v] of Object.entries(vars || {})) s = s.replaceAll(`{${name}}`, String(v));
  return s;
}
export function applyI18n(root) {
  (root || document).querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  (root || document).querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
}
export function setLang(l) {
  lang = l === "ar" ? "ar" : "fr";
  try { localStorage.setItem(KEY, lang); } catch { /* private mode */ }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  applyI18n();
  document.dispatchEvent(new CustomEvent("admin:lang", { detail: lang }));
}
```

- [ ] **Step 4: Run tests** — `node --test site/admin/i18n.test.mjs` → 2 pass.

- [ ] **Step 5: Commit**

```bash
git add site/admin/i18n.js site/admin/i18n.test.mjs
git commit -m "feat(admin): FR/AR dictionary with parity test, t()/fmt()/setLang()"
```

### Task 6: Shell — index.html + admin.css v2

**Files:**
- Rewrite: `site/admin/index.html`
- Rewrite: `site/admin/admin.css`

**Interfaces:**
- Consumes: element ids used by app.js auth (`view-login`, `view-setpw`, `view-app`, `login-form`, `login-email`, `login-password`, `login-magic`, `login-msg`, `setpw-form`, `setpw-new`, `setpw-confirm`, `setpw-msg`, `setpw-cancel`, `change-pw`, `logout`, `who`, `boot-msg`) — ALL kept.
- Produces: 4 area panels `#area-accueil #area-demandes #area-pages #area-reglages`, nav buttons `.navbtn[data-area]`, lang pill `#lang-toggle`, plus classes defined in the CSS below (`.card .kpi .kpis .funnel .lead-card .chip .banner .cfg …`). Every text node carries `data-i18n`.

- [ ] **Step 1: Rewrite `site/admin/index.html`:**

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="robots" content="noindex" />
  <title>Espace Alliance — Admin</title>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./admin.css" />
  <script src="../assets/js/lead-config.js" defer></script>
  <script type="module" src="./app.js"></script>
  <script type="module" src="./accueil.js"></script>
  <script type="module" src="./leads.js"></script>
  <script type="module" src="./edit-pages.js"></script>
</head>
<body>
  <main id="app" class="admin">

    <section id="view-login" class="card card--auth" hidden>
      <p class="brand"><span class="brand__name">Alliance</span>Travel</p>
      <h1 data-i18n="login.title"></h1>
      <p class="msg" data-i18n="login.sub"></p>
      <form id="login-form" class="stack">
        <div class="field"><label for="login-email" data-i18n="login.email"></label>
          <input type="email" id="login-email" required autocomplete="username" /></div>
        <div class="field"><label for="login-password" data-i18n="login.password"></label>
          <input type="password" id="login-password" required autocomplete="current-password" /></div>
        <button type="submit" class="btn btn--block" data-i18n="login.submit"></button>
      </form>
      <p id="login-msg" class="msg" role="status" aria-live="polite"></p>
      <details class="adv"><summary data-i18n="login.nopw"></summary>
        <p class="msg" data-i18n="login.nopw.help"></p>
        <button type="button" id="login-magic" class="btn btn--ghost btn--block" data-i18n="login.magic"></button>
      </details>
    </section>

    <section id="view-setpw" class="card card--auth" hidden>
      <h1 data-i18n="setpw.title"></h1>
      <p class="msg" data-i18n="setpw.sub"></p>
      <form id="setpw-form" class="stack">
        <div class="field"><label for="setpw-new" data-i18n="setpw.new"></label>
          <input type="password" id="setpw-new" required minlength="8" autocomplete="new-password" /></div>
        <div class="field"><label for="setpw-confirm" data-i18n="setpw.confirm"></label>
          <input type="password" id="setpw-confirm" required minlength="8" autocomplete="new-password" /></div>
        <button type="submit" class="btn btn--block" data-i18n="setpw.save"></button>
      </form>
      <p id="setpw-msg" class="msg" role="status" aria-live="polite"></p>
      <button type="button" id="setpw-cancel" class="btn btn--ghost btn--block" data-i18n="setpw.back"></button>
    </section>

    <section id="view-app" hidden>
      <header class="topbar">
        <p class="brand brand--sm"><span class="brand__name">Alliance</span>Travel</p>
        <span class="spacer"></span>
        <button id="lang-toggle" class="pill" aria-label="Langue">عربي</button>
        <span id="who" class="who ltr"></span>
        <button id="change-pw" class="btn btn--ghost btn--sm" data-i18n="settings.password" hidden></button>
        <button id="logout" class="btn btn--ghost btn--sm" data-i18n="settings.logout" hidden></button>
      </header>

      <div id="area-accueil" class="area"></div>
      <div id="area-demandes" class="area" hidden></div>
      <div id="area-pages" class="area" hidden></div>
      <div id="area-reglages" class="area" hidden></div>

      <nav class="bottomnav" aria-label="Navigation">
        <button class="navbtn is-active" data-area="accueil"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3z"/></svg><span data-i18n="nav.home"></span></button>
        <button class="navbtn" data-area="demandes"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H8l-4 4z"/></svg><span data-i18n="nav.leads"></span><span id="nav-leads-badge" class="badge" hidden></span></button>
        <button class="navbtn" data-area="pages"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/></svg><span data-i18n="nav.pages"></span></button>
        <button class="navbtn" data-area="reglages"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/></svg><span data-i18n="nav.settings"></span></button>
      </nav>
    </section>

    <p id="boot-msg" class="msg" data-i18n="common.loading"></p>
  </main>
</body>
</html>
```

- [ ] **Step 2: Rewrite `site/admin/admin.css`** (complete file):

```css
/* Espace Alliance — admin visual system v2.
   Brand tokens derived from the public site (green #237a4a, DM Sans, 8-pt scale).
   RTL-native: logical properties only; numerals opt into LTR via .ltr. */
:root {
  --ground: #f7f5f0; --card: #ffffff; --line: #e5e1d8;
  --ink: #1c2420; --ink2: #5c6660;
  --brand: #237a4a; --brand-dim: rgba(35,122,74,.10); --brand-glow: rgba(35,122,74,.22);
  --gold: #c9872e; --danger: #c0392b; --ok: #237a4a;
  --r: 14px; --r-sm: 9px;
  --shadow: 0 1px 2px rgba(28,36,32,.05), 0 8px 24px rgba(28,36,32,.06);
  --s1: 4px; --s2: 8px; --s3: 16px; --s4: 24px; --s5: 32px; --s6: 48px;
  --fs-sm: .8125rem; --fs: 1rem; --fs-lg: 1.125rem; --fs-h2: 1.5rem; --fs-kpi: 1.75rem;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; font: 400 var(--fs)/1.5 "DM Sans", system-ui, sans-serif; background: var(--ground); color: var(--ink); }
[dir="rtl"] body, [dir="rtl"] input, [dir="rtl"] button { font-family: "DM Sans", "Segoe UI", system-ui, sans-serif; }
.ltr { direction: ltr; unicode-bidi: isolate; }

.admin { max-width: 1100px; margin: 0 auto; padding: var(--s3); padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
.spacer { flex: 1; }

.brand { margin: 0 0 var(--s3); font-weight: 700; font-size: var(--fs-lg); letter-spacing: .01em; }
.brand__name { color: var(--brand); }
.brand--sm { font-size: var(--fs); margin: 0; }

.card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow); padding: var(--s4); }
.card--auth { max-width: 420px; margin: 10vh auto; }
.card--auth h1 { margin: 0 0 var(--s1); font-size: var(--fs-h2); }

.field { margin-block: var(--s3); }
.field label { display: block; color: var(--ink2); font-size: var(--fs-sm); margin-bottom: var(--s1); }
input, textarea, select {
  width: 100%; padding: 12px 14px; background: #fcfbf8; border: 1px solid var(--line);
  border-radius: var(--r-sm); color: var(--ink); font: inherit;
}
input:focus-visible, textarea:focus-visible, button:focus-visible { outline: 2px solid var(--brand-glow); outline-offset: 1px; }
textarea { min-height: 220px; font-family: ui-monospace, monospace; font-size: var(--fs-sm); }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px;
  padding: 10px 18px; background: var(--brand); color: #fff; border: 0; border-radius: var(--r-sm);
  font: 500 var(--fs)/1 "DM Sans", sans-serif; cursor: pointer; }
.btn:hover { filter: brightness(1.06); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn--ghost { background: transparent; border: 1px solid var(--line); color: var(--ink); }
.btn--sm { min-height: 36px; padding: 6px 12px; font-size: var(--fs-sm); }
.btn--block { display: flex; width: 100%; margin-top: var(--s2); }

.msg { color: var(--ink2); margin-block: var(--s2); min-height: 1.2em; font-size: var(--fs-sm); }
.msg.err { color: var(--danger); } .msg.ok { color: var(--ok); }
.stack { display: block; }
details.adv { margin-top: var(--s3); border: 1px dashed var(--line); border-radius: var(--r-sm); padding: var(--s2) var(--s3); }
details.adv summary { cursor: pointer; color: var(--ink2); font-size: var(--fs-sm); }

.topbar { display: flex; align-items: center; gap: var(--s2); padding-block: var(--s2) var(--s3); }
.who { color: var(--ink2); font-size: var(--fs-sm); }
.pill { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 6px 14px; cursor: pointer; font: inherit; }
.pill:hover { border-color: var(--brand); color: var(--brand); }

.area { display: grid; gap: var(--s3); animation: rise .18s ease-out; }
@keyframes rise { from { opacity: 0; transform: translateY(4px); } }

.bottomnav { position: fixed; inset-inline: 0; bottom: 0; display: flex; justify-content: space-around;
  background: var(--card); border-top: 1px solid var(--line); padding: 6px 0 calc(6px + env(safe-area-inset-bottom)); z-index: 10; }
.navbtn { position: relative; display: grid; justify-items: center; gap: 2px; min-width: 72px; min-height: 48px;
  border: 0; background: none; color: var(--ink2); font: 500 .72rem/1 "DM Sans", sans-serif; cursor: pointer; border-radius: var(--r-sm); }
.navbtn.is-active { color: var(--brand); }
.navbtn.is-active::after { content: ""; position: absolute; top: -7px; inset-inline: 24%; height: 3px; border-radius: 2px; background: var(--brand); }
.badge { position: absolute; top: 0; inset-inline-end: 14px; min-width: 16px; height: 16px; border-radius: 8px;
  background: var(--gold); color: #fff; font-size: .65rem; line-height: 16px; text-align: center; padding-inline: 3px; }

.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s2); }
.kpi { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: var(--s3); cursor: pointer; }
.kpi h3 { margin: 0; font-size: var(--fs-sm); font-weight: 500; color: var(--ink2); }
.kpi .n { font-size: var(--fs-kpi); font-weight: 700; line-height: 1.2; }
.kpi .delta { font-size: var(--fs-sm); } .delta.up { color: var(--ok); } .delta.down { color: var(--danger); }
.kpi .bd { margin-top: var(--s2); border-top: 1px solid var(--line); padding-top: var(--s2); font-size: var(--fs-sm); color: var(--ink2); }
.kpi .bd div { display: flex; justify-content: space-between; gap: var(--s2); padding-block: 2px; }

.funnel { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: var(--brand-dim); }
.funnel i { display: block; height: 100%; } .funnel .f1 { background: var(--brand-glow); } .funnel .f2 { background: var(--brand); } .funnel .f3 { background: var(--gold); }

.lead-card { display: grid; gap: var(--s1); background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: var(--s3); }
.lead-card .top { display: flex; align-items: center; gap: var(--s2); }
.lead-card .name { font-weight: 700; } .lead-card .age { color: var(--ink2); font-size: var(--fs-sm); margin-inline-start: auto; }
.lead-card .meta { color: var(--ink2); font-size: var(--fs-sm); }
.lead-card .actions { display: flex; gap: var(--s2); margin-top: var(--s1); }
.lead-card .actions .btn { flex: 1; }

.chip { border: 1px solid var(--line); background: var(--card); border-radius: 999px; padding: 4px 12px;
  font-size: var(--fs-sm); cursor: pointer; }
.chip.is-on { background: var(--brand-dim); border-color: var(--brand); color: var(--brand); }
.chip--nouveau { border-color: var(--gold); color: var(--gold); }
.chip--contacté { border-color: var(--brand); color: var(--brand); }
.chip--conclu { background: var(--brand); border-color: var(--brand); color: #fff; }
.chiprow { display: flex; gap: var(--s2); flex-wrap: wrap; }

.banner { background: #fdf6ec; border: 1px solid var(--gold); color: #7a5316; border-radius: var(--r-sm); padding: var(--s2) var(--s3); font-size: var(--fs-sm); }

.cfg { display: grid; gap: var(--s2); }
.cfg div { display: flex; justify-content: space-between; border-bottom: 1px solid var(--line); padding-block: var(--s2); font-size: var(--fs-sm); }
.cfg .ok { color: var(--ok); } .cfg .ko { color: var(--danger); }

.skel { border-radius: var(--r-sm); background: linear-gradient(90deg, var(--line), #efece5, var(--line)); background-size: 200% 100%; animation: sh 1.2s infinite; min-height: 72px; }
@keyframes sh { to { background-position: -200% 0; } }

table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); background: var(--card); border-radius: var(--r); overflow: hidden; }
th, td { text-align: start; padding: 10px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
th { color: var(--ink2); position: sticky; top: 0; background: var(--card); }

.pagegrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--s2); }
.pagecard { display: grid; gap: var(--s1); background: var(--card); border: 1px solid var(--line); border-radius: var(--r);
  padding: var(--s3); cursor: pointer; text-align: start; font: inherit; color: inherit; }
.pagecard:hover { border-color: var(--brand); }
.pagecard.is-locked { opacity: .55; cursor: default; }
.pagecard .t { font-weight: 700; } .pagecard .m { color: var(--ink2); font-size: var(--fs-sm); }
fieldset.group { border: 1px solid var(--line); border-radius: var(--r); padding: var(--s3); margin-block: var(--s3); }
fieldset.group legend { padding-inline: var(--s1); color: var(--brand); font-weight: 500; font-size: var(--fs-sm); }
.row { display: flex; gap: var(--s2); flex-wrap: wrap; } .row > * { flex: 1; min-width: 160px; }

@media (min-width: 900px) {
  .admin { padding-inline-start: 240px; padding-bottom: var(--s4); }
  .bottomnav { inset-inline-end: auto; inset-inline-start: 0; top: 0; bottom: 0; width: 220px;
    flex-direction: column; justify-content: flex-start; gap: var(--s1); border-top: 0; border-inline-end: 1px solid var(--line); padding: var(--s5) var(--s2); }
  .navbtn { grid-template-columns: 24px 1fr; justify-items: start; align-items: center; width: 100%; padding: 10px 14px; font-size: var(--fs-sm); }
  .navbtn.is-active { background: var(--brand-dim); }
  .navbtn.is-active::after { display: none; }
  .kpi .n { font-size: 2.25rem; }
}
```

- [ ] **Step 3: Visual smoke.** Run `mcp preview_start {url:"http://localhost:8880/admin/"}` (static server already used this session; restart if dead: `python -m http.server 8880 -d site` in background). Screenshot: login card renders branded (white card, green button, DM Sans) — text will be EMPTY until Task 7 wires `applyI18n` (expected at this step).

- [ ] **Step 4: Commit**

```bash
git add site/admin/index.html site/admin/admin.css
git commit -m "feat(admin): Espace Alliance shell — branded light theme, 4-area layout, bottom nav, RTL-native CSS"
```

### Task 7: app.js — areas, language, Réglages, config health

**Files:**
- Modify: `site/admin/app.js`

**Interfaces:**
- Consumes: `t/fmt/getLang/setLang/applyI18n` from `./i18n.js`; existing auth flow (UNTOUCHED: `enterApp`, `boot` listener order, `entered`/`recovering` guards, `frAuthError`, magic-link, setpw).
- Produces: `AT_ADMIN.showArea(name)`; event `admin:area` `{detail: "accueil"|"demandes"|"pages"|"reglages"}` fired on every switch; LEGACY event `admin:tab` still fired with `"leads"`/`"pages"` mapping until Tasks 9-10 land; Réglages panel DOM; `AT_ADMIN.status` cache of `/api/status`.

- [ ] **Step 1: Add imports + applyI18n at boot.** Top of `app.js`, after the existing imports:

```js
import { t, fmt, getLang, setLang, applyI18n } from "./i18n.js";
```

Inside `boot()`, FIRST line: `setLang(getLang()); // stamps lang+dir and fills every [data-i18n]`

- [ ] **Step 2: Replace `showTab` with `showArea`** (delete old `showTab`, update `AT_ADMIN`):

```js
const AREAS = ["accueil", "demandes", "pages", "reglages"];
function showArea(name) {
  document.querySelectorAll(".navbtn").forEach((b) => b.classList.toggle("is-active", b.dataset.area === name));
  for (const a of AREAS) show($("area-" + a), a === name);
  document.dispatchEvent(new CustomEvent("admin:area", { detail: name }));
  // Legacy bridge until leads.js / edit-pages.js migrate (Tasks 9-10):
  if (name === "demandes") document.dispatchEvent(new CustomEvent("admin:tab", { detail: "leads" }));
  if (name === "pages") document.dispatchEvent(new CustomEvent("admin:tab", { detail: "pages" }));
}
const AT_ADMIN = { supabase, session: null, token: null, showArea, status: null };
```

(The old `showTab`-based `enterApp` line `showTab("pages")` becomes `showArea("accueil")`; `change-pw`/`logout` get `hidden = false` there too since the topbar now hosts them: add `show($("change-pw"), true); show($("logout"), true);` right before `showArea("accueil")`.)

- [ ] **Step 3: Wire nav + lang toggle** in `boot()` where tab listeners were:

```js
document.querySelectorAll(".navbtn").forEach((b) => b.addEventListener("click", () => showArea(b.dataset.area)));
$("lang-toggle").addEventListener("click", () => {
  const next = getLang() === "fr" ? "ar" : "fr";
  setLang(next);
  $("lang-toggle").textContent = next === "fr" ? "عربي" : "FR";
});
$("lang-toggle").textContent = getLang() === "fr" ? "عربي" : "FR";
```

- [ ] **Step 4: Réglages renderer** (append to app.js; runs once on first entry):

```js
let reglagesInit = false;
document.addEventListener("admin:area", async (e) => {
  if (e.detail !== "reglages" || reglagesInit) return;
  reglagesInit = true;
  const c = $("area-reglages");
  c.innerHTML = `
    <div class="card">
      <h2 data-i18n="settings.title"></h2>
      <div class="field"><label data-i18n="settings.lang"></label>
        <div class="chiprow">
          <button class="chip" id="lang-fr">Français</button>
          <button class="chip" id="lang-ar">العربية</button>
        </div></div>
      <button id="rg-pw" class="btn btn--ghost btn--block" data-i18n="settings.password"></button>
      <button id="rg-logout" class="btn btn--ghost btn--block" data-i18n="settings.logout"></button>
    </div>
    <div class="card"><h2 data-i18n="settings.config"></h2><div class="cfg" id="cfg"></div></div>`;
  applyI18n(c);
  const mark = () => {
    c.querySelector("#lang-fr").classList.toggle("is-on", getLang() === "fr");
    c.querySelector("#lang-ar").classList.toggle("is-on", getLang() === "ar");
  };
  mark();
  c.querySelector("#lang-fr").addEventListener("click", () => { setLang("fr"); $("lang-toggle").textContent = "عربي"; mark(); });
  c.querySelector("#lang-ar").addEventListener("click", () => { setLang("ar"); $("lang-toggle").textContent = "FR"; mark(); });
  c.querySelector("#rg-pw").addEventListener("click", () => { $("setpw-msg").textContent = ""; showView("setpw"); });
  c.querySelector("#rg-logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

  const cfg = c.querySelector("#cfg");
  const line = (labelKey, ok, extra) => {
    const d = document.createElement("div");
    const l = document.createElement("span"); l.textContent = t(labelKey);
    const v = document.createElement("span");
    v.textContent = extra ?? (ok ? t("settings.ok") : t("settings.ko"));
    v.className = ok ? "ok" : "ko";
    if (extra != null) v.classList.add("ltr");
    d.append(l, v); cfg.appendChild(d);
  };
  line("settings.supabase", true); // being here required a working /api/me
  const st = AT_ADMIN.status || (await window.AT_ADMIN.callApi("/api/status")).data || {};
  AT_ADMIN.status = st;
  line("settings.github", !!st.github);
  if (st.branch) line("settings.branch", true, st.branch);
});
```

- [ ] **Step 5: Status prefetch in `enterApp`** (after `admin:ready` dispatch): `callApi("/api/status").then((r) => { if (r.ok) AT_ADMIN.status = r.data; document.dispatchEvent(new CustomEvent("admin:status")); });`

- [ ] **Step 6: Syntax + browser smoke.** `node --input-type=module --check < site/admin/app.js`. Preview `/admin/`: login card now carries FR strings; lang pill flips to Arabic + RTL layout and back (verify `document.documentElement.dir` via `javascript_tool`).

- [ ] **Step 7: Commit**

```bash
git add site/admin/app.js
git commit -m "feat(admin): area navigation, FR/AR toggle, Réglages with config health"
```

### Task 8: Accueil — KPIs, funnel, latest leads, status card

**Files:**
- Create: `site/admin/accueil.js`

**Interfaces:**
- Consumes: `AT_ADMIN.supabase`, `AT_ADMIN.callApi`, `AT_ADMIN.status`, events `admin:area`/`admin:lang`/`admin:status`; view `events_daily(day,kind,page,n)`; i18n keys `kpi.* funnel.caption empty.* home.* status.* common.*`.
- Produces: fills `#area-accueil`. Re-renders on language change.

- [ ] **Step 1: Create `site/admin/accueil.js`:**

```js
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
```

- [ ] **Step 2: Syntax check** — `node --input-type=module --check < site/admin/accueil.js` → OK.
- [ ] **Step 3: Browser smoke** — preview `/admin/`: after login-less boot the login card shows; full data render is exercised in Task 12 (needs a session).
- [ ] **Step 4: Commit**

```bash
git add site/admin/accueil.js
git commit -m "feat(admin): Accueil — funnel KPIs with per-page breakdown, latest leads, status card, empty states"
```

### Task 9: Demandes — inbox v2 with status CRM

**Files:**
- Rewrite: `site/admin/leads.js`

**Interfaces:**
- Consumes: `.rpc("update_lead_status", { lead_id, new_status })` (Task 2), i18n keys `leads.*`, event `admin:area` detail `"demandes"`.
- Produces: fills `#area-demandes`. CSV gains `status` column. Keeps textContent discipline everywhere.

- [ ] **Step 1: Rewrite `site/admin/leads.js`:**

```js
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
```

- [ ] **Step 2: Syntax check** — `node --input-type=module --check < site/admin/leads.js` → OK.
- [ ] **Step 3: Remove the `admin:tab` legacy bridge line for `"demandes"`** in `app.js` (keep the `"pages"` one until Task 10).
- [ ] **Step 4: Commit**

```bash
git add site/admin/leads.js site/admin/app.js
git commit -m "feat(admin): Demandes inbox — cards, status CRM via update_lead_status, filters, CSV with status"
```

### Task 10: Pages — cards list, grouped editor, token banner

**Files:**
- Modify: `site/admin/edit-pages.js` (render layer only — `const FIELDS = [...]` block BYTE-IDENTICAL, `collectInto`/`save`/`loadTrip` logic preserved)

**Interfaces:**
- Consumes: `AT_ADMIN.status` (`github` flag), i18n `pages.*`, event `admin:area` detail `"pages"`.
- Produces: list view (7 trip cards + greyed visa card) → editor view with groups: `meta.*` fields under `pages.group.seo`, `hero.*` under `pages.group.hero`, hotel prices under `pages.group.prices`.

- [ ] **Step 1: Modify render.** Replace `renderForm(container)` and the boot listener with (everything else in the file — `FIELDS`, `getPath`, `setPath`, `escHtml`, `fieldInput`, `hotelPriceInputs`, `collectInto`, `loadTrip`, `save` — stays as-is; `loadTrip` now calls the new `renderEditor`, and `save`'s messages switch to `t()`):

```js
import { t, applyI18n } from "./i18n.js";

const GROUPS = [
  { key: "pages.group.seo", test: (p) => p.startsWith("meta.") },
  { key: "pages.group.hero", test: (p) => p.startsWith("hero.") },
];

function renderList(container) {
  container.innerHTML = `<div class="card"><h2 data-i18n="pages.title"></h2><div class="pagegrid" id="pg"></div></div>
    <div id="pages-banner"></div>`;
  applyI18n(container);
  const grid = container.querySelector("#pg");
  for (const s of SLUGS) {
    const b = document.createElement("button"); b.className = "pagecard";
    const tt = document.createElement("span"); tt.className = "t"; tt.textContent = s;
    const m = document.createElement("span"); m.className = "m"; m.textContent = t("pages.edit");
    b.append(tt, m);
    b.addEventListener("click", () => loadTrip(s));
    grid.appendChild(b);
  }
  const visa = document.createElement("div"); visa.className = "pagecard is-locked";
  const vt = document.createElement("span"); vt.className = "t"; vt.textContent = t("pages.visa");
  const vm = document.createElement("span"); vm.className = "m"; vm.textContent = t("pages.soon");
  visa.append(vt, vm); grid.appendChild(visa);
  const st = window.AT_ADMIN.status;
  if (st && !st.github) {
    const bn = document.createElement("p"); bn.className = "banner"; bn.textContent = t("pages.nogithub");
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
  container.querySelector("#ep-back").addEventListener("click", () => renderList(container));
  const st = window.AT_ADMIN.status;
  if (st && !st.github) {
    const btn = container.querySelector("#ep-save");
    btn.disabled = true;
    const bn = document.createElement("p"); bn.className = "banner"; bn.textContent = t("pages.nogithub");
    container.querySelector("#ep-msg").after(bn);
  } else {
    container.querySelector("#ep-save").addEventListener("click", save);
  }
}

let inited = false;
document.addEventListener("admin:area", (e) => {
  if (e.detail === "pages" && !inited) { inited = true; renderList(document.getElementById("area-pages")); }
});
```

In `loadTrip`, change the container lookup `el("tab-pages")` → `document.getElementById("area-pages")` and the final `renderForm(c)` → `renderEditor(c)`. In `save()`, replace the literal French strings with `t("pages.publishing")`, `t("pages.published")` etc. — keep the 422 bullet-list rendering intact (server messages stay French: they come from the validator).

- [ ] **Step 2: The FIELDS gate must still pass:**

Run: `node -e "import('./tools/check-admin-fields.mjs').then(m=>{const e=m.checkAdminFields(process.cwd());console.log(e.length?e:'GATE OK')})"` (from repo root)
Expected: `GATE OK`. Then `node tools/build.mjs --check` → `Build OK`.

- [ ] **Step 3: Remove the last `admin:tab` bridge** from app.js (the `"pages"` line) and delete the legacy comment.
- [ ] **Step 4: Syntax** — `node --input-type=module --check < site/admin/edit-pages.js` → OK.
- [ ] **Step 5: Commit**

```bash
git add site/admin/edit-pages.js site/admin/app.js
git commit -m "feat(admin): Pages — card list, grouped editor, honest no-GitHub banner; FIELDS untouched"
```

### Task 11: Beacon rollout to the public site

**Files:**
- Modify: `tools/templates/sections/scripts.tpl` (append include)
- Modify: every static `site/**/index.html` (scripted, idempotent)

- [ ] **Step 1: Append to `tools/templates/sections/scripts.tpl`** (before the closing `</body>` line, matching the include style of neighbors):

```html
<script type="module" src="../assets/js/beacon.js"></script>
```

- [ ] **Step 2: Add to all static pages** (idempotent; root page uses `assets/`, subdirs `../assets/`):

```bash
cd "C:/Users/ROG STRIX/Documents/alliance travel" && node -e '
const { readFileSync, writeFileSync, readdirSync } = require("fs");
const pages = ["site/index.html", ...readdirSync("site", { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "admin" && d.name !== "assets")
  .map((d) => `site/${d.name}/index.html`)
  .filter((p) => { try { readFileSync(p); return true; } catch { return false; } })];
let touched = 0;
for (const p of pages) {
  let html = readFileSync(p, "utf8");
  if (html.includes("beacon.js")) continue;
  const rel = p === "site/index.html" ? "assets/js/beacon.js" : "../assets/js/beacon.js";
  const tag = `<script type="module" src="${rel}"></script>`;
  if (!html.includes("</body>")) continue;
  html = html.replace("</body>", `  ${tag}\n</body>`);
  writeFileSync(p, html); touched++;
}
console.log("beacon added to", touched, "page(s)");'
```

- [ ] **Step 3: Rebuild trips** (template changed): `node tools/build.mjs` → `Build OK`, 7 rendered. Verify: `grep -rl "beacon.js" site --include=index.html | wc -l` ≥ 10.

- [ ] **Step 4: Live test** — preview `http://localhost:8880/egypte/?beacon=force`, then MCP `execute_sql`: `select kind, page, event, created_at from public.events order by created_at desc limit 5;` — expect a fresh `view` row (page `egypte`). Click a WhatsApp CTA in the preview → expect a `wa_click` row with the `data-track-event` name. Delete the test rows: `delete from public.events where created_at > now() - interval '15 minutes' and page in ('egypte');`

- [ ] **Step 5: Commit**

```bash
git add tools/templates/sections/scripts.tpl site
git commit -m "feat(analytics): beacon on every public page (templates + static), localhost-guarded"
```

### Task 12: Verification sweep + deploy

**Files:** none new.

- [ ] **Step 1: Full test suite** — `node --test site/assets/js/beacon.test.mjs site/admin/i18n.test.mjs api/status.test.mjs api/_lib/auth.test.mjs` → all pass. `node tools/build.mjs --check` → Build OK.

- [ ] **Step 2: Seed demo data** (MCP `execute_sql`) so screenshots aren't empty:

Every seed row is tagged `event = 'SEED'` so cleanup can never touch organic rows (the dashboard reads `kind`/`page` only, never `event`, so the tag is invisible in the UI):

```sql
insert into public.events (kind, page, event, created_at)
select 'view', p, 'SEED', now() - (i || ' hours')::interval
from unnest(array['egypte','istanbul','bali']) p, generate_series(1, 40) i;
insert into public.events (kind, page, event, created_at)
select 'wa_click', 'egypte', 'SEED', now() - (i || ' hours')::interval from generate_series(1, 6) i;
insert into public.leads (name, phone, city, trip, adults, kids, total_da, channel, page)
values ('Test Screenshot', '0561000000', 'BBA', 'Égypte · 5 programmes', 2, 1, 450000, 'whatsapp', '/egypte/');
```

- [ ] **Step 3: Screenshot pass** — deploy first (`vercel deploy --prod --yes`), then in the Browser pane on `https://alliancetravel34.vercel.app/admin/` (owner logs in — or reuse the live session): capture Accueil, Demandes, Pages at 375×812 and 1280×800, in FR and AR (`lang` pill). Verify in AR: layout mirrors, phone number `0561000000` reads left-to-right, KPI numerals unflipped.

- [ ] **Step 4: RLS sweep** (curl, as Task 1/2 verification, all four: anon insert 201, anon select raw 4xx, anon select view 4xx, anon rpc 4xx).

- [ ] **Step 5: Clean seeds** — `delete from public.events where event = 'SEED'; delete from public.leads where name = 'Test Screenshot';` — then `select count(*) from public.events where event = 'SEED';` → 0. Organic rows are untouched by construction.

- [ ] **Step 6: Final commit + push**

```bash
git add -u
git commit -m "chore(admin): Espace Alliance v1 verification pass"
git push origin integrate/unified-admin
vercel deploy --prod --yes
```

---

## Self-Review

- **Spec coverage:** §3 shell/nav → T6-7 · §4 Accueil → T8 · §5 pipeline → T1, T3, T11 · §6 Demandes/CRM → T2, T9 · §7 Pages → T10 · §8 Réglages → T7 · §9 visual/i18n → T5-6 · §10 api/status → T4 · §11 tests → per-task + T12 · §12 non-goals respected (no charts lib, no dark mode, no visa editor).
- **Placeholders:** the single deliberate `PASTE-FROM-lead-config.js` sentinel is resolved by an exact command (T3 S4). No TBDs.
- **Type consistency:** `update_lead_status(lead_id uuid, new_status text)` matches `leads.id uuid` (verified live) and the `.rpc()` call in T9. `events_daily(day,kind,page,n)` matches T8's reads. i18n keys used in T7-T10 all exist in T5's dict (checked key-by-key). `showArea`/`admin:area` names consistent across T7-T10.
```
