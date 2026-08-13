#!/usr/bin/env python3
"""tools/imgpipe.py — the site's image encoder.

Turns a source photo into the trio every page expects: AVIF + WebP + JPEG,
optionally with a --mobile crop, at the quality bands recorded in
docs/PROJECT-BIBLE.md (AVIF q42-50 speed 3, WebP q70-76 method 6, JPEG q74-80)
and against its delivery budget (AVIF < 250 KB, LCP hero < 200 KB).

WHY THIS EXISTS
The repo had no runnable encoder. The previous attempts — scripts/
reencode-heroes.cjs (needed `sharp`, uninstallable in a repo that deliberately
has no package.json) and six tools/_*.py one-shots (hardcoded
C:\\Users\\ROG STRIX\\ paths) — have since been deleted in favour of this file.
Before it existed, 50 of the site's images (the 7 homepage trip cards and all
43 hotel photos) were still shipping as bare JPEG with no AVIF or WebP sibling
— the only images outside the pipeline, on the pages customers open over
mobile data.

USAGE
  # encode one or many sources into a directory
  python3 tools/imgpipe.py site/assets/images/trips/*.jpg --in-place
  python3 tools/imgpipe.py photo.jpg --out site/assets/images/heroes-v2 \\
      --name hero__bali--bg --width 2000 --mobile --budget 250

  --in-place   write siblings next to each source, reusing its basename
  --out DIR    write into DIR (use with --name for a single source)
  --width N    resize longest edge to N px (default: leave as-is)
  --mobile     also emit a <name>--mobile 768px-wide variant
  --budget KB  warn when the AVIF exceeds KB (default 250)
  --force      re-encode even when the outputs are newer than the source
  --dry-run    report what would happen, write nothing

Idempotent: a target newer than its source is skipped, so re-running over the
whole tree is cheap and safe.

Requires Pillow >= 11.3 (native AVIF).  pip install "pillow>=11.3"
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from PIL import Image, features
except ImportError:
    sys.exit("Pillow manquant. Installer avec:  pip install 'pillow>=11.3'")

# Quality bands from docs/PROJECT-BIBLE.md. Kept at the conservative end of
# each range: these are photographic travel images where banding in a sky is
# more noticeable than a few extra KB.
AVIF = dict(quality=46, speed=3)
WEBP = dict(quality=74, method=6)
JPEG = dict(quality=78, optimize=True, progressive=True)

MOBILE_WIDTH = 768
DEFAULT_BUDGET_KB = 250


def _fresh(src: Path, dst: Path) -> bool:
    """True when dst exists and is at least as new as src."""
    return dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime


def _resized(im: Image.Image, width: int | None) -> Image.Image:
    if not width or im.width <= width:
        return im
    h = round(im.height * width / im.width)
    return im.resize((width, h), Image.LANCZOS)


def _prepare(im: Image.Image) -> Image.Image:
    """EXIF-rotate, then drop to a web-safe mode.

    Phone photos routinely carry an EXIF orientation flag; without applying it
    a portrait shot encodes sideways. Alpha is preserved for AVIF/WebP but the
    JPEG fallback is flattened onto white, since JPEG has no alpha channel.
    """
    from PIL import ImageOps

    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.mode else "RGB")
    return im


def encode(src: Path, out_dir: Path, stem: str, width: int | None,
           budget_kb: int, force: bool, dry: bool) -> list[tuple[str, int, bool]]:
    """Write <stem>.avif/.webp/.jpg into out_dir. Returns (name, kb, over_budget)."""
    results = []
    with Image.open(src) as raw:
        im = _prepare(raw)
        im = _resized(im, width)

        targets = [
            (out_dir / f"{stem}.avif", "AVIF", AVIF),
            (out_dir / f"{stem}.webp", "WEBP", WEBP),
            (out_dir / f"{stem}.jpg", "JPEG", JPEG),
        ]
        for dst, fmt, opts in targets:
            # Never write over the source. With --in-place the JPEG target IS
            # the source file, and re-encoding a JPEG through JPEG is pure
            # generation loss — the original stays the master.
            if dst.resolve() == src.resolve():
                results.append((dst.name, dst.stat().st_size // 1024, False))
                continue
            if not force and _fresh(src, dst):
                kb = dst.stat().st_size // 1024
                results.append((dst.name, kb, False))
                continue
            if dry:
                results.append((dst.name, -1, False))
                continue
            out = im
            if fmt == "JPEG" and out.mode == "RGBA":
                bg = Image.new("RGB", out.size, (255, 255, 255))
                bg.paste(out, mask=out.split()[-1])
                out = bg
            dst.parent.mkdir(parents=True, exist_ok=True)
            out.save(dst, fmt, **opts)
            kb = dst.stat().st_size // 1024
            over = fmt == "AVIF" and kb > budget_kb
            results.append((dst.name, kb, over))
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="Encode site images to AVIF+WebP+JPEG.")
    ap.add_argument("sources", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, help="output directory")
    ap.add_argument("--in-place", action="store_true",
                    help="write siblings beside each source")
    ap.add_argument("--name", help="output basename (single source only)")
    ap.add_argument("--width", type=int, help="resize longest edge to N px")
    ap.add_argument("--mobile", action="store_true",
                    help=f"also emit a --mobile {MOBILE_WIDTH}px variant")
    ap.add_argument("--budget", type=int, default=DEFAULT_BUDGET_KB,
                    help=f"AVIF size budget in KB (default {DEFAULT_BUDGET_KB})")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if not a.out and not a.in_place:
        ap.error("choisir --out DIR ou --in-place")
    if a.name and len(a.sources) > 1:
        ap.error("--name ne vaut que pour une seule source")

    sources = [p for p in a.sources if p.is_file()]
    if not sources:
        print("aucune source lisible", file=sys.stderr)
        return 1

    total_before = total_after = 0
    warnings = 0

    for src in sources:
        out_dir = src.parent if a.in_place else a.out
        stem = a.name or src.stem
        before = src.stat().st_size
        total_before += before

        rows = encode(src, out_dir, stem, a.width, a.budget, a.force, a.dry_run)
        if a.mobile:
            rows += encode(src, out_dir, f"{stem}--mobile", MOBILE_WIDTH,
                           a.budget, a.force, a.dry_run)

        avif = next((r for r in rows if r[0].endswith(".avif")), None)
        if avif and avif[1] >= 0:
            total_after += avif[1] * 1024

        print(f"\n{src}")
        for name, kb, over in rows:
            size = "(dry-run)" if kb < 0 else f"{kb:>4} KB"
            flag = "  ⚠️  dépasse le budget AVIF" if over else ""
            print(f"   {name:<44} {size}{flag}")
            if over:
                warnings += 1

    if total_before and total_after:
        saved = 100 - round(total_after / total_before * 100)
        print(f"\nAVIF livré vs source JPEG: "
              f"{total_before//1024} KB → {total_after//1024} KB ({saved}% de moins)")
    if warnings:
        print(f"\n⚠️  {warnings} fichier(s) au-dessus du budget — "
              f"réduire --width ou baisser la qualité AVIF.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
