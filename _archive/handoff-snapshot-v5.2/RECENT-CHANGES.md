# Recent Changes (this session)

Conversation date range: ~2026-04-29 → 2026-05-01. Multiple compactions occurred — what follows is the consolidated changelog as best as can be reconstructed from the final summary.

## Phase A — Frontend redesign kickoff (`/frontend-design` skill)

- User invoked `/frontend-design` for "premium aesthetic improvements, don't change too much, just improve more"
- Loaded the skill's design-system patterns (Waypoint-style scale, geometric spacing, type scale)
- Audited existing design via `SITEMAP.md` + `COLOR-MAP.md`

## Phase B — Content updates

### Bordj Bou Arreridj migration

- User: "the notre histoire section [should be] about alliance travel being from the region of bordj bou arreridj instead of setif"
- Replaced "Sétif" → "Bordj Bou Arreridj" across user-facing pages
- Rewrote "Notre histoire" copy: agency described as "ville-charnière entre les Hauts-Plateaux et l'Est algérien" + 6-wilaya network mention
- Updated booking form placeholder: `placeholder="Sétif"` → `placeholder="Bordj Bou Arreridj"` (booking-form.js:65)
- Cairo+Sharm testimonial city updated
- Migration driver: `_phone_city_migrate.py`
- Some doc files (MASTER.md, SITEMAP.md, IMAGE-ASSETS.md) **still mention Sétif** — see KNOWN-ISSUES

### Phone-number migration

- User: "change every single wrong phone number on the website to these"
- 6 official numbers (canonical):
  - `0561616266`, `0561616267`, `0561616268`, `0561616269`
  - `0560869905`, `0560860617`
- Verified all `tel:` and `wa.me` links across all 6 pages
- Migration driver: `_phone_city_migrate.py`

## Phase C — Travel-themed animations

- Added paper-plane SVG drifting across each trip hero (`plane-arc` keyframe, 14s loop)
- Added 7 floating particle spans per hero (`particle-rise` keyframe, varying delays)
- Added staggered scroll-reveal observer (`enhance.js`)

## Phase D — Algeria branches map (homepage `#agences`)

- New section between "Notre histoire" (`#agence`) and "Contact" (`#contact`)
- Custom SVG outline of Algeria with 7 city pins
- 5 animated dashed routes connecting Bordj Bou Arreridj (HQ) to other branches
- `pin-drop`, `route-draw`, `halo-pulse` keyframes
- Branch cards with addresses + phone numbers (using the official 6)
- CSS layer: v4 (`_v4_styles.css` → appended to `styles.css`)

## Phase E — Per-region atmospheric backgrounds (v5)

User request: "i want you to add backgrounds and hero section backgrounds that are tailored for every page"

- Added `body[data-region="..."]` on each of the 5 trip pages (egypt/azerbaijan/istanbul/malaysia/sharm)
- Created 5 unique inline-SVG body patterns:
  - Egypt: hieroglyph chevrons (warm amber)
  - Azerbaijan: flame-tower pattern (crimson)
  - Istanbul: 8-point Ottoman star (turquoise)
  - Malaysia: tropical leaf (jungle green)
  - Sharm: waves + bubbles (coral aqua)
- Patterns use `mix-blend-mode: screen` (dark mode) / `multiply` (light mode)
- Created hero deco foreground silhouettes per region:
  - Egypt: pyramid silhouettes
  - Azerbaijan: flame-tower silhouettes
  - Istanbul: dome+minaret silhouettes
  - Malaysia: Petronas Towers silhouette
  - Sharm: coral/wave silhouettes
- All via gradient pseudo-elements with region accent tint
- CSS layer: v5 (`_v5_styles.css` → appended to `styles.css`)

## v5 critical bug

After v5 was applied, user reported:
> "OK NOW THERE ARE MISSALIGNMENT ISSUES FOR EXAMPLE THE NAVBAR IS BEING HIDDEN BY THE HERO SECTION AND THERE WERE NO images added"

**Root cause:** v5 included this rule:

```css
.site-nav, main, footer, section, .home-hero {
  position: relative;
  z-index: 1;
}
```

This downgraded `.site-nav` from its original `z-index: 100`, so the hero's stacking context covered it.

## v5.2 fix (LATEST applied layer)

Source file: `_v5_2_styles.css` (153 lines, appended to `styles.css` last)

### Changes

1. **Removed `.site-nav`** from the `z-index: 1` reset selector list (only `main, footer, section, .home-hero` remain reset)
2. **Added** explicit `.site-nav { z-index: 100 !important; }` rule to reinforce the floating nav layering
3. **Pinned per-region hero photos** as full-bleed backgrounds via `[data-region="..."] .hero { background-image: url(...) }` — addresses the "no images" complaint
4. **Repurposed `.hero__bg`** in the region context to be a left-to-right dark gradient overlay over the photo (and a cream gradient in light mode)
5. **Softened `.hero__visual`** side panel since the hero photo is now full-bleed (turns into a subtle frame)
6. **Added `.home-hero__photos`** styles — 5-image grid behind homepage hero, each photo fades + scales in a 12s loop with staggered delays (`photo-fade` keyframe)
7. **Mobile responsive**: photo grid stacks 2 columns × 3 rows on `max-width: 768px`, hides 5th photo
8. **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables `photo-fade` animation

### Verification status

⚠️ **Not visually verified before context ran out.** That's the next concrete task — see [CONTINUE-HERE.md](CONTINUE-HERE.md).

## Earlier (pre-redesign) work referenced in summary

- WCAG fix: `--txt-3` darkened from `#8a99a8` → `#5a6a7c` (2.92:1 → 5.54:1 on cream)
- Light-mode mint darkened to `#237a4a` for AA contrast on cream
- Calculator + booking form merged visually (removed duplicate WhatsApp button from calculator)
- Trip pages reorganized: itinerary → trust → inclus → FAQ → hotels → calculator+booking
- Hotel images fetched from Wikimedia Commons via `_hotels_fetch_v2.py` (with rate-limit cache + dedupe for shared physical hotels)
- Original logo split into 2 variants: `logo.svg` (cream) + `logo-navy.svg` (navy)

## Files changed (this session, by area)

**HTML pages:**
- `site/index.html` (homepage hero photos collage, Algeria map, "Notre histoire" rewrite)
- `site/cairo-sharm/index.html` + 4 other trip pages (data-region, hero deco, particles, plane SVG)

**CSS:**
- `site/assets/css/styles.css` (appended v2, v4, v5, v5.2 layers — now 4,531 lines)

**JS:**
- `site/assets/js/booking-form.js` (placeholder city)
- `site/assets/js/calculator.js` (already exposing __calcState before this session)
- `site/assets/js/enhance.js` (theme toggle, reveals, etc — minor adjustments)

**Assets:**
- `site/assets/images/heroes/` — 5 hero JPGs added
- `site/assets/images/hotels/` — 17 hotel JPGs (some refetched/dedupe)

**Documentation:**
- `SITEMAP.md`, `COLOR-MAP.md`, `IMAGE-ASSETS.md`, `IMAGE-FETCH-REPORT.md` — updated through the session

**Migration scripts:**
- `_v2_styles.css`, `_v4_styles.css`, `_v5_styles.css`, `_v5_2_styles.css` (appended in order)
- `_migrate_v2.py`, `_phone_city_migrate.py`, `_address_fix.py`, `_reorganize_pages.py`
- See [MIGRATION-SCRIPTS.md](MIGRATION-SCRIPTS.md) for full details

## Things requested but NOT addressed

- Trust/testimonials section parity across all 5 trip pages (only Cairo+Sharm has it)
- `<main id="main">` skip-link target on the 4 non-Cairo trip pages
- og/ and favicon/ folders are still empty
- Some doc-internal Sétif references (in MASTER.md, SITEMAP.md, IMAGE-ASSETS.md) not yet cleaned

See [KNOWN-ISSUES.md](KNOWN-ISSUES.md).
