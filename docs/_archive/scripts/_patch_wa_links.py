#!/usr/bin/env python
"""
Patch all bare `wa.me/213...` href links to include a pre-filled
text greeting so clicking opens the WhatsApp composer ready to send.

The user reports plain `wa.me/213XXX` URLs no longer open the WhatsApp
composer reliably on mobile — they need the `?text=` query parameter.

Greeting (FR by default; the engine can re-rewrite via JS on lang switch):
  "Bonjour Alliance Travel, j'aimerais en savoir plus."

URL-encoded with %20 for spaces (cross-platform safe).
"""
import io, re, sys
from pathlib import Path
from urllib.parse import quote

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')

GREETING = "Bonjour Alliance Travel, j'aimerais en savoir plus."
ENCODED = quote(GREETING, safe='')

# Pattern: href="https://wa.me/213XXXXXXXXX" — exact match, no ?text=
# Captures the closing quote so we can re-insert ?text=... before it.
PATTERN = re.compile(r'(href="https://wa\.me/213\d{9})"')
REPLACEMENT = rf'\1?text={ENCODED}"'

pages = list(ROOT.glob('site/*.html')) + list(ROOT.glob('site/*/index.html'))
total_patched = 0

for page in pages:
    text = page.read_text(encoding='utf-8')
    new_text, count = PATTERN.subn(REPLACEMENT, text)
    if count:
        page.write_text(new_text, encoding='utf-8')
        rel = page.relative_to(ROOT)
        print(f'  {rel}: {count} bare wa.me links patched')
        total_patched += count

print(f'\n✓ {total_patched} WhatsApp links now open with pre-filled composer message')
