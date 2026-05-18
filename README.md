# Build Squad — Pitch Deck (standalone artifact)

A single-file, self-contained HTML pitch deck targeting B2B travel agencies for the 2026 hot season. Built around the **Alliance Travel** case study (Bordj Bou Arreridj, Algérie) as the reference build.

> This branch contains only the deliverable — `index.html`. Full source site, design docs and client materials live on `main`.

## Open it

```bash
python -m http.server 5500
# → http://localhost:5500/
```

Or double-click `index.html`. Zero local dependencies beyond two Google Fonts (Space Grotesk + Inter + JetBrains Mono) loaded over the network.

## Creative direction

- **Typography** — Space Grotesk display + Inter body + JetBrains Mono for technical labels. No serifs anywhere.
- **Color** — Deep ink (`#08090C`) + warm cream (`#F5F2EA`) anchor. Bronze/gold for primary CTAs. Region accents (Egypt amber, Caspian teal, Bosphorus blue, jade, Red Sea aqua, plus violet/pink/lime) used liberally throughout.
- **Motion** — Scroll-reveal fade-ups, orbital arc strokes, marquee ticker, animated dashed route paths on the Algeria map, count-up stats, pulse-ring halos, count-tick flashes on the live total.
- **Texture** — Subtle SVG grain overlay on the hero, dot-grid on the map, gradient mesh backgrounds.

## Sections

1. **Sticky nav** with conic-gradient logo
2. **Hero** — kinetic display headline, badge with pulsing dot, animated counters, orbital globe with 3 rings, center HQ pulse, 5 destination nodes connected by animated arcs
3. **Marquee** ticker of all five destinations + prices
4. **Friction grid** — 6 problem→fix cards with gradient icon tiles
5. **Case-study header** with 5 illustrated region tiles (pyramids, flame towers, Hagia Sophia + Galata, Petronas, Red Sea palms)
6. **Module 01** — Storyline mock with **geographically accurate Algeria SVG map** (Mediterranean coast highlighted, Morocco / Tunisia–Libya / Mali–Niger borders labeled, 6 city pins with halos, dashed flowing routes from the BBA HQ, compass rose)
7. **Module 02** — Catalogue mock with 6 trip cards, each with **hand-illustrated SVG art** for the destination
8. **Module 03** — Interactive live calculator with auto-cycling demo
9. **Module 04** — Phone-frame WhatsApp dossier with floating annotation labels, synced to the calculator
10. **Pricing showcase** — 5 illustrated cards in a responsive grid
11. **Engineering** — 6 icon cards on dark + big stats bar
12. **Process phases** — 3 numbered cards with gradient top borders
13. **Final CTA** — multi-gradient mesh with WhatsApp / Email / Call buttons
14. **Floating WhatsApp FAB**

## Stack

Hand-written HTML + CSS + vanilla JS. No build, no bundler, no framework. ~2,920 lines. Respects `prefers-reduced-motion`.
