#!/usr/bin/env python
"""
Alliance Travel — Inject local images into HTML.

RULES (per the user's brief):
  - DO NOT change layout, component hierarchy, or CSS class names
  - DO NOT add inline styles
  - ONLY inject content into predefined placeholders (the SVG art blocks)

We:
  1. Add a small block of NEW CSS rules to styles.css (additive only)
  2. Replace the placeholder SVG content INSIDE existing wrapper divs with <img>
  3. Wrappers (.hero__visual-art, .trip-card__art) keep their classes intact
"""
import io, re, sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
SITE = ROOT / 'site'

# Trip page → (slug, hero alt text)
TRIPS = {
    'cairo-sharm':       'Pyramides de Gizeh au coucher du soleil — Le Caire & Sharm El Sheikh',
    'azerbaidjan':       'Tours de la Flamme illuminées à Bakou, Azerbaïdjan',
    'istanbul':          'Mosquée Bleue d\'Istanbul au crépuscule',
    'kuala-lumpur':      'Tours Petronas illuminées la nuit, Kuala Lumpur',
    'sharm-constantine': 'Côte de la Mer Rouge, Sharm El Sheikh',
}

# ─── 1. Append CSS rules to styles.css ────────────────────────────────────
CSS_BLOCK = """

/* ══════════════════════════════════════════════════════════
   IMAGE INJECTION — local photos in placeholder wrappers
   Added by _inject_images.py · additive only · no class mods
   ══════════════════════════════════════════════════════════ */
.hero__visual-img,
.trip-card__img,
.hotel-card__photo,
.hl-card__photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
  z-index: 0;
}
.hero__visual-img { z-index: 1; }
.hero__visual-art { position: relative; }
.trip-card__art { position: relative; }

/* Soft dark vignette so light text/badges stay legible over photos */
.hero__visual-art::after,
.trip-card__art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(12,14,18,0) 0%,
    rgba(12,14,18,0) 50%,
    rgba(12,14,18,.55) 100%
  );
  pointer-events: none;
  z-index: 2;
}
.trip-card__flag,
.trip-card__from {
  z-index: 3;
}
"""

def patch_css():
    css_file = SITE / 'assets' / 'css' / 'styles.css'
    css = css_file.read_text(encoding='utf-8')
    # Idempotent: skip if already patched
    if 'IMAGE INJECTION — local photos in placeholder wrappers' in css:
        print('  [css] already patched, skipping')
        return
    css_file.write_text(css + CSS_BLOCK, encoding='utf-8')
    print(f'  [css] +{len(CSS_BLOCK)} chars appended to styles.css')


# ─── 2. Patch each trip page hero ─────────────────────────────────────────
def patch_hero(slug: str, alt: str):
    page = SITE / slug / 'index.html'
    html = page.read_text(encoding='utf-8')

    img_tag = (
        f'<img class="hero__visual-img" '
        f'src="../assets/images/heroes/hero__{slug}.jpg" '
        f'alt="{alt}" '
        f'loading="eager" fetchpriority="high" '
        f'width="1600" height="1200"/>\n        '
    )

    # Idempotent: if already injected, skip
    if 'class="hero__visual-img"' in html:
        print(f'  [{slug}] hero already has <img>, skipping')
        return False

    # Match the SVG block inside .hero__visual-art and replace with <img>
    pattern = re.compile(
        r'(<div class="hero__visual-art">)\s*'
        r'(<svg[^>]*>.*?</svg>)\s*'
        r'(</div>)',
        re.DOTALL
    )
    new_html, n = pattern.subn(
        lambda m: m.group(1) + '\n        ' + img_tag + m.group(3),
        html
    )
    if n == 0:
        print(f'  [{slug}] NO match found in hero__visual-art')
        return False
    page.write_text(new_html, encoding='utf-8')
    print(f'  [{slug}] hero injected ({n} match)')
    return True


# ─── 3. Patch homepage trip cards ─────────────────────────────────────────
def patch_homepage_cards():
    page = SITE / 'index.html'
    html = page.read_text(encoding='utf-8')

    if 'class="trip-card__img"' in html:
        print('  [home] cards already have <img>, skipping')
        return

    # Each .trip-card__art currently has style="background:..." with an inline SVG inside
    # Replace the SVG inside trip-card__art with an <img>
    # We need to find each trip card and inject the right image based on its href

    # Match: <a href="cairo-sharm/index.html" class="trip-card" ...> ... <div class="trip-card__art"...> <svg>...</svg> </div>
    def replace_svg_in_card(match):
        block = match.group(0)
        # Pull the trip slug from the href
        href_match = re.search(r'href="([^/]+)/index\.html"', block)
        if not href_match:
            return block
        slug = href_match.group(1)

        img_tag = (
            f'<img class="trip-card__img" '
            f'src="assets/images/trips/card__home__{slug}.jpg" '
            f'alt="" '
            f'loading="lazy" '
            f'width="1280" height="720"/>'
        )
        # Replace the inner <svg>...</svg> with the img tag
        new_block = re.sub(
            r'<svg viewBox="0 0 560 315"[^>]*>.*?</svg>',
            img_tag,
            block,
            count=1,
            flags=re.DOTALL,
        )
        return new_block

    # Find each trip-card (non-greedy, ends at </a>)
    new_html, n = re.subn(
        r'<a href="[^"]+/index\.html" class="trip-card"[^>]*>.*?</a>',
        replace_svg_in_card,
        html,
        flags=re.DOTALL,
    )
    if n == 0:
        print('  [home] NO trip-cards matched')
        return
    page.write_text(new_html, encoding='utf-8')
    print(f'  [home] {n} trip cards injected')


# ─── Main ────────────────────────────────────────────────────────────────
def main():
    print('1. Patching CSS')
    patch_css()
    print('\n2. Patching hero images on each trip page')
    for slug, alt in TRIPS.items():
        patch_hero(slug, alt)
    print('\n3. Patching homepage trip cards')
    patch_homepage_cards()
    print('\nDone.')


if __name__ == '__main__':
    main()
