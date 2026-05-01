#!/usr/bin/env python
"""
Process hotel images downloaded by Chrome to /Downloads → resize → save with
proper naming → remove originals.

Run AFTER Chrome has triggered the downloads.

Naming convention (per IMAGE-ASSETS.md):
  AT_<slug>.jpg  (in Downloads)  →  hotel__<slug>.jpg  (in site/assets/images/hotels/)

Target: 800×600 (4:3), JPEG q=85, progressive.
"""
import io, sys, os
from pathlib import Path
from PIL import Image

DOWNLOADS = Path(r'C:/Users/ROG STRIX/Downloads')
DEST = Path(r'C:/Users/ROG STRIX/Documents/alliance travel/site/assets/images/hotels')
DEST.mkdir(parents=True, exist_ok=True)

def process(src: Path, target: Path, w: int = 800, h: int = 600):
    img = Image.open(src)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    src_w, src_h = img.size
    scale = max(w / src_w, h / src_h)
    img = img.resize((int(src_w * scale), int(src_h * scale)), Image.LANCZOS)
    left = (img.size[0] - w) // 2
    top  = (img.size[1] - h) // 2
    img = img.crop((left, top, left + w, top + h))
    out = io.BytesIO()
    img.save(out, format='JPEG', quality=85, progressive=True, optimize=True)
    target.write_bytes(out.getvalue())
    return len(out.getvalue())

# Process every AT_*.jpg found in Downloads
processed = 0
for src in DOWNLOADS.glob('AT_*.jpg'):
    slug = src.stem.replace('AT_', '')   # e.g. AT_pickalbatros → pickalbatros
    target = DEST / f'hotel__{slug}.jpg'
    try:
        size = process(src, target)
        print(f'  OK  hotel__{slug}.jpg  ({size//1024} KB)')
        src.unlink()  # remove original from Downloads
        processed += 1
    except Exception as e:
        print(f'  ERR {slug}: {e}')

print(f'\nProcessed {processed} hotel image(s)')
