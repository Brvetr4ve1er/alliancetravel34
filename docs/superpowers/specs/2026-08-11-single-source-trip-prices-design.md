# Single-source trip prices (sync-on-save) — Design

**Date:** 2026-08-11
**Status:** approved (design), pending implementation plan
**Scope:** Part 1 only — trip-internal price copies. Home/voyages/enhance.js cards are a separate follow-up spec.

## Problem

A single trip price is stored in up to ~6 copies inside one `data/trips/<slug>.json`. Editing one copy leaves the page contradicting itself, and — since `api/save-trip.mjs` only runs `checkValueGraph` at build time — a guided edit that touches one copy commits a green "Publié ✓" and then breaks the Vercel build (fixed defensively in `2c1eadd`: the build gate now runs at save and *rejects* the mismatch). But rejecting is not self-service: the owner still cannot successfully change a price, because the guided form edits only the calculator integers and leaves the display copies stale.

## Goal

Make `tripData.hotels[].prices` (the calculator integers) the **single source** for a trip's prices. The owner edits only those integers (already guided admin fields); on save, every derived display copy is recomputed from them, so a price change propagates correctly and the build passes.

## Source of truth

- `tripData.hotels[].prices.{double,single,triple,child1,child2,baby}` — calculator integers (the source).
- `tripData.headlineHotelId` — which hotel row is the headline (falls back to cheapest double), via existing `headlineDouble(trip)`.

## Derived copies and their rules

All formatting via existing `fmtDA(n)` ("129000" → "129.000 DA"). Each rule reuses the guards already encoded in `deriveValues`.

| Copy (JSON path) | Derived from | Guard (else leave untouched) |
|---|---|---|
| `hero.priceFrom` | headline double | headline resolvable |
| `seo.offerPrice` | headline double (as plain string) | headline resolvable |
| `hotels[i].priceFrom` | `hotels[i].prices.double` (positional) | card count == price-row count **and** every card `priceFrom` already parses as currency (skips bali/kuala-lumpur, whose cards hold itinerary text) |
| `hotels[i].priceMeta` | `hotels[i].prices.single` | the `Single <currency>` token is present in the string; rewrite only that number |
| `calcUi.optionsHtml` | each option's hotel double (positional) | option count == hotel count; rewrite only the `dès <currency>` number per `<option>` |

Anything not provably safe is left exactly as-is and reported, never guessed.

## New unit: `syncDerivedPrices(trip)`

Add to `tools/value-graph.mjs` (beside `deriveValues`/`driftOf`, reusing `fmtDA`/`parseDA`/`headlineDouble`).

- **Pure:** deep-clones the input; never mutates it.
- **Returns** `{ trip, changes }` where `changes` is `[{ path, from, to }]` for every copy actually rewritten.
- **Idempotent:** running it on already-synced content yields `changes: []`.
- **Safe-only:** applies a rewrite exclusively when that copy's guard (table above) holds; otherwise leaves the value and does not record a change.

## Integration: `api/save-trip.mjs`

Order so that render, gate, and commit all act on the exact bytes we ship:

```js
// 1. Schema + image validation on the submitted content (unchanged).
const { errors } = validateTrip(`data/trips/${slug}.json`, content, { enabled: true, imageExists });
if (errors.length) return res.status(422).json({ errors: errors.map((e) => e.msg) });

// 2. Single-source: recompute every derived display copy from tripData.hotels prices.
const synced = syncDerivedPrices(content).trip;

// 3. Dry-run render the SYNCED content (prove the committed bytes render).
try { renderTrip(synced); } catch (e) { return res.status(422).json({ errors: [`rendu impossible: ${e.message}`] }); }

// 4. Backstop: the same value-graph gate, now on synced content.
const drift = driftOf(synced);
if (drift.length) return res.status(422).json({ errors: /* mismatch details, as today */ });

// 5. Commit `synced` (JSON.stringify(synced, …)), not the raw content.
```

Post-sync, `driftOf` passes for the safe copies; it still rejects genuinely unresolvable cases (no priced double, bad `headlineHotelId`) exactly as today. The committed JSON is the synced one.

## Admin: `site/admin/edit-pages.js`

Remove `hero.priceFrom` from the guided `FIELDS` array. It is now derived, so editing it directly would be silently overwritten on save — confusing. The calculator-price inputs (`tripData.hotels[].prices.*`) remain the single editable source. (The raw-JSON "Avancé" panel is unaffected; a raw edit still flows through `syncDerivedPrices` on save.)

## Testing (TDD)

- **`tools/value-graph.test.mjs`** (extend): `syncDerivedPrices` recomputes each copy from a changed source; is idempotent; skips the unsafe cases (bali/kuala-lumpur cards untouched; a `priceMeta` without the `Single` token untouched; mismatched option/hotel counts leave `optionsHtml` untouched).
- **`api/save-trip.test.mjs`** (extend): editing a hotel's `prices.double` and posting → the committed content has `hero.priceFrom`, `seo.offerPrice`, that hotel's `hotels[i].priceFrom` and its `optionsHtml` entry all updated; response 200; commit made once. Keep the existing reject test (an *unresolvable* case still 422s).
- Full suite + `node tools/build.mjs` stay green and idempotent on the current 7 trips (they are already coherent, so sync is a no-op on them).

## Out of scope (separate spec)

Home page cards, voyages cards, `site/assets/js/enhance.js` price object, the site i18n dictionary copies, and `related[]` cross-sell prices. The durable fix there is to data-drive those cards from trip data at build; it is a presentation-layer change and gets its own spec. No regression here: those surfaces behave exactly as today.

## Risks & mitigations

- **String-surgery on `priceMeta`/`optionsHtml`** is the riskiest part → strict guards + rewrite only the matched number + unit tests for the skip cases. When in doubt, leave untouched (the build gate remains the backstop).
- **Overwriting a deliberate `hero.priceFrom`** → by design; the calculator integer is the source. Removing the guided field prevents the owner from expecting otherwise.
- **No behavior change for the 7 current trips** (already coherent) → sync is a verified no-op; asserted by the idempotent build.
