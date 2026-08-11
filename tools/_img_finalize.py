# -*- coding: utf-8 -*-
# STALE / UNUSED — one-shot script from the pre-generator era. Hardcoded `C:\Users\ROG STRIX\...` paths, referenced by nothing, never run in CI or the build. Do not run; candidate for deletion.
"""Finalize hotel/hero images from Pexels ids into the site assets.
Usage: python tools/_img_finalize.py hotel <id>:<slug> ...
       python tools/_img_finalize.py hero  <id>:<slug> ...
hotel -> ../assets/images/hotels/hotel__<slug>.jpg  (800x600)
hero  -> heroes-v2/hero__<slug>--bg.{jpg,webp,avif} + --bg--mobile.* + fg copy (1600x900 / 768x1024 mobile)"""
import sys, os, urllib.request
from PIL import Image, ImageOps
sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"C:\Users\ROG STRIX\Documents\alliance travel\site\assets\images"
TMP = r"C:\Users\ROG STRIX\Documents\alliance travel\_imgtmp"
mode = sys.argv[1]
pairs = [a.split(":", 1) for a in sys.argv[2:]]

def fetch(i, w=1600):
    p = os.path.join(TMP, f"hi_{i}_{w}.jpg")
    if os.path.exists(p) and os.path.getsize(p) > 2000:
        return p
    url = f"https://images.pexels.com/photos/{i}/pexels-photo-{i}.jpeg?auto=compress&cs=tinysrgb&w={w}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    open(p, "wb").write(urllib.request.urlopen(req, timeout=40).read())
    return p

if mode == "hotel":
    outdir = os.path.join(ROOT, "hotels")
    for i, slug in pairs:
        im = Image.open(fetch(i, 1280)).convert("RGB")
        out = ImageOps.fit(im, (800, 600), Image.LANCZOS)
        dst = os.path.join(outdir, f"hotel__{slug}.jpg")
        out.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
        print(f"  hotel__{slug}.jpg  {os.path.getsize(dst)//1024}KB")

elif mode == "hero":
    outdir = os.path.join(ROOT, "heroes-v2")
    for i, slug in pairs:
        src = Image.open(fetch(i, 1920)).convert("RGB")
        # desktop bg 1600x900
        for variant, size in (("bg", (1600, 900)), ("bg--mobile", (768, 1024))):
            im = ImageOps.fit(src, size, Image.LANCZOS)
            base = os.path.join(outdir, f"hero__{slug}--{variant}")
            im.save(base + ".jpg", "JPEG", quality=80, optimize=True, progressive=True)
            im.save(base + ".webp", "WEBP", quality=74, method=6)
            try:
                im.save(base + ".avif", "AVIF", quality=46, speed=4)
            except Exception as e:
                print(f"   avif fail {slug} {variant}: {e}")
        # fg = same as bg (parallax foreground); reuse bg crop
        for variant, size in (("fg", (1600, 900)), ("fg--mobile", (768, 1024))):
            im = ImageOps.fit(src, size, Image.LANCZOS)
            base = os.path.join(outdir, f"hero__{slug}--{variant}")
            im.save(base + ".jpg", "JPEG", quality=80, optimize=True, progressive=True)
            im.save(base + ".webp", "WEBP", quality=74, method=6)
            try:
                im.save(base + ".avif", "AVIF", quality=46, speed=4)
            except Exception:
                pass
        print(f"  hero__{slug}--* written (bg/fg, desktop+mobile, jpg/webp/avif)")
print("done")
