# Rendez-vous Visa — Page Design Brief

**Page:** standalone `/rendez-vous-visa/` · **Author:** Agent B (copy + architecture) · **Date:** 2026-06-03
**Status:** READY-TO-IMPLEMENT once Agent A (per-country data) and Agent C (assets) close.
**Hard rules respected:** zero outcome guarantees · zero fees quoted · zero processing-time promises · anti-Alger positioning baked into hero + final CTA · all FR/EN/AR copy production-grade · uses existing CSS classes wherever possible.

---

## 1. Page URL + meta

- **URL:** `/rendez-vous-visa/` (folder + `index.html`, matches the cairo-sharm pattern)
- **`<body data-page="visa">`** so the i18n engine swaps `<title>` + meta per language
- **Canonical:** `https://alliance-travel.dz/rendez-vous-visa/`
- **`<link rel="alternate" hreflang="x-default">`** per the v22 i18n-SEO strategy (site is FR-surface for crawlers)
- **Theme-color:** `#0C0E12` (match homepage)

### `<title>` + meta description (3 languages)

| | FR (source) | EN | AR |
|---|---|---|---|
| **title** | Rendez-vous Visa · Alliance Travel · Bordj Bou Arreridj | Visa Appointments & Dossier Service — Alliance Travel · BBA | خدمة موعد التأشيرة وتجهيز الملف — أليانس ترافل · برج بوعريريج |
| **description** | Réservation de RDV ambassade et VFS, préparation complète de dossier, dépôt physique selon ambassade. 10 pays couverts depuis Bordj Bou Arreridj — pas besoin de monter à Alger. | We book embassy and VFS appointments, prepare the full dossier, and handle drop-off where the consulate allows it. Ten countries served from Bordj Bou Arreridj — no trip to Algiers required. | نحجز مواعيد السفارات ومراكز VFS، نُعدّ الملف كاملاً، ونُودِعه نيابةً عنك حيث تسمح السفارة. عشر دول من برج بوعريريج — دون الحاجة للتنقّل إلى الجزائر العاصمة. |
| **og:title** | Rendez-vous Visa · Alliance Travel | Visa Appointments — Alliance Travel | خدمة موعد التأشيرة — أليانس ترافل |
| **og:description** | On s'occupe du RDV, du dossier et du dépôt — vous restez à Bordj. 10 pays · réponse WhatsApp en 30 min. | RDV, dossier, drop-off — we handle it from Bordj. Ten countries · 30-min WhatsApp reply. | الموعد، الملف، الإيداع — كلّه من برج. عشر دول · ردّ خلال 30 دقيقة على واتساب. |

### Schema.org JSON-LD (head)

Two blocks: `BreadcrumbList` (Accueil → Rendez-vous Visa) and `Service` typed as `@type: "Service"` with `provider` pointing to the existing `TravelAgency` entity. Also a `FAQPage` block for the FAQ section (~15 items) — same pattern as `cairo-sharm/index.html`.

---

## 2. Section-by-section structure

> Markup uses **existing classes only** unless flagged `[NEW CSS]`. All sections wrap in `<section class="section">` (or `section-sm`) with a `<div class="container">`. AOS attributes shown for parity with the rest of the site.

### Section 1 — Hero

**Intent:** Position the page in one breath. Service-first ("we handle visa appointments") + trust mid-line + two CTAs. No big background image — keep the load fast and the page feeling like a service hub, not a destination trip.

```html
<section class="hero hero--service" aria-labelledby="visa-hero-title" data-region="service">
  <div class="container hero__content">
    <p class="hero__eyebrow" data-i18n="visa.hero.eyebrow">Service Rendez-vous Visa · Bordj Bou Arreridj</p>
    <h1 id="visa-hero-title" class="hero__title">
      <span data-i18n="visa.hero.title_l1">Votre rendez-vous visa,</span>
      <em data-i18n="visa.hero.title_em">pris en charge de A à Z.</em>
    </h1>
    <p class="hero__lede" data-i18n="visa.hero.lede">…</p>
    <div class="hero__ctas">
      <a href="https://wa.me/213561616266?text=..." class="btn btn--primary btn--wa" target="_blank" rel="noopener" data-i18n="visa.hero.cta_wa">WhatsApp un conseiller</a>
      <a href="#visa-form" class="btn btn--ghost" data-i18n="visa.hero.cta_form">Demander un devis</a>
    </div>
    <ul class="hero__trust" role="list">
      <li data-i18n="visa.hero.trust_branches">3 agences physiques · BBA &amp; M'Sila</li>
      <li data-i18n="visa.hero.trust_no_alger">Pas besoin de monter à Alger</li>
      <li data-i18n="visa.hero.trust_since">Depuis 2019 · 1 200+ dossiers traités</li>
    </ul>
  </div>
</section>
```

**FR (production):**
- *eyebrow:* "Service Rendez-vous Visa · Bordj Bou Arreridj"
- *title_l1:* "Votre rendez-vous visa,"
- *title_em:* "pris en charge de A à Z."
- *lede:* "On réserve votre RDV à l'ambassade ou au centre VFS, on prépare votre dossier complet, et — selon les règles du consulat — on dépose le dossier pour vous. Vous restez à Bordj, on fait la route. 10 pays couverts. Devis personnalisé sur WhatsApp."
- *cta_wa:* "WhatsApp un conseiller"
- *cta_form:* "Demander un devis"
- *trust_branches:* "3 agences physiques · BBA & M'Sila"
- *trust_no_alger:* "Pas besoin de monter à Alger"
- *trust_since:* "Depuis 2019 · 1 200+ dossiers traités"

**EN (idiomatic):**
- *eyebrow:* "Visa Appointment Service · Bordj Bou Arreridj"
- *title_l1:* "Your visa appointment,"
- *title_em:* "handled end-to-end."
- *lede:* "We book your embassy or VFS appointment, prepare the full dossier, and — where the consulate allows it — drop the file off for you. You stay in Bordj; we make the trip. Ten countries covered. Personalised quote on WhatsApp."
- *cta_wa:* "Message an advisor"
- *cta_form:* "Request a quote"
- *trust_branches:* "Three offices on the ground · BBA & M'Sila"
- *trust_no_alger:* "No trip to Algiers needed"
- *trust_since:* "Operating since 2019 · 1,200+ files processed"

**AR (MSA, Algerian register, verb-first):**
- *eyebrow:* "خدمة مواعيد التأشيرة · برج بوعريريج"
- *title_l1:* "نتكفّل بموعد تأشيرتك"
- *title_em:* "من الألف إلى الياء."
- *lede:* "نحجز لك موعدك في السفارة أو في مركز VFS، ونُعدّ ملفّك كاملاً، ونتولّى الإيداع نيابةً عنك حيث تسمح السفارة بذلك. أنت تبقى في برج، ونحن نتكفّل بالتنقّل. عشر دول مغطّاة. تقديرٌ مخصّص عبر واتساب."
- *cta_wa:* "تواصل عبر واتساب"
- *cta_form:* "اطلب تقديراً"
- *trust_branches:* "ثلاثة مكاتب فعليّة · برج بوعريريج والمسيلة"
- *trust_no_alger:* "بدون التنقّل إلى العاصمة"
- *trust_since:* "نعمل منذ 2019 · أكثر من 1 200 ملف"

**i18n keys:** `visa.hero.eyebrow`, `visa.hero.title_l1`, `visa.hero.title_em`, `visa.hero.lede`, `visa.hero.cta_wa`, `visa.hero.cta_form`, `visa.hero.trust_branches`, `visa.hero.trust_no_alger`, `visa.hero.trust_since`.

---

### Section 2 — Services (three-tier model)

**Intent:** Strip the service into three honest, separable tiers — client chooses. Reuses the `.hl-card` pattern (already used on `cairo-sharm` for highlights), no new CSS.

```html
<section class="section" id="services" aria-labelledby="visa-services-title">
  <div class="container">
    <div class="section-head u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-i18n="visa.services.eyebrow">Nos prestations</p>
      <h2 id="visa-services-title" class="section-head__title">
        <span data-i18n="visa.services.title_l1">Trois niveaux,</span>
        <em data-i18n="visa.services.title_em">vous choisissez.</em>
      </h2>
      <p class="section-head__sub" data-i18n="visa.services.sub">…</p>
    </div>
    <div class="grid-cards grid-cards--lg">
      <article class="hl-card" data-aos="fade-up" data-aos-delay="0">
        <span class="hl-card__label" data-i18n="visa.services.tier1.tag">Niveau 1</span>
        <h3 class="hl-card__title" data-i18n="visa.services.tier1.title">Réservation du RDV</h3>
        <p class="hl-card__body" data-i18n="visa.services.tier1.body">…</p>
        <a class="btn btn--ghost btn--wa" href="https://wa.me/213561616266?text=..." target="_blank" rel="noopener" data-i18n="visa.services.tier1.cta">WhatsApp pour ce service</a>
      </article>
      <article class="hl-card" data-aos="fade-up" data-aos-delay="80">
        <span class="hl-card__label" data-i18n="visa.services.tier2.tag">Niveau 2</span>
        <h3 class="hl-card__title" data-i18n="visa.services.tier2.title">Préparation complète du dossier</h3>
        <p class="hl-card__body" data-i18n="visa.services.tier2.body">…</p>
        <a class="btn btn--ghost btn--wa" href="https://wa.me/213561616266?text=..." target="_blank" rel="noopener" data-i18n="visa.services.tier2.cta">WhatsApp pour ce service</a>
      </article>
      <article class="hl-card" data-aos="fade-up" data-aos-delay="160">
        <span class="hl-card__label" data-i18n="visa.services.tier3.tag">Niveau 3</span>
        <h3 class="hl-card__title" data-i18n="visa.services.tier3.title">Dépôt physique du dossier</h3>
        <p class="hl-card__body" data-i18n="visa.services.tier3.body">…</p>
        <a class="btn btn--ghost btn--wa" href="https://wa.me/213561616266?text=..." target="_blank" rel="noopener" data-i18n="visa.services.tier3.cta">WhatsApp pour ce service</a>
      </article>
    </div>
  </div>
</section>
```

**FR copy (~30-50 words each):**
- *eyebrow:* "Nos prestations"
- *title_l1:* "Trois niveaux,"
- *title_em:* "vous choisissez."
- *sub:* "Du simple créneau réservé jusqu'au dépôt physique du dossier, vous prenez exactement ce dont vous avez besoin — et rien de plus."
- *tier1.title:* "Réservation du RDV"
- *tier1.body:* "On bloque votre créneau au consulat, à VFS, BLS, TLScontact ou CVASC selon le pays demandé. Vous recevez la confirmation du rendez-vous par WhatsApp avec les justificatifs à imprimer."
- *tier1.cta:* "WhatsApp pour ce service"
- *tier2.title:* "Préparation complète du dossier"
- *tier2.body:* "Relecture point par point de chaque document, attestations, formulaires, traductions, photos aux normes, lettres d'invitation. Vous arrivez au guichet avec un dossier propre et complet — pas de surprise à l'accueil."
- *tier2.cta:* "WhatsApp pour ce service"
- *tier3.title:* "Dépôt physique du dossier"
- *tier3.body:* "Là où le consulat l'autorise, on remet votre dossier au guichet à votre place. Vous restez à Bordj, on fait la route. Service non disponible quand la présence du demandeur est exigée (biométrie, entretien)."
- *tier3.cta:* "WhatsApp pour ce service"

**EN copy:**
- *eyebrow:* "Our services"
- *title_l1:* "Three tiers,"
- *title_em:* "your call."
- *sub:* "From a booked slot to physical drop-off, take exactly what you need — nothing more."
- *tier1.title:* "Appointment booking"
- *tier1.body:* "We secure your slot at the consulate, VFS, BLS, TLScontact or CVASC depending on the country. You get the confirmation on WhatsApp with the supporting documents ready to print."
- *tier1.cta:* "Message us about this"
- *tier2.title:* "Full dossier preparation"
- *tier2.body:* "We review every document line by line: certificates, forms, translations, regulation-compliant photos, invitation letters. You arrive at the counter with a clean, complete file — no surprises at intake."
- *tier2.cta:* "Message us about this"
- *tier3.title:* "Physical drop-off"
- *tier3.body:* "Where the consulate permits, we hand in your file at the counter on your behalf. You stay in Bordj; we make the trip. Not available when the applicant must appear in person (biometrics, interview)."
- *tier3.cta:* "Message us about this"

**AR copy:**
- *eyebrow:* "خدماتنا"
- *title_l1:* "ثلاثة مستويات،"
- *title_em:* "والاختيار لك."
- *sub:* "من حجز الموعد فقط إلى إيداع الملف فعليّاً، تأخذ ما تحتاجه بالضبط — لا أكثر."
- *tier1.title:* "حجز الموعد"
- *tier1.body:* "نحجز لك الموعد في القنصلية أو في مراكز VFS و BLS و TLScontact و CVASC حسب الدولة المطلوبة. تصلك التأكيدة عبر واتساب مرفقةً بالوثائق الجاهزة للطباعة."
- *tier1.cta:* "تواصل عبر واتساب"
- *tier2.title:* "تجهيز الملف كاملاً"
- *tier2.body:* "نراجع كلّ وثيقة بدقّة: الشهادات، الاستمارات، الترجمات، الصور المطابقة للمعايير، رسائل الدعوة. تصل إلى الشبّاك بملفٍّ نظيفٍ وكامل — دون مفاجآت عند الاستقبال."
- *tier2.cta:* "تواصل عبر واتساب"
- *tier3.title:* "إيداع الملف نيابةً عنك"
- *tier3.body:* "حيث تسمح القنصلية بذلك، نسلّم ملفّك إلى الشبّاك بدلاً منك. تبقى في برج، ونحن نتنقّل. هذه الخدمة غير متاحة عندما يستوجب حضور الطالب شخصيّاً (البصمات أو المقابلة)."
- *tier3.cta:* "تواصل عبر واتساب"

**i18n keys:** `visa.services.{eyebrow,title_l1,title_em,sub,tier1.tag,tier1.title,tier1.body,tier1.cta,tier2.tag,tier2.title,tier2.body,tier2.cta,tier3.tag,tier3.title,tier3.body,tier3.cta}`.

---

### Section 3 — 10 countries grid

**Intent:** One card per country. Flag placeholder + name + chips for tiers offered + expand-to-detail toggle (uses `<details>` for accessibility — works with zero JS). Reuses `.related-card` styling (already used on trip-pages "Vous aimerez aussi"), giving consistent visual weight to each tile.

```html
<section class="section" id="countries" aria-labelledby="visa-countries-title">
  <div class="container">
    <div class="section-head u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-i18n="visa.countries.eyebrow">Pays couverts</p>
      <h2 id="visa-countries-title" class="section-head__title">
        <span data-i18n="visa.countries.title_l1">Dix pays,</span>
        <em data-i18n="visa.countries.title_em">un seul interlocuteur.</em>
      </h2>
      <p class="section-head__sub" data-i18n="visa.countries.sub">…</p>
    </div>

    <div class="grid-cards grid-cards--sm visa-countries">
      <!-- repeat ×10. Each card: -->
      <details class="related-card visa-country-card" data-country="france">
        <summary class="related-card__body visa-country-card__head">
          <!-- TODO Agent C: flag asset path -->
          <span class="related-card__flag" aria-hidden="true">
            <img src="../assets/images/visa/flags/fr.svg" alt="" width="32" height="24" loading="lazy" />
          </span>
          <span class="related-card__title" data-i18n="visa.countries.france.name">France</span>
          <span class="visa-country-card__tiers" aria-label="Niveaux de service" data-i18n-aria-label="visa.countries.a11y_tiers">
            <span class="visa-country-card__chip" data-i18n="visa.countries.chip.tier1">RDV</span>
            <span class="visa-country-card__chip" data-i18n="visa.countries.chip.tier2">Dossier</span>
            <span class="visa-country-card__chip visa-country-card__chip--muted" data-i18n="visa.countries.chip.tier3">Dépôt</span>
          </span>
          <span class="visa-country-card__toggle" aria-hidden="true">▾</span>
        </summary>
        <div class="visa-country-card__body">
          <p class="visa-country-card__provider" data-i18n="visa.countries.france.provider"><!-- placeholder Agent A: e.g. "Dépôt via VFS Global — Alger" --></p>
          <p class="visa-country-card__notes" data-i18n="visa.countries.france.notes"><!-- placeholder Agent A: specifics, biometrics requirement, etc. --></p>
          <a class="btn btn--wa btn--ghost" href="https://wa.me/213561616266?text=..." target="_blank" rel="noopener" data-i18n="visa.countries.cta_wa">WhatsApp pour ce pays</a>
        </div>
      </details>
      <!-- /repeat -->
    </div>
  </div>
</section>
```

**Country list (cards 1-10):** France, Türkiye, Allemagne, Espagne, Chine, Russie, Égypte, Arabie Saoudite, États-Unis, Canada.

**FR copy (section-level):**
- *eyebrow:* "Pays couverts"
- *title_l1:* "Dix pays,"
- *title_em:* "un seul interlocuteur."
- *sub:* "Cliquez sur un pays pour voir le centre de traitement (ambassade, VFS, BLS, TLScontact ou CVASC) et les niveaux de service que nous prenons en charge. La biométrie et les entretiens restent obligatoirement en présentiel — c'est le consulat qui décide."
- *chip.tier1:* "RDV"
- *chip.tier2:* "Dossier"
- *chip.tier3:* "Dépôt"
- *cta_wa:* "WhatsApp pour ce pays"
- *a11y_tiers:* "Niveaux de service disponibles"

**EN copy:**
- *eyebrow:* "Countries covered"
- *title_l1:* "Ten countries,"
- *title_em:* "one point of contact."
- *sub:* "Tap a country to see the processing centre (embassy, VFS, BLS, TLScontact or CVASC) and which service tiers we provide. Biometrics and interviews always remain in person — that's the consulate's call."
- *chip.tier1:* "RDV"
- *chip.tier2:* "Dossier"
- *chip.tier3:* "Drop-off"
- *cta_wa:* "Message us about this country"
- *a11y_tiers:* "Service tiers available"

**AR copy:**
- *eyebrow:* "الدول المغطّاة"
- *title_l1:* "عشر دول،"
- *title_em:* "ومركز اتصالٍ واحد."
- *sub:* "اضغط على دولة لمعرفة مركز المعالجة (السفارة، VFS، BLS، TLScontact أو CVASC) والمستويات التي نتكفّل بها. تبقى البصمات والمقابلات حضوريّةً وجوبيّاً — هذا قرار القنصلية."
- *chip.tier1:* "الموعد"
- *chip.tier2:* "الملف"
- *chip.tier3:* "الإيداع"
- *cta_wa:* "تواصل عبر واتساب لهذه الدولة"
- *a11y_tiers:* "مستويات الخدمة المتاحة"

**Country names (FR/EN/AR):** see i18n block in §3.

**i18n keys:** `visa.countries.{eyebrow,title_l1,title_em,sub,chip.tier1,chip.tier2,chip.tier3,cta_wa,a11y_tiers}` plus per-country `visa.countries.{france,turkiye,allemagne,espagne,chine,russie,egypte,arabie_saoudite,etats_unis,canada}.{name,provider,notes}` (provider+notes filled by Agent A).

> **`[NEW CSS]`** required: `.visa-countries`, `.visa-country-card__head`, `.visa-country-card__tiers`, `.visa-country-card__chip`, `.visa-country-card__chip--muted`, `.visa-country-card__toggle`, `.visa-country-card__body`, `.visa-country-card__provider`, `.visa-country-card__notes` — see §6.

---

### Section 4 — Interactive map

**Intent:** Mirror the homepage Algeria network map (`map` namespace) but with visa-processing endpoints — show that the user already has a path from BBA to every official centre, via us. The data is being assembled by Agent C; this scaffold makes the placeholder addressable without locking the visual.

```html
<section class="section" id="visa-map-section" aria-labelledby="visa-map-title">
  <div class="container">
    <div class="section-head u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-i18n="visa.map.eyebrow">Centres officiels · Algérie</p>
      <h2 id="visa-map-title" class="section-head__title">
        <span data-i18n="visa.map.title_l1">D'où votre dossier</span>
        <em data-i18n="visa.map.title_em">est-il déposé ?</em>
      </h2>
      <p class="section-head__sub" data-i18n="visa.map.sub">…</p>
    </div>

    <div id="visa-map" role="img" data-i18n-aria-label="visa.map.a11y_label" aria-label="Carte des centres de visa en Algérie">
      <div class="tmap-fallback">
        <p class="tmap-fallback__title" data-i18n="visa.map.fallback_title">Chargement de la carte…</p>
        <p class="tmap-fallback__sub" data-i18n-html="visa.map.fallback_sub_html">VFS · BLS · TLScontact · CVASC · 3 agences Alliance Travel</p>
      </div>
    </div>

    <div class="trip-map-legend" role="list" aria-label="Légende de la carte" data-i18n-aria-label="visa.map.a11y_legend">
      <span class="trip-map-legend__item" role="listitem">
        <span class="trip-map-legend__chip trip-map-legend__chip--hotel" aria-hidden="true"></span>
        <span data-i18n="visa.map.legend_embassy">Ambassades</span>
      </span>
      <span class="trip-map-legend__item" role="listitem">
        <span class="trip-map-legend__chip trip-map-legend__chip--site" aria-hidden="true"></span>
        <span data-i18n="visa.map.legend_centre">VFS · BLS · TLScontact · CVASC</span>
      </span>
      <span class="trip-map-legend__item" role="listitem">
        <span class="trip-map-legend__chip trip-map-legend__chip--tour" aria-hidden="true"></span>
        <span data-i18n="visa.map.legend_agency">Agences Alliance Travel</span>
      </span>
    </div>
  </div>
</section>
```

**FR:**
- *eyebrow:* "Centres officiels · Algérie"
- *title_l1:* "D'où votre dossier"
- *title_em:* "est-il déposé ?"
- *sub:* "Vue d'ensemble des ambassades et centres VFS, BLS, TLScontact et CVASC implantés en Algérie, ainsi que nos trois agences. Vous voyez d'un coup d'œil le trajet que votre dossier prend — et celui que vous n'avez pas à faire."
- *fallback_title:* "Chargement de la carte…"
- *fallback_sub_html:* "VFS · BLS · TLScontact · CVASC · <strong>3 agences Alliance Travel</strong>"
- *legend_embassy:* "Ambassades"
- *legend_centre:* "VFS · BLS · TLScontact · CVASC"
- *legend_agency:* "Agences Alliance Travel"
- *a11y_label:* "Carte interactive des centres de visa et des agences Alliance Travel en Algérie"
- *a11y_legend:* "Légende des marqueurs de la carte"

**EN:**
- *eyebrow:* "Official centres · Algeria"
- *title_l1:* "Where your file"
- *title_em:* "is actually filed."
- *sub:* "An overview of the embassies and VFS, BLS, TLScontact and CVASC centres operating in Algeria, plus our three offices. You see the route your file takes — and the one you don't have to."
- *fallback_title:* "Map loading…"
- *fallback_sub_html:* "VFS · BLS · TLScontact · CVASC · <strong>3 Alliance Travel offices</strong>"
- *legend_embassy:* "Embassies"
- *legend_centre:* "VFS · BLS · TLScontact · CVASC"
- *legend_agency:* "Alliance Travel offices"
- *a11y_label:* "Interactive map of visa centres and Alliance Travel offices in Algeria"
- *a11y_legend:* "Map marker legend"

**AR:**
- *eyebrow:* "المراكز الرسميّة · الجزائر"
- *title_l1:* "أين يُودَع"
- *title_em:* "ملفُّك فعلاً؟"
- *sub:* "نظرة شاملة على السفارات ومراكز VFS و BLS و TLScontact و CVASC العاملة في الجزائر، إلى جانب مكاتبنا الثلاثة. ترى المسار الذي يسلكه ملفّك — والمسار الذي لن تضطرّ لقطعه بنفسك."
- *fallback_title:* "جارٍ تحميل الخريطة…"
- *fallback_sub_html:* "VFS · BLS · TLScontact · CVASC · <strong>ثلاثة مكاتب لأليانس ترافل</strong>"
- *legend_embassy:* "السفارات"
- *legend_centre:* "VFS · BLS · TLScontact · CVASC"
- *legend_agency:* "مكاتب أليانس ترافل"
- *a11y_label:* "خريطة تفاعليّة لمراكز التأشيرات ومكاتب أليانس ترافل في الجزائر"
- *a11y_legend:* "مفتاح علامات الخريطة"

**i18n keys:** `visa.map.{eyebrow,title_l1,title_em,sub,fallback_title,fallback_sub_html,legend_embassy,legend_centre,legend_agency,a11y_label,a11y_legend}`.

---

### Section 5 — FAQ (15 questions × FR/EN/AR)

**Intent:** Honest, exhaustive answers to the questions that come over WhatsApp daily. Reuses `.faq-list` / `.faq-item` / `.faq-q` / `.faq-a` exactly as they appear on `cairo-sharm/index.html`. Every answer that touches outcomes, fees, or timelines is hedged with the embassy as the decision-maker.

```html
<section class="section" id="faq" aria-labelledby="visa-faq-title">
  <div class="container">
    <div class="section-head u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-i18n="visa.faq.eyebrow">Questions fréquentes</p>
      <h2 id="visa-faq-title" class="section-head__title">
        <span data-i18n="visa.faq.title_l1">Ce que les gens</span>
        <em data-i18n="visa.faq.title_em">nous demandent.</em>
      </h2>
    </div>
    <div class="faq-list">
      <!-- repeat ×15 -->
      <div class="faq-item">
        <button class="faq-q" type="button" aria-expanded="false" aria-controls="faq-1-a" id="faq-1-q">
          <span data-i18n="visa.faq.q1.q">…</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-a" id="faq-1-a" role="region" aria-labelledby="faq-1-q">
          <p data-i18n="visa.faq.q1.a">…</p>
        </div>
      </div>
      <!-- /repeat -->
    </div>
  </div>
</section>
```

See **§4** below for the full Q+A table — 15 entries × 3 languages.

**i18n keys:** `visa.faq.{eyebrow,title_l1,title_em,q1..q15.{q,a}}`.

---

### Section 6 — Operational partners strip

**Intent:** Quiet logo strip with one honest line of context. Not "we are partners with VFS" — "VFS is the operational centre we file through." Reuses container + section-sm pattern; logos as `<img>` placeholders inside a flex list.

```html
<section class="section-sm visa-partners" aria-labelledby="visa-partners-title">
  <div class="container">
    <p class="section-head__eyebrow u-text-center" id="visa-partners-title" data-i18n="visa.partners.eyebrow">Partenaires opérationnels</p>
    <p class="visa-partners__disclaimer u-text-center u-measure-md u-mx-auto" data-i18n="visa.partners.disclaimer">Nous traitons vos dossiers via ces centres officiels — Alliance Travel n'est pas affilié à ces sociétés et n'agit pas en leur nom.</p>
    <ul class="visa-partners__list" role="list">
      <!-- TODO Agent C: source logos, store in assets/images/visa/partners/, fill data-i18n-aria-label keys per logo -->
      <li><img src="../assets/images/visa/partners/vfs-global.svg" alt="VFS Global" width="120" height="40" loading="lazy" /></li>
      <li><img src="../assets/images/visa/partners/bls-international.svg" alt="BLS International" width="120" height="40" loading="lazy" /></li>
      <li><img src="../assets/images/visa/partners/cvasc.svg" alt="CVASC" width="120" height="40" loading="lazy" /></li>
      <li><img src="../assets/images/visa/partners/tlscontact.svg" alt="TLScontact" width="120" height="40" loading="lazy" /></li>
    </ul>
  </div>
</section>
```

**FR:**
- *eyebrow:* "Partenaires opérationnels"
- *disclaimer:* "Nous traitons vos dossiers via ces centres officiels — Alliance Travel n'est pas affilié à ces sociétés et n'agit pas en leur nom."

**EN:**
- *eyebrow:* "Operational partners"
- *disclaimer:* "We process your files through these official centres — Alliance Travel is not affiliated with these companies and does not act on their behalf."

**AR:**
- *eyebrow:* "الشركاء التشغيليّون"
- *disclaimer:* "نُعالج ملفّاتكم عبر هذه المراكز الرسميّة — أليانس ترافل ليست تابعةً لهذه الشركات ولا تتصرّف باسمها."

**i18n keys:** `visa.partners.eyebrow`, `visa.partners.disclaimer`.

> **`[NEW CSS]`** required: `.visa-partners`, `.visa-partners__disclaimer`, `.visa-partners__list` — see §6.

---

### Section 7 — Final CTA (3-way contact)

**Intent:** Mirror the homepage "contact" pattern. Three columns: WhatsApp deep-link card · phone-card grid (reuse `.phone-card`) · 3-branch address block. The eyebrow + h2 anchor the "Prêt à démarrer ?" beat.

```html
<section class="section" id="visa-form" aria-labelledby="visa-cta-title">
  <div class="container">
    <div class="section-head u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-i18n="visa.cta.eyebrow">Prêt à démarrer ?</p>
      <h2 id="visa-cta-title" class="section-head__title">
        <span data-i18n="visa.cta.title_l1">Trois façons</span>
        <em data-i18n="visa.cta.title_em">de nous joindre.</em>
      </h2>
      <p class="section-head__sub" data-i18n="visa.cta.sub">…</p>
    </div>

    <div class="grid-cards grid-cards--lg visa-cta__grid">
      <article class="hl-card">
        <span class="hl-card__label" data-i18n="visa.cta.wa.tag">Le plus rapide</span>
        <h3 class="hl-card__title" data-i18n="visa.cta.wa.title">WhatsApp</h3>
        <p class="hl-card__body" data-i18n="visa.cta.wa.body">Réponse en moins de 30 minutes pendant les heures d'ouverture. Un conseiller arabophone disponible.</p>
        <a href="https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j'aimerais%20un%20devis%20pour%20un%20rendez-vous%20visa." class="btn btn--primary btn--wa" target="_blank" rel="noopener" data-i18n="visa.cta.wa.btn">Écrire sur WhatsApp</a>
      </article>

      <article class="hl-card">
        <span class="hl-card__label" data-i18n="visa.cta.phone.tag">Par téléphone</span>
        <h3 class="hl-card__title" data-i18n="visa.cta.phone.title">Lignes directes</h3>
        <ul class="phone-card-list" role="list">
          <!-- existing .phone-card markup, 3 conseillers -->
        </ul>
      </article>

      <article class="hl-card">
        <span class="hl-card__label" data-i18n="visa.cta.branch.tag">En agence</span>
        <h3 class="hl-card__title" data-i18n="visa.cta.branch.title">Passez nous voir</h3>
        <ul class="visa-cta__addresses" role="list">
          <li>
            <strong data-i18n="contact.hq_label">Siège · BBA La Graf</strong>
            <span>Bd. Houari Boumediene, La Graf</span>
          </li>
          <li>
            <strong data-i18n="contact.branch_zehour_label">BBA · Cité Zehour</strong>
            <span data-i18n="visa.cta.branch.zehour_addr">Cité Zehour</span>
          </li>
          <li>
            <strong data-i18n="contact.branch_msila_label">M'Sila</strong>
            <span data-i18n="contact.branch_msila_addr">Centre-ville</span>
          </li>
        </ul>
      </article>
    </div>
  </div>
</section>
```

**FR copy:**
- *eyebrow:* "Prêt à démarrer ?"
- *title_l1:* "Trois façons"
- *title_em:* "de nous joindre."
- *sub:* "Choisissez ce qui vous va. WhatsApp pour aller vite, un appel pour parler à un humain, ou un passage à l'agence si vous préférez le café qui va avec."
- *wa.tag:* "Le plus rapide"
- *wa.title:* "WhatsApp"
- *wa.body:* "Réponse en moins de 30 minutes pendant les heures d'ouverture. Un conseiller arabophone disponible."
- *wa.btn:* "Écrire sur WhatsApp"
- *phone.tag:* "Par téléphone"
- *phone.title:* "Lignes directes"
- *branch.tag:* "En agence"
- *branch.title:* "Passez nous voir"
- *branch.zehour_addr:* "Cité Zehour"

**EN copy:**
- *eyebrow:* "Ready to get started?"
- *title_l1:* "Three ways"
- *title_em:* "to reach us."
- *sub:* "Pick what suits you. WhatsApp for speed, a phone call for a real conversation, or walk into one of the offices if you want the coffee that comes with it."
- *wa.tag:* "Fastest"
- *wa.title:* "WhatsApp"
- *wa.body:* "Replies in under 30 minutes during opening hours. Arabic-speaking advisor available."
- *wa.btn:* "Message us"
- *phone.tag:* "By phone"
- *phone.title:* "Direct lines"
- *branch.tag:* "In person"
- *branch.title:* "Come on in"
- *branch.zehour_addr:* "Cité Zehour"

**AR copy:**
- *eyebrow:* "جاهز للبدء؟"
- *title_l1:* "ثلاث طرقٍ"
- *title_em:* "للتواصل معنا."
- *sub:* "اختر ما يناسبك. واتساب للسرعة، أو مكالمةٌ لتتحدّث مع إنسان، أو زرنا في المكتب إذا كنت تفضّل القهوة التي تأتي معها."
- *wa.tag:* "الأسرع"
- *wa.title:* "واتساب"
- *wa.body:* "نردّ في أقلّ من 30 دقيقة خلال أوقات العمل. مستشارٌ ناطقٌ بالعربيّة متوفّر."
- *wa.btn:* "راسلنا الآن"
- *phone.tag:* "عبر الهاتف"
- *phone.title:* "الخطوط المباشرة"
- *branch.tag:* "في المكتب"
- *branch.title:* "تفضّلوا بزيارتنا"
- *branch.zehour_addr:* "حيّ الزهور"

**i18n keys:** `visa.cta.{eyebrow,title_l1,title_em,sub,wa.{tag,title,body,btn},phone.{tag,title},branch.{tag,title,zehour_addr}}`.

> **`[NEW CSS]`** required: `.visa-cta__grid`, `.visa-cta__addresses`, `.phone-card-list` (a list wrapper inside `hl-card`) — see §6.

---

### Section 8 — Sticky bottom contact bar (mobile only)

**Intent:** Constant access to WhatsApp + phone while the user scrolls the page on mobile. Reuses the existing `.trip-sticky-bar` class (already responsive-only, already z-indexed, already 44px touch targets), but the visa page declares its own content. Add a body class — `body.has-visa-stickybar` — so other pages aren't affected.

```html
<aside class="trip-sticky-bar trip-sticky-bar--visa" role="complementary" aria-label="Contact rapide" data-i18n-aria-label="visa.sticky.a11y_label">
  <a href="https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j'aimerais%20un%20devis%20pour%20un%20rendez-vous%20visa." class="btn btn--primary btn--wa" target="_blank" rel="noopener" data-i18n="visa.sticky.wa">WhatsApp</a>
  <a href="tel:+213561616266" class="btn btn--ghost" data-i18n="visa.sticky.call">Appeler</a>
</aside>
```

**FR:**
- *a11y_label:* "Contact rapide"
- *wa:* "WhatsApp"
- *call:* "Appeler"

**EN:**
- *a11y_label:* "Quick contact"
- *wa:* "WhatsApp"
- *call:* "Call"

**AR:**
- *a11y_label:* "تواصلٌ سريع"
- *wa:* "واتساب"
- *call:* "اتّصل"

**i18n keys:** `visa.sticky.{a11y_label,wa,call}`.

> **`[NEW CSS]`** required: `.trip-sticky-bar--visa` modifier (variant of existing `.trip-sticky-bar`) so existing trip pages aren't affected. See §6.

---

## 3. New i18n dictionary keys — `visa: { … }` block

Paste this into `site/assets/js/i18n.js` inside each of the three language blocks (`fr`, `en`, `ar`), plus the four `meta.visa.*` entries. ~108 keys total.

```js
// ─── ADD TO T.fr ────────────────────────────────────────────
visa: {
  hero: {
    eyebrow: "Service Rendez-vous Visa · Bordj Bou Arreridj",
    title_l1: "Votre rendez-vous visa,",
    title_em: "pris en charge de A à Z.",
    lede: "On réserve votre RDV à l'ambassade ou au centre VFS, on prépare votre dossier complet, et — selon les règles du consulat — on dépose le dossier pour vous. Vous restez à Bordj, on fait la route. 10 pays couverts. Devis personnalisé sur WhatsApp.",
    cta_wa: "WhatsApp un conseiller",
    cta_form: "Demander un devis",
    trust_branches: "3 agences physiques · BBA & M'Sila",
    trust_no_alger: "Pas besoin de monter à Alger",
    trust_since: "Depuis 2019 · 1 200+ dossiers traités"
  },
  services: {
    eyebrow: "Nos prestations",
    title_l1: "Trois niveaux,",
    title_em: "vous choisissez.",
    sub: "Du simple créneau réservé jusqu'au dépôt physique du dossier, vous prenez exactement ce dont vous avez besoin — et rien de plus.",
    tier1: { tag: "Niveau 1", title: "Réservation du RDV", body: "On bloque votre créneau au consulat, à VFS, BLS, TLScontact ou CVASC selon le pays demandé. Vous recevez la confirmation du rendez-vous par WhatsApp avec les justificatifs à imprimer.", cta: "WhatsApp pour ce service" },
    tier2: { tag: "Niveau 2", title: "Préparation complète du dossier", body: "Relecture point par point de chaque document, attestations, formulaires, traductions, photos aux normes, lettres d'invitation. Vous arrivez au guichet avec un dossier propre et complet — pas de surprise à l'accueil.", cta: "WhatsApp pour ce service" },
    tier3: { tag: "Niveau 3", title: "Dépôt physique du dossier", body: "Là où le consulat l'autorise, on remet votre dossier au guichet à votre place. Vous restez à Bordj, on fait la route. Service non disponible quand la présence du demandeur est exigée (biométrie, entretien).", cta: "WhatsApp pour ce service" }
  },
  countries: {
    eyebrow: "Pays couverts",
    title_l1: "Dix pays,",
    title_em: "un seul interlocuteur.",
    sub: "Cliquez sur un pays pour voir le centre de traitement (ambassade, VFS, BLS, TLScontact ou CVASC) et les niveaux de service que nous prenons en charge. La biométrie et les entretiens restent obligatoirement en présentiel — c'est le consulat qui décide.",
    chip: { tier1: "RDV", tier2: "Dossier", tier3: "Dépôt" },
    cta_wa: "WhatsApp pour ce pays",
    a11y_tiers: "Niveaux de service disponibles",
    france:           { name: "France",            provider: "", notes: "" },  // Agent A
    turkiye:          { name: "Türkiye",           provider: "", notes: "" },
    allemagne:        { name: "Allemagne",         provider: "", notes: "" },
    espagne:          { name: "Espagne",           provider: "", notes: "" },
    chine:            { name: "Chine",             provider: "", notes: "" },
    russie:           { name: "Russie",            provider: "", notes: "" },
    egypte:           { name: "Égypte",            provider: "", notes: "" },
    arabie_saoudite:  { name: "Arabie Saoudite",   provider: "", notes: "" },
    etats_unis:       { name: "États-Unis",        provider: "", notes: "" },
    canada:           { name: "Canada",            provider: "", notes: "" }
  },
  map: {
    eyebrow: "Centres officiels · Algérie",
    title_l1: "D'où votre dossier",
    title_em: "est-il déposé ?",
    sub: "Vue d'ensemble des ambassades et centres VFS, BLS, TLScontact et CVASC implantés en Algérie, ainsi que nos trois agences. Vous voyez d'un coup d'œil le trajet que votre dossier prend — et celui que vous n'avez pas à faire.",
    fallback_title: "Chargement de la carte…",
    fallback_sub_html: "VFS · BLS · TLScontact · CVASC · <strong>3 agences Alliance Travel</strong>",
    legend_embassy: "Ambassades",
    legend_centre: "VFS · BLS · TLScontact · CVASC",
    legend_agency: "Agences Alliance Travel",
    a11y_label: "Carte interactive des centres de visa et des agences Alliance Travel en Algérie",
    a11y_legend: "Légende des marqueurs de la carte"
  },
  faq: {
    eyebrow: "Questions fréquentes",
    title_l1: "Ce que les gens",
    title_em: "nous demandent.",
    q1:  { q: "Combien de temps faut-il pour obtenir un visa Schengen ?",                                a: "Le délai dépend entièrement du consulat et de la période de l'année. Nous ne pouvons pas le garantir : nous indiquons les délais constatés sur les derniers mois, et nous calons votre dépôt aussi tôt que possible." },
    q2:  { q: "Mon visa peut-il être refusé ?",                                                          a: "Oui. La décision appartient au consulat, et personne d'autre — agence, intermédiaire, sponsor — ne peut promettre l'inverse. Notre rôle est de présenter un dossier propre et complet ; la décision finale reste hors de notre contrôle." },
    q3:  { q: "Combien coûte le service ?",                                                              a: "Le tarif dépend du pays, du niveau de service choisi (RDV seul, dossier complet, ou dépôt) et de votre situation. On vous fait un devis personnalisé sur WhatsApp en moins de 30 minutes." },
    q4:  { q: "Quels documents dois-je apporter ?",                                                      a: "La liste varie par consulat et par type de visa : passeport en cours de validité, justificatifs de revenus, attestation d'hébergement ou réservation d'hôtel, assurance, photos aux normes. On vous envoie la liste exacte une fois votre pays confirmé." },
    q5:  { q: "Vais-je récupérer mon dossier en cas de refus ?",                                         a: "Le passeport et les documents originaux vous sont restitués par le consulat ou le centre de dépôt, refus ou pas. Les frais de visa déjà payés au consulat ne sont en revanche jamais remboursés — c'est la règle officielle, pas la nôtre." },
    q6:  { q: "Quels pays acceptent les Algériens sans visa ?",                                          a: "Au moment où nous écrivons ces lignes : Tunisie, Maroc, Mauritanie, Syrie, Liban, Jordanie (sous conditions), Kenya, Maldives, plusieurs îles des Caraïbes et quelques pays d'Asie du Sud-Est. Cette liste évolue — vérifiez avec nous avant de réserver." },
    q7:  { q: "Acceptez-vous les dossiers Umrah ?",                                                      a: "L'Umrah est encadrée en Algérie par un agrément officiel distinct du nôtre. Selon votre cas, nous vous orientons vers une agence agréée Umrah pour la partie pèlerinage. Le visa touristique pour l'Arabie Saoudite (hors Umrah/Hajj) reste dans notre périmètre." },
    q8:  { q: "Combien de temps avant le voyage dois-je faire la demande ?",                             a: "Le plus tôt possible — au minimum 6 à 8 semaines avant la date de départ pour un Schengen, parfois plus pour les pays à forte affluence. Plus on s'y prend tôt, plus on a de marge en cas de demande complémentaire du consulat." },
    q9:  { q: "Quelle est la différence entre VFS, BLS, TLScontact et CVASC ?",                          a: "Ce sont des prestataires privés à qui les ambassades sous-traitent l'accueil des demandeurs : prise de RDV, dépôt des dossiers, biométrie. Chaque consulat choisit son centre — VFS travaille pour beaucoup de pays, BLS pour d'autres, TLScontact pour la France, CVASC pour la Russie. On vous oriente automatiquement vers le bon." },
    q10: { q: "Faut-il un certificat médical ou une assurance voyage ?",                                 a: "L'assurance voyage est obligatoire pour les visas Schengen (couverture minimum 30 000 €) et fortement recommandée ailleurs. Le certificat médical n'est exigé que pour certains pays (long séjour, étudiant). On vous indique exactement ce qui s'applique à votre dossier." },
    q11: { q: "Puis-je déposer le dossier moi-même ?",                                                   a: "Oui, totalement. C'est même la règle quand la biométrie ou un entretien sont obligatoires. Notre prestation \"dépôt physique\" est un service de confort là où le consulat l'autorise, pas une exclusivité — vous restez libre de monter à Alger si vous préférez." },
    q12: { q: "Travaillez-vous avec des dossiers pour étudiants ?",                                      a: "Oui. Le visa étudiant a ses spécificités (lettre d'admission, justificatifs de moyens financiers, parfois Campus France pour la France). On vous accompagne du calage du RDV jusqu'au dépôt, et on vous indique les pièces propres à votre université d'accueil." },
    q13: { q: "Que se passe-t-il si l'ambassade demande des documents supplémentaires ?",                 a: "On vous prévient immédiatement sur WhatsApp, on liste précisément ce qui est demandé, et on vous aide à le constituer. Selon le pays, on peut compléter le dossier en cours ou reprendre un RDV — on gère le suivi jusqu'au bout." },
    q14: { q: "Êtes-vous une agence officielle ou un intermédiaire ?",                                   a: "Alliance Travel est une agence de voyages agréée, immatriculée à Bordj Bou Arreridj, en activité depuis 2019, avec trois agences physiques. Nous ne sommes ni partenaires officiels ni représentants des consulats : nous accompagnons votre demande en tant qu'agence de service." },
    q15: { q: "Comment se passe le suivi de mon dossier ?",                                              a: "Un conseiller dédié vous suit sur WhatsApp du début à la fin : confirmation du RDV, checklist, validation du dossier, point d'étape avant le dépôt, et retour quand votre passeport est prêt à être récupéré." }
  },
  partners: {
    eyebrow: "Partenaires opérationnels",
    disclaimer: "Nous traitons vos dossiers via ces centres officiels — Alliance Travel n'est pas affilié à ces sociétés et n'agit pas en leur nom."
  },
  cta: {
    eyebrow: "Prêt à démarrer ?",
    title_l1: "Trois façons",
    title_em: "de nous joindre.",
    sub: "Choisissez ce qui vous va. WhatsApp pour aller vite, un appel pour parler à un humain, ou un passage à l'agence si vous préférez le café qui va avec.",
    wa:     { tag: "Le plus rapide", title: "WhatsApp",        body: "Réponse en moins de 30 minutes pendant les heures d'ouverture. Un conseiller arabophone disponible.", btn: "Écrire sur WhatsApp" },
    phone:  { tag: "Par téléphone",  title: "Lignes directes" },
    branch: { tag: "En agence",      title: "Passez nous voir", zehour_addr: "Cité Zehour" }
  },
  sticky: {
    a11y_label: "Contact rapide",
    wa: "WhatsApp",
    call: "Appeler"
  }
}

// ─── ADD TO T.en ────────────────────────────────────────────
visa: {
  hero: {
    eyebrow: "Visa Appointment Service · Bordj Bou Arreridj",
    title_l1: "Your visa appointment,",
    title_em: "handled end-to-end.",
    lede: "We book your embassy or VFS appointment, prepare the full dossier, and — where the consulate allows it — drop the file off for you. You stay in Bordj; we make the trip. Ten countries covered. Personalised quote on WhatsApp.",
    cta_wa: "Message an advisor",
    cta_form: "Request a quote",
    trust_branches: "Three offices on the ground · BBA & M'Sila",
    trust_no_alger: "No trip to Algiers needed",
    trust_since: "Operating since 2019 · 1,200+ files processed"
  },
  services: {
    eyebrow: "Our services",
    title_l1: "Three tiers,",
    title_em: "your call.",
    sub: "From a booked slot to physical drop-off, take exactly what you need — nothing more.",
    tier1: { tag: "Tier 1", title: "Appointment booking",         body: "We secure your slot at the consulate, VFS, BLS, TLScontact or CVASC depending on the country. You get the confirmation on WhatsApp with the supporting documents ready to print.", cta: "Message us about this" },
    tier2: { tag: "Tier 2", title: "Full dossier preparation",    body: "We review every document line by line: certificates, forms, translations, regulation-compliant photos, invitation letters. You arrive at the counter with a clean, complete file — no surprises at intake.", cta: "Message us about this" },
    tier3: { tag: "Tier 3", title: "Physical drop-off",            body: "Where the consulate permits, we hand in your file at the counter on your behalf. You stay in Bordj; we make the trip. Not available when the applicant must appear in person (biometrics, interview).", cta: "Message us about this" }
  },
  countries: {
    eyebrow: "Countries covered",
    title_l1: "Ten countries,",
    title_em: "one point of contact.",
    sub: "Tap a country to see the processing centre (embassy, VFS, BLS, TLScontact or CVASC) and which service tiers we provide. Biometrics and interviews always remain in person — that's the consulate's call.",
    chip: { tier1: "RDV", tier2: "Dossier", tier3: "Drop-off" },
    cta_wa: "Message us about this country",
    a11y_tiers: "Service tiers available",
    france: { name: "France", provider: "", notes: "" },
    turkiye: { name: "Türkiye", provider: "", notes: "" },
    allemagne: { name: "Germany", provider: "", notes: "" },
    espagne: { name: "Spain", provider: "", notes: "" },
    chine: { name: "China", provider: "", notes: "" },
    russie: { name: "Russia", provider: "", notes: "" },
    egypte: { name: "Egypt", provider: "", notes: "" },
    arabie_saoudite: { name: "Saudi Arabia", provider: "", notes: "" },
    etats_unis: { name: "United States", provider: "", notes: "" },
    canada: { name: "Canada", provider: "", notes: "" }
  },
  map: {
    eyebrow: "Official centres · Algeria",
    title_l1: "Where your file",
    title_em: "is actually filed.",
    sub: "An overview of the embassies and VFS, BLS, TLScontact and CVASC centres operating in Algeria, plus our three offices. You see the route your file takes — and the one you don't have to.",
    fallback_title: "Map loading…",
    fallback_sub_html: "VFS · BLS · TLScontact · CVASC · <strong>3 Alliance Travel offices</strong>",
    legend_embassy: "Embassies",
    legend_centre: "VFS · BLS · TLScontact · CVASC",
    legend_agency: "Alliance Travel offices",
    a11y_label: "Interactive map of visa centres and Alliance Travel offices in Algeria",
    a11y_legend: "Map marker legend"
  },
  faq: {
    eyebrow: "Frequently asked questions",
    title_l1: "What people",
    title_em: "ask us.",
    q1:  { q: "How long does a Schengen visa take?",                                                                a: "The lead time depends entirely on the consulate and the time of year. We can't guarantee it: we share the durations observed over recent months and we file your application as early as possible." },
    q2:  { q: "Can my visa be refused?",                                                                            a: "Yes. The decision belongs to the consulate, and no one else — agency, intermediary, sponsor — can promise otherwise. Our job is to present a clean, complete file; the final call stays out of our hands." },
    q3:  { q: "How much does the service cost?",                                                                    a: "The fee depends on the country, the tier you choose (booking only, full dossier, drop-off) and your situation. You get a personalised quote on WhatsApp in under 30 minutes." },
    q4:  { q: "Which documents do I need to bring?",                                                                a: "The list varies by consulate and visa type: valid passport, proof of income, hotel reservation or invitation letter, insurance, regulation photos. We send you the exact list as soon as your destination is confirmed." },
    q5:  { q: "Will I get my documents back if I'm refused?",                                                       a: "Your passport and original documents are returned to you by the consulate or the visa centre, refusal or not. The visa fee paid to the consulate, however, is never refunded — that's official policy, not ours." },
    q6:  { q: "Which countries can Algerians enter without a visa?",                                                a: "At the time of writing: Tunisia, Morocco, Mauritania, Syria, Lebanon, Jordan (conditional), Kenya, the Maldives, several Caribbean islands and a few Southeast Asian countries. This list shifts — check with us before booking flights." },
    q7:  { q: "Do you handle Umrah files?",                                                                         a: "Umrah is governed in Algeria by a separate official licence we don't hold. Depending on your case, we'll direct you to a licensed Umrah agency for the pilgrimage leg. Saudi tourist visas (outside Umrah/Hajj) remain within our scope." },
    q8:  { q: "How far in advance should I apply?",                                                                  a: "As early as possible — at least 6 to 8 weeks before your departure date for Schengen, sometimes more for high-demand consulates. The earlier we start, the more cushion you have if the consulate asks for extra documents." },
    q9:  { q: "What's the difference between VFS, BLS, TLScontact and CVASC?",                                       a: "They're private providers that embassies outsource intake to: booking, file drop-off, biometrics. Each consulate picks its own — VFS handles many countries, BLS others, TLScontact for France, CVASC for Russia. We route you to the right one automatically." },
    q10: { q: "Do I need a medical certificate or travel insurance?",                                                 a: "Travel insurance is mandatory for Schengen visas (minimum €30,000 coverage) and strongly recommended elsewhere. A medical certificate is only required for certain countries (long-stay, student). We tell you exactly what applies to your file." },
    q11: { q: "Can I drop the file off myself?",                                                                      a: "Yes, absolutely. It's even the rule when biometrics or an interview are mandatory. Our 'physical drop-off' service is a convenience where the consulate allows it, not an exclusivity — you're free to head to Algiers if you prefer." },
    q12: { q: "Do you handle student files?",                                                                         a: "Yes. Student visas have their own requirements (admission letter, proof of funds, sometimes Campus France for France). We accompany you from booking to drop-off and tell you which documents your host university expects." },
    q13: { q: "What if the embassy asks for extra documents?",                                                        a: "We let you know immediately on WhatsApp, list exactly what's needed, and help you put it together. Depending on the country we can complete the open file or rebook an appointment — we follow it through to the end." },
    q14: { q: "Are you an official agency or an intermediary?",                                                       a: "Alliance Travel is a licensed travel agency, registered in Bordj Bou Arreridj, operating since 2019, with three physical offices. We are neither an official partner nor a representative of any consulate: we accompany your application as a service agency." },
    q15: { q: "How is my file tracked?",                                                                              a: "A dedicated advisor follows you on WhatsApp from start to finish: appointment confirmation, checklist, file validation, pre-drop check-in, and a message when your passport is ready to collect." }
  },
  partners: {
    eyebrow: "Operational partners",
    disclaimer: "We process your files through these official centres — Alliance Travel is not affiliated with these companies and does not act on their behalf."
  },
  cta: {
    eyebrow: "Ready to get started?",
    title_l1: "Three ways",
    title_em: "to reach us.",
    sub: "Pick what suits you. WhatsApp for speed, a phone call for a real conversation, or walk into one of the offices if you want the coffee that comes with it.",
    wa:     { tag: "Fastest",   title: "WhatsApp",     body: "Replies in under 30 minutes during opening hours. Arabic-speaking advisor available.", btn: "Message us" },
    phone:  { tag: "By phone",  title: "Direct lines" },
    branch: { tag: "In person", title: "Come on in",   zehour_addr: "Cité Zehour" }
  },
  sticky: {
    a11y_label: "Quick contact",
    wa: "WhatsApp",
    call: "Call"
  }
}

// ─── ADD TO T.ar ────────────────────────────────────────────
visa: {
  hero: {
    eyebrow: "خدمة مواعيد التأشيرة · برج بوعريريج",
    title_l1: "نتكفّل بموعد تأشيرتك",
    title_em: "من الألف إلى الياء.",
    lede: "نحجز لك موعدك في السفارة أو في مركز VFS، ونُعدّ ملفّك كاملاً، ونتولّى الإيداع نيابةً عنك حيث تسمح السفارة بذلك. أنت تبقى في برج، ونحن نتكفّل بالتنقّل. عشر دول مغطّاة. تقديرٌ مخصّص عبر واتساب.",
    cta_wa: "تواصل عبر واتساب",
    cta_form: "اطلب تقديراً",
    trust_branches: "ثلاثة مكاتب فعليّة · برج بوعريريج والمسيلة",
    trust_no_alger: "بدون التنقّل إلى العاصمة",
    trust_since: "نعمل منذ 2019 · أكثر من 1 200 ملف"
  },
  services: {
    eyebrow: "خدماتنا",
    title_l1: "ثلاثة مستويات،",
    title_em: "والاختيار لك.",
    sub: "من حجز الموعد فقط إلى إيداع الملف فعليّاً، تأخذ ما تحتاجه بالضبط — لا أكثر.",
    tier1: { tag: "المستوى الأوّل", title: "حجز الموعد",            body: "نحجز لك الموعد في القنصلية أو في مراكز VFS و BLS و TLScontact و CVASC حسب الدولة المطلوبة. تصلك التأكيدة عبر واتساب مرفقةً بالوثائق الجاهزة للطباعة.", cta: "تواصل عبر واتساب" },
    tier2: { tag: "المستوى الثاني", title: "تجهيز الملف كاملاً",     body: "نراجع كلّ وثيقة بدقّة: الشهادات، الاستمارات، الترجمات، الصور المطابقة للمعايير، رسائل الدعوة. تصل إلى الشبّاك بملفٍّ نظيفٍ وكامل — دون مفاجآت عند الاستقبال.", cta: "تواصل عبر واتساب" },
    tier3: { tag: "المستوى الثالث", title: "إيداع الملف نيابةً عنك", body: "حيث تسمح القنصلية بذلك، نسلّم ملفّك إلى الشبّاك بدلاً منك. تبقى في برج، ونحن نتنقّل. هذه الخدمة غير متاحة عندما يستوجب حضور الطالب شخصيّاً (البصمات أو المقابلة).", cta: "تواصل عبر واتساب" }
  },
  countries: {
    eyebrow: "الدول المغطّاة",
    title_l1: "عشر دول،",
    title_em: "ومركز اتصالٍ واحد.",
    sub: "اضغط على دولة لمعرفة مركز المعالجة (السفارة، VFS، BLS، TLScontact أو CVASC) والمستويات التي نتكفّل بها. تبقى البصمات والمقابلات حضوريّةً وجوبيّاً — هذا قرار القنصلية.",
    chip: { tier1: "الموعد", tier2: "الملف", tier3: "الإيداع" },
    cta_wa: "تواصل عبر واتساب لهذه الدولة",
    a11y_tiers: "مستويات الخدمة المتاحة",
    france:          { name: "فرنسا",            provider: "", notes: "" },
    turkiye:         { name: "تركيا",            provider: "", notes: "" },
    allemagne:       { name: "ألمانيا",          provider: "", notes: "" },
    espagne:         { name: "إسبانيا",          provider: "", notes: "" },
    chine:           { name: "الصين",            provider: "", notes: "" },
    russie:          { name: "روسيا",            provider: "", notes: "" },
    egypte:          { name: "مصر",              provider: "", notes: "" },
    arabie_saoudite: { name: "المملكة العربيّة السعوديّة", provider: "", notes: "" },
    etats_unis:      { name: "الولايات المتّحدة الأمريكيّة", provider: "", notes: "" },
    canada:          { name: "كندا",             provider: "", notes: "" }
  },
  map: {
    eyebrow: "المراكز الرسميّة · الجزائر",
    title_l1: "أين يُودَع",
    title_em: "ملفُّك فعلاً؟",
    sub: "نظرة شاملة على السفارات ومراكز VFS و BLS و TLScontact و CVASC العاملة في الجزائر، إلى جانب مكاتبنا الثلاثة. ترى المسار الذي يسلكه ملفّك — والمسار الذي لن تضطرّ لقطعه بنفسك.",
    fallback_title: "جارٍ تحميل الخريطة…",
    fallback_sub_html: "VFS · BLS · TLScontact · CVASC · <strong>ثلاثة مكاتب لأليانس ترافل</strong>",
    legend_embassy: "السفارات",
    legend_centre: "VFS · BLS · TLScontact · CVASC",
    legend_agency: "مكاتب أليانس ترافل",
    a11y_label: "خريطة تفاعليّة لمراكز التأشيرات ومكاتب أليانس ترافل في الجزائر",
    a11y_legend: "مفتاح علامات الخريطة"
  },
  faq: {
    eyebrow: "الأسئلة المتداولة",
    title_l1: "ما يسأله",
    title_em: "الناس عنده.",
    q1:  { q: "كم تستغرق تأشيرة شنغن؟",                                                                  a: "تتوقّف المدّة كلّيّاً على القنصلية والفترة من السنة. لا يمكننا ضمانها: نُطلِعك على المدد المُلاحَظة خلال الأشهر الأخيرة، ونحرص على تقديم ملفّك في أقرب وقت ممكن." },
    q2:  { q: "هل يمكن رفض تأشيرتي؟",                                                                    a: "نعم. القرار يعود إلى القنصلية، ولا يحقّ لأيّ طرفٍ آخر — وكالة أو وسيط أو كافل — أن يَعِد بعكس ذلك. دورنا تقديم ملفٍّ نظيفٍ وكامل، والقرار النهائيّ يبقى خارج سيطرتنا." },
    q3:  { q: "كم تبلغ تكلفة الخدمة؟",                                                                   a: "تختلف حسب الدولة والمستوى المختار (الموعد فقط، أو الملف كاملاً، أو الإيداع) ووضعك الشخصيّ. نُعدّ لك تقديراً مخصّصاً عبر واتساب في أقلّ من 30 دقيقة." },
    q4:  { q: "ما الوثائق التي يجب إحضارها؟",                                                            a: "تختلف القائمة حسب القنصلية ونوع التأشيرة: جواز سفرٍ ساري، إثبات الدخل، حجز فندقي أو رسالة دعوة، تأمين، صورٌ مطابقة للمعايير. نُرسل القائمة الدقيقة فور تأكيد وجهتك." },
    q5:  { q: "هل أستردّ ملفّي في حال الرفض؟",                                                           a: "يُعاد إليك جوازُ السفر والوثائق الأصليّة من القنصلية أو مركز الإيداع، سواءٌ قُبِل الطلب أو رُفِض. أمّا رسوم التأشيرة المدفوعة للقنصلية فلا تُسترَدّ مطلقاً — هذه قاعدة رسميّة، ليست قاعدتنا." },
    q6:  { q: "ما الدول التي تقبل الجزائريّين بدون تأشيرة؟",                                              a: "وقت كتابة هذه السطور: تونس، المغرب، موريتانيا، سوريا، لبنان، الأردن (بشروط)، كينيا، المالديف، عدّةُ جزرٍ كاريبيّة، وبعض دول جنوب شرق آسيا. القائمة تتغيّر — تحقّق معنا قبل حجز التذاكر." },
    q7:  { q: "هل تتكفّلون بملفّات العمرة؟",                                                              a: "العمرة في الجزائر يحكمها اعتمادٌ رسميٌّ مستقلّ لا نملكه. حسب حالتك، نوجّهك إلى وكالةٍ معتمَدةٍ للعمرة لتولّي شقّ الحج. أمّا التأشيرة السياحيّة إلى المملكة العربيّة السعوديّة (خارج العمرة والحجّ) فتدخل ضمن نطاق خدماتنا." },
    q8:  { q: "متى يجب أن أبدأ الإجراءات قبل السفر؟",                                                     a: "في أبكر وقتٍ ممكن — على الأقلّ ستّةً إلى ثمانية أسابيع قبل تاريخ السفر بالنسبة لشنغن، وأحياناً أكثر في القنصليّات ذات الإقبال العالي. كلّما بدأنا مبكّراً، اتّسع هامش التحرّك إذا طلبت القنصلية وثائق إضافيّة." },
    q9:  { q: "ما الفرق بين VFS و BLS و TLScontact و CVASC؟",                                            a: "هي شركاتٌ خاصّة تُسنِد إليها السفارات استقبالَ الطالبين: الحجز، الإيداع، البصمات. كلّ قنصليّةٍ تختار شريكها — VFS لكثيرٍ من الدول، BLS لأخرى، TLScontact لفرنسا، CVASC لروسيا. نوجّهك تلقائيّاً إلى المركز الصحيح." },
    q10: { q: "هل يلزم تأمينُ السفر أو شهادةٌ طبّيّة؟",                                                   a: "تأمين السفر إلزاميٌّ في تأشيرات شنغن (تغطيةٌ لا تقلّ عن 30 000 يورو) ويُنصح به بقوّةٍ في باقي الوجهات. الشهادة الطبّيّة لا تُطلب إلّا في بعض الدول (الإقامة الطويلة، الدراسة). نُحدّد لك بدقّة ما يَنطبق على ملفّك." },
    q11: { q: "هل بإمكاني إيداع الملف بنفسي؟",                                                            a: "نعم، تماماً. بل إنّها القاعدة عندما تكون البصمات أو المقابلة إلزاميّتين. خدمة الإيداع لدينا هي خدمةُ راحةٍ حيث تسمح القنصلية، وليست حصراً — يبقى لك حقّ التنقّل إلى العاصمة إن فضّلت." },
    q12: { q: "هل تتعاملون مع ملفّات الطلبة؟",                                                            a: "نعم. لتأشيرة الدراسة خصوصيّاتُها (رسالة القبول، إثبات الموارد الماليّة، أحياناً Campus France بالنسبة لفرنسا). نرافقك من حجز الموعد إلى الإيداع، ونُبيّن لك الوثائق التي تطلبها جامعتُك المضيفة." },
    q13: { q: "ماذا يحدث إذا طلبت السفارة وثائق إضافيّة؟",                                                 a: "نُعلمك على الفور عبر واتساب، ونعدّد لك بدقّةٍ المطلوب، ونساعدك على تجهيزه. بحسب الدولة، إمّا نُكمل الملف الجاري أو نعيد حجز الموعد — نتابع المسار إلى النهاية." },
    q14: { q: "هل أنتم وكالةٌ رسميّة أم وسيط؟",                                                            a: "أليانس ترافل وكالةُ أسفارٍ معتمَدة، مسجّلةٌ في برج بوعريريج، تنشط منذ 2019، ولها ثلاثةُ مكاتبَ فعليّة. لسنا شريكاً رسميّاً ولا ممثّلاً لأيّ قنصلية: نرافق طلبك بوصفنا وكالة خدمة." },
    q15: { q: "كيف يتمّ متابعة ملفّي؟",                                                                   a: "مستشارٌ متفرّغ يرافقك على واتساب من البداية إلى النهاية: تأكيد الموعد، قائمة الوثائق، مراجعة الملف، نقطةُ تواصلٍ قبيل الإيداع، ورسالةٌ حين يصبح جواز سفرك جاهزاً للاستلام." }
  },
  partners: {
    eyebrow: "الشركاء التشغيليّون",
    disclaimer: "نُعالج ملفّاتكم عبر هذه المراكز الرسميّة — أليانس ترافل ليست تابعةً لهذه الشركات ولا تتصرّف باسمها."
  },
  cta: {
    eyebrow: "جاهز للبدء؟",
    title_l1: "ثلاث طرقٍ",
    title_em: "للتواصل معنا.",
    sub: "اختر ما يناسبك. واتساب للسرعة، أو مكالمةٌ لتتحدّث مع إنسان، أو زرنا في المكتب إذا كنت تفضّل القهوة التي تأتي معها.",
    wa:     { tag: "الأسرع",        title: "واتساب",          body: "نردّ في أقلّ من 30 دقيقة خلال أوقات العمل. مستشارٌ ناطقٌ بالعربيّة متوفّر.", btn: "راسلنا الآن" },
    phone:  { tag: "عبر الهاتف",   title: "الخطوط المباشرة" },
    branch: { tag: "في المكتب",    title: "تفضّلوا بزيارتنا", zehour_addr: "حيّ الزهور" }
  },
  sticky: {
    a11y_label: "تواصلٌ سريع",
    wa: "واتساب",
    call: "اتّصل"
  }
}

// ─── ADD TO T.fr.meta, T.en.meta, T.ar.meta ─────────────────
// T.fr.meta.visa
visa: {
  title: "Rendez-vous Visa · Alliance Travel · Bordj Bou Arreridj",
  description: "Réservation de RDV ambassade et VFS, préparation complète de dossier, dépôt physique selon ambassade. 10 pays couverts depuis Bordj Bou Arreridj — pas besoin de monter à Alger.",
  og_title: "Rendez-vous Visa · Alliance Travel",
  og_description: "On s'occupe du RDV, du dossier et du dépôt — vous restez à Bordj. 10 pays · réponse WhatsApp en 30 min."
}

// T.en.meta.visa
visa: {
  title: "Visa Appointments & Dossier Service — Alliance Travel · BBA",
  description: "We book embassy and VFS appointments, prepare the full dossier, and handle drop-off where the consulate allows it. Ten countries served from Bordj Bou Arreridj — no trip to Algiers required.",
  og_title: "Visa Appointments — Alliance Travel",
  og_description: "RDV, dossier, drop-off — we handle it from Bordj. Ten countries · 30-min WhatsApp reply."
}

// T.ar.meta.visa
visa: {
  title: "خدمة موعد التأشيرة وتجهيز الملف — أليانس ترافل · برج بوعريريج",
  description: "نحجز مواعيد السفارات ومراكز VFS، نُعدّ الملف كاملاً، ونُودِعه نيابةً عنك حيث تسمح السفارة. عشر دول من برج بوعريريج — دون الحاجة للتنقّل إلى الجزائر العاصمة.",
  og_title: "خدمة موعد التأشيرة — أليانس ترافل",
  og_description: "الموعد، الملف، الإيداع — كلّه من برج. عشر دول · ردّ خلال 30 دقيقة على واتساب."
}
```

**Key counts:** hero 9 · services 22 · countries 36 (10 names + 10 provider + 10 notes + 6 chrome) · map 11 · faq 33 (15×{q,a} + 3 header) · partners 2 · cta 14 · sticky 3 · meta 12 (4 per lang) ≈ **142** key paths total (including per-country `provider`/`notes` slots Agent A will fill).

---

## 4. FAQ — 15 questions × 3 languages

See full Q+A copy embedded in the `visa.faq.q1..q15` blocks in §3 above. Quick index:

| # | Topic (FR slug)                          | Source |
|---|------------------------------------------|--------|
| 1 | Délai Schengen                           | required |
| 2 | Refus possible                           | required |
| 3 | Coût du service                          | required |
| 4 | Documents à apporter                     | required |
| 5 | Dossier en cas de refus                  | required |
| 6 | Pays sans visa pour Algériens            | required |
| 7 | Umrah                                    | required |
| 8 | Anticipation du dépôt                    | required |
| 9 | VFS vs BLS vs TLScontact vs CVASC        | required |
| 10 | Certificat médical / assurance          | required |
| 11 | Dépôt par soi-même                       | required |
| 12 | Visa étudiant                            | author's choice |
| 13 | Documents supplémentaires demandés       | author's choice |
| 14 | Agence officielle vs intermédiaire       | author's choice |
| 15 | Suivi du dossier                         | author's choice |

Each entry already paired FR ↔ EN ↔ AR with native syntax. Q+A pairs map 1:1 to `visa.faq.qN.{q,a}` keys.

---

## 5. Mobile + accessibility checklist

### Sticky bottom bar
- Visible **only ≤ 768px**: declare `display: none` by default, flip to `display: flex` in `@media (max-width: 768px)` inside the `--visa` modifier
- Height **64px min** (so the 44×44 buttons clear with padding)
- `position: fixed; inset: auto 0 0 0;` · `z-index: var(--z-sticky)` (existing token)
- `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch
- Buttons inside: `flex: 1 1 0; min-height: 44px` (so each CTA gets equal width + meets touch min)
- Mirrors for RTL via `[dir="rtl"]` cascade — `flex-direction: row` keeps order, WhatsApp stays primary
- `aria-label="Contact rapide"` on the `<aside>`, plus `data-i18n-aria-label` for FR/EN/AR swap

### Touch targets (already enforced globally — verify)
- All `<a>`, `<button>` get `min-height: 44px` from `@media (pointer: coarse)` block in `styles.css` (line 124-141). No new rules needed except for the country-card `<summary>` (verify it inherits — if not, add `min-height: 44px` to `.visa-country-card__head`).

### ARIA attributes — required on every interactive element
- **FAQ buttons:** `aria-expanded="false"`, `aria-controls="faq-N-a"`, paired with `<div id="faq-N-a" role="region" aria-labelledby="faq-N-q">` — match existing `cairo-sharm` pattern.
- **Country cards:** `<details>` exposes `aria-expanded` natively; `<summary>` is keyboard-focusable. Add `aria-label="…"` if the visible text is ambiguous (it isn't here — country name + tier chips read fine).
- **Map div:** `role="img"` + `aria-label` localised via `data-i18n-aria-label="visa.map.a11y_label"`.
- **Legend:** `role="list"` + `role="listitem"` (same pattern as `cairo-sharm`).
- **Hero headline:** `<h1 id="visa-hero-title">` referenced by `<section aria-labelledby="visa-hero-title">`.
- **Each `<section>`:** `aria-labelledby="…title"` pointing at the section's `<h2>`.
- **Partner logos:** real `alt="VFS Global"` (etc.), not `alt=""` — they convey brand information.
- **Sticky bar:** `<aside role="complementary" aria-label="…">`.

### `prefers-reduced-motion` respect
The global `@media (prefers-reduced-motion: reduce)` block at `styles.css:202-210` already kills all animations to 0.01ms — every AOS `data-aos="fade-up"` we sprinkle gets neutralised for free. **Do not introduce any custom `requestAnimationFrame` loops or non-AOS transitions** on this page.

### Language switching
- `<body data-page="visa">` so the i18n engine swaps `<title>` + meta from `T.{lang}.meta.visa`
- AR direction flip handled by the existing engine (`<html dir="rtl">`). Verify the country-card chips read RTL correctly — the chip list is short enough that flex's natural reverse will look right.

### Lighthouse-relevant
- No layout shift: give the partner `<img>` and flag `<img>` explicit `width` + `height` attrs (already in scaffold)
- Lazy-load `loading="lazy"` on all flag + partner images (already in scaffold)
- Use a `loading="lazy"` `<iframe>` if the map is third-party — but if it's a Mapbox/Leaflet init like the homepage `dz-map`, follow that init pattern instead

---

## 6. Existing CSS coverage vs gaps

### Sections that need ZERO new CSS

| Section | Reused classes |
|---------|---------------|
| **Hero (§1)** | `.hero`, `.hero__content`, `.hero__eyebrow`, `.hero__title`, `.hero__lede`, `.hero__ctas`, `.hero__trust`, `.btn`, `.btn--primary`, `.btn--wa`, `.btn--ghost`, `.container`. The `.hero--service` modifier is optional/nice-to-have — without it the section still renders cleanly. |
| **Services (§2)** | `.section`, `.container`, `.section-head`, `.section-head__eyebrow`, `.section-head__title`, `.section-head__sub`, `.grid-cards`, `.grid-cards--lg`, `.hl-card`, `.hl-card__label`, `.hl-card__title`, `.hl-card__body`, `.btn`, `.btn--ghost`, `.btn--wa`. |
| **Map (§4)** | `.section`, `.container`, `.section-head*`, `.tmap-fallback`, `.tmap-fallback__title`, `.tmap-fallback__sub`, `.trip-map-legend`, `.trip-map-legend__item`, `.trip-map-legend__chip{,--hotel,--site,--tour}`. The `#visa-map` element reuses the `#trip-map` rule by id-swap if we add `#visa-map { /* same height, etc. */ }` in CSS — but since `#trip-map` styles are id-scoped, see §6 NEW. |
| **FAQ (§5)** | `.section`, `.container`, `.section-head*`, `.faq-list`, `.faq-item`, `.faq-q`, `.faq-a` — and the `faq-item.open` JS toggle from the existing engine. |
| **Final CTA (§7)** | `.section`, `.container`, `.section-head*`, `.grid-cards`, `.grid-cards--lg`, `.hl-card`, `.hl-card__label`, `.hl-card__title`, `.hl-card__body`, `.phone-card`, `.phone-card__label`, `.phone-card__num`, `.phone-card__actions`, `.phone-card__btn`, `.btn`, `.btn--primary`, `.btn--wa`. |

### Sections that need NEW CSS

These are the only additions required. **Selectors and intent only — no rules written here.**

```css
/* §3 country grid ------------------------------------------ */
.visa-countries                        { /* margin-top adjustment after section-head, optional */ }
.visa-country-card                     { /* details reset — remove default disclosure triangle on summary */ }
.visa-country-card__head               { /* flex row: flag | name | tiers | toggle. min-height 44px (touch). */ }
.visa-country-card__tiers              { /* flex-wrap row of chips, gap 6-8px */ }
.visa-country-card__chip               { /* small pill: bg, border, font-size .75rem, padding 2px 8px, radius 999 */ }
.visa-country-card__chip--muted        { /* opacity .5 when the tier is unavailable for that country */ }
.visa-country-card__toggle             { /* rotated chevron, transition transform on [open] */ }
.visa-country-card[open] .visa-country-card__toggle { /* rotate 180deg */ }
.visa-country-card__body               { /* padding inside the expanded area, border-top on open */ }
.visa-country-card__provider           { /* small label colour */ }
.visa-country-card__notes              { /* secondary text colour, line-height 1.6 */ }

/* §4 map id-scoped sizing (mirrors #trip-map) -------------- */
#visa-map                              { /* height, border-radius, overflow, same as #trip-map */ }

/* §6 partners strip ---------------------------------------- */
.visa-partners                         { /* muted background, border-top + border-bottom */ }
.visa-partners__disclaimer             { /* text-3 colour, font-size .8125rem, max-width 520px */ }
.visa-partners__list                   { /* flex centred row, gap, wrap on mobile, opacity .8 on logos */ }
.visa-partners__list img               { /* filter: grayscale(.4) by default, hover removes — optional */ }

/* §7 final CTA tweaks -------------------------------------- */
.visa-cta__grid                        { /* override grid-cards row gap if needed for the 3-card row */ }
.visa-cta__addresses                   { /* flex column, gap small, address line styling */ }
.visa-cta__addresses li                { /* flex column micro-stack: strong + span */ }
.phone-card-list                       { /* list-reset, gap, fits inside hl-card body */ }

/* §8 sticky bar modifier ----------------------------------- */
.trip-sticky-bar--visa                 { /* show only ≤ 768px on this page; .visa pages get body class */ }
@media (max-width: 768px) {
  body.has-visa-stickybar              { /* pad-bottom equal to sticky-bar height + safe area */ }
  body.has-visa-stickybar main         { /* same — prevent last-section overlap */ }
}
```

> **Total NEW selectors: ~14**, all narrowly-scoped, none touching other pages. Add them as a new block in `styles.css` at the end, under a `/* ── /VISA PAGE ───────────── */` comment header.

### Utility classes — additions needed?

None. The existing `u-*` set already covers `u-text-center`, `u-mx-auto`, `u-measure-lg`, `u-measure-md`, `u-mb-sp*`, `u-text-2/3` — which is everything used by the scaffold.

---

## 7. Open questions for the user

1. **Per-country provider routing.** Agent A is verifying who handles each consulate (VFS, BLS, TLScontact, CVASC, or direct embassy intake). Until that lands, the `visa.countries.{country}.provider` keys stay empty strings — page renders, but each card has a blank "where it gets filed" line. **Decision needed:** publish with placeholder microcopy ("Détails disponibles sur WhatsApp") or block-launch until Agent A is done?

2. **Umrah honest answer (Q7).** Wording assumes Alliance Travel does **not** hold an Umrah agrément. If we **do** hold one and I'm wrong, Q7 needs to flip from "we'll redirect you" to "we handle Umrah end-to-end" — please confirm.

3. **Algerian visa-free country list (Q6).** The list in the FAQ reflects publicly-known data as of late 2025. It moves — recommend an annual review pinned in `docs/_archive/` and a footnote on the FAQ answer pointing to a dated source. Want me to add the dated-source footnote, or leave the answer evergreen-ish?

4. **WhatsApp deep-link copy.** Every WhatsApp `wa.me/…?text=` link in the brief uses `Bonjour Alliance Travel, j'aimerais un devis pour un rendez-vous visa.` — single canonical string. Worth having a per-country variant (`…un visa France.`) so the conseiller sees the country in the first message? Trivial to add at the country-card level.

5. **Sticky bar on desktop?** Spec says mobile-only. If desk users also want one-tap WhatsApp, easier to keep the global `.fab-whatsapp` (already on the site) and document that — confirm sticky-bar = mobile-only as in the spec.

6. **Sub-pages per country?** This page is one URL. Long-term, each country could be its own SEO-friendly landing (`/rendez-vous-visa/france/`). Out of scope today, but worth a decision before the navigation IA is locked.

7. **Form fallback.** `cta_form` button links to `#visa-form` (the final CTA grid). If you want a real form (name + WhatsApp number + country dropdown), it should reuse the homepage `.contact` form pattern. Currently scaffolded as a non-form section — fine for v1, flag if you want the form added.

8. **Schema.org `Service` typing.** Proposed `@type: "Service"` with `provider` linking to the agency. If Google indexes more cleanly with `LegalService` or `ProfessionalService`, can swap — not blocking.

---

**End of brief.**
