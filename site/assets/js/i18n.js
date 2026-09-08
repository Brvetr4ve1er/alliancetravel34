/**
 * Alliance Travel — i18n engine
 * Languages: French (default) · English · Arabic
 *
 * Usage in HTML:
 *   <h1 data-i18n="hero.title_l1">Le monde,</h1>
 *   <em data-i18n="hero.title_em">guidé et organisé</em>
 *   <a data-i18n="nav.trips" href="#voyages">Nos voyages</a>
 *   <button data-i18n-aria-label="lang.label" data-i18n="cta.book">Réserver</button>
 *
 * Behavior:
 *   - Injects a 3-button language switcher into .site-nav (before .theme-toggle)
 *   - Persists choice in localStorage ("al-lang")
 *   - Toggles <html lang> and <html dir> ("rtl" for Arabic)
 *   - Lazy-loads Cairo + Tajawal from Google Fonts on first Arabic selection
 *   - Falls back to French if a key is missing
 *   - Dispatches "langchange" event for other modules
 *
 * No external dependencies. Loads from any page that has <nav class="site-nav">.
 */
(() => {
  'use strict';

  const STORAGE_KEY  = 'al-lang';
  const DEFAULT_LANG = 'fr';
  const SUPPORTED    = ['fr', 'en', 'ar'];
  const AR_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700&display=swap';

  /* ════════════════════════════════════════════════════════════════
     TRANSLATIONS
     Keys are dot-separated paths: "hero.title_l1" → T[lang].hero.title_l1
     Strings preserve the punctuation style of each language.
     ════════════════════════════════════════════════════════════════ */
  const T = {
    /* ─── FRENCH (default — source of truth) ───────────────────── */
    fr: {
      lang: {
        label: 'Langue',
        switch_to: 'Changer la langue',
        fr: 'Français',
        en: 'Anglais',
        ar: 'Arabe'
      },
      nav: {
        skip: 'Aller au contenu principal',
        trips: 'Nos voyages',
        agency: "L'agence",
        contact: 'Contact',
        whatsapp: 'WhatsApp',
        whatsapp_label: 'Écrire sur WhatsApp',
        logo_label: 'Alliance Travel — Retour à l\'accueil',
        theme_label: 'Changer de thème',
        // trip-page-specific nav links
        trip_program: 'Programme',
        trip_hotels: 'Hôtels',
        trip_faq: 'FAQ',
        trip_booking: 'Réserver'
      },
      hero: {
        eyebrow: 'Agence de voyage · Bordj Bou Arreridj · Algérie',
        title_l1: 'Faites votre valise.',
        title_em: 'On s\'occupe du reste.',
        lede: "Depuis Bordj Bou Arreridj, on organise vos voyages clé en main : vol, visa, hôtel, transferts et accompagnateur arabophone sur place. Pas d'improvisation, pas de surprise — juste à venir profiter.",
        cta_voyages: 'Voir les voyages 2026',
        cta_contact: 'Parler à un conseiller',
        cta_whatsapp: 'WhatsApp · réponse en 30 min',
        trust_visa: 'Visa inclus dans le prix',
        trust_arabic: 'Accompagnateur arabophone',
        trust_halal: 'Hôtels halal-friendly',
        trust_local: 'Agence de la wilaya · pas d\'Alger'
      },
      stats: {
        travelers: 'Voyageurs accompagnés',
        satisfaction: 'Clients satisfaits',
        destinations: 'Destinations 2026',
        experience: "Ans sur le terrain"
      },
      voyages_section: {
        eyebrow: 'Programmes 2026',
        title_l1: '5 destinations,',
        title_em: 'un seul standard',
        sub: 'Vol + visa + hôtel + accompagnateur arabophone : tout est dans le prix affiché. Choisissez la destination, lancez le calculateur — vous recevez votre devis sur WhatsApp en moins de 30 secondes.',
        filter_all: 'Toutes',
        filter_egypt: 'Égypte',
        filter_caucasus: 'Caucase',
        filter_turkey: 'Turquie',
        filter_asia: 'Asie',
        card_cta: 'Voir le programme',
        from: 'À partir de',
        per_person: 'par personne'
      },
      trips: {
        cairo_sharm: 'Le Caire & Sharm El Sheikh',
        cairo_sharm_short: 'Le Caire & Sharm',
        azerbaidjan: 'Azerbaïdjan · Bakou & Gabala',
        azerbaidjan_short: 'Azerbaïdjan',
        istanbul: 'Istanbul · départ Constantine',
        istanbul_short: 'Istanbul',
        kuala_lumpur: 'Kuala Lumpur · Malaisie',
        kuala_lumpur_short: 'Kuala Lumpur',
        sharm_constantine: 'Sharm El Sheikh · départ Constantine',
        sharm_constantine_short: 'Sharm · Constantine'
      },
      agency: {
        eyebrow: 'Notre histoire',
        title_l1: 'Une agence',
        title_em: 'de Bordj, pour la wilaya et au-delà',
        p1_html: "Alliance Travel a ouvert ses portes à <strong>Bordj Bou Arreridj</strong> — et nulle part ailleurs. Notre métier est simple à dire, exigeant à tenir : organiser un voyage où vous n'avez qu'à boucler la valise. <strong>Visa, vol, hôtel, transferts, accompagnateur arabophone sur place</strong> — tout est verrouillé en amont, par des gens d'ici, dans la langue du client.",
        p2_html: "Depuis 2019, plus de <strong>1 200 voyageurs algériens</strong> sont partis avec nous — des lunes de miel à Bakou, des familles entières au Caire, des retraités à Istanbul, des amies en virée à Sharm. Notre <strong>taux de satisfaction de 98%</strong> n'est pas un chiffre de plaquette : c'est ce que ça donne quand les prix sont annoncés sans astérisque, les groupes restent à taille humaine, et le suivi WhatsApp continue jusqu'au retour à Alger ou Constantine.",
        p3_html: "Aujourd'hui, nous tenons <strong>trois agences</strong> : deux à <strong>Bordj Bou Arreridj</strong> (La Graf et Cité Zehour) et une à <strong>M'Sila</strong>. Vous passez quand vous voulez, on vous reçoit autour d'un café — en arabe, en français, comme vous préférez. Pas besoin de monter à la capitale pour réserver un voyage : votre conseiller est de la wilaya, il connaît votre nom, et il décroche dès la première sonnerie.",
        cta_contact: 'Passer à l\'agence',
        cta_voyages: 'Voir les voyages',
        value_travelers: 'Voyageurs accompagnés',
        value_satisfaction: 'Clients satisfaits',
        value_destinations: 'Destinations 2026',
        value_experience: "Ans sur le terrain"
      },
      contact: {
        eyebrow: 'Nous joindre',
        title_l1: 'Parlons de',
        title_em: 'votre prochain voyage',
        lede: "Un appel, un WhatsApp, ou un passage à l'agence — c'est vous qui choisissez. Paiement par virement CCP, virement bancaire, ou en espèces à l'agence. Un acompte suffit pour bloquer votre place.",
        form_name: 'Nom & prénom',
        form_phone: 'Numéro WhatsApp',
        form_city: 'Wilaya ou ville',
        form_trip: 'Voyage qui vous intéresse',
        form_trip_placeholder: '— Je ne sais pas encore —',
        form_submit: 'Recevoir mon devis sur WhatsApp',
        form_hint: "Rien n'est envoyé automatiquement : votre message s'ouvre dans WhatsApp, prêt à partir.",
        staff_lead: 'Joindre un conseiller — ligne directe',
        conseiller_prefix: 'Votre conseiller',
        addresses_label: 'Nos adresses',
        addresses_note: '3 agences en Algérie',
        hq_label: 'Siège · BBA La Graf',
        branch_zehour_label: 'BBA · Cité Zehour',
        branch_msila_label: "M'Sila",
        branch_msila_addr: 'Centre-ville',
        payment_label: 'Modes de paiement',
        payment_ccp: 'Virement CCP',
        payment_cash: 'Espèces à l\'agence',
        payment_bank: 'Virement bancaire',
        signup_label: 'Inscription simple',
        signup_lede: 'Par téléphone, sur WhatsApp ou en agence. Un acompte suffit pour bloquer votre place — le solde se règle avant le départ.'
      },
      map: {
        eyebrow: 'Notre réseau · Algérie',
        title_l1: 'Trois agences,',
        title_em: 'une à côté de chez vous',
        subtitle_html: "Pas une agence Instagram qui change d'adresse tous les six mois : <strong>trois bureaux physiques</strong>, deux à <strong>Bordj Bou Arreridj</strong> (La Graf &amp; Cité Zehour) et un à <strong>M'Sila</strong>.",
        fallback_title: 'Chargement de la carte…',
        fallback_sub_html: '3 agences · <strong>BBA La Graf</strong> · <strong>BBA Cité Zehour</strong> · <strong>M\'Sila</strong>',
        siege_pill: 'SIÈGE',
        branch_pill: 'AGENCE',
        directions: 'Y aller',
        recenter: 'Recentrer'
      },
      footer: {
        tagline: 'Voyages organisés depuis Bordj Bou Arreridj. Vous faites la valise, on s\'occupe du reste — depuis 2019.',
        col_voyages: 'Voyages 2026',
        col_contact: 'Contact',
        col_address_label: 'Adresse',
        col_address_value: 'Bd. Houari Boumediene · La Graf · Bordj Bou Arreridj & M\'Sila',
        wa_viber: 'WhatsApp / Viber',
        phone: 'Téléphone',
        address_label: 'Adresse',
        copyright: '© 2026 Alliance Travel · Bordj Bou Arreridj, Algérie',
        notice: 'Prix indicatifs en Dinar Algérien (DA) · Confirmation au moment de la réservation',
        social_instagram: 'Instagram Alliance Travel',
        social_facebook: 'Facebook Alliance Travel',
        social_tiktok: 'TikTok Alliance Travel'
      },
      conseiller: {
        label_prefix: 'Votre conseiller',
        wa: 'WhatsApp',
        call: 'Appeler'
      },
      trip_page: {
        included: 'Compris dans le prix',
        not_included: 'Non compris',
        itinerary: 'Programme jour par jour',
        hotels: 'Hôtels',
        faq: 'Questions fréquentes',
        calculator: 'Calculer mon prix',
        booking: 'Réserver ma place',
        related: 'Vous aimerez aussi',
        from: 'À partir de',
        per_person: 'par personne',
        book_now: 'Réserver',
        request_quote: 'Demander un devis',
        book_via_whatsapp: 'Réserver sur WhatsApp',
        nights: 'nuits',
        days: 'jours',
        adults: 'adultes',
        children: 'enfants',
        infants: 'bébés',
        total: 'Total',
        sticky_total_label: 'À partir de'
      },
      // ─── META namespace ─────────────────────────────────────────
      // Used by the engine to swap <title>, meta description, og:*, twitter:*
      // when the user changes language. Keyed by data-page="..." on <body>.
      meta: {
        home: {
          title: "Alliance Travel · Agence de voyage à Bordj Bou Arreridj",
          description: "Agence de voyage à Bordj Bou Arreridj. Voyages organisés vers l'Égypte, Istanbul, Bakou, Kuala Lumpur et Sharm El Sheikh. Vol + visa + hôtel inclus dans le prix. 1 200+ voyageurs satisfaits depuis 2019.",
          og_title: "Alliance Travel · Voyages organisés depuis Bordj Bou Arreridj",
          og_description: "Vol + visa + hôtel + accompagnateur arabophone, tout est compris. 5 destinations 2026 au départ d'Alger ou Constantine. Basés à Bordj Bou Arreridj. 1 200+ voyageurs satisfaits."
        },
        voyages: {
          title: "Voyages organisés 2026 · 5 destinations dès 123 000 DA — Alliance Travel",
          description: "5 voyages clé en main pour 2026 : Caire + Sharm, Bakou, Istanbul (depuis Constantine), Kuala Lumpur, Sharm El Sheikh (depuis Constantine). Vol + visa + hôtel compris. À partir de 123 000 DA."
        },
        cairo_sharm: {
          title: "Voyage Égypte 2026 · Caire + Sharm El Sheikh dès 190 000 DA",
          description: "Le Caire (Pyramides de Guizeh) + Sharm El Sheikh (mer Rouge) en 8 jours. Vol EgyptAir, hôtels 4★/5★, visa et excursions compris. Départs juin 2026 depuis Alger."
        },
        azerbaidjan: {
          title: "Voyage Azerbaïdjan · Bakou & Gabala dès 227 000 DA — Alliance",
          description: "7 nuits entre Bakou et Gabala, vol Turkish Airlines, e-visa compris, accompagnateur arabophone sur place. Départs avril-juillet 2026 depuis Alger. À partir de 227 000 DA."
        },
        istanbul: {
          title: "Voyage Istanbul depuis Constantine dès 123 000 DA — Alliance",
          description: "Istanbul en 8 jours, vols directs Turkish Airlines depuis Constantine. Hôtel 4★, transferts inclus, guide arabophone. Départs hebdomadaires mars–mai 2026."
        },
        kuala_lumpur: {
          title: "Voyage Malaisie · Kuala Lumpur en vol direct dès 211 000 DA",
          description: "Kuala Lumpur en 8 jours, vol DIRECT Air Algérie depuis Alger. Grand Mercure 5★, tours Petronas, Batu Caves, Genting Highlands. Restauration halal partout. À partir de 211 000 DA."
        },
        sharm_constantine: {
          title: "Voyage Sharm El Sheikh depuis Constantine dès 155 000 DA",
          description: "Sharm El Sheikh en 10 jours / 8 nuits formule ALL INCLUSIVE depuis Constantine. Vol Turkish Airlines, hôtels 4★/5★ sur la mer Rouge. 5 départs avril–juin 2026."
        }
      }
    },
    /* ─── ENGLISH ──────────────────────────────────────────────── */
    en: {
      lang: {
        label: 'Language',
        switch_to: 'Switch language',
        fr: 'French',
        en: 'English',
        ar: 'Arabic'
      },
      nav: {
        skip: 'Skip to main content',
        trips: 'Our trips',
        agency: 'The agency',
        contact: 'Contact',
        whatsapp: 'WhatsApp',
        whatsapp_label: 'Contact us on WhatsApp',
        logo_label: 'Alliance Travel — Home',
        theme_label: 'Toggle theme',
        trip_program: 'Itinerary',
        trip_hotels: 'Hotels',
        trip_faq: 'FAQ',
        trip_booking: 'Book'
      },
      hero: {
        eyebrow: 'Licensed agency · Bordj Bou Arreridj · Algeria',
        title_l1: 'The world,',
        title_em: 'fully sorted',
        lede: "Flight, visa, 4★/5★ hotel, airport transfers and an Arabic-speaking guide — booked together, one price. Out of Bordj Bou Arreridj to Egypt, Türkiye, Azerbaijan or Malaysia. You pack a suitcase; we handle the rest.",
        cta_voyages: 'See the 2026 trips',
        cta_contact: 'Talk to an advisor',
        cta_whatsapp: 'WhatsApp us',
        trust_visa: 'Visa handled for you',
        trust_arabic: 'Arabic-speaking guide on the ground',
        trust_halal: 'Halal-friendly hotels, vetted on-site',
        trust_local: 'Based in BBA · not Algiers'
      },
      stats: {
        travelers: 'Travellers guided',
        satisfaction: 'Satisfaction rate',
        destinations: 'Destinations in 2026',
        experience: 'Years on the road'
      },
      voyages_section: {
        eyebrow: '2026 programme',
        title_l1: 'Five trips,',
        title_em: 'one standard throughout',
        sub: 'Flight, visa, hotel and an Arabic-speaking guide — all in the headline price. Pick a destination, run the calculator: your quote lands on WhatsApp in under a minute.',
        filter_all: 'All',
        filter_egypt: 'Egypt',
        filter_caucasus: 'Caucasus',
        filter_turkey: 'Türkiye',
        filter_asia: 'Asia',
        card_cta: 'See the full trip',
        from: 'From',
        per_person: 'per person'
      },
      trips: {
        cairo_sharm: 'Cairo & Sharm El Sheikh',
        cairo_sharm_short: 'Cairo & Sharm',
        azerbaidjan: 'Azerbaijan · Baku & Gabala',
        azerbaidjan_short: 'Azerbaijan',
        istanbul: 'Istanbul · direct from Constantine',
        istanbul_short: 'Istanbul',
        kuala_lumpur: 'Kuala Lumpur · Malaysia',
        kuala_lumpur_short: 'Kuala Lumpur',
        sharm_constantine: 'Sharm El Sheikh · direct from Constantine',
        sharm_constantine_short: 'Sharm · Constantine'
      },
      agency: {
        eyebrow: 'Our story',
        title_l1: 'Alliance Travel,',
        title_em: 'made in Bordj Bou Arreridj',
        p1_html: "We started Alliance Travel in <strong>Bordj Bou Arreridj</strong> — deliberately not Algiers. The idea was straightforward: build guided trips where the traveller's only job is to pack a suitcase. Visa, flight, hotel, transfers, an <strong>Arabic-speaking guide</strong> waiting at arrivals — every link in the chain is sorted in advance. Nothing is left to improvise.",
        p2_html: "Since 2019, more than <strong>1,200 Algerian travellers</strong> have booked with us — honeymoons in Baku, family weeks in Cairo, long weekends in Istanbul. The <strong>98% satisfaction rate</strong> isn't a tagline: it comes from transparent pricing, small groups, and a WhatsApp thread that stays open all the way back to Algiers or Constantine.",
        p3_html: "Three branches — two in <strong>Bordj Bou Arreridj</strong> (La Graf and Cité Zehour) and one in <strong>M'Sila</strong> — mean you walk in close to home and talk to an advisor in Arabic or French. No trip to the capital to book a trip. Your advisor is from the wilaya, and they pick up on the first ring.",
        cta_contact: 'Talk to us',
        cta_voyages: 'See the trips',
        value_travelers: 'Travellers guided',
        value_satisfaction: 'Client satisfaction',
        value_destinations: 'Destinations in 2026',
        value_experience: 'Years on the road'
      },
      contact: {
        eyebrow: 'Get in touch',
        title_l1: 'Tell us about',
        title_em: 'your trip',
        lede: "Book by phone or WhatsApp — our advisor usually replies inside 30 minutes. Pay by CCP transfer, bank transfer, or cash at any branch. A deposit holds your seat.",
        form_name: 'Full name',
        form_phone: 'WhatsApp number',
        form_city: 'Wilaya or city',
        form_trip: 'Trip you have in mind',
        form_trip_placeholder: '— Not sure yet —',
        form_submit: 'Send on WhatsApp',
        form_hint: 'Nothing sends automatically — your message opens in WhatsApp for you to review and hit send.',
        staff_lead: 'Reach an advisor directly',
        conseiller_prefix: 'Advisor',
        addresses_label: 'Our branches',
        addresses_note: 'Three offices across Algeria',
        hq_label: 'Head office · BBA La Graf',
        branch_zehour_label: 'BBA Cité Zehour',
        branch_msila_label: "M'Sila",
        branch_msila_addr: 'Town centre',
        payment_label: 'Ways to pay',
        payment_ccp: 'CCP transfer',
        payment_cash: 'Cash at the branch',
        payment_bank: 'Bank transfer',
        signup_label: 'How to book',
        signup_lede: 'By phone, on WhatsApp, or walk into any branch. A deposit holds your seat.'
      },
      map: {
        eyebrow: 'The Alliance Travel network · Algeria',
        title_l1: 'Find us',
        title_em: 'in your wilaya',
        subtitle_html: "Three branches, real desks, real advisors: <strong>Bordj Bou Arreridj</strong> (La Graf and Cité Zehour) and <strong>M'Sila</strong>.",
        fallback_title: 'Map loading…',
        fallback_sub_html: '3 branches · <strong>BBA La Graf</strong> · <strong>BBA Cité Zehour</strong> · <strong>M\'Sila</strong>',
        siege_pill: 'HEAD OFFICE',
        branch_pill: 'BRANCH',
        directions: 'Get directions',
        recenter: 'Recentre'
      },
      footer: {
        tagline: 'Guided trips out of Bordj Bou Arreridj. 1,200+ travellers, one standard, since 2019.',
        col_voyages: 'Our 2026 trips',
        col_contact: 'Contact',
        col_address_label: 'Address',
        col_address_value: "Bd. Houari Boumediene · La Graf · Bordj Bou Arreridj & M'Sila",
        wa_viber: 'WhatsApp / Viber',
        phone: 'Phone',
        address_label: 'Address',
        copyright: '© 2026 Alliance Travel · Bordj Bou Arreridj, Algeria',
        notice: 'Prices in Algerian Dinar (DZD) · Indicative · Confirmed at booking',
        social_instagram: 'Alliance Travel on Instagram',
        social_facebook: 'Alliance Travel on Facebook',
        social_tiktok: 'Alliance Travel on TikTok'
      },
      conseiller: {
        label_prefix: 'Advisor',
        wa: 'WhatsApp',
        call: 'Call'
      },
      trip_page: {
        included: "What's included",
        not_included: 'Not included',
        itinerary: 'Itinerary',
        hotels: 'Hotels',
        faq: 'FAQ',
        calculator: 'Price calculator',
        booking: 'Book this trip',
        related: 'You might also like',
        from: 'From',
        per_person: 'per person',
        book_now: 'Book this trip',
        request_quote: 'Get a quote',
        book_via_whatsapp: 'Book on WhatsApp',
        nights: 'nights',
        days: 'days',
        adults: 'adults',
        children: 'children',
        infants: 'infants',
        total: 'Total',
        sticky_total_label: 'From'
      },
      meta: {
        home: {
          title: "Alliance Travel · Guided trips from Bordj Bou Arreridj, Algeria",
          description: "Licensed Algerian travel agency in Bordj Bou Arreridj. All-inclusive guided trips to Egypt, Türkiye, Azerbaijan, Malaysia and the Red Sea. Flight, visa, hotel and Arabic-speaking guide in one price. 1,200+ travellers since 2019.",
          og_title: "Alliance Travel · Guided trips from Bordj Bou Arreridj",
          og_description: "Flight, visa, hotel and Arabic-speaking guide — all in the headline price. Five 2026 destinations out of Algiers or Constantine. Licensed agency, three branches in BBA and M'Sila. 1,200+ travellers."
        },
        voyages: {
          title: "2026 guided trips · Five destinations from DZD 123,000 — Alliance Travel",
          description: "Our 2026 programme: Cairo + Sharm, Baku, Istanbul (from Constantine), Kuala Lumpur, Sharm (from Constantine). Flight, visa, hotel and Arabic-speaking guide included. From DZD 123,000."
        },
        cairo_sharm: {
          title: "Egypt 2026 · Cairo + Sharm El Sheikh from DZD 190,000",
          description: "Eight days across Cairo (Giza pyramids) and Sharm El Sheikh (Red Sea). EgyptAir flight, 4★/5★ hotels, Egyptian visa and excursions included. Departures from Algiers, June 2026."
        },
        azerbaidjan: {
          title: "Azerbaijan 2026 · Baku & Gabala from DZD 227,000 — Alliance Travel",
          description: "Seven nights in Baku and Gabala. Turkish Airlines flight, e-visa, Arabic-speaking guide. April–July 2026 departures from Algiers. From DZD 227,000."
        },
        istanbul: {
          title: "Istanbul from Constantine · from DZD 123,000 — Alliance Travel",
          description: "Eight days in Istanbul, direct Turkish Airlines flights from Constantine. 4★ hotel, transfers, Arabic-speaking guide. Weekly departures, March–May 2026."
        },
        kuala_lumpur: {
          title: "Malaysia 2026 · Kuala Lumpur direct from Algiers, from DZD 211,000",
          description: "Eight days in Kuala Lumpur on the Air Algérie direct from Algiers. Grand Mercure 5★, Petronas Towers, Batu Caves and Genting Highlands tours. Halal end-to-end. From DZD 211,000."
        },
        sharm_constantine: {
          title: "Sharm El Sheikh from Constantine · from DZD 155,000 — Alliance Travel",
          description: "Sharm El Sheikh, ten days / eight nights all-inclusive, direct from Constantine on Turkish Airlines. 4★/5★ Red Sea hotels. Five departures, April–June 2026."
        }
      }
    },
    /* ─── ARABIC (Modern Standard Arabic) ──────────────────────── */
    ar: {
      lang: {
        label: 'اللغة',
        switch_to: 'تغيير اللغة',
        fr: 'الفرنسية',
        en: 'الإنجليزية',
        ar: 'العربية'
      },
      nav: {
        skip: 'تخطَّ إلى المحتوى الرئيسي',
        trips: 'رحلاتنا',
        agency: 'الوكالة',
        contact: 'تواصل معنا',
        whatsapp: 'واتساب',
        whatsapp_label: 'تواصل عبر واتساب',
        logo_label: 'أليانس ترافل — الصفحة الرئيسية',
        theme_label: 'تبديل المظهر',
        trip_program: 'البرنامج',
        trip_hotels: 'الفنادق',
        trip_faq: 'الأسئلة الشائعة',
        trip_booking: 'احجز رحلتك'
      },
      hero: {
        eyebrow: 'وكالة سفر معتمدة · بُرج بوعريريج · الجزائر',
        title_l1: 'العالَم،',
        title_em: 'مرتَّبٌ من أوّله إلى آخره',
        lede: 'في أليانس ترافل، نُنظِّم رحلاتٍ مُرافَقة من بُرج بوعريريج نحو أجمل الوجهات. الطيران، التأشيرة، الفندق، الجولات، التنقّلات — كل شيء مشمول، ولا يبقى عليك سوى الاستمتاع.',
        cta_voyages: 'تصفَّح رحلاتنا',
        cta_contact: 'تواصل معنا',
        cta_whatsapp: 'واتساب',
        trust_visa: 'التأشيرة جاهزة قبل سفرك',
        trust_arabic: 'مُرافِق ناطق بالعربية',
        trust_halal: 'فنادق صديقة للحلال',
        trust_local: 'وكالتنا في بُرج، لا في العاصمة'
      },
      stats: {
        travelers: 'مسافر برفقتنا',
        satisfaction: 'نسبة الرضا',
        destinations: 'وجهة لسنة 2026',
        experience: 'سنوات من الخبرة'
      },
      voyages_section: {
        eyebrow: 'برامج 2026',
        title_l1: 'خمس رحلات،',
        title_em: 'بمعيارٍ واحد',
        sub: 'الطيران والتأشيرة والفندق ومُرافِق ناطق بالعربية: كل شيء داخل السعر. اختر وجهتك، شغِّل الحاسبة — يصلك العرض على واتساب خلال 30 ثانية.',
        filter_all: 'الكل',
        filter_egypt: 'مصر',
        filter_caucasus: 'القوقاز',
        filter_turkey: 'تركيا',
        filter_asia: 'آسيا',
        card_cta: 'اطّلع على هذه الرحلة',
        from: 'ابتداءً من',
        per_person: 'للفرد'
      },
      trips: {
        cairo_sharm: 'القاهرة وشرم الشيخ',
        cairo_sharm_short: 'القاهرة وشرم',
        azerbaidjan: 'أذربيجان · باكو وقَبَلَة',
        azerbaidjan_short: 'أذربيجان',
        istanbul: 'إسطنبول · انطلاقًا من قسنطينة',
        istanbul_short: 'إسطنبول',
        kuala_lumpur: 'كوالا لمبور · ماليزيا',
        kuala_lumpur_short: 'كوالا لمبور',
        sharm_constantine: 'شرم الشيخ · انطلاقًا من قسنطينة',
        sharm_constantine_short: 'شرم · قسنطينة'
      },
      agency: {
        eyebrow: 'قصّتنا',
        title_l1: 'أليانس ترافل،',
        title_em: 'من قلب بُرج بوعريريج',
        p1_html: 'وُلِدت أليانس ترافل في <strong>بُرج بوعريريج</strong> — لا في الجزائر العاصمة. ووعدُنا يختصره سطر واحد: نُنظِّم لك رحلة لا تحتاج فيها سوى أن تجهِّز حقيبتك. التأشيرة والطيران والفندق والتنقّلات ومُرافِق ناطق بالعربية على الأرض — كل تفصيل مُعَدٌّ سلفًا، ولا شيء يُترك للصدفة.',
        p2_html: 'منذ سنة 2019، منحنا أكثرُ من <strong>1.200 مسافر جزائري</strong> ثقتَهم — في شهر عسلٍ بباكو، وعطلةٍ عائلية في القاهرة، ورحلةٍ ثقافية إلى إسطنبول. نسبة الرضا عندنا <strong>%98</strong> ليست شعارًا تسويقيًّا، بل ثمرة أسعار شفّافة، ومجموعات صغيرة، ومتابعة على واتساب حتى عودتك إلى أرض الوطن — الجزائر أو قسنطينة.',
        p3_html: 'بِـ<strong>ثلاث وكالات</strong> — اثنتان في <strong>بُرج بوعريريج</strong> (لاغراف وحيّ الزهور) وثالثة في <strong>المسيلة</strong> — نستقبلك قريبًا من بيتك، بالعربية أو بالفرنسية. لا داعي للسفر إلى العاصمة لتحجز: مستشارك ابن الولاية، يردّ على هاتفك من أوّل رنّة.',
        cta_contact: 'تواصل معنا',
        cta_voyages: 'تصفَّح الرحلات',
        value_travelers: 'مسافر برفقتنا',
        value_satisfaction: 'رضا العملاء',
        value_destinations: 'وجهة لسنة 2026',
        value_experience: 'سنوات من الخبرة'
      },
      contact: {
        eyebrow: 'تواصل معنا',
        title_l1: 'حدِّثنا عن',
        title_em: 'مشروع سفرك',
        lede: 'سجِّل عبر الهاتف أو واتساب. الدفع بحوالة CCP أو نقدًا في الوكالة. يكفي عربون بسيط لحجز مكانك.',
        form_name: 'الاسم واللقب',
        form_phone: 'رقم واتساب',
        form_city: 'الولاية / المدينة',
        form_trip: 'الرحلة التي تهمّك',
        form_trip_placeholder: '— تُحدَّد لاحقًا —',
        form_submit: 'أرسل طلبي عبر واتساب',
        form_hint: 'لا إرسال آلي: تُفتح رسالتك في واتساب جاهزةً للإرسال.',
        staff_lead: 'تواصل مع مستشار — مباشرةً',
        conseiller_prefix: 'مستشار',
        addresses_label: 'العناوين',
        addresses_note: 'ثلاث وكالات في الجزائر',
        hq_label: 'المقرّ · بُرج بوعريريج لاغراف',
        branch_zehour_label: 'بُرج بوعريريج · حيّ الزهور',
        branch_msila_label: 'المسيلة',
        branch_msila_addr: 'وسط المدينة',
        payment_label: 'وسائل الدفع المقبولة',
        payment_ccp: 'حوالة بريدية CCP',
        payment_cash: 'نقدًا في الوكالة',
        payment_bank: 'تحويل بنكي',
        signup_label: 'طرق التسجيل',
        signup_lede: 'عبر الهاتف · واتساب · في الوكالة. يكفي عربون بسيط لحجز مكانك.'
      },
      map: {
        eyebrow: 'شبكة أليانس ترافل · الجزائر',
        title_l1: 'تجدنا',
        title_em: 'قريبًا من بيتك',
        subtitle_html: 'ثلاث وكالات لاستقبالك: <strong>بُرج بوعريريج</strong> (لاغراف وحيّ الزهور) و<strong>المسيلة</strong>.',
        fallback_title: 'جاري تحميل الخريطة…',
        fallback_sub_html: '3 وكالات · <strong>بُرج بوعريريج لاغراف</strong> · <strong>بُرج بوعريريج حيّ الزهور</strong> · <strong>المسيلة</strong>',
        siege_pill: 'المقرّ',
        branch_pill: 'فرع',
        directions: 'الاتجاهات',
        recenter: 'إعادة التوسيط'
      },
      footer: {
        tagline: 'رحلات مُرافَقة من بُرج بوعريريج. أكثر من 1.200 مسافر راضٍ منذ 2019.',
        col_voyages: 'رحلاتنا 2026',
        col_contact: 'تواصل',
        col_address_label: 'العنوان',
        col_address_value: 'شارع هواري بومدين · لاغراف · بُرج بوعريريج والمسيلة',
        wa_viber: 'واتساب / فايبر',
        phone: 'الهاتف',
        address_label: 'العنوان',
        copyright: '© 2026 أليانس ترافل · بُرج بوعريريج، الجزائر',
        notice: 'الأسعار بالدينار الجزائري · إرشادية · تُؤكَّد عند الحجز',
        social_instagram: 'إنستغرام أليانس ترافل',
        social_facebook: 'فيسبوك أليانس ترافل',
        social_tiktok: 'تيك توك أليانس ترافل'
      },
      conseiller: {
        label_prefix: 'مستشارك',
        wa: 'واتساب',
        call: 'اتصال'
      },
      trip_page: {
        included: 'مشمول في السعر',
        not_included: 'غير مشمول',
        itinerary: 'البرنامج',
        hotels: 'الفنادق',
        faq: 'الأسئلة الشائعة',
        calculator: 'حاسبة الأسعار',
        booking: 'الحجز',
        related: 'قد تعجبك أيضًا',
        from: 'ابتداءً من',
        per_person: 'للفرد',
        book_now: 'احجز الآن',
        request_quote: 'اطلب عرض سعر',
        book_via_whatsapp: 'احجز عبر واتساب',
        nights: 'ليلة',
        days: 'يوم',
        adults: 'بالغ',
        children: 'طفل',
        infants: 'رضيع',
        total: 'المجموع',
        sticky_total_label: 'ابتداءً من'
      },
      meta: {
        home: {
          title: 'أليانس ترافل · وكالة سفر في بُرج بوعريريج، الجزائر',
          description: 'وكالة سفر في بُرج بوعريريج تُنظِّم رحلات مُرافَقة إلى مصر وإسطنبول وباكو وكوالا لمبور وشرم الشيخ. الطيران والتأشيرة والفندق مشمولة. أكثر من 1.200 مسافر راضٍ.',
          og_title: 'أليانس ترافل · رحلات مُرافَقة من بُرج بوعريريج',
          og_description: 'الطيران والتأشيرة والفندق ومُرافِق ناطق بالعربية — كل شيء مشمول. خمس وجهات لسنة 2026 من الجزائر أو قسنطينة. وكالة معتمدة في بُرج بوعريريج. أكثر من 1.200 مسافر برفقتنا.'
        },
        voyages: {
          title: 'رحلات منظَّمة 2026 · خمس وجهات ابتداءً من 123.000 دينار جزائري — أليانس ترافل',
          description: 'خمس رحلات منظَّمة لسنة 2026: القاهرة وشرم، باكو، إسطنبول (من قسنطينة)، كوالا لمبور، شرم (من قسنطينة). الطيران والتأشيرة والفندق مشمولة. ابتداءً من 123.000 د.ج.'
        },
        cairo_sharm: {
          title: 'رحلة مصر 2026 · القاهرة وشرم الشيخ ابتداءً من 190.000 دينار جزائري',
          description: 'القاهرة (أهرامات الجيزة) وشرم الشيخ (البحر الأحمر) في ثمانية أيام. طيران EgyptAir، فنادق 4★/5★، التأشيرة والجولات مشمولة. انطلاقات جوان 2026 من الجزائر.'
        },
        azerbaidjan: {
          title: 'رحلة أذربيجان · باكو وقَبَلَة ابتداءً من 227.000 دينار جزائري — أليانس',
          description: 'سبع ليالٍ بين باكو وقَبَلَة، طيران Turkish Airlines، التأشيرة الإلكترونية مشمولة، مُرافِق ناطق بالعربية. انطلاقات بين أفريل وجويلية 2026 من الجزائر. ابتداءً من 227.000 د.ج.'
        },
        istanbul: {
          title: 'رحلة إسطنبول من قسنطينة ابتداءً من 123.000 دينار جزائري — أليانس',
          description: 'إسطنبول في ثمانية أيام، رحلات مباشرة بـTurkish Airlines من قسنطينة. فندق 4★، تنقّلات، مُرافِق ناطق بالعربية. انطلاقات أسبوعية بين مارس وماي 2026.'
        },
        kuala_lumpur: {
          title: 'رحلة ماليزيا · كوالا لمبور برحلة مباشرة ابتداءً من 211.000 دينار جزائري',
          description: 'كوالا لمبور في ثمانية أيام، رحلة مباشرة بـAir Algérie من الجزائر. فندق Grand Mercure 5★، جولات Petronas وBatu Caves وGenting. حلال في كل مكان. ابتداءً من 211.000 د.ج.'
        },
        sharm_constantine: {
          title: 'رحلة شرم الشيخ من قسنطينة ابتداءً من 155.000 دينار جزائري',
          description: 'شرم الشيخ في عشرة أيام وثماني ليالٍ، نظام All Inclusive، انطلاقًا من قسنطينة. طيران Turkish Airlines، فنادق 4★/5★ على البحر الأحمر. خمس انطلاقات بين أفريل وجوان 2026.'
        }
      }
    }
  };

  /* ════════════════════════════════════════════════════════════════
     ENGINE
     ════════════════════════════════════════════════════════════════ */

  function lookup(key, dict) {
    if (!key) return null;
    return key.split('.').reduce((o, k) => (o && k in o) ? o[k] : null, dict);
  }

  function getLang() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) { /* private mode */ }
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(nav)) return nav;
    return DEFAULT_LANG;
  }

  function persistLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* private */ }
  }

  function ensureArabicFont() {
    if (document.querySelector('link[data-arabic-font]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = AR_FONT_HREF;
    link.dataset.arabicFont = '1';
    document.head.appendChild(link);
  }

  function setHtmlAttrs(lang) {
    const html = document.documentElement;
    html.lang = lang;
    html.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    html.dataset.lang = lang;
  }

  /**
   * Translate the page's meta tags (<title>, meta description, og:title,
   * og:description, twitter:title, twitter:description, og:locale).
   * Reads the page key from <body data-page="..."> and looks up
   * T[lang].meta[pageKey].{title, description, og_title, og_description}.
   * Falls back to French if a key is missing.
   */
  function updateMeta(lang) {
    const pageKey = document.body?.dataset?.page;
    if (!pageKey) return;
    const dict = T[lang] || T[DEFAULT_LANG];
    const fallback = T[DEFAULT_LANG];
    const meta = (dict.meta && dict.meta[pageKey]) || (fallback.meta && fallback.meta[pageKey]);
    if (!meta) return;

    const ogTitle  = meta.og_title || meta.title;
    const ogDesc   = meta.og_description || meta.description;

    if (meta.title) {
      document.title = meta.title;
      setAttr('meta[property="og:title"]',    'content', ogTitle);
      setAttr('meta[name="twitter:title"]',   'content', ogTitle);
    }
    if (meta.description) {
      setAttr('meta[name="description"]',          'content', meta.description);
      setAttr('meta[property="og:description"]',   'content', ogDesc);
      setAttr('meta[name="twitter:description"]',  'content', ogDesc);
    }

    // og:locale per language
    const ogLocaleMap = { fr: 'fr_DZ', en: 'en_US', ar: 'ar_DZ' };
    setAttr('meta[property="og:locale"]', 'content', ogLocaleMap[lang] || 'fr_DZ');
  }

  function setAttr(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && value != null) el.setAttribute(attr, value);
  }

  /* ── Live-DOM FR baseline ──────────────────────────────────────────
     Captured ONCE before the first translate. French always restores the
     exact on-page copy (never a stale dict value), and any missing EN/AR key
     falls back to the live French text rather than a drifted dict string.
     This lets pages add data-i18n attributes freely without keeping T.fr in
     sync with the markup. */
  const BASE = { text: {}, html: {}, attr: {} };
  let baselineCaptured = false;

  const ATTRS = [
    ['aria-label',  'i18nAriaLabel'],
    ['title',       'i18nTitle'],
    ['placeholder', 'i18nPlaceholder'],
    ['alt',         'i18nAlt']
  ];

  function captureBaseline() {
    if (baselineCaptured) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (k && !(k in BASE.text)) BASE.text[k] = el.textContent;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const k = el.dataset.i18nHtml;
      if (k && !(k in BASE.html)) BASE.html[k] = el.innerHTML;
    });
    ATTRS.forEach(([attr, prop]) => {
      if (!BASE.attr[attr]) BASE.attr[attr] = {};
      document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
        const k = el.dataset[prop];
        if (k && !(k in BASE.attr[attr])) BASE.attr[attr][k] = el.getAttribute(attr);
      });
    });
    baselineCaptured = true;
  }

  /* Resolve a key for a language: dict[lang] → live-FR baseline → dict.fr.
     For French the live baseline wins, so visible on-page copy is preserved. */
  function resolve(key, lang, base) {
    if (lang === DEFAULT_LANG) return base[key] ?? lookup(key, T[DEFAULT_LANG]);
    return lookup(key, T[lang]) ?? base[key] ?? lookup(key, T[DEFAULT_LANG]);
  }

  function translate(lang) {
    captureBaseline();   // no-op after the first call

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = resolve(el.dataset.i18n, lang, BASE.text);
      if (val != null) el.textContent = val;
    });

    // innerHTML (allows embedded <em>, <strong>, etc. — strings should be trusted)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const val = resolve(el.dataset.i18nHtml, lang, BASE.html);
      if (val != null) el.innerHTML = val;
    });

    // attribute translations (aria-label / title / placeholder / alt)
    ATTRS.forEach(([attr, prop]) => {
      const base = BASE.attr[attr] || {};
      document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
        const val = resolve(el.dataset[prop], lang, base);
        if (val != null) el.setAttribute(attr, val);
      });
    });

    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function buildSwitcher() {
    if (document.querySelector('.lang-switcher')) return;
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language / Langue / اللغة');
    wrap.innerHTML = `
      <button class="lang-btn" type="button" data-lang="fr" aria-pressed="false" title="Français">FR</button>
      <button class="lang-btn" type="button" data-lang="en" aria-pressed="false" title="English">EN</button>
      <button class="lang-btn lang-btn--ar" type="button" data-lang="ar" aria-pressed="false" title="العربية" lang="ar">عر</button>
    `;

    // Insert before the theme toggle (so visual order: ...links · LANG · THEME · WA)
    const themeToggle = nav.querySelector('.theme-toggle');
    if (themeToggle) {
      nav.insertBefore(wrap, themeToggle);
    } else {
      const cta = nav.querySelector('.nav-cta');
      if (cta) nav.insertBefore(wrap, cta);
      else nav.appendChild(wrap);
    }

    wrap.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  function reflectActive(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const on = btn.dataset.lang === lang;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('lang-btn--active', on);
    });
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    if (lang === 'ar') ensureArabicFont();
    persistLang(lang);
    setHtmlAttrs(lang);
    translate(lang);
    updateMeta(lang);
    reflectActive(lang);
  }

  /* Expose for debug / cross-module use */
  window.alSetLang = setLang;
  window.alGetLang = getLang;
  window.alTranslations = T;

  function init() {
    const lang = getLang();
    setHtmlAttrs(lang);               // pre-set ASAP (prevents flash)
    if (lang === 'ar') ensureArabicFont();
    buildSwitcher();
    translate(lang);
    updateMeta(lang);
    reflectActive(lang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
