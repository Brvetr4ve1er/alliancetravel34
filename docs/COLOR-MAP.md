# Alliance Travel — Color Map & Design Tokens

> Audited: 2026-05-05
> Brand source: graphic chart "Charte graphique Février 2023" (`source of truth/charte graphique alliance travel.pdf`)
> Brand colors: **Prussian Blue `#002c51`** + **Teal Deer `#9ce8b2`** + White
> Maps (Phase 1.5 Algeria branches map + 5 trip itinerary maps) reuse the per-trip `--accent` for pins, route lines, and active labels — no new tokens needed.

---

## 1. Token system at a glance

```
SURFACES   →  bg / bg-2 / bg-card / bg-glass / border / border-hi
TEXT       →  txt-1 (primary)  ·  txt-2 (secondary)  ·  txt-3 (muted)
CTA        →  bronze (== mint, kept for backwards compat)  ·  bronze-hov  ·  bronze-dim
BRAND      →  navy / mint / mint-glow
SEMANTIC   →  sage (positive) · danger (errors)
PER-PAGE   →  accent / accent-dim / accent-glow  (overridden in each trip page)
```

---

## 2. Dark mode (default)

| Token | Value | Used for |
|-------|-------|----------|
| `--bg`         | `#000000`                  | Page background |
| `--bg-2`       | `#060c14`                  | Slightly lifted surface (alt section bg) |
| `--bg-card`    | `rgba(255,255,255,0.04)`   | Card surface |
| `--bg-glass`   | `rgba(0,44,81,0.35)`       | Departure-card glass overlay |
| `--border`     | `#1e2025`                  | Default 1px borders |
| `--border-hi`  | `rgba(156,232,178,0.25)`   | Highlighted borders (mint tint) |
| `--txt-1`      | `#efe8df`                  | Primary text — warm cream |
| `--txt-2`      | `#b8bac4`                  | Secondary text |
| `--txt-3`      | `#7a7c82`                  | Muted labels (WCAG-compliant on `#000`) |
| `--mint` / `--bronze`     | `#9ce8b2`     | CTA, selected, highlights |
| `--mint-hov` / `--bronze-hov` | `#7dd4a0` | Hover state |
| `--mint-dim` / `--bronze-dim` | `rgba(156,232,178,0.15)` | Tinted CTA bg |
| `--mint-glow`  | `rgba(156,232,178,0.28)`   | Soft accent glow |
| `--navy`       | `#002c51`                  | Brand depth surface |
| `--navy-hov`   | `#003d72`                  | Brand surface hover |
| `--navy-dim`   | `rgba(0,44,81,0.3)`        | Brand-tinted overlay |
| `--sage`       | `#3B7A65`                  | Confirmed / positive |
| `--sage-light` | `rgba(59,122,101,0.18)`    | Sage tint |
| `--danger`     | `#B94040`                  | Error / scarcity |
| `--danger-light` | `rgba(185,64,64,0.15)`   | Error tint |

### Contrast (against `#000000`)

| Foreground | Ratio | WCAG |
|-----------|-------|------|
| `#efe8df` (txt-1)         | 16.6:1 | AAA |
| `#b8bac4` (txt-2)         | 9.1:1  | AAA |
| `#7a7c82` (txt-3)         | 4.9:1  | AA |
| `#9ce8b2` (mint)          | 12.5:1 | AAA |
| `#002c51` (navy on black) | 1.6:1  | ❌ — only used as brand surface, never for text |

Dark mode `--bg` is **literal `#000000`** (verified 2026-05-05 in `styles.css:59`). The matching light mode `--bg` is `#fbf8f1` (`styles.css:3254`).

---

## 3. Light mode (`[data-theme="light"]`)

| Token | Value | Notes |
|-------|-------|-------|
| `--bg`         | `#fbf8f1`            | Warm cream base |
| `--bg-2`       | `#f3ede1`            | Slightly darker cream |
| `--bg-card`    | `rgba(0,44,81,0.04)` | Card surface tint |
| `--bg-glass`   | `rgba(255,255,255,0.85)` | Glass overlay |
| `--border`     | `#e0d9c8`            | Subtle warm borders |
| `--border-hi`  | `rgba(0,44,81,0.18)` | Highlighted borders |
| `--txt-1`      | `#002c51`            | Brand navy as primary text |
| `--txt-2`      | `#4a5b6f`            | Secondary navy-gray |
| `--txt-3`      | `#8a99a8`            | Muted |
| `--bronze` / `--mint` | `#2e8b57`     | Darker mint (sea-green) for AAA contrast on cream |
| `--mint-hov`   | `#226d44`            | Hover |
| `--mint-dim`   | `rgba(46,139,87,0.10)` | Light tint |
| `--accent`     | `#2e8b57`            | Default per-page accent |

### Contrast (against `#fbf8f1`)

| Foreground | Ratio | WCAG |
|-----------|-------|------|
| `#002c51` (txt-1, brand navy)  | 13.8:1 | AAA |
| `#4a5b6f` (txt-2)              | 6.7:1  | AAA |
| `#8a99a8` (txt-3)              | 3.4:1  | AA (for large text) |
| `#2e8b57` (mint, dark)         | 4.6:1  | AA |

---

## 4. Per-trip accent colors

These override the default `--accent` on each trip page. The accent appears in: section eyebrows, hero glow, trust pill icons, hl-card icons, and decorative elements.

| Trip | Region | `--accent` | Theme |
|------|--------|------------|-------|
| Le Caire & Sharm | egypt | `#C9872E` | Egyptian gold / saharan amber |
| Azerbaïdjan | azerbaijan | `#3AAFAF` | Caspian teal |
| Istanbul | istanbul | `#70b8e0` | Bosphorus blue (boosted from `#5B9EC9` for black-bg contrast) |
| Kuala Lumpur | malaysia | `#4CAF82` | Tropical jade |
| Sharm-Constantine | sharm | `#28B4D4` | Red Sea aqua |

The CTA button color (`--bronze` / `--mint`) is the **same on every trip page** — Alliance Travel's signature mint — so the conversion target is instantly recognizable across the site. The per-trip accent is decorative only.

---

## 5. Photo-overlay components (theme-INDEPENDENT)

These badges sit on top of hotel/trip photos and **must remain readable regardless of page theme**. They're locked to dark glass + light text:

| Component | Background | Text |
|-----------|-----------|------|
| `.trip-card__flag` | `rgba(12,14,18,0.78)` | `rgba(255,255,255,0.85)` |
| `.trip-card__from` | `rgba(12,14,18,0.85)` | `rgba(255,255,255,0.7)` (label) + `#fff` (price strong) |
| `.hotel-card__ribbon` | `rgba(12,14,18,0.88)` | `rgba(255,255,255,0.85)` |
| `.trip-card__share` | `rgba(12,14,18,0.78)` | `#ffffff` |
| `.hero__strip` | `rgba(12,14,18,0.65)` | `rgba(255,255,255,0.82)` |

> ⚠️ Earlier these used `var(--txt-1)` and `var(--txt-2)` which flipped to navy in light mode → invisible against the dark glass. Fixed in v3.

---

## 6. Spacing & radius (Waypoint scale)

| Token | Value | Use |
|-------|-------|-----|
| `--s1` | `4px`   | tightest gap |
| `--s2` | `9px`   | icon + label gap |
| `--s3` | `16px`  | inner padding sm |
| `--s4` | `24px`  | inner padding md |
| `--s5` | `24px`  | section gap (alias of s4) |
| `--s6` | `32px`  | section gap |
| `--s7` | `40px`  | section gap lg |
| `--s8` | `40px`  | (alias) |
| `--s9` | `56px`  | section vertical |
| `--s10` | `72px` | section vertical |
| `--s11` | `96px` | section vertical |
| `--s12` | `128px` | hero vertical |
| `--r1` | `2px`   | tags, badges |
| `--r2` | `8px`   | buttons, inputs |
| `--r3` | `12px`  | cards, panels |
| `--r4` | `999px` | pills (CTA, nav) |

---

## 7. Typography

- Family: **DM Sans** (Google Fonts, weights 300/400/500/600/700 + italic 400)
- Subset hardened in commit `27ae633` — dropped italic 300, added regular 700 to support headline weight without shipping a second family
- Used as both display and body — single family for cohesion
- Numerics: `font-variant-numeric: tabular-nums` on prices (no shifting columns when calculator updates)

---

## 8. Motion

| Token | Value | Use |
|-------|-------|-----|
| `--t`      | `200ms ease-out` | Default transitions |
| `--t-fast` | `200ms ease-out` | (Same — unified per Waypoint) |

Animation durations elsewhere:
- Theme transition: `320ms ease`
- Counter animation: `1600ms ease-out cubic`
- Toast: `220ms ease`
- Trip switcher dropdown: `180ms ease`

`prefers-reduced-motion` disables all transitions globally.

---

## 9. Elevation

| Token | Value |
|-------|-------|
| `--elev-1` (dark) | `0 1px 0 rgba(0,44,81,.2), 0 4px 16px rgba(0,0,0,.4)` |
| `--elev-2` (dark) | `0 12px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(0,44,81,.15)` |
| `--elev-1` (light) | `0 1px 0 rgba(0,44,81,.06), 0 4px 16px rgba(0,44,81,.05)` |
| `--elev-2` (light) | `0 12px 48px rgba(0,44,81,.12)` |
