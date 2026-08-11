# -*- coding: utf-8 -*-
# STALE / UNUSED — one-shot script from the pre-generator era. Hardcoded `C:\Users\ROG STRIX\...` path, referenced by nothing, never run in CI or the build. Do not run; candidate for deletion.
"""Rewrite the footer 'Nos Voyages' link list across all pages to include the new destinations."""
import re, glob, os, sys
sys.stdout.reconfigure(encoding="utf-8")
ROOT = r"C:\Users\ROG STRIX\Documents\alliance travel\site"

# (slug, label) in display order. /egypte/ hub not built yet -> keep the 2 Egypt pages.
TRIPS = [
    ("cairo-sharm", "Le Caire &amp; Sharm"),
    ("sharm-constantine", "Sharm · Constantine"),
    ("tunisie", "Tunisie"),
    ("azerbaidjan", "Azerbaïdjan"),
    ("istanbul", "Istanbul"),
    ("kuala-lumpur", "Kuala Lumpur &amp; Langkawi"),
    ("bali", "Bali"),
    ("vietnam", "Vietnam"),
]

files = glob.glob(os.path.join(ROOT, "*", "index.html")) + [os.path.join(ROOT, "index.html")]
pat = re.compile(r"(<h4>Nos Voyages</h4>)(.*?)(</div>)", re.DOTALL)

changed = 0
for fp in files:
    s = open(fp, encoding="utf-8").read()
    m = pat.search(s)
    if not m:
        print("  NO MATCH:", os.path.relpath(fp, ROOT)); continue
    # prefix: root index.html uses "", subdir pages use "../"
    is_root = os.path.dirname(fp) == ROOT
    prefix = "" if is_root else "../"
    links = "".join(f'<a href="{prefix}{slug}/">{label}</a>' for slug, label in TRIPS)
    new = m.group(1) + links + m.group(3)
    s2 = s[:m.start()] + new + s[m.end():]
    if s2 != s:
        open(fp, "w", encoding="utf-8", newline="").write(s2)
        changed += 1
        print("  updated:", os.path.relpath(fp, ROOT))

print(f"done — {changed} files updated")
