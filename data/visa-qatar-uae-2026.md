# Visa — Qatar & Émirats arabes unis (Dubaï) · données carte pays 2026

> Source de vérité pour ajouter 2 cartes pays à `site/rendez-vous-visa/index.html`.
> Passeport algérien **ordinaire**. Copie FR. Gouvernance respectée : **aucun tarif**
> (« devis sur WhatsApp »), **aucun délai promis** (hedge « selon l'autorité
> compétente »), **aucune revendication de partenariat**, divulgation honnête des
> contraintes réelles. Vérifié juin 2026.

---

## 1 · Qatar

- **`data-country`** : `qatar`
- **flag** : `qa` — fichier attendu `../assets/images/flags/qa.svg`
  (drapeau civil, disponible sur lipis/flag-icons)
- **`name`** : `Qatar`

- **`provider`** (canal de traitement réel, FR) :
  > **e-visa Hayya — plateforme officielle en ligne (hayya.qa) · catégorie A1 tourisme**

- **`notes`** (FR, hedgé, honnête) :
  > E-visa A1 tourisme via la plateforme Hayya · **pas de visa à l'arrivée** pour les
  > passeports algériens ordinaires · demande 100 % en ligne, sans biométrie ni
  > déplacement à un centre en Algérie. Validité 30 jours à entrée unique, extensible
  > une fois auprès du Ministère de l'Intérieur qatari. Délai d'instruction selon
  > l'autorité compétente — déposez la demande bien avant le départ.

- **Couverture niveaux de service (RDV / dossier / dépôt)** :
  - **RDV** → *non applicable* (pas de rendez-vous : tout est en ligne). Chip **muted**.
  - **Dossier** → **applicable** — montage et relecture du dossier Hayya
    (passeport ≥ 6 mois, photo aux normes, réservation d'hôtel/justificatif
    d'hébergement, billet retour). Chip **actif**.
  - **Dépôt** → *non applicable* (dépôt dématérialisé, pas de guichet). Chip **muted**.
  - → tiers HTML : `chip` (RDV muted) · `chip` (Dossier actif) · `chip--muted` (Dépôt)
    — c.-à-d. premier chip RDV en `--muted`, Dossier en actif, Dépôt en `--muted`.
    *(NB : structurellement seul « Dossier » est réellement offert ; afficher
    RDV et Dépôt en muted reste cohérent avec le reste de la grille.)*

- **FAQ FR suggérée** :
  - **Q. Faut-il se déplacer à un centre ou à l'ambassade du Qatar en Algérie ?**
    R. Non. La demande Hayya est entièrement en ligne, sans biométrie ni dépôt
    physique. On peut monter et vérifier votre dossier à distance avant soumission.
  - **Q. Combien de temps mon visa Qatar est-il valable ?**
    R. Le visa touristique A1 est valable 30 jours à entrée unique à compter de
    l'arrivée, avec une prolongation possible auprès des autorités qataries. Le délai
    de traitement dépend de l'autorité compétente — anticipez votre demande.

- **`provider` (chaîne i18n FR prête à coller)** :
  `e-visa Hayya — plateforme officielle hayya.qa · catégorie A1 tourisme`
- **`notes` (chaîne i18n FR prête à coller)** :
  `E-visa A1 tourisme via la plateforme Hayya · pas de visa à l'arrivée pour les passeports algériens ordinaires · demande 100 % en ligne, sans biométrie ni centre en Algérie. Validité 30 jours, entrée unique, extensible une fois. Délai d'instruction selon l'autorité compétente.`

---

## 2 · Émirats arabes unis (Dubaï)

- **`data-country`** : `emirats`
- **flag** : `ae` — fichier attendu `../assets/images/flags/ae.svg`
  (drapeau civil, disponible sur lipis/flag-icons)
- **`name`** : `Émirats arabes unis`

- **`provider`** (canal de traitement réel, FR) :
  > **Visa parrainé en amont — compagnie aérienne (Emirates / flydubai / Etihad),
  > hôtel agréé ou agence de tourisme aux Émirats · portails GDRFA (Dubaï) / ICP
  > (autres émirats)**

- **`notes`** (FR, hedgé, honnête) :
  > **Pas de visa à l'arrivée** pour les passeports algériens ordinaires : le visa
  > de visite doit être **parrainé en amont** par un sponsor aux Émirats — compagnie
  > aérienne (Emirates, flydubai, Etihad), hôtel agréé, agence de tourisme, ou un
  > proche titulaire d'un titre de séjour émirati valide (le sponsor engage sa
  > responsabilité légale sur le séjour). Traitement via les portails officiels
  > **GDRFA** (Dubaï) ou **ICP** (autres émirats). Le visa fait l'objet d'une
  > approbation sécuritaire ; le délai dépend de l'autorité compétente. Respectez
  > strictement la date de sortie — les Émirats appliquent une amende de dépassement
  > de séjour, sans période de grâce.

- **Couverture niveaux de service (RDV / dossier / dépôt)** :
  - **RDV** → *non applicable* (pas de rendez-vous demandeur : tout passe par le
    sponsor / portail en ligne). Chip **muted**.
  - **Dossier** → **applicable** — préparation du dossier de demande
    (passeport ≥ 6 mois, photo aux normes, billet — pour la voie aérienne le billet
    doit être Emirates/code « EK », n° commençant par « 176 » —, réservation
    d'hôtel ou attestation d'hébergement du sponsor). Chip **actif**.
  - **Dépôt** → *non applicable* (soumission dématérialisée par le sponsor /
    portail GDRFA-ICP, pas de guichet en Algérie). Chip **muted**.
  - → tiers HTML : `chip` (RDV muted) · `chip` (Dossier actif) · `chip--muted` (Dépôt)

- **FAQ FR suggérée** :
  - **Q. Les Émirats donnent-ils un visa à l'arrivée aux Algériens ?**
    R. Non. Le passeport algérien ordinaire exige un visa **parrainé avant le
    départ** — par votre compagnie aérienne, votre hôtel, une agence émiratie ou un
    proche résident. On vous oriente vers la bonne voie selon votre billet et votre
    hébergement.
  - **Q. Qui peut me parrainer pour un visa de visite Dubaï ?**
    R. Un sponsor aux Émirats : compagnie aérienne (Emirates / flydubai / Etihad),
    hôtel agréé, agence de tourisme, ou un proche détenteur d'un titre de séjour
    émirati valide. Un simple titulaire d'un visa visiteur ne peut pas parrainer.
    L'approbation et le délai relèvent de l'autorité compétente.

- **`provider` (chaîne i18n FR prête à coller)** :
  `Visa parrainé en amont — compagnie aérienne (Emirates / flydubai / Etihad), hôtel agréé ou agence aux Émirats · portails GDRFA (Dubaï) / ICP (autres émirats)`
- **`notes` (chaîne i18n FR prête à coller)** :
  `Pas de visa à l'arrivée pour les passeports algériens ordinaires : visa de visite parrainé en amont par un sponsor aux Émirats (compagnie aérienne, hôtel agréé, agence, ou proche résident engageant sa responsabilité). Traitement via GDRFA (Dubaï) ou ICP. Approbation sécuritaire ; délai selon l'autorité compétente. Amende de dépassement de séjour appliquée, sans période de grâce.`

---

## Notes d'intégration (pour le développeur)

- Les deux cartes suivent exactement le gabarit `<details class="visa-country-card">`
  des 10 cartes existantes (voir France/Égypte aux lignes ~256-434 du fichier cible).
- Drapeaux à télécharger dans `site/assets/images/flags/` : `qa.svg`, `ae.svg`
  (source libre lipis/flag-icons, mêmes 36×27 que les autres).
- Mettre à jour les compteurs « 10 pays » → « 12 pays » :
  - `<title>` et `<meta name="description">` (« 10 pays couverts »)
  - hero `visa.hero.lede` (« 10 pays couverts »)
  - section countries `visa.countries.title_l1` (« Dix pays »)
  - texte OG/Twitter (« 10 pays »)
  - clés i18n correspondantes dans le fichier de traduction si présent.
- Ajouter les clés i18n `visa.countries.qatar.*` et `visa.countries.emirats.*`
  (name / provider / notes) en miroir des autres pays.
- Gouvernance respectée : aucun tarif, aucun délai promis (hedge systématique
  « selon l'autorité compétente »), aucune revendication de partenariat avec Hayya,
  Emirates, GDRFA ou ICP.

---

## Sources (vérifiées juin 2026)

**Qatar**
- Visit Qatar — page officielle Visas (Algérie listée, e-visa Hayya, catégorie A1) :
  https://visitqatar.com/intl-en/plan-your-trip/visas
- Visit Qatar — Visas (practical-info) :
  https://visitqatar.com/intl-en/practical-info/visas
- Plateforme officielle Hayya :
  https://hayya.qa/
- Discover Qatar — Hayya e-visa & visa on arrival (éligibilité, hôtels) :
  https://www.discoverqatar.qa/mandatory-hotels-for-visa-on-arrival
- Hayya A1 — validité 30 j, entrée unique, extension via Ministère de l'Intérieur
  (guides corroborants) : https://allaboutqatar.com/hayya-a1-visa-guide/ ·
  https://www.qatarguides.qa/qatar-tourist-visa/

**Émirats arabes unis (Dubaï)**
- UAE MOFA — Ambassade des Émirats en Algérie, page Visas (visa parrainé par
  sponsor : résident, hôtel ou agence de tourisme) :
  https://www.mofa.gov.ae/en/missions/algeria/services/visas
- Portail officiel du Gouvernement des Émirats — Tourist visa :
  https://u.ae/en/information-and-services/visa-and-emirates-id/tourist-visa
- Emirates — UAE visa information (parrainage compagnie, billet « EK » / n° « 176 ») :
  https://www.emirates.com/english/before-you-fly/visa-passport-information/uae-visa-information/
- ICP / GDRFA — voies de traitement (Dubaï = GDRFA ; autres émirats = ICP Smart
  Services) et amende de dépassement AED 50/j sans période de grâce (eff. 11/02/2026) :
  https://gulfnews.com/living-in-uae/visa-immigration/uae-overstay-fine-waiver-2026-who-qualifies-and-how-to-check-your-status-1.500464243

_Total : 10 sources (6 Qatar / 4 EAU, dont 2 officielles gouvernementales :
Visit Qatar et UAE MOFA)._
