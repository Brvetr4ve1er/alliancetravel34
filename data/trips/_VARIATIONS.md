# Per-Page Structural Variations

How the other 4 trip pages differ from the `cairo-sharm` reference. `cairo-sharm` is the
richest page; everything below is a delta the generator must handle. See `SCHEMA.md` for
field definitions.

## Identity / theming

| Page | slug | region | data-page | `--accent` | theme-color | from-price |
|---|---|---|---|---|---|---|
| **cairo-sharm** (ref) | `cairo-sharm` | `egypt` | `cairo_sharm` | `#B2E89C` | `#C9872E` | 190.000 DA |
| Azerbaïdjan | `azerbaidjan` | `azerbaijan` | `azerbaidjan` | `#3AAFAF` | `#3AAFAF` | 219.000 / hero 227.000 |
| Istanbul | `istanbul` | `istanbul` | `istanbul` | `#70b8e0` | `#5B9EC9` | 123.000 DA |
| Kuala Lumpur | `kuala-lumpur` | `malaysia` | `kuala_lumpur` | `#4CAF82` | `#4CAF82` | 211.000 DA |
| Sharm·Constantine | `sharm-constantine` | `sharm` | `sharm_constantine` | `#28B4D4` | `#28B4D4` | 155.000 DA |

Note: on **istanbul** the JSON-LD/hero price is `123000` but the OG title is "Istanbul" only.
On **azerbaidjan** the JSON-LD Offer price (`219000`) ≠ the hero `priceFrom` (`227.000 DA`) — the cheapest *triple* rate is used for the schema price. Generator must allow `jsonLd.offerPrice` to differ from `hero.priceFrom`.

## Section presence

All 5 pages share the same section set and order: nav → hero → highlights(4) → itinerary →
trip-map → trust → inclus → faq → hotels → calculator → booking → info-block(4) → related(2) →
final-cta → footer. **No section is absent on any page.** The differences are *structural within* sections:

| Concern | cairo-sharm | azerbaidjan | istanbul | kuala-lumpur | sharm-constantine |
|---|---|---|---|---|---|
| **Hero title attr** | `data-title-pre`+`data-title-post` | pre+post | pre+post | pre+post | **`data-title` (single)** ⚠ |
| **Itinerary layout** | **`split` (2 columns)** ⚠ | `single` | `single` | `single` | `single` |
| **Itinerary days** | 6 (3+3) | 7 | 7 | 6 | 5 |
| **Trip-map** | present | present | present | present | present |
| **Hotel tier-tabs** | 5 tabs | 3 tabs | 4 tabs | **none (single hotel)** ⚠ | 4 tabs |
| **Hotel count** | 7 | 2 | 4 | **1** | 3 |
| **Hotel stars markup** | inline SVGs | `★` string | `★` string | `★` string | `★` string |
| **Calc room types** | double/triple/single | double/triple/single | **double/single** | **double/single** | double/triple/single |
| **Calc extras** | 1 (Musée, 0 DA) | none | none | **1 (taxe touristique, 20 USD)** | none |
| **FAQ items** | 5 | 4 | 4 | 4 | 4 |
| **inclus included/excluded** | 9 / 7 | 10 / 6 | 8 / 7 | 8 / 7 | (per page) |

⚠ = the three structural forks that need explicit generator branches.

## Detailed deltas

### Azerbaïdjan
- **2 hotels, both shipped in TRIP_DATA with identical prices** (`parkside` is the real package; `yengice` is the Gabala leg at the same unified price). The Yengice **hotel-card replaces the price block** with `label:"Inclus dans le package"`, `strong:"2 nuits Gabala"`, `meta:"tarif unifié — voir calculateur"`. → needs a `priceDisplayOverride` on the hotel object.
- `child1`==`child2` (179000) — single child tier. baby = **35000** (not 25000 like every other page).
- Kid steppers: row "Enfants" → `child_b`, row "Enfants –4 ans" → `child_a`. 3rd "Nouveau-né" → `baby`.
- Visa info block says **visa INCLUS** (e-Visa ASAN), unlike cairo-sharm's pay-on-arrival.
- Hotel select has a single combined option (`PARKSIDE … + Yengice … — 227.000 DA`).
- final-cta has only 2 phone buttons; contact-row has 1 item.

### Istanbul
- 4 hotels, tiers `economique`(3★)/`medium`(4★)×2/`premium`(4★). Stars vary 3–4.
- **No triple** room type in UI, but TRIP_DATA still ships a `triple` price (== `double`).
- Calc has a bespoke **"À noter" info box** (visa turc non inclus) inside the form — an extra `.calc-form-group` not present elsewhere. Treat as an optional `calculator.formNote` field.
- Hotel price-meta embeds the single rate (e.g. `"Double · pers · Single 160.000 DA"`).
- Kid rows: "Enfants 6–12"→`child_b`, "Enfants 2–5"→`child_a`, "Bébés"→`baby`. 6 date chips.
- Related cards point to azerbaidjan + sharm-constantine.

### Kuala Lumpur
- **Single hotel** (`grandmercure`, tier `luxe`). `hotel-grid` has modifier `u-measure-sm`; card has class `selected`; CTA text is `"Sélectionné"`. **No tier-tabs** (`hotelsSection.tierTabs = null`).
- After the hotel grid there's an **inline "Non inclus dans le package" note block** (`.u-measure-md` styled div) — not present on multi-hotel pages. Model as `hotelsSection.afterGridNote` (HTML string).
- Calc form group has `data-single-hotel="true"`; room type labels are `"Double / Twin"` / `"Individuelle"`.
- **extras: taxe touristique 20 USD** (`{ label:"Taxe touristique hôtel (obligatoire)", amount:20, currency:"USD" }`). Only KL has a non-DA / non-zero extra.
- Hero `data-date` is short (`"8 jours · Grand Mercure 5★"` — no nights count).
- Kid rows (in calc, not shown above): standard child_a/child_b/baby.

### Sharm · Constantine
- **Hero uses single `data-title="Sharm El Sheikh"`** (no pre/post). The visible `<h1>` still splits as `Sharm <em>El Sheikh</em>` — so `h1Pre`/`h1Em` differ from the (absent) title-pre/post. This is the one page that exercises the `hero.titleSingle` branch.
- 3 hotels, tiers economique/medium/premium. 10 jours / 8 nuits (longest trip).
- All hotel price-metas mention `"triple −5.000 DA"`. CTA text `"Sélectionner cet hôtel"` (vs `"Sélectionner"`).
- Kid rows: "1ᵉʳ enfant"→`child_b`, "2ᵉ enfant"→`child_a`, "Bébés"→`baby`.
- `child1` (1ᵉʳ enfant) ≠ `child2` (2ᵉ enfant) and they vary per hotel.
- 5 date chips with `DD/MM – DD/MM/2026` data-date format (different from the other pages' month-name format).

## Generator branch summary (the hard-to-data-drive cases)

1. **Hero title fork** — `titleSingle` (sharm-constantine) vs `titlePre`/`titlePost` (others). Plus `h1Pre`/`h1Em` are stored independently because they don't always equal the data-title parts.
2. **Itinerary `layout`** — `split` (cairo-sharm, emits `.itinerary-split` 2-col grid + mobile override `<style>`) vs `single`.
3. **Hotels: tier-tabs nullable + variable count + `★`-string vs inline-SVG stars** + per-card **`priceDisplayOverride`** (azerbaidjan Yengice) + **single-hotel extras** (`afterGridNote`, `selected`/`u-measure-sm`, KL).
4. **Calculator kid-type mapping** — the `data-kid-type` (`child_a`/`child_b`/`baby`) ↔ price-key (`child1`/`child2`/`baby`) mapping is inconsistent per page and must be stored explicitly in `groupConfig`, never inferred. `baby` price is 25000 everywhere **except azerbaidjan (35000)**.
5. **Extras currency/amount** — usually `[]` or DA/0; KL is `20 USD`. Don't assume DA.
6. **Visa info block** — only the visa `<details>` content varies by destination; the other 3 info blocks are byte-identical across pages.
7. **JSON-LD price may differ from hero price** (azerbaidjan).
8. **theme-color ≠ accent** on cairo-sharm and istanbul.
