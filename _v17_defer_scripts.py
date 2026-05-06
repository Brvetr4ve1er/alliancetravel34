#!/usr/bin/env python3
"""v17 — Add defer to calculator.js and booking-form.js script tags.

Both currently load synchronously, blocking parsing. They don't need to
run before DOMContentLoaded — both use document.addEventListener('DOMContentLoaded')
or wait for the calculator state. Adding defer is safe and improves FCP.

Idempotent.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"
PAGES = list(SITE.rglob("index.html"))

# Match <script src="...calculator.js"></script> or booking-form.js
# without an existing defer or async attribute
PATTERNS = [
    (re.compile(r'<script\s+src="([^"]*calculator\.js)"\s*></script>'),
     r'<script src="\1" defer></script>'),
    (re.compile(r'<script\s+src="([^"]*booking-form\.js)"\s*></script>'),
     r'<script src="\1" defer></script>'),
]


def process(path: Path):
    if not path.exists():
        return None
    html = path.read_text(encoding="utf-8")
    n_total = 0
    for pat, repl in PATTERNS:
        html, n = pat.subn(repl, html)
        n_total += n
    if n_total > 0:
        path.write_text(html, encoding="utf-8")
    return path, n_total


print("v17 defer scripts\n")
for p in PAGES:
    if not p.is_relative_to(SITE):
        continue
    try:
        rel = p.relative_to(SITE)
    except Exception:
        continue
    res = process(p)
    if res:
        path, n = res
        if n:
            print(f"  [OK]   {rel} +{n} defer")
        else:
            print(f"  [--]   {rel} (already deferred or no match)")
