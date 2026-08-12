# Single-source home/voyages prices (derive + verify at build) — Design

**Date:** 2026-08-11
**Status:** approved (mechanism), pending spec review
**Scope:** the "from" price shown on the home page, the voyages listing, and the nav quick-switcher. Trip-page copies are already single-sourced (sync-on-save, shipped `60f252e`).

## Problem

Each trip's "from" price is hand-copied into ~14 places outside its trip JSON, and the trip-page single-sourcing does not reach them:
- `site/index.html`: FR card (`aria-label`, `data-from`, visible `<strong>`, cta) **+ an inline i18n dictionary** with EN and AR entries (`aria`, `from_html`, `cta_price_html`).
- `site/voyages/index.html`: FR card (`aria-label`, visible `<strong>`, cta).
- `site/assets/js/enhance.js`: the `ALL_TRIPS` nav-switcher array (`price:`).

Formats vary: dotted `129.000 DA`, spaced `129 000 DA`, comma `129,000 DA` (EN aria), and the AR `دج` label. An admin price edit now updates the trip page but leaves all of these stale.

## Verified (safety baseline)

Every current static price already equals its trip's **headline double**: all 7 `enhance.js` entries match; all **63** `index.html` price tokens and **22** `voyages` tokens are headline doubles, zero orphans. So the derive is a **no-op on today's data** — it only propagates future changes, never alters a price now.

## Source of truth

`headlineDouble(trip).value` from `tools/value-graph.mjs` (the same value the hero/trip page derive). One number per trip; the home/voyages "from" price is exactly this.

## The unit: `tools/sync-static-prices.mjs`

Exports a pure `syncStaticPrices(files, priceBySlug) -> { files, changes }` and a thin runner used by the build.

- **`priceBySlug`**: `{ slug: headlineDouble }`, built from `data/trips/*.json`.
- **Format-preserving reformat:** a token's thousands separator is detected and re-applied with the new number — `129.000`→`132.000`, `129 000`→`132 000`, `129,000`→`132,000`. The digits change; the style and surrounding text/currency label do not. This avoids per-spot format knowledge.
- **Per-trip anchored regions** (only that trip's tokens are touched):
  - `index.html` FR card: the `<a class="trip-card" … href="<slug>/index.html">…</a>` element.
  - `index.html` EN & AR dict entries: the `<cardKey>: { … }` object block in each language section, located by `cardKey` via an explicit **`SLUG→CARDKEY` map** (`egypte→egypt`, `kuala-lumpur→malaysia`, `azerbaidjan→azerbaijan`; the rest are identity), bounded by brace matching.
  - `voyages/index.html` FR card: `<a … href="../<slug>/">…</a>`.
  - `enhance.js`: the `{ slug: '<slug>', … price: '<price>' }` object literal.
  - Within each region, every price-shaped token (`\d{2,3}[., ]\d{3}` followed by `DA`/`دج`/`دينار`) is reformatted to the trip's headline double.

## Build integration

`tools/build.mjs` runs the runner (rewrites the three files in place, like it writes trip pages) **before** its idempotence report, so a data change surfaces as `rendu`. Vercel's build (`node tools/build.mjs`) therefore propagates an admin price edit to the home/voyages/enhance prices on deploy — completing the single source.

## Verify / safety (the guardrail)

After rewriting, the runner asserts and **throws (fails the build)** if any hold false:
1. **Idempotent:** a second `syncStaticPrices` pass produces zero changes (an unstable/duplicated anchor would loop).
2. **Full coverage:** every price token inside a matched region now equals that trip's headline double, and every trip's expected region was found (a moved/renamed anchor → count mismatch → fail).
3. **No missed trip-price copy:** every `…DA/دج` token in the file whose value **equals a trip headline double** lies inside a matched region for that trip. (A token equal to a headline double but sitting outside all regions is almost certainly a copy the anchoring missed — it would drift silently — so fail. A non-headline `…DA` value, e.g. a future visa fee, is legitimately ignored, so this does not false-fail on unrelated prices.)

A failure is loud at build time (never a silent wrong price), matching the philosophy of `checkValueGraph`.

## Testing (TDD)

`tools/sync-static-prices.test.mjs` on fixtures (small HTML/JS strings, not the live files):
- **No-op** when all copies already match the source.
- **Propagation:** change one slug's source → every format variant (dotted/spaced/comma) in FR/EN/AR + voyages + enhance for that slug is rewritten; other slugs untouched.
- **Format preserved** per token (dotted stays dotted, comma stays comma).
- **Verify fails** on: a token that couldn't be matched (moved anchor), a non-idempotent rewrite, a stray out-of-region price token.
- A **real-file assertion**: `syncStaticPrices` on the current `index.html`/`voyages`/`enhance.js` yields `changes: []` (the verified no-op), and `node tools/build.mjs` stays idempotent.

## Out of scope

Non-price copy on the home/voyages cards (titles, dates, subtitles — still hand-authored + their inline i18n), and the broader "generate the cards from trip data" refactor. Trip-page price copies (already done). Contact numbers / branches single-sourcing (separate audit items).

## Risks & mitigations

- **Fragile string surgery across 3 languages / 3 formats / scattered regions** — mitigated by per-trip anchoring + format-preserving reformat + the three-part verify that fails the build on any missed/moved/stray token. When an anchor can't be resolved, the tool fails rather than guesses.
- **Build now mutates previously-static files** — consistent with how the build already writes trip pages; committed files stay synced by rebuilding + committing, and Vercel regenerates on deploy. No visual/markup change; only price digits move.
- **No-op today is proven**, so shipping cannot change a displayed price.
