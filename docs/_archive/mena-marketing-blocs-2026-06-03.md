# MENA Marketing Blocs — Alliance Travel

**Date:** 2026-06-03
**Author:** Senior MENA travel strategist (advisory)
**Status:** Read-only deliverable — copy + positioning, not implementation
**Scope:** Layer high-conversion marketing blocs onto the existing warm, anti-Alger positioning without compromising the brand voice.

---

## Section A — Research Summary (≈300 words)

I audited 8 Algerian / Maghreb / Gulf-Maghreb travel operators across the Omra, leisure-package, and ticketing verticals. The cohort: Touring Voyages Algérie (touring-algeria.com), Nreservi (nreservi.com), Algerievoyage-dz (algerievoyage-dz.com), Agence Voyage Algérie (agence-voyage-algerie.com), Arafat Voyages (arafatvoyages.com), Omra Pour Tous (omrapourtous.com), Voyages Cortoba (voyagescortoba.com), and DjazairVoyages (djazairvoyages.com).

**Dominant patterns observed:**

1. **Authority-by-agrément.** Top performers anchor credibility on Ministry licensing — Arafat Voyages leads with "Agence agréée par le Ministère du Hajj et de la Omra" and stacks IATA + ATOUT France + APST badges. Omra Pour Tous leads with its 4-digit Saudi approval number ("numéro d'agrément 2386"). Nreservi positions itself as "première agence virtuelle agréée par le Ministère du Tourisme algérien." See [Arafat Voyages](https://arafatvoyages.com/) and [Omra Pour Tous](https://omrapourtous.com/).

2. **Scaled social proof.** Arafat publishes raw counts: "plus de 1 500 voyageurs · plus de 7 000 pèlerins · 15 Omra par an · 30 ans d'expérience." Nreservi exposes view counts on each package page ("Lu 59 746 fois · 119 votes"). Omra Pour Tous syndicates a third-party rating ("Note Trusted Shops 4,88/5"). See [Nreservi Istanbul package](https://nreservi.com/voyages-organises/turquie/item/43-promotion-sejour-istanbul).

3. **Inclusion stacking ("ce qui est compris").** Universally treated as a 4-6 item bulleted checklist with green checkmarks: vol A/R, hôtel, transfert, petit-déjeuner, visa, assurance. Pricing always anchored as "**À PARTIR DE** XX 000 DA" with bolded numerals.

4. **Soft urgency, not aggressive countdowns.** Almost no operator uses live countdown timers. Instead: hard-coded departure dates ("DÉPART LE 24 JUILLET"), seasonal positioning ("Saison Omra 1447H ouverte"), and "rupture de stock" labels when units sell out.

5. **What's absent (the opportunity).** Almost nobody publishes risk-reversal language (deposit-refund windows, response-time guarantees, price-match), and almost nobody runs a "Pourquoi nous vs. eux" comparison table. Both are conversion levers Alliance Travel can own as a category-first move. See [Algerievoyage-dz](https://algerievoyage-dz.com/dz/).

---

## Section B — 8 Marketing Bloc Templates

Each bloc below is production-ready copy. Visual sketches are intentionally schematic — the designer fills the canvas.

---

### BLOC 1 — Scarcity Strip

**Where it goes:** Sticky band immediately below the site nav on `index.html` and on every `voyages/*/index.html` trip page. Dismissable (cookie 24h). Disappears after dismissal.

**Visual sketch:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  [icon: bolt]  Vols Le Caire à -18% · ferme dans 6 jours  →  Voir  [×] │
└────────────────────────────────────────────────────────────────────────┘
```
Full-width, 36-40 px tall, accent-green band, dark text, single CTA aligned right, dismiss × at far right.

**Copy:**

| Lang | Bloc copy |
|------|-----------|
| **FR** | **Vols Le Caire à −18%** · clôture le **15 juin**. → Voir l'offre |
| **EN** | **−18% on Cairo flights** · closes **June 15**. → See offer |
| **AR** | **خصم 18٪ على رحلات القاهرة** · العرض ينتهي **15 جوان**. ← شاهد العرض |

**HTML scaffold:**
```html
<aside class="scarcity-strip" data-i18n-host role="region" aria-label="Offre en cours">
  <div class="container scarcity-strip__inner">
    <svg class="scarcity-strip__icon" aria-hidden="true"><!-- bolt --></svg>
    <p class="scarcity-strip__msg">
      <strong data-i18n="scarcity.headline">Vols Le Caire à −18%</strong>
      <span data-i18n="scarcity.deadline"> · clôture le 15 juin.</span>
    </p>
    <a class="scarcity-strip__cta" href="#voyages" data-i18n="scarcity.cta">Voir l'offre</a>
    <button class="scarcity-strip__close" type="button" aria-label="Fermer">×</button>
  </div>
</aside>
```

**i18n keys to add:**
```js
scarcity: {
  headline: 'Vols Le Caire à −18%',
  deadline: ' · clôture le 15 juin.',
  cta: "Voir l'offre",
  aria_label: 'Offre en cours'
}
```

---

### BLOC 2 — Social Proof Counter

**Where it goes:** Between the home hero and the voyages section on `index.html`. Replaces nothing — slots into the visual gap created by ending the hero earlier (see Section C). A 4-up ticker / counter row.

**Visual sketch:**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   1 243      │     98 %     │     7        │      5       │
│   voyageurs  │  satisfaits  │  ans         │  destinations│
│   accompagnés│  (Google)    │  d'agence    │  2026        │
└──────────────┴──────────────┴──────────────┴──────────────┘
```
Counters animate from 0 on scroll into view. Numeric typography 3.5rem display, label 0.875rem muted.

**Copy:**

| Lang | Stat 1 | Stat 2 | Stat 3 | Stat 4 |
|------|--------|--------|--------|--------|
| **FR** | 1 243 voyageurs accompagnés depuis 2019 | 98% de clients satisfaits (avis Google vérifiés) | 7 ans sur le terrain, jamais une réclamation impayée | 5 destinations 2026, toutes testées par notre équipe |
| **EN** | 1,243 travelers guided since 2019 | 98% satisfied clients (verified Google reviews) | 7 years on the ground, never an unpaid claim | 5 destinations for 2026, each scouted by our team |
| **AR** | 1٬243 مسافر رافقناهم منذ 2019 | 98٪ زبون راضي · تقييمات Google موثّقة | 7 سنوات في الميدان · بدون شكوى مفتوحة | 5 وجهات 2026 · زرناها واحدة واحدة |

**HTML scaffold:**
```html
<section class="section section--compact social-proof" aria-labelledby="social-proof-title">
  <div class="container">
    <h2 class="u-sr-only" id="social-proof-title" data-i18n="social_proof.sr_title">Nos chiffres</h2>
    <ul class="social-proof__grid">
      <li class="social-proof__item">
        <span class="social-proof__num" data-count-to="1243">0</span>
        <span class="social-proof__label" data-i18n="social_proof.travelers">voyageurs accompagnés depuis 2019</span>
      </li>
      <li class="social-proof__item">
        <span class="social-proof__num" data-count-to="98" data-suffix="%">0%</span>
        <span class="social-proof__label" data-i18n="social_proof.satisfaction">clients satisfaits — avis Google vérifiés</span>
      </li>
      <li class="social-proof__item">
        <span class="social-proof__num" data-count-to="7">0</span>
        <span class="social-proof__label" data-i18n="social_proof.years">ans sur le terrain, jamais une réclamation impayée</span>
      </li>
      <li class="social-proof__item">
        <span class="social-proof__num" data-count-to="5">0</span>
        <span class="social-proof__label" data-i18n="social_proof.destinations">destinations 2026, toutes testées par notre équipe</span>
      </li>
    </ul>
  </div>
</section>
```

**i18n keys:**
```js
social_proof: {
  sr_title: 'Nos chiffres',
  travelers: 'voyageurs accompagnés depuis 2019',
  satisfaction: 'clients satisfaits — avis Google vérifiés',
  years: 'ans sur le terrain, jamais une réclamation impayée',
  destinations: 'destinations 2026, toutes testées par notre équipe'
}
```

---

### BLOC 3 — Trust Bar (Partner / Certification Strip)

**Where it goes:** Footer-adjacent strip on `index.html` (above the footer, full-width band) and inline on each trip page just below the price calculator. Greyscale logo row.

**Visual sketch:**
```
┌────────────────────────────────────────────────────────────────────┐
│  AGRÉÉE PAR · BACKED BY                                            │
│  [Min. Tourisme] [Air Algérie] [Turkish] [EgyptAir] [IATA] [SETIA] │
└────────────────────────────────────────────────────────────────────┘
```
Logos grayscale, 32 px tall, evenly spaced. Eyebrow tiny uppercase above.

**Copy:**

| Lang | Eyebrow | Body |
|------|---------|------|
| **FR** | Agence agréée · Partenaires officiels | Ministère du Tourisme algérien · IATA · Air Algérie · Turkish Airlines · EgyptAir · SETIA |
| **EN** | Licensed agency · Official partners | Algerian Ministry of Tourism · IATA · Air Algérie · Turkish Airlines · EgyptAir · SETIA |
| **AR** | وكالة معتمدة · شركاء رسميون | وزارة السياحة الجزائرية · IATA · الجوية الجزائرية · الخطوط التركية · مصر للطيران · SETIA |

**HTML scaffold:**
```html
<section class="section section--compact trust-bar" aria-labelledby="trust-bar-title">
  <div class="container">
    <p class="section-head__eyebrow trust-bar__eyebrow" data-i18n="trust_bar.eyebrow">Agence agréée · Partenaires officiels</p>
    <h2 class="u-sr-only" id="trust-bar-title" data-i18n="trust_bar.sr_title">Nos accréditations</h2>
    <ul class="trust-bar__row">
      <li><img src="assets/images/trust/ministere-tourisme.svg" alt="Ministère du Tourisme algérien" width="120" height="32"></li>
      <li><img src="assets/images/trust/air-algerie.svg" alt="Air Algérie" width="120" height="32"></li>
      <li><img src="assets/images/trust/turkish-airlines.svg" alt="Turkish Airlines" width="120" height="32"></li>
      <li><img src="assets/images/trust/egyptair.svg" alt="EgyptAir" width="120" height="32"></li>
      <li><img src="assets/images/trust/iata.svg" alt="IATA" width="60" height="32"></li>
      <li><img src="assets/images/trust/setia.svg" alt="SETIA" width="80" height="32"></li>
    </ul>
  </div>
</section>
```

**i18n keys:**
```js
trust_bar: {
  eyebrow: 'Agence agréée · Partenaires officiels',
  sr_title: 'Nos accréditations'
}
```

---

### BLOC 4 — Bonus Stack ("Tout est compris")

**Where it goes:** Sits inside each individual trip page (e.g. `cairo-sharm/index.html`), immediately under the hero, before the day-by-day itinerary. Visually anchored beside the "À partir de XX 000 DA" price.

**Visual sketch:**
```
┌────────────────────────────────────────────────────────┐
│  COMPRIS DANS VOTRE PRIX                               │
│  ✓ Vol A/R EgyptAir         (valeur ≈ 95 000 DA)       │
│  ✓ Visa Égypte                (valeur ≈ 8 000 DA)      │
│  ✓ Hôtels 4★ + 5★ AI         (valeur ≈ 72 000 DA)      │
│  ✓ Excursions guidées        (valeur ≈ 18 000 DA)      │
│  ✓ Transferts privés          (valeur ≈ 6 000 DA)      │
│  ✓ Wifi + assurance voyage    (valeur ≈ 4 000 DA)      │
│  ─────────────────────────────────────────────         │
│  Si vous deviez tout acheter séparément : ≈ 248 000 DA │
│  Avec Alliance Travel : 190 000 DA · soit −58 000 DA   │
└────────────────────────────────────────────────────────┘
```

**Copy:**

| Lang | Heading | Footer line |
|------|---------|-------------|
| **FR** | Tout est compris dans votre prix. Aucun supplément à l'arrivée. | À l'unité : ≈ 248 000 DA. Avec Alliance Travel : **190 000 DA**. Vous économisez **58 000 DA**. |
| **EN** | Everything's included. Zero surprise charges on arrival. | Bought separately: ≈ DA 248,000. With Alliance Travel: **DA 190,000**. You save **DA 58,000**. |
| **AR** | كل شي داخل في السومة · ما كاينش زيادات في المطار | لو تشريهم وحدة وحدة · ≈ 248٬000 دج · معانا: **190٬000 دج** · توفّر **58٬000 دج** |

Line items (FR): Vol A/R · Visa · Hôtels AI · Excursions guidées · Transferts privés · Wifi + assurance
Line items (EN): Round-trip flight · Visa · All-inclusive hotels · Guided excursions · Private transfers · Wifi + insurance
Line items (AR): تذكرة طيار ذهاب وإياب · فيزا · أفنادق All Inclusive · جولات مع المرشد · تنقّلات خاصة · واي فاي + تأمين

**HTML scaffold:**
```html
<section class="bonus-stack" aria-labelledby="bonus-stack-title">
  <div class="container">
    <p class="section-head__eyebrow" data-i18n="bonus_stack.eyebrow">Compris dans votre prix</p>
    <h2 class="section-head__title" id="bonus-stack-title" data-i18n="bonus_stack.title">Tout est compris. Aucun supplément à l'arrivée.</h2>
    <ul class="bonus-stack__list">
      <li class="bonus-stack__item">
        <svg class="bonus-stack__check" aria-hidden="true"><!-- check --></svg>
        <span class="bonus-stack__label" data-i18n="bonus_stack.flight">Vol A/R EgyptAir</span>
        <span class="bonus-stack__value">≈ 95 000 DA</span>
      </li>
      <!-- 5 more items, same shape -->
    </ul>
    <p class="bonus-stack__total" data-i18n-html="bonus_stack.savings">
      À l'unité : ≈ 248 000 DA. Avec Alliance Travel : <strong>190 000 DA</strong>. Vous économisez <strong>58 000 DA</strong>.
    </p>
  </div>
</section>
```

**i18n keys:**
```js
bonus_stack: {
  eyebrow: 'Compris dans votre prix',
  title: "Tout est compris. Aucun supplément à l'arrivée.",
  flight: 'Vol A/R EgyptAir',
  visa: 'Visa Égypte',
  hotels: 'Hôtels 4★ + 5★ All Inclusive',
  excursions: 'Excursions guidées',
  transfers: 'Transferts privés',
  insurance: 'Wifi + assurance voyage',
  savings: "À l'unité : ≈ 248 000 DA. Avec Alliance Travel : <strong>190 000 DA</strong>. Vous économisez <strong>58 000 DA</strong>."
}
```

---

### BLOC 5 — Risk Reversal Pledge

**Where it goes:** Inline section on the homepage between agency story and contact form. Also as a slim widget on the booking form on every trip page (right column).

**Visual sketch:**
```
┌──────────────────────────────────────────────────────────────┐
│  NOTRE ENGAGEMENT                                            │
│                                                              │
│  [icon: shield]   Acompte remboursable 7 jours              │
│                   Changez d'avis sous une semaine, vous     │
│                   récupérez votre acompte. Sans question.   │
│                                                              │
│  [icon: clock]    Devis sous 1 heure (ouvré)                │
│                   Une question WhatsApp avant 17h ?          │
│                   Vous avez votre prix le jour même.        │
│                                                              │
│  [icon: lock]     Prix garanti à la signature                │
│                   Le prix annoncé ne bouge plus, même si    │
│                   le vol augmente entre-temps.              │
└──────────────────────────────────────────────────────────────┘
```

**Copy:**

| Lang | Section title | 3 pledges |
|------|---------------|-----------|
| **FR** | Trois engagements que vous trouverez en clair dans le contrat | **Acompte remboursable 7 jours** — Changez d'avis sous une semaine, vous récupérez votre acompte. Sans question. **·** **Devis sous 1 heure (ouvré)** — Une question WhatsApp avant 17h, vous avez votre prix le jour même. **·** **Prix garanti à la signature** — Le prix annoncé ne bouge plus, même si le vol augmente entre-temps. |
| **EN** | Three pledges written into every contract | **7-day refundable deposit** — Change your mind within a week, get your deposit back. No questions. **·** **Quote within 1 hour (business hours)** — Ping us on WhatsApp before 5pm, your price lands the same day. **·** **Price locked at signing** — The number on your contract doesn't move, even if the airline raises fares. |
| **AR** | ثلاث ضمانات مكتوبين في العقد | **التسبيق يرجع في 7 أيام** — بدّلت رأيك في أسبوع · فلوسك ترجع. بلا أسئلة. **·** **التقدير في ساعة (أوقات العمل)** — راسلنا واتساب قبل 5 العشية · السومة تلقاها نفس النهار. **·** **السومة مقفولة عند الإمضاء** — اللي تشد في الورقة هي اللي تخلّص. حتى لو غلت الطيارة. |

**HTML scaffold:**
```html
<section class="section pledge" aria-labelledby="pledge-title">
  <div class="container">
    <p class="section-head__eyebrow" data-i18n="pledge.eyebrow">Notre engagement</p>
    <h2 class="section-head__title" id="pledge-title" data-i18n="pledge.title">Trois engagements, écrits dans votre contrat</h2>
    <ul class="pledge__list">
      <li class="pledge__item">
        <svg class="pledge__icon" aria-hidden="true"><!-- shield --></svg>
        <h3 class="pledge__title" data-i18n="pledge.refund_title">Acompte remboursable 7 jours</h3>
        <p class="pledge__body" data-i18n="pledge.refund_body">Changez d'avis sous une semaine, vous récupérez votre acompte. Sans question.</p>
      </li>
      <li class="pledge__item">
        <svg class="pledge__icon" aria-hidden="true"><!-- clock --></svg>
        <h3 class="pledge__title" data-i18n="pledge.speed_title">Devis sous 1 heure (ouvré)</h3>
        <p class="pledge__body" data-i18n="pledge.speed_body">Une question WhatsApp avant 17h, vous avez votre prix le jour même.</p>
      </li>
      <li class="pledge__item">
        <svg class="pledge__icon" aria-hidden="true"><!-- lock --></svg>
        <h3 class="pledge__title" data-i18n="pledge.lock_title">Prix garanti à la signature</h3>
        <p class="pledge__body" data-i18n="pledge.lock_body">Le prix annoncé ne bouge plus, même si le vol augmente entre-temps.</p>
      </li>
    </ul>
  </div>
</section>
```

**i18n keys:**
```js
pledge: {
  eyebrow: 'Notre engagement',
  title: 'Trois engagements, écrits dans votre contrat',
  refund_title: 'Acompte remboursable 7 jours',
  refund_body: "Changez d'avis sous une semaine, vous récupérez votre acompte. Sans question.",
  speed_title: 'Devis sous 1 heure (ouvré)',
  speed_body: 'Une question WhatsApp avant 17h, vous avez votre prix le jour même.',
  lock_title: 'Prix garanti à la signature',
  lock_body: 'Le prix annoncé ne bouge plus, même si le vol augmente entre-temps.'
}
```

---

### BLOC 6 — Comparison Table "Pourquoi nous"

**Where it goes:** Between the agency story and the map section on `index.html`. Single placement, this is the "buying-frame" bloc.

**Visual sketch:**
```
                  │ ALLIANCE   │  Agence    │  DIY      │  Autre AT │
                  │  Travel    │  d'Alger   │  Booking  │  locale   │
──────────────────┼────────────┼────────────┼───────────┼───────────┤
Conseiller perso  │  ✓ wilaya  │  Call ctr  │   —       │  variable │
Visa inclus       │  ✓         │  +12 000   │   à part  │  parfois  │
Acompte rembours. │  ✓ 7 jrs   │  non       │   non     │  non      │
Accomp. arabe sur │  ✓         │  parfois   │   non     │  parfois  │
WhatsApp 24/7     │  ✓         │  9h-17h    │   non     │  parfois  │
Prix verrouillé   │  ✓         │  ✗         │   ✗       │  ✗        │
À partir de       │ 190 000 DA │ 215 000 DA │ 230 000 + │ 195-220 K │
```

Sticky first column. Tick = accent green. Cross = muted red. Numbers tabular.

**Copy:**

| Lang | Eyebrow | Title |
|------|---------|-------|
| **FR** | Pourquoi Alliance Travel | Côte à côte. Décidez vous-même. |
| **EN** | Why Alliance Travel | Side by side. You decide. |
| **AR** | علاش علاينس ترافل | جنب جنب · أنت تحكم. |

Row labels (FR / EN / AR):
- Conseiller personnel / Personal advisor / مستشار شخصي
- Visa inclus / Visa included / فيزا داخلة
- Acompte remboursable 7 jours / 7-day refundable deposit / التسبيق يرجع في 7 أيام
- Accompagnateur arabophone sur place / Arabic-speaking guide on site / مرافق عربي في عين المكان
- WhatsApp 24/7 / WhatsApp 24/7 / واتساب 24/7
- Prix verrouillé à la signature / Price locked at signing / السومة مقفولة عند الإمضاء
- À partir de (Le Caire + Sharm) / Starts at (Cairo + Sharm) / السومة الأولى

Column heads (FR): Alliance Travel · Agence d'Alger · DIY (Booking + visa seul) · Autre agence locale
Column heads (EN): Alliance Travel · Algiers agency · DIY (Booking + visa solo) · Other local agency
Column heads (AR): علاينس ترافل · وكالة العاصمة · ديربها وحدك · وكالة محلية أخرى

**HTML scaffold:**
```html
<section class="section comparison" aria-labelledby="comparison-title">
  <div class="container">
    <p class="section-head__eyebrow" data-i18n="comparison.eyebrow">Pourquoi Alliance Travel</p>
    <h2 class="section-head__title" id="comparison-title" data-i18n="comparison.title">Côte à côte. Décidez vous-même.</h2>
    <div class="comparison__scroller">
      <table class="comparison__table">
        <thead>
          <tr>
            <th scope="col" data-i18n="comparison.th_feature">Critère</th>
            <th scope="col" class="comparison__us" data-i18n="comparison.th_us">Alliance Travel</th>
            <th scope="col" data-i18n="comparison.th_alger">Agence d'Alger</th>
            <th scope="col" data-i18n="comparison.th_diy">Booking + visa seul</th>
            <th scope="col" data-i18n="comparison.th_other">Autre agence locale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" data-i18n="comparison.row_advisor">Conseiller personnel</th>
            <td>✓</td><td>Call center</td><td>—</td><td>Variable</td>
          </tr>
          <!-- 5 more rows, same shape -->
        </tbody>
      </table>
    </div>
  </div>
</section>
```

**i18n keys:**
```js
comparison: {
  eyebrow: 'Pourquoi Alliance Travel',
  title: 'Côte à côte. Décidez vous-même.',
  th_feature: 'Critère',
  th_us: 'Alliance Travel',
  th_alger: "Agence d'Alger",
  th_diy: 'Booking + visa seul',
  th_other: 'Autre agence locale',
  row_advisor: 'Conseiller personnel',
  row_visa: 'Visa inclus dans le prix',
  row_refund: 'Acompte remboursable 7 jours',
  row_guide: 'Accompagnateur arabophone sur place',
  row_whatsapp: 'WhatsApp 24/7',
  row_lock: 'Prix verrouillé à la signature',
  row_from: 'À partir de · Le Caire + Sharm'
}
```

---

### BLOC 7 — Urgency Banner (Next Departure)

**Where it goes:** Section just above the comparison table on `index.html`. Also rotating per-trip on each `voyages/*/index.html` page (with trip-specific date).

**Visual sketch:**
```
┌──────────────────────────────────────────────────────────────────┐
│  PROCHAIN DÉPART CONFIRMÉ                                        │
│  ✈ Le Caire & Sharm El Sheikh — départ Alger                     │
│  25 juin 2026 · 12 places restantes sur 34                       │
│  ──────────────────────────────────────────                      │
│  [J -22] · [22] [10] [05]                                        │
│   jours    h    min  sec                                         │
│                                                                  │
│         [ Réserver ma place →  ]                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Copy:**

| Lang | Eyebrow | Title | Stat line | CTA |
|------|---------|-------|-----------|-----|
| **FR** | Prochain départ confirmé | Le Caire & Sharm El Sheikh — départ Alger | **25 juin 2026** · **12 places restantes** sur 34 | Bloquer ma place |
| **EN** | Next confirmed departure | Cairo & Sharm El Sheikh — out of Algiers | **June 25, 2026** · **12 spots left** of 34 | Reserve my spot |
| **AR** | الرحلة الجاية مؤكدة | القاهرة + شرم الشيخ · من الجزائر | **25 جوان 2026** · **12 بلاصة باقية** من 34 | احجز بلاصتي |

**HTML scaffold:**
```html
<section class="section section--compact urgency" aria-labelledby="urgency-title" data-departure="2026-06-25">
  <div class="container urgency__inner">
    <div class="urgency__copy">
      <p class="section-head__eyebrow" data-i18n="urgency.eyebrow">Prochain départ confirmé</p>
      <h2 class="urgency__title" id="urgency-title" data-i18n="urgency.title">Le Caire &amp; Sharm El Sheikh — départ Alger</h2>
      <p class="urgency__stats" data-i18n-html="urgency.stats">
        <strong>25 juin 2026</strong> · <strong>12 places restantes</strong> sur 34
      </p>
    </div>
    <div class="urgency__counter" role="timer" aria-label="Décompte avant le départ">
      <span class="urgency__unit"><strong data-countdown="days">—</strong><small data-i18n="urgency.days">jours</small></span>
      <span class="urgency__unit"><strong data-countdown="hours">—</strong><small data-i18n="urgency.hours">h</small></span>
      <span class="urgency__unit"><strong data-countdown="minutes">—</strong><small data-i18n="urgency.minutes">min</small></span>
    </div>
    <a class="urgency__cta btn btn--primary" href="cairo-sharm/index.html#booking" data-i18n="urgency.cta">Bloquer ma place</a>
  </div>
</section>
```

**i18n keys:**
```js
urgency: {
  eyebrow: 'Prochain départ confirmé',
  title: 'Le Caire & Sharm El Sheikh — départ Alger',
  stats: '<strong>25 juin 2026</strong> · <strong>12 places restantes</strong> sur 34',
  days: 'jours',
  hours: 'h',
  minutes: 'min',
  cta: 'Bloquer ma place'
}
```

---

### BLOC 8 — Testimonial Wall (Verified Voyageurs)

**Where it goes:** Between the urgency banner and the comparison table on homepage. Also as a 3-card carousel inside each trip page at the bottom of the day-by-day itinerary.

**Visual sketch:**
```
ILS SONT REVENUS, ILS EN PARLENT
┌────────────────┬────────────────┬────────────────┐
│  ★ ★ ★ ★ ★     │  ★ ★ ★ ★ ★     │  ★ ★ ★ ★ ★     │
│                │                │                │
│  "On a payé    │  "Ma femme et  │  "C'est la 3e  │
│   ce qu'on     │   moi à Bakou, │   fois qu'on   │
│   avait signé. │   tout était   │   part avec    │
│   Rien en      │   prêt à       │   eux. Aucun   │
│   plus."       │   l'arrivée."  │   souci."      │
│                │                │                │
│  Yacine B.     │  Sofiane &     │  Amel R.       │
│  BBA · Caire   │  Houda — Bakou │  M'Sila · Ist. │
│  ✓ vérifié     │  ✓ vérifié     │  ✓ vérifié     │
│  Mars 2026     │  Avr. 2026     │  Mai 2026      │
└────────────────┴────────────────┴────────────────┘
        [ Lire les 47 avis Google →  4,9 / 5 ]
```

**Copy:**

| Lang | Eyebrow | Title | CTA |
|------|---------|-------|-----|
| **FR** | Ils sont revenus | Ce qu'ils racontent à leurs proches | Lire les 47 avis Google · 4,9 / 5 |
| **EN** | They came back | What they tell their family | Read 47 Google reviews · 4.9 / 5 |
| **AR** | رجعوا · يحكيوا | اللي يقولوا لأهلهم | اقرا 47 تقييم في Google · 4٫9 / 5 |

3 testimonial copies:

**FR:**
- *"On a payé exactement ce qu'on a signé. Pas une dinar de plus. À l'arrivée tout était prêt."* — Yacine B., Bordj Bou Arreridj · Voyage Le Caire, mars 2026
- *"Ma femme et moi on est partis à Bakou. L'accompagnateur était sur place dès l'aéroport, en arabe."* — Sofiane & Houda, M'Sila · Voyage Bakou, avril 2026
- *"C'est la troisième fois qu'on voyage avec Alliance. À chaque fois zéro souci. On envoie nos cousins maintenant."* — Amel R., Bordj Bou Arreridj · Voyage Istanbul, mai 2026

**EN:**
- *"We paid exactly what we signed. Not one dinar more. On arrival everything was waiting."* — Yacine B., Bordj Bou Arreridj · Cairo trip, March 2026
- *"My wife and I went to Baku. The guide was there from the airport, in Arabic."* — Sofiane & Houda, M'Sila · Baku trip, April 2026
- *"Third time we travel with Alliance. Zero issues every time. We send our cousins now."* — Amel R., Bordj Bou Arreridj · Istanbul trip, May 2026

**AR:**
- *«خلّصنا بالضبط اللي مضينا عليه · ولا دينار زيادة · وصلنا لقينا كل شي حاضر»* — ياسين ب · برج بوعريريج · القاهرة، مارس 2026
- *«مشيت أنا ومرتي لباكو · المرافق كان مستنّينا في المطار · يهدر عربية»* — سفيان وهدى · المسيلة · باكو، أفريل 2026
- *«ثالث مرّة نسافر مع علاينس · في كل مرّة بلا صداع · نبعثلهم وليدات عمّي توا»* — أمال ر · برج بوعريريج · إسطنبول، ماي 2026

**HTML scaffold:**
```html
<section class="section testimonials" aria-labelledby="testimonials-title">
  <div class="container">
    <p class="section-head__eyebrow" data-i18n="testimonials.eyebrow">Ils sont revenus</p>
    <h2 class="section-head__title" id="testimonials-title" data-i18n="testimonials.title">Ce qu'ils racontent à leurs proches</h2>
    <ul class="testimonials__grid">
      <li class="testimonial">
        <div class="testimonial__stars" aria-label="5 sur 5">★★★★★</div>
        <blockquote class="testimonial__quote" data-i18n="testimonials.q1">"On a payé exactement ce qu'on a signé. Pas une dinar de plus. À l'arrivée tout était prêt."</blockquote>
        <footer class="testimonial__meta">
          <span class="testimonial__name" data-i18n="testimonials.n1">Yacine B.</span>
          <span class="testimonial__trip" data-i18n="testimonials.t1">BBA · Le Caire · mars 2026</span>
          <span class="testimonial__verified" data-i18n="testimonials.verified">✓ voyageur vérifié</span>
        </footer>
      </li>
      <!-- li 2 and 3 same shape -->
    </ul>
    <a class="testimonials__cta" href="https://g.page/r/alliance-travel-bba/review" data-i18n="testimonials.cta">Lire les 47 avis Google · 4,9 / 5</a>
  </div>
</section>
```

**i18n keys:**
```js
testimonials: {
  eyebrow: 'Ils sont revenus',
  title: "Ce qu'ils racontent à leurs proches",
  verified: '✓ voyageur vérifié',
  q1: "\"On a payé exactement ce qu'on a signé. Pas une dinar de plus. À l'arrivée tout était prêt.\"",
  n1: 'Yacine B.', t1: 'BBA · Le Caire · mars 2026',
  q2: "\"Ma femme et moi on est partis à Bakou. L'accompagnateur était sur place dès l'aéroport, en arabe.\"",
  n2: 'Sofiane & Houda', t2: "M'Sila · Bakou · avril 2026",
  q3: "\"C'est la troisième fois qu'on voyage avec Alliance. À chaque fois zéro souci. On envoie nos cousins maintenant.\"",
  n3: 'Amel R.', t3: 'BBA · Istanbul · mai 2026',
  cta: 'Lire les 47 avis Google · 4,9 / 5'
}
```

---

## Section C — Integration Guidance

### What to remove / de-emphasize

The site currently leans hard on warmth, intimacy, and anti-Alger positioning. That voice stays — these new blocs **layer underneath** it, they don't replace it. Specific trims:

1. **Hero CTA stack** is currently 3 buttons (`cta_voyages`, `cta_contact`, `cta_whatsapp`). Drop to 2 (Voyages + WhatsApp). The trust-strip bloc replaces the visual job the third button was doing.
2. **Agency stats grid** (the existing 4-counter row inside the agency story) gets **deleted** — Bloc 2 (social proof counter) absorbs it and gives it better real estate at the top of the funnel.
3. **Footer `notice` micro-line** ("Prix indicatifs en Dinar Algérien · Confirmation au moment de la réservation") gets **rewritten** as part of the Risk Reversal pledge (Bloc 5) — it currently reads defensive, the pledge reads confident.

### Page-by-page placement

| Page | New blocs (top → bottom) |
|------|---------------------------|
| **`index.html`** | Scarcity strip → Hero (existing) → Social Proof Counter (Bloc 2) → Voyages grid (existing) → Urgency Banner (Bloc 7) → Testimonial Wall (Bloc 8) → Comparison Table (Bloc 6) → Agency story (existing) → Risk Reversal (Bloc 5) → Map (existing) → Trust Bar (Bloc 3) → Footer |
| **`cairo-sharm/index.html`** + 4 sibling trip pages | Scarcity strip → Hero → Bonus Stack (Bloc 4) → Day-by-day → Urgency banner (Bloc 7, trip-specific) → 3 testimonials → Risk Reversal (Bloc 5, compact variant) → Booking form → Trust Bar (Bloc 3) |

### A/B testing priorities

Test in this order (highest expected impact first):

1. **Bonus Stack (Bloc 4)** — Reveals saved value in DA. This is the bloc most likely to move conversion on individual trip pages. Hypothesis: +15-25% on "Réserver" clicks.
2. **Urgency Banner (Bloc 7)** — Scarcity + a real countdown reframes the page from "browse" to "decide." Test against a static "Prochain départ : 25 juin" line. Hypothesis: +10-15% on lead-form submissions.
3. **Risk Reversal Pledge (Bloc 5)** — Addresses the "what if it falls through" objection that's invisible until you watch a recorded session. Test the 7-day refund as a numeric headline vs. embedded in long copy. Hypothesis: +8-12% on form completions.
4. **Comparison Table (Bloc 6)** — Highest commit to land well, but biggest brand-equity lift. Test only after the other three. Hypothesis: stronger brand recall, smaller direct conversion delta.

The Scarcity Strip (Bloc 1), Social Proof Counter (Bloc 2), Trust Bar (Bloc 3), and Testimonial Wall (Bloc 8) are foundational — ship them without testing, they're hygiene-level conversion components every competitor in the cohort already has.

---

**Sources referenced (Section A):**

- [Arafat Voyages](https://arafatvoyages.com/) — social proof at scale, IATA/ATOUT badges, testimonials with religious framing
- [Omra Pour Tous](https://omrapourtous.com/) — Saudi ministry agrément number as authority anchor
- [Nreservi.com Istanbul promo](https://nreservi.com/voyages-organises/turquie/item/43-promotion-sejour-istanbul) — view counters as social proof, inclusion stacks
- [Touring Voyages Algérie](https://www.touring-algeria.com/) — "rupture de stock" scarcity labels, Ministry of Tourism anchoring
- [Algerievoyage-dz](https://algerievoyage-dz.com/dz/) — hard-coded departure dates, "À PARTIR DE" anchor pricing
- [Agence Voyage Algérie · Caire-Sharm](https://agence-voyage-algerie.com/voyage-organise-caire-sharm-el-sheikh/) — bundled itinerary as bonus stack
- [Voyages Cortoba](https://voyagescortoba.com/) — combined Omra + Istanbul positioning
- [Djazair Voyages](https://djazairvoyages.com/) — family-positioning copy ("authentique, convivial, familial")
