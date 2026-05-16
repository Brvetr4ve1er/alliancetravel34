# Launch & Deploy — Alliance Travel

> ⚠️ **SUPERSEDED by [`DEPLOY.md`](DEPLOY.md) as of 2026-05-13.**
>
> This older doc (May 2026, pre-v21) covers Netlify / Vercel / Cloudflare Pages / GitHub Pages / self-host in general terms. The newer `DEPLOY.md` is a focused 30-minute Cloudflare Pages walkthrough that incorporates the v21 prod-prep artifacts (`_headers`, `_redirects`, `404.html`, `wrangler.toml`, GitHub Actions workflow).
>
> **Use `DEPLOY.md` to ship.** Keep this file for historical context about the alternative-host comparison.

---

End-to-end guide for **previewing the site locally** and **shipping it to a real domain**. Zero build step required — it's static HTML, CSS, and JS.

---

## 0. Prerequisites

You need **one** of these to serve the site locally:

| Tool | Purpose | Install |
|---|---|---|
| **Python 3.x** | Built-in HTTP server | already on Windows/macOS, or `winget install Python.Python.3.12` |
| **Node 18+** | `npx serve` alternative | [nodejs.org](https://nodejs.org) or `winget install OpenJS.NodeJS.LTS` |
| **VS Code** + Live Server extension | Auto-reload on file save | optional, recommended for editing |

For deployment you also need:
- **Git** — already used in this project (`git --version` to verify)
- **A free account on Netlify / Vercel / Cloudflare Pages** (pick one) — or your own server if you self-host

That's it. No `npm install`, no `pip install`, no Docker.

---

## 1. Project layout (what you're shipping)

The thing that gets deployed is the **`site/` folder**. Everything else is dev-only:

```
alliance-travel/
├── site/                    ← THIS is what you upload to your host
│   ├── index.html           ← homepage
│   ├── cairo-sharm/index.html
│   ├── azerbaidjan/index.html
│   ├── istanbul/index.html
│   ├── kuala-lumpur/index.html
│   ├── sharm-constantine/index.html
│   ├── sw.js                ← service worker (HTTPS only)
│   ├── site.webmanifest     ← PWA manifest
│   └── assets/
│       ├── css/styles.css   ← single 6,625-line stylesheet (layered v1–v11)
│       ├── js/              ← 7 vanilla modules (3,284 lines total)
│       └── images/          ← heroes, hotels, trips, og, favicon
│
├── docs/                    ← documentation (don't deploy)
├── _archive/                ← frozen historical scripts (don't deploy)
├── source of truth/         ← client PDFs (don't deploy)
└── README.md                ← project overview
```

> When you deploy, **the document root must be `site/`**, not the project root. Every host below has a setting for this.

---

## 2. Local preview — three ways

### Option A · Python (simplest, no Node needed)

From the project root:

```bash
python -m http.server 5500 --directory site
```

Open **http://localhost:5500** in your browser.

To stop: `Ctrl+C`.

### Option B · npx serve (slightly nicer 404 handling)

```bash
npx serve site -p 5501 --no-clipboard
```

Open **http://localhost:5501**.

First run downloads `serve` (~5 MB), subsequent runs are instant.

### Option C · VS Code Live Server

1. Install the **Live Server** extension by Ritwick Dey
2. Right-click `site/index.html` → **Open with Live Server**
3. Browser opens automatically; saves trigger a reload

### Option D · Pre-configured launch profile (for `.claude` users)

A profile is already set up at `.claude/launch.json`:
- **Alliance Travel (Python)** → port 5500
- **Alliance Travel (npx serve)** → port 5501

---

## 3. What to look for when previewing

A 60-second smoke test before any push:

| Check | Where | Expected |
|---|---|---|
| **Homepage hero** loads photo collage | `/` | 5 destination photos behind a "TRAVEL" wordmark |
| **3D globe** rotates and is draggable | `/` (right side of hero) | Spinning navy sphere with 23 mint dots; "Glissez pour explorer" hint after 1.5s |
| **Algeria branches map** loads | `/` → "Nos agences en Algérie" section | MapLibre vector map with 5 numbered pins (BBA HQ + Sétif + Alger + Constantine + Oran); pan/zoom works |
| **Theme toggle** works | nav top-right (sun/moon icon) | Dark ↔ light, persists on refresh |
| **Trip cards** open subpages | `/` → "Programmes 2026" section | Each card links to `/{slug}/` |
| **Per-region hero photo** shows | each trip page | Different photo per region, Ken Burns slow zoom |
| **Trip itinerary map** loads | each trip page → after itinerary timeline | MapLibre map with day-numbered route polyline + pins; click pin to isolate, hover for popup |
| **Anti-clutter on map** behaves | trip page → trip map at low zoom | Pins stack into clusters; labels collide-avoid; click-to-isolate clears the rest |
| **Calculator** updates totals live | trip page → "Réserver" section | Changing dates/hotel updates price + breakdown |
| **Booking buttons** are present | trip page → preview panel | WhatsApp (primary, mint) + Email + Copy |
| **Sticky inquiry bar** slides in | trip page → scroll past hero | Bottom bar with trip name + price + WhatsApp CTA |
| **Lightbox** opens on photo click | trip page → hotel cards | Fullscreen viewer with arrow nav, Esc to close |
| **Footer** renders, no console errors | every page → DevTools console | No red errors (a single MapLibre warning about deprecated style spec is OK) |

If any of these fail, **don't deploy yet** — fix locally first.

### Mobile preview

Chrome DevTools → device toolbar (Ctrl+Shift+M) → pick **iPhone 12 Pro** or **Pixel 7**.

The site adapts:
- Photo collage flips to 2-column at ≤768px
- 3D globe uses `mapSamples: 8000` instead of 16000 for faster setup
- Hero photos swap to mobile-cropped variants (~70% smaller)
- Hamburger nav appears
- Polaroids on globe hide on tiny screens
- MapLibre maps shrink container height + simplify pin labels at narrow viewports (anti-clutter pass auto-tightens collision thresholds)

---

## 4. Editing workflow

```bash
# 1. Pull latest (if collaborating)
git pull

# 2. Create a feature branch — never edit on main directly
git checkout -b fix/typo-in-cairo-itinerary

# 3. Edit files. Refresh the browser to see changes.
#    No build step, no compile, no restart.

# 4. Commit
git add .
git commit -m "fix: correct typo in cairo-sharm itinerary day 3"

# 5. Push and deploy (see section 6)
git push origin fix/typo-in-cairo-itinerary
```

### Common edits

| What you want to change | File |
|---|---|
| Phone number, email, address | grep all files: `grep -rn "213561616266" site/ _archive/migrations/` (it's in 12+ places — see [ROADMAP](ROADMAP.md) Phase 2.1 + [CLEANUP-FLAGGED](CLEANUP-FLAGGED.md) #13) |
| Trip price | `site/{slug}/index.html` (search "DA") + `site/assets/js/calculator.js` (also `enhance.js` `ALL_TRIPS` + `globe.js` `DESTINATIONS` if visible on homepage card) |
| Trip dates | `site/{slug}/index.html` (search the dates in itinerary) |
| Add/edit testimonial | `site/cairo-sharm/index.html` → `<section class="trust">` (only on Cairo+Sharm currently) |
| Hotel listings | `site/{slug}/index.html` → `<section id="hotels">` |
| Brand colors | `site/assets/css/styles.css` → dark `:root` (line 59) and `:root[data-theme="light"]` (line 3254) |
| Press strip / trust commitments | `site/assets/js/enhance-pro.js` → `initPressStrip()` |
| Globe destinations | `site/assets/js/globe.js` → `DESTINATIONS` and `ASPIRATIONAL` arrays |
| Algeria branches pins | `site/assets/js/algeria-map.js` → `BRANCHES` array |
| Trip itinerary map data | `site/{slug}/index.html` → inline `TRIP_MAP_DATA` JSON before the closing `</body>` |

---

## 5. Pre-deployment checklist

Before pushing to production, verify:

- [ ] `git status` — working tree clean (no uncommitted edits)
- [ ] All 6 pages load with no console errors
- [ ] Booking flow tested on at least one trip page (WhatsApp opens correctly)
- [ ] Email fallback opens default mail client with the dossier pre-filled
- [ ] Lightbox opens, navigates with arrows, restores focus on close
- [ ] Light theme renders correctly (toggle and refresh)
- [ ] Mobile viewport (375×812) doesn't break any layout
- [ ] Favicon shows in browser tab (not the default file icon)
- [ ] OG image preview correct (test via [opengraph.xyz](https://opengraph.xyz/) once live)

---

## 6. Deployment — pick one

All four options serve `site/` as a static site over HTTPS. Pick based on your preference.

### Option 1 · Netlify (easiest, drag-and-drop)

**Drag-and-drop method (one-time, no Git):**
1. Go to <https://app.netlify.com/drop>
2. Drag the **`site/`** folder onto the page
3. Done. Netlify gives you a URL like `https://wonderful-name-12345.netlify.app`

**Git-connected method (auto-deploy on push):**
1. Push your repo to GitHub (already done — your remote is `https://github.com/Brvetr4ve1er/alliancetravel34.git`)
2. <https://app.netlify.com> → **Add new site** → **Import from Git**
3. Pick your repo
4. **Base directory:** *(leave empty)*
5. **Publish directory:** `site`
6. **Build command:** *(leave empty — it's static)*
7. Deploy

Add a `_headers` file at `site/_headers` for proper cache headers:

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

### Option 2 · Vercel

1. <https://vercel.com> → **Add New** → **Project** → import from GitHub
2. **Root Directory:** `site`
3. **Framework Preset:** Other (or "Static")
4. **Build Command:** *(leave empty)*
5. **Output Directory:** `.` (just a dot)
6. Deploy

For cache headers, add `vercel.json` at the project root:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

### Option 3 · Cloudflare Pages (best free tier, fastest CDN)

1. <https://pages.cloudflare.com> → **Create a project** → **Connect to Git**
2. Pick your GitHub repo
3. **Production branch:** `main`
4. **Build command:** *(leave empty)*
5. **Build output directory:** `site`
6. Deploy

Cache headers: add `site/_headers` (same syntax as Netlify above).

### Option 4 · GitHub Pages (free, simple, slower CDN)

1. Push the repo to GitHub (already done)
2. **Settings → Pages** on the repo
3. **Source:** Deploy from a branch
4. **Branch:** `main` / `/site` (you need to either move `site/` contents to root OR set up a GitHub Action — see below)

GitHub Pages can only serve from the repo root or `/docs`. To keep `site/` as your folder, add this workflow at `.github/workflows/pages.yml`:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
permissions:
  pages: write
  id-token: write
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Option 5 · Self-hosted (Nginx / Apache / your own VPS)

```bash
# rsync the site folder to your server
rsync -avz --delete site/ user@server:/var/www/alliance-travel/

# Nginx config
server {
  listen 443 ssl http2;
  server_name alliance-travel.dz;
  root /var/www/alliance-travel;

  ssl_certificate     /etc/letsencrypt/live/alliance-travel.dz/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/alliance-travel.dz/privkey.pem;

  location / {
    try_files $uri $uri/ $uri/index.html =404;
  }

  # Cache: assets are fingerprinted-ready (when you add a build step)
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # Don't cache the service worker
  location = /sw.js {
    add_header Cache-Control "no-cache";
  }

  # Don't cache HTML (so updates appear immediately)
  location ~ \.html$ {
    add_header Cache-Control "public, max-age=0, must-revalidate";
  }
}
```

Get HTTPS via Let's Encrypt:
```bash
sudo certbot --nginx -d alliance-travel.dz -d www.alliance-travel.dz
```

---

## 7. Custom domain

After your first successful deploy, your host gives you a default URL (e.g. `alliance-travel.netlify.app`). Pointing your real domain (`alliance-travel.dz`) at it:

### DNS records

For **root domain** (`alliance-travel.dz`) — typically `A` records:

```
Type: A      Name: @     Value: <provider's IP>      TTL: 3600
Type: A      Name: www   Value: <provider's IP>      TTL: 3600
```

Each host (Netlify/Vercel/Cloudflare) gives you the exact IP or a CNAME target on its **Domain settings** page.

### What to update inside the project after the domain is live

The HTML files have a hardcoded canonical URL. Search-and-replace `https://alliance-travel.dz/` if your domain differs:

```bash
grep -rln "alliance-travel.dz" site/
```

---

## 8. Verify after deployment

| Test | How |
|---|---|
| HTTPS works | Visit your URL, look for the lock icon |
| Service worker installs | DevTools → Application → Service Workers → should show `sw.js` registered as "activated" |
| OG share preview | Paste your URL into <https://opengraph.xyz/> |
| Mobile loads in <3s on 4G | Lighthouse mobile audit (DevTools → Lighthouse) |
| WhatsApp link opens | Click the FAB on a phone |
| Email fallback works | Click "Envoyer par email" → mail client opens |
| Robots can index | <https://www.google.com/webmasters/markup-tester> |

### Lighthouse targets (in a new incognito window)

| Metric | Target |
|---|---|
| Performance (mobile) | ≥ 90 |
| Accessibility | 100 |
| Best Practices | ≥ 95 |
| SEO | ≥ 95 |

If you fall short, the [docs/ROADMAP.md](ROADMAP.md) Phase 3 section lists the remaining optimizations.

---

## 9. Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Hero photo is broken / missing | Wrong document root (deployed project root, not `site/`) | Re-configure host to publish from `site` |
| Service worker doesn't register | Site is on `http://` (not `https://`) | SW only works over HTTPS — you're fine in production |
| Globe doesn't spin in iframe / preview | `document.visibilityState === "hidden"` (browser pauses rAF) | Open in a real tab, not an embedded preview |
| Old cached version showing after deploy | Browser cache + service worker | Bump `CACHE_NAME` in [site/sw.js](../site/sw.js) (e.g., `'alliance-v2-2026-06'`) and redeploy |
| Favicons 404 | Path issue if site is hosted under a subpath | Either deploy at the root, or update `<link rel="icon">` paths |
| WhatsApp link does nothing on iOS Safari | iOS hijacks unknown app schemes silently | Email fallback button still works as a backup |
| OG image is blank in WhatsApp share | Image too large or wrong aspect ratio | All OG images are 1200×630 ≤ 120 KB — should be fine |

---

## 10. Update workflow (after first deploy)

```bash
# 1. Pull latest from main
git checkout main
git pull origin main

# 2. Make edits, commit on a feature branch
git checkout -b feat/add-march-departures
# ... edit files ...
git add .
git commit -m "feat(cairo-sharm): add March 2026 departure dates"

# 3. Push the branch
git push origin feat/add-march-departures

# 4. On GitHub: open a PR, review the diff, merge into main
#    (Or merge locally: git checkout main && git merge --no-ff feat/...)

# 5. Auto-deploy fires (Netlify/Vercel/Cloudflare Pages all watch main)

# 6. Verify the live site within ~30 seconds
```

If you bump assets (CSS/JS), bump the service worker `CACHE_NAME` in `site/sw.js` so repeat visitors get the new version, not the cached old one.

---

## 11. What the audit deferred (worth knowing before you scale)

The current setup is solid for a launch — but [docs/ROADMAP.md](ROADMAP.md) lists items that need attention as the site grows:

- **Phase 2** — extract `trips.json` / `hotels.json` / `agency.json` (currently the phone number lives in 12+ places; one edit becomes a 12-file find-and-replace)
- **Phase 2 (CSS)** — `styles.css` is 6,625 lines with `.btn--primary` defined 4× and 163 `!important`s — split into ITCSS modules behind a build step
- **Phase 4** — real testimonials, Arabic version, real lead-capture backend (Cloudflare Worker or Supabase)
- **Phase 5** — analytics, A/B testing, multi-currency display, schema.org rich data

For an MVP launch, you can skip these. Revisit when you start measuring conversion or onboarding the agency owner as a content editor. See [docs/CLEANUP-FLAGGED.md](CLEANUP-FLAGGED.md) for every flagged leftover with severity classification.

---

## TL;DR

```bash
# Preview locally
python -m http.server 5500 --directory site
# → http://localhost:5500

# Deploy (one-time, drag-drop)
# Netlify drop → drag the site/ folder onto app.netlify.com/drop

# Deploy (auto on git push)
# 1. Push repo to GitHub (your remote is set: alliancetravel34)
# 2. Connect Netlify/Vercel/Cloudflare Pages to the repo
# 3. Set publish dir = "site"
# 4. Push to main → auto-deploys
```

That's the whole thing. Static, fast, free to host, easy to update.
