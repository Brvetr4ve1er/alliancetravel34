#!/usr/bin/env python3
"""
v17 — Add loading="lazy" + decoding="async" to non-hero <img> tags.

Hero images stay eager (loading="eager", fetchpriority="high"). Everything
else (hotel cards, trip cards, site visuals, social icons, OG images)
gets lazy. Saves ~400 KB of initial paint on each trip page.

Idempotent.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"

PAGES = [
    SITE / "index.html",
    SITE / "cairo-sharm" / "index.html",
    SITE / "sharm-constantine" / "index.html",
    SITE / "azerbaidjan" / "index.html",
    SITE / "istanbul" / "index.html",
    SITE / "kuala-lumpur" / "index.html",
]

# Match <img> tags. Skip those:
# - already containing loading="..." OR loading=...
# - inside /assets/images/heroes-v2/ paths (these are hero/eager)
# - with class*="hero" or fetchpriority="high"
IMG_RE = re.compile(r'<img\b([^>]+?)/?>', re.IGNORECASE)


def patch_img(match: re.Match) -> str:
    attrs = match.group(1)
    full = match.group(0)

    # Skip if no src (broken/template)
    if not re.search(r'\bsrc\s*=', attrs):
        return full

    is_hero = 'heroes-v2' in attrs or 'fetchpriority="high"' in attrs or 'fetchpriority=high' in attrs
    cls_match = re.search(r'class\s*=\s*"([^"]*)"', attrs)
    if cls_match and 'hero__' in cls_match.group(1):
        is_hero = True

    has_loading = re.search(r'\bloading\s*=', attrs, re.IGNORECASE)
    has_decoding = re.search(r'\bdecoding\s*=', attrs, re.IGNORECASE)

    if has_loading and has_decoding:
        return full  # nothing to do

    new_attrs = attrs.rstrip()
    if not has_loading and not is_hero:
        new_attrs += ' loading="lazy"'
    if not has_decoding:
        # async decoding helps even hero images (parallel decode off main thread)
        new_attrs += ' decoding="async"'

    # Preserve self-closing slash if present
    self_close = '/' if full.rstrip('>').rstrip().endswith('/') else ''
    return f'<img{new_attrs}{self_close}>'


def process(path: Path) -> dict:
    if not path.exists():
        return {"slug": path.parent.name, "error": "missing"}
    html = path.read_text(encoding="utf-8")
    new_html, n = IMG_RE.subn(patch_img, html)
    # Count actual changes (subn returns total matches incl unchanged)
    lazy_added = sum(1 for _ in re.finditer(r'loading="lazy"', new_html)) - sum(1 for _ in re.finditer(r'loading="lazy"', html))
    decoding_added = sum(1 for _ in re.finditer(r'decoding="async"', new_html)) - sum(1 for _ in re.finditer(r'decoding="async"', html))
    changes = lazy_added + decoding_added
    if new_html != html:
        path.write_text(new_html, encoding="utf-8")
    return {"slug": path.parent.name if path.parent.name != 'site' else 'index', "changes": changes}


if __name__ == "__main__":
    print("v17 lazy non-hero images\n")
    total = 0
    for p in PAGES:
        r = process(p)
        if r.get("error"):
            print(f"  [SKIP] {r['slug']:<20} {r['error']}")
        else:
            print(f"  [OK]   {r['slug']:<20} +{r['changes']} lazy attrs")
            total += r["changes"]
    print(f"\nTotal: {total} images now lazy-loaded.")
