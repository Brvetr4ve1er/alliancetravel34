# Espace Alliance — owner dashboard v1 (admin redesign)

**Date:** 2026-07-21 · **Status:** approved by owner · **Predecessor:** SP2 admin skeleton (`docs/superpowers/specs/2026-07-06-dashboard-sp2-design.md`)

## 1. Problem

The SP2 admin is a functional safety skeleton with developer-grade UI. The owner's verdict on first login: not good-looking, nothing useful to monitor, unclear control. This spec turns `/admin/` into an owner-facing product — phone-first, branded, French/Arabic — while staying the container that M2 (i18n contract + value graph) and M3 (full editing coverage) later fill. It does **not** expand editing coverage itself.

## 2. Decisions (owner-confirmed)

| Question | Decision |
|---|---|
| Metrics scope | **Full funnel**: visites → clics WhatsApp → demandes (new collection required — site currently collects nothing) |
| Device | **Phone-first**; desktop is the enlargement |
| Admin language | **FR + AR toggle** with full RTL |
| Look | **The site's own brand** (green `#237a4a`, DM Sans, site token scale) |
| Approach | **A** — shell + dashboard now; M2/M3 grow editing inside it |
| Lead follow-up | **Minimal CRM**: status Nouveau → Contacté → Conclu |

## 3. Information architecture

Bottom nav (mobile, 48px targets) / left rail (≥900px): **Accueil · Demandes · Pages · Réglages**.
Login flow keeps all current logic (password-first, magic-link fallback, PASSWORD_RECOVERY interception, `frAuthError`, session-preserving 404 handling) — restyled only. Header carries the FR/عربي pill; AR sets `dir="rtl"` on the admin root and applies the bidi isolation rules proven on the public site (`fb7aaf0`): phone numbers, amounts (DA), and dates render in LTR isolates.

## 4. Accueil

- **KPI tiles ×3** — Visites · Clics WhatsApp · Demandes: 7-day count + delta vs previous 7 days. Tap → per-trip breakdown list (page, count), same window.
- **Funnel strip** — one CSS bar, plain-French caption: « Sur N visites, N₁ ont cliqué WhatsApp, N₂ ont laissé une demande. »
- **Dernières demandes** — 3 newest leads as cards (name, trip, party, total_da, age) with direct `tel:` and `wa.me` action buttons.
- **État du site** — last publish (commit author/date on `data/trips/` via GitHub API, `verifyAdmin`-gated `/api/status`), plus config health line. Degrades to « Publication non configurée — jeton GitHub manquant » when `GITHUB_TOKEN` is absent; never a raw error.
- **Empty states are first-class** (leads table currently has 0 rows): every tile self-explains on zero — e.g. « Les visites apparaîtront dès demain — le compteur vient d'être activé. »

## 5. Funnel pipeline (new data collection)

- **Table `public.events`**: `id uuid pk default gen_random_uuid(), created_at timestamptz default now(), kind text check (kind in ('view','wa_click')), page text, event text`. `page` from `body[data-page]`; `event` is the existing `data-track-event` value for clicks, null for views. **No PII, no cookies, no fingerprints, no IP storage** → no consent banner; privacy-notice task #73 stays truthful.
- **RLS**: anon INSERT with kind whitelist + `char_length(page) <= 64` + `char_length(coalesce(event,'')) <= 64`; **no SELECT for anon or authenticated on the raw table**. Reads go only through **view `events_daily`** (`date, kind, page, count`) with SELECT gated `authenticated` + `is_lead_reader()` (same boundary as leads).
- **Beacon** `site/assets/js/beacon.js` (~40 lines, zero deps): one `view` per page load, one `wa_click` per click on `[data-track-event]` (these attributes already exist on every WhatsApp/phone CTA and currently go nowhere). Transport is `fetch(..., { keepalive: true })` with the `apikey` header — the exact pattern `lead-capture.js` already uses in production (`navigator.sendBeacon` is ruled out: it cannot set the `apikey` header PostgREST requires). Fails silently; never blocks the page. CSP already permits Supabase on `connect-src`; no new domains.
- **Admin reads** use the existing browser Supabase client against `events_daily` only.

## 6. Demandes (inbox + minimal CRM)

- Mobile: cards (name, city, trip, party `adults+kids`, `total_da`, channel icon, relative age). Desktop: table. Tap → detail sheet: all lead fields + notes.
- **Status chip** cycles `nouveau → contacté → conclu`. Schema: `alter table leads add column status text not null default 'nouveau' check (status in ('nouveau','contacté','conclu'))`. Writes ONLY via `security definer` function `update_lead_status(lead_id uuid, new_status text)` — validates the enum, requires `is_lead_reader()`, touches nothing else. `EXECUTE` granted to `authenticated` only (same lockdown pattern as `is_lead_reader`, migration `lock_down_is_lead_reader_execute`). No generic UPDATE policy on `leads`.
- Filters: status, trip, free-text search (existing). CSV export stays and gains the status column.
- Lead rendering keeps the `createElement`/`textContent` XSS discipline — leads are attacker-controlled input.

## 7. Pages

- Trip list as cards (existing og thumbnail, « modifié le … » from `/api/status` data when available).
- Editor: today's exact field set regrouped under French headings (SEO / Héro / Tarifs hôtels); raw-JSON textarea demoted to collapsed « Avancé — réservé au développeur » with warning text. **No new fields** — `FIELDS` untouched, `tools/check-admin-fields.mjs` gate still applies.
- A greyed card « Rendez-vous visa — bientôt » sets the M4 expectation.
- `GITHUB_TOKEN` absent ⇒ banner replaces the Publier button (copy above). Save path, 422 error rendering, SHA handling: unchanged.

## 8. Réglages

Password change (existing `updateUser` flow), language preference (persisted `localStorage`, same key family as `at_admin_email`), logout, and a read-only **Configuration** list: Supabase ✓/✗ (from `/api/me` reachability), GitHub ✓/✗ (from `/api/status`), branche de publication (`GITHUB_BRANCH`). Today's debugging, productized as a glanceable health check.

## 9. Visual system

Light theme from the site's tokens: warm off-white ground, white cards, soft shadows; **primary `#237a4a`**, gold `#c9872e` demoted to accents/deltas; DM Sans (same Google Fonts URL family as the site); spacing/typography via the site's `--space-*` / `--fs-*` scale (copied constants, not a CSS import — the admin stays standalone). All admin strings move to a small FR/AR dict in one file (`site/admin/i18n.js`), ~80 keys; `dir` flip + logical CSS properties (`margin-inline-*`) so RTL is layout-native, with LTR isolates on numerals.

## 10. API changes

- **New `api/status.mjs`** (`verifyAdmin`-gated): `{ lastPublish: {date, author, message} | null, github: boolean, branch: string | null }` — one GitHub commits-list call scoped to `data/trips/`; `github:false` (not an error) when the token is missing/invalid.
- `api/me.mjs`, `api/get-trip.mjs`, `api/save-trip.mjs`: **unchanged**. Env reads continue through `supabaseEnv()` (`AT_`-prefix precedence, `275dcec`) — `api/status.mjs` uses it too.

## 11. Error handling & testing

- Every remote read has three states: loading (skeleton), data, and a French failure line with retry — never a blank region, never a raw status code (the `frAuthError` philosophy generalized).
- Tests: payload builder for the beacon (node:test, matching `auth.test.mjs` style); RLS verification (anon insert OK / anon+authenticated raw select rejected / `events_daily` gated); `update_lead_status` rejects bad enum + non-reader callers; screenshot pass at 375px/1280px × FR/AR on seeded data.
- Build gate unchanged; `node tools/build.mjs --check` must stay green (admin files aren't rendered by it, but `check-admin-fields` reads `edit-pages.js`, which gets restyled — the `FIELDS` block format must survive or the gate fails loudly, which is correct).

## 12. Non-goals (v1)

No chart library (CSS bars only) · no historical exports · no multi-user/roles · no dark mode · no visa editing (M4) · no editing-coverage expansion (M2/M3) · no Vercel-deploy status (needs a Vercel token we don't hold) · no IP/geo analytics.

## 13. Composition with the roadmap

M2's stale-flagging UI and value-graph controls land as new field groups **inside** Pages; M3 extends the same groups; M4 replaces the greyed visa card with a real editor behind the generalized write endpoint. The funnel pipeline is independent of all three. Nothing in this spec is throwaway.
