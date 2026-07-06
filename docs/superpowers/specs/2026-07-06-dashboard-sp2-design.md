# Sub-project 2 — One-login Owner Dashboard — Design Spec

**Date:** 2026-07-06
**Status:** Approved for planning
**Parent:** `docs/superpowers/specs/2026-07-04-unified-admin-design.md` (this spec details that overview's Sub-project 2 and resolves its open questions)
**Supersedes:** the Sveltia CMS admin (`site/admin/config.yml` + loader) and the GitHub-OAuth / Cloudflare-worker two-login path

---

## 1. Context

Sub-project 1 shipped and is verified: all 7 trip pages are generated from `data/trips/*.json` by the Aurora generator (`tools/build.mjs`), Vercel rebuilds on deploy (`buildCommand: node tools/build.mjs`), and the security headers/CSP are set. The static marketing site is deploy-ready on `integrate/unified-admin`.

What remains is the owner's control surface: a **single login** for a **non-technical** owner to (a) edit trip page fields without breaking pages, (b) track leads, and — later, Phase 3 — manage clients and sort documents.

Two facts discovered during design and now settled:

- **The `leads` table schema is known** (introspected via the Supabase MCP, not the anon key). Columns: `id` (uuid), `created_at` (timestamptz), `name` (≤200), `phone` (≤40), `city` (≤120), `trip` (≤200), `hotel` (≤200), `date` (≤80), `room` (≤40), `adults` (0–50), `kids` (0–50), `total_da` (bigint 0–100000000), `channel` (`whatsapp`|`email`|`copy`), `page` (≤200), `notes` (≤2000). RLS: anon may INSERT only; `authenticated` may SELECT when `is_lead_reader()` passes (checks the `lead_readers` allowlist, currently 1 row: the owner's email). This unblocks the previously-blocked Task 10 (leads capture).
- **The other session's Sveltia `config.yml`** is a complete, validated field-map of the trip schema (hero, 4 highlights, itinerary columns/days, inclus, 4–5 FAQ, hotels with 6-tier prices, 4 infoBlocks, finalCta, advanced JSON blobs). It is reused as the blueprint for our own Edit-Pages form, then the Sveltia UI itself is retired.

## 2. Goals

1. **One login** — Supabase magic-link, owner email allowlisted. No password, no GitHub, no second system.
2. **Edit page fields without breaking pages** — a form over the trip content; every save is validated by the generator's own rules before it can reach the live site.
3. **Track leads** — an authenticated table of the live `leads`, with search and CSV export.
4. **Capture leads** — wire the public booking/quote form to insert into `leads` (Task 10), non-blocking, WhatsApp/email stays primary.
5. **Secure** — RLS default-deny; the only server-side secret is a single-repo GitHub PAT; owner-entered content is XSS-encoded by the generator.

### Non-goals (YAGNI)
Client-facing portal or accounts, multi-user roles/permissions, billing, analytics dashboards, live/per-request dynamic content on the marketing site, WYSIWYG rich-text. Owner-only, single login, the capabilities above. Clients + Documents are **Phase 3**, out of scope here.

## 3. Architecture decision (locked: Option A)

**Content stays as `data/trips/*.json` in git (the SP1 source of truth). A Supabase-token-gated Vercel serverless function validates an edit and commits it; Vercel auto-rebuilds.** The database (Supabase) is used for what databases are good at — identity/auth and leads (and later clients/documents) — not for the 7 build-time content documents.

**Why A over "migrate content into Supabase" (B):** SP1 already built and verified the JSON→generator→Vercel pipeline; A reuses it 100% while B forks/rewrites the generator's data source. Git gives version history, audit, and one-click rollback for free; B would rebuild those by hand. For a single non-technical owner (no concurrency need), A is less code, safer, and the owner's experience (form → Save → live in ~1 min) is identical either way. The overview spec (§6) had tentatively leaned B, but that predated SP1's completion; with the pipeline built, the calculus flips to A. B's only real gain — "no GitHub token" — is minor, and A's token has a *smaller* blast radius than the service-role key B would need.

## 4. Components

Each unit has one purpose, a defined interface, and can be understood/tested independently.

### 4.1 Dashboard app — `site/admin/`
- Vanilla HTML/CSS/JS; `supabase-js` from CDN; no build step; `<meta name="robots" content="noindex">`.
- **Auth gate:** on load, check for a valid Supabase session. No session → render only the login screen (email input → magic-link). With session → render the tabbed app. Logout clears the session.
- **Structure:** a login view + a tabbed shell (Edit Pages, Leads). Files kept small and focused (e.g. `admin.html`, `admin.css`, `auth.js`, `edit-pages.js`, `leads.js`, `admin-config.js` holding the public Supabase url/anon key).
- Replaces `site/admin/config.yml` and the Sveltia loader (both deleted).

### 4.2 Edit Pages
- Choose a trip (7 slugs) → load its current `data/trips/<slug>.json`. **Note:** `data/` is generator *input*, not deployed output (`outputDirectory: site`), so it is not served on the live site — the dashboard reads it through a companion endpoint `GET /api/get-trip?slug=<slug>` (§4.6), which returns the current file content **and its GitHub SHA** (the SHA is required by the commit step). Same auth gate as the save path.
- **High-value fields as real form inputs:** hero eyebrow/title/lede/priceFrom/priceUnit/date; hotel tariffs (the 6 prices per hotel) + displayed priceFrom; FAQ questions/answers; itinerary day titles/activities; finalCta text. (Exact field list finalized in the plan.)
- **Advanced (raw JSON) panel** for everything else — a guarded `<textarea>` of the remaining structure, parsed + validated on save. This guarantees "all content editable" without hand-building every widget up front.
- Save merges form changes into the full JSON and POSTs to `/api/save-trip`. On success: "Published — live in ~1 minute", with a link. On validation failure: readable per-field errors, nothing committed.

### 4.3 Leads
- Authenticated `supabase.from('leads').select('*').order('created_at', {ascending:false})` — RLS returns rows only for allowlisted readers.
- Table of the real columns; client-side search/filter; CSV export (build a Blob client-side, no server). Empty state when there are no leads yet.

### 4.4 Save function — `api/save-trip.js` (Vercel Node serverless function)
Interface: `POST { slug, content, sha }` + `Authorization: Bearer <supabase access token>` (the `sha` is the revision the dashboard loaded via §4.6). Steps:
1. **Authenticate** — forward the bearer token to Supabase `GET /auth/v1/user`; read the email; reject unless it's on the admin allowlist. (No service-role key: identity is proven by the user's own token.)
2. **Validate** — run the generator's schema validator (`tools/build.mjs` validation path, imported) on `content`. Invalid → `422` with the collected errors; nothing else runs.
3. **Dry-run render** — render that slug in memory with the generator to confirm it produces valid HTML (belt-and-suspenders). Failure → `422`.
4. **Commit** — PUT `data/trips/<slug>.json` to GitHub via the REST contents API with the supplied `sha` (fine-grained PAT: this repo, contents-write; from Vercel env). Commit message `content(<slug>): edit via dashboard by <email>`. If GitHub rejects on a stale SHA (someone edited in between — rare for a single owner), re-fetch the SHA and retry once, else return `409 Conflict`. Return `200` + commit URL.
- Stateless; holds no data; the only secret it reads is `GITHUB_PAT` (+ the public Supabase url).

### 4.6 Read function — `api/get-trip.js` (Vercel Node serverless function)
Interface: `GET ?slug=<slug>` + `Authorization: Bearer <supabase access token>`. Authenticates the same way as §4.4 (Supabase `/auth/v1/user` + allowlist), then reads `data/trips/<slug>.json` from GitHub via the contents API and returns `{ content, sha }`. The dashboard keeps the `sha` and sends it back with the save so the commit targets the exact revision it edited. Shares the auth + GitHub-client code with `save-trip`.

### 4.5 Leads capture — `site/assets/js/lead-capture.js`
- On the booking/quote submit, fire-and-forget `supabase.from('leads').insert({ name, phone, city, trip, hotel, date, room, adults, kids, total_da, channel, page, notes })` mapped to the exact columns, clamped to the DB length/range checks.
- **Non-blocking:** the WhatsApp/email CTA proceeds immediately regardless of the insert's outcome; a failed insert never delays or blocks the owner's lead. Re-added to `scripts.tpl`. CSP `connect-src` already includes the Supabase origin.

## 5. Data flow

**Load for edit:** dashboard → `GET /api/get-trip?slug` (Bearer JWT) → verify identity → read `data/trips/<slug>.json` + SHA from GitHub → dashboard renders the form.

**Save (edit → live):** form → merge into full JSON → `POST /api/save-trip { slug, content, sha }` (Bearer JWT) → verify identity (Supabase `/auth/v1/user`) → validate (generator rules) → dry-run render → commit `data/trips/<slug>.json` to GitHub → Vercel auto-build (`node tools/build.mjs`) → live in ~1–2 min → dashboard confirms.

**Leads in:** visitor submits booking form → `lead-capture.js` inserts into `leads` (anon, INSERT-only RLS) → non-blocking, primary CTA continues.

**Leads out:** owner (allowlisted, authenticated) → dashboard SELECT → RLS `is_lead_reader()` returns their rows → table + CSV.

**Rollback:** every save is a git commit → `git log` is the audit trail, `git revert` is one-click undo; a "Restore previous version" button can wrap this later.

## 6. Security model

- Supabase RLS default-deny on every table. Anon: INSERT `leads` only. Authenticated + allowlist: SELECT `leads` (and future clients/docs).
- **Server-side secrets, Vercel env only, never in the browser, never logged:** the GitHub fine-grained PAT (single repo, contents-write). **No Supabase service-role key** — the function verifies identity via the user's own token against `/auth/v1/user`. A full compromise of the function therefore leaks only a single-repo PAT, not the database.
- **Client holds only public values:** the Supabase project URL + anon key (public by design; RLS is the real guard).
- Generator XSS-safe encoders (`.security-hardening/04-critical-fixes.md`) neutralize owner-entered content so a page edit can't inject script into the live site.
- `/admin` is `noindex`. The admin allowlist is a Supabase table (reuse/extend the `lead_readers` pattern, e.g. an `admins` table or a shared allowlist), checked both in RLS (reads) and in `/api/save-trip` (writes).

## 7. Reuse / add / retire

- **Reuse:** the SP1 JSON→generator→Vercel pipeline and its validator; the `leads` table + RLS; the trip field-map (from the Sveltia config); the existing Supabase project (`vxblgxiamtphabfswnxb`).
- **Add:** `site/admin/` app (login + Edit Pages + Leads); `api/save-trip.js` + `api/get-trip.js` (sharing an auth + GitHub-client helper); `site/assets/js/lead-capture.js`; the admin allowlist; a GitHub fine-grained PAT (owner creates); Vercel env vars (`GITHUB_PAT`, repo owner/name, Supabase url).
- **Retire:** `site/admin/config.yml` + the Sveltia CDN loader; the GitHub-OAuth / Cloudflare-worker path; the leaked Cloudflare token (owner rotates).

## 8. Testing & verification

- **Unit (function logic):** a valid edit passes the validator + dry-run render; a malformed edit (wrong type, missing required field, script injection attempt) is rejected with readable errors and does **not** commit; a request without/with a non-allowlisted token is rejected.
- **Integration (staged):** magic-link login works; a price edit commits and the page updates within ~2 min; a bad edit is blocked with a clear message and the live page is untouched; a lead submitted on a page appears in the dashboard; a non-allowlisted email can neither read leads nor save.
- **Security checks:** view-source + network show no server-side secret in the browser; RLS blocks a non-owner from reading leads; owner-entered `<script>` renders inert (encoded) on the live page.

## 9. Build order (feeds the plan)

1. **Leads capture** (`lead-capture.js` + wire form + re-add to `scripts.tpl`) — small, unblocks lead tracking immediately, independently verifiable.
2. **`api/get-trip` + `api/save-trip`** — the shared auth + GitHub helper, the read (content + SHA), and validate + dry-run + commit; the "can't break the page" core.
3. **Dashboard shell** — magic-link auth + allowlist gate + tab scaffold.
4. **Leads tab** — read + search + CSV.
5. **Edit Pages** — high-value fields + guarded raw-JSON panel, wired to `/api/save-trip`.
6. **End-to-end verification** — the staged + security checks in §8.

Phase 3 (Clients, Documents) is a separate spec later.

## 10. Risks / open questions (resolve in planning)

- **Vercel functions on a static project:** confirm `/api/*.js` functions run alongside `outputDirectory: site` (they do — Vercel picks up a repo-root `api/` dir; verify in the plan).
- **Importing the validator server-side:** `tools/build.mjs` must expose its validation (and single-slug render) as importable functions for the serverless runtime (small refactor; keep the CLI behavior intact).
- **GitHub commit needs the current file SHA** (contents API); `get-trip` returns it at load and the dashboard passes it back to `save-trip`, which retries once on a stale-SHA rejection. Single-owner use means richer conflict handling is unnecessary for v1.
- **Exact high-value field list** for the Edit-Pages form — finalize in the plan against the Sveltia field-map.
- **Admin allowlist shape** — new `admins` table vs reuse `lead_readers`; decide in the plan.

## 11. Success criteria

The owner opens `/admin`, logs in once with a magic link, changes a trip's price, saves, and sees the live page update within ~2 minutes; a deliberately broken edit is refused without touching the live site; the owner sees and exports leads; no non-owner can read leads or save; no server-side secret is present in the browser.
