#!/usr/bin/env python3
"""
v17 — Optimize hero photos for the web.

For each JPG in site/assets/images/heroes-v2/:
  1. Generate a WebP at q=82 (typically 4-6× smaller than the JPG)
  2. Generate a mobile-cropped JPG (max-width 900px, q=78)
  3. Generate a mobile-cropped WebP (max-width 900px, q=78)

Idempotent — skips files already optimized unless --force.
Reports before/after sizes per file at the end.
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).parent
SRC = ROOT / "site" / "assets" / "images" / "heroes-v2"

if not SRC.exists():
    print(f"ERROR: {SRC} does not exist")
    sys.exit(1)

# Mobile target width — matches the v14 mobile media query (max-width: 768px)
# but with some slack for higher-DPI mobile displays.
MOBILE_MAX_WIDTH = 900
DESKTOP_MAX_WIDTH = 1920  # cap full-size at 1920 (most displays max here)

force = '--force' in sys.argv

def fmt_kb(b):
    return f"{b/1024:.0f} KB"

def optimize(jpg_path: Path):
    """Return (webp_bytes, mobile_jpg_bytes, mobile_webp_bytes, src_bytes)."""
    src_bytes = jpg_path.stat().st_size
    base = jpg_path.with_suffix('')   # strip .jpg
    name = jpg_path.name

    # Output paths
    webp_path = base.with_suffix('.webp')
    mobile_jpg_path = base.parent / f"{base.name}--mobile.jpg"
    mobile_webp_path = base.parent / f"{base.name}--mobile.webp"

    img = Image.open(jpg_path)
    img = ImageOps.exif_transpose(img)  # auto-rotate per EXIF
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # 1. Full-size WebP (cap at DESKTOP_MAX_WIDTH if larger)
    if not webp_path.exists() or force:
        full = img.copy()
        if full.width > DESKTOP_MAX_WIDTH:
            ratio = DESKTOP_MAX_WIDTH / full.width
            full = full.resize((DESKTOP_MAX_WIDTH, int(full.height * ratio)), Image.LANCZOS)
        full.save(webp_path, 'WEBP', quality=82, method=6)
    webp_bytes = webp_path.stat().st_size

    # 2. Mobile JPG (max-width 900)
    if not mobile_jpg_path.exists() or force:
        mob = img.copy()
        if mob.width > MOBILE_MAX_WIDTH:
            ratio = MOBILE_MAX_WIDTH / mob.width
            mob = mob.resize((MOBILE_MAX_WIDTH, int(mob.height * ratio)), Image.LANCZOS)
        mob.save(mobile_jpg_path, 'JPEG', quality=78, optimize=True, progressive=True)
    mob_jpg_bytes = mobile_jpg_path.stat().st_size

    # 3. Mobile WebP (max-width 900)
    if not mobile_webp_path.exists() or force:
        mob = img.copy()
        if mob.width > MOBILE_MAX_WIDTH:
            ratio = MOBILE_MAX_WIDTH / mob.width
            mob = mob.resize((MOBILE_MAX_WIDTH, int(mob.height * ratio)), Image.LANCZOS)
        mob.save(mobile_webp_path, 'WEBP', quality=78, method=6)
    mob_webp_bytes = mobile_webp_path.stat().st_size

    return src_bytes, webp_bytes, mob_jpg_bytes, mob_webp_bytes


if __name__ == "__main__":
    jpgs = sorted(SRC.glob("hero__*.jpg"))
    # Skip already-mobile JPGs
    jpgs = [p for p in jpgs if not p.stem.endswith('--mobile')]
    if not jpgs:
        print("No hero JPGs found")
        sys.exit(0)

    print(f"Optimizing {len(jpgs)} hero photos in {SRC}\n")
    print(f"  {'name':<40} {'src':>8}  {'webp':>8} {'mob.jpg':>8} {'mob.wp':>8}  saved")
    total_src = 0
    total_webp = 0
    total_mob_webp = 0
    for jpg in jpgs:
        src, webp, mob_jpg, mob_webp = optimize(jpg)
        total_src += src
        total_webp += webp
        total_mob_webp += mob_webp
        # Most aggressive saving = desktop WebP serves users
        saved = src - webp
        pct = (saved / src) * 100 if src else 0
        print(f"  {jpg.name:<40} {fmt_kb(src):>8}  {fmt_kb(webp):>8} {fmt_kb(mob_jpg):>8} {fmt_kb(mob_webp):>8}  {fmt_kb(saved)} ({pct:.0f}%)")
    print()
    print(f"  Desktop JPG total:   {fmt_kb(total_src):>10}")
    print(f"  Desktop WebP total:  {fmt_kb(total_webp):>10}  (saves {fmt_kb(total_src - total_webp)} = {((total_src - total_webp)/total_src)*100:.0f}%)")
    print(f"  Mobile WebP total:   {fmt_kb(total_mob_webp):>10}  (vs JPG: saves {fmt_kb(total_src - total_mob_webp)} = {((total_src - total_mob_webp)/total_src)*100:.0f}%)")
    print()
    print("Done.")
