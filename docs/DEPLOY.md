# Alliance Travel — Deploy guide

Single source of truth for taking the site live. Last updated 2026-05-13.

---

## TL;DR — Go live in 30 minutes

The repo is **already deploy-ready**. Recommended path: Cloudflare Pages via GitHub integration. No build step, no CLI auth, no secrets management. Just connect the repo in the Cloudflare dashboard and every push to `main` deploys automatically.

```
1. Push the current branch to GitHub               (2 min)
2. Sign in to dash.cloudflare.com                  (2 min, free account)
3. Workers & Pages → Create → Pages → Connect Git  (5 min)
4. Select repo Brvetr4ve1er/alliancetravel34       (1 min)
5. Configure: build-cmd=empty, output-dir=site     (1 min)
6. Save & Deploy → wait ~30s                       (1 min)
7. Get the *.pages.dev preview URL — test it       (5 min)
8. Add custom domain alliance-travel.dz            (5 min)
9. Point DNS at the registrar to CF Pages          (5 min + propagation)
10. Submit sitemap.xml to Google Search Console    (2 min)
```

Total active work: **~30 minutes.** DNS propagation: 0 min – 24 hrs depending on registrar.

---

## What's already in place

This commit set delivered (across the v21 cleanup cycle plus this prod-prep pass):

### Host config
- `site/_headers` — Cache-Control rules: 1-hour cache for HTML, 1-year immutable for `/assets/*`, never-cache for `sw.js`. Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- `site/_redirects` — Trailing-slash normalization for all 5 trip slugs + 10 common typo/alias redirects (`/azerbaijan/` → `/azerbaidjan/`, `/turkey/` → `/istanbul/`, etc.). 301 permanent for SEO preservation.
- `site/404.html` — Branded error page with eyebrow + h1 + 2 CTAs + nav to all 5 trips. CF Pages auto-serves it on unmatched paths.

### SEO
- `site/sitemap.xml` — All 6 canonical URLs with lastmod=2026-05-13, priority, changefreq, per-page image:image block.
- `site/robots.txt` — Crawl-friendly + Sitemap: directive. AhrefsBot/SemrushBot rate-limited.
- 17 JSON-LD blocks across 6 pages — TravelAgency + WebSite (home), TouristTrip + Offer + BreadcrumbList + FAQPage (each trip).
- Per-page Open Graph + Twitter Card with dedicated 1200×630 OG images.
- Single `<h1>` per page (fixed in this commit by downgrading the scroll-hero pinned title to a `<div aria-hidden="true">`).

### Performance
- Hero LCP image gets `<link rel="preload" as="image" fetchpriority="high">` on all 6 pages with responsive srcset.
- Homepage hero collage: only 1 photo loads eager (LCP), other 4 lazy. Saves ~700 KB upfront on slow connections.
- WebP variants for all hero images + mobile crops, served via `<picture>` element. Modern browsers get 50% smaller files.
- DM Sans subset via Google Fonts with `display=swap`.
- Service worker (`sw.js`) with network-first HTML + stale-while-revalidate assets + cache-first images. Cache name `alliance-v21-2026-05-13`.
- Single rAF scroll coordinator in `enhance-pro.js` (4 listeners → 1).
- IntersectionObserver auto-pauses ambient loops when off-screen (`.is-paused` class freezes all animations in subtree).
- 4 canonical cubic-bezier curves, 4 canonical durations — all motion routes through tokens.

### Deploy automation
- `wrangler.toml` at repo root — config for `wrangler pages deploy site` CLI command.
- `.github/workflows/deploy.yml` — auto-deploys on push to `main`. Requires two GitHub secrets to actually run (see [GitHub Action setup](#optional-github-actions-fallback) below).

---

## Step-by-step: Cloudflare Pages via GitHub integration

This is the path of least resistance. No CLI, no auth on your machine, no GitHub Actions configuration. Cloudflare polls the GitHub repo and deploys on push.

### 1. Push current state to GitHub

The branch `feat/v12-hierarchy-pass` contains all v21 work. Push it:

```bash
git push -u origin feat/v12-hierarchy-pass
```

For production deployment from `main`:

```bash
git checkout main
git merge feat/v12-hierarchy-pass
git push origin main
```

Recommendation: keep the feature branch separate for now, point Cloudflare Pages at the feature branch as a preview deployment, validate it, then merge to `main` and promote main to production.

### 2. Create Cloudflare account + Pages project

1. Go to <https://dash.cloudflare.com> → sign up (free plan).
2. Sidebar → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
3. Authorize Cloudflare to access your GitHub. Select repo `Brvetr4ve1er/alliancetravel34`.
4. Configure the build:
   - **Project name**: `alliance-travel`
   - **Production branch**: `main` (or `feat/v12-hierarchy-pass` for first test)
   - **Framework preset**: **None**
   - **Build command**: *(leave empty)*
   - **Build output directory**: `site`
   - **Root directory**: `/` *(default)*
   - **Environment variables**: none
5. **Save and Deploy**.

Cloudflare takes ~30 seconds to deploy. You get a URL like `https://alliance-travel.pages.dev`.

### 3. Test the preview URL

Visit the `*.pages.dev` URL and walk through:

```
[ ] / loads, hero renders, photo collage visible
[ ] Stats counters animate (1.2K+, 98%, 5, 7+)
[ ] Globe widget renders (right side of home hero)
[ ] Trip cards grid renders (5 cards, hover lift works)
[ ] Filter tabs filter trip cards
[ ] Algeria map loads with 3 pins
[ ] Contact form renders, phone-card grid visible
[ ] Footer renders with all contact info
[ ] /cairo-sharm/ loads, hero parallax scrolls
[ ] Calculator widget on cairo-sharm/, can pick dates + see price
[ ] Trip map renders with day-by-day route
[ ] All 5 trip pages load identically
[ ] /404page-that-doesnt-exist returns the branded 404.html
[ ] Trailing-slash redirect: /cairo-sharm → /cairo-sharm/ (301)
[ ] Open the browser DevTools console — zero errors on every page
```

### 4. Add the custom domain

In the Pages project:

1. **Custom domains** → **Set up a custom domain** → enter `alliance-travel.dz`.
2. Cloudflare gives you DNS records to add at your registrar (or proposes to manage DNS itself if you transfer the domain).
3. If using external registrar (most common):
   - Add a **CNAME** record: `alliance-travel.dz` → `alliance-travel.pages.dev`
   - For `www.alliance-travel.dz` → same CNAME target.
4. Wait for propagation (5 min – 24 hrs). Check status with `nslookup alliance-travel.dz`.

Cloudflare auto-provisions a free Let's Encrypt HTTPS certificate within minutes of the DNS being correct.

### 5. Submit sitemap to Google

1. Sign in to <https://search.google.com/search-console>.
2. **Add property** → **URL prefix** → `https://alliance-travel.dz/`.
3. Verify ownership (HTML tag method is easiest — Google gives you a `<meta>` to drop into `<head>`).
4. **Sitemaps** → enter `sitemap.xml` → **Submit**.
5. Google starts crawling within hours; rankings appear within 1–4 weeks.

### 6. Add a Bing Webmaster equivalent (optional)

<https://www.bing.com/webmasters> — same flow, different vendor. Bing has 5–8% global search share. Worth 5 minutes.

---

## Post-deploy checklist (do these once live)

| Task | Time | Why |
|---|---|---|
| Run Lighthouse on `https://alliance-travel.dz` (mobile profile) | 5 min | Verify Perf ≥ 90, SEO ≥ 95 |
| Test every WhatsApp CTA on a real phone | 10 min | Confirm `wa.me/213…` deep-links open WhatsApp natively |
| Test the calculator on iPhone Safari | 5 min | Date pickers + form behavior |
| Verify maps render on mobile | 5 min | MapLibre GL has touch gestures + cooperative-zoom |
| Run schema validator on every page | 10 min | <https://validator.schema.org/> — paste each URL, expect zero errors |
| Open Facebook Sharing Debugger | 5 min | <https://developers.facebook.com/tools/debug/> — paste each URL, confirm OG image renders correctly |
| Open Twitter Card Validator | 5 min | <https://cards-dev.twitter.com/validator> — same |
| `curl -I https://alliance-travel.dz/assets/css/styles.css` | 2 min | Verify Cache-Control header reads `public, max-age=31536000, immutable` |

---

## Updating the site after launch

Cloudflare Pages auto-deploys every push to `main`. To ship a change:

```bash
# Make changes
git add -A
git commit -m "fix: typo in cairo-sharm hero"
git push
# Cloudflare deploys within ~30s
```

**Cache-busting** for CSS/JS: if you change `assets/css/styles.css` and the user's browser has the immutable-cached old version, they won't see the update until cache expires (1 year). For high-impact changes, append a query string to the asset URL in HTML:

```html
<!-- Before -->
<link rel="stylesheet" href="assets/css/styles.css" />
<!-- After cache-bust -->
<link rel="stylesheet" href="assets/css/styles.css?v=2026-05-13" />
```

The service worker (`sw.js`) cache busts via the `CACHE_NAME` constant — bump it when shipping a major release.

---

## Optional: GitHub Actions fallback

If you ever want CI-driven deploys (e.g., to require a passing test before deploying, or to deploy a specific branch on demand), the workflow at `.github/workflows/deploy.yml` does that. To enable it:

1. In Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token** → use the "Cloudflare Pages — Edit" template.
2. Copy the token.
3. In GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Name: `CLOUDFLARE_API_TOKEN`, value: *(the token)*
   - Name: `CLOUDFLARE_ACCOUNT_ID`, value: *(your account ID from Cloudflare dashboard sidebar)*
4. The workflow now runs on every push to `main`. The CF Pages dashboard reflects the deploy.

This is **redundant with the GitHub-integration path** above — most projects don't need both. Use it only if you want CI gates.

---

## Alternative hosts (if not Cloudflare Pages)

Any static-file host works. The site has zero server-side dependencies.

| Host | Pros | Cons |
|---|---|---|
| **Netlify** | Best DX, free CDN, simple `_headers`/`_redirects` (same syntax as CF Pages — no changes needed) | Slightly slower edge in North Africa than Cloudflare |
| **GitHub Pages** | Free, zero config | No `_headers` (no Cache-Control control), no edge CDN, no preview URLs per PR |
| **Vercel** | Same DX as Netlify, slightly different `vercel.json` syntax needed | Some optimizations are paid features |
| **AWS S3 + CloudFront** | Maximum control | Manual cert provisioning, manual CloudFront config, paid |

The `_headers` and `_redirects` files in this repo are written in Cloudflare/Netlify-compatible syntax. Both hosts will Just Work.

---

## Troubleshooting

**"My CSS update doesn't appear."**
Browser cached the old `styles.css` with 1-year immutable directive. Force-reload with Ctrl+F5, OR add `?v=YYYY-MM-DD` to the asset URL in HTML to break the cache.

**"Google isn't indexing the site."**
Check Search Console for crawl errors. Confirm `robots.txt` is reachable: `https://alliance-travel.dz/robots.txt`. Re-submit sitemap. Indexing takes 1–4 weeks for new domains.

**"OG image doesn't show on WhatsApp/Facebook."**
Facebook caches the first crawl. Use the Facebook Sharing Debugger to force a re-scrape.

**"Service worker is showing stale content."**
Bump `CACHE_NAME` in `sw.js` to the new release date. Push. Users will get the new SW within their next visit; the activate handler purges the old cache.

**"Maps don't load."**
MapLibre GL loads from `unpkg.com` CDN. If a corporate firewall blocks it, swap to the npm-bundled version (would require a build step).

---

## Production URLs (after deploy)

| URL | Purpose |
|---|---|
| `https://alliance-travel.dz/` | Homepage |
| `https://alliance-travel.dz/cairo-sharm/` | Trip page |
| `https://alliance-travel.dz/sharm-constantine/` | Trip page |
| `https://alliance-travel.dz/istanbul/` | Trip page |
| `https://alliance-travel.dz/azerbaidjan/` | Trip page |
| `https://alliance-travel.dz/kuala-lumpur/` | Trip page |
| `https://alliance-travel.dz/sitemap.xml` | Sitemap for Google |
| `https://alliance-travel.dz/robots.txt` | Robots config |
| `https://alliance-travel.dz/site.webmanifest` | PWA manifest |
| `https://alliance-travel.dz/sw.js` | Service worker |
| `https://alliance-travel.dz/404.html` | Branded 404 (auto-served by CF Pages) |

---

*Maintained alongside `docs/ROADMAP.md` and `docs/MOTION-CLEANUP-MASTER.md`. When the deploy process changes, update this doc first.*
