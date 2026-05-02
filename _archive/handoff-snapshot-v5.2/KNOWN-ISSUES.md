# Known Issues / Open Items

Things that are known-imperfect but were either not in scope or got deferred for context. Each one tagged with severity:
- 🔴 **Blocker** — needs fixing before the next milestone
- 🟡 **Should-fix** — visible but not blocking
- 🟢 **Nice-to-have** — backlog

## 🟡 1. Trust/testimonials section only on Cairo+Sharm

**Status:** Only `site/cairo-sharm/index.html` has the `#confiance` section (trust badges + testimonials). The 4 other trip pages are missing it.

**Fix:** Copy the `<section id="confiance">` block from cairo-sharm into:
- `site/azerbaidjan/index.html`
- `site/istanbul/index.html`
- `site/kuala-lumpur/index.html`
- `site/sharm-constantine/index.html`

…and adjust the testimonial city to match each region (Bordj Bou Arreridj is shared across all per the project narrative).

Flagged in `SITEMAP.md`.

## 🟡 2. Missing `id="main"` skip-link target on 4 trip pages

Only `site/cairo-sharm/index.html` has `<main id="main">`. The other 4 use just `<main>` without the id. Skip-links in the nav point to `#main`, so they're broken on those 4 pages.

**Fix:** Add `id="main"` to the `<main>` opening tag on all 4 non-Cairo trip pages.

Flagged in `SITEMAP.md`.

## 🟢 3. og/ and favicon/ folders empty

`site/assets/images/og/` and `site/assets/images/favicon/` exist but contain no files. The HTML `<meta property="og:image">` tags reference paths that 404.

**Fix:** Generate:
- 1200×630 OG share image per page (homepage + 5 trip pages = 6 total)
- Standard favicon set (16×16, 32×32, 180×180 apple-touch-icon, etc.)

## 🟢 4. Sétif references still in docs

User-facing pages were cleaned (Sétif → Bordj Bou Arreridj), but these doc files at project root **still mention Sétif**:

- `design-system/MASTER.md`
- `SITEMAP.md`
- `IMAGE-ASSETS.md`
- Possibly some `source of truth/` PDFs (those are client-provided, leave alone)

**Fix:** Search-and-replace in the doc files. The migration script `_phone_city_migrate.py` was scoped to `site/` — extend it or do it manually. Don't touch the PDFs in `source of truth/`.

## 🟡 5. v5.2 hero photos NOT visually verified

The CSS rules are in place and the JPG files exist. But no human or screenshot has confirmed the photos actually render correctly across all 5 trip pages and both themes. **This is the very first task on resume** — see [CONTINUE-HERE.md](CONTINUE-HERE.md).

## 🟢 6. CSS file is one giant file

`site/assets/css/styles.css` is 4,531 lines in a single file. It's organized by section comments but no module split. This is intentional for the no-build static-site approach — but if the file keeps growing, consider:

- Splitting into `base.css`, `layout.css`, `components.css`, `regions.css`, `pages.css`
- Or adopting an `@import` chain (one master CSS that imports the others)

Not urgent. Current single-file approach works.

## 🟢 7. Migration scripts at root are accumulating

The project root has 12+ `_*.py` scripts and 4 `_v*_styles.css` scratch files. They're all appended/run-once tools. Once the site stabilizes, consider:

- Moving them to `tools/migrations/` or `_archive/`
- Or deleting once their effects are confirmed in the live site

Don't delete yet — they're the only audit trail of what was done.

## 🟢 8. No responsive `<picture>` for hero photos

Current hero rule loads the same JPG for desktop and mobile via `background-image`. On mobile, that's wasteful (a desktop-quality JPG on a small screen). Consider adding mobile-cropped variants and switching via `@media` queries:

```css
@media (max-width: 768px) {
  [data-region="egypt"] .hero {
    background-image: url("../images/heroes/hero__cairo-sharm--mobile.jpg");
  }
}
```

Also: hero photos aren't lazy-loaded (background-image can't be), so they always download. Consider `<img loading="eager" fetchpriority="high">` in the markup with CSS `position: absolute; inset: 0; z-index: -1; object-fit: cover` instead — that gets you native lazy/preload semantics.

## 🟢 9. No service worker / offline

Static site, no PWA features. If the user wants offline support or installable app behavior, that's a separate buildout.

## 🟢 10. Form data only goes to WhatsApp

`booking-form.js` builds a WhatsApp-prefilled message and opens `wa.me/...`. There's no backend, no email fallback, no form-submission audit trail. If WhatsApp is down or the user closes the tab, the booking is lost. Consider:

- Adding an email fallback (mailto: with the same dossier)
- Or a simple form-to-email service (Formspree, Basin, etc.)
- Or a tiny serverless function (Vercel/Netlify) to capture submissions
