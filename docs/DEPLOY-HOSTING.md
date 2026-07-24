# Deployment & Hosting

**Vercel is the single production host** for Alliance Travel. The site is a
static build (`node tools/build.mjs` → `site/`) served by Vercel, plus the
serverless functions under `api/`.

There is exactly one deploy configuration in the repo: **`vercel.json`**. It
owns the build command, output directory, URL normalization, **all redirects**,
and **all response headers** (security + caching). Do not reintroduce
host-specific config for any other platform.

## History: Netlify and Cloudflare Pages were retired

The repo previously carried configs for three hosts at once, so every push
triggered a build on all three. Cloudflare Pages had been failing for weeks (a
dead integration), and that recurring red masked a real Vercel build failure.
The project is now consolidated onto Vercel only.

The host-specific config files were removed (commit `520663e`,
"retire Cloudflare/Netlify"):

| File | Host | Replaced by |
|------|------|-------------|
| `netlify.toml` | Netlify | `vercel.json` |
| `wrangler.toml` | Cloudflare Pages | `vercel.json` |
| `site/_headers` | Cloudflare Pages / Netlify | `vercel.json` → `headers` |
| `site/_redirects` | Cloudflare Pages / Netlify | `vercel.json` → `redirects` |
| `.github/workflows/deploy.yml` | (multi-host CI deploy) | Vercel's own Git integration |

As of this writing none of these files exist in the repo, and no other
Netlify/Cloudflare artifacts (`_worker.js`, `_routes.json`, `.cloudflare/`,
`netlify/`) are present.

## Manual step still required (owner, in the dashboards)

Removing the repo-level config stops the repo from *feeding* the other hosts,
but it does **not** disconnect them. The other two hosts may still be subscribed
to this GitHub repo and will keep attempting builds (Cloudflare failing, Netlify
building a now-config-less site). To fully stop the noise, the owner must:

1. **Cloudflare Pages** — remove/disconnect the GitHub integration for this repo
   in the Cloudflare dashboard (Pages → project → Settings → disconnect Git, or
   delete the Pages project).
2. **Netlify** — unlink/disconnect the site from this GitHub repo in the Netlify
   dashboard (Site configuration → Build & deploy → disconnect repository, or
   delete the site).

Until those two dashboard actions are done, this repo change alone will not stop
their build attempts.

## Rules now living solely in `vercel.json`

Recorded here so nothing is lost to institutional memory. `vercel.json` is the
source of truth — if these ever disagree with it, `vercel.json` wins.

### URL normalization (platform-level, replaces old explicit slash redirects)

- `"cleanUrls": true` — serve `/foo` for `/foo/index.html`.
- `"trailingSlash": true` — canonicalize to a trailing slash. This replaces the
  old `site/_redirects` trailing-slash rules
  (`/egypte → /egypte/`, `/istanbul → /istanbul/`, `/azerbaidjan → /azerbaidjan/`,
  `/kuala-lumpur → /kuala-lumpur/`).

### Redirects (all HTTP 301 / permanent)

| Source | Destination |
|--------|-------------|
| `/sharm-constantine` | `/egypte/` |
| `/egypt` | `/egypte/` |
| `/sharm` | `/egypte/` |
| `/turquie` | `/istanbul/` |
| `/turkey` | `/istanbul/` |
| `/azerbaijan` | `/azerbaidjan/` |
| `/kl` | `/kuala-lumpur/` |
| `/kualalumpur` | `/kuala-lumpur/` |
| `/malaisie` | `/kuala-lumpur/` |

> **Gap flagged during migration:** the old `site/_redirects` also had
> `/cairo-sharm → /egypte/` (a legacy Égypte trip URL folded into the hub). That
> rule is **not** present in `vercel.json`. If old `/cairo-sharm` links may still
> be in circulation, add
> `{ "source": "/cairo-sharm", "destination": "/egypte/", "permanent": true }`
> to `vercel.json`'s `redirects`. (`og-cairo-sharm.jpg` is only an OG image name,
> not a page.)

### Response headers

**Global — applied to `/(.*)`:**

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 0`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` *(added in the Vercel migration)*
- `Content-Security-Policy: …` *(added in the Vercel migration; allows self + jsDelivr, Google Fonts, CartoDB basemaps, Supabase)*

**Caching:**

| Path | Cache-Control |
|------|---------------|
| `/assets/images/*` | `public, max-age=31536000, immutable` |
| `/assets/fonts/*` | `public, max-age=31536000, immutable` |
| `/assets/css/*` | `public, max-age=600, stale-while-revalidate=86400` |
| `/assets/js/*` | `public, max-age=600, stale-while-revalidate=86400` |
| `/sw.js` | `public, max-age=0, must-revalidate` (+ `Service-Worker-Allowed: /`) |
| `/site.webmanifest` | `public, max-age=3600` (+ `Content-Type: application/manifest+json`) |
| `/sitemap.xml` | `public, max-age=3600` (+ `Content-Type: application/xml; charset=utf-8`) |

> Two header behaviors from the old `site/_headers` were **not** carried into
> `vercel.json` and now rely on Vercel defaults: the HTML short-cache
> (`/`, `/*/index.html` → `max-age=3600, must-revalidate`) and the explicit
> `robots.txt` `Content-Type: text/plain`. Vercel serves sensible defaults for
> both; add explicit rules to `vercel.json` only if a specific caching policy is
> required.

## SEO files

- `site/robots.txt` — allows crawling, disallows `/admin/`, and points to
  `https://alliance-travel.dz/sitemap.xml`.
- `site/sitemap.xml` — lists the indexable pages only: home, `/voyages/`,
  `/rendez-vous-visa/`, the 7 trips (`egypte`, `istanbul`, `azerbaidjan`,
  `kuala-lumpur`, `tunisie`, `bali`, `vietnam`), and the `/en/azerbaidjan/`
  English pilot. `/admin/` is intentionally excluded. Single domain:
  `https://alliance-travel.dz`.
