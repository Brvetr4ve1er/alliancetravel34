# Production Hardening & Config Audit — Alliance Travel

**Dimension:** Production hardening & deploy config
**Date:** 2026-07-03
**Target platform:** Vercel (static, `outputDirectory: site`, `cleanUrls: true`, `trailingSlash: true`)
**Method:** read-only inspection of `vercel.json`, `wrangler.toml`, `netlify.toml`, `site/_headers`, `site/_redirects`, `.github/workflows/*`, page `<head>`s, `sw.js`, `robots.txt`, `sitemap.xml`, `site/admin/`.

---

## Headline

**The site is configured for three deploy platforms at once, but every production control (security headers, redirects, cache policy) lives in files that the actual target — Vercel — silently ignores.** `vercel.json` declares only `cleanUrls`/`trailingSlash` and no `headers`/`redirects` block, so on Vercel the site ships with **zero security headers, zero redirects, and no CSP**. Simultaneously, `deploy.yml` still pushes every `main` commit to **Cloudflare Pages** via `CLOUDFLARE_API_TOKEN`, so the deploy source of truth is ambiguous.

This corroborates the independent `.security-hardening/01-vulnerability-scan.md` findings VULN-05/06/07/09/13/14, re-verified here from source.

---

## Critical / High

### PC-01 (High) — Security headers + CSP are dead on Vercel
`site/_headers` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, cache-control, `Service-Worker-Allowed`) is a **Cloudflare Pages / Netlify** convention. Vercel does **not** read `_headers`. `vercel.json:1-9` has no `headers` array. Result on production: no `X-Frame-Options`, no `nosniff`, no `Referrer-Policy`, no `Permissions-Policy`, **no `Content-Security-Policy` and no `Strict-Transport-Security` anywhere on the site** (grep for CSP across `site/` = 0 hits). Fix: move the header set into `vercel.json` `"headers"` and add a CSP + HSTS.

### PC-02 (High) — All redirects are dead on Vercel; `/cairo-sharm/` ships as a live duplicate
`site/_redirects` encodes the Égypte-hub consolidation (`/cairo-sharm/ → /egypte/ 301`), trailing-slash normalization, and typo aliases. Vercel ignores `_redirects`; `vercel.json` has no `redirects`. So on Vercel **none of these fire**. Worse, `site/cairo-sharm/index.html` exists and **self-canonicalizes to `/cairo-sharm/`** (`cairo-sharm/index.html:32`, `:26`) — a full duplicate of `/egypte/` served with 200 OK, competing for the same content. Fix: port `_redirects` into `vercel.json` `"redirects"`, or delete the orphaned `cairo-sharm/` folder.

### PC-03 (High) — CI deploys to Cloudflare, not Vercel (conflicting targets)
`.github/workflows/deploy.yml:1,43-48` runs `wrangler pages deploy site` on every push to `main` using `secrets.CLOUDFLARE_API_TOKEN`. `.github/workflows/build-trips.yml:4-5,74-76` also assumes Cloudflare Pages Git integration for redeploys. Meanwhile `vercel.json` targets Vercel. If both integrations are live, every push double-deploys; controls valid on CF are absent on Vercel (PC-01/02). `wrangler.toml` and `netlify.toml` are both still committed (`git ls-files` confirms). Fix: pick Vercel, delete `deploy.yml`/`wrangler.toml`/`netlify.toml` (+ retire the CF token), repoint `build-trips.yml`'s deploy note.

### PC-04 (High) — Public `/admin/` CMS with placeholder backend + unpinned CDN ships to prod
`site/admin/index.html:16` loads `https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js` — **no version pin, no SRI, no crossorigin** (auto-updates to latest on every load; supply-chain RCE-in-admin-origin surface). `site/admin/config.yml` ships **placeholder values**: `repo: OWNER/alliance-travel` (`:16`) and `base_url: https://YOUR-AUTH-WORKER.workers.dev` (`:20`) — the panel is non-functional and leaks backend/repo/branch/broker recon at `/admin/config.yml` (world-readable). `/admin/` is `noindex` (`admin/index.html:6`) but **not** `Disallow`-ed in `robots.txt` and not edge-gated. Fix: pin+SRI or self-host the bundle, fill/parametrize real config, gate `/admin/` (Vercel password/SSO), add `Disallow: /admin/`.

---

## Medium

### PC-05 (Medium) — `vercel.json` is untracked (not yet committed)
`git status` shows `?? vercel.json`, `?? site/admin/`, `?? site/cairo-sharm/`. The one file that defines the Vercel deploy is uncommitted; a fresh clone / CI checkout would deploy with **default** Vercel behavior. Combined with PC-01/02 this is why headers/redirects would silently vanish even after they're eventually added to `vercel.json`. Fix: commit `vercel.json` (with the headers/redirects blocks added first).

### PC-06 (Medium) — `netlify.toml` + `wrangler.toml` are stale cruft for a Vercel deploy
`netlify.toml:1-12` (publish `site`, 404 redirect) and `wrangler.toml:14-16` (Cloudflare Pages) are both committed and describe non-target platforms. They mislead future maintainers about the source of truth and keep orphaned deploy assumptions alive. Fix: delete both once Vercel is confirmed as sole target.

### PC-07 (Medium) — Vercel serves no cache-control tuning
The `_headers` cache tiers (HTML 1h, CSS/JS 10m+SWR, images/fonts 1y immutable, `sw.js` no-cache) are all Cloudflare-only. On Vercel, static assets get Vercel's defaults; notably `sw.js` won't get `Cache-Control: max-age=0, must-revalidate` (`_headers:57-59`), which the SW-update strategy assumes. Fix: replicate the cache tiers in `vercel.json` `"headers"` (immutable for `/assets/images` & `/assets/fonts`, no-cache for `/sw.js`).

---

## Low

### PC-08 (Low) — `theme-color` / locale metadata inconsistency
Pages hardcode `<meta name="theme-color" content="#0C0E12">` (dark) e.g. `index.html:27`, `voyages/index.html:28`, while `site.webmanifest:37` uses `theme_color: "#002c51"`. With a light/dark toggle, neither adapts. Also `og:locale` = `fr_FR` (`index.html:23`) vs JSON-LD `inLanguage: "fr-DZ"` (`:79`) vs manifest `lang: "fr-DZ"`. Two pages lack `theme-color` entirely (`rendez-vous-visa`, `admin`). Cosmetic/SEO-minor.

### PC-09 (Low) — `robots.txt` claims "no protected admin paths" but `/admin/` exists
`robots.txt:5-6` comment asserts there are no admin paths; `site/admin/` is deployed. The file also doesn't `Disallow: /admin/` (relies on page-level `noindex` only). Low SEO/recon exposure; align with PC-04.

### PC-10 (Low) — 404 handling relies on platform auto-serve
`site/404.html` exists (Vercel does auto-serve `404.html` for static output, so this is fine on Vercel), but the Netlify `[[redirects]] → /404.html 404` (`netlify.toml:9-11`) and the `_redirects` 404 note are platform-specific. No action needed for Vercel beyond confirming `404.html` renders; noted for completeness. `404.html` is also a dark-only self-contained page (hardcoded dark vars, no theme flip) — acceptable for an error page.

---

## Verified NON-issues (checked, no fix needed)
- **MapLibre GL CDN has correct SRI** — `map-base.js:68-76` pins `maplibre-gl@4.7.1` with `integrity=sha384-…` + `crossOrigin` on both CSS and JS. Only the CMS bundle (PC-04) lacks SRI.
- **Relative asset paths resolve correctly** — homepage uses `assets/...` from `/`, subpages use `../assets/...` from `/<slug>/`; both resolve to `/assets/...` under `trailingSlash: true`. Hero preload target `assets/images/heroes/hero__cairo-sharm.webp` exists.
- **Favicons / OG images / manifest icons all exist** on disk; OG/twitter image URLs are absolute `https://alliance-travel.dz/...`.
- **No localhost / preview / `.vercel.app` / `.pages.dev` URLs** hardcoded in shipped pages (grep hits were `preview` CSS classes and a dev-guard comment in `enhance.js:1098`).
- **`.gitignore`** covers `.env*`, `.vercel`, `node_modules`, editor cruft adequately.
- **SW registration** is HTTPS + non-localhost guarded, absolute `/sw.js`, fail-silent (`enhance.js:1100-1106`).

---

## Priority fix order
1. **PC-01 + PC-02 + PC-07** — add `headers`, `redirects`, and cache tiers to `vercel.json` (single change closes the biggest gap).
2. **PC-03 + PC-06** — pick Vercel, delete `deploy.yml` / `wrangler.toml` / `netlify.toml`, revoke the CF token.
3. **PC-04** — gate/fix or remove `/admin/` before it ships publicly.
4. **PC-05** — commit `vercel.json` (after 1).
5. **PC-08 / PC-09 / PC-10** — polish.
