# Production Audit — Visual Polish & Design-System Consistency

**Project:** Alliance Travel (trilingual vanilla static site)
**Scope:** Visual consistency vs. design tokens (`--space-*`, `--fs-*`, `--r*`, `--elev-*`, `--t-*`, `--accent`, theme tokens).
**Mode:** Read-only. No files edited.
**Date:** 2026-07-03

---

## Design system reference (as defined in `styles.css`)

| Token family | Values |
|---|---|
| Spacing (`--space-1..10`) | 4 / 8 / 16 / 24 / 32 / 48 / 64 / 80 / 96 / 128 px |
| Legacy spacing (`--s1..12`) | 4 / 8 / 16 / 24 / 24 / 32 / 40 / 40 / 56 / 72 / 96 / 128 px |
| Type scale (`--fs-*`) | fluid clamp() caption → display-1 |
| Radii | `--r1:2px` `--r2:8px` `--r3:12px` `--r4:999px` |
| Elevation | `--elev-1`, `--elev-2` |
| Motion | `--t-fast:180` `--t-base:320` `--t-slow:560` `--t-cinema:900` |
| Touch | `--touch-min:44px` `--field-h:52px` |

The tokens are well-designed. The problem is **adherence**: several families (type scale, radius pill, elevation) are defined but bypassed by hundreds of raw values, and a cluster of hardcoded colors defeats the theme system, producing the client-reported "invisible text after toggling theme."

---

## CRITICAL / HIGH — theme-flip legibility (root cause of "invisible text")

### 1. `.nav-cta` WhatsApp button — white text on light mint in dark mode (contrast 1.44:1)
`styles.css:580` sets `background: var(--mint); color:#fff;`. In dark mode `--mint = #9ce8b2` (light) so **white text on light mint ≈ 1.44:1 — effectively invisible**. The canonical mint-button pattern, `.btn--primary` (`styles.css:1570-1571`), correctly uses `color: var(--navy)`. Fix: change `.nav-cta` color to `var(--navy)`.

### 2. Related-trip card accents hardcoded inline — washed out in light mode (2.4–3.0:1)
Every trip page repeats `<span class="related-card__flag" style="color:#XXXXXX">` and `<span class="related-card__cta" style="color:#XXXXXX">` with a fixed region hex (`#3AAFAF`, `#19B5B0`, `#28B4D4`, `#D98E48`, `#C9872E`, `#5B9EC9`, `#15A88E`, `#4CAF82`). `.related-card` background is `var(--bg-card)` = **`#ffffff` in light mode**. Measured contrast on white: 2.45–3.00:1 — all **fail WCAG AA** and look faded/near-invisible. Worse, `.related-card__cta` in CSS (`styles.css:3246`) already declares `color: var(--accent)` — the inline hex *overrides the correct token*. Fix: delete the inline `style="color:…"` and let `var(--accent)` (already scoped per card/page) drive it. ~32 instances across 8 trip pages (`egypte/index.html:1505,1508,1526,1529` and equivalents in istanbul/azerbaidjan/kuala-lumpur/tunisie/bali/vietnam/cairo-sharm).

### 3. `.hotel-card__ribbon` fully defined twice — first block is dead code (with unreachable low-contrast colors)
`.hotel-card__ribbon` is declared at `styles.css:1032-1060` **and again** at `styles.css:8119-8151` with a completely different look (flat pill vs rotated hard-shadow sticker; `top:var(--s3)` vs `top:14px`; radius `--r1`=2px vs `4px`; font `.625rem` vs `10px`). Same specificity → the later block wins, so 1032-1060 (including `.economique{color:#8AB4F8}` 2.11:1 and `.medium{color:#8BD5CA}` 1.68:1 on white) is **dead code**. The live block (8144-8151) correctly ships light-mode overrides. Fix: delete the superseded block 1032-1060 to remove the duplication and the misleading low-contrast rules.

---

## MEDIUM — design-system adherence drift

### 4. Type scale (`--fs-*`) largely bypassed — 224 raw font-sizes vs 28 token uses
Only 28 `font-size: var(--fs-*)`; there are 203 raw `rem` and 21 raw `px` font-sizes. Many map exactly to tokens (`.8125rem`→`--fs-caption`, `.875rem`→`--fs-body-sm`, `.75rem`→`--fs-caption` floor) and should be swapped for the token. Several are true off-scale one-offs with no token: `.6875rem`, `.625rem`, `.5625rem`, `1.0625rem`, `0.825rem`, `0.95rem`, `.9rem`, `0.7rem`, and raw px `13px`, `9px`, `17px`, `11px`. This is the single largest token-adherence gap.

### 5. Pill radius: raw `999px` used 29× vs `--r4` used 2×; mismatched radius fallbacks
`--r4` (999px) exists but is nearly abandoned (`styles.css:581,622,720,812,1206,1540,…` = 29 raw). More concerning are **fallbacks that disagree with the token value**: `var(--r2, 12px)` (`--r2` is 8px) at `styles.css:5847,6003,6132,6335`; `var(--r3, 24px)` (`--r3` is 12px) at `5809,6102`; `var(--r3, 14px)` at `7594,7834`; `var(--r2, 10px)` at `8960`. If the var ever fails to resolve, radius jumps to the wrong value. Fix: normalize fallbacks to the real token value; migrate raw `999px`→`var(--r4)`.

### 6. Off-token border-radii (14 / 16 / 18 / 10 / 6 px)
Raw radii that match no token: `14px` (`styles.css:264,1812,5428,7994`), `16px` (`5702`), `18px` (`8456`), `10px` (`5544,7630`), `6px` (`5350,7084`). Snap to `--r3` (12px) or `--r2` (8px).

### 7. Elevation tokens abandoned — 59 bespoke box-shadows vs 5 token uses
`--elev-1`/`--elev-2` are used only 5×; 59 raw shadows exist with a wide variety of blur/spread/offset/alpha values (e.g. `0 30px 60px -30px`, `0 24px 44px -22px`, `0 14px 30px -8px`). Shadows won't read as a coherent elevation ladder and several dark-tinted shadows don't have light-mode softening. Consolidate common cases onto `--elev-1/2` (or add 1–2 rungs) and reserve bespoke shadows for the sticker/neobrutalist hotel-card only.

---

## LOW — off-rhythm spacing and micro-inconsistencies

### 8. Off-scale spacing values sprinkled through small UI
Non-scale px used for padding/margin/gap: `6px`, `10px`, `12px`, `14px`, `18px`, `22px`, `28px`, `36px`, `70px`, `90px` (e.g. `styles.css:5441 padding:18px 22px`, `5486 padding:0 22px 22px 70px`, `4932 scroll-margin-top:90px`, `5594 margin-bottom:18px`, `5728 gap:28px`). Mostly map chips/labels/map-controls. Nudge to nearest `--space-*`/`--s*` step (e.g. 18→16 or 24, 22→24, 36→32/40).

### 9. `--touch-min` bypassed — 22 raw `44px` vs 11 token uses
`44px` hardcoded at `styles.css:920-921, 1786-1787, 2543, 5364-5365, 7904-7905` where `var(--touch-min)` should be used for a single source of truth.

### 10. `transition: all` used 13× (jank + paints unrelated props)
`styles.css:1210,1316,2628,3269,3380,6748,6817,6856,7043,7086,7797,7912,8337`. Replace with explicit property lists (as `.btn` and `.trip-card__cta` already do) so only intended properties animate.

### 11. Error/validation text bypasses `--danger` token
`.bf-field-err`/`.req`/banner use raw `#d04444` / `#c43d3d` / `#b13434` (`styles.css:7448,7472,7487,7493,7498`) instead of `--danger` (`#cf5252`) / `--danger-soft`. Still visible in both themes, but a token bypass. Consolidate onto `--danger`.

### 12. Homepage trip-card CTA color set inline instead of via a card token
`index.html:470,522,575,627,679,731,783` use `style="color:#XXXXXX"` on `.trip-card__cta`, overriding the card's `--tc-fg`/`--tc-accent` system. On the dark card art these stay visible, but they bypass the per-card token. Prefer setting `--tc-accent` on the card and letting the CTA inherit.

---

## Notes on client's other reported issues (visual angle only)

- **Nav duplicate WhatsApp CTA:** `.nav-cta` (header) and `.btn--wa` share the WhatsApp affordance but style differently (`.nav-cta` = mint+white 1.44:1 bug; `.btn--wa` = brand green + white, correct). If both render near each other, unify onto the `--wa-green` treatment for a single visual language. (Structural duplicate/dead-control removal is the nav auditor's call.)
- The per-region accent colors (`--accent` inline overrides on `.trip-tag`, section wrappers) are the intended pattern and are fine; only the raw `color:#hex` variants (findings 2, 12) break the token flow.

---

## Fix priority

1. **Finding 1** (nav-cta 1.44:1) — one-line, high visibility, near-zero risk.
2. **Finding 2** (related-card inline accents) — delete inline colors, medium volume, low risk (CSS already has the correct token).
3. **Finding 3** (dead ribbon block) — safe deletion, removes confusion.
4. Findings 4–7 — systematic token migration; batch carefully with visual spot-checks.
5. Findings 8–12 — polish pass.
