#!/usr/bin/env python
"""Replace Sétif-specific street with a Bordj Bou Arreridj address."""
import io, sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = Path(r'C:/Users/ROG STRIX/Documents/alliance travel/site')

OLD = '05, Rue des Frères Habbeche'
NEW = "Cité 5 Juillet, Bd. de l'ALN"

count = 0
for f in SITE.rglob('*.html'):
    text = f.read_text(encoding='utf-8')
    if OLD in text:
        n = text.count(OLD)
        text = text.replace(OLD, NEW)
        f.write_text(text, encoding='utf-8')
        count += n
        print(f'  {f.relative_to(SITE)}: {n}x')

print(f'\n✓ {count} address replacements')
