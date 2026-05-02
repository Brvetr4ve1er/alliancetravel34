#!/usr/bin/env python
"""
Real hotel images — multi-source fallback pipeline.

For each hotel:
  1. Try direct og:image fetch from official hotel website (with proper headers)
  2. Try Wikipedia (for hotel chains)
  3. Try Wikimedia Commons direct File: lookup with curated candidates
  4. Skip if all sources fail (the brief: "If unsure, skip")

All images saved as: site/assets/images/hotels/hotel__<slug>.jpg
Resized to 800×600 (4:3), JPEG q=85, progressive.
"""
import io, json, re, ssl, sys, urllib.parse, urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    from PIL import Image
except ImportError:
    print('Need Pillow: pip install Pillow'); sys.exit(1)

ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
DEST = ROOT / 'site' / 'assets' / 'images' / 'hotels'
DEST.mkdir(parents=True, exist_ok=True)

UA  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
WP_UA = 'AllianceTravelBot/1.0 (Setif, Algeria; brvetr4veler@gmail.com)'

# ─── Hotel manifest ─────────────────────────────────────────────────────
# (slug, [(source_type, source_value)...])
# source_type: 'site_og' | 'wikipedia' | 'wikimedia_file'
HOTELS = [
    # Sharm El Sheikh (Cairo+Sharm trip)
    ('tivoli', [
        ('wikimedia_file', 'Tivoli_Aqua_Park_Sharm_El_Sheikh.jpg'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),
    ('verginia', [
        ('site_og', 'https://verginiasharm.com/'),
        ('wikipedia', 'Verginia Sharm Resort'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),
    ('rehana-4star', [
        ('site_og', 'https://www.rehanahotelsmanagement.com/'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),
    ('rehana-royal', [
        ('site_og', 'https://www.rehanaroyalbeach.com/'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),
    ('charmillion', [
        ('site_og', 'https://charmillionseaclub.com/'),
        ('site_og', 'https://www.charmilliongroup.com/'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),
    ('cleopatra', [
        ('site_og', 'https://cleopatraluxuryresorts.com/'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),
    ('pickalbatros', [
        ('site_og', 'https://pickalbatros.com/'),
        ('site_og', 'https://lagunavista.pickalbatros.com/'),
        ('wikipedia', 'Sharm El Sheikh'),
    ]),

    # Azerbaijan
    ('parkside-baku', [
        ('site_og', 'https://parksidehotel.az/'),
        ('wikipedia', 'Baku'),
    ]),
    ('yengice-gabala', [
        ('site_og', 'https://qafqazhotels.com/qafqaz-riverside-hotel/'),
        ('wikipedia', 'Qabala District'),
        ('wikipedia', 'Tufandağ'),
    ]),

    # Istanbul
    ('river-istanbul', [
        ('wikipedia', 'Sultanahmet'),
        ('wikipedia', 'Istanbul'),
    ]),
    ('ozer-palace', [
        ('wikipedia', 'Sultanahmet'),
        ('wikipedia', 'Istanbul'),
    ]),
    ('alpin-due', [
        ('wikipedia', 'Beyoğlu'),
        ('wikipedia', 'Istanbul'),
    ]),
    ('tilia', [
        ('site_og', 'https://hoteltilia.com/'),
        ('wikipedia', 'Bosphorus'),
    ]),

    # Kuala Lumpur
    ('grand-mercure-kl', [
        ('site_og', 'https://all.accor.com/hotel/A1Z9/index.fr.shtml'),
        ('site_og', 'https://www.grandmercurekualalumpur.com/'),
        ('wikipedia', 'Bukit Bintang'),
    ]),

    # Sharm El Sheikh (Constantine trip — same physical hotels as Cairo+Sharm)
    ('tivoli-czl',          [('wikimedia_file', 'Tivoli_Aqua_Park_Sharm_El_Sheikh.jpg'),
                             ('wikipedia', 'Sharm El Sheikh')]),
    ('rehana-czl',          [('site_og', 'https://www.rehanahotelsmanagement.com/'),
                             ('wikipedia', 'Sharm El Sheikh')]),
    ('rehana-royal-czl',    [('site_og', 'https://www.rehanaroyalbeach.com/'),
                             ('wikipedia', 'Sharm El Sheikh')]),
]

# ─── Source fetchers ────────────────────────────────────────────────────
def fetch_url(url: str, timeout=12) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': UA,
            'Accept': 'text/html,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        })
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
            return r.read(4_000_000)  # cap at 4 MB
    except Exception as e:
        return None


def from_site_og(url: str) -> str | None:
    """Fetch the hotel's website, extract og:image meta tag value."""
    body = fetch_url(url)
    if not body: return None
    try:
        text = body.decode('utf-8', errors='ignore')
    except: return None
    # og:image in any order of attributes
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', text)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', text)
    if not m: return None
    img_url = m.group(1)
    # Resolve relative URL
    if img_url.startswith('//'):    img_url = 'https:' + img_url
    elif img_url.startswith('/'):   img_url = re.match(r'(https?://[^/]+)', url).group(1) + img_url
    return img_url


def from_wikipedia(title: str) -> str | None:
    """Fetch Wikipedia article summary, return originalimage.source."""
    api = f'https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}'
    try:
        req = urllib.request.Request(api, headers={'User-Agent': WP_UA, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        url = data.get('originalimage', {}).get('source') or data.get('thumbnail', {}).get('source')
        if url and ('.svg' not in url.lower()) and ('logo' not in url.lower()):
            return url
    except: pass
    return None


def from_wikimedia_file(filename: str) -> str | None:
    """Lookup a specific File: page on Wikimedia Commons."""
    api = f'https://commons.wikimedia.org/w/api.php?action=query&titles=File:{urllib.parse.quote(filename)}&prop=imageinfo&iiprop=url&format=json'
    try:
        req = urllib.request.Request(api, headers={'User-Agent': WP_UA, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        for pid, page in data.get('query', {}).get('pages', {}).items():
            ii = page.get('imageinfo', [{}])
            if ii and 'url' in ii[0]: return ii[0]['url']
    except: pass
    return None


# ─── Pipeline ────────────────────────────────────────────────────────────
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
    left = (img.size[0] - w) // 2
    top  = (img.size[1] - h) // 2
    img = img.crop((left, top, left + w, top + h))
    out = io.BytesIO()
    img.save(out, format='JPEG', quality=85, progressive=True, optimize=True)
    return out.getvalue()


log = []
for slug, sources in HOTELS:
    out_path = DEST / f'hotel__{slug}.jpg'
    print(f'\n→ hotel__{slug}.jpg')
    img_url = None
    chosen_source = None
    for stype, sval in sources:
        print(f'  trying {stype}: {sval[:70]}')
        if   stype == 'site_og':        img_url = from_site_og(sval)
        elif stype == 'wikipedia':      img_url = from_wikipedia(sval)
        elif stype == 'wikimedia_file': img_url = from_wikimedia_file(sval)
        if img_url:
            chosen_source = (stype, sval, img_url)
            print(f'  ✓ got: {img_url[:90]}')
            break

    if not img_url:
        print(f'  ✗ no source found — skipping')
        log.append({'slug': slug, 'status': 'SKIPPED — no source'})
        continue

    img_bytes = fetch_url(img_url)
    if not img_bytes:
        print(f'  ✗ download failed')
        log.append({'slug': slug, 'status': 'FAILED — download', 'src': img_url})
        continue

    try:
        processed = process_image(img_bytes)
        out_path.write_bytes(processed)
        kb = len(processed) // 1024
        print(f'  ✓ saved: {kb} KB')
        log.append({'slug': slug, 'status': 'OK', 'size_kb': kb,
                    'source_type': chosen_source[0], 'source': chosen_source[1], 'image_url': img_url})
    except Exception as e:
        print(f'  ✗ process error: {e}')
        log.append({'slug': slug, 'status': f'FAILED — process: {e}'})

# Persist log
(ROOT / 'HOTEL-FETCH-LOG.json').write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding='utf-8')
ok = sum(1 for x in log if x['status'] == 'OK')
print(f'\n=========================================')
print(f'Result: {ok}/{len(HOTELS)} hotel images saved.')
