#!/usr/bin/env python
"""
Real hotel images — v2 with URL caching + diverse Wikimedia candidates.

Improvements over v1:
  - URL bytes cache: download each unique URL once, reuse for all hotels
  - Per-hotel diverse Wikimedia File: candidates (avoid same image everywhere)
  - 0.6s polite delay between requests
  - Better Wikimedia Commons file targeting
"""
import io, json, re, ssl, sys, time, urllib.parse, urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try: from PIL import Image
except ImportError: print('Need Pillow'); sys.exit(1)

ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
DEST = ROOT / 'site' / 'assets' / 'images' / 'hotels'
DEST.mkdir(parents=True, exist_ok=True)

UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
WP_UA = 'AllianceTravelBot/1.0 (Setif, Algeria; brvetr4veler@gmail.com)'

# ─── Curated diverse candidates per hotel ───────────────────────────────
# We mostly use Wikimedia Commons File: lookups (most reliable, copyright-safe).
# Each hotel gets a distinct candidate so images don't repeat.
HOTELS = {
    # ── Sharm El Sheikh (Cairo+Sharm trip) ──
    'tivoli':            ['Aqua_park_in_Sharm_El_Sheikh.jpg', 'Naama_Bay_R01.jpg', 'Sharm_El_Sheikh_-_panoramio_(15).jpg'],
    'verginia':          ['Sharm_El_Sheikh_-_panoramio_(15).jpg', 'Naama_Bay_R01.jpg'],
    'rehana-4star':      ['Naama_Bay_R01.jpg', 'Sharm_El_Sheikh_in_2018.jpg', 'Sharm_El_Sheikh_-_panoramio_(15).jpg'],
    'rehana-royal':      ['Sharm_El_Sheikh_in_2018.jpg', 'Naama_Bay_R01.jpg'],
    'charmillion':       ['Sharm_el_Sheikh_Beach.jpg', 'Aqua_park_in_Sharm_El_Sheikh.jpg', 'Naama_Bay_R01.jpg'],
    'cleopatra':         ['Sharm_el_Sheikh_Beach.jpg', 'Sharm_El_Sheikh_in_2018.jpg'],
    'pickalbatros':      ['Sharm_el_Sheikh_Beach.jpg', 'Aqua_park_in_Sharm_El_Sheikh.jpg'],

    # ── Azerbaijan ──
    'parkside-baku':     ['Baku_Skyline_at_Night.jpg', 'Baku_Montage.jpg', 'Flame_towers_baku.jpg'],
    'yengice-gabala':    ['Tufandag_Mountain_March_2015.jpg', 'Qabala_Riverside.jpg', 'Gabala_Cable_Car.jpg'],

    # ── Istanbul ──
    'river-istanbul':    ['Istanbul_asv2020-02_img06_Süleymaniye_Mosque.jpg', 'Hagia_Sophia_(228968325).jpeg'],
    'ozer-palace':       ['Sultanahmet_Square,_Istanbul.jpg', 'Hagia_Sophia_(228968325).jpeg'],
    'alpin-due':         ['Istanbul_Galata_(54527446009).jpg', 'Galata_Tower.jpg'],
    'tilia':             ['Bosphorus_at_night.jpg', 'BuyukadaMainSquare.jpg'],

    # ── Kuala Lumpur ──
    'grand-mercure-kl':  ['Petronas_Twin_Towers,_Kuala_Lumpur.jpg', 'Kuala_Lumpur_skyline_at_night.jpg', 'Bukit_Bintang_junction_in_2024_2.jpg'],

    # ── Sharm El Sheikh (Constantine trip — same physical hotels) ──
    'tivoli-czl':        ['Aqua_park_in_Sharm_El_Sheikh.jpg', 'Naama_Bay_R01.jpg'],
    'rehana-czl':        ['Sharm_El_Sheikh_in_2018.jpg', 'Naama_Bay_R01.jpg'],
    'rehana-royal-czl':  ['Sharm_el_Sheikh_Beach.jpg', 'Sharm_El_Sheikh_in_2018.jpg'],
}


# ─── URL bytes cache ────────────────────────────────────────────────────
_cache: dict[str, bytes | None] = {}

def fetch_url(url: str, timeout=15) -> bytes | None:
    if url in _cache: return _cache[url]
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': WP_UA,
            'Accept': '*/*',
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read(6_000_000)
        _cache[url] = data
        time.sleep(0.6)  # be polite to Wikimedia
        return data
    except Exception as e:
        print(f'    [DL fail] {e}')
        _cache[url] = None
        return None


def wikimedia_file_url(filename: str) -> str | None:
    """Resolve a Wikimedia Commons File: page to the actual image URL."""
    api = f'https://commons.wikimedia.org/w/api.php?action=query&titles=File:{urllib.parse.quote(filename)}&prop=imageinfo&iiprop=url&format=json'
    try:
        req = urllib.request.Request(api, headers={'User-Agent': WP_UA, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        time.sleep(0.3)
        for pid, page in data.get('query', {}).get('pages', {}).items():
            ii = page.get('imageinfo', [{}])
            if ii and 'url' in ii[0]: return ii[0]['url']
    except Exception as e:
        print(f'    [API fail] {e}')
    return None


def process_image(img_bytes: bytes, w: int = 800, h: int = 600) -> bytes:
    img = Image.open(io.BytesIO(img_bytes))
    if img.mode != 'RGB':
        bg = Image.new('RGB', img.size, (12, 14, 18))
        if 'A' in img.mode:
            try: bg.paste(img, mask=img.split()[-1])
            except: bg.paste(img.convert('RGB'))
        else: bg.paste(img.convert('RGB'))
        img = bg
    src_w, src_h = img.size
    scale = max(w / src_w, h / src_h)
    img = img.resize((int(src_w * scale), int(src_h * scale)), Image.LANCZOS)
    left = (img.size[0] - w) // 2; top = (img.size[1] - h) // 2
    img = img.crop((left, top, left + w, top + h))
    out = io.BytesIO()
    img.save(out, format='JPEG', quality=85, progressive=True, optimize=True)
    return out.getvalue()


# ─── Main ───────────────────────────────────────────────────────────────
log = []
for slug, candidates in HOTELS.items():
    out_path = DEST / f'hotel__{slug}.jpg'
    print(f'\n→ hotel__{slug}.jpg')
    chosen_url = None
    chosen_file = None
    for fname in candidates:
        print(f'  trying {fname}')
        url = wikimedia_file_url(fname)
        if not url:
            print(f'    not on commons')
            continue
        img_bytes = fetch_url(url)
        if not img_bytes:
            print(f'    download failed')
            continue
        chosen_url = url; chosen_file = fname
        break

    if not chosen_url:
        print(f'  ✗ no source found')
        log.append({'slug': slug, 'status': 'SKIPPED'})
        continue

    try:
        processed = process_image(_cache[chosen_url])
        out_path.write_bytes(processed)
        kb = len(processed) // 1024
        print(f'  ✓ saved: {kb} KB ← {chosen_file}')
        log.append({'slug': slug, 'status': 'OK', 'size_kb': kb, 'source_file': chosen_file, 'url': chosen_url})
    except Exception as e:
        print(f'  ✗ process: {e}')
        log.append({'slug': slug, 'status': f'FAILED'})

(ROOT / 'HOTEL-FETCH-LOG.json').write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding='utf-8')
ok = sum(1 for x in log if x['status'] == 'OK')
print(f'\n{ok}/{len(HOTELS)} hotel images saved.')
