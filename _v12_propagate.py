#!/usr/bin/env python3
"""
v12 propagate — apply UX-audit hierarchy fixes to remaining trip pages + homepage.

This script is idempotent. Re-running won't double-apply.

Targets (unless already migrated):
1. Hero price block — strip literal "À partir de " prefix from <div class="hero__price">
   (CSS ::before now provides it).
2. Hotel card price — restructure
   <div class="hotel-card__price">PREFIX<strong>NUMBER DA</strong>SUFFIX</div>
   →
   <div class="hotel-card__price">
     <span class="hotel-card__price-label">À partir de</span>
     <strong>NUMBER DA</strong>
     <span class="hotel-card__price-meta">PREFIX · SUFFIX</span>
   </div>
3. Phase markers — inject 3 phase pills (Découvrir, Comparer, Calculer) into the
   itinerary, hotels, and calculator section-heads. (Phase 4 lives in booking-form.js
   already — applied to all pages automatically.)
4. Footer phones — group the 6 phone numbers into WhatsApp / Phone / Address blocks
   with icons.
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"

TRIP_PAGES = [
    SITE / "cairo-sharm" / "index.html",
    SITE / "azerbaidjan" / "index.html",
    SITE / "istanbul" / "index.html",
    SITE / "kuala-lumpur" / "index.html",
]
HOMEPAGE = SITE / "index.html"


# ─── 1. Strip literal "À partir de" from hero price ───────────────────────
HERO_PRICE_RE = re.compile(
    r'(<div class="hero__price[^"]*">)\s*'
    r'À partir de\s*&nbsp;\s*'
    r'(<strong>[^<]+</strong>)',
    re.MULTILINE,
)

def fix_hero_price(html: str) -> tuple[str, bool]:
    new_html, n = HERO_PRICE_RE.subn(r'\1\2', html)
    return new_html, n > 0


# ─── 2. Restructure hotel-card price markup ───────────────────────────────
# Match patterns like:
#   <div class="hotel-card__price">Double<strong>155.000 DA</strong>/ pers · Triple 150.000 DA</div>
#   <div class="hotel-card__price">À partir de<strong>192.000 DA</strong>par pers. en double</div>
#   <div class="hotel-card__price">Chambre double<strong>211.000 DA</strong>par personne</div>
#
# Already-migrated cards (sharm-constantine) have multi-line span structure — skip.

HOTEL_PRICE_RE = re.compile(
    r'<div class="hotel-card__price">'
    r'([^<]*?)'             # group 1: prefix text (label-ish)
    r'<strong>([^<]+)</strong>'  # group 2: number+DA
    r'([^<]*?)'             # group 3: suffix text (meta-ish)
    r'</div>',
    re.DOTALL,
)

def fix_hotel_price(html: str) -> tuple[str, int]:
    def replace(m: re.Match) -> str:
        prefix = (m.group(1) or "").strip()
        number = m.group(2).strip()
        suffix = (m.group(3) or "").strip()
        # Build the meta line. Fold prefix in if it adds info beyond "Double"/"À partir de".
        meta_parts = []
        # Prefix often = "Double" / "Chambre double" / "À partir de"
        # If it looks like room-type or "À partir de", normalize.
        if prefix and prefix.lower() not in ("à partir de", "a partir de"):
            meta_parts.append(prefix)
        if suffix:
            # Strip leading "/ " or "·" decorations
            cleaned = suffix.lstrip(" /·")
            cleaned = cleaned.strip()
            if cleaned:
                meta_parts.append(cleaned)
        meta_text = " · ".join(meta_parts) if meta_parts else "par personne · chambre double"
        # Keep "Voir tarifs" type non-numeric strongs as-is — special-case.
        if not re.search(r"\d", number):
            return m.group(0)  # leave unchanged
        return (
            '<div class="hotel-card__price">\n'
            '            <span class="hotel-card__price-label">À partir de</span>\n'
            f'            <strong>{number}</strong>\n'
            f'            <span class="hotel-card__price-meta">{meta_text}</span>\n'
            '          </div>'
        )

    new_html, n = HOTEL_PRICE_RE.subn(replace, html)
    return new_html, n


# ─── 3. Inject phase markers ──────────────────────────────────────────────
# Find the FIRST matching section-head per phase and inject the marker
# (only if no .phase-marker already there).

def inject_phase_marker(html: str, anchor_substring: str, phase_num: int, phase_label: str) -> tuple[str, bool]:
    """Inject a phase marker at the start of the section-head containing the anchor.
    Idempotent: skips if a phase-marker already exists in that section-head."""
    # Locate the section-head containing the anchor text
    pattern = re.compile(
        r'(<div class="section-head"[^>]*>)(\s*)'  # group 1: opening tag, group 2: whitespace
        r'((?:(?!</div>).)*?'                       # body up to first </div>
        + re.escape(anchor_substring) + r')',
        re.DOTALL,
    )
    match = pattern.search(html)
    if not match:
        return html, False

    body = match.group(3)
    # Skip if already has phase-marker in this body
    if "phase-marker" in body:
        return html, False

    marker = (
        f'<span class="phase-marker">'
        f'<span class="phase-marker__num">{phase_num}</span>'
        f'<span class="phase-marker__label">{phase_label}</span>'
        f'</span>'
    )
    return html[:match.end(1)] + match.group(2) + marker + body + html[match.end(3):], True


PHASES = [
    # (anchor inside the section-head, phase-num, phase-label)
    ("Votre <em>programme</em>",     1, "Découvrir"),
    ("3 hôtels",                      2, "Comparer les hôtels"),
    ("Choisissez <em>votre formule</em>", 3, "Calculer mon prix"),
]
# Page-specific anchor variations (some pages have different titles)
PHASE_ANCHOR_VARIANTS = {
    1: ["Votre <em>programme</em>", "Votre <em>parcours</em>", "Votre <em>itinéraire</em>",
        "<em>Programme</em>", "<em>itinéraire</em>", "<em>parcours</em>"],
    2: ["3 hôtels", "Hôtels", "<em>hôtel</em>", "Choisissez votre <em>hôtel</em>",
        "Vos <em>hôtels</em>", "<em>Hôtels</em>"],
    3: ["Choisissez <em>votre formule</em>", "votre <em>formule</em>",
        "Calculez <em>votre prix</em>", "<em>votre prix</em>", "Configurez", "Calculez"],
}


def inject_all_phases(html: str) -> tuple[str, list[int]]:
    injected = []
    for phase_num, phase_label in [(1, "Découvrir"), (2, "Comparer les hôtels"), (3, "Calculer mon prix")]:
        for anchor in PHASE_ANCHOR_VARIANTS[phase_num]:
            html, ok = inject_phase_marker(html, anchor, phase_num, phase_label)
            if ok:
                injected.append(phase_num)
                break
    return html, injected


# ─── 4. Footer phone grouping ─────────────────────────────────────────────
FOOTER_PHONES_RE = re.compile(
    r'<p style="display:flex;align-items:center;gap:6px;font-weight:500;color:var\(--txt-1\)"><svg[^<]+<path d="M17\.472[^"]+"/></svg>WhatsApp / Viber</p>\s*'
    r'((?:<a href="tel:\+\d+">\d+ \d+ \d+</a>\s*)+)'
    r'<p style="margin-top:var\(--s3\)">'
    r'([^<]+)<br>([^<]+)</p>',
    re.MULTILINE,
)

# A more permissive variant that just looks for the WhatsApp paragraph + 6 phone <a>s
LEGACY_FOOTER_RE = re.compile(
    r'<p style="display:flex[^"]*"><svg width="13"[^<]+'
    r'<path d="M17\.472[^"]+"/></svg>'
    r'WhatsApp / Viber</p>'
    r'(\s*<a href="tel:[^"]+">[^<]+</a>){6,}'
    r'\s*<p style="margin-top:var\(--s3\)">[^<]+(?:<br>[^<]+)?</p>',
    re.DOTALL,
)

NEW_FOOTER_BLOCK = '''<div class="phone-group">
          <p class="phone-group__head"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp / Viber</p>
          <a href="https://wa.me/213560860617" target="_blank" rel="noopener">0560 860 617</a>
          <a href="https://wa.me/213561616266" target="_blank" rel="noopener">0561 616 266</a>
        </div>
        <div class="phone-group">
          <p class="phone-group__head"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Téléphone</p>
          <a href="tel:+213561616267">0561 616 267</a>
          <a href="tel:+213561616268">0561 616 268</a>
          <a href="tel:+213561616269">0561 616 269</a>
          <a href="tel:+213560869905">0560 869 905</a>
        </div>
        <div class="phone-group">
          <p class="phone-group__head"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Adresse</p>
          <p style="font-size:.875rem;color:var(--txt-2);line-height:1.5;margin:0">Cité 5 Juillet, Bd. de l'ALN<br>Bordj Bou Arreridj, Algérie</p>
        </div>'''

def fix_footer(html: str) -> tuple[str, bool]:
    if "phone-group" in html:
        return html, False  # already migrated
    new_html, n = LEGACY_FOOTER_RE.subn(NEW_FOOTER_BLOCK, html)
    return new_html, n > 0


# ─── Driver ───────────────────────────────────────────────────────────────
def process_file(path: Path) -> dict:
    if not path.exists():
        return {"path": str(path), "error": "missing"}

    original = path.read_text(encoding="utf-8")
    html = original

    html, hero_fixed = fix_hero_price(html)
    html, hotel_count = fix_hotel_price(html)
    html, phases_added = inject_all_phases(html)
    html, footer_fixed = fix_footer(html)

    changed = html != original
    if changed:
        path.write_text(html, encoding="utf-8")

    return {
        "path": str(path.relative_to(ROOT)),
        "changed": changed,
        "hero_price_fixed": hero_fixed,
        "hotel_cards_migrated": hotel_count,
        "phases_added": phases_added,
        "footer_grouped": footer_fixed,
    }


if __name__ == "__main__":
    print("v12 propagate — applying UX audit hierarchy fixes\n")
    pages = TRIP_PAGES + [HOMEPAGE]
    for path in pages:
        result = process_file(path)
        if "error" in result:
            print(f"  [SKIP]  {result['path']} — {result['error']}")
            continue
        flag = "OK" if result["changed"] else "--"
        print(
            f"  [{flag}] {result['path']:<40} "
            f"hero:{int(result['hero_price_fixed']):d}  "
            f"hotels:{result['hotel_cards_migrated']:>2}  "
            f"phases:{result['phases_added']}  "
            f"footer:{int(result['footer_grouped']):d}"
        )
    print("\nDone.")
