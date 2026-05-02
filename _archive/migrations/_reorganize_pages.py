#!/usr/bin/env python
"""
Alliance Travel — Page hierarchy reorganisation

Current (broken) order:
  1. Hero  2. Highlights  3. Hotels  4. Calculator  5. Itinerary
  6. Packages  7. Trust  8. Inclus  9. FAQ  10. FinalCTA  11. Related  12. Booking

New logical order (inspiration first → conviction → action):
  1. Hero
  2. Highlights
  3. Itinerary          ← moved up (build desire)
  4. Trust              ← moved up (social proof)
  5. Inclus/Non Inclus  ← moved up (transparency)
  6. FAQ                ← moved up (remove objections)
  7. Hotels picker      ← start of action zone
  8. Calculator  ─┐
  9. Booking form ┘  ← married (one visual block)
 10. Related trips
 11. Final CTA         ← keep but simplified

Also:
  - Packages section removed (redundant with hotel picker tier tabs)
  - Calculator section head relabelled to "Étape 1 / 2"
  - Booking section head relabelled to "Étape 2 / 2"
  - Nav links updated: Programme | Hôtels | FAQ | Réserver
  - CSS added: calc+booking sections merge visually (no gap)
"""
import re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
SITE = ROOT / 'site'

# ─── Section extractor ────────────────────────────────────────────────────
def extract_sections(html):
    """
    Returns (preamble, [(key, html)...], postamble)
    preamble = everything up to first <section
    postamble = everything after last </section>
    """
    segments = []
    i = 0
    preamble_end = None

    while i < len(html):
        m = re.search(r'<section\b', html[i:])
        if not m:
            break
        start = i + m.start()
        if preamble_end is None:
            preamble_end = start

        # Find matching </section> (track depth)
        j = start + len('<section')
        depth = 1
        while depth > 0 and j < len(html):
            mo = html.find('<section', j)
            mc = html.find('</section>', j)
            if mc == -1:
                j = len(html); break
            if mo != -1 and mo < mc:
                depth += 1; j = mo + len('<section')
            else:
                depth -= 1; j = mc + len('</section>')

        block = html[start:j]

        # Identify section
        head = block[:300]
        if   'class="hero"'           in head: key = 'hero'
        elif 'class="highlights'      in head: key = 'highlights'
        elif 'id="hotels"'            in head: key = 'hotels'
        elif 'id="calculator"'        in head: key = 'calculator'
        elif 'id="itinerary"'         in head: key = 'itinerary'
        elif 'itinerary-bg'           in head: key = 'itinerary'
        elif 'class="packages-bg'     in head: key = 'packages'      # will be removed
        elif 'class="trust-bg'        in head: key = 'trust'
        elif 'class="inclus-section'  in head: key = 'inclus'
        elif 'id="faq"'              in head: key = 'faq'
        elif 'class="final-cta'       in head: key = 'final_cta'
        elif 'class="related-section' in head: key = 'related'
        elif 'id="booking"'           in head: key = 'booking'
        else:                                    key = f'unknown_{len(segments)}'

        segments.append((key, block))
        i = j

    preamble = html[:preamble_end] if preamble_end else html
    postamble = html[i:]
    return preamble, segments, postamble


DESIRED_ORDER = [
    'hero', 'highlights', 'itinerary', 'trust', 'inclus', 'faq',
    'hotels', 'calculator', 'booking', 'related', 'final_cta',
]
# 'packages' deliberately absent → will be dropped

# ─── Calculator section head update ───────────────────────────────────────
def update_calc_head(section_html):
    section_html = section_html.replace(
        '<p class="section-head__eyebrow">Tarification transparente</p>',
        '<p class="section-head__eyebrow">Étape 1 · Configurez votre voyage</p>',
    )
    section_html = section_html.replace(
        '<h2 class="section-head__title">Calculez <em>votre budget</em></h2>',
        '<h2 class="section-head__title">Choisissez <em>votre formule</em></h2>',
    )
    return section_html

# ─── Booking section head update ──────────────────────────────────────────
def update_booking_head(section_html):
    section_html = section_html.replace(
        '<p class="section-head__eyebrow">Demande de réservation</p>',
        '<p class="section-head__eyebrow">Étape 2 · Complétez votre dossier</p>',
    )
    return section_html

# ─── Nav links update ─────────────────────────────────────────────────────
NEW_NAV = {
    # Old link text / href → new
    'href="#hotels"': 'href="#hotels"',
    'href="#calculator"': 'href="#booking"',  # calculator is now part of booking zone
    'href="#itinerary"': 'href="#itinerary"',
    'href="#faq"': 'href="#faq"',
    'href="#booking"': 'href="#booking"',
}

def update_nav(html):
    # Remove the "Tarifs" link (calculator no longer standalone)
    html = re.sub(
        r'<li><a href="#calculator">[^<]*</a></li>\s*',
        '',
        html
    )
    # Rearrange remaining nav links to: Programme | Hôtels | FAQ | Réserver
    # Replace nav-links ul content
    nav_m = re.search(r'(<ul class="nav-links"[^>]*>)(.*?)(</ul>)', html, re.DOTALL)
    if nav_m:
        new_links = (
            '\n    <li><a href="#itinerary">Programme</a></li>'
            '\n    <li><a href="#hotels">Hôtels</a></li>'
            '\n    <li><a href="#faq">FAQ</a></li>'
            '\n    <li><a href="#booking">Réserver</a></li>'
            '\n  '
        )
        html = html[:nav_m.start(2)] + new_links + html[nav_m.end(2):]
    return html

# ─── Process each trip page ───────────────────────────────────────────────
TRIP_PAGES = [
    SITE / 'cairo-sharm' / 'index.html',
    SITE / 'azerbaidjan' / 'index.html',
    SITE / 'istanbul' / 'index.html',
    SITE / 'kuala-lumpur' / 'index.html',
    SITE / 'sharm-constantine' / 'index.html',
]

for page in TRIP_PAGES:
    slug = page.parent.name
    html = page.read_text(encoding='utf-8')

    preamble, sections, postamble = extract_sections(html)
    found_keys = [k for k, _ in sections]
    print(f'\n{slug}: found={found_keys}')

    # Build lookup
    sec_map = {k: v for k, v in sections}

    # Update individual section content
    if 'calculator' in sec_map:
        sec_map['calculator'] = update_calc_head(sec_map['calculator'])
    if 'booking' in sec_map:
        sec_map['booking'] = update_booking_head(sec_map['booking'])

    # Reassemble in desired order (skip missing + skip packages)
    reordered = []
    for key in DESIRED_ORDER:
        if key in sec_map:
            reordered.append(sec_map[key])
        # 'packages' not in DESIRED_ORDER → dropped
    # Append any unknown sections at the end
    for k, v in sections:
        if k.startswith('unknown_'):
            reordered.append(v)

    # Update nav
    preamble_updated = update_nav(preamble)

    new_html = preamble_updated + '\n'.join(reordered) + postamble
    page.write_text(new_html, encoding='utf-8')
    print(f'  → reordered, packages dropped')

# ─── Add CSS for seamless calculator + booking merge ──────────────────────
CSS_MERGE = """
/* ══════════════════════════════════════════════════════════
   SECTION HIERARCHY — logical reorder
   Calculator flows directly into Booking form (no gap).
   ══════════════════════════════════════════════════════════ */

/* The calculator and booking form share the same bg (--bg-2)
   and flow as one unified "Configure & Book" zone */
.calc-section {
  padding-bottom: var(--s7);   /* tighter bottom — booking starts right below */
}
.calc-section + .booking-section {
  padding-top: var(--s7);      /* tighter top — flows from calc */
  border-top: 1px solid var(--border);
}

/* Visual zone connector: subtle divider between step 1 and step 2 */
.calc-section + .booking-section::before {
  content: '';
  display: block;
  width: 48px;
  height: 2px;
  background: var(--mint);
  margin: 0 auto var(--s8);
  opacity: 0.6;
}

/* Section eyebrow step indicators */
.section-head__eyebrow:has(+ .section-head__title) {
  letter-spacing: .1em;
}
"""

css_file = SITE / 'assets' / 'css' / 'styles.css'
css = css_file.read_text(encoding='utf-8')
if 'SECTION HIERARCHY — logical reorder' not in css:
    css_file.write_text(css + CSS_MERGE, encoding='utf-8')
    print('\nCSS merge rules appended to styles.css')
else:
    print('\nCSS already patched')

print('\nAll pages reorganised.')
