# `_archive/` — kept deliberately, not part of the running site

Nothing here is required for the site to build or run, and `.vercelignore`
excludes the folder from the deploy upload. But both remaining items are kept
on purpose — read below before deleting either.

> Trimmed 2026-08-13: `migrations/`, `css-scratch/`, `handoff-snapshot-v5.2/`
> and the empty `handoff-snapshot/` were removed (64 files). They were pure
> forensic record with no code referencing them, and git history still has them
> if anyone needs to look. What follows is what survived, and why.

## `heroes-original/` — 5 hero JPGs, 1600×1200

**Do not delete.** These are the masters for the hero images still live on the
homepage. The shipped copies in `site/assets/images/heroes/` are 1280×960 —
smaller in both dimensions — so this is the only higher-resolution source in
the repo. Re-encode from here (`python3 tools/imgpipe.py`) rather than
upscaling the shipped files.

Note the homepage references four of these **at runtime**, not by literal path:
`site/assets/js/hero-collage-lazy.js` builds `assets/images/heroes/hero__` +
the `data-lazy-hero` slug. A plain grep for the filename finds nothing, which
makes them look unused. They are not.

## `logs/` — image provenance

**Do not delete.** `IMAGE-FETCH-LOG.json`, `HOTEL-FETCH-LOG.json` and
`IMAGE-FETCH-REPORT.md` map every fetched image to its Wikimedia Commons source
URL. That is the attribution record for photography on a commercial site — the
only place the provenance is written down. Licence compliance depends on it.

## Don't add to this folder

If something is worth keeping, document it in `docs/` — the living source of
truth. This folder is frozen.
