# Visa Page — Map Data + Asset Inventory
**Researched:** 2026-06-03
**Researcher:** Claude (data only — no code touched)
**Scope:** Embassy + visa-service-center locations in Algeria for 10 destination countries, flag SVG sources, and a logo-wall trademark decision matrix.

> **Important freshness note**
> The single most material change since most travel blogs were written: **France visa applications in Algeria moved from VFS Global + TLScontact to Capago International on 8 April 2025.** All four French-visa rows below reflect Capago, not VFS/TLS. Sources: [Algerie 360 — Capago opens 8 April](https://www.algerie360.com/visa-pour-la-france-capago-annonce-louverture-de-ses-centres-dans-ces-wilayas/), [Consulat de France à Alger — official notice](https://alger.consulfrance.org/Visas-Changement-de-prestataire-exterieur-et-recuperation-des-passeports), [Capago official site fr-dz.capago.eu](https://fr-dz.capago.eu/).

---

## Part 1 — Embassy + Service Center Locations

All coordinates are in MapLibre `[lng, lat]` order. "Verified" = confirmed against the entity's own published page or Google Maps. "Approx" = address is verified from official source but the precise pin needs Google Maps fine-tuning before going live (off by ≤ 200 m typically).

### 1.1 France — Capago (sole provider since 8 Apr 2025)

| Field | Value |
|---|---|
| Provider | **Capago International** (replaced both VFS Global France + TLScontact) |
| Function | Full visa application: appointment booking, biometrics, dossier collection, passport return |
| Phone | 0982 300 200 (Sun–Thu, 09:00–17:00) |
| Email | infofrance-dz@capago.eu |
| Official URL | https://fr-dz.capago.eu/ |
| Decision authority | French Consulates General (Alger / Oran / Annaba) — Capago is the receiving agent only |

Four centers (Alger, Oran, Annaba, Constantine):
- **Alger** — Route nationale 24, Pins Maritimes, Commune de Mohammadia, Wilaya d'Alger
- **Oran** — Les Pyramides, Résidence Les Aurès, Tour d'affaires USTO, Bir El Djir 31000, Oran
- **Annaba** — Section 21, Îlot de propriété n°16, Lots N°129 et 130, Annaba 23000
- **Constantine** — Zone Boussouf, Lot 46, Lotissement Cirta, Bâtiment 1, Constantine 25019

Coordinates are approx — verify before publishing.

Source: [Capago official](https://fr-dz.capago.eu/), [Alger consulate](https://alger.consulfrance.org/Visas-Changement-de-prestataire-exterieur-et-recuperation-des-passeports), [Algerie360](https://www.algerie360.com/visa-pour-la-france-capago-annonce-louverture-de-ses-centres-dans-ces-wilayas/)

### 1.2 Türkiye — Embassy of Türkiye (Algiers)

| Field | Value |
|---|---|
| Entity | Ambassade de la République de Türkiye |
| Function | Full consular section — visa applications direct (Türkiye has no outsourced provider in Algeria; biometrics + decision at embassy) |
| Address | 21, Villa Dar el-Ouard, Chemin de la Rochelle, Boulevard Colonel Bougara, El Biar, Alger 16000 |
| Coordinates | `[3.0405638, 36.7605773]` — verified |
| Phone | +213 23 48 72 89 / 90 |
| Official URL | https://cezayir.be.mfa.gov.tr/ |

> Algerian passport-holders can apply for many Turkish visa categories online via [e-Visa portal](https://www.evisa.gov.tr/). Embassy walk-in is only required for non-eligible categories or long-stay residence-type visas.

Source: [embassies.info — Turkish embassy Algiers](https://embassies.info/TurkishEmbassyinAlgiersAlgeria), [turkish-embassy.net](https://www.turkish-embassy.net/elcilik/Turkey-in-Algiers)

### 1.3 Germany — Embassy + VFS Global

| Field | Value |
|---|---|
| Decision authority | Embassy of Germany in Algiers — handles only the legal decision; **no walk-in collection** |
| Receiving agent | **VFS Global Germany** — biometrics + dossier collection |
| VFS address | VFS Global Services Algeria, 46 Lot. Petite Provence, Sidi Yahia, Hydra, Alger 16035 |
| VFS coordinates | `[3.0451, 36.7416]` — approx (Sidi Yahia / Hydra) |
| Embassy address | 165, Chemin Sfindja, Alger |
| Embassy URL | https://algier.diplo.de/ |
| VFS URL | https://visa.vfsglobal.com/dza/en/deu |

Source: [VFS Global Germany / Algeria](https://visa.vfsglobal.com/dza/en/deu), [Pagesmaghreb VFS Global Algeria listing](https://www.pagesmaghreb.com/entreprise/vfs-global-services-algeria-411273/alger-4/algerie), [German embassy Algiers](https://algier.diplo.de/)

### 1.4 Spain — Embassy + BLS International

| Field | Value |
|---|---|
| Decision authority | Consulado General de España en Argel & Oran |
| Receiving agent | **BLS International** — full appointment + biometrics + collection |
| BLS Algiers | Coopérative Mohamed Boudiaf N°13, Hydra, Alger |
| BLS Algiers coords | `[3.0489, 36.7458]` — approx (Hydra) |
| BLS Algiers phone | +213 21 99 40 60 |
| BLS Oran | 104 Rue Salah Eddine el Ayoubi, Point du Jour, Oran |
| BLS Oran coords | `[-0.6363, 35.6976]` — approx |
| Email | info.alg@blshelpline.com (Algiers) / info.orn@blshelpline.com (Oran) |
| Official URL | https://algeria.blsspainvisa.com/ |
| Jurisdictions | Oran serves western wilayas (Adrar, Chlef, Béchar, Tlemcen, Tiaret, Saïda, Sidi Bel-Abbes, Mostaganem, Mascara, Oran, El Bayadh, Tissemsilt, Naâma, Aïn Témouchent, Relizane). Algiers serves the rest. |

Source: [BLS Spain Algeria — Algiers](https://algeria.blsspainvisa.com/algiers/french/contact.php), [BLS Spain Algeria — Oran](https://algeria.blsspainvisa.com/oran/contact.php)

### 1.5 China — Chinese Visa Application Service Center (CVASC)

| Field | Value |
|---|---|
| Entity | Centre de Service de Visa Chinois (CVASC) — operated by VFS Global under PRC mandate |
| Function | Full visa processing — appointment, dossier, biometrics, passport return |
| Address | Cité Houidef Bouteldja N°1, Ben Aknoun, Alger |
| Coordinates | `[3.0125, 36.7585]` — approx (Ben Aknoun) |
| Phone | +213 23 38 15 22 |
| Email | algierscentre@visaforchina.org |
| Official URL | https://bio.visaforchina.org/ALG2_EN/ |
| Embassy (decision authority) | 34, Boulevard des Martyrs, El Mouradia, Alger — `[3.0425182, 36.7535686]` — verified |
| Embassy URL | https://dz.china-embassy.gov.cn/ |
| Note | Building also houses the Canada VAC (different floor) — co-located VFS Global complex |

Source: [VFS Global China Algeria press release](https://www.vfsglobal.com/en/PDF/media-releases/2017/Press-Release-China-in-Algeria.pdf), [CVASC About Us](https://bio.visaforchina.org/ALG2_EN/aboutus/266121.shtml), [Chinese embassy Algeria](https://dz.china-embassy.gov.cn/fra/)

### 1.6 Russia — Russian Embassy (Algiers)

| Field | Value |
|---|---|
| Entity | Ambassade de la Fédération de Russie |
| Function | Full consular section — visa direct (no outsourced provider in Algeria) |
| Address | 7, Chemin du Prince d'Annam, El-Biar, Alger |
| Coordinates | `[3.0339, 36.7641]` — approx (El-Biar) |
| Phone | +213 21 92 26 14 |
| Email | ambassaderussie@yandex.com |
| Official URL | https://algeria.mid.ru/ |

Source: [Russia MFA — Algeria](https://special.mid.ru/en/maps/dz), [embassypages — Russia Algiers](https://www.embassypages.com/russia-embassy-algiers-algeria)

### 1.7 Egypt — Egyptian Embassy (Algiers)

| Field | Value |
|---|---|
| Entity | Ambassade de la République arabe d'Égypte |
| Function | Full consular section — visa direct |
| Address | 8 Chemin Abdelkader Gadouche, Hydra, Alger |
| Coordinates | `[3.0467, 36.7444]` — approx (Hydra) |
| Phone | +213 21 69 18 07 / 69 16 73 |
| Email | embassy.algeria@mfa.gov.eg |
| Official URL | https://www.mfa.gov.eg/embassies/egyptian_embassy_algeria_algiers/Default.aspx |

> Note: Algerian nationals may also be eligible for Egypt's e-visa at [visa2egypt.gov.eg](https://visa2egypt.gov.eg/). Confirm category before referring a client to the embassy.

Source: [Egypt MFA embassy Algeria](https://www.egyptembassy.org/location/algeria/egypt-embassy-algiers/)

### 1.8 Saudi Arabia — Embassy + Tasheel (Umrah/Hajj)

| Field | Value |
|---|---|
| Entity (work / official visas) | Embassy of the Kingdom of Saudi Arabia |
| Address | 5 Chemin Doudou Mokhtar, Ben Aknoun, Alger |
| Coordinates | `[3.0149271, 36.7507703]` — **verified** |
| Phone | +213 23 23 84 29 / 42 |
| Email | dzemb@mofa.gov.sa |
| Hours | Sun–Thu 08:30–15:00 |
| Umrah pilgrims | **Nusuk** e-visa platform — fully online, no embassy walk-in. https://www.nusuk.sa/ |
| Tourist visas | **Saudi eVisa** — https://visa.visitsaudi.com/ |
| Tasheel / Enjazat | Used **inside Saudi Arabia** for work-permit / iqama processing, not as a visa intake point in Algeria. **Do not list as an Algerian center.** |

Source: [embassies.net — Saudi embassy Algiers](https://embassies.net/saudi-arabia-in-algeria/algiers), [Nusuk official](https://www.nusuk.sa/), [Saudi eVisa](https://visa.visitsaudi.com/)

### 1.9 USA — US Embassy Algiers (Consular Section)

| Field | Value |
|---|---|
| Entity | Embassy of the United States of America — Consular Section (visa unit) |
| Function | Non-immigrant + immigrant visas — interview + processing at embassy. No separate OFC (Off-site Facilitation Center) in Algeria; biometric capture handled in-house. |
| Address | 5 Chemin Cheikh Bachir Ibrahimi, El-Biar 16030, Alger |
| Coordinates | `[3.0416653, 36.7547454]` — verified |
| Phone (visa info) | +213 982 312 412 |
| Email (NIV) | support-Algeria@usvisascheduling.com |
| Email (IV/DV) | IV-DVAlgiers@state.gov |
| Official URL | https://dz.usembassy.gov/visas/ |

Source: [travel.state.gov — Algiers post](https://travel.state.gov/content/travel/en/us-visas/Supplements/Supplements_by_Post/ALG-Algiers.html), [US Embassy Algeria](https://dz.usembassy.gov/)

### 1.10 Canada — Embassy + VAC

| Field | Value |
|---|---|
| Decision authority | Embassy of Canada (immigration officers) — most decisions actually made by IRCC visa offices abroad (Paris / Vienna / Rome / Dakar depending on case type) |
| Receiving agent | **VFS Global Canada Visa Application Centre (VAC)** — biometrics + dossier collection only, no decisions |
| Embassy address | 18 Avenue Mustapha Khalef, Ben Aknoun, Alger |
| Embassy coords | `[3.0171605, 36.761142]` — verified |
| VAC address | Cité Houidef Bouteldja, 3rd floor, N°1, Ben Aknoun, Alger (moved here 13 Oct 2024) |
| VAC coords | `[3.0125, 36.7585]` — approx (same complex as CVASC) |
| Embassy phone | +213 770 08 3000 |
| Embassy email | algercs@international.gc.ca |
| VAC URL | https://visa.vfsglobal.com/dza/en/can |
| Embassy URL | https://www.international.gc.ca/country-pays/algeria-algerie/algiers-alger.aspx |

> **Routing flag:** Some Canadian work-permit / study-permit dossiers are processed by the IRCC visa office in Paris or Dakar even though biometrics happen in Algiers. The agency-facing copy should say "biometrics in Algiers, decision may be issued in Paris or Dakar depending on dossier type" rather than promising local decisions.

Source: [VFS Canada / Algeria](https://visa.vfsglobal.com/dza/en/can), [Canada-Algeria bilateral page](https://www.international.gc.ca/country-pays/algeria-algerie/algiers-alger.aspx?lang=eng), [VFS Global X post — Oct 2024 move](https://x.com/VFSGlobal/status/1844311109735678096)

---

### Structured JSON for the JS map (paste-ready)

```js
// site/assets/js/visa-map.js
// All coordinates are [lng, lat] (MapLibre order, NOT [lat, lng]).
// Verified vs approx: see `verified: true|false`. Approx pins should
// be fine-tuned against Google Maps Street View before go-live.
const VISA_LOCATIONS = [
  /* ───── FRANCE — Capago (replaced VFS+TLS on 8 Apr 2025) ───── */
  {
    id: 'fr-capago-alger',
    country: 'FR', countryName: 'France',
    entity: 'Capago — Centre Officiel Visa France',
    role: 'full visa processing',
    address: 'Route nationale 24, Pins Maritimes, Mohammadia',
    city: 'Alger',
    loc: [3.1817, 36.7261],  // approx — verify
    phone: '0982 300 200',
    url: 'https://fr-dz.capago.eu/',
    verified: false,
    primary: true
  },
  {
    id: 'fr-capago-oran',
    country: 'FR', countryName: 'France',
    entity: 'Capago Oran',
    role: 'full visa processing',
    address: 'Tour USTO, Résidence Les Aurès, Bir El Djir',
    city: 'Oran',
    loc: [-0.5961, 35.7039],  // approx — verify
    phone: '0982 300 200',
    url: 'https://fr-dz.capago.eu/',
    verified: false
  },
  {
    id: 'fr-capago-annaba',
    country: 'FR', countryName: 'France',
    entity: 'Capago Annaba',
    role: 'full visa processing',
    address: 'Section 21, Îlot 16, Lots 129 & 130',
    city: 'Annaba',
    loc: [7.7667, 36.9000],  // approx — verify
    phone: '0982 300 200',
    url: 'https://fr-dz.capago.eu/',
    verified: false
  },
  {
    id: 'fr-capago-constantine',
    country: 'FR', countryName: 'France',
    entity: 'Capago Constantine',
    role: 'full visa processing',
    address: 'Zone Boussouf, Lot 46, Lotissement Cirta, Bâtiment 1',
    city: 'Constantine',
    loc: [6.6019, 36.3650],  // approx — verify
    phone: '0982 300 200',
    url: 'https://fr-dz.capago.eu/',
    verified: false
  },

  /* ───── TÜRKİYE — Embassy (no outsourced provider) ───── */
  {
    id: 'tr-embassy-alger',
    country: 'TR', countryName: 'Türkiye',
    entity: 'Ambassade de Türkiye',
    role: 'consular section + visa',
    address: '21, Villa Dar el-Ouard, Bd Colonel Bougara, El Biar',
    city: 'Alger',
    loc: [3.0405638, 36.7605773],
    phone: '+213 23 48 72 89',
    url: 'https://cezayir.be.mfa.gov.tr/',
    verified: true,
    primary: true,
    note: 'Most categories eligible for e-Visa: evisa.gov.tr'
  },

  /* ───── GERMANY — Embassy + VFS ───── */
  {
    id: 'de-vfs-alger',
    country: 'DE', countryName: 'Allemagne',
    entity: 'VFS Global Germany',
    role: 'biometric + visa submission',
    address: '46 Lot. Petite Provence, Sidi Yahia, Hydra',
    city: 'Alger',
    loc: [3.0451, 36.7416],  // approx
    phone: null,
    url: 'https://visa.vfsglobal.com/dza/en/deu',
    verified: false,
    primary: true
  },
  {
    id: 'de-embassy-alger',
    country: 'DE', countryName: 'Allemagne',
    entity: 'Ambassade d\'Allemagne',
    role: 'decision authority only',
    address: '165, Chemin Sfindja',
    city: 'Alger',
    loc: [3.0500, 36.7547],  // approx
    phone: null,
    url: 'https://algier.diplo.de/',
    verified: false
  },

  /* ───── SPAIN — Consulates + BLS ───── */
  {
    id: 'es-bls-alger',
    country: 'ES', countryName: 'Espagne',
    entity: 'BLS International — Espagne',
    role: 'biometric + visa submission',
    address: 'Coopérative Mohamed Boudiaf N°13, Hydra',
    city: 'Alger',
    loc: [3.0489, 36.7458],  // approx
    phone: '+213 21 99 40 60',
    url: 'https://algeria.blsspainvisa.com/',
    verified: false,
    primary: true
  },
  {
    id: 'es-bls-oran',
    country: 'ES', countryName: 'Espagne',
    entity: 'BLS International — Espagne (Oran)',
    role: 'biometric + visa submission',
    address: '104 Rue Salah Eddine el Ayoubi, Point du Jour',
    city: 'Oran',
    loc: [-0.6363, 35.6976],  // approx
    phone: null,
    url: 'https://algeria.blsspainvisa.com/oran/',
    verified: false
  },

  /* ───── CHINA — Embassy + CVASC ───── */
  {
    id: 'cn-cvasc-alger',
    country: 'CN', countryName: 'Chine',
    entity: 'CVASC — Centre de Service de Visa Chinois',
    role: 'full visa processing',
    address: 'Cité Houidef Bouteldja N°1, Ben Aknoun',
    city: 'Alger',
    loc: [3.0125, 36.7585],  // approx
    phone: '+213 23 38 15 22',
    url: 'https://bio.visaforchina.org/ALG2_EN/',
    verified: false,
    primary: true
  },
  {
    id: 'cn-embassy-alger',
    country: 'CN', countryName: 'Chine',
    entity: 'Ambassade de Chine',
    role: 'decision authority',
    address: '34 Boulevard des Martyrs, El Mouradia',
    city: 'Alger',
    loc: [3.0425182, 36.7535686],
    phone: '+213 21 69 29 62',
    url: 'https://dz.china-embassy.gov.cn/',
    verified: true
  },

  /* ───── RUSSIA — Embassy direct ───── */
  {
    id: 'ru-embassy-alger',
    country: 'RU', countryName: 'Russie',
    entity: 'Ambassade de Russie',
    role: 'consular section + visa',
    address: '7, Chemin du Prince d\'Annam, El-Biar',
    city: 'Alger',
    loc: [3.0339, 36.7641],  // approx
    phone: '+213 21 92 26 14',
    url: 'https://algeria.mid.ru/',
    verified: false,
    primary: true
  },

  /* ───── EGYPT — Embassy direct ───── */
  {
    id: 'eg-embassy-alger',
    country: 'EG', countryName: 'Égypte',
    entity: 'Ambassade d\'Égypte',
    role: 'consular section + visa',
    address: '8, Chemin Abdelkader Gadouche, Hydra',
    city: 'Alger',
    loc: [3.0467, 36.7444],  // approx
    phone: '+213 21 69 18 07',
    url: 'https://www.mfa.gov.eg/embassies/egyptian_embassy_algeria_algiers/',
    verified: false,
    primary: true,
    note: 'e-Visa available at visa2egypt.gov.eg for eligible categories'
  },

  /* ───── SAUDI ARABIA — Embassy + Nusuk (Umrah online) ───── */
  {
    id: 'sa-embassy-alger',
    country: 'SA', countryName: 'Arabie saoudite',
    entity: 'Ambassade d\'Arabie saoudite',
    role: 'consular section + work/official visas',
    address: '5, Chemin Doudou Mokhtar, Ben Aknoun',
    city: 'Alger',
    loc: [3.0149271, 36.7507703],
    phone: '+213 23 23 84 29',
    url: 'https://www.embassies.mofa.gov.sa/sites/Algeria/',
    verified: true,
    primary: true,
    note: 'Umrah pilgrims: Nusuk e-visa (nusuk.sa). Tourist: visa.visitsaudi.com. No Tasheel/Enjazat intake centre in Algeria.'
  },

  /* ───── USA — Embassy (no separate OFC) ───── */
  {
    id: 'us-embassy-alger',
    country: 'US', countryName: 'États-Unis',
    entity: 'US Embassy — Consular Section',
    role: 'full visa processing (NIV + IV)',
    address: '5, Chemin Cheikh Bachir Ibrahimi, El-Biar 16030',
    city: 'Alger',
    loc: [3.0416653, 36.7547454],
    phone: '+213 982 312 412',
    url: 'https://dz.usembassy.gov/visas/',
    verified: true,
    primary: true
  },

  /* ───── CANADA — Embassy + VAC ───── */
  {
    id: 'ca-vac-alger',
    country: 'CA', countryName: 'Canada',
    entity: 'VFS Global — Canada VAC',
    role: 'biometric + visa submission',
    address: 'Cité Houidef Bouteldja, 3e étage, N°1, Ben Aknoun',
    city: 'Alger',
    loc: [3.0125, 36.7585],  // approx — same complex as CVASC
    phone: null,
    url: 'https://visa.vfsglobal.com/dza/en/can',
    verified: false,
    primary: true,
    note: 'Decisions may be issued by IRCC offices in Paris or Dakar — biometrics only here'
  },
  {
    id: 'ca-embassy-alger',
    country: 'CA', countryName: 'Canada',
    entity: 'Ambassade du Canada',
    role: 'consular section',
    address: '18, Avenue Mustapha Khalef, Ben Aknoun',
    city: 'Alger',
    loc: [3.0171605, 36.761142],
    phone: '+213 770 08 3000',
    url: 'https://www.international.gc.ca/country-pays/algeria-algerie/algiers-alger.aspx',
    verified: true
  }
];
```

---

## Part 2 — Flag Assets

**Recommended source:** `lipis/flag-icons` — the canonical free SVG country-flag library.
**License:** MIT (verified: https://github.com/lipis/flag-icons/blob/main/LICENSE) — permits commercial use, modification, redistribution. **No attribution required** when bundled with the site (the MIT licence permits removing the attribution line from end-user-facing surfaces as long as it remains in the LICENSE/source-tree). Keep the LICENSE file in `site/assets/images/flags/` alongside the SVGs to stay clean.
**Format:** 4:3 SVG (the library's `flags/4x3/` folder) — matches typical flag aspect, scales infinitely, ~3–8 KB per flag.

**Hosting recommendation:** **Local copy** in `site/assets/images/flags/`. Reasons:
1. Performance — no CDN round-trip on page paint; flags are usually above the fold in a country-grid section.
2. Offline / weak-network resilience — the site already has an offline-aware reputation (algeria-map fallback pattern).
3. Caching freedom — same long-cache headers as the rest of the static assets.
4. Privacy — no third-party CDN logs the visitor's request.

| Country | ISO 3166-1 alpha-2 | Source URL | Filename | License |
|---|---|---|---|---|
| Algeria (agency hub) | dz | https://flagicons.lipis.dev/flags/4x3/dz.svg | dz.svg | MIT |
| France | fr | https://flagicons.lipis.dev/flags/4x3/fr.svg | fr.svg | MIT |
| Türkiye | tr | https://flagicons.lipis.dev/flags/4x3/tr.svg | tr.svg | MIT |
| Germany | de | https://flagicons.lipis.dev/flags/4x3/de.svg | de.svg | MIT |
| Spain | es | https://flagicons.lipis.dev/flags/4x3/es.svg | es.svg | MIT |
| China | cn | https://flagicons.lipis.dev/flags/4x3/cn.svg | cn.svg | MIT |
| Russia | ru | https://flagicons.lipis.dev/flags/4x3/ru.svg | ru.svg | MIT |
| Egypt | eg | https://flagicons.lipis.dev/flags/4x3/eg.svg | eg.svg | MIT |
| Saudi Arabia | sa | https://flagicons.lipis.dev/flags/4x3/sa.svg | sa.svg | MIT |
| USA | us | https://flagicons.lipis.dev/flags/4x3/us.svg | us.svg | MIT |
| Canada | ca | https://flagicons.lipis.dev/flags/4x3/ca.svg | ca.svg | MIT |

**Bulk download command (for the developer who picks this up):**
```bash
mkdir -p site/assets/images/flags
for code in dz fr tr de es cn ru eg sa us ca; do
  curl -sLo "site/assets/images/flags/${code}.svg" \
    "https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${code}.svg"
done
curl -sLo site/assets/images/flags/LICENSE \
  https://raw.githubusercontent.com/lipis/flag-icons/main/LICENSE
```

> Saudi Arabia caveat: the SA flag contains the shahada (Islamic declaration of faith). **It must never be rotated, flipped, displayed at half-mast, or printed on disposable/promotional items** under Saudi protocol convention. For a country-grid on a web page, displaying the flag right-side-up at standard aspect is fine and is the standard practice (Saudi embassies themselves do this). Just don't let a designer get creative with rotations on the SA flag.

---

## Part 3 — Logo Wall Decision Matrix

The general legal framework:

1. **Nominative fair use** (recognized in French, EU, UK, US trademark law) permits using a third party's trademark to *factually identify* their products/services, provided: (a) you use no more of the mark than necessary, (b) you don't suggest sponsorship or endorsement, (c) you don't damage the mark. So "We process your file via [VFS Global logo]" is generally defensible. "Official partner of VFS Global" without a written partnership is not.
2. **State emblems and arms** are protected under a stricter regime — see Note 3.1 below — and should be replaced by the country **flag** which is public-domain everywhere.
3. **No press kit found in public search** for any of the visa-service-provider logos. Brandfetch / Logokit aggregate them but those sites scrape rather than license, so their downloads are not safe to use as a legal basis. The safest path is **either** to use the logo (relying on nominative fair use + disclaimer) **or** to ship a clean text badge — and the text badge is genuinely the lower-risk default for a travel agency that is not a contracted partner.

### 3.1 Why embassy seals / coats of arms are off-limits

| State | Restriction | Reference |
|---|---|---|
| France | The arms of the Republic (Marianne, RF monogram, "Liberté Égalité Fraternité" official lockup) are protected; unauthorized use of state seals/emblems can be prosecuted as usurpation. Most direct legal hook is the Loi du 18 mars 1918 prohibiting confusable reproduction of public stamps/seals. (Article 433-14 of the Penal Code specifically protects Red Cross / Geneva-Convention emblems — often miscited; the relevant state-emblem rules are older and broader.) | [Sénat — Marianne usage Q&A](https://www.senat.fr/questions/base/2002/qSEQ021104289.html), [Conseil constitutionnel — symbols](https://www.conseil-constitutionnel.fr/la-constitution/quels-sont-les-symboles-de-l-etat-prevus-par-la-constitution) |
| Germany, Spain, Italy, Russia, China, etc. | National arms are protected by domestic state-symbol laws (e.g. German *Bundeswappen* under §90a StGB, Spanish escudo under Real Decreto 2964/1981, Russian state emblem under Federal Constitutional Law 2-FKZ). Commercial use without state authorization is restricted in each. | Various national codes |
| Saudi Arabia | Royal arms (palm tree + crossed swords) are state insignia; their use is regulated under the Press and Publications Law. The shahada-bearing flag has its own protocol restrictions (see Part 2 note). | — |
| Türkiye | National emblem (crescent + star with stars around) and presidential seal are protected under Turkish Penal Code §299–301 family of provisions on state-symbol misuse. | — |
| USA / Canada | Federal seals (Great Seal of the US; Royal Arms of Canada) are protected under 18 U.S.C. §713 and the Trade-marks Act respectively. Civilian commercial use is prohibited. | [18 USC 713](https://www.law.cornell.edu/uscode/text/18/713) |

**Decision:** Do not show any embassy seal or national coat of arms. Show the country **flag** instead — public-domain everywhere, and they are the standard visual identifier for "this country" on travel sites globally.

### 3.2 Visa-service-provider logo decisions

| Entity | Trademark? | Logo source available? | Decision | Rationale | Text-only fallback (recommended copy) |
|---|---|---|---|---|---|
| **VFS Global** | Yes — VFS Global Group registered marks | No official partner press kit found; Brandfetch/Logokit are scrapes, not licences | ⚠️ With disclaimer if rendered as the official mark; ✅ as text badge | Nominative fair use defensible — "we deposit dossiers at VFS Global." Use as a factual reference, never as "partner". | **VFS Global** (white text on `--brand-ink` rounded badge) |
| **BLS International** | Yes — BLS International Services Ltd. (NSE: BLS) | No official partner kit found | ⚠️ With disclaimer; ✅ as text badge | Same nominative fair use; BLS is a publicly listed company with active trademark enforcement | **BLS International** badge |
| **TLScontact** | Yes — Teleperformance group | No official partner kit found | ❌ Do NOT use (no longer relevant for France in Algeria post-Apr 2025; only listing for legacy info) | Service was replaced by Capago in Algeria. Showing the logo now would mislead clients. | n/a — remove from any roster |
| **Capago International** | Yes — Capago SAS | No official partner kit found; logo visible on https://fr-dz.capago.eu/ header | ⚠️ With disclaimer; ✅ as text badge | This is now the **only** France visa receiver in Algeria. Important to name, but again nominative fair use only — Alliance Travel is not a contracted partner. | **Capago** badge (with mention "centre officiel visa France") |
| **CVASC** (Chinese Visa Application Service Center) | Operated by VFS Global under PRC Foreign Ministry mandate; uses PRC state insignia in its logo | No press kit | ❌ Do NOT use as image | The CVASC visual mark uses Chinese state seal elements + the official "中国签证申请服务中心" wordmark. Mixed-trademark risk. | **CVASC** wordmark only, no emblem |
| **Enjazat** (Saudi) | Yes — operator of work-visa platform; **operates inside Saudi Arabia only**, not in Algeria | No press kit | ❌ Do NOT use | Service is not present in Algeria — listing it would mislead. For Umrah, point to Nusuk; for tourist, point to visitsaudi.com. | Replace with **Nusuk** wordmark or "Visa électronique e-Saudi" |
| **Tasheel** (Saudi) | Trademark of Saudi labor / Ministry of HR & Social Development outsourced operator (Tasheel = "facilitation"); **inside KSA only** | No press kit | ❌ Do NOT use | Same as Enjazat — no Algerian intake centre. Mentioning it on the Algerian page is inaccurate. | Replace with same Nusuk / Saudi e-Visa text |
| **US OFC / Foreign Service** | US Department of State seal — federal-seal-protected | Restricted | ❌ Do NOT use | The Great Seal / DoS seal cannot be used by private commercial entities under 18 USC 713 | **US Embassy Algiers** as plain text — and let the US flag carry the visual |
| **Canada VAC** | Operated by VFS Global; VAC is functional label, not a separate brand | The "Canada Visa Application Centre" wordmark uses Canada-wordmark style which is government-controlled (Federal Identity Program) | ⚠️ Reference as plain text only; ❌ never replicate the Canada wordmark or maple-leaf federal logo | The Canada wordmark and maple leaf are protected under the Federal Identity Program. Saying "we deposit at the Canada Visa Application Centre" in plain text is fine. | **Centre VAC Canada** plain text |

### 3.3 Net recommendation

The safest, cleanest, and most likely-to-survive-legal-review configuration for the "trust strip" is:

1. **Country flags (lipis/flag-icons SVGs)** as the primary visual — one row of 10 flags, each captioned with the country name and a one-line "via [provider]" subtitle.
2. **Text-only badges** for provider names — same typography as the rest of the site, in a rounded pill with a 1-px border. No external logos to host, no IP risk to clear, no broken images if a brand updates their mark.
3. If the client absolutely wants logos: limit to **VFS Global, BLS International, Capago** — the three providers Alliance Travel actually transacts with — and pair every appearance with the Part 4 disclaimer microcopy.

This combination gives the page real visual identity (10 flags is iconic) without any of the trademark exposure of a logo wall.

---

## Part 4 — Recommended Disclaimer Microcopy (FR / EN / AR)

For the trust strip header (above the flag/badge row):

| Lang | Copy |
|---|---|
| FR | **Partenaires opérationnels** — nous déposons vos dossiers auprès de ces centres officiels. Les marques mentionnées appartiennent à leurs propriétaires respectifs. Alliance Travel n'est ni mandataire ni représentante exclusive de ces organismes. |
| EN | **Operational partners** — we submit your files to these official centers. All marks belong to their respective owners. Alliance Travel is neither an agent nor an exclusive representative of these entities. |
| AR | **شركاؤنا التشغيليون** — نقوم بإيداع ملفاتكم لدى هذه المراكز الرسمية. جميع العلامات التجارية تعود لأصحابها. أليانس ترافل ليست وكيلاً ولا ممثلاً حصرياً لهذه الجهات. |

For each individual provider badge, keep a single-sentence factual line directly below:

| FR | EN | AR |
|---|---|---|
| Capago — centre officiel des visas France en Algérie depuis le 8 avril 2025. | Capago — official France visa centre in Algeria since 8 April 2025. | كاباغو — المركز الرسمي لتأشيرات فرنسا في الجزائر منذ 8 أبريل 2025. |
| VFS Global — centre agréé pour les visas Allemagne, Canada (et d'autres pays). | VFS Global — accredited centre for Germany, Canada (and other) visas. | في إف إس غلوبال — مركز معتمد لتأشيرات ألمانيا وكندا (ودول أخرى). |
| BLS International — centre agréé pour les visas Espagne. | BLS International — accredited centre for Spain visas. | بي إل إس إنترناشيونال — مركز معتمد لتأشيرات إسبانيا. |

These wordings are **factual** ("centre officiel", "centre agréé") which is the standard nominative-fair-use vocabulary. Avoid: "partenaire officiel", "représentant agréé d'Alliance Travel", any wording that implies a written agency relationship.

---

## Part 5 — Open Questions for the User

1. **France routing for non-Alger residents.** Does Alliance Travel want to surface all four Capago centres (Alger, Oran, Annaba, Constantine) as separate map pins, or just Alger as the headline pin with the other three listed in text? Four pins clutter the Algiers cluster but reflect reality; one pin is cleaner.
2. **Map basemap zoom.** The existing `algeria-map.js` uses `cooperativeGestures: true` and a tight `maxBounds`. For the visa map all pins are in Algiers (mostly in El-Biar / Hydra / Ben Aknoun within a ~3 km radius) **plus** three out-of-Algiers Capago centres (Oran, Annaba, Constantine). Two viable approaches: (a) **two maps** — a national overview + an Algiers zoom, or (b) **one map** with the Algiers cluster as a stacked pin (the `data-stack-count` mechanism already exists in `algeria-map.js`). My recommendation is (b) — reuse the de-clutter engine that's already there.
3. **Coordinate precision.** The pins marked `verified: false` are accurate to the neighbourhood (Hydra / Ben Aknoun / El-Biar) but not the building. Should they be locked down via Google Maps Street View before launch? A 30-minute pass per pin would tighten all 12 approx coordinates. Worth doing because half the perceived value of an embassy map is "we know exactly where you have to go".
4. **TLScontact, Enjazat, Tasheel.** Confirm that none of these are part of the agency's roster anywhere. If the agency still mentions any of them in older brochures or on its current site, those references need to be removed to match this new page (TLS in particular — outdated since April 2025).
5. **Logo vs. text badge.** Final call between the two trust-strip styles (logos with disclaimer vs. flag-only + text). My strong recommendation is flag + text — but the visual mood is the user's call.
6. **Saudi Hajj quota partners.** If Alliance Travel handles Hajj (not just Umrah), there's a separate Algerian system: the **Office National du Hadj et de la Omra (ONHO)** allocates quota seats and the Saudi Hajj e-track requires registration through *agences agréées Hajj* — a different mechanism from Nusuk. Worth confirming whether the visa page should touch Hajj at all, or stay strictly visa-only.
7. **Egypt e-Visa coverage.** Algerian passport holders are eligible for the Egyptian e-Visa for tourist purposes — should the page steer users to the e-Visa portal rather than the embassy for those categories? It's a meaningful UX win if so.

---

*End of report. No code modified. All file/coordinate writes happened only in this markdown file.*
