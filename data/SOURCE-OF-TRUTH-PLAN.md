# Source-of-Truth → Per-Country Page Plan

> Built from the brochures in `source of truth/` (parsed 2026-06-14). Goal: **1 page per country.**
> Prices are real DA (for the dev/owner). **GOVERNANCE — strip before publishing:** supplier name "AyaBooking"/"Aya Booking" + its phones/URLs, the **Commission** amounts, the B2B partner-agency clauses, the `<25 ans` restriction (owner-note only), and the **Sétif partner-agency contact** (05 Rue des frères Hebbache Sétif + 0550/0672/0770… numbers) that appears on the Istanbul & KL flyers — those are a reseller's, not Alliance Travel's. Visa/airport fees ("30$ à l'arrivée", "Gateway") → never shown as a price; hedge.

## Site structure decision — 5 country pages

| Country | New slug (recommended) | Replaces / status | Old slugs → 301 redirect |
|---|---|---|---|
| **Égypte** | `/egypte/` | consolidates **Caire & Sharm** + **Caire & Hurghada (NEW)** + **Sharm depuis Constantine** as selectable programs | `/cairo-sharm/`, `/sharm-constantine/` |
| **Azerbaïdjan** | `/azerbaidjan/` | **update** (new hotels/prices) | — |
| **Türkiye** | `/turquie/` | **update** (Istanbul = the city, on this country page) | `/istanbul/` |
| **Malaisie** | `/malaisie/` | **update** (dates are stale) | `/kuala-lumpur/` |
| **Tunisie** | `/tunisie/` | **NEW** — 3 destination groups (Hammamet / Sousse / Djerba), by bus | — |

> Alternative if you'd rather not merge Egypt: keep `/cairo-sharm/` + `/sharm-constantine/` and just add a `/caire-hurghada/`. Recommended path is one `/egypte/` page with a **program switcher** (Caire+Sharm / Caire+Hurghada / Sharm-Constantine), because they share Cairo + Red-Sea content and "1 page per country" was the ask. Each page maps to the existing 15-section trip template (`data/trips/SCHEMA.md`).

---

## 1 · ÉGYPTE — `/egypte/`  (3 programs, by plane)

### Program A — Caire & Hurghada *(NEW · `ALG-AH-CAIRE & HURGHADA…pdf`)*
- **Transport:** Air Algérie ALG↔CAI + bus Caire↔Hurghada. **Board:** All-Inclusive Soft (Hurghada) + petit-déj (Caire).
- **Hotels:** Hurghada = **Blend Club Aqua Resort 4★**; Caire = **Pyramisa Cairo & Suites 5★** (ou similaire).
- **Programs/dates (Juil–Août 2026):** 2N CAI+5N HRG+1N CAI (HRG01, 16/07); 6N HRG+2N CAI (HRG03 09/08, HRG06 29/08); 7N HRG+2N CAI (HRG02 02/08, HRG04 15/08, HRG05 22/08).
- **Prices /pers (DA):**

| Programme | Double | Triple | Single | 1er enf. 2-11.99 | 2e enf. 2-11.99 | Bébé 0-1.99 |
|---|---|---|---|---|---|---|
| 2N CAI+5N HRG+1N CAI / 6N HRG+2N CAI | 220 000 | 215 000 | 295 000 | 125 000 | 180 000 | 30 000 |
| 7N HRG + 2N CAI | 230 000 | 225 000 | 300 000 | 125 000 | 180 000 | 30 000 |

- **Inclus:** vol Air Algérie, transfert bus Caire↔Hurghada, transferts aéroport, AI Soft Hurghada + petit-déj Caire, lettre de garantie visa, excursions Caire (Pyramides/Sphinx, Khan El Khalili, Mosquée Al-Azhar & Hussein, dîner-croisière Nil), Hurghada plage + **sortie Marina incluse**.
- **En option/extra:** Nouveau Musée Égyptien (option); visa "30$ à l'arrivée au Caire" → *hedge, ne pas afficher comme tarif*.

### Program B — Caire & Sharm *(existing site data + `ALG-MS-CAIRE & SHARM…2.pdf`, `ALG-MS-CAI+SSH JUIN 2026.pdf` — reparse to refresh)*
- Existing page `cairo-sharm` already has 7 hotels (Tivoli/Verginia/Rehana 4★, Rehana Royal/Charmillion/Cleopatra/Pickalbatros 5★), EgyptAir, 2N Caire + 5N Sharm, AI Soft. **Action:** verify against the 2 MS brochures, fold in as Program B.

### Program C — Sharm depuis Constantine *(existing `sharm-constantine` + `SHARM EL SHEIKH CONSTANTINE TK ÉTÉ 2026…pdf` — reparse)*
- Turkish Airlines from Constantine, 10j/8n AI. **Action:** refresh dates/hotels from the ÉTÉ 2026 brochure, fold in as Program C.

> ⏳ **Pending parse (agent reset):** the 2 Caire&Sharm MS PDFs + the Sharm-Constantine ÉTÉ PDF + the 2 CHARTER PDFs (Hurghada charter, Sharm charter) — to confirm B/C prices/dates and decide if the charters are separate offers.

---

## 2 · AZERBAÏDJAN — `/azerbaidjan/`  *(`AZERBAIDJAN ETE 2026.pdf` — UPDATE current page)*
- **Transport:** Turkish Airlines via Istanbul; **visa électronique inclus.** 7N/8J, petit-déj.
- **Hotels:** 5N Bakou = **Hilton Garden Inn Baku 4★**; 2N Gabala = **Yengice Thermal Hotel 5★**.  *(current site has "Parkside Baku" — replace with Hilton Garden Inn.)*
- **11 départs (Jul–Sep 2026):** G1 03–11 Jul · G2 10–18 · G3 17–25 · G4 24Jul–01Aug · G5 31Jul–08Aug · G6 07–15Aug · G7 14–22 · G8 21–29 · G9 28Aug–05Sep · G10 04–12Sep · G11 10–18Sep.
- **Prices (DZD):** Triple **245 000** · Double **249 900** · Single **311 000** · enfant −5 ans (2 ad.) **129 000** · enfant −12 ans (2 ad., extra bed inc) **213 000** · nouveau-né **35 000**.
- **Inclus:** vols TK, visa élec., transferts aéroport + bus, 7N petit-déj, guide arabophone, accompagnateur, excursions Bakou (Vieille ville/Icherisheher, Maiden Tower, Palais Shirvanshahs, Heydar Aliyev Center, Bd/Little Venice, Flame Towers), **Gobustan**, **Sheki** (palais, caravansérail), **Shahdag** (téléphérique inclus), Gabala (Tufandag téléphérique, lac Nohur), **croisière mer Caspienne offerte (selon climat)**.

---

## 3 · TÜRKIYE — `/turquie/`  *(`ISTANBUL JUIN 26 26.pdf` — UPDATE current page)*
- **Transport:** Turkish Airlines **Constantine**↔Istanbul↔Constantine. 8J/7N, petit-déj. Visa **non inclus** (dossier au centre "Gateway" — ne pas afficher comme tarif).
- **4 départs Juin 2026:** 04–11 · 11–18 · 18–25 Juin · 25 Juin–02 Juil. *(refresh for autumn when next brochure lands.)*
- **Hotels & prices /pers (DA):**

| Hôtel | Double | Single | Enf. 6-12 (avec lit) | Enf. 2-5 (sans lit) | Bébé <2 |
|---|---|---|---|---|---|
| **River Hotel 3★** | 129 000 | 170 000 | 105 000 | 80 000 | 25 000 |
| **Özer Palace 4★** | 135 000 | 175 000 | 110 000 | 80 000 | 25 000 |
| **Alpin Due 4★** | 137 000 | 180 000 | 115 000 | 80 000 | 25 000 |
| **Tilia Hôtel 4★** | 142 000 | 189 000 | 115 000 | 85 000 | 25 000 |

- **Programme (4 jours d'excursions):** J2 city tour (Mosquée Bleue, Sainte-Sophie, Grand Bazar); J3 croisière mer de Marmara + îles des Princes + déjeuner; J4 Ortaköy + Mall Florya (aquarium) + Olivium; J5 côté asiatique (Palais Beylerbeyi, Tour de Léandre, Üsküdar, Çamlıca, Mall Venezia); J6–J7 libres; J8 retour. *(matches current site — confirm hotels unchanged.)*

---

## 4 · MALAISIE — `/malaisie/`  *(`KUALA LUMPUR VMALAISIE .docx` — UPDATE, dates stale)*
- **Transport:** Air Algérie **vol direct** ALG↔Kuala Lumpur. 8J/7N, petit-déj.
- **Hotel:** **Grand Mercure KL 5★** (single hotel).
- **Dates in brochure (PAST — Mar/Apr/May 2026):** 29Mar–06Avr · 24Avr–02Mai · 22–30Mai. → **needs new dates** (current site already pushed to Sep–Nov; keep that until a new brochure).
- **Prices /pers (DA):** Adulte double/twin **211 000** · single **284 000** · bébé 0-2 **25 000** · CHILD sans lit **148 000** · CHILD avec extra bed **200 000**.
- **Programme:** City Tour KL, Petronas, Batu Caves, Genting Highlands (téléphérique inclus); options Aquaria KLCC, Palais royal, Monument national, Mosquée Negara, Sunway Lagoon, A'Famosa Safari, Putrajaya.
- **Non inclus:** repas non mentionnés; **taxe touristique ~20 USD payée à l'hôtel** (hedge "selon arrêté malaisien").

---

## 5 · TUNISIE — `/tunisie/`  *(NEW page · 19 brochures · all by BUS via poste-frontière Bouchabka)*
**Common template (every Tunisia offer — AyaBooking):** par **bus** (le tarif inclut 8 000 DA de transport bus), **6 nuits**, **demi-pension (DP)** buffet, guide, piscines int/ext, plage privée, animation, wifi. **Excursions:** visite ville + Hammamet gratuit (Carthage Land en extra); **en extra:** bateau/Sidi Bou Saïd (25–30 DT), catamaran/jet-ski/parachute/yacht. **Conditions publiques:** acompte non remboursable, assurance voyage obligatoire, **taxe de séjour 3 DT/nuit à l'hôtel**, quittance passeport obligatoire, certains hôtels **n'acceptent pas les célibataires**, min. 20 participants. Departures from **Alger (ALG)** and **Oran (OREN)**; example dates 13–20 / 16–23 Juin 2026 (per file).

### Page structure: hotel-picker grouped by 3 destinations
| Destination | Hotels (one per source file) | Example price (Double, DA) |
|---|---|---|
| **Hammamet** (6 files) | **Hôtel Yasmine Beach 4★** *(extracted)* + 5 more (HAMMAMET 2–6 — ⏳ parse) | 40 000 (4★) |
| **Sousse** (7 files: ALG×4 + OREN×3) | **Royal Beach 3★** *(extracted, ALG1)* + 6 more (Sousse ALG2-4, OREN2-4 — ⏳ parse) | 36 000 (3★) |
| **Djerba** (6 files: DJERBA 1,3,4,5,6 + GJERBA 2) | ⏳ parse (6 hotels) | ~ TBD |

**Tunisia price pattern (verified on 2 files):**
- Hammamet/Yasmine Beach 4★: single 57 000 · double 40 000 · triple/quad 37 500 · 1er enf <4 (2ad) GRATUIT→5 000 · 2e enf 2-11.99 (2ad) 24 000 · enf en chambre séparée/1 ad. 80 000 · bébé <1 5 000 · supp siège bébé 8 000.
- Sousse/Royal Beach 3★: single 48 000 · double 36 000 · triple/quad 34 500 · 1er enf <6 (2ad) 8 000 · enf <12 (2ad) 27 000 · enf 1-12 (1 ad.) 36 000 · bébé <1 8 000.

> ⏳ **Pending parse (16 Tunisia files):** HAMMAMET 2-6, SOUSSE ALG 2-4 + OREN 2-4, DJERBA 1,3,4,5,6, GJERBA 2 — each = one hotel on the identical template. Re-run the `parse-source-of-truth` workflow (per-city agents) when the session limit resets (≈16:00 London) to fill the hotel name + tariff table for each; structure above is ready to receive them.

---

## ACTION PLAN (build order)

1. **Egypte page** — build `/egypte/` from the 15-section schema with a **3-program switcher** (A Caire&Hurghada NEW · B Caire&Sharm · C Sharm-Constantine). Add the Blend Club 4★ + Pyramisa 5★ hotels & the 2 price grids above. 301 the old slugs.
2. **Azerbaïdjan** — swap Parkside → **Hilton Garden Inn Baku 4★**, update the 6-key prices (Double 249 900 …), refresh the 11 Jul–Sep départs, confirm visa-inclus.
3. **Türkiye** (`/turquie/`) — confirm the 4 hotels/prices unchanged; refresh départs; strip the Sétif contact from any imported copy.
4. **Malaisie** (`/malaisie/`) — keep Grand Mercure + prices; keep future dates (brochure dates are past); hedge the 20 USD tax.
5. **Tunisie** (`/tunisie/`) — NEW page: 3-destination hotel picker (Hammamet/Sousse/Djerba), bus template (DP, 6N, 8 000 DA bus included), calculator with the child tiers above. Heroes already exist (`heroes-v2/hero__tunisie--*`). Finish the 16-hotel parse first.
6. **Globe/nav/sitemap** — already has Tunisie/Hurghada/Djerba markers; add `/tunisie/` to nav + sitemap; wire the 301s.

**Governance pass before publish:** strip commission, AyaBooking/supplier names, B2B clauses, the Sétif reseller contact, `<25 ans` note; convert every "fee/30$/20 USD/tax" mention to a hedged public line; never claim partnership.

---
*Files parsed this pass: Caire&Hurghada, Azerbaidjan ETE, Istanbul Juin, Kuala Lumpur (docx), Hammamet 1, Sousse ALG1. Remaining: 2 Caire&Sharm MS, Sharm-Constantine ÉTÉ, 2 Charters, Hammamet 2-6, Sousse ALG2-4/OREN2-4, Djerba×6 — listed above, ready for the delegated parse.*
