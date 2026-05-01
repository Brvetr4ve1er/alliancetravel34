#!/usr/bin/env python
"""
Alliance Travel — Design System Migration
  - Brand palette from graphic chart: Navy #002c51, Mint #9ce8b2
  - Typography: DM Sans (Nexa open-source match)
  - Token system: Waypoint-inspired (black base, airy spacing, pill radius for CTAs)
  - Logo: real SVG replacing text placeholder
"""
import re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT  = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
SITE  = ROOT / 'site'
CSS   = SITE / 'assets' / 'css' / 'styles.css'

# ─── 1. Update styles.css ────────────────────────────────────────────────
css = CSS.read_text(encoding='utf-8')

# Replace Google Fonts import
OLD_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap');"
NEW_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap');"
css = css.replace(OLD_IMPORT, NEW_IMPORT, 1)

NEW_ROOT = """/* ── Tokens ─────────────────────────────────────────────── */
:root {
  /* ── Surfaces — Alliance Travel × Waypoint ─────────────────────── */
  --bg:         #000000;
  --bg-2:       #060c14;
  --bg-card:    rgba(255,255,255,0.04);
  --bg-glass:   rgba(0,44,81,0.35);
  --border:     #1e2025;
  --border-hi:  rgba(156,232,178,0.25);

  /* ── Brand palette ────────────────────────────────────────────── */
  --navy:       #002c51;
  --navy-hov:   #003d72;
  --navy-dim:   rgba(0,44,81,0.3);
  --mint:       #9ce8b2;
  --mint-hov:   #7dd4a0;
  --mint-dim:   rgba(156,232,178,0.15);
  --mint-glow:  rgba(156,232,178,0.28);

  /* ── Text — warm cream ────────────────────────────────────────── */
  --txt-1:  #efe8df;
  --txt-2:  #b8bac4;
  --txt-3:  #7a7c82;

  /* ── CTA: mint replaces bronze (same var name — zero downstream changes) */
  --bronze:     #9ce8b2;
  --bronze-hov: #7dd4a0;
  --bronze-dim: rgba(156,232,178,0.15);

  /* ── Affirmative / danger ─────────────────────────────────────── */
  --sage:       #3B7A65;
  --sage-light: rgba(59,122,101,0.18);
  --danger:       #B94040;
  --danger-light: rgba(185,64,64,0.15);

  /* ── Default per-page accent (overridden on each trip page) ───── */
  --accent:       #9ce8b2;
  --accent-dim:   rgba(156,232,178,0.13);
  --accent-glow:  rgba(156,232,178,0.22);

  /* ── Typography — DM Sans ────────────────────────────────────── */
  --font-display: 'DM Sans', system-ui, sans-serif;
  --font-body:    'DM Sans', system-ui, sans-serif;

  /* ── Spacing — Waypoint scale ────────────────────────────────── */
  --s1: 4px; --s2: 9px; --s3: 16px; --s4: 24px; --s5: 24px; --s6: 32px;
  --s7: 40px; --s8: 40px; --s9: 56px; --s10: 72px; --s11: 96px; --s12: 128px;

  /* ── Radius — Waypoint ────────────────────────────────────────── */
  --r1: 2px;
  --r2: 8px;
  --r3: 12px;
  --r4: 999px;

  /* ── Elevation — navy-tinted ──────────────────────────────────── */
  --elev-1: 0 1px 0 rgba(0,44,81,.2), 0 4px 16px rgba(0,0,0,.4);
  --elev-2: 0 12px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(0,44,81,.15);

  /* ── Motion ───────────────────────────────────────────────────── */
  --t:      200ms ease-out;
  --t-fast: 200ms ease-out;
}"""

root_pattern = re.compile(r'/\* ── Tokens.*?^}', re.DOTALL | re.MULTILINE)
css, n = root_pattern.subn(NEW_ROOT, css, count=1)
print(f':root block replaced: {n} substitution(s)')

# ── Component overrides (appended at the very end) ─────────────────────
COMPONENT_OVERRIDES = """

/* ══════════════════════════════════════════════════════════
   ALLIANCE TRAVEL BRAND SYSTEM — Token overrides applied
   Navy #002c51 · Mint #9ce8b2 · DM Sans · Waypoint scale
   ══════════════════════════════════════════════════════════ */

/* ── Global focus ring ───────────────────────────────────── */
:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 2px;
  border-radius: 2px;
}
:focus:not(:focus-visible) { outline: none; }

/* ── Skip link ───────────────────────────────────────────── */
.skip-link {
  position: absolute;
  top: -100px;
  left: 8px;
  background: var(--mint);
  color: var(--navy);
  font-weight: 600;
  padding: var(--s2) var(--s4);
  border-radius: var(--r2);
  z-index: 9999;
  transition: top var(--t);
}
.skip-link:focus { top: 8px; }

/* ── Nav logo with real SVG ──────────────────────────────── */
.nav-logo-img {
  height: 36px;
  width: auto;
  display: block;
}
.site-nav { gap: var(--s5); }

/* ── Nav scrolled: navy surface ──────────────────────────── */
.site-nav.scrolled {
  background: rgba(0,44,81,0.95);
  border-bottom: 1px solid var(--border);
}

/* ── Mint CTA: text contrast ─────────────────────────────── */
.btn--primary {
  color: var(--navy);
  font-weight: 600;
}
.btn--primary:hover {
  box-shadow: 0 6px 20px rgba(156,232,178,.35);
}

/* ── Trip cards — Waypoint border/radius ─────────────────── */
.trip-card { border-color: var(--border); border-radius: var(--r3); }
.trip-card:hover { border-color: rgba(156,232,178,0.45); }
.trip-card__flag { border-radius: var(--r1); }
.trip-card__from { border-radius: var(--r2); }

/* ── Hotel cards ─────────────────────────────────────────── */
.hotel-card { border-radius: var(--r3); border-color: var(--border); }
.hotel-card.selected { border-color: var(--mint); box-shadow: 0 0 0 1px var(--mint), var(--elev-2); }
.hotel-card__ribbon { border-radius: var(--r1); }
.hotel-card__cta:hover { background: var(--mint-dim); border-color: var(--mint); color: var(--mint); }
.hotel-card.selected .hotel-card__cta { background: var(--mint-dim); border-color: var(--mint); color: var(--mint); }

/* ── Tier tabs ────────────────────────────────────────────── */
.tier-tab[aria-pressed="true"] { border-color: var(--mint); color: var(--mint); }
.tier-tab:hover { color: var(--txt-1); }

/* ── Calculator ──────────────────────────────────────────── */
.date-chip.active { border-color: var(--mint); background: var(--mint-dim); color: var(--mint); }
.seg-opt.active   { background: var(--mint-dim); color: var(--mint); }
.stepper__btn:hover:not(:disabled) { border-color: var(--mint); color: var(--mint); }
.extra-toggle.checked { border-color: var(--mint); background: var(--mint-dim); }
.extra-toggle.checked .extra-toggle__check { background: var(--mint); border-color: var(--mint); }
.breakdown { border-color: var(--border); border-radius: var(--r3); }

/* ── Booking form ────────────────────────────────────────── */
.bform-block { border-color: var(--border); border-radius: var(--r3); }
.bform-field input:focus,
.bform-field select:focus,
.bform-field textarea:focus {
  border-color: var(--mint);
  box-shadow: 0 0 0 3px rgba(156,232,178,0.2);
}
.bform-preview { border-color: var(--border); border-radius: var(--r3); }

/* ── FAQ ─────────────────────────────────────────────────── */
.faq-item { border-color: var(--border); border-radius: var(--r1); }
.faq-q:hover { color: var(--mint); }

/* ── Packages ────────────────────────────────────────────── */
.pkg-card { border-color: var(--border); border-radius: var(--r3); }
.pkg-card.recommended { border-color: var(--mint); box-shadow: 0 0 0 1px var(--mint); }
.pkg-badge { background: var(--mint); color: var(--navy); }

/* ── Inclus panel ────────────────────────────────────────── */
.inclus-col { border-color: var(--border); border-radius: var(--r3); }

/* ── Related cards ───────────────────────────────────────── */
.related-card { border-color: var(--border); border-radius: var(--r3); }
.related-card:hover { border-color: rgba(156,232,178,0.45); }

/* ── Stat / highlight cards ──────────────────────────────── */
.stat-card { border-color: var(--border); }
.hl-card { border-color: var(--border); border-radius: var(--r3); }

/* ── Footer ──────────────────────────────────────────────── */
.site-footer { background: var(--bg-2); border-color: var(--border); }
.footer-bottom { border-color: var(--border); }

/* ── Toast ────────────────────────────────────────────────── */
.toast--success { border-color: var(--mint); }
.toast--success svg { color: var(--mint); }

/* ── Hero bg — navy accent glow ──────────────────────────── */
.hero__bg::after {
  background: radial-gradient(ellipse 80% 60% at 70% 50%, var(--accent-glow), transparent 70%);
}
"""

# Append overrides
css += COMPONENT_OVERRIDES
CSS.write_text(css, encoding='utf-8')
print('styles.css overrides appended')

# ─── 2. Update all 8 HTML pages ─────────────────────────────────────────
PAGES = [
    SITE / 'index.html',
    SITE / 'cairo-sharm' / 'index.html',
    SITE / 'azerbaidjan' / 'index.html',
    SITE / 'istanbul' / 'index.html',
    SITE / 'kuala-lumpur' / 'index.html',
    SITE / 'sharm-constantine' / 'index.html',
]

FONT_OLD = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap'
FONT_NEW = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap'

# Read logo SVG content
LOGO_SVG = (SITE / 'assets' / 'images' / 'logo.svg').read_text(encoding='utf-8')
# Shrink SVG for nav: remove large dimensions, make it responsive at height 40px
LOGO_SVG_INLINE = LOGO_SVG.replace(
    'width="568" zoomAndPan="magnify" viewBox="0 0 426 148.499996" height="198"',
    'viewBox="0 0 426 148.499996" height="40" aria-label="Alliance Travel"'
)

# Skip link HTML to insert after <body>
SKIP_LINK = '<a class="skip-link" href="#main">Aller au contenu principal</a>\n'

for page in PAGES:
    if not page.exists():
        print(f'  skip (not found): {page}')
        continue
    html = page.read_text(encoding='utf-8')
    changed = False

    # 1. Replace font import
    if FONT_OLD in html:
        html = html.replace(FONT_OLD, FONT_NEW, 1)
        changed = True

    # 2. Replace DM Sans in <head> inline <style> if still Fraunces
    html = html.replace("'Fraunces',", "'DM Sans',")
    html = html.replace('"Fraunces",', '"DM Sans",')

    # 3. Replace nav-logo text with inline SVG
    # Homepage version (no ../ prefix needed)
    for pattern, logo_class in [
        (r'<a href="index\.html" class="nav-logo">Alliance<span>Travel</span></a>', 'home'),
        (r'<a href="\.\./index\.html" class="nav-logo">Alliance<span>Travel</span></a>', 'trip'),
    ]:
        m = re.search(pattern, html)
        if m:
            is_home = 'home' in logo_class
            href = 'index.html' if is_home else '../index.html'
            # Use relative path for img or inline SVG
            replacement = f'<a href="{href}" class="nav-logo" aria-label="Alliance Travel">{LOGO_SVG_INLINE}</a>'
            html = html[:m.start()] + replacement + html[m.end():]
            changed = True
            break

    # 4. Add skip link after <body> if not already present
    if 'class="skip-link"' not in html:
        html = html.replace('<body>\n', '<body>\n' + SKIP_LINK, 1)
        html = html.replace('<body>', '<body>\n' + SKIP_LINK, 1)
        changed = True

    # 5. Add id="main" to the first <section> if not present
    if 'id="main"' not in html:
        # Add to the first section (hero)
        html = re.sub(r'(<section class="hero")', r'<main id="main">\n\1', html, count=1)
        # Close main before footer
        html = html.replace('<footer class="site-footer"', '</main>\n<footer class="site-footer"', 1)
        changed = True

    if changed:
        page.write_text(html, encoding='utf-8')
        print(f'  updated: {page.relative_to(ROOT)}')

# ─── 3. Update per-trip accent overrides for contrast on black ───────────
# Verify each trip's --accent is readable on #000000
# Cairo: #C9872E → keep (good contrast on black)
# Azerbaijan: #3AAFAF → keep (good contrast)
# Istanbul: #5B9EC9 → boost to #70b8e0 (slightly brighter for black bg)
# KL: #4CAF82 → keep
# Sharm Constantine: #28B4D4 → keep

trip_overrides = {
    'istanbul': ('#5B9EC9', '#70b8e0'),  # boost for pure black
}
for slug, (old_val, new_val) in trip_overrides.items():
    p = SITE / slug / 'index.html'
    if p.exists():
        txt = p.read_text(encoding='utf-8')
        txt = txt.replace(f'--accent:      {old_val};', f'--accent:      {new_val};', 1)
        p.write_text(txt, encoding='utf-8')
        print(f'  accent updated: {slug} {old_val} → {new_val}')

print('\nMigration complete.')
