# Alliance Travel

Marketing website **and** owner-run CMS for **Alliance Travel**, a French-language travel
agency in **Bordj Bou Arreridj (BBA), Algeria** with branches in BBA and M'Sila.

The public site is a set of static, hand-tuned trip pages (guided tours to Istanbul, Egypt,
Azerbaijan, Kuala Lumpur, Bali, Vietnam, Tunisia, …) plus a homepage, a trips index, a blog,
and a visa-appointment page. The agency owner — who does not write code — edits prices, dates,
and copy through a password-protected dashboard at `/admin/`; every save is validated, committed,
and redeployed automatically.

- **Default language:** French. English and Arabic (RTL) render as separate per-language URLs.
- **No npm dependencies.** Everything runs on Node's standard library. Node **22.x**.
- **Build:** `node tools/build.mjs` · **Tests:** `node --test`
- **Hosting:** Vercel (single host — build + static hosting + serverless API).

---

## How it works

The site is **data-driven**. Each trip is a JSON file; the build renders it to static HTML.

```
data/trips/<slug>.json      ──►  tools/build.mjs  ──►  site/<slug>/index.html
data/build-manifest.json         (validate + render)   site/<lang>/<slug>/index.html
data/blog/*.md                                          site/blog/<slug>/index.html
```

- **`tools/build.mjs`** validates **every** `data/trips/*.json` against the schema on each run
  (`tools/validate-trip.mjs`), then renders only the trips marked `enabled: true` in
  `data/build-manifest.json`. Any validation error → **exit 1**, so a broken edit aborts the
  deploy and the live site keeps its last-good version. This is the "the owner can't break the
  site" gate.
- **Templating** is a small custom engine (`tools/templates/engine.mjs`) that assembles section
  templates (`tools/templates/sections/*.tpl`) into a page via `tools/templates/trip2.mjs`. No
  framework, no bundler.
- **Per-language URLs:** the French page is written to `site/<slug>/`; each additional language a
  trip declares in the manifest's `langs` array is rendered by `tools/templates/langpage.mjs` to
  `site/<lang>/<slug>/` (e.g. `/en/azerbaidjan/`) with a reciprocal `hreflang` cluster. A trip with
  only `["fr"]` is emitted byte-for-byte and never passes through the localizer. Arabic variants get
  `<html lang="ar" dir="rtl">`.
- **Blog:** Markdown in `data/blog/` is rendered to `site/blog/` and injected into `sitemap.xml`.

Today's manifest publishes 7 trips (all in French; **Azerbaijan** is also published in English at
`/en/azerbaidjan/` as the first per-language pilot).

## The CMS (owner dashboard)

A real backend powers owner edits — this is **not** a static-only project.

- **Dashboard:** `site/admin/` (vanilla JS, served at `/admin/`, `noindex`). Tabs: Accueil
  (analytics), Demandes (leads inbox), Pages (trip editor), Réglages. UI is French/Arabic.
- **Auth:** Supabase — magic-link **or** password sign-in. The caller's Supabase token is verified
  server-side and the email checked against an `ADMIN_EMAILS` allowlist (`api/_lib/auth.mjs`).
- **Serverless API** (`api/*.mjs`, Vercel functions):
  - `me` — confirm the caller is an allowlisted admin.
  - `status` — GitHub/publish health for the dashboard.
  - `get-trip` — return a trip's current JSON + GitHub SHA.
  - `save-trip` — **validate → dry-run render → commit** `data/trips/<slug>.json` to GitHub. A bad
    edit is rejected (HTTP 422), never committed.
  - `notify-lead` — optional owner email alert on a new lead (dormant until secrets are set).
- **Persistence = Git.** Saving commits the JSON to the repo via the GitHub Contents API
  (`api/_lib/github.mjs`). That commit triggers a fresh Vercel build (`node tools/build.mjs`) and
  redeploy — so **Publier** in the dashboard means *commit + rebuild + redeploy*, live in ~1 minute.
  Because every save is a commit, the full edit history is the audit trail.
- **Leads:** the public pages capture inquiries into a Supabase `leads` table and open a pre-filled
  **WhatsApp** message (`wa.me/213…`). The owner reviews them in the **Demandes** inbox and can export
  them to CSV.

## Deployment

Hosted on **Vercel** (single host). `vercel.json` sets `buildCommand: node tools/build.mjs`,
`outputDirectory: site`, clean URLs, trailing slashes, security headers (CSP, HSTS, …), and the
old-slug redirects. See **[`docs/DEPLOY-HOSTING.md`](docs/DEPLOY-HOSTING.md)** for hosting details.
Environment variables (Supabase, GitHub token/repo/branch, optional email alert) are documented in
**[`docs/admin-setup.md`](docs/admin-setup.md)**.

---

## Local development

Requires Node **22.x**. No `npm install` — there are no dependencies.

```bash
# Validate every trip and render the manifest-enabled ones into site/
node tools/build.mjs

# Validate + render-check only, never writes (what CI runs)
node tools/build.mjs --check      # = npm run build:check

# Run the test suite (Node's built-in runner)
node --test                       # = npm test

# Preview the built static site (any static server works)
python3 -m http.server 5500 --directory site
```

Open <http://localhost:5500/>. Note: `/api/*` and Supabase-backed features (login, dashboard,
leads) do **not** run under a plain static preview — they need the Vercel runtime and env vars.
The admin login screen detects this and says so rather than failing silently.

## Repository layout

```
data/
  trips/*.json            trip content (the source of truth) + SCHEMA.md
  build-manifest.json     which trips publish, and in which languages
  blog/*.md               blog posts
  site.json               site-wide config (base URL, etc.)
tools/
  build.mjs               the build (validate + render)
  validate-trip.mjs       trip schema validation
  check-admin-fields.mjs  guards that every dashboard field maps to a rendered field
  templates/              custom template engine, sections/, langpage/localize (i18n)
  *.test.mjs              tests (run by `node --test`)
api/
  *.mjs                   Vercel serverless functions (the CMS backend)
  _lib/                   auth + GitHub client
site/
  index.html, <slug>/     the built, deployed static site
  en/…                    per-language variants
  admin/                  the owner dashboard (source, not generated)
  assets/                 css, js, images, fonts
docs/                     documentation (see below)
vercel.json               Vercel build + hosting config
package.json              scripts + Node engine (no dependencies)
```

## Documentation

- **[`docs/RUNBOOK.md`](docs/RUNBOOK.md)** — plain-language guide for the agency owner (editing
  pages, publishing, undoing a bad publish, reading leads, what to do if the site looks broken).
- **[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)** — branch/PR conventions and the CI gate.
- **[`docs/admin-setup.md`](docs/admin-setup.md)** — one-time setup of the dashboard, env vars, and secrets.
- **[`docs/DEPLOY-HOSTING.md`](docs/DEPLOY-HOSTING.md)** — Vercel hosting and `vercel.json`.
- **[`data/trips/SCHEMA.md`](data/trips/SCHEMA.md)** — the trip JSON schema.
- **[`docs/reference/I18N-SEO.md`](docs/reference/I18N-SEO.md)** — the per-language URL / i18n model.
- **[`docs/PROJECT-BIBLE.md`](docs/PROJECT-BIBLE.md)** — deep background and design decisions.

## Contributing

Default branch is **`integrate/unified-admin`**. Branch off it, open a PR, let CI
(`node --test` + `node tools/build.mjs --check`) pass, then merge and delete the branch.
See **[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)**.
