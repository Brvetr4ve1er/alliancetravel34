"""
Compress hero JPGs and emit WebP variants.

For each hero in site/assets/images/heroes/:
  - Re-save the JPG at quality=78 (mozjpeg-ish), progressive
  - Emit a WebP at quality=80
  - Emit a mobile crop (~640px wide) for both JPG and WebP

Backups go to _archive/heroes-original/ on first run.
Idempotent — won't re-backup if originals already saved.
"""
from PIL import Image
from pathlib import Path
import shutil

ROOT     = Path(__file__).resolve().parents[2]
HEROES   = ROOT / "site/assets/images/heroes"
BACKUP   = ROOT / "_archive/heroes-original"

DESKTOP_MAX_W = 1600
MOBILE_MAX_W  = 768
JPG_Q  = 78
WEBP_Q = 80

BACKUP.mkdir(parents=True, exist_ok=True)

def fmt_kb(n_bytes: int) -> str:
    return f"{n_bytes // 1024} KB"

print("Hero compression + WebP generation\n")
print(f"{'file':<40} {'before':>10} {'jpg':>8} {'webp':>8} {'jpg-mob':>8} {'webp-mob':>9}")
print("-" * 90)

total_before = 0
total_after_jpg = 0
total_after_webp = 0

for src in sorted(HEROES.glob("hero__*.jpg")):
    # Skip if already a -mobile.jpg variant
    if "-mobile" in src.stem:
        continue

    # Backup original on first run
    backup_path = BACKUP / src.name
    if not backup_path.exists():
        shutil.copy2(src, backup_path)

    img = Image.open(backup_path).convert("RGB")  # always read from original
    before = backup_path.stat().st_size
    total_before += before

    # Resize if wider than DESKTOP_MAX_W
    if img.width > DESKTOP_MAX_W:
        ratio = DESKTOP_MAX_W / img.width
        img_d = img.resize((DESKTOP_MAX_W, int(img.height * ratio)), Image.LANCZOS)
    else:
        img_d = img.copy()

    # Mobile-cropped variant — keep subject centered
    if img.width > MOBILE_MAX_W:
        ratio_m = MOBILE_MAX_W / img.width
        img_m = img.resize((MOBILE_MAX_W, int(img.height * ratio_m)), Image.LANCZOS)
    else:
        img_m = img.copy()

    # Output paths
    out_jpg       = HEROES / src.name
    out_webp      = HEROES / (src.stem + ".webp")
    out_jpg_mob   = HEROES / (src.stem + "--mobile.jpg")
    out_webp_mob  = HEROES / (src.stem + "--mobile.webp")

    img_d.save(out_jpg,      "JPEG", quality=JPG_Q,  optimize=True, progressive=True)
    img_d.save(out_webp,     "WebP", quality=WEBP_Q, method=6)
    img_m.save(out_jpg_mob,  "JPEG", quality=JPG_Q,  optimize=True, progressive=True)
    img_m.save(out_webp_mob, "WebP", quality=WEBP_Q, method=6)

    sj  = out_jpg.stat().st_size
    sw  = out_webp.stat().st_size
    sjm = out_jpg_mob.stat().st_size
    swm = out_webp_mob.stat().st_size
    total_after_jpg  += sj
    total_after_webp += sw

    print(f"{src.name:<40} {fmt_kb(before):>10} {fmt_kb(sj):>8} {fmt_kb(sw):>8} {fmt_kb(sjm):>8} {fmt_kb(swm):>9}")

print("-" * 90)
print(f"{'TOTAL':<40} {fmt_kb(total_before):>10} {fmt_kb(total_after_jpg):>8} {fmt_kb(total_after_webp):>8}")
print()
saved_jpg  = total_before - total_after_jpg
saved_webp = total_before - total_after_webp
print(f"  Saved on JPG re-encode  : {fmt_kb(saved_jpg)}  ({100*saved_jpg/total_before:.0f}%)")
print(f"  Saved on WebP variants  : {fmt_kb(saved_webp)} ({100*saved_webp/total_before:.0f}%)")
print(f"  Originals safely backed up to: _archive/heroes-original/")
