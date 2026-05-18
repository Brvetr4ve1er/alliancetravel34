# Build Squad — Pitch Deck (standalone artifact)

A single-file, self-contained HTML pitch deck targeting B2B travel agencies for the 2026 hot season. Built around the **Alliance Travel** case study (Bordj Bou Arreridj, Algérie) as the reference build.

> This branch contains **only the deliverable** — `index.html`. The full source site, design system docs, and client materials live on `main`.

## Open it

```bash
# any static server will do
python -m http.server 5500
# → http://localhost:5500/
```

Or just double-click `index.html` — it has zero external dependencies beyond two Google Fonts (DM Sans + Fraunces) loaded over the network.

## What's inside

- **Hero** with scroll-triggered counters, CSS globe, floating destination polaroids
- **Friction grid** — six pain/fix cards
- **Case-study header** with per-region accent strip
- **Four module mocks** rendered as animated, browser-chromed product screenshots:
  1. Agency storyline — animated SVG map of Algeria with flowing routes
  2. Catalogue — region-themed trip-card grid
  3. **Live calculator** — fully interactive; auto-cycles a scripted demo when in view
  4. **WhatsApp dossier** — chat bubble that live-syncs to the calculator total
- **Pricing table** — five trips, real "à partir de" prices
- **Engineering table** on dark background
- **Big stats bar** · **3-phase process** · **Final CTA** with WhatsApp / Email / Call
- Floating WhatsApp FAB with pulse-ring animation
- Respects `prefers-reduced-motion`

## Stack

Hand-written HTML + CSS + vanilla JS. No build, no bundler, no framework. ~1,820 lines.
