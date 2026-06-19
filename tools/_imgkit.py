# -*- coding: utf-8 -*-
"""Download Pexels photos by id and build a labeled contact-sheet montage.
Usage: python tools/_imgkit.py <category> <id1> <id2> ...
Outputs _imgtmp/montage_<category>.jpg (4-col grid, each cell labeled with its id)."""
import sys, os, urllib.request, io
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")

TMP = r"C:\Users\ROG STRIX\Documents\alliance travel\_imgtmp"
os.makedirs(TMP, exist_ok=True)
cat = sys.argv[1]
ids = sys.argv[2:]

def pexels_url(i, w=600):
    return f"https://images.pexels.com/photos/{i}/pexels-photo-{i}.jpeg?auto=compress&cs=tinysrgb&w={w}"

def fetch(i):
    p = os.path.join(TMP, f"{i}.jpg")
    if os.path.exists(p) and os.path.getsize(p) > 1000:
        return p
    try:
        req = urllib.request.Request(pexels_url(i), headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=30).read()
        with open(p, "wb") as f:
            f.write(data)
        return p
    except Exception as e:
        print(f"  FAIL {i}: {e}")
        return None

cell_w, cell_h, cols = 360, 270, 4
pad, labelh = 6, 22
ok = []
for i in ids:
    p = fetch(i)
    if p:
        try:
            Image.open(p).verify(); ok.append(i)
        except Exception:
            print(f"  bad image {i}")

rows = (len(ok) + cols - 1) // cols
W = cols * (cell_w + pad) + pad
H = rows * (cell_h + labelh + pad) + pad
sheet = Image.new("RGB", (W, H), (24, 24, 28))
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("arial.ttf", 15)
except Exception:
    font = ImageFont.load_default()

for idx, i in enumerate(ok):
    r, c = divmod(idx, cols)
    x = pad + c * (cell_w + pad)
    y = pad + r * (cell_h + labelh + pad)
    try:
        im = Image.open(os.path.join(TMP, f"{i}.jpg")).convert("RGB")
        from PIL import ImageOps
        im = ImageOps.fit(im, (cell_w, cell_h), Image.LANCZOS)
        sheet.paste(im, (x, y))
        draw.rectangle([x, y + cell_h, x + cell_w, y + cell_h + labelh], fill=(12, 12, 14))
        draw.text((x + 5, y + cell_h + 3), f"[{idx}] id={i}", fill=(120, 230, 160), font=font)
    except Exception as e:
        print(f"  paste fail {i}: {e}")

out = os.path.join(TMP, f"montage_{cat}.jpg")
sheet.save(out, "JPEG", quality=80)
print(f"montage -> {out}  ({len(ok)} imgs, {W}x{H})")
print("ids in order:", " ".join(ok))
