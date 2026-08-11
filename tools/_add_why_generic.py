# -*- coding: utf-8 -*-
# STALE / UNUSED — one-shot script from the pre-generator era. Hardcoded `C:\Users\ROG STRIX\...` path, referenced by nothing, never run in CI or the build. Do not run; candidate for deletion.
"""Add a generic localized calcWhyGeneric line into each page's window.AL_PAGE_I18N (en + ar)."""
import re, sys
sys.stdout.reconfigure(encoding="utf-8")
ROOT = r"C:\Users\ROG STRIX\Documents\alliance travel\site"
PAGES = ["vietnam", "tunisie", "bali", "kuala-lumpur", "azerbaidjan"]

EN = ("Price per person for the selected room type — transport, accommodation and the listed "
      "transfers and excursions are included in your chosen package. See the inclusions section for the full list.")
AR = ("السعر لكل شخص حسب نوع الغرفة المختارة — يشمل النقل والإقامة والتنقّلات والزيارات المذكورة "
      "ضمن الباقة المختارة. راجع قسم ما يشمله العرض للتفاصيل الكاملة.")

for slug in PAGES:
    fp = f"{ROOT}\\{slug}\\index.html"
    s = open(fp, encoding="utf-8").read()
    if "calcWhyGeneric" in s:
        print(f"  skip (already present): {slug}"); continue
    i = s.find("window.AL_PAGE_I18N")
    if i == -1:
        print(f"  NO AL_PAGE_I18N: {slug}"); continue
    # operate only on the AL_PAGE_I18N assignment region
    seg = s[i:]
    # insert into the first en:{ and ar:{ of the block
    seg2, n_en = re.subn(r"(\ben:\s*\{)", r'\1\n    calcWhyGeneric: "%s",' % EN, seg, count=1)
    seg3, n_ar = re.subn(r"(\bar:\s*\{)", r'\1\n    calcWhyGeneric: "%s",' % AR, seg2, count=1)
    if n_en == 1 and n_ar == 1:
        s = s[:i] + seg3
        open(fp, "w", encoding="utf-8", newline="").write(s)
        print(f"  OK: {slug} (en+ar)")
    else:
        print(f"  FAILED inserts en={n_en} ar={n_ar}: {slug}")
print("done")
