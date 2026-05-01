# Architecture

## Stack

- **Pure static site.** Zero build step. Edit HTML/CSS/JS, refresh browser.
- HTML: 6 plain `index.html` files (home + 5 trip subpages)
- CSS: 1 file (`site/assets/css/styles.css`, ~4,531 lines, layered)
- JS: 3 ES modules in `site/assets/js/`
- Fonts: DM Sans (Google Fonts) — was Fraunces+Inter, switched mid-session
- Images: regular JPG/SVG, no responsive `<picture>` yet

## Page structure (every trip page)

```html
<body data-region="egypt">           <!-- drives ALL per-region styling -->
  <nav class="site-nav">…</nav>      <!-- floating glass pill, z-index:100 -->
  <header class="hero">              <!-- full-bleed photo backdrop via data-region -->
    <div class="hero__bg"></div>     <!-- gradient overlay for text legibility -->
    <div class="hero__plane">…</div> <!-- paper-plane SVG, animates across -->
    <div class="hero__deco">…</div>  <!-- region silhouettes (pyramids/towers/domes/etc) -->
    <div class="hero__particles">…</div> <!-- 7 floating spans -->
    <div class="hero__content">…</div>
  </header>
  <main>
    <section id="programme">…</section>     <!-- itinerary timeline -->
    <section id="confiance">…</section>     <!-- trust/testimonials (only on Cairo+Sharm) -->
    <section id="inclus">…</section>        <!-- what's included grid -->
    <section id="faq">…</section>           <!-- FAQ accordions -->
    <section id="hebergement">…</section>   <!-- hotel cards -->
    <section id="reserver">…</section>      <!-- calculator + booking form (merged) -->
  </main>
  <footer>…</footer>
  <script type="module" src="../assets/js/calculator.js"></script>
  <script type="module" src="../assets/js/booking-form.js"></script>
  <script type="module" src="../assets/js/enhance.js"></script>
</body>
```

## Homepage extras (`site/index.html`)

Beyond the standard nav/hero/footer:

- `.home-hero__photos` — 5-image collage strip behind hero (added in v5.2)
- `#destinations` — trip cards grid linking to each subpage
- `#agence` — "Notre histoire" (rewritten around Bordj Bou Arreridj this session)
- `#agences` — **Algeria branches map** (added in v4): SVG outline + 7 city pins + 5 animated dashed routes + branch cards
- `#contact` — contact info

## Region-attribute pattern

The `body[data-region="..."]` attribute is the **single switch** that lights up all per-region theming. Five values:

| `data-region` | Trip | Accent color | Pattern motif | Hero deco | Hero photo |
|---|---|---|---|---|---|
| `egypt` | Cairo+Sharm All-Inclusive | warm amber | hieroglyph chevrons | pyramid silhouettes | `hero__cairo-sharm.jpg` |
| `azerbaijan` | Azerbaijan All-Inclusive | crimson flame | flame-tower pattern | flame-tower silhouettes | `hero__azerbaidjan.jpg` |
| `istanbul` | Istanbul | turquoise/teal | 8-point Ottoman star | dome+minaret silhouettes | `hero__istanbul.jpg` |
| `malaysia` | Kuala Lumpur | jungle green | tropical leaf | Petronas Towers silhouette | `hero__kuala-lumpur.jpg` |
| `sharm` | Sharm + Constantine combo | coral aqua | waves + bubbles | coral/wave silhouettes | `hero__sharm-constantine.jpg` |

CSS rules use selectors like `[data-region="egypt"] .hero { ... }` — see `site/assets/css/styles.css` (and the v5/v5.2 sections) for the full ruleset.

## Theme system

`<html data-theme="dark">` (default) or `<html data-theme="light">`.

- Theme toggle button in `.site-nav__controls` flips `data-theme` and saves to `localStorage`
- Light mode darkens `--mint` from `#9ce8b2` → `#237a4a` so the accent passes WCAG AA on cream
- Hero overlays invert (dark gradient → cream gradient) via `:root[data-theme="light"] [data-region] .hero__bg`
- Region patterns flip `mix-blend-mode` from `screen` (dark mode) to `multiply` (light mode)
- Implementation: `site/assets/js/enhance.js` (`initThemeToggle()` at top)

## JavaScript modules

### `calculator.js`
- Reads form inputs (room type, occupancy, dates, hotel)
- Computes total price, deposit, balance
- Renders breakdown into the calculator panel
- **Exposes `window.__calcState`** with the latest computed state
- **Dispatches `calcStateUpdated`** custom event when state changes

### `booking-form.js`
- Listens for `calcStateUpdated` events from calculator
- Builds a structured French dossier (passenger info, hotel, dates, deposit/total)
- Composes a `wa.me` URL with the dossier prefilled in the message body
- "Envoyer sur WhatsApp" button on each page opens `wa.me/213560860617` with the message
- Placeholder city updated this session: `placeholder="Bordj Bou Arreridj"` (was Sétif)

### `enhance.js`
- Theme toggle (persists to `localStorage`)
- Stat counter animation on viewport enter
- Scroll-reveal observer (adds `.is-visible` to `.reveal` elements)
- Share button (Web Share API w/ clipboard fallback)
- Trip switcher dropdown (defines `ALL_TRIPS` array — slug, name, price, color, sub for each destination)
- IntersectionObserver for nav scroll state (`.site-nav.scrolled`)

## Data flow: calculator → booking form

```
[user changes calculator inputs]
        ↓
calculator.js: recompute()
        ↓
window.__calcState = { total, deposit, balance, hotel, room, dates, ... }
window.dispatchEvent(new CustomEvent('calcStateUpdated', { detail: __calcState }))
        ↓
booking-form.js: addEventListener('calcStateUpdated', ...)
        ↓
update hidden form fields + WhatsApp message body
        ↓
[user clicks "Envoyer sur WhatsApp"]
        ↓
window.open(`https://wa.me/213560860617?text=${encoded}`)
```

## Asset paths

All HTML uses **relative paths from each page's location**:

- `site/index.html` → `assets/css/styles.css`, `assets/images/...`
- `site/cairo-sharm/index.html` → `../assets/css/styles.css`, `../assets/images/...`

CSS uses paths relative to the CSS file (`site/assets/css/`):
- Hero photos: `url("../images/heroes/hero__cairo-sharm.jpg")` — note the **`../`** to climb out of `css/`

## Server requirements

- Anything that serves static files works
- The site is **path-aware** (subfolder URLs), so don't run from a subdirectory
- Recommended: `npx serve site -p 5501 --no-clipboard` or `python -m http.server 5500 --directory site`
