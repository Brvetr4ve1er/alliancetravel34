#!/usr/bin/env python
"""
Alliance Travel — Asset fetch & processing pipeline.

Sources (in priority order):
  1. Wikimedia Commons via Wikipedia REST API summary endpoint
     (legitimate API, copyright-safe — most images are CC-BY-SA or PD)
  2. Wikimedia Commons direct File: pages

Booking.com is INTENTIONALLY excluded for image scraping:
  - their pages return 202/Cloudflare interstitials to bots
  - their photos are © the hotel chains, not redistributable
  - the legitimate path is the official Affiliate Programme API

Output: site/assets/images/{heroes,trips,sites,og,favicon}/*.jpg
        Each file processed: resized, cropped to target ratio, JPEG q=85
"""
import io, json, ssl, sys, os, re, urllib.parse, urllib.request
from pathlib import Path

# Force UTF-8 stdout on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    from PIL import Image
except ImportError:
    print("FATAL: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

UA   = 'AllianceTravelBot/1.0 (Setif, Algeria; brvetr4veler@gmail.com)'
ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
ASSETS = ROOT / 'site' / 'assets' / 'images'

# ─── Asset manifest ──────────────────────────────────────────────────────
# (filename, target_ratio, target_w, target_h, wikipedia_titles_in_priority)
ASSETS_PLAN = [
    # ── HEROES (5) — 4:3 ratio, 1600x1200, < 350 KB ─────────────────────
    ('heroes/hero__cairo-sharm.jpg',       (1600, 1200), [
        'Pyramids of Giza',
        'Giza pyramid complex',
        'Great Pyramid of Giza',
    ]),
    ('heroes/hero__azerbaidjan.jpg',       (1600, 1200), [
        'Flame Towers',
        'Baku',
    ]),
    ('heroes/hero__istanbul.jpg',          (1600, 1200), [
        'Sultan Ahmed Mosque',
        'Hagia Sophia',
        'Bosphorus',
    ]),
    ('heroes/hero__kuala-lumpur.jpg',      (1600, 1200), [
        'Petronas Towers',
        'Kuala Lumpur',
    ]),
    ('heroes/hero__sharm-constantine.jpg', (1600, 1200), [
        'Naama Bay',
        'Sharm El Sheikh',
        'Red Sea',
    ]),

    # ── HOMEPAGE TRIP CARDS (5) — 16:9, 1280x720 ─────────────────────────
    ('trips/card__home__cairo-sharm.jpg',       (1280, 720), [
        'Naama Bay',
        'Sharm El Sheikh',
        'Red Sea',
    ]),
    ('trips/card__home__azerbaidjan.jpg',       (1280, 720), [
        'Sheki Khan Palace',
        'Sheki, Azerbaijan',
        'Old City (Baku)',
    ]),
    ('trips/card__home__istanbul.jpg',          (1280, 720), [
        'Grand Bazaar, Istanbul',
        'Bosphorus Bridge',
        'Galata Bridge',
    ]),
    ('trips/card__home__kuala-lumpur.jpg',      (1280, 720), [
        'Batu Caves',
        'Genting Highlands',
    ]),
    ('trips/card__home__sharm-constantine.jpg', (1280, 720), [
        'Sharm El Sheikh',
        'Red Sea',
    ]),

    # ── TOURISTIC SITES (20) — 4:3 ratio, 800x600 ────────────────────────
    # Cairo + Sharm
    ('sites/site__cairo__pyramids-sphinx.jpg', (800, 600), [
        'Great Sphinx of Giza',
        'Giza pyramid complex',
    ]),
    ('sites/site__cairo__nile-cruise.jpg',     (800, 600), [
        'Nile cruise',
        'Cairo',
        'Nile',
    ]),
    ('sites/site__sharm__red-sea.jpg',         (800, 600), [
        'Red Sea',
        'Coral reefs of the Red Sea',
    ]),
    ('sites/site__cairo__egyptair-plane.jpg',  (800, 600), [
        'EgyptAir',
        'Cairo International Airport',
    ]),

    # Azerbaijan
    ('sites/site__baku__old-city.jpg',         (800, 600), [
        'Old City (Baku)',
        'Maiden Tower (Baku)',
    ]),
    ('sites/site__baku__yanar-dag.jpg',        (800, 600), [
        'Yanar Dag',
    ]),
    ('sites/site__gabala__cable-car.jpg',      (800, 600), [
        'Tufandağ',
        'Qabala District',
    ]),
    ('sites/site__baku__heydar-aliyev.jpg',    (800, 600), [
        'Heydar Aliyev Center',
    ]),

    # Istanbul
    ('sites/site__istanbul__sultanahmet.jpg',     (800, 600), [
        'Sultan Ahmed Mosque',
    ]),
    ('sites/site__istanbul__princes-islands.jpg', (800, 600), [
        'Princes\' Islands',
        'Büyükada',
    ]),
    ('sites/site__istanbul__ortakoy.jpg',         (800, 600), [
        'Ortaköy Mosque',
        'Bosphorus Bridge',
    ]),
    ('sites/site__istanbul__asian-side.jpg',      (800, 600), [
        'Maiden\'s Tower (Istanbul)',
        'Üsküdar',
    ]),

    # Kuala Lumpur
    ('sites/site__kl__petronas.jpg',     (800, 600), [
        'Petronas Towers',
    ]),
    ('sites/site__kl__batu-caves.jpg',   (800, 600), [
        'Batu Caves',
    ]),
    ('sites/site__kl__genting.jpg',      (800, 600), [
        'Genting Highlands',
        'Awana Skyway',
    ]),
    ('sites/site__kl__city-tour.jpg',    (800, 600), [
        'Kuala Lumpur',
        'Kuala Lumpur Tower',
    ]),

    # Sharm El Sheikh — Constantine
    ('sites/site__sharm__aqua-park.jpg',         (800, 600), [
        'Sharm El Sheikh',
        'Naama Bay',
    ]),
    ('sites/site__sharm__all-inclusive.jpg',     (800, 600), [
        'Naama Bay',
        'Sharm El Sheikh',
    ]),
    ('sites/site__sharm__soho-square.jpg',       (800, 600), [
        'Sharm El Sheikh',
    ]),
    ('sites/site__sharm__airport-constantine.jpg', (800, 600), [
        'Mohamed Boudiaf International Airport',
        'Constantine, Algeria',
    ]),
]


# ─── Wikimedia fetch ──────────────────────────────────────────────────────
def wikipedia_image_url(title: str) -> str | None:
    """Return the original-quality image URL for a Wikipedia article, or None."""
    api = f'https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}'
    req = urllib.request.Request(api, headers={'User-Agent': UA, 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read())
        # Prefer originalimage > thumbnail
        url = data.get('originalimage', {}).get('source') or data.get('thumbnail', {}).get('source')
        # Skip SVGs and logos (we want photos)
        if url and ('.svg' in url.lower() or 'logo' in url.lower()):
            return None
        return url
    except Exception as e:
        print(f'    [API] {title}: {e}')
        return None


def fetch_image(url: str) -> bytes | None:
    """Download an image from a URL, return bytes or None."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.read()
    except Exception as e:
        print(f'    [DL] {url[:80]}: {e}')
        return None


# ─── Image processing ────────────────────────────────────────────────────
def process_to_jpg(img_bytes: bytes, target_w: int, target_h: int) -> bytes:
    """Resize+crop image to target dimensions, encode as JPEG q=85."""
    img = Image.open(io.BytesIO(img_bytes))

    # Convert RGBA / P / etc. to RGB on a black background
    if img.mode != 'RGB':
        bg = Image.new('RGB', img.size, (12, 14, 18))
        if img.mode == 'RGBA':
            bg.paste(img, mask=img.split()[3])
        else:
            bg.paste(img.convert('RGBA'), mask=img.convert('RGBA').split()[3] if img.mode == 'P' else None)
        img = bg

    # Cover-resize: scale up until both dims >= target, then center-crop
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w, new_h = int(src_w * scale), int(src_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)

    # Center crop
    left = (new_w - target_w) // 2
    top  = (new_h - target_h) // 2
    img = img.crop((left, top, left + target_w, top + target_h))

    # Encode JPEG at quality 85 with progressive loading
    out = io.BytesIO()
    img.save(out, format='JPEG', quality=85, progressive=True, optimize=True)
    return out.getvalue()


# ─── Main pipeline ───────────────────────────────────────────────────────
def main():
    log = []

    for relpath, (w, h), titles in ASSETS_PLAN:
        out_path = ASSETS / relpath
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # Skip if file already exists with reasonable size (don't overwrite valid)
        if out_path.exists() and out_path.stat().st_size > 8000:
            log.append({'file': relpath, 'status': 'SKIPPED (exists)', 'source': str(out_path)})
            continue

        print(f'\n→ {relpath}')
        url = None
        chosen_title = None
        for title in titles:
            print(f'  trying: {title}')
            url = wikipedia_image_url(title)
            if url:
                chosen_title = title
                print(f'  ✓ found:  {url[:90]}')
                break

        if not url:
            print(f'  ✗ no source found')
            log.append({'file': relpath, 'status': 'FAILED — no source', 'source': None})
            continue

        img_bytes = fetch_image(url)
        if not img_bytes:
            log.append({'file': relpath, 'status': 'FAILED — download', 'source': url})
            continue

        try:
            processed = process_to_jpg(img_bytes, w, h)
            out_path.write_bytes(processed)
            kb = len(processed) / 1024
            print(f'  ✓ saved:  {kb:.0f} KB → {out_path.relative_to(ROOT)}')
            log.append({
                'file':   relpath,
                'status': 'OK',
                'source': url,
                'wikipedia_article': chosen_title,
                'size_kb': round(kb, 1),
            })
        except Exception as e:
            print(f'  ✗ process error: {e}')
            log.append({'file': relpath, 'status': f'FAILED — process: {e}', 'source': url})

    # Write log
    log_path = ROOT / 'IMAGE-FETCH-LOG.json'
    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'\n=========================================')
    print(f'Log saved: {log_path}')
    ok = sum(1 for x in log if x['status'] == 'OK')
    skip = sum(1 for x in log if 'SKIPPED' in x['status'])
    fail = sum(1 for x in log if 'FAILED' in x['status'])
    print(f'Summary: {ok} OK · {skip} skipped · {fail} failed · {len(ASSETS_PLAN)} total')


if __name__ == '__main__':
    main()
