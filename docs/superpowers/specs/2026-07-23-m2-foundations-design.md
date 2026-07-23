# M2 — Foundations: the translation contract and the value graph

**Date:** 2026-07-23 · **Status:** awaiting owner review · **Predecessor:** `2026-07-21-admin-dashboard-redesign-design.md`

## 1. Why this milestone exists

The dashboard is pleasant and safe, and it edits about 9% of the site. Widening it is the obvious next
move and it is the wrong one to make first, because two hazards would be multiplied across every new
field rather than fixed:

1. **Editing French silently invalidates English and Arabic.** Nothing detects it, nothing warns, and
   the wrong value is published in two languages. For a price or a departure date that is an incorrect
   commercial commitment, not a typo.
2. **One number lives in many places.** The cheapest double appears **7 times** in `istanbul.json`
   alone, in two formats (`"129.000 DA"` and `"129000"`). Editing one copy leaves the page internally
   contradicting itself. Vietnam is already drifted in production: the hero and Google rich-result
   advertise 439.000 DA while the cheapest real double is 420.000 DA.

M2 builds the two contracts that make widening safe. It deliberately adds almost no new editable
fields; M3 does that, on top of this.

## 2. Verified facts this design rests on

Measured directly, 2026-07-23. Two of these overturn assumptions made in the earlier audit.

| Claim | Result |
|---|---|
| `k.*` binding names derive from `keyPrefix + Capitalise(slot)` | **FALSE — 74.4%.** 79 of 308 bindings drifted (`k.recap` → `azBreakdownHeader`, `k.itinPhase` → `azPhase1`). Generating `k.*` would silently detach all 79. |
| `k.*` is the binding surface | **FALSE.** A rendered trip page carries **214–224** `data-i18n` bindings; only ~50 come via `k.*`. The rest are emitted by templates and loops. |
| Translation coverage | ~92% on six trips. **Istanbul: 33%** (24 on-page bindings, 8 translated). |
| `hotels[]` → `tripData.hotels[]` is many-to-one | **TRUE on 3 of 7.** bali 6→2, vietnam 6→2, kuala-lumpur 3→2. Others are 1:1. |
| A price is duplicated | **7 occurrences** of the cheapest double in `istanbul.json`, across `hero.priceFrom`, `seo.offerPrice`, `hotels[].priceFrom` and the calculator rows. |

**Consequence:** the contract cannot be generated from `k.*`, and must not try. It is *extracted from
the rendered page*, which is the only place all 214+ bindings coexist.

## 3. Part A — The translation contract

### 3.1 Manifest, built from what actually shipped

`tools/build.mjs` already renders every page. A new module `tools/i18n-manifest.mjs` parses each
rendered page and records, per trip, every `data-i18n` / `data-i18n-html` key with:

- `fr` — the element's French text (the DOM is the French source of truth; `captureBaseline()` in the
  public `i18n.js` already treats it that way at runtime)
- `frHash` — a short stable hash of that French
- `en`, `ar` — the current translations, from the trip's `i18n.en` / `i18n.ar` block
- `enHash`, `arHash` — the `frHash` **as it was when that translation was last confirmed**

Written to `data/i18n-manifest.json`, committed, regenerated on every build.

**Staleness is then computable, not guessed:** a key is stale in a language when
`frHash !== <lang>Hash`. Missing entirely when the language has no value at all.

Keys resolved from the shared site dictionary (`nav.*`, `heroFrom`, …) are recorded as
`scope: "shared"` and excluded from per-trip coverage — they are translated once, globally. This is
what made 17 keys per trip look "missing" in the audit; they are not.

### 3.2 What the owner sees

In **Pages**, every editable field that carries a binding renders as three stacked inputs:

```
Hero — sur-titre        [ Départs garantis · Septembre 2026 ]   FR
                        [ Guaranteed departures · Sept 2026 ]   EN   ⚠ à mettre à jour
                        [ انطلاقات مؤكدة · سبتمبر 2026 ]        AR   ⚠ à mettre à jour
```

- Editing FR immediately marks EN and AR **stale** (amber), with the old translation still visible and
  editable — the owner can fix it in place, or leave it and see the warning persist.
- Editing EN or AR clears that language's stale mark (its hash is re-stamped to the current `frHash`).
- A field with no binding shows a single input, as today.
- The Arabic input is `dir="rtl"`; numerals stay LTR-isolated per the existing `.ltr` rule.

**On publish:** a summary line states what is stale (« 3 champs ont une traduction anglaise à mettre à
jour »). It **warns and allows** — a hard block would turn a one-word price fix into a three-language
task, and the owner already accepted that trade when choosing side-by-side editing. The warning is
recorded in the commit message so the state is auditable.

### 3.3 Coverage, and Istanbul

Each page shows a coverage figure (« Traduit à 92 % en anglais »), computed from the manifest.

**Istanbul is fixed as part of this milestone**, not merely measured. Its 33% is a live content bug:
English and Arabic visitors currently read French across most of that page. The ~190 missing keys are
generated from the rendered French, translated, and written into `istanbul.json`'s `i18n.en` / `i18n.ar`
blocks — bringing it in line with the other six trips. Translations are produced in-session and
reviewed by the owner before publish; no machine-translation service is introduced (no dependencies,
no data leaving the project).

### 3.4 A build gate that cannot be bypassed

`tools/check-i18n.mjs`, wired into the existing error gate in `tools/build.mjs`:

- **Error** — a `data-i18n` key on a rendered page that exists in no dictionary at all (a binding
  pointing at nothing: the page would show a raw key or fall back silently).
- **Warning** — stale or missing translations, reported with counts per trip so regressions are visible
  in build output.

Errors fail the build exactly like the existing validators, so a broken binding can never deploy.

## 4. Part B — The value graph

### 4.1 The relationships, declared once

`tools/value-graph.mjs` declares the derivation rules as data:

| Derived field | Source | Format |
|---|---|---|
| `hero.priceFrom` | cheapest `tripData.hotels[].prices.double` | `"129.000 DA"` (dotted) |
| `seo.offerPrice` | same | `"129000"` (bare digits — Google rich result) |
| `hotels[i].priceFrom` | the linked calculator row's `prices.double` | `"129.000 DA"` |
| `includedCount` | length of the inclusions list | integer |

`hotels[]` (display cards) link to `tripData.hotels[]` (price rows) **many-to-one**: several cards can
share one price row, and the link is by the card's hotel id. The mapping is derived at build time and
recorded in the manifest, so the admin never has to guess — and a form can never assume 1:1, which
would corrupt bali, vietnam and kuala-lumpur.

`hotels[].priceFrom` is **not always a price** — on vietnam it holds free text ("5 nuits Phu Quoc").
Fields whose current value does not parse as currency are left alone and flagged, never overwritten.

### 4.2 What the owner sees

One price control per calculator row, labelled by hotel **name** (egypte currently shows 25 unlabelled
number boxes). Below it, the fields that will move with it, shown read-only with a *derived* badge:

```
Hôtel Grand Hyatt — chambre double    [ 129000 ]
   ↳ met à jour aussi : prix « à partir de » du hero · prix Google · carte hôtel
```

Editing the number rewrites every derived copy in the correct format on save. Derived fields become
read-only in the form — they cannot drift because they can no longer be edited independently.

### 4.3 A drift gate

`tools/check-value-graph.mjs`, also in the build error gate: recompute every derived value and compare
against what is stored.

- **Error** on mismatch — this is what would have caught Vietnam's 439.000-vs-420.000 drift before it
  reached Google.
- One-time repair: the existing drift is corrected in the same commit that introduces the gate,
  because otherwise the gate fails the build on day one.

## 5. What M2 deliberately does not do

No new editable content groups (that is M3) · no visa-page editing (M4) · no translation service or
new dependency · no `k.*` migration — it stays exactly as it is, untouched, because rewriting it is
the thing that would break 79 bindings · no change to the auth flow or the save pipeline's gate order.

## 6. Testing

- `i18n-manifest` extraction: unit-tested against a fixture page with known bindings, including
  `data-i18n-html`, loop-generated keys and shared-scope keys.
- Staleness: editing FR marks both languages stale; editing a translation clears only that language;
  round-trip through save → rebuild preserves hashes.
- Value graph: many-to-one fan-out verified on bali/vietnam/kuala-lumpur specifically; non-currency
  `priceFrom` left untouched; drift gate fails on a deliberately corrupted value.
- Both gates: green on all 7 trips after the one-time repairs; `node tools/build.mjs --check` stays
  idempotent.
- The existing `check-admin-fields` gate and the FIELDS block remain untouched and green.
