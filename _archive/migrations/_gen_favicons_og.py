"""
One-shot generator for favicon + OG image set.
Run from project root: `python _archive/migrations/_gen_favicons_og.py`

Outputs:
  site/assets/images/favicon/  -> favicon-16/32/192/512.png, apple-touch-icon.png, favicon.ico
  site/assets/images/og/        -> og-default.jpg + og-{slug}.jpg per page
  site/site.webmanifest         -> PWA manifest

Idempotent — safe to re-run after hero JPGs change.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import json

ROOT      = Path(__file__).resolve().parents[2]
SITE      = ROOT / "site"
HEROES    = SITE / "assets/images/heroes"
FAV_DIR   = SITE / "assets/images/favicon"
OG_DIR    = SITE / "assets/images/og"

FAV_DIR.mkdir(parents=True, exist_ok=True)
OG_DIR.mkdir(parents=True, exist_ok=True)

# Brand tokens (mirror :root in styles.css)
NAVY      = (0,   44,  81)   # #002c51
MINT      = (156, 232, 178)  # #9ce8b2
CREAM     = (251, 248, 241)  # #fbf8f1
INK       = (10,  12,  18)   # #0a0c12

# ────────────────────────────────────────────────────
# 1. Favicon — clean "A" monogram on navy
# ────────────────────────────────────────────────────
def find_font(*candidates, size=200):
    """Try common font paths until one loads."""
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

def make_monogram(size: int, save_to: Path) -> None:
    """Render 'A' monogram in mint on navy at the given size."""
    img = Image.new("RGBA", (size, size), NAVY + (255,))
    d = ImageDraw.Draw(img)
    # Soft mint corner glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([(-size*0.2, -size*0.2), (size*0.7, size*0.7)],
               fill=MINT + (60,))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.18))
    img.alpha_composite(glow)

    # Draw the letter
    font = find_font(
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        size=int(size * 0.7),
    )
    text = "A"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1] - int(size * 0.04)
    d.text((tx, ty), text, font=font, fill=MINT + (255,))
    img.save(save_to)
    print(f"  favicon: {save_to.relative_to(ROOT)}  ({size}x{size})")

print("Generating favicons...")
make_monogram(16,  FAV_DIR / "favicon-16x16.png")
make_monogram(32,  FAV_DIR / "favicon-32x32.png")
make_monogram(96,  FAV_DIR / "favicon-96x96.png")
make_monogram(180, FAV_DIR / "apple-touch-icon.png")
make_monogram(192, FAV_DIR / "android-chrome-192x192.png")
make_monogram(512, FAV_DIR / "android-chrome-512x512.png")

# Multi-size .ico for legacy browsers
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
make_monogram(64, FAV_DIR / "_tmp64.png")
ico_base = Image.open(FAV_DIR / "_tmp64.png")
ico_base.save(FAV_DIR / "favicon.ico", sizes=ico_sizes)
(FAV_DIR / "_tmp64.png").unlink()
print(f"  favicon: {(FAV_DIR / 'favicon.ico').relative_to(ROOT)}  (multi-size ico)")

# ────────────────────────────────────────────────────
# 2. site.webmanifest
# ────────────────────────────────────────────────────
manifest = {
    "name": "Alliance Travel",
    "short_name": "Alliance",
    "description": "Voyages guidés depuis Bordj Bou Arreridj",
    "icons": [
        {"src": "/assets/images/favicon/android-chrome-192x192.png",
         "sizes": "192x192", "type": "image/png"},
        {"src": "/assets/images/favicon/android-chrome-512x512.png",
         "sizes": "512x512", "type": "image/png"},
    ],
    "theme_color": "#002c51",
    "background_color": "#0a0c12",
    "display": "standalone",
    "start_url": "/",
    "lang": "fr-DZ",
}
manifest_path = SITE / "site.webmanifest"
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"  manifest: {manifest_path.relative_to(ROOT)}")

# ────────────────────────────────────────────────────
# 3. OG images — 1200x630 per page
# ────────────────────────────────────────────────────
OG_W, OG_H = 1200, 630

PAGES = [
    {"slug": "home",              "hero": "hero__cairo-sharm.jpg",        "title": "Voyages guidés",                "sub": "Égypte · Azerbaïdjan · Istanbul · Malaisie · Sharm"},
    {"slug": "cairo-sharm",       "hero": "hero__cairo-sharm.jpg",        "title": "Le Caire & Sharm El Sheikh",    "sub": "Voyage tout-inclus · Juin 2026"},
    {"slug": "azerbaidjan",       "hero": "hero__azerbaidjan.jpg",        "title": "Azerbaïdjan · Bakou & Gabala",  "sub": "Voyage tout-inclus · Avril–Juillet 2026"},
    {"slug": "istanbul",          "hero": "hero__istanbul.jpg",           "title": "Istanbul",                      "sub": "Voyage guidé · Mars–Mai 2026"},
    {"slug": "kuala-lumpur",      "hero": "hero__kuala-lumpur.jpg",       "title": "Kuala Lumpur · Malaisie",       "sub": "Voyage tout-inclus · Mars–Mai 2026"},
    {"slug": "sharm-constantine", "hero": "hero__sharm-constantine.jpg",  "title": "Sharm El Sheikh + Constantine", "sub": "Combo plage + culture · Avr–Juin 2026"},
]

def make_og(hero_path: Path, title: str, subtitle: str, save_to: Path) -> None:
    """Compose a 1200x630 OG image: hero photo backdrop + dark gradient + brand text."""
    bg = Image.open(hero_path).convert("RGB")
    # Resize/crop to 1200x630
    src_w, src_h = bg.size
    target_ar = OG_W / OG_H
    src_ar = src_w / src_h
    if src_ar > target_ar:
        new_w = int(src_h * target_ar)
        x0 = (src_w - new_w) // 2
        bg = bg.crop((x0, 0, x0 + new_w, src_h))
    else:
        new_h = int(src_w / target_ar)
        y0 = (src_h - new_h) // 2
        bg = bg.crop((0, y0, src_w, y0 + new_h))
    bg = bg.resize((OG_W, OG_H), Image.LANCZOS)

    # Dark gradient overlay (left → bottom heavy)
    overlay = Image.new("RGBA", (OG_W, OG_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(OG_H):
        # Stronger fade at bottom for text legibility
        alpha = int(140 + (y / OG_H) * 110)
        od.line([(0, y), (OG_W, y)], fill=(10, 12, 18, min(255, alpha)))
    bg = Image.alpha_composite(bg.convert("RGBA"), overlay)

    # Side bar of mint accent
    bar = Image.new("RGBA", (OG_W, OG_H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    bd.rectangle([(0, 0), (10, OG_H)], fill=MINT + (255,))
    bg = Image.alpha_composite(bg, bar)

    d = ImageDraw.Draw(bg)
    # Eyebrow
    eb_font = find_font("C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size=28)
    d.text((80, 360), "ALLIANCE TRAVEL · BORDJ BOU ARRERIDJ", font=eb_font, fill=MINT + (255,))

    # Title (large, bold)
    title_font = find_font("C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size=72)
    d.text((80, 405), title, font=title_font, fill=CREAM + (255,))

    # Subtitle
    sub_font = find_font("C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size=34)
    d.text((80, 510), subtitle, font=sub_font, fill=(220, 220, 220, 230))

    # Right-side URL chip
    url_font = find_font("C:/Windows/Fonts/arial.ttf", size=24)
    url_text = "alliance-travel.dz"
    bbox = d.textbbox((0, 0), url_text, font=url_font)
    tw = bbox[2] - bbox[0]
    d.text((OG_W - tw - 80, 570), url_text, font=url_font, fill=(180, 180, 180, 200))

    # Save as JPG (smaller files for OG)
    bg.convert("RGB").save(save_to, "JPEG", quality=85, optimize=True, progressive=True)
    kb = save_to.stat().st_size // 1024
    print(f"  og: {save_to.relative_to(ROOT)}  ({kb} KB)")

print("\nGenerating OG share images (1200x630)...")
for p in PAGES:
    hero = HEROES / p["hero"]
    if not hero.exists():
        print(f"  SKIP — no hero at {hero}")
        continue
    out = OG_DIR / f"og-{p['slug']}.jpg"
    make_og(hero, p["title"], p["sub"], out)

# Default fallback
default_out = OG_DIR / "og-default.jpg"
make_og(HEROES / "hero__cairo-sharm.jpg",
        "Alliance Travel — Voyages guidés",
        "Bordj Bou Arreridj · Algérie · 2026",
        default_out)

print("\nDone.")
print(f"  Favicons:  {len(list(FAV_DIR.glob('*')))} files in {FAV_DIR.relative_to(ROOT)}")
print(f"  OG images: {len(list(OG_DIR.glob('*.jpg')))} files in {OG_DIR.relative_to(ROOT)}")
print(f"  Manifest:  {manifest_path.relative_to(ROOT)}")
