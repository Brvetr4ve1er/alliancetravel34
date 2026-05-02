"""
Inject favicon + og:image / twitter:image tags into each page's <head>.
Idempotent — safe to re-run.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"

PAGES = [
    {"path": SITE / "index.html",                        "slug": "home",              "depth": ""},
    {"path": SITE / "cairo-sharm/index.html",            "slug": "cairo-sharm",       "depth": "../"},
    {"path": SITE / "azerbaidjan/index.html",            "slug": "azerbaidjan",       "depth": "../"},
    {"path": SITE / "istanbul/index.html",               "slug": "istanbul",          "depth": "../"},
    {"path": SITE / "kuala-lumpur/index.html",           "slug": "kuala-lumpur",      "depth": "../"},
    {"path": SITE / "sharm-constantine/index.html",      "slug": "sharm-constantine", "depth": "../"},
]

START = "<!-- AT:favicons-og START -->"
END   = "<!-- AT:favicons-og END -->"

def block_for(slug: str, depth: str) -> str:
    fav = f"{depth}assets/images/favicon"
    og  = f"{depth}assets/images/og/og-{slug}.jpg"
    og_abs = f"https://alliance-travel.dz/assets/images/og/og-{slug}.jpg"
    return f"""{START}
<link rel="icon" type="image/png" sizes="32x32" href="{fav}/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="{fav}/favicon-16x16.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="{fav}/apple-touch-icon.png"/>
<link rel="icon" type="image/x-icon" href="{fav}/favicon.ico"/>
<link rel="manifest" href="{depth}site.webmanifest"/>
<meta property="og:image" content="{og_abs}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:image" content="{og_abs}"/>
<meta name="twitter:card" content="summary_large_image"/>
{END}"""

def inject(html: str, block: str) -> str:
    # Remove any prior block
    html = re.sub(re.escape(START) + r".*?" + re.escape(END), "", html, flags=re.DOTALL)
    # Remove any pre-existing og:image / twitter:image / favicon links to avoid dupes
    for pat in [
        r'\s*<meta\s+property="og:image[^"]*"[^>]*/?>',
        r'\s*<meta\s+name="twitter:image[^"]*"[^>]*/?>',
        r'\s*<link\s+rel="(?:icon|apple-touch-icon|manifest)"[^>]*/?>',
        r'\s*<meta\s+name="twitter:card"[^>]*/?>',
    ]:
        html = re.sub(pat, "", html, flags=re.IGNORECASE)
    # Insert just before </head>
    html = re.sub(r"\s*</head>", "\n  " + block + "\n</head>", html, count=1, flags=re.IGNORECASE)
    return html

for p in PAGES:
    txt = p["path"].read_text(encoding="utf-8")
    new = inject(txt, block_for(p["slug"], p["depth"]))
    if new != txt:
        p["path"].write_text(new, encoding="utf-8")
        print(f"  injected: {p['path'].relative_to(ROOT)}  -> og-{p['slug']}.jpg")
    else:
        print(f"  no change: {p['path'].relative_to(ROOT)}")

print("\nDone.")
