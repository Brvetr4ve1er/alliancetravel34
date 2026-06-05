#!/usr/bin/env python
"""
Append the `visa.*` namespace to T.fr, T.en, T.ar in site/assets/js/i18n.js,
and insert nav.visa key + meta.visa block in all three.

Strategy:
  - Insert `visa: 'Rendez-vous Visa'` (and EN/AR) right after `trips:` in nav.
  - Insert `meta.visa = { title, description, og_title, og_description }`
    inside the meta block of each lang.
  - Append `visa: {...}` to each T.lang block immediately before the closing
    `}` that follows the last namespace.
"""
import io, re, sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
ROOT = Path(r'C:/Users/ROG STRIX/Documents/alliance travel')
F = ROOT / 'site' / 'assets' / 'js' / 'i18n.js'

VISA_NAV_KEY = {
    'fr': "        visa_rdv: 'Rendez-vous Visa',",
    'en': "        visa_rdv: 'Visa Appointments',",
    'ar': "        visa_rdv: 'مواعيد التأشيرات',",
}

VISA_META_KEY = {
    'fr': """      visa: {
        title: 'Rendez-vous Visa · Alliance Travel · Bordj Bou Arreridj',
        description: "Réservation de RDV ambassade et VFS, préparation complète de dossier, dépôt physique selon ambassade. 10 pays couverts depuis Bordj Bou Arreridj — pas besoin de monter à Alger.",
        og_title: 'Rendez-vous Visa · Alliance Travel',
        og_description: "On s'occupe du RDV, du dossier et du dépôt — vous restez à Bordj. 10 pays · réponse WhatsApp en 30 min."
      },""",
    'en': """      visa: {
        title: 'Visa Appointments & Dossier Service — Alliance Travel · BBA',
        description: 'We book embassy and VFS appointments, prepare the full dossier, and handle drop-off where the consulate allows it. Ten countries served from Bordj Bou Arreridj — no trip to Algiers required.',
        og_title: 'Visa Appointments — Alliance Travel',
        og_description: 'RDV, dossier, drop-off — we handle it from Bordj. Ten countries · 30-min WhatsApp reply.'
      },""",
    'ar': """      visa: {
        title: 'خدمة موعد التأشيرة وتجهيز الملف — أليانس ترافل · برج بوعريريج',
        description: 'نحجز مواعيد السفارات ومراكز VFS، نُعدّ الملف كاملاً، ونُودِعه نيابةً عنك حيث تسمح السفارة. عشر دول من برج بوعريريج — دون الحاجة للتنقّل إلى الجزائر العاصمة.',
        og_title: 'خدمة موعد التأشيرة — أليانس ترافل',
        og_description: 'الموعد، الملف، الإيداع — كلّه من برج. عشر دول · ردّ خلال 30 دقيقة على واتساب.'
      },""",
}

# The big payload. Indented at 6 spaces (matches T.{lang} namespace child level).
VISA_BLOCK = {
    'fr': r"""      visa: {
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
          tier1: { tag: 'Niveau 1', title: 'Réservation du RDV',                    body: 'On bloque votre créneau au consulat, à VFS, BLS, TLScontact ou CVASC selon le pays demandé. Vous recevez la confirmation du rendez-vous par WhatsApp avec les justificatifs à imprimer.', cta: 'WhatsApp pour ce service' },
          tier2: { tag: 'Niveau 2', title: 'Préparation complète du dossier',       body: "Relecture point par point de chaque document, attestations, formulaires, traductions, photos aux normes, lettres d'invitation. Vous arrivez au guichet avec un dossier propre et complet — pas de surprise à l'accueil.", cta: 'WhatsApp pour ce service' },
          tier3: { tag: 'Niveau 3', title: 'Dépôt physique du dossier',             body: "Là où le consulat l'autorise, on remet votre dossier au guichet à votre place. Vous restez à Bordj, on fait la route. Service non disponible quand la présence du demandeur est exigée (biométrie, entretien).", cta: 'WhatsApp pour ce service' }
        },
        countries: {
          eyebrow: 'Pays couverts',
          title_l1: 'Dix pays,',
          title_em: 'un seul interlocuteur.',
          sub: "Cliquez sur un pays pour voir le centre de traitement (ambassade, VFS, BLS, TLScontact ou CVASC) et les niveaux de service que nous prenons en charge. La biométrie et les entretiens restent obligatoirement en présentiel — c'est le consulat qui décide.",
          chip: { tier1: 'RDV', tier2: 'Dossier', tier3: 'Dépôt' },
          cta_wa: 'WhatsApp pour ce pays',
          a11y_tiers: 'Niveaux de service disponibles',
          france:           { name: 'France',            provider: 'Capago — 4 centres officiels (Alger · Oran · Annaba · Constantine)',                                     notes: "Schengen C-type · biométrie obligatoire sur place · pas d'e-visa. Délai standard 15 jours selon Code Schengen, jusqu'à 45 en haute saison. Capago a remplacé VFS et TLScontact en avril 2025." },
          turkiye:          { name: 'Türkiye',           provider: 'Mosaic Visa — Centre officiel Türkiye, Alger',                                                            notes: "Visa sticker · biométrie sur place · e-visa disponible pour titulaires d'un visa Schengen, UK, US ou Irlande valide. Voyageurs algériens <15 ou >65 ans : entrée sans visa jusqu'à 90 jours." },
          allemagne:        { name: 'Allemagne',         provider: 'VFS Global, Sidi Yahia (Hydra), Alger',                                                                    notes: 'Schengen C-type · formulaire VIDEX en ligne · biométrie sur place · décision sous 15 jours en standard, dépôt entre 6 mois et 15 jours avant le départ.' },
          espagne:          { name: 'Espagne',           provider: 'BLS International — 2 centres (Alger · Oran)',                                                              notes: 'Schengen C-type · biométrie sur place · documents en français ou espagnol uniquement. Nouvelles catégories ALG1-ALG4 effectives janvier 2026 selon votre historique Schengen-Espagne.' },
          chine:            { name: 'Chine',             provider: 'CVASC, Ben Aknoun, Alger (dim. + jeu. 09:00-15:00)',                                                       notes: "Visa L tourisme ou M affaires · formulaire COVA en ligne obligatoire · invitation requise · pas d'e-visa pour passeports algériens ordinaires. Délai standard 4 jours ouvrables." },
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
          sub: "Vue d'ensemble des ambassades et centres VFS, BLS, TLScontact et CVASC implantés en Algérie, ainsi que nos trois agences. Vous voyez d'un coup d'œil le trajet que votre dossier prend — et celui que vous n'avez pas à faire.",
          fallback_title: 'Chargement de la carte…',
          fallback_sub_html: 'VFS · BLS · TLScontact · CVASC · <strong>3 agences Alliance Travel</strong>',
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
          q9:  { q: 'Quelle est la différence entre VFS, BLS, TLScontact et CVASC ?',                    a: "Ce sont des prestataires privés à qui les ambassades sous-traitent l'accueil des demandeurs : prise de RDV, dépôt des dossiers, biométrie. Chaque consulat choisit son centre — VFS travaille pour beaucoup de pays, BLS pour d'autres, Capago pour la France depuis avril 2025, CVASC pour la Chine. On vous oriente automatiquement vers le bon." },
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
      }""",
    'en': r"""      visa: {
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
          tier1: { tag: 'Tier 1', title: 'Appointment booking',      body: 'We secure your slot at the consulate, VFS, BLS, TLScontact or CVASC depending on the country. You get the confirmation on WhatsApp with the supporting documents ready to print.', cta: 'Message us about this' },
          tier2: { tag: 'Tier 2', title: 'Full dossier preparation', body: 'We review every document line by line: certificates, forms, translations, regulation-compliant photos, invitation letters. You arrive at the counter with a clean, complete file — no surprises at intake.', cta: 'Message us about this' },
          tier3: { tag: 'Tier 3', title: 'Physical drop-off',         body: 'Where the consulate permits, we hand in your file at the counter on your behalf. You stay in Bordj; we make the trip. Not available when the applicant must appear in person (biometrics, interview).', cta: 'Message us about this' }
        },
        countries: {
          eyebrow: 'Countries covered',
          title_l1: 'Ten countries,',
          title_em: 'one point of contact.',
          sub: "Tap a country to see the processing centre (embassy, VFS, BLS, TLScontact or CVASC) and which service tiers we provide. Biometrics and interviews always remain in person — that's the consulate's call.",
          chip: { tier1: 'RDV', tier2: 'Dossier', tier3: 'Drop-off' },
          cta_wa: 'Message us about this country',
          a11y_tiers: 'Service tiers available',
          france:           { name: 'France',            provider: 'Capago — 4 official centres (Algiers · Oran · Annaba · Constantine)',                                  notes: 'Schengen C-type · biometrics required on-site · no e-visa. Standard 15-day Schengen Code window, up to 45 days at peak. Capago replaced VFS + TLScontact in April 2025.' },
          turkiye:          { name: 'Türkiye',           provider: 'Mosaic Visa — Türkiye Visa Application Centre, Algiers',                                               notes: 'Sticker visa · biometrics on-site · e-visa available for holders of a valid Schengen, UK, US or Ireland visa. Algerians under 15 or over 65 can enter visa-free up to 90 days.' },
          allemagne:        { name: 'Germany',           provider: 'VFS Global, Sidi Yahia (Hydra), Algiers',                                                                notes: 'Schengen C-type · online VIDEX form · biometrics on-site · 15-day standard decision, submit between 6 months and 15 days before travel.' },
          espagne:          { name: 'Spain',             provider: 'BLS International — 2 centres (Algiers · Oran)',                                                          notes: 'Schengen C-type · biometrics on-site · documents in French or Spanish only. New ALG1-ALG4 appointment categories effective January 2026 based on your Spain-Schengen history.' },
          chine:            { name: 'China',             provider: 'CVASC, Ben Aknoun, Algiers (Sun + Thu 09:00-15:00)',                                                     notes: 'Tourist L or business M visa · COVA online form required · invitation needed · no e-visa for ordinary Algerian passports. Standard 4 working days.' },
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
          sub: "An overview of the embassies and VFS, BLS, TLScontact and CVASC centres operating in Algeria, plus our three offices. You see the route your file takes — and the one you don't have to.",
          fallback_title: 'Map loading…',
          fallback_sub_html: 'VFS · BLS · TLScontact · CVASC · <strong>3 Alliance Travel offices</strong>',
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
          q9:  { q: "What's the difference between VFS, BLS, TLScontact and CVASC?",            a: "They're private providers that embassies outsource intake to: booking, file drop-off, biometrics. Each consulate picks its own — VFS handles many countries, BLS others, Capago for France since April 2025, CVASC for China. We route you to the right one automatically." },
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
      }""",
    'ar': r"""      visa: {
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
          tier1: { tag: 'المستوى الأوّل', title: 'حجز الموعد',            body: 'نحجز لك الموعد في القنصلية أو في مراكز VFS و BLS و TLScontact و CVASC حسب الدولة المطلوبة. تصلك التأكيدة عبر واتساب مرفقةً بالوثائق الجاهزة للطباعة.', cta: 'تواصل عبر واتساب' },
          tier2: { tag: 'المستوى الثاني', title: 'تجهيز الملف كاملاً',     body: 'نراجع كلّ وثيقة بدقّة: الشهادات، الاستمارات، الترجمات، الصور المطابقة للمعايير، رسائل الدعوة. تصل إلى الشبّاك بملفٍّ نظيفٍ وكامل — دون مفاجآت عند الاستقبال.', cta: 'تواصل عبر واتساب' },
          tier3: { tag: 'المستوى الثالث', title: 'إيداع الملف نيابةً عنك', body: 'حيث تسمح القنصلية بذلك، نسلّم ملفّك إلى الشبّاك بدلاً منك. تبقى في برج، ونحن نتنقّل. هذه الخدمة غير متاحة عندما يستوجب حضور الطالب شخصيّاً (البصمات أو المقابلة).', cta: 'تواصل عبر واتساب' }
        },
        countries: {
          eyebrow: 'الدول المغطّاة',
          title_l1: 'عشر دول،',
          title_em: 'ومركز اتصالٍ واحد.',
          sub: 'اضغط على دولة لمعرفة مركز المعالجة (السفارة، VFS، BLS، TLScontact أو CVASC) والمستويات التي نتكفّل بها. تبقى البصمات والمقابلات حضوريّةً وجوبيّاً — هذا قرار القنصلية.',
          chip: { tier1: 'الموعد', tier2: 'الملف', tier3: 'الإيداع' },
          cta_wa: 'تواصل عبر واتساب لهذه الدولة',
          a11y_tiers: 'مستويات الخدمة المتاحة',
          france:          { name: 'فرنسا',                       provider: 'كاباغو — 4 مراكز رسمية (الجزائر · وهران · عنّابة · قسنطينة)',                              notes: 'تأشيرة شنغن C · البصمات إلزامية حضوريّاً · لا توجد تأشيرة إلكترونية. مدّة قياسية 15 يوماً حسب قانون شنغن، حتى 45 يوماً في موسم الذروة. كاباغو حلّ محلّ VFS و TLScontact في أبريل 2025.' },
          turkiye:         { name: 'تركيا',                       provider: 'مركز Mosaic Visa الرسمي لتأشيرات تركيا، الجزائر العاصمة',                                notes: 'تأشيرة لاصقة · بصمات حضوريّة · التأشيرة الإلكترونية متاحة لحاملي تأشيرة شنغن أو UK أو US أو إيرلندا سارية. المسافرون الجزائريّون دون 15 سنة أو فوق 65 سنة: دخول بدون تأشيرة لمدّة 90 يوماً.' },
          allemagne:       { name: 'ألمانيا',                     provider: 'VFS Global، حي سيدي يحيى (حيدرة)، الجزائر العاصمة',                                       notes: 'تأشيرة شنغن C · استمارة VIDEX إلكترونيّة · البصمات حضوريّة · القرار في 15 يوماً قياسيّاً، الإيداع بين 6 أشهر و15 يوماً قبل السفر.' },
          espagne:         { name: 'إسبانيا',                     provider: 'BLS International — مركزان (الجزائر · وهران)',                                            notes: 'تأشيرة شنغن C · بصمات حضوريّة · الوثائق بالفرنسية أو الإسبانية حصراً. فئات جديدة ALG1–ALG4 تدخل حيّز التنفيذ في يناير 2026 وفق سجلّك السابق مع إسبانيا.' },
          chine:           { name: 'الصين',                       provider: 'CVASC، حي بن عكنون، الجزائر العاصمة (الأحد + الخميس 09:00–15:00)',                       notes: 'تأشيرة L سياحيّة أو M أعمال · استمارة COVA إلكترونيّة إلزاميّة · رسالة دعوة مطلوبة · لا توجد تأشيرة إلكترونية للجوازات الجزائريّة العاديّة. مدّة قياسية 4 أيّام عمل.' },
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
          sub: 'نظرة شاملة على السفارات ومراكز VFS و BLS و TLScontact و CVASC العاملة في الجزائر، إلى جانب مكاتبنا الثلاثة. ترى المسار الذي يسلكه ملفّك — والمسار الذي لن تضطرّ لقطعه بنفسك.',
          fallback_title: 'جارٍ تحميل الخريطة…',
          fallback_sub_html: 'VFS · BLS · TLScontact · CVASC · <strong>ثلاثة مكاتب لأليانس ترافل</strong>',
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
          q9:  { q: 'ما الفرق بين VFS و BLS و TLScontact و CVASC؟',                                a: 'هي شركاتٌ خاصّة تُسنِد إليها السفارات استقبالَ الطالبين: الحجز، الإيداع، البصمات. كلّ قنصليّةٍ تختار شريكها — VFS لكثيرٍ من الدول، BLS لأخرى، كاباغو لفرنسا منذ أبريل 2025، CVASC للصين. نوجّهك تلقائيّاً إلى المركز الصحيح.' },
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
      }""",
}

text = F.read_text(encoding='utf-8')

# Find the boundary of each top-level lang block.
# Looking for `    fr: {`, `    en: {`, `    ar: {` and their matching close.
def find_lang_block_close(text: str, lang: str):
    # Find `    {lang}: {` at start of line
    pat = re.compile(r'^    ' + re.escape(lang) + r':\s*\{', re.MULTILINE)
    m = pat.search(text)
    if not m:
        raise SystemExit(f'lang block {lang!r} not found')
    start = m.end()
    depth = 1
    i = start
    while i < len(text) and depth > 0:
        c = text[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
        i += 1
    if depth != 0:
        raise SystemExit(f'unbalanced braces in {lang!r}')
    return m.start(), i - 1  # i points to char after `}`, so i-1 is `}`

def find_in_lang(text, lang, sub_pattern):
    start, end = find_lang_block_close(text, lang)
    block = text[start:end]
    return start, end, block

# 1) Insert `visa_rdv: ...` after `trips: ...` in each nav block, scoped to lang.
for lang in ('fr', 'en', 'ar'):
    start, end = find_lang_block_close(text, lang)
    block = text[start:end+1]
    # Find first `trips: 'X',\n` inside this lang block (the nav.trips key)
    new_block, count = re.subn(
        r"(        trips:\s*'[^']*',\n)",
        rf"\1{VISA_NAV_KEY[lang]}\n",
        block,
        count=1
    )
    if count != 1:
        raise SystemExit(f'Could not insert visa_rdv in {lang} nav')
    text = text[:start] + new_block + text[end+1:]

# 2) Insert meta.visa block after meta: { entry's last property.
# Simpler: append `visa: {...}` inside meta. Find `      meta: {` and walk to its close.
for lang in ('fr', 'en', 'ar'):
    lang_start, lang_end = find_lang_block_close(text, lang)
    lang_text = text[lang_start:lang_end+1]
    # Find meta: { inside this lang text
    m = re.search(r'      meta:\s*\{', lang_text)
    if not m:
        # If no meta block, skip (acceptable for AR if minimal)
        print(f'  {lang}: no meta block, skipping meta.visa')
        continue
    meta_start = m.end()
    depth = 1
    i = meta_start
    while i < len(lang_text) and depth > 0:
        c = lang_text[i]
        if c == '{': depth += 1
        elif c == '}': depth -= 1
        i += 1
    meta_close_idx = i - 1  # position of meta's closing }
    # Insert VISA_META_KEY just before the closing brace of meta, with a comma before it
    new_lang_text = (
        lang_text[:meta_close_idx].rstrip()
        + (',\n' if not lang_text[:meta_close_idx].rstrip().endswith(',') else '\n')
        + VISA_META_KEY[lang]
        + '\n      '
        + lang_text[meta_close_idx:]
    )
    text = text[:lang_start] + new_lang_text + text[lang_end+1:]
    print(f'  {lang}: meta.visa appended')

# 3) Append `visa: {...}` namespace as last entry of each lang block.
for lang in ('fr', 'en', 'ar'):
    lang_start, lang_end = find_lang_block_close(text, lang)
    # The closing brace of the lang block is at lang_end (position of '}')
    # We want to insert a comma after the last existing entry, then our visa block, then keep '}'.
    # The text immediately before lang_end is the last entry's content.
    before = text[lang_start:lang_end]
    # Strip trailing whitespace, ensure it ends with comma (we'll add one if not)
    trimmed = before.rstrip()
    if trimmed.endswith(','):
        insertion = '\n' + VISA_BLOCK[lang] + '\n    '
    else:
        insertion = ',\n' + VISA_BLOCK[lang] + '\n    '
    text = text[:lang_start] + trimmed + insertion + text[lang_end:]
    print(f'  {lang}: visa namespace appended')

F.write_text(text, encoding='utf-8')
print(f'\n✓ i18n.js updated: {F.stat().st_size} bytes')
