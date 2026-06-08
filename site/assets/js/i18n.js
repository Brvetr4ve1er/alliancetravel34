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
        visa_rdv: 'Rendez-vous Visa',
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
        eyebrow: 'Agence de voyage agréée · Bordj Bou Arreridj · Algérie',
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
          og_description: "Vol + visa + hôtel + accompagnateur arabophone, tout est compris. 5 destinations 2026 au départ d'Alger ou Constantine. Agence agréée à Bordj Bou Arreridj. 1 200+ voyageurs satisfaits."
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
          description: "7 nuits entre Bakou et Gabala, vol Turkish Airlines, e-visa compris, accompagnateur arabophone sur place. Départs juin–octobre 2026 depuis Alger. À partir de 227 000 DA."
        },
        istanbul: {
          title: "Voyage Istanbul depuis Constantine dès 123 000 DA — Alliance",
          description: "Istanbul en 8 jours, vols directs Turkish Airlines depuis Constantine. Hôtel 4★, transferts inclus, guide arabophone. Départs hebdomadaires septembre–novembre 2026."
        },
        kuala_lumpur: {
          title: "Voyage Malaisie · Kuala Lumpur en vol direct dès 211 000 DA",
          description: "Kuala Lumpur en 8 jours, vol DIRECT Air Algérie depuis Alger. Grand Mercure 5★, tours Petronas, Batu Caves, Genting Highlands. Restauration halal partout. À partir de 211 000 DA."
        },
        sharm_constantine: {
          title: "Voyage Sharm El Sheikh depuis Constantine dès 155 000 DA",
          description: "Sharm El Sheikh en 10 jours / 8 nuits formule ALL INCLUSIVE depuis Constantine. Vol Turkish Airlines, hôtels 4★/5★ sur la mer Rouge. 5 départs juin–octobre 2026."
        },
      visa: {
        title: 'Rendez-vous Visa · Alliance Travel · Bordj Bou Arreridj',
        description: "RDV ambassade et VFS, dossier complet, dépôt physique selon ambassade. 10 pays couverts depuis Bordj Bou Arreridj — sans monter à Alger.",
        og_title: 'Rendez-vous Visa · Alliance Travel',
        og_description: "On s'occupe du RDV, du dossier et du dépôt — vous restez à Bordj. 10 pays · réponse WhatsApp en 30 min."
      },
      },
      visa: {
        hero: {
          eyebrow: 'Service Rendez-vous Visa · Bordj Bou Arreridj',
          title_l1: 'Votre rendez-vous visa,',
          title_em: 'pris en charge de A à Z.',
          lede: "On réserve votre RDV à l'ambassade ou au centre VFS, on prépare votre dossier complet, et — selon les règles du consulat — on dépose le dossier pour vous. Vous restez à Bordj, on fait la route. 10 pays couverts. Devis personnalisé sur WhatsApp.",
          cta_wa: 'WhatsApp un conseiller',
          cta_form: 'Voir les pays',
          trust_branches: "3 agences physiques · BBA & M'Sila",
          trust_no_alger: 'Pas besoin de monter à Alger',
          trust_since: 'Depuis 2019 · 1 200+ dossiers traités'
        },
        services: {
          eyebrow: 'Nos prestations',
          title_l1: 'Trois niveaux,',
          title_em: 'vous choisissez.',
          sub: "Du simple créneau réservé jusqu'au dépôt physique du dossier, vous prenez exactement ce dont vous avez besoin — et rien de plus.",
          tier1: { tag: 'Niveau 1', title: 'Réservation du RDV',                    body: 'On bloque votre créneau au consulat, à VFS, BLS, Capago ou CVASC selon le pays demandé. Vous recevez la confirmation du rendez-vous par WhatsApp avec les justificatifs à imprimer.', cta: 'WhatsApp pour ce service' },
          tier2: { tag: 'Niveau 2', title: 'Préparation complète du dossier',       body: "Relecture point par point de chaque document, attestations, formulaires, traductions, photos aux normes, lettres d'invitation. Vous arrivez au guichet avec un dossier propre et complet — pas de surprise à l'accueil.", cta: 'WhatsApp pour ce service' },
          tier3: { tag: 'Niveau 3', title: 'Dépôt physique du dossier',             body: "Là où le consulat l'autorise, on remet votre dossier au guichet à votre place. Vous restez à Bordj, on fait la route. Service non disponible quand la présence du demandeur est exigée (biométrie, entretien).", cta: 'WhatsApp pour ce service' }
        },
        countries: {
          eyebrow: 'Pays couverts',
          title_l1: 'Dix pays,',
          title_em: 'un seul interlocuteur.',
          sub: "Cliquez sur un pays pour voir le centre de traitement (ambassade, VFS, BLS, Capago ou CVASC) et les niveaux de service que nous prenons en charge. La biométrie et les entretiens restent obligatoirement en présentiel — c'est le consulat qui décide.",
          chip: { tier1: 'RDV', tier2: 'Dossier', tier3: 'Dépôt' },
          cta_wa: 'WhatsApp pour ce pays',
          a11y_tiers: 'Niveaux de service disponibles',
          france:           { name: 'France',            provider: 'Capago — 4 centres officiels (Alger · Oran · Annaba · Constantine)',                                     notes: "Schengen C-type · biométrie obligatoire sur place · pas d'e-visa. Délai standard 15 jours selon Code Schengen, jusqu'à 45 en haute saison. Capago a remplacé VFS et TLScontact en avril 2025." },
          turkiye:          { name: 'Türkiye',           provider: 'Mosaic Visa — Centre officiel Türkiye, Alger',                                                            notes: "Visa sticker · biométrie sur place · e-visa disponible pour titulaires d'un visa Schengen, UK, US ou Irlande valide. Voyageurs algériens <15 ou >65 ans : entrée sans visa jusqu'à 90 jours." },
          allemagne:        { name: 'Allemagne',         provider: 'VFS Global, Sidi Yahia (Hydra), Alger',                                                                    notes: 'Schengen C-type · formulaire VIDEX en ligne · biométrie sur place · décision sous 15 jours en standard selon ambassade, dépôt entre 6 mois et 15 jours avant le départ.' },
          espagne:          { name: 'Espagne',           provider: 'BLS International — 2 centres (Alger · Oran)',                                                              notes: 'Schengen C-type · biométrie sur place · documents en français ou espagnol uniquement. Nouvelles catégories ALG1-ALG4 effectives janvier 2026 selon votre historique Schengen-Espagne.' },
          chine:            { name: 'Chine',             provider: 'CVASC, Ben Aknoun, Alger (dim. + jeu. 09:00-15:00)',                                                       notes: "Visa L tourisme ou M affaires · formulaire COVA en ligne obligatoire · invitation requise · pas d'e-visa pour passeports algériens ordinaires. Délai standard 4 jours ouvrables selon ambassade." },
          russie:           { name: 'Russie',            provider: 'Ambassade de Russie, El-Biar, Alger',                                                                       notes: "Visa sticker direct ambassade · voucher touristique d'une agence russe accréditée obligatoire · pas d'e-visa pour Algériens · délai standard 5-10 jours ouvrables selon ambassade." },
          egypte:           { name: 'Égypte',            provider: "Ambassade d'Égypte, Hydra, Alger · ou e-visa visa2egypt.gov.eg",                                            notes: "Visa sticker ou e-visa selon éligibilité · enfants de moins de 14 ans dispensés · option visa à l'arrivée pour groupes via lettre de garantie d'agence touristique. Nouvelle multi-entrée 5 ans annoncée pour Algériens — à vérifier au cas par cas." },
          arabie_saoudite:  { name: 'Arabie Saoudite',   provider: 'Ambassade KSA, Ben Aknoun · ou Nusuk (Umrah) · ou visa.visitsaudi.com (tourisme)',                          notes: "L'e-visa tourisme KSA n'est pas ouvert aux passeports algériens ordinaires sans visa Schengen, UK ou US valide, ou résidence GCC. Umrah : plateforme Nusuk en ligne. Hadj : régime distinct via agences agréées ONHO (hors notre périmètre)." },
          etats_unis:       { name: 'États-Unis',        provider: 'Ambassade des États-Unis, El-Biar, Alger',                                                                  notes: "DS-160 en ligne · entretien obligatoire à l'ambassade · biométrie sur place. Programme pilote « visa bond » en cours depuis janvier 2026 pour certains visiteurs B1/B2 algériens : caution remboursable de 5 000 à 15 000 USD selon dossier. Délai d'attente RDV variable." },
          canada:           { name: 'Canada',            provider: 'VFS Global Canada VAC, Ben Aknoun + Ambassade du Canada',                                                   notes: "Biométrie obligatoire à Alger (VAC Ben Aknoun, depuis octobre 2024) · les décisions IRCC sont émises par les bureaux extérieurs (Paris, Dakar, Rabat) selon le type de dossier. Empreintes valides 59 mois pour les demandes ultérieures." }
        },
        map: {
          eyebrow: 'Centres officiels · Algérie',
          title_l1: "D'où votre dossier",
          title_em: 'est-il déposé ?',
          sub: "Vue d'ensemble des ambassades et centres VFS, BLS, Capago et CVASC implantés en Algérie, ainsi que nos trois agences. Vous voyez d'un coup d'œil le trajet que votre dossier prend — et celui que vous n'avez pas à faire.",
          fallback_title: 'Chargement de la carte…',
          fallback_sub_html: 'VFS · BLS · Capago · CVASC · <strong>3 agences Alliance Travel</strong>',
          legend_embassy: 'Ambassades',
          legend_centre: 'VFS · BLS · Capago · CVASC',
          legend_agency: 'Agences Alliance Travel',
          a11y_label: 'Carte interactive des centres de visa et des agences Alliance Travel en Algérie',
          a11y_legend: 'Légende des marqueurs de la carte'
        },
        faq: {
          eyebrow: 'Questions fréquentes',
          title_l1: 'Ce que les gens',
          title_em: 'nous demandent.',
          q1:  { q: 'Combien de temps faut-il pour obtenir un visa Schengen ?',                       a: "Le délai dépend entièrement du consulat et de la période de l'année. Nous ne pouvons pas le garantir : nous indiquons les délais constatés sur les derniers mois, et nous calons votre dépôt aussi tôt que possible." },
          q2:  { q: 'Mon visa peut-il être refusé ?',                                                  a: "Oui. La décision appartient au consulat, et personne d'autre — agence, intermédiaire, sponsor — ne peut promettre l'inverse. Notre rôle est de présenter un dossier propre et complet ; la décision finale reste hors de notre contrôle." },
          q3:  { q: 'Combien coûte le service ?',                                                      a: 'Le tarif dépend du pays, du niveau de service choisi (RDV seul, dossier complet, ou dépôt) et de votre situation. On vous fait un devis personnalisé sur WhatsApp en moins de 30 minutes.' },
          q4:  { q: 'Quels documents dois-je apporter ?',                                              a: "La liste varie par consulat et par type de visa : passeport en cours de validité, justificatifs de revenus, attestation d'hébergement ou réservation d'hôtel, assurance, photos aux normes. On vous envoie la liste exacte une fois votre pays confirmé." },
          q5:  { q: 'Vais-je récupérer mon dossier en cas de refus ?',                                  a: "Le passeport et les documents originaux vous sont restitués par le consulat ou le centre de dépôt, refus ou pas. Les frais de visa déjà payés au consulat ne sont en revanche jamais remboursés — c'est la règle officielle, pas la nôtre." },
          q6:  { q: 'Quels pays acceptent les Algériens sans visa ?',                                    a: "Au moment où nous écrivons ces lignes : Tunisie, Maroc, Mauritanie, Syrie, Liban, Jordanie (sous conditions), Kenya, Maldives, plusieurs îles des Caraïbes et quelques pays d'Asie du Sud-Est. Cette liste évolue — vérifiez avec nous avant de réserver." },
          q7:  { q: 'Acceptez-vous les dossiers Umrah ?',                                              a: "L'Umrah est encadrée en Algérie par un agrément officiel distinct du nôtre. Selon votre cas, nous vous orientons vers une agence agréée Umrah pour la partie pèlerinage. Le visa touristique pour l'Arabie Saoudite (hors Umrah/Hajj) reste dans notre périmètre." },
          q8:  { q: 'Combien de temps avant le voyage dois-je faire la demande ?',                       a: "Le plus tôt possible — au minimum 6 à 8 semaines avant la date de départ pour un Schengen, parfois plus pour les pays à forte affluence. Plus on s'y prend tôt, plus on a de marge en cas de demande complémentaire du consulat." },
          q9:  { q: 'Quelle est la différence entre VFS, BLS, Capago et CVASC ?',                    a: "Ce sont des prestataires privés à qui les ambassades sous-traitent l'accueil des demandeurs : prise de RDV, dépôt des dossiers, biométrie. Chaque consulat choisit son centre — VFS travaille pour beaucoup de pays, BLS pour d'autres, Capago pour la France depuis avril 2025, CVASC pour la Chine. On vous oriente automatiquement vers le bon." },
          q10: { q: 'Faut-il un certificat médical ou une assurance voyage ?',                          a: "L'assurance voyage est obligatoire pour les visas Schengen (couverture minimum 30 000 €) et fortement recommandée ailleurs. Le certificat médical n'est exigé que pour certains pays (long séjour, étudiant). On vous indique exactement ce qui s'applique à votre dossier." },
          q11: { q: 'Puis-je déposer le dossier moi-même ?',                                            a: "Oui, totalement. C'est même la règle quand la biométrie ou un entretien sont obligatoires. Notre prestation « dépôt physique » est un service de confort là où le consulat l'autorise, pas une exclusivité — vous restez libre de monter à Alger si vous préférez." },
          q12: { q: 'Travaillez-vous avec des dossiers pour étudiants ?',                                a: "Oui. Le visa étudiant a ses spécificités (lettre d'admission, justificatifs de moyens financiers, parfois Campus France pour la France). On vous accompagne du calage du RDV jusqu'au dépôt, et on vous indique les pièces propres à votre université d'accueil." },
          q13: { q: "Que se passe-t-il si l'ambassade demande des documents supplémentaires ?",         a: "On vous prévient immédiatement sur WhatsApp, on liste précisément ce qui est demandé, et on vous aide à le constituer. Selon le pays, on peut compléter le dossier en cours ou reprendre un RDV — on gère le suivi jusqu'au bout." },
          q14: { q: 'Êtes-vous une agence officielle ou un intermédiaire ?',                            a: "Alliance Travel est une agence de voyages agréée, immatriculée à Bordj Bou Arreridj, en activité depuis 2019, avec trois agences physiques. Nous ne sommes ni partenaires officiels ni représentants des consulats : nous accompagnons votre demande en tant qu'agence de service." },
          q15: { q: 'Comment se passe le suivi de mon dossier ?',                                       a: "Un conseiller dédié vous suit sur WhatsApp du début à la fin : confirmation du RDV, checklist, validation du dossier, point d'étape avant le dépôt, et retour quand votre passeport est prêt à être récupéré." }
        },
        partners: {
          eyebrow: 'Partenaires opérationnels',
          disclaimer: "Nous traitons vos dossiers via ces centres officiels — Alliance Travel n'est pas affilié à ces sociétés et n'agit pas en leur nom.",
          capago_note: '· Visas France',
          vfs_note: '· Allemagne · Canada',
          bls_note: '· Espagne',
          cvasc_note: '· Chine',
          nusuk_note: '· Omra Arabie Saoudite'
        },
        cta: {
          eyebrow: 'Prêt à démarrer ?',
          title_l1: 'Trois façons',
          title_em: 'de nous joindre.',
          sub: "Choisissez ce qui vous va. WhatsApp pour aller vite, un appel pour parler à un humain, ou un passage à l'agence si vous préférez le café qui va avec.",
          wa:     { tag: 'Le plus rapide', title: 'WhatsApp',        body: 'Réponse en moins de 30 minutes pendant les heures d\'ouverture. Un conseiller arabophone disponible.', btn: 'Écrire sur WhatsApp' },
          phone:  { tag: 'Par téléphone',  title: 'Lignes directes' },
          branch: { tag: 'En agence',      title: 'Passez nous voir', zehour_addr: 'Cité Zehour · Route de Medjana' }
        },
        sticky: {
          a11y_label: 'Contact rapide',
          wa: 'WhatsApp',
          call: 'Appeler'
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
        visa_rdv: 'Visa Appointments',
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
          description: "Seven nights in Baku and Gabala. Turkish Airlines flight, e-visa, Arabic-speaking guide. June–October 2026 departures from Algiers. From DZD 227,000."
        },
        istanbul: {
          title: "Istanbul from Constantine · from DZD 123,000 — Alliance Travel",
          description: "Eight days in Istanbul, direct Turkish Airlines flights from Constantine. 4★ hotel, transfers, Arabic-speaking guide. Weekly departures, September–November 2026."
        },
        kuala_lumpur: {
          title: "Malaysia 2026 · Kuala Lumpur direct from Algiers, from DZD 211,000",
          description: "Eight days in Kuala Lumpur on the Air Algérie direct from Algiers. Grand Mercure 5★, Petronas Towers, Batu Caves and Genting Highlands tours. Halal end-to-end. From DZD 211,000."
        },
        sharm_constantine: {
          title: "Sharm El Sheikh from Constantine · from DZD 155,000 — Alliance Travel",
          description: "Sharm El Sheikh, ten days / eight nights all-inclusive, direct from Constantine on Turkish Airlines. 4★/5★ Red Sea hotels. Five departures, June–October 2026."
        },
      visa: {
        title: 'Visa Appointments & Dossier Service — Alliance Travel · BBA',
        description: 'Embassy and VFS appointments, full dossier, drop-off where the consulate allows it. Ten countries served from Bordj Bou Arreridj — no Algiers trip.',
        og_title: 'Visa Appointments — Alliance Travel',
        og_description: 'RDV, dossier, drop-off — we handle it from Bordj. Ten countries · 30-min WhatsApp reply.'
      },
      },
      visa: {
        hero: {
          eyebrow: 'Visa Appointment Service · Bordj Bou Arreridj',
          title_l1: 'Your visa appointment,',
          title_em: 'handled end-to-end.',
          lede: 'We book your embassy or VFS appointment, prepare the full dossier, and — where the consulate allows it — drop the file off for you. You stay in Bordj; we make the trip. Ten countries covered. Personalised quote on WhatsApp.',
          cta_wa: 'Message an advisor',
          cta_form: 'Browse countries',
          trust_branches: "Three offices on the ground · BBA & M'Sila",
          trust_no_alger: 'No trip to Algiers needed',
          trust_since: 'Operating since 2019 · 1,200+ files processed'
        },
        services: {
          eyebrow: 'Our services',
          title_l1: 'Three tiers,',
          title_em: 'your call.',
          sub: 'From a booked slot to physical drop-off, take exactly what you need — nothing more.',
          tier1: { tag: 'Tier 1', title: 'Appointment booking',      body: 'We secure your slot at the consulate, VFS, BLS, Capago or CVASC depending on the country. You get the confirmation on WhatsApp with the supporting documents ready to print.', cta: 'Message us about this' },
          tier2: { tag: 'Tier 2', title: 'Full dossier preparation', body: 'We review every document line by line: certificates, forms, translations, regulation-compliant photos, invitation letters. You arrive at the counter with a clean, complete file — no surprises at intake.', cta: 'Message us about this' },
          tier3: { tag: 'Tier 3', title: 'Physical drop-off',         body: 'Where the consulate permits, we hand in your file at the counter on your behalf. You stay in Bordj; we make the trip. Not available when the applicant must appear in person (biometrics, interview).', cta: 'Message us about this' }
        },
        countries: {
          eyebrow: 'Countries covered',
          title_l1: 'Ten countries,',
          title_em: 'one point of contact.',
          sub: "Tap a country to see the processing centre (embassy, VFS, BLS, Capago or CVASC) and which service tiers we provide. Biometrics and interviews always remain in person — that's the consulate's call.",
          chip: { tier1: 'RDV', tier2: 'Dossier', tier3: 'Drop-off' },
          cta_wa: 'Message us about this country',
          a11y_tiers: 'Service tiers available',
          france:           { name: 'France',            provider: 'Capago — 4 official centres (Algiers · Oran · Annaba · Constantine)',                                  notes: 'Schengen C-type · biometrics required on-site · no e-visa. Standard 15-day Schengen Code window, up to 45 days at peak. Capago replaced VFS + TLScontact in April 2025.' },
          turkiye:          { name: 'Türkiye',           provider: 'Mosaic Visa — Türkiye Visa Application Centre, Algiers',                                               notes: 'Sticker visa · biometrics on-site · e-visa available for holders of a valid Schengen, UK, US or Ireland visa. Algerians under 15 or over 65 can enter visa-free up to 90 days.' },
          allemagne:        { name: 'Germany',           provider: 'VFS Global, Sidi Yahia (Hydra), Algiers',                                                                notes: 'Schengen C-type · online VIDEX form · biometrics on-site · 15-day standard decision subject to embassy, submit between 6 months and 15 days before travel.' },
          espagne:          { name: 'Spain',             provider: 'BLS International — 2 centres (Algiers · Oran)',                                                          notes: 'Schengen C-type · biometrics on-site · documents in French or Spanish only. New ALG1-ALG4 appointment categories effective January 2026 based on your Spain-Schengen history.' },
          chine:            { name: 'China',             provider: 'CVASC, Ben Aknoun, Algiers (Sun + Thu 09:00-15:00)',                                                     notes: 'Tourist L or business M visa · COVA online form required · invitation needed · no e-visa for ordinary Algerian passports. Standard 4 working days, subject to embassy.' },
          russie:           { name: 'Russia',            provider: 'Russian Embassy, El-Biar, Algiers',                                                                       notes: 'Sticker visa direct from embassy · tourist voucher from an accredited Russian agency mandatory · no e-visa for Algerians · standard 5-10 working days subject to embassy.' },
          egypte:           { name: 'Egypt',             provider: 'Egyptian Embassy, Hydra, Algiers · or e-visa at visa2egypt.gov.eg',                                       notes: 'Sticker or e-visa depending on eligibility · children under 14 exempt · visa-on-arrival pathway for groups via tour-operator guarantee letter. New 5-year multi-entry visa announced for Algerians — verify case-by-case.' },
          arabie_saoudite:  { name: 'Saudi Arabia',      provider: 'KSA Embassy, Ben Aknoun · or Nusuk (Umrah) · or visa.visitsaudi.com (tourism)',                          notes: 'KSA tourist e-visa is not open to ordinary Algerian passports without a valid Schengen, UK or US visa, or GCC residency. Umrah: Nusuk online platform. Hajj: separate regime via ONHO-licensed agencies (outside our scope).' },
          etats_unis:       { name: 'United States',     provider: 'US Embassy, El-Biar, Algiers',                                                                            notes: "DS-160 online · interview mandatory · biometrics on-site. 'Visa bond' pilot active since January 2026 for select Algerian B1/B2 applicants: refundable bond $5,000-15,000 depending on file. Appointment wait time variable." },
          canada:           { name: 'Canada',            provider: 'VFS Global Canada VAC, Ben Aknoun + Canadian Embassy',                                                   notes: 'Biometrics mandatory in Algiers (VAC Ben Aknoun, since October 2024) · IRCC decisions issued by overseas offices (Paris, Dakar, Rabat) depending on file type. Prints valid 59 months for subsequent applications.' }
        },
        map: {
          eyebrow: 'Official centres · Algeria',
          title_l1: 'Where your file',
          title_em: 'is actually filed.',
          sub: "An overview of the embassies and VFS, BLS, Capago and CVASC centres operating in Algeria, plus our three offices. You see the route your file takes — and the one you don't have to.",
          fallback_title: 'Map loading…',
          fallback_sub_html: 'VFS · BLS · Capago · CVASC · <strong>3 Alliance Travel offices</strong>',
          legend_embassy: 'Embassies',
          legend_centre: 'VFS · BLS · Capago · CVASC',
          legend_agency: 'Alliance Travel offices',
          a11y_label: 'Interactive map of visa centres and Alliance Travel offices in Algeria',
          a11y_legend: 'Map marker legend'
        },
        faq: {
          eyebrow: 'Frequently asked questions',
          title_l1: 'What people',
          title_em: 'ask us.',
          q1:  { q: 'How long does a Schengen visa take?',                                       a: "The lead time depends entirely on the consulate and the time of year. We can't guarantee it: we share the durations observed over recent months and we file your application as early as possible." },
          q2:  { q: 'Can my visa be refused?',                                                   a: 'Yes. The decision belongs to the consulate, and no one else — agency, intermediary, sponsor — can promise otherwise. Our job is to present a clean, complete file; the final call stays out of our hands.' },
          q3:  { q: 'How much does the service cost?',                                           a: 'The fee depends on the country, the tier you choose (booking only, full dossier, drop-off) and your situation. You get a personalised quote on WhatsApp in under 30 minutes.' },
          q4:  { q: 'Which documents do I need to bring?',                                       a: 'The list varies by consulate and visa type: valid passport, proof of income, hotel reservation or invitation letter, insurance, regulation photos. We send you the exact list as soon as your destination is confirmed.' },
          q5:  { q: "Will I get my documents back if I'm refused?",                              a: "Your passport and original documents are returned to you by the consulate or the visa centre, refusal or not. The visa fee paid to the consulate, however, is never refunded — that's official policy, not ours." },
          q6:  { q: 'Which countries can Algerians enter without a visa?',                       a: 'At the time of writing: Tunisia, Morocco, Mauritania, Syria, Lebanon, Jordan (conditional), Kenya, the Maldives, several Caribbean islands and a few Southeast Asian countries. This list shifts — check with us before booking flights.' },
          q7:  { q: 'Do you handle Umrah files?',                                                a: "Umrah is governed in Algeria by a separate official licence we don't hold. Depending on your case, we'll direct you to a licensed Umrah agency for the pilgrimage leg. Saudi tourist visas (outside Umrah/Hajj) remain within our scope." },
          q8:  { q: 'How far in advance should I apply?',                                        a: 'As early as possible — at least 6 to 8 weeks before your departure date for Schengen, sometimes more for high-demand consulates. The earlier we start, the more cushion you have if the consulate asks for extra documents.' },
          q9:  { q: "What's the difference between VFS, BLS, Capago and CVASC?",            a: "They're private providers that embassies outsource intake to: booking, file drop-off, biometrics. Each consulate picks its own — VFS handles many countries, BLS others, Capago for France since April 2025, CVASC for China. We route you to the right one automatically." },
          q10: { q: 'Do I need a medical certificate or travel insurance?',                       a: 'Travel insurance is mandatory for Schengen visas (minimum €30,000 coverage) and strongly recommended elsewhere. A medical certificate is only required for certain countries (long-stay, student). We tell you exactly what applies to your file.' },
          q11: { q: 'Can I drop the file off myself?',                                            a: "Yes, absolutely. It's even the rule when biometrics or an interview are mandatory. Our 'physical drop-off' service is a convenience where the consulate allows it, not an exclusivity — you're free to head to Algiers if you prefer." },
          q12: { q: 'Do you handle student files?',                                                a: 'Yes. Student visas have their own requirements (admission letter, proof of funds, sometimes Campus France for France). We accompany you from booking to drop-off and tell you which documents your host university expects.' },
          q13: { q: 'What if the embassy asks for extra documents?',                              a: 'We let you know immediately on WhatsApp, list exactly what is needed, and help you put it together. Depending on the country we can complete the open file or rebook an appointment — we follow it through to the end.' },
          q14: { q: 'Are you an official agency or an intermediary?',                            a: 'Alliance Travel is a licensed travel agency, registered in Bordj Bou Arreridj, operating since 2019, with three physical offices. We are neither an official partner nor a representative of any consulate: we accompany your application as a service agency.' },
          q15: { q: 'How is my file tracked?',                                                    a: 'A dedicated advisor follows you on WhatsApp from start to finish: appointment confirmation, checklist, file validation, pre-drop check-in, and a message when your passport is ready to collect.' }
        },
        partners: {
          eyebrow: 'Operational partners',
          disclaimer: 'We process your files through these official centres — Alliance Travel is not affiliated with these companies and does not act on their behalf.',
          capago_note: '· France visas',
          vfs_note: '· Germany · Canada',
          bls_note: '· Spain',
          cvasc_note: '· China',
          nusuk_note: '· Umrah Saudi Arabia'
        },
        cta: {
          eyebrow: 'Ready to get started?',
          title_l1: 'Three ways',
          title_em: 'to reach us.',
          sub: 'Pick what suits you. WhatsApp for speed, a phone call for a real conversation, or walk into one of the offices if you want the coffee that comes with it.',
          wa:     { tag: 'Fastest',   title: 'WhatsApp',      body: 'Replies in under 30 minutes during opening hours. Arabic-speaking advisor available.', btn: 'Message us' },
          phone:  { tag: 'By phone',  title: 'Direct lines' },
          branch: { tag: 'In person', title: 'Come on in',    zehour_addr: 'Cité Zehour · Route de Medjana' }
        },
        sticky: {
          a11y_label: 'Quick contact',
          wa: 'WhatsApp',
          call: 'Call'
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
        visa_rdv: 'مواعيد التأشيرات',
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
          description: 'سبع ليالٍ بين باكو وقَبَلَة، طيران Turkish Airlines، التأشيرة الإلكترونية مشمولة، مُرافِق ناطق بالعربية. انطلاقات بين جوان وأكتوبر 2026 من الجزائر. ابتداءً من 227.000 د.ج.'
        },
        istanbul: {
          title: 'رحلة إسطنبول من قسنطينة ابتداءً من 123.000 دينار جزائري — أليانس',
          description: 'إسطنبول في ثمانية أيام، رحلات مباشرة بـTurkish Airlines من قسنطينة. فندق 4★، تنقّلات، مُرافِق ناطق بالعربية. انطلاقات أسبوعية بين سبتمبر ونوفمبر 2026.'
        },
        kuala_lumpur: {
          title: 'رحلة ماليزيا · كوالا لمبور برحلة مباشرة ابتداءً من 211.000 دينار جزائري',
          description: 'كوالا لمبور في ثمانية أيام، رحلة مباشرة بـAir Algérie من الجزائر. فندق Grand Mercure 5★، جولات Petronas وBatu Caves وGenting. حلال في كل مكان. ابتداءً من 211.000 د.ج.'
        },
        sharm_constantine: {
          title: 'رحلة شرم الشيخ من قسنطينة ابتداءً من 155.000 دينار جزائري',
          description: 'شرم الشيخ في عشرة أيام وثماني ليالٍ، نظام All Inclusive، انطلاقًا من قسنطينة. طيران Turkish Airlines، فنادق 4★/5★ على البحر الأحمر. خمس انطلاقات بين جوان وأكتوبر 2026.'
        },
      visa: {
        title: 'خدمة موعد التأشيرة وتجهيز الملف — أليانس ترافل · برج بوعريريج',
        description: 'نحجز مواعيد السفارات ومراكز VFS، نُعدّ الملف كاملاً، ونُودِعه نيابةً عنك حيث تسمح السفارة. عشر دول من برج بوعريريج — دون الحاجة للتنقّل إلى الجزائر العاصمة.',
        og_title: 'خدمة موعد التأشيرة — أليانس ترافل',
        og_description: 'الموعد، الملف، الإيداع — كلّه من برج. عشر دول · ردّ خلال 30 دقيقة على واتساب.'
      },
      },
      visa: {
        hero: {
          eyebrow: 'خدمة مواعيد التأشيرة · برج بوعريريج',
          title_l1: 'نتكفّل بموعد تأشيرتك',
          title_em: 'من الألف إلى الياء.',
          lede: 'نحجز لك موعدك في السفارة أو في مركز VFS، ونُعدّ ملفّك كاملاً، ونتولّى الإيداع نيابةً عنك حيث تسمح السفارة بذلك. أنت تبقى في برج، ونحن نتكفّل بالتنقّل. عشر دول مغطّاة. تقديرٌ مخصّص عبر واتساب.',
          cta_wa: 'تواصل عبر واتساب',
          cta_form: 'استكشف الدول',
          trust_branches: 'ثلاثة مكاتب فعليّة · برج بوعريريج والمسيلة',
          trust_no_alger: 'بدون التنقّل إلى العاصمة',
          trust_since: 'نعمل منذ 2019 · أكثر من 1 200 ملف'
        },
        services: {
          eyebrow: 'خدماتنا',
          title_l1: 'ثلاثة مستويات،',
          title_em: 'والاختيار لك.',
          sub: 'من حجز الموعد فقط إلى إيداع الملف فعليّاً، تأخذ ما تحتاجه بالضبط — لا أكثر.',
          tier1: { tag: 'المستوى الأوّل', title: 'حجز الموعد',            body: 'نحجز لك الموعد في القنصلية أو في مراكز VFS و BLS و كاباغو و CVASC حسب الدولة المطلوبة. تصلك التأكيدة عبر واتساب مرفقةً بالوثائق الجاهزة للطباعة.', cta: 'تواصل عبر واتساب' },
          tier2: { tag: 'المستوى الثاني', title: 'تجهيز الملف كاملاً',     body: 'نراجع كلّ وثيقة بدقّة: الشهادات، الاستمارات، الترجمات، الصور المطابقة للمعايير، رسائل الدعوة. تصل إلى الشبّاك بملفٍّ نظيفٍ وكامل — دون مفاجآت عند الاستقبال.', cta: 'تواصل عبر واتساب' },
          tier3: { tag: 'المستوى الثالث', title: 'إيداع الملف نيابةً عنك', body: 'حيث تسمح القنصلية بذلك، نسلّم ملفّك إلى الشبّاك بدلاً منك. تبقى في برج، ونحن نتنقّل. هذه الخدمة غير متاحة عندما يستوجب حضور الطالب شخصيّاً (البصمات أو المقابلة).', cta: 'تواصل عبر واتساب' }
        },
        countries: {
          eyebrow: 'الدول المغطّاة',
          title_l1: 'عشر دول،',
          title_em: 'ومركز اتصالٍ واحد.',
          sub: 'اضغط على دولة لمعرفة مركز المعالجة (السفارة، VFS، BLS، كاباغو أو CVASC) والمستويات التي نتكفّل بها. تبقى البصمات والمقابلات حضوريّةً وجوبيّاً — هذا قرار القنصلية.',
          chip: { tier1: 'الموعد', tier2: 'الملف', tier3: 'الإيداع' },
          cta_wa: 'تواصل عبر واتساب لهذه الدولة',
          a11y_tiers: 'مستويات الخدمة المتاحة',
          france:          { name: 'فرنسا',                       provider: 'كاباغو — 4 مراكز رسمية (الجزائر · وهران · عنّابة · قسنطينة)',                              notes: 'تأشيرة شنغن C · البصمات إلزامية حضوريّاً · لا توجد تأشيرة إلكترونية. مدّة قياسية 15 يوماً حسب قانون شنغن، حتى 45 يوماً في موسم الذروة. كاباغو حلّ محلّ VFS و TLScontact في أبريل 2025.' },
          turkiye:         { name: 'تركيا',                       provider: 'مركز Mosaic Visa الرسمي لتأشيرات تركيا، الجزائر العاصمة',                                notes: 'تأشيرة لاصقة · بصمات حضوريّة · التأشيرة الإلكترونية متاحة لحاملي تأشيرة شنغن أو UK أو US أو إيرلندا سارية. المسافرون الجزائريّون دون 15 سنة أو فوق 65 سنة: دخول بدون تأشيرة لمدّة 90 يوماً.' },
          allemagne:       { name: 'ألمانيا',                     provider: 'VFS Global، حي سيدي يحيى (حيدرة)، الجزائر العاصمة',                                       notes: 'تأشيرة شنغن C · استمارة VIDEX إلكترونيّة · البصمات حضوريّة · القرار في 15 يوماً قياسيّاً حسب السفارة، الإيداع بين 6 أشهر و15 يوماً قبل السفر.' },
          espagne:         { name: 'إسبانيا',                     provider: 'BLS International — مركزان (الجزائر · وهران)',                                            notes: 'تأشيرة شنغن C · بصمات حضوريّة · الوثائق بالفرنسية أو الإسبانية حصراً. فئات جديدة ALG1–ALG4 تدخل حيّز التنفيذ في يناير 2026 وفق سجلّك السابق مع إسبانيا.' },
          chine:           { name: 'الصين',                       provider: 'CVASC، حي بن عكنون، الجزائر العاصمة (الأحد + الخميس 09:00–15:00)',                       notes: 'تأشيرة L سياحيّة أو M أعمال · استمارة COVA إلكترونيّة إلزاميّة · رسالة دعوة مطلوبة · لا توجد تأشيرة إلكترونية للجوازات الجزائريّة العاديّة. مدّة قياسية 4 أيّام عمل حسب السفارة.' },
          russie:          { name: 'روسيا',                       provider: 'سفارة روسيا، الأبيار، الجزائر العاصمة',                                                   notes: 'تأشيرة لاصقة مباشرةً من السفارة · «فاوتشر» سياحي من وكالة روسية معتمدة إلزامي · لا توجد تأشيرة إلكترونية للجزائريّين · مدّة قياسية 5–10 أيّام عمل حسب السفارة.' },
          egypte:          { name: 'مصر',                         provider: 'سفارة مصر، حيدرة، الجزائر العاصمة · أو التأشيرة الإلكترونية عبر visa2egypt.gov.eg',         notes: 'تأشيرة لاصقة أو إلكترونية حسب الأهلية · الأطفال دون 14 سنة معفون · إمكان «التأشيرة عند الوصول» للمجموعات عبر رسالة ضمان من وكالة سياحية. تأشيرة متعدّدة الدخول لمدّة 5 سنوات للجزائريّين أُعلِنَ عنها — تُتحقَّق حالةً بحالة.' },
          arabie_saoudite: { name: 'المملكة العربيّة السعوديّة',   provider: 'سفارة المملكة، بن عكنون · أو Nusuk (عمرة) · أو visa.visitsaudi.com (سياحة)',                notes: 'التأشيرة السياحيّة الإلكترونية للسعوديّة ليست مفتوحة للجوازات الجزائريّة العاديّة دون تأشيرة شنغن أو UK أو US سارية، أو إقامة في دول الخليج. العمرة: منصّة Nusuk الإلكترونية. الحجّ: نظام مستقلّ عبر وكالات معتمدة من ONHO (خارج نطاق خدماتنا).' },
          etats_unis:      { name: 'الولايات المتّحدة الأمريكيّة', provider: 'سفارة الولايات المتّحدة، الأبيار، الجزائر العاصمة',                                          notes: 'استمارة DS-160 إلكترونياً · مقابلة إلزاميّة بالسفارة · بصمات حضوريّة. برنامج تجريبي «visa bond» منذ يناير 2026 لبعض طالبي B1/B2 الجزائريّين: كفالة مستردّة من 5 000 إلى 15 000 دولار حسب الملف. مدّة انتظار الموعد متفاوتة.' },
          canada:          { name: 'كندا',                        provider: 'VFS Global Canada VAC، بن عكنون + سفارة كندا',                                          notes: 'البصمات إلزاميّة في الجزائر العاصمة (VAC بن عكنون، منذ أكتوبر 2024) · قرارات IRCC تصدر من المكاتب الخارجية (باريس، داكار، الرباط) حسب نوع الملف. البصمات صالحة 59 شهراً للطلبات اللاحقة.' }
        },
        map: {
          eyebrow: 'المراكز الرسميّة · الجزائر',
          title_l1: 'أين يُودَع',
          title_em: 'ملفُّك فعلاً؟',
          sub: 'نظرة شاملة على السفارات ومراكز VFS و BLS و كاباغو و CVASC العاملة في الجزائر، إلى جانب مكاتبنا الثلاثة. ترى المسار الذي يسلكه ملفّك — والمسار الذي لن تضطرّ لقطعه بنفسك.',
          fallback_title: 'جارٍ تحميل الخريطة…',
          fallback_sub_html: 'VFS · BLS · Capago · CVASC · <strong>ثلاثة مكاتب لأليانس ترافل</strong>',
          legend_embassy: 'السفارات',
          legend_centre: 'VFS · BLS · Capago · CVASC',
          legend_agency: 'مكاتب أليانس ترافل',
          a11y_label: 'خريطة تفاعليّة لمراكز التأشيرات ومكاتب أليانس ترافل في الجزائر',
          a11y_legend: 'مفتاح علامات الخريطة'
        },
        faq: {
          eyebrow: 'الأسئلة المتداولة',
          title_l1: 'ما يسأله',
          title_em: 'الناس عنده.',
          q1:  { q: 'كم تستغرق تأشيرة شنغن؟',                                                     a: 'تتوقّف المدّة كلّيّاً على القنصلية والفترة من السنة. لا يمكننا ضمانها: نُطلِعك على المدد المُلاحَظة خلال الأشهر الأخيرة، ونحرص على تقديم ملفّك في أقرب وقت ممكن.' },
          q2:  { q: 'هل يمكن رفض تأشيرتي؟',                                                       a: 'نعم. القرار يعود إلى القنصلية، ولا يحقّ لأيّ طرفٍ آخر — وكالة أو وسيط أو كافل — أن يَعِد بعكس ذلك. دورنا تقديم ملفٍّ نظيفٍ وكامل، والقرار النهائيّ يبقى خارج سيطرتنا.' },
          q3:  { q: 'كم تبلغ تكلفة الخدمة؟',                                                       a: 'تختلف حسب الدولة والمستوى المختار (الموعد فقط، أو الملف كاملاً، أو الإيداع) ووضعك الشخصيّ. نُعدّ لك تقديراً مخصّصاً عبر واتساب في أقلّ من 30 دقيقة.' },
          q4:  { q: 'ما الوثائق التي يجب إحضارها؟',                                                a: 'تختلف القائمة حسب القنصلية ونوع التأشيرة: جواز سفرٍ ساري، إثبات الدخل، حجز فندقي أو رسالة دعوة، تأمين، صورٌ مطابقة للمعايير. نُرسل القائمة الدقيقة فور تأكيد وجهتك.' },
          q5:  { q: 'هل أستردّ ملفّي في حال الرفض؟',                                                a: 'يُعاد إليك جوازُ السفر والوثائق الأصليّة من القنصلية أو مركز الإيداع، سواءٌ قُبِل الطلب أو رُفِض. أمّا رسوم التأشيرة المدفوعة للقنصلية فلا تُسترَدّ مطلقاً — هذه قاعدة رسميّة، ليست قاعدتنا.' },
          q6:  { q: 'ما الدول التي تقبل الجزائريّين بدون تأشيرة؟',                                  a: 'وقت كتابة هذه السطور: تونس، المغرب، موريتانيا، سوريا، لبنان، الأردن (بشروط)، كينيا، المالديف، عدّةُ جزرٍ كاريبيّة، وبعض دول جنوب شرق آسيا. القائمة تتغيّر — تحقّق معنا قبل حجز التذاكر.' },
          q7:  { q: 'هل تتكفّلون بملفّات العمرة؟',                                                  a: 'العمرة في الجزائر يحكمها اعتمادٌ رسميٌّ مستقلّ لا نملكه. حسب حالتك، نوجّهك إلى وكالةٍ معتمَدةٍ للعمرة لتولّي شقّ الحج. أمّا التأشيرة السياحيّة إلى المملكة العربيّة السعوديّة (خارج العمرة والحجّ) فتدخل ضمن نطاق خدماتنا.' },
          q8:  { q: 'متى يجب أن أبدأ الإجراءات قبل السفر؟',                                          a: 'في أبكر وقتٍ ممكن — على الأقلّ ستّةً إلى ثمانية أسابيع قبل تاريخ السفر بالنسبة لشنغن، وأحياناً أكثر في القنصليّات ذات الإقبال العالي. كلّما بدأنا مبكّراً، اتّسع هامش التحرّك إذا طلبت القنصلية وثائق إضافيّة.' },
          q9:  { q: 'ما الفرق بين VFS و BLS و كاباغو و CVASC؟',                                a: 'هي شركاتٌ خاصّة تُسنِد إليها السفارات استقبالَ الطالبين: الحجز، الإيداع، البصمات. كلّ قنصليّةٍ تختار شريكها — VFS لكثيرٍ من الدول، BLS لأخرى، كاباغو لفرنسا منذ أبريل 2025، CVASC للصين. نوجّهك تلقائيّاً إلى المركز الصحيح.' },
          q10: { q: 'هل يلزم تأمينُ السفر أو شهادةٌ طبّيّة؟',                                       a: 'تأمين السفر إلزاميٌّ في تأشيرات شنغن (تغطيةٌ لا تقلّ عن 30 000 يورو) ويُنصح به بقوّةٍ في باقي الوجهات. الشهادة الطبّيّة لا تُطلب إلّا في بعض الدول (الإقامة الطويلة، الدراسة). نُحدّد لك بدقّة ما يَنطبق على ملفّك.' },
          q11: { q: 'هل بإمكاني إيداع الملف بنفسي؟',                                                a: 'نعم، تماماً. بل إنّها القاعدة عندما تكون البصمات أو المقابلة إلزاميّتين. خدمة الإيداع لدينا هي خدمةُ راحةٍ حيث تسمح القنصلية، وليست حصراً — يبقى لك حقّ التنقّل إلى العاصمة إن فضّلت.' },
          q12: { q: 'هل تتعاملون مع ملفّات الطلبة؟',                                                a: 'نعم. لتأشيرة الدراسة خصوصيّاتُها (رسالة القبول، إثبات الموارد الماليّة، أحياناً Campus France بالنسبة لفرنسا). نرافقك من حجز الموعد إلى الإيداع، ونُبيّن لك الوثائق التي تطلبها جامعتُك المضيفة.' },
          q13: { q: 'ماذا يحدث إذا طلبت السفارة وثائق إضافيّة؟',                                     a: 'نُعلمك على الفور عبر واتساب، ونعدّد لك بدقّةٍ المطلوب، ونساعدك على تجهيزه. بحسب الدولة، إمّا نُكمل الملف الجاري أو نعيد حجز الموعد — نتابع المسار إلى النهاية.' },
          q14: { q: 'هل أنتم وكالةٌ رسميّة أم وسيط؟',                                                a: 'أليانس ترافل وكالةُ أسفارٍ معتمَدة، مسجّلةٌ في برج بوعريريج، تنشط منذ 2019، ولها ثلاثةُ مكاتبَ فعليّة. لسنا شريكاً رسميّاً ولا ممثّلاً لأيّ قنصلية: نرافق طلبك بوصفنا وكالة خدمة.' },
          q15: { q: 'كيف يتمّ متابعة ملفّي؟',                                                       a: 'مستشارٌ متفرّغ يرافقك على واتساب من البداية إلى النهاية: تأكيد الموعد، قائمة الوثائق، مراجعة الملف، نقطةُ تواصلٍ قبيل الإيداع، ورسالةٌ حين يصبح جواز سفرك جاهزاً للاستلام.' }
        },
        partners: {
          eyebrow: 'الشركاء التشغيليّون',
          disclaimer: 'نُعالج ملفّاتكم عبر هذه المراكز الرسميّة — أليانس ترافل ليست تابعةً لهذه الشركات ولا تتصرّف باسمها.',
          capago_note: '· تأشيرات فرنسا',
          vfs_note: '· ألمانيا · كندا',
          bls_note: '· إسبانيا',
          cvasc_note: '· الصين',
          nusuk_note: '· العمرة المملكة العربيّة السعوديّة'
        },
        cta: {
          eyebrow: 'جاهز للبدء؟',
          title_l1: 'ثلاث طرقٍ',
          title_em: 'للتواصل معنا.',
          sub: 'اختر ما يناسبك. واتساب للسرعة، أو مكالمةٌ لتتحدّث مع إنسان، أو زرنا في المكتب إذا كنت تفضّل القهوة التي تأتي معها.',
          wa:     { tag: 'الأسرع',        title: 'واتساب',          body: 'نردّ في أقلّ من 30 دقيقة خلال أوقات العمل. مستشارٌ ناطقٌ بالعربيّة متوفّر.', btn: 'راسلنا الآن' },
          phone:  { tag: 'عبر الهاتف',   title: 'الخطوط المباشرة' },
          branch: { tag: 'في المكتب',    title: 'تفضّلوا بزيارتنا', zehour_addr: 'حيّ الزهور · طريق المجانة' }
        },
        sticky: {
          a11y_label: 'تواصلٌ سريع',
          wa: 'واتساب',
          call: 'اتّصل'
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

  /* a11y (WCAG 4.1.3): announce language change to assistive tech.
     Lazy-created so it never fires on first page load (init) — only
     on a user-initiated switch via setLang. */
  let _liveRegion = null;
  const LANG_ANNOUNCE = {
    fr: 'Langue changée en français.',
    en: 'Language changed to English.',
    ar: 'تم تغيير اللغة إلى العربية.'
  };
  function announceLang(lang) {
    if (!_liveRegion) {
      _liveRegion = document.createElement('div');
      _liveRegion.setAttribute('role', 'status');
      _liveRegion.setAttribute('aria-live', 'polite');
      _liveRegion.setAttribute('aria-atomic', 'true');
      _liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
      document.body.appendChild(_liveRegion);
    }
    // Set lang on the region itself so the SR uses the correct voice.
    _liveRegion.setAttribute('lang', lang);
    _liveRegion.textContent = LANG_ANNOUNCE[lang] || LANG_ANNOUNCE.fr;
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    if (lang === 'ar') ensureArabicFont();
    persistLang(lang);
    setHtmlAttrs(lang);
    translate(lang);
    updateMeta(lang);
    reflectActive(lang);
    announceLang(lang);
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
