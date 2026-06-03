"""
_v27_social_whatsapp.py — Alliance Travel
=========================================
Two business fixes requested by the client:

  1. SOCIAL LINKS — replace placeholder handles with the agency's real
     accounts, and add the SECOND Facebook page (visa.bba.9) next to the
     main one (Alliance.Mebarkia).

       Instagram : alliance.travel.dz   ->  alliance_travel34
       TikTok    : @alliance.travel.dz  ->  @visa.bba34
       Facebook  : alliance.travel.dz   ->  Alliance.Mebarkia  (+ visa.bba.9)

  2. ALL NUMBERS -> WHATSAPP — every standalone `tel:` link becomes a
     one-click `wa.me` deep-link with a pre-filled message, so a client is
     one tap away from messaging the agency.

     SKIPPED on purpose (these already pair an explicit WhatsApp button
     beside the number, so the call link is a deliberate alternative):
       - homepage phone-cards "Appel" buttons  (class phone-card__btn--call)
       - <noscript> fallbacks                  (class u-no-decoration)

     Plain-text (unlinked) numbers in cairo-sharm's final-CTA contact row
     are wrapped into wa.me links too.

Idempotent: re-running makes no further changes.
Run:  python _archive/migrations/_v27_social_whatsapp.py
"""

import os
import re

BASE = r"C:\Users\ROG STRIX\Documents\alliance travel"
SITE = os.path.join(BASE, "site")

PAGES = [
    os.path.join(SITE, "index.html"),
    os.path.join(SITE, "voyages", "index.html"),
    os.path.join(SITE, "cairo-sharm", "index.html"),
    os.path.join(SITE, "azerbaidjan", "index.html"),
    os.path.join(SITE, "istanbul", "index.html"),
    os.path.join(SITE, "kuala-lumpur", "index.html"),
    os.path.join(SITE, "sharm-constantine", "index.html"),
    os.path.join(SITE, "404.html"),
]

# Pre-filled WhatsApp message (matches the existing footer wa.me links)
WA_TEXT = "Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus."

# ── Real social accounts ────────────────────────────────────────────────────
IG_OLD = "https://www.instagram.com/alliance.travel.dz"
IG_NEW = "https://www.instagram.com/alliance_travel34/"
TT_OLD = "https://www.tiktok.com/@alliance.travel.dz"
TT_NEW = "https://www.tiktok.com/@visa.bba34"

FB_SVG = ('<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" '
          'aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.5 9.95v-7.04H8v-2.91h2.5V9.84'
          'c0-2.47 1.49-3.84 3.77-3.84 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 '
          '1.56v1.87h2.78l-.44 2.91H13.6v7.04A10 10 0 0 0 22 12z"/></svg>')

# Match the whole placeholder Facebook anchor (multi-line: opening tag, svg, </a>)
FB_OLD_RE = re.compile(
    r'<a href="https://www\.facebook\.com/alliance\.travel\.dz".*?</a>',
    re.DOTALL,
)
FB_NEW = (
    '<a href="https://web.facebook.com/Alliance.Mebarkia" target="_blank" '
    'rel="noopener" aria-label="Facebook Alliance Travel">' + FB_SVG + '</a>\n'
    '          <a href="https://web.facebook.com/visa.bba.9" target="_blank" '
    'rel="noopener" aria-label="Facebook Alliance Travel — Visa BBA">' + FB_SVG + '</a>'
)

# ── tel: -> wa.me ───────────────────────────────────────────────────────────
TEL_ANCHOR_RE = re.compile(r'<a\b[^>]*href="tel:\+213\d+"[^>]*>')
SKIP_MARKERS = ("phone-card__btn--call", "u-no-decoration")


def convert_tel(m):
    tag = m.group(0)
    if any(marker in tag for marker in SKIP_MARKERS):
        return tag  # deliberate call link beside an existing WhatsApp button
    num = re.search(r'tel:\+213(\d+)', tag).group(1)
    wa = "https://wa.me/213{}?text={}".format(num, WA_TEXT)
    new_tag = re.sub(r'href="tel:\+213\d+"', 'href="{}"'.format(wa), tag)
    if "target=" not in new_tag:
        new_tag = new_tag[:-1] + ' target="_blank" rel="noopener">'
    elif "rel=" not in new_tag:
        new_tag = new_tag[:-1] + ' rel="noopener">'
    return new_tag


# ── cairo-sharm final-CTA plain-text contact row -> wa.me links ─────────────
CONTACT_ROW_RE = re.compile(r'0560 869 905\s*·\s*0560 860 617\s*·\s*0561 616 269')


def _wa_link(display):
    digits = display.replace(" ", "")            # 0560869905
    intl = "213" + digits.lstrip("0")            # 213560869905
    return ('<a href="https://wa.me/{}?text={}" target="_blank" rel="noopener" '
            'class="contact-phone-link">{}</a>').format(intl, WA_TEXT, display)


CONTACT_ROW_NEW = " · ".join(
    _wa_link(n) for n in ("0560 869 905", "0560 860 617", "0561 616 269")
)


def process(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    orig = html
    counts = {}

    # 1. Instagram + TikTok URLs
    n = html.count(IG_OLD); html = html.replace(IG_OLD, IG_NEW)
    if n: counts["instagram"] = n
    n = html.count(TT_OLD); html = html.replace(TT_OLD, TT_NEW)
    if n: counts["tiktok"] = n

    # 2. Facebook: single placeholder -> two real pages
    if "web.facebook.com/visa.bba.9" not in html:
        html, n = FB_OLD_RE.subn(FB_NEW, html)
        if n: counts["facebook(+2nd)"] = n

    # 3. tel: -> wa.me (with skip rule)
    html, n = TEL_ANCHOR_RE.subn(convert_tel, html)
    # subn counts ALL matches incl. skipped; recount real conversions
    converted = len(re.findall(r'wa\.me/213\d+\?text=', html)) - len(re.findall(r'wa\.me/213\d+\?text=', orig))
    if converted: counts["tel->wa.me"] = converted

    # 4. cairo-sharm plain contact-row numbers
    html, n = CONTACT_ROW_RE.subn(CONTACT_ROW_NEW, html)
    if n: counts["contact-row links"] = n

    if html != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        rel = os.path.relpath(path, BASE)
        print("  CHANGED {:<32} {}".format(rel, counts))
    else:
        rel = os.path.relpath(path, BASE)
        print("  --      {:<32} (no change)".format(rel))


print("v27 — social links + all-numbers-to-WhatsApp\n")
for p in PAGES:
    if os.path.exists(p):
        process(p)
    else:
        print("  MISSING " + p)
print("\nDone.")
