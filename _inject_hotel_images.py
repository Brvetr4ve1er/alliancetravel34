#!/usr/bin/env python
"""
Inject hotel photos into hotel cards across all 5 trip pages.

For each <article class="hotel-card" data-hotel-id="X">:
  - Find the inner <div class="hotel-card__img-art" style="background:..."></div>
  - Replace with <img class="hotel-card__photo" src="../assets/images/hotels/hotel__SLUG.jpg" alt="...">
  - data-hotel-id maps to the hotel filename slug
"""
import re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = Path(r'C:/Users/ROG STRIX/Documents/alliance travel/site')

# data-hotel-id → image filename slug
ID_TO_SLUG = {
    # Cairo+Sharm
    'tivoli':            'tivoli',
    'verginia':          'verginia',
    'rehana4':           'rehana-4star',
    'rehana5':           'rehana-royal',
    'charmillion':       'charmillion',
    'cleopatra':         'cleopatra',
    'pickalbatros':      'pickalbatros',
    # Azerbaijan
    'parkside':          'parkside-baku',
    'yengice':           'yengice-gabala',
    # Istanbul
    'river':             'river-istanbul',
    'ozer':              'ozer-palace',
    'alpin':             'alpin-due',
    'tilia':             'tilia',
    # Kuala Lumpur
    'grandmercure':      'grand-mercure-kl',
    # Sharm Constantine
    'tivoli_czl':        'tivoli-czl',
    'rehana_czl':        'rehana-czl',
    'rehana_royal_czl':  'rehana-royal-czl',
}

PAGES = list(SITE.glob('*/index.html'))
PAGES = [p for p in PAGES if p.parent.name in ('cairo-sharm', 'azerbaidjan', 'istanbul', 'kuala-lumpur', 'sharm-constantine')]

# Pattern: <div class="hotel-card__img-art" style="background:..."></div>
ART_PATTERN = re.compile(
    r'<div class="hotel-card__img-art"[^>]*style="[^"]*"[^>]*></div>',
    re.DOTALL
)

# Find each article block and its data-hotel-id
ARTICLE_PATTERN = re.compile(
    r'(<article class="hotel-card[^"]*"[^>]*data-hotel-id="([^"]+)"[^>]*>.*?</article>)',
    re.DOTALL
)

total_swaps = 0
for page in PAGES:
    html = page.read_text(encoding='utf-8')
    page_swaps = 0

    def replace_in_article(article_match):
        global page_swaps
        article_html = article_match.group(1)
        hotel_id = article_match.group(2)
        slug = ID_TO_SLUG.get(hotel_id)
        if not slug:
            return article_html

        # Get hotel name from h3 for alt text
        name_m = re.search(r'<h3 class="hotel-card__name">([^<]+)', article_html)
        alt = name_m.group(1).strip() if name_m else 'Hôtel'

        new_img = (
            f'<img class="hotel-card__photo" '
            f'src="../assets/images/hotels/hotel__{slug}.jpg" '
            f'alt="{alt}" loading="lazy" width="800" height="600"/>'
        )
        new_article = ART_PATTERN.sub(new_img, article_html, count=1)
        if new_article != article_html:
            page_swaps += 1
        return new_article

    new_html, _ = ARTICLE_PATTERN.subn(replace_in_article, html)
    if page_swaps > 0:
        page.write_text(new_html, encoding='utf-8')
        print(f'  {page.parent.name}: {page_swaps} hotel cards updated')
        total_swaps += page_swaps

print(f'\nTotal: {total_swaps} hotel cards now have real photos.')

# Add CSS rule for .hotel-card__photo so it fits the card
CSS = SITE / 'assets' / 'css' / 'styles.css'
css = CSS.read_text(encoding='utf-8')
ADD_RULE = """

/* ── Hotel card photos (real images replacing gradient placeholders) ── */
.hotel-card__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hotel-card__img { position: relative; }
.hotel-card__img::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,.5) 100%);
  pointer-events: none;
}
"""
if '.hotel-card__photo' not in css:
    CSS.write_text(css + ADD_RULE, encoding='utf-8')
    print('  + CSS rule for .hotel-card__photo appended')
