#!/usr/bin/env python
"""
Alliance Travel — Migration v2

1. Phone numbers — refresh contact lists (6 numbers, primary 0561616266)
2. Logo — bigger (52px) + centered in nav grid
3. Calculator + Booking form merger — remove duplicate WhatsApp button from calc
4. Theme switcher — light/dark toggle button + tokens
5. Regional theming — per-page atmosphere (Egypt/Azerbaijan/Istanbul/KL/Sharm)
"""
import re, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
SITE = ROOT / 'site'

# ─────────────────────────────────────────────────────────────────────────
# PHONE NUMBERS — only these 6 must appear in the contact lists
# Primary (used in wa.me deep links): 0561616266
PHONES = ['0561616266', '0561616267', '0561616268', '0561616269', '0560869905', '0560860617']
PRIMARY_INTL = '213561616266'

def fmt_display(n):
    """0561616266 -> 0561 616 266"""
    return f'{n[:4]} {n[4:7]} {n[7:]}'

# Display strings (national format with spaces)
DISPLAY = [fmt_display(p) for p in PHONES]
INTL = ['213' + p[1:] for p in PHONES]  # 0561616266 -> 213561616266

# ─────────────────────────────────────────────────────────────────────────
# 1. Update phone numbers in HTML pages

def update_phones_in_page(html: str, is_homepage: bool):
    """
    - All wa.me/tel links keep PRIMARY_INTL as primary
    - Footer "Contact" col → list all 6 numbers
    - Final-CTA action-row → only the WA button (link to primary)
    """
    # Footer Contact column rebuild
    footer_contact_pattern = re.compile(
        r'(<div class="footer-col">\s*<h4>Contact</h4>)(.*?)(</div>\s*</div>\s*<div class="footer-bottom">)',
        re.DOTALL,
    )
    def footer_repl(m):
        head = m.group(1)
        tail = m.group(3)
        # Build the new contact list (preserve address)
        lines = ['']
        lines.append('<p style="display:flex;align-items:center;gap:6px;font-weight:500;color:var(--txt-1)">'
                     f'<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
                     f'<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15'
                     f'-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075'
                     f'-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059'
                     f'-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52'
                     f'.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52'
                     f'-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51'
                     f'-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372'
                     f'-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074'
                     f'.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625'
                     f'.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413'
                     f'.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m'
                     f'-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982'
                     f'.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884'
                     f' 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c'
                     f'-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0'
                     f'C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305'
                     f'-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893'
                     f'a11.821 11.821 0 00-3.48-8.413z"/></svg>'
                     f'WhatsApp / Viber</p>')
        for i, p in enumerate(PHONES):
            lines.append(f'<a href="tel:+{INTL[i]}">{DISPLAY[i]}</a>')
        lines.append('<p style="margin-top:var(--s3)">05, Rue des Frères Habbeche<br>Sétif, Algérie</p>')
        return head + '\n        ' + '\n        '.join(lines) + '\n      ' + tail
    new_html = footer_contact_pattern.sub(footer_repl, html, count=1)
    if new_html == html:
        # try alternate footer pattern with "Contact" + p tags (homepage variant)
        pass
    return new_html

# ─────────────────────────────────────────────────────────────────────────
# 2. Calc + Booking merge — remove WhatsApp/tel buttons from calc breakdown CTAs

CALC_CTAS_OLD = re.compile(
    r'<div class="breakdown__ctas">.*?</div>\s*</div>\s*<p style="font-size:\.75rem;color:var\(--txt-3\);margin-top:var\(--s3\);text-align:center">[^<]*</p>',
    re.DOTALL,
)
CALC_CTAS_NEW = '''<div class="breakdown__ctas">
            <a href="#booking" class="btn btn--primary btn--full">
              Continuer vers la réservation
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </a>
          </div>
        </div>
        <p style="font-size:.75rem;color:var(--txt-3);margin-top:var(--s3);text-align:center">Étape suivante : remplissez votre dossier ci-dessous</p>'''

def merge_calc_booking(html: str):
    return CALC_CTAS_OLD.sub(CALC_CTAS_NEW, html, count=1)

# ─────────────────────────────────────────────────────────────────────────
# 3. Replace logo nav layout — wrap nav in 3-col grid

# Existing pattern: <nav class="site-nav">  <a class="nav-logo">..</a>  <ul class="nav-links">..</ul>  <a class="nav-cta">..</a>  </nav>
# New layout: keep DOM order (logo first), but use CSS grid to center the logo

# We don't change HTML structure — only CSS. See styles.css update below.

# ─────────────────────────────────────────────────────────────────────────
# 4. Theme switcher — add toggle button to nav (next to nav-cta or before)

THEME_TOGGLE_HTML = '''<button class="theme-toggle" type="button" aria-label="Changer de thème" title="Changer de thème">
    <svg class="theme-toggle__sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
    <svg class="theme-toggle__moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
  '''

def add_theme_toggle(html: str):
    if 'theme-toggle' in html:
        return html
    # Insert before nav-cta
    nav_cta_open = re.search(r'(<a [^>]*class="nav-cta"[^>]*>)', html)
    if nav_cta_open:
        return html[:nav_cta_open.start()] + THEME_TOGGLE_HTML + html[nav_cta_open.start():]
    return html

# ─────────────────────────────────────────────────────────────────────────
# Process all HTML pages
PAGES = [
    SITE / 'index.html',
    SITE / 'cairo-sharm' / 'index.html',
    SITE / 'azerbaidjan' / 'index.html',
    SITE / 'istanbul' / 'index.html',
    SITE / 'kuala-lumpur' / 'index.html',
    SITE / 'sharm-constantine' / 'index.html',
]

for page in PAGES:
    if not page.exists(): continue
    html = page.read_text(encoding='utf-8')
    is_home = page.name == 'index.html' and page.parent == SITE

    # 1. Update phones (footer)
    html = update_phones_in_page(html, is_home)

    # 2. Calc/booking merge (only trip pages have calculator)
    if not is_home:
        html = merge_calc_booking(html)

    # 3. Add theme toggle to nav
    html = add_theme_toggle(html)

    page.write_text(html, encoding='utf-8')
    print(f'  patched: {page.relative_to(ROOT)}')

print('Migration v2 (HTML) complete.')
