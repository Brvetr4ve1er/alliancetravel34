# Unified Admin Dashboard — Design Spec

**Date:** 2026-07-04
**Status:** Draft for review
**Supersedes:** the paused Sveltia-CMS admin plan (`docs/ADMIN-DASHBOARD-PLAN.md`, on branch `claude/admin-dashboard-owner-h7oydx`)

---

## 1. Problem

The project fragmented across ≥5 branches from different AI sessions, several editing the same files incompatibly:

| Branch | Has | Missing |
|---|---|---|
| `feat/hero-redesign` (this session, +17) | New **Aurora design**, nav/resize/theme fixes, i18n, **Vercel** config, cleanup | Not owner-editable (hand-coded HTML), no leads |
| `claude/admin-dashboard-owner-h7oydx` (+7) | **Data-driven** trips (`data/trips/*.json` + generator), **Sveltia CMS**, **live Supabase leads**, blog, site settings | **Old design**; Cloudflare-oriented; no Vercel |
| `main`, `claude/test-coverage-*`, `copilot/*` | Misc hardening, tests | — |

The two main branches differ by **~2,900 lines across 9 trip pages** — they are two *eras* of the site (new design vs data-driven old design) and conflict on nearly every page. A naive merge fails; even resolved, the architectures fight (regeneration re-emits the old design, or the CMS can't edit the new hand-coded pages).

Separately, the owner's goals have outgrown a CMS: he wants **one login** to edit pages **and** track leads/clients **and** sort documents — the last three need a real backend (DB + storage + auth), which a static site / Git-CMS cannot provide. The Sveltia approach also forces **two logins** (GitHub OAuth for pages + Supabase magic-link for leads).

## 2. Goals (owner's words)

1. A pretty, optimized **production website** (already achieved on `feat/hero-redesign`).
2. **One** admin login for a **non-technical** owner who wants to "feel in control."
3. **Edit page fields** (prices, dates, hotels, itinerary, FAQ, text, photos).
4. **Track leads and clients.**
5. **Sort received documents** (owner-entered/uploaded — no client-facing portal; decided).
6. **Secure.**

## 3. Architecture decision

**Host: Vercel. Backend: Supabase (reuse the existing project).** Keep the marketing site **static** (fast, SEO, cheap); add a **custom one-login admin** backed by Supabase for the dynamic parts.

- **Static marketing site** — generated HTML, served by Vercel. Unchanged visitor experience.
- **Supabase** — single source of truth for dynamic data + identity:
  - **Auth:** magic-link, single owner email (no password to forget). RLS on every table.
  - **Postgres:** `trips` (page content), `leads` (already live), later `clients`, `documents` metadata.
  - **Storage:** documents (private bucket, signed URLs), later.
- **Data-driven pages, new design:** the generator renders **the Aurora design** from trip content. Content lives in Supabase; a **Vercel deploy hook** rebuilds the static site when the owner saves an edit.
- **One login:** everything (edit pages, leads, clients, docs) sits behind the same Supabase session. Sveltia CMS and GitHub OAuth are **dropped**; the owner never sees GitHub or a token.

**Reused from the admin session:** the `data/trips/*.json` content extraction, the generator concept, and the live Supabase project + client-side leads capture. **Replaced:** the Sveltia editing UI + GitHub-OAuth login.

## 4. Decomposition (build in this order)

### Sub-project 1 — Foundation: one unified branch (do first)
Goal: a single branch that deploys a **pretty + data-driven** site to Vercel, with leads capture live.

Steps:
1. **Declare `feat/hero-redesign` the integration branch** (it has the polished design + Vercel + fixes). Freeze the other sessions/branches; cherry-pick only deliberate bits from them.
2. **Bring in the trip content JSON** (`data/trips/*.json`, 7 trips) from the admin branch. The content (prices/itinerary/hotels/FAQ) is design-independent, so it's reusable; reconcile any values against the source-of-truth brochures.
3. **Upgrade the generator** (adapt the admin branch's `tools/build.mjs` / template) to emit the **Aurora design** — i.e. "templatize" the 7 hand-designed pages so JSON → new-design HTML. Use the hardened output-encoding layer from `.security-hardening/04-critical-fixes.md` (XSS-safe).
4. **Verify design parity:** each generated trip page must match the current hand-designed page (diff + browser check, all viewports/themes/RTL).
5. **Wire Supabase leads capture** into the lead/quote form (client-side anon insert).
6. **Confirm Vercel build:** `buildCommand` runs the generator; `outputDirectory: site`. Keep the existing `vercel.json` headers/CSP (extend CSP for Supabase origin).

Exit criteria: one branch, `git push`, Vercel deploys the pretty data-driven site, a test lead lands in Supabase, all trip pages match the design.

### Sub-project 2 — One-login dashboard (MVP)
Goal: the owner logs in once and can edit pages + see leads.

- **Auth:** Supabase magic-link; owner email allowlisted. Dashboard at `/admin` (edge-gated).
- **Edit Pages:** form UI over the `trips` content (mirrors the fields the generator needs). On save → write to Supabase → trigger the Vercel deploy hook → site rebuilds in ~1–2 min. Validation + governance lint before save (no forbidden content, valid types) so a bad edit can't break the live site.
- **Leads:** table view of the live `leads` (read via authenticated session + RLS allowlist).
- **Tech:** lightweight — either static HTML+JS using `supabase-js` (matches the no-build ethos) or a minimal framework; decide in the plan. No secrets in the browser (anon key only; privileged actions via Vercel serverless functions with the service role key server-side).

Exit criteria: owner logs in once, changes a price, saves, sees the live site update; owner sees leads.

### Sub-project 3 — Clients + Documents (later)
- **Clients:** `clients` table (owner-entered), linked to leads/trips.
- **Documents:** private Supabase Storage bucket; owner uploads + tags/sorts; metadata in a `documents` table. Signed URLs, RLS.

## 5. Security model

- One identity (Supabase Auth), RLS default-deny on every table; owner email allowlisted for reads/writes.
- Anon key (public) can only INSERT leads; everything else requires the authenticated session.
- Service-role key only in Vercel serverless functions (never shipped to the browser, never logged).
- Generator uses the XSS-safe encoders (`.security-hardening/04-critical-fixes.md`) so owner-entered content can't inject script into the live site.
- CSP extended to allow the Supabase origin for the dashboard only.
- Documents in a **private** bucket, access via short-lived signed URLs.
- Retire the leaked Cloudflare token; retire Sveltia's GitHub-OAuth path.

## 6. Risks / open questions

- **Content model migration:** does the admin branch's JSON carry every field the Aurora template needs (hero eyebrow/offer bar/etc.)? Its schema looked rich; confirm during Sub-project 1.
- **Generator data source:** JSON-in-git vs content-in-Supabase. Recommendation: content in Supabase (unifies auth+data, no GitHub token for the owner), seeded from the JSON. Confirm in Sub-project 2 planning.
- **Branch consolidation is delicate** — do it on a fresh integration branch, keep the others intact as backup until verified.
- **Effort:** Sub-project 1 ≈ the generator/templatize work (~1 day). Sub-project 2 ≈ a small app (~1–2 days). Sub-project 3 later.
- **Maintenance:** a custom dashboard is ongoing to maintain vs a hosted CMS — accepted trade-off for the one-login/non-technical goal.

## 7. Not doing (YAGNI)
Client-facing portal/accounts, multi-user roles, billing, analytics dashboards — out of scope. Owner-only, single login, the four capabilities above.
