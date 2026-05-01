#!/usr/bin/env python
"""
Phone-number cleanup + Sétif→Bordj Bou Arreridj migration.

Replaces 4 lingering wrong phone numbers with the 6 valid ones and
shifts the agency narrative from Sétif to Bordj Bou Arreridj across
all HTML files in the site/.

Valid numbers (from agency):
  0561 616 266  ·  0561 616 267  ·  0561 616 268
  0561 616 269  ·  0560 869 905  ·  0560 860 617
"""
import io, re, sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = Path(r'C:/Users/ROG STRIX/Documents/alliance travel/site')

# ─── Phone number replacements ────────────────────────────────────────────
# Map of OLD wrong number → NEW valid number (in same display format)
PHONE_REPLACEMENTS = {
    '0550 737 434': '0560 869 905',  # → location #5 (Oran)
    '0770 545 737': '0560 860 617',  # → location #6 (Annaba)
    '0672 021 651': '0561 616 268',  # → location #3 (Algiers)
    '0770 311 099': '0561 616 269',  # → location #4 (Constantine)
    # No-space variants (in tel: links if any)
    '0550737434':   '0560869905',
    '0770545737':   '0560860617',
    '0672021651':   '0561616268',
    '0770311099':   '0561616269',
    '213550737434': '213560869905',
    '213770545737': '213560860617',
    '213672021651': '213561616268',
    '213770311099': '213561616269',
}

# ─── Sétif → Bordj Bou Arreridj replacements ──────────────────────────────
# Order matters: more specific first
CITY_REPLACEMENTS = [
    # Specific phrases (most-specific first)
    ('Park Mall Sétif',           'Centre-ville Bordj Bou Arreridj'),
    ('depuis Sétif',              'depuis Bordj Bou Arreridj'),
    ('Voyages Guidés · Sétif',    'Voyages Guidés · Bordj Bou Arreridj'),
    ('Sétif, Algérie',            'Bordj Bou Arreridj, Algérie'),
    ('Sétif · Algérie',           'Bordj Bou Arreridj · Algérie'),
    ('agence de voyage à Sétif',  'agence de voyage à Bordj Bou Arreridj'),
    ('Fondée à Sétif',            'Fondée à Bordj Bou Arreridj'),
    ('espèces à l\'agence (Sétif)','espèces à l\'agence (Bordj Bou Arreridj)'),
    ('En face de Park Mall',      'Au cœur du centre-ville'),
    # Address line: "05, Rue des Frères Habbeche · Sétif · ..."
    (' · Sétif · ',               ' · Bordj Bou Arreridj · '),
    # Footer copyright "© 2026 Alliance Travel · Sétif"
    ('Alliance Travel · Sétif',   'Alliance Travel · Bordj Bou Arreridj'),
    # JSON-LD addressLocality
    ('"addressLocality": "Sétif"','"addressLocality": "Bordj Bou Arreridj"'),
    # Generic fallback for any remaining ", Sétif" or "Sétif," etc. — but
    # we KEEP the testimonial line "Sétif · Voyage Égypte 2024" because
    # that's a customer's hometown, not the agency.
    # (That match is handled below as exception.)
    # Remaining fallback for SVG label and other contexts
    ('>Sétif<',                   '>Bordj Bou Arreridj<'),
    ('Sétif<br>',                 'Bordj Bou Arreridj<br>'),
    ('Sétif</text>',              'Bordj Bou Arreridj</text>'),
    # "Voyages guidés depuis Sétif." catch-all
    ('Sétif.',                    'Bordj Bou Arreridj.'),
]

# Skip these specific substrings (they're customers, not the agency)
KEEP_AS_IS = {
    'Sétif · Voyage Égypte 2024',  # testimonial — customer's city
    'placeholder="Sétif"',          # input placeholder helps users
}


def migrate_file(path: Path) -> tuple[int, int]:
    """Returns (phone_swaps, city_swaps)."""
    text = path.read_text(encoding='utf-8')
    original = text
    phone_swaps = 0
    city_swaps = 0

    # Phone replacements
    for old, new in PHONE_REPLACEMENTS.items():
        if old in text:
            count = text.count(old)
            text = text.replace(old, new)
            phone_swaps += count

    # City replacements (with keep-as-is exceptions)
    # Strategy: temporarily replace KEEP_AS_IS strings with sentinels,
    # do replacements, then restore.
    sentinels = {}
    for i, keep in enumerate(KEEP_AS_IS):
        sentinel = f'\x00KEEP{i}\x00'
        if keep in text:
            text = text.replace(keep, sentinel)
            sentinels[sentinel] = keep

    for old, new in CITY_REPLACEMENTS:
        if old in text:
            count = text.count(old)
            text = text.replace(old, new)
            city_swaps += count

    # Restore sentinels
    for sentinel, keep in sentinels.items():
        text = text.replace(sentinel, keep)

    if text != original:
        path.write_text(text, encoding='utf-8')

    return phone_swaps, city_swaps


HTML_FILES = list(SITE.rglob('*.html'))
JS_FILES = list(SITE.rglob('*.js'))

total_phones = total_cities = 0
for f in HTML_FILES + JS_FILES:
    p, c = migrate_file(f)
    if p or c:
        rel = f.relative_to(SITE)
        print(f'  {rel}  →  {p} phones · {c} city refs')
        total_phones += p
        total_cities += c

print(f'\n✓ {total_phones} phone replacements')
print(f'✓ {total_cities} Sétif → Bordj Bou Arreridj replacements')
