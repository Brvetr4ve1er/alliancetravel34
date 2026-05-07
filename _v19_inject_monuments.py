#!/usr/bin/env python3
"""
v19 — inject monument SVG icons + data-from attribute into homepage trip-cards.

For each .trip-card on site/index.html:
  1. Add data-from="<price>" attribute on the <a> root (CSS reads via attr())
  2. Insert <div class="trip-card__monument">…SVG…</div> after the opening <a>

Per-trip monument:
  cairo-sharm:       pyramid silhouette (2 triangles)
  sharm-constantine: sun + waves (Sharm beach + Constantine bridge bridge)
  azerbaidjan:       flame (Bakou Flame Towers)
  istanbul:          dome + 2 minarets (Hagia Sophia / Sultanahmet)
  kuala-lumpur:      twin towers (Petronas)

Idempotent — checks for existing .trip-card__monument before injecting.
Lucide-style icons (24×24 viewBox, stroke-only paths).
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
PAGE = ROOT / "site" / "index.html"

# Trip data: slug → (price for data-from, monument SVG inner)
MONUMENTS = {
    "cairo-sharm": {
        "data_from": "190 000 DA",
        # Two pyramids, ground line
        "svg_inner": (
            '<polygon points="12 4 20 19 4 19" />'
            '<polygon points="6 11 11 19 1 19" stroke-opacity=".7" />'
            '<line x1="2" y1="20.5" x2="22" y2="20.5" stroke-opacity=".55" />'
        ),
    },
    "sharm-constantine": {
        "data_from": "155 000 DA",
        # Sun above wavy water lines (Sharm beach + return to Constantine)
        "svg_inner": (
            '<circle cx="12" cy="8" r="3.2" />'
            '<line x1="12" y1="2.5" x2="12" y2="3.8" />'
            '<line x1="6.5" y1="4.5" x2="7.5" y2="5.5" />'
            '<line x1="16.5" y1="4.5" x2="17.5" y2="5.5" stroke-opacity=".85" />'
            '<line x1="3" y1="8" x2="4.3" y2="8" />'
            '<line x1="19.7" y1="8" x2="21" y2="8" stroke-opacity=".85" />'
            '<path d="M2 15 q3 -2 6 0 t6 0 t6 0" stroke-opacity=".9" />'
            '<path d="M2 19 q3 -2 6 0 t6 0 t6 0" stroke-opacity=".7" />'
        ),
    },
    "azerbaidjan": {
        "data_from": "219 000 DA",
        # Flame (Bakou Flame Towers) — 3 stylized flame shapes
        "svg_inner": (
            '<path d="M12 2.5 c2 3 4 5 4 8.5 a4 4 0 0 1 -8 0 c0 -3 2 -5 4 -8.5 z" />'
            '<path d="M12 7 c1 2 1.8 3 1.8 5 a1.8 1.8 0 0 1 -3.6 0 c0 -2 .8 -3 1.8 -5 z" stroke-opacity=".7" />'
            '<line x1="4" y1="20" x2="20" y2="20" stroke-opacity=".55" />'
            '<line x1="6" y1="22" x2="18" y2="22" stroke-opacity=".4" />'
        ),
    },
    "istanbul": {
        "data_from": "123 000 DA",
        # Mosque dome + 2 flanking minarets
        "svg_inner": (
            '<path d="M5 18 v-7 a7 7 0 0 1 14 0 v7" />'
            '<line x1="12" y1="2" x2="12" y2="4" />'
            '<line x1="3" y1="20.5" x2="21" y2="20.5" stroke-opacity=".55" />'
            '<line x1="2" y1="20" x2="2" y2="9" />'
            '<line x1="22" y1="20" x2="22" y2="9" />'
            '<polygon points="2 9 1.4 11 2.6 11" fill="currentColor" stroke="none" />'
            '<polygon points="22 9 21.4 11 22.6 11" fill="currentColor" stroke="none" />'
        ),
    },
    "kuala-lumpur": {
        "data_from": "211 000 DA",
        # Twin towers (Petronas) with bridge
        "svg_inner": (
            '<rect x="6" y="4" width="4" height="17" rx=".5" />'
            '<rect x="14" y="4" width="4" height="17" rx=".5" />'
            '<line x1="8" y1="2.5" x2="8" y2="4" />'
            '<line x1="16" y1="2.5" x2="16" y2="4" />'
            '<line x1="10" y1="11" x2="14" y2="11" />'
            '<line x1="10" y1="13" x2="14" y2="13" stroke-opacity=".7" />'
            '<line x1="3" y1="21" x2="21" y2="21" stroke-opacity=".55" />'
        ),
    },
}


def build_monument_html(slug: str) -> str:
    cfg = MONUMENTS[slug]
    return (
        f'<div class="trip-card__monument" aria-hidden="true">'
        f'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{slug}">'
        f'{cfg["svg_inner"]}'
        f'</svg>'
        f'</div>'
    )


def patch_card(html: str, slug: str) -> tuple[str, list[str]]:
    """Add data-from + inject monument + insert price span inside the
    .trip-card__cta of the trip-card linking to <slug>/index.html."""
    actions = []
    cfg = MONUMENTS[slug]

    # 1. Add data-from attribute on root anchor (idempotent)
    pat_anchor = re.compile(
        r'(<a href="' + re.escape(slug) + r'/index\.html" class="trip-card"(?![^>]*data-from)([^>]*)>)'
    )
    def add_data_from(m):
        full = m.group(0)
        return full[:-1] + f' data-from="{cfg["data_from"]}">'
    new_html, n = pat_anchor.subn(add_data_from, html, count=1)
    if n:
        actions.append(f'data-from="{cfg["data_from"]}"')
        html = new_html

    # 2. Inject monument div (idempotent)
    if 'class="trip-card__monument"' in html and f'aria-label="{slug}"' in html:
        actions.append('monument: already present')
    else:
        pat_inject = re.compile(
            r'(<a href="' + re.escape(slug) + r'/index\.html" class="trip-card"[^>]*>)\s*'
        )
        monument = build_monument_html(slug)
        html2, n2 = pat_inject.subn(r'\1\n          ' + monument + '\n          ', html, count=1)
        if n2:
            actions.append('monument injected')
            html = html2
        else:
            actions.append('monument: anchor not found')

    # 3. Inject price span inside .trip-card__cta (CSS attr() can't read
    #    parent attrs, so we add the price as a real DOM node).
    #    Match the cta div + its first child <span>"Voir ce voyage"</span>.
    cta_pat = re.compile(
        r'(<div class="trip-card__cta"[^>]*>)\s*(<span>(?:[^<]*Voir ce voyage[^<]*)</span>)',
        re.DOTALL,
    )
    # Idempotency: skip if cta already has a __cta-price span. Do this by
    # checking the broader cta block of this slug — but simplest: add a
    # marker class we can detect.
    # Locate this slug's cta uniquely: the cta sits between this slug's
    # anchor open and the next anchor (or end of trips-grid).
    slug_anchor_re = re.compile(
        r'<a href="' + re.escape(slug) + r'/index\.html" class="trip-card"[^>]*>'
    )
    m_anchor = slug_anchor_re.search(html)
    if m_anchor:
        next_anchor_re = re.compile(
            r'<a href="(?!' + re.escape(slug) + r')[^"]*" class="trip-card"',
        )
        m_next = next_anchor_re.search(html, pos=m_anchor.end())
        end = m_next.start() if m_next else len(html)
        block = html[m_anchor.start():end]
        if 'trip-card__cta-price' in block:
            actions.append('price span: already present')
        else:
            new_block, k = cta_pat.subn(
                r'\1<span class="trip-card__cta-price"><em>À partir de</em> '
                + cfg['data_from']
                + r'</span>\2',
                block, count=1,
            )
            if k:
                html = html[:m_anchor.start()] + new_block + html[end:]
                actions.append('price span injected')
            else:
                actions.append('price span: cta not matched')

    return html, actions


if __name__ == "__main__":
    if not PAGE.exists():
        print(f"ERROR: {PAGE} missing")
        raise SystemExit(1)
    html = PAGE.read_text(encoding="utf-8")
    print("v19 — monument injection on homepage trip-cards\n")
    for slug in MONUMENTS:
        html, actions = patch_card(html, slug)
        print(f"  {slug:<22} {'  ·  '.join(actions) or 'no change'}")
    PAGE.write_text(html, encoding="utf-8")
    print(f"\nDone — {PAGE.relative_to(ROOT)}")
