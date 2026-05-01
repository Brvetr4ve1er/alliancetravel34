# Design System (condensed)

For full token detail with WCAG ratios, see [`COLOR-MAP.md`](../COLOR-MAP.md) at project root. This file is the daily-driver summary.

## Brand source

The client provided `source of truth/alliance travel graphic chart .pdf`. Key brand pillars:

- **Prussian Blue `#002c51`** — primary brand
- **Teal Deer `#9ce8b2`** — secondary brand (mint)
- **Nexa typography** — referenced in chart, but actually using DM Sans on the site (Nexa is paid; DM Sans is the closest free analog)
- Lifestyle imagery: travel photography, warm lighting, Algerian roots

## Core palette

### Dark mode (default)

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#0a0c12` | Page background |
| `--bg-2` | `#0f1218` | Card surfaces |
| `--bg-3` | `#181c25` | Hover/elevated surfaces |
| `--navy` | `#002c51` | Brand primary |
| `--mint` | `#9ce8b2` | Brand accent / CTA |
| `--bronze` | `#9ce8b2` | Alias for mint (legacy naming) |
| `--txt-1` | `#fbf8f1` | Primary text (cream) |
| `--txt-2` | `#c9cdd4` | Secondary text |
| `--txt-3` | `#8a99a8` | Tertiary text |
| `--border` | `rgba(255,255,255,.08)` | Default border |

### Light mode (`:root[data-theme="light"]`)

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#fbf8f1` | Page background (cream) |
| `--bg-2` | `#fff` | Card surfaces |
| `--bg-3` | `#f0ece2` | Hover/elevated surfaces |
| `--mint` | `#237a4a` | **Darkened** for AA contrast on cream |
| `--txt-1` | `#0a0c12` | Primary text |
| `--txt-2` | `#3a4252` | Secondary text |
| `--txt-3` | `#5a6a7c` | Tertiary text — was `#8a99a8` (only 2.92:1), darkened to 5.54:1 |
| `--border` | `rgba(0,44,81,.10)` | Default border |

### Light-mode contrast fixes (calibrated, don't undo)

- `--txt-3`: `#8a99a8` → `#5a6a7c` (2.92:1 → 5.54:1 on cream)
- `--mint`: `#9ce8b2` → `#237a4a` (2.1:1 → 4.6:1 on cream — passes AA for normal text)
- Per-page accent text on white surfaces: forced to `var(--mint)` in light mode
- See `COLOR-MAP.md` for the full ratio matrix

## Per-region accent colors

Each trip page has a region-tinted accent that overrides `--mint` *for that page only* via `[data-region="..."]` selectors. Used in: hero deco gradients, hero subhead glow, particle hue, body pattern tint.

| Region | Accent | Hex |
|---|---|---|
| `egypt` | warm amber | `#e0a04a` |
| `azerbaijan` | crimson flame | `#c8412e` |
| `istanbul` | Bosphorus turquoise | `#3aa3a8` |
| `malaysia` | jungle green | `#3aa86b` |
| `sharm` | coral aqua | `#5cc4c1` |

(These are the *atmospheric* tints — the brand mint is still used for CTAs and primary UI.)

## Typography

Single typeface: **DM Sans** (Google Fonts, weights 400/500/700/800)

Type scale (responsive — `clamp()` based):

| Token | Range |
|---|---|
| `--fs-display` | `clamp(2.5rem, 4vw + 1rem, 4.5rem)` — hero headlines |
| `--fs-h1` | `clamp(2rem, 2vw + 1rem, 3rem)` |
| `--fs-h2` | `clamp(1.5rem, 1.2vw + 0.8rem, 2.25rem)` |
| `--fs-h3` | `clamp(1.25rem, 0.8vw + 0.6rem, 1.5rem)` |
| `--fs-body` | `1rem` |
| `--fs-small` | `0.875rem` |
| `--fs-eyebrow` | `0.75rem` (uppercase, letter-spaced) |

Weights:
- 800 — display headlines, hero titles
- 700 — section H2s, CTA buttons
- 500 — eyebrow labels, badges
- 400 — body text

## Spacing scale

Waypoint-style 4px base, geometric:

| Token | Value | px |
|---|---|---|
| `--sp-1` | `0.25rem` | 4 |
| `--sp-2` | `0.5rem` | 8 |
| `--sp-3` | `0.75rem` | 12 |
| `--sp-4` | `1rem` | 16 |
| `--sp-5` | `1.5rem` | 24 |
| `--sp-6` | `2rem` | 32 |
| `--sp-7` | `3rem` | 48 |
| `--sp-8` | `4rem` | 64 |
| `--sp-9` | `6rem` | 96 |
| `--sp-10` | `8rem` | 128 |

## Radii

| Token | Value |
|---|---|
| `--r-sm` | `0.5rem` |
| `--r-md` | `1rem` |
| `--r-lg` | `1.5rem` |
| `--r-pill` | `999px` |

## Shadows

| Token | Use |
|---|---|
| `--shadow-1` | Subtle card lift |
| `--shadow-2` | Stronger card hover |
| `--shadow-3` | Floating nav, deep modals |

## Motion tokens

| Token | Duration | Curve |
|---|---|---|
| `--motion-fast` | `150ms` | `cubic-bezier(.4,0,.2,1)` |
| `--motion-base` | `300ms` | `cubic-bezier(.4,0,.2,1)` |
| `--motion-slow` | `600ms` | `cubic-bezier(.4,0,.2,1)` |

All animations respect `@media (prefers-reduced-motion: reduce)` and stop or simplify.

## Custom keyframes (in `styles.css`)

| Name | Used by | Description |
|---|---|---|
| `plane-arc` | `.hero__plane` | Paper plane drifts diagonally across hero |
| `pin-drop` | Algeria map pins | Each branch pin bounces in |
| `route-draw` | Algeria map dashes | SVG routes stroke-dash animate |
| `halo-pulse` | Map central pin (BBA) | Slow pulsing ring |
| `photo-fade` | Homepage `.home-hero__photos img` | Each photo fades + scales 12s loop, staggered delays |
| `particle-rise` | `.hero__particles span` | Floating dust particles in hero |

## Logo variants

- `site/assets/images/logo.svg` — cream/light variant (for dark backgrounds, including the floating nav)
- `site/assets/images/logo-navy.svg` — navy variant (for light surfaces)
- Original is `alliance travel logo .svg` at project root

The nav uses `logo.svg` always (since the nav is a glass pill on the dark hero). Footer might use either depending on theme.
