"""
One-shot enrichment of all 5 trip pages:
  - OG / Twitter / canonical meta tags
  - JSON-LD structured data (TouristTrip)
  - "Inclus / Non Inclus" comparison block before the FAQ
  - "Vous aimerez aussi" related trips before the booking section
  - enhance.js script reference

Idempotent — uses unique markers so it only injects once.
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = 'site'

# ─── Per-trip data ──────────────────────────────────────────────
TRIPS = {
    'cairo-sharm': {
        'title': 'Le Caire & Sharm El Sheikh',
        'subtitle': 'Égypte · Juin 2026',
        'price': 190000,
        'desc': '7 nuits guidées entre les Pyramides de Guizeh et la Mer Rouge. Vol EgyptAir + All Inclusive Soft + excursions. Départs juin 2026 depuis Alger.',
        'color': '#C9872E',
        'inclus': [
            'Vol international **EgyptAir** ALG ↔ CAI aller-retour',
            'Vol domestique CAI ↔ SSH aller-retour',
            'Transferts aéroport ↔ hôtel ↔ aéroport',
            '**5 nuits** Sharm El Sheikh en formule **All Inclusive Soft**',
            '**2 nuits** Le Caire à Marwa Palace (petit-déjeuner)',
            'Excursions Sharm : Naama Bay · Old Market · Sahaba Mosque · Soho Square',
            'Excursions Caire : Pyramides · Sphinx · Khan El-Khalili · Croisière Nil avec dîner et spectacle',
            'Lettre de garantie pour le visa',
            'Accompagnateur Alliance Travel sur place',
        ],
        'non_inclus': [
            'Taxe de visa : **30 USD** à l\'arrivée au Caire',
            'Nouveau Musée Égyptien (en option, sur demande)',
            'Boissons alcoolisées',
            'Pourboires (personnel hôtel · guides · chauffeurs)',
            'Activités optionnelles : plongée, quad, parapente',
            'Assurance voyage personnelle',
            'Dépenses personnelles',
        ],
        'related': ['sharm-constantine', 'azerbaidjan'],
    },
    'azerbaidjan': {
        'title': 'Azerbaïdjan · Bakou & Gabala',
        'subtitle': 'Avril–Juillet 2026',
        'price': 219000,
        'desc': 'La Cité du Feu et les montagnes du Caucase. 5 nuits Bakou + 2 nuits Gabala, vol Turkish Airlines, visa électronique inclus. Départs avr-juil 2026.',
        'color': '#3AAFAF',
        'inclus': [
            'Vol **Turkish Airlines** via Istanbul ALG–IST–GYD aller-retour',
            '**Visa électronique** entièrement inclus',
            'Tous les transferts en bus touristique climatisé',
            '**5 nuits** Bakou — PARKSIDE Hotel 4★ (petit-déjeuner)',
            '**2 nuits** Gabala — Yengice Hotel 5★ (petit-déjeuner)',
            'Excursions Bakou : Vieille Ville · Maiden Tower · Heydar Aliyev Center · Baku Boulevard',
            'Sortie Gobustan : National Park · Volcans de boue · Yanar Dag',
            'Sortie Sheki : Khan\'s Palace · Caravanserai · Panorama Park',
            '**Sortie Shahdag** : transfert + téléphérique inclus',
            'Accompagnateur Alliance Travel + guide local arabophone',
        ],
        'non_inclus': [
            'Repas (déjeuner et dîner) — formule petit-déjeuner uniquement',
            'Boissons',
            'Pourboires',
            'Excursions optionnelles supplémentaires (selon saison)',
            'Assurance voyage personnelle',
            'Dépenses personnelles',
        ],
        'related': ['istanbul', 'cairo-sharm'],
    },
    'istanbul': {
        'title': 'Istanbul',
        'subtitle': 'Mars–Mai 2026 · Départ Constantine',
        'price': 123000,
        'desc': '8 jours / 7 nuits à Istanbul depuis l\'aéroport de Constantine. Turkish Airlines, 4 jours d\'excursions guidées, 4 hôtels au choix. Départs hebdomadaires.',
        'color': '#5B9EC9',
        'inclus': [
            'Vol **Turkish Airlines** Constantine ↔ Istanbul aller-retour',
            'Transferts aéroport ↔ hôtel ↔ aéroport',
            '**7 nuits** d\'hébergement avec petit-déjeuner',
            '**4 jours d\'excursions guidées** complètes',
            'Cité tour Sultanahmet : Mosquée Bleue · Aya Sofya · Grand Bazar (à pied)',
            'Croisière sur la Mer de Marmara avec **déjeuner inclus** + Îles des Princes',
            'Visite côté asiatique : Beylerbeyi · Tour de la Jeune Fille · Üsküdar · Çamlıca',
            'Visites Ortaköy + malls Florya & Olivium',
        ],
        'non_inclus': [
            '**Visa turc** — à régler séparément au centre Gateway (notre équipe vous accompagne)',
            'Repas hors petit-déjeuner et déjeuner croisière',
            'Tickets d\'entrée payants spécifiques',
            'Programmes optionnels jours 6 et 7',
            'Pourboires',
            'Achats personnels',
            'Assurance voyage personnelle',
        ],
        'related': ['azerbaidjan', 'sharm-constantine'],
    },
    'kuala-lumpur': {
        'title': 'Kuala Lumpur · Malaisie',
        'subtitle': 'Mars–Mai 2026 · Vol direct',
        'price': 211000,
        'desc': 'Vol direct Air Algérie depuis Alger. 7 nuits Grand Mercure 5★ avec petit-déjeuner. Tours Petronas, Batu Caves, Genting Highlands inclus.',
        'color': '#4CAF82',
        'inclus': [
            '**Vol direct Air Algérie** ALG ↔ KUL aller-retour',
            '**7 nuits** Grand Mercure 5★ Kuala Lumpur avec petit-déjeuner',
            'Transferts aéroport ↔ hôtel ↔ aéroport',
            'City Tour de Kuala Lumpur avec guide',
            'Visite des **Tours Petronas** (KLCC)',
            'Excursion **Batu Caves** + Palais Royal + Mosquée Negara',
            '**Genting Highlands** avec téléphérique panoramique inclus',
            'Guide arabophone + accompagnateur Alliance Travel',
        ],
        'non_inclus': [
            'Taxe touristique : **20 USD** par personne, payable à l\'hôtel au check-out',
            'Repas hors petit-déjeuner',
            'Excursions optionnelles : Aquaria KLCC · Sunway Lagoon · A\'Famosa Safari · Putrajaya',
            'Boissons',
            'Pourboires',
            'Assurance voyage personnelle',
            'Dépenses personnelles',
        ],
        'related': ['cairo-sharm', 'azerbaidjan'],
    },
    'sharm-constantine': {
        'title': 'Sharm El Sheikh · depuis Constantine',
        'subtitle': 'Avril–Juin 2026',
        'price': 155000,
        'desc': '10 jours / 8 nuits All Inclusive Soft à Sharm El Sheikh depuis Constantine. Turkish Airlines, 3 hôtels au choix avec Aqua Park. 5 départs.',
        'color': '#28B4D4',
        'inclus': [
            'Vol **Turkish Airlines** Constantine ↔ Istanbul ↔ Sharm aller-retour',
            'Transferts aéroport ↔ hôtel ↔ aéroport',
            '**8 nuits** en formule **All Inclusive Soft** complète',
            'Hôtel 4★ ou 5★ avec **Aqua Park inclus**',
            'Cité Tour de Sharm El Sheikh',
            'Soho Square (animation nocturne)',
            'Souk Al Kadim (marché traditionnel)',
        ],
        'non_inclus': [
            'Boissons alcoolisées',
            'Activités payantes : plongée, quad, parachute ascensionnel',
            'Pourboires (personnel hôtel · guides · chauffeurs)',
            'Excursions optionnelles à Ras Mohamed ou au Désert',
            'Assurance voyage personnelle',
            'Dépenses personnelles',
        ],
        'related': ['cairo-sharm', 'istanbul'],
    },
}

# ─── HTML SVG flag art for related cards (per destination) ────────
def flag_art(slug, color):
    """Tiny SVG art used in related-card thumbs."""
    if slug == 'cairo-sharm':
        bg = '#0d0a05'
        return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<rect width="100" height="100" fill="{bg}"/>
<radialGradient id="cs-{slug}-g" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="{color}" stop-opacity=".4"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#cs-{slug}-g)"/>
<polygon points="50,15 85,85 15,85" fill="#8B6520" fill-opacity=".55"/>
<polygon points="78,40 95,85 60,85" fill="#7A5818" fill-opacity=".5"/>
<rect x="0" y="80" width="100" height="20" fill="#5C3D12" fill-opacity=".4"/>
<circle cx="80" cy="20" r="6" fill="#FFF4D6" fill-opacity=".15"/>
</svg>'''
    if slug == 'azerbaidjan':
        return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<rect width="100" height="100" fill="#060a16"/>
<radialGradient id="az-{slug}-g" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="{color}" stop-opacity=".35"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#az-{slug}-g)"/>
<path d="M30 88 Q33 30 38 22 Q42 15 46 22 Q51 30 54 88 Z" fill="#1a2d5a" fill-opacity=".85"/>
<path d="M48 88 Q51 38 56 30 Q60 24 63 30 Q68 38 71 88 Z" fill="{color}" fill-opacity=".55"/>
<path d="M65 88 Q68 45 72 38 Q75 33 77 38 Q81 45 84 88 Z" fill="#1a2d5a" fill-opacity=".75"/>
</svg>'''
    if slug == 'istanbul':
        return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<rect width="100" height="100" fill="#080610"/>
<radialGradient id="ist-{slug}-g" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#3a1a0a" stop-opacity=".8"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#ist-{slug}-g)"/>
<ellipse cx="50" cy="50" rx="22" ry="18" fill="#1a0820"/>
<rect x="22" y="40" width="4" height="35" rx="2" fill="#1a0820"/>
<rect x="74" y="40" width="4" height="35" rx="2" fill="#1a0820"/>
<rect x="0" y="74" width="100" height="26" fill="#08121e"/>
<ellipse cx="50" cy="78" rx="44" ry="2" fill="{color}" fill-opacity=".15"/>
</svg>'''
    if slug == 'kuala-lumpur':
        return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<rect width="100" height="100" fill="#040d08"/>
<radialGradient id="kl-{slug}-g" cx="50%" cy="80%" r="60%"><stop offset="0" stop-color="{color}" stop-opacity=".25"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#kl-{slug}-g)"/>
<rect x="36" y="20" width="11" height="65" rx="1" fill="#0a1f15"/>
<rect x="56" y="20" width="11" height="65" rx="1" fill="#0a1f15"/>
<rect x="38" y="11" width="2" height="10" fill="{color}" fill-opacity=".5"/>
<rect x="62" y="11" width="2" height="10" fill="{color}" fill-opacity=".5"/>
<rect x="47" y="46" width="13" height="3" fill="#0d2818"/>
<rect x="14" y="35" width="4" height="50" rx="1" fill="#0a2018" fill-opacity=".9"/>
<ellipse cx="16" cy="33" rx="6" ry="6" fill="#0d2820" fill-opacity=".85"/>
</svg>'''
    if slug == 'sharm-constantine':
        return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
<rect width="100" height="100" fill="#020c12"/>
<radialGradient id="ssh-{slug}-g" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="{color}" stop-opacity=".3"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#ssh-{slug}-g)"/>
<rect x="0" y="58" width="100" height="42" fill="#04121e"/>
<polygon points="0,60 22,30 44,55 0,55" fill="#0a1e2a" fill-opacity=".8"/>
<polygon points="50,60 75,32 95,55 70,60" fill="#0a1e2a" fill-opacity=".8"/>
<ellipse cx="50" cy="62" rx="46" ry="2" fill="#E88A3A" fill-opacity=".15"/>
<ellipse cx="80" cy="18" r="7" fill="#FFF8F0" fill-opacity=".1"/>
</svg>'''
    return ''


def render_md_bold(text):
    """Convert **bold** to <strong>bold</strong>."""
    import re
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)


# ─── Build OG/JSON-LD/inclus/related blocks per trip ─────────────
def build_meta_block(slug, t):
    canonical = f'https://alliance-travel.dz/{slug}/'
    desc_txt = t['desc']
    return f'''
<!-- Open Graph / Social -->
<meta property="og:type" content="website"/>
<meta property="og:title" content="{t['title']} — Alliance Travel"/>
<meta property="og:description" content="{desc_txt}"/>
<meta property="og:url" content="{canonical}"/>
<meta property="og:site_name" content="Alliance Travel"/>
<meta property="og:locale" content="fr_FR"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="{t['title']} — Alliance Travel"/>
<meta name="twitter:description" content="{desc_txt}"/>
<meta name="theme-color" content="{t['color']}"/>
<link rel="canonical" href="{canonical}"/>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "{t['title']} — Alliance Travel",
  "description": "{desc_txt}",
  "subjectOf": {{
    "@type": "WebPage",
    "url": "{canonical}"
  }},
  "offers": {{
    "@type": "Offer",
    "price": "{t['price']}",
    "priceCurrency": "DZD",
    "availability": "https://schema.org/InStock",
    "url": "{canonical}"
  }},
  "provider": {{
    "@type": "TravelAgency",
    "name": "Alliance Travel",
    "telephone": "+213561616266",
    "url": "https://alliance-travel.dz/",
    "address": {{
      "@type": "PostalAddress",
      "streetAddress": "05, Rue des Frères Habbeche",
      "addressLocality": "Sétif",
      "addressCountry": "DZ"
    }}
  }}
}}
</script>
<!-- /enrich:meta -->
'''


def build_inclus_section(t):
    inclus_html = '\n'.join([
        f'''        <div class="inclus-item inclus-item--yes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{render_md_bold(item)}</span>
        </div>''' for item in t['inclus']
    ])
    non_inclus_html = '\n'.join([
        f'''        <div class="inclus-item inclus-item--no">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>{render_md_bold(item)}</span>
        </div>''' for item in t['non_inclus']
    ])

    return f'''
<!-- enrich:inclus -->
<section class="inclus-section section" aria-label="Ce qui est inclus et non inclus">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow">Tout est dit, rien n'est caché</p>
      <h2 class="section-head__title">Ce qui est <em>inclus</em>, ce qui ne l'est pas</h2>
      <p class="section-head__sub">Aucune surprise à l'arrivée. Voici exactement ce que couvre votre forfait — et ce que vous prévoirez en plus.</p>
    </div>
    <div class="inclus-grid">

      <div class="inclus-col reveal">
        <div class="inclus-col__head">
          <div class="inclus-col__icon inclus-col__icon--yes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <h3 class="inclus-col__title">Inclus dans le <em>forfait</em></h3>
            <p class="inclus-col__count">{len(t['inclus'])} prestations couvertes</p>
          </div>
        </div>
        <div class="inclus-list">
{inclus_html}
        </div>
      </div>

      <div class="inclus-col reveal">
        <div class="inclus-col__head">
          <div class="inclus-col__icon inclus-col__icon--no">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <h3 class="inclus-col__title">À <em>prévoir</em> en plus</h3>
            <p class="inclus-col__count">{len(t['non_inclus'])} éléments hors forfait</p>
          </div>
        </div>
        <div class="inclus-list">
{non_inclus_html}
        </div>
      </div>

    </div>
  </div>
</section>
<!-- /enrich:inclus -->
'''


def build_related_section(slug, related_slugs):
    cards = []
    for s in related_slugs:
        rt = TRIPS[s]
        cards.append(f'''
      <a href="../{s}/" class="related-card reveal">
        <div class="related-card__art" style="border-radius:var(--r2);overflow:hidden">
          {flag_art(s, rt['color'])}
        </div>
        <div class="related-card__body">
          <span class="related-card__flag" style="color:{rt['color']}">{rt['subtitle']}</span>
          <h3 class="related-card__title">{rt['title']}</h3>
          <p class="related-card__price">À partir de <strong>{rt['price']:,} DA</strong>.replace(',', '.')
          </p>
          <span class="related-card__cta" style="color:{rt['color']}">
            Voir ce voyage
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </a>'''.replace("{rt['price']:,}".replace('{', '{{').replace('}', '}}'), '__PLACEHOLDER__')  # we'll use simple format below
        )

    # Rebuild without complex template tricks
    cards = []
    for s in related_slugs:
        rt = TRIPS[s]
        price_fmt = '{:,}'.format(rt['price']).replace(',', '.')
        cards.append(f'''
      <a href="../{s}/" class="related-card reveal">
        <div class="related-card__art" style="border-radius:var(--r2);overflow:hidden">
          {flag_art(s, rt['color'])}
        </div>
        <div class="related-card__body">
          <span class="related-card__flag" style="color:{rt['color']}">{rt['subtitle']}</span>
          <h3 class="related-card__title">{rt['title']}</h3>
          <p class="related-card__price">À partir de <strong>{price_fmt} DA</strong></p>
          <span class="related-card__cta" style="color:{rt['color']}">
            Voir ce voyage
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </a>''')

    return f'''
<!-- enrich:related -->
<section class="related-section section" aria-label="Vous aimerez aussi">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow">Vous aimerez aussi</p>
      <h2 class="section-head__title">Continuez votre <em>découverte</em></h2>
    </div>
    <div class="related-grid">
{''.join(cards)}
    </div>
  </div>
</section>
<!-- /enrich:related -->
'''


# ─── Inject into each page ───────────────────────────────────────
ENHANCE_SCRIPT = '<script src="../assets/js/enhance.js" defer></script>'

def remove_old(html, marker_open, marker_close):
    """Remove anything between marker tags (idempotency)."""
    while marker_open in html and marker_close in html:
        a = html.index(marker_open)
        b = html.index(marker_close, a) + len(marker_close)
        html = html[:a] + html[b:]
    return html


count = 0
for slug, t in TRIPS.items():
    path = os.path.join(ROOT, slug, 'index.html')
    if not os.path.exists(path):
        print(f'  skip (not found): {path}')
        continue

    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Remove any prior enrichments (idempotent)
    html = remove_old(html, '<!-- Open Graph / Social -->', '<!-- /enrich:meta -->')
    html = remove_old(html, '<!-- enrich:inclus -->', '<!-- /enrich:inclus -->')
    html = remove_old(html, '<!-- enrich:related -->', '<!-- /enrich:related -->')

    # 2. Inject meta block before </head>
    meta_block = build_meta_block(slug, t).strip() + '\n'
    html = html.replace('</head>', meta_block + '</head>', 1)

    # 3. Inject Inclus/Non-Inclus block before the FAQ section
    inclus_block = build_inclus_section(t).strip() + '\n'
    if 'class="faq-bg' in html:
        html = html.replace('<section class="faq-bg', inclus_block + '\n<section class="faq-bg', 1)
    else:
        # Fallback: before booking section
        html = html.replace('<section class="booking-section', inclus_block + '\n<section class="booking-section', 1)

    # 4. Inject Related trips block before the booking section (after the form section)
    related_block = build_related_section(slug, t['related']).strip() + '\n'
    if 'class="booking-section' in html:
        html = html.replace('<section class="booking-section', related_block + '\n<section class="booking-section', 1)
    else:
        # Fallback: before footer
        html = html.replace('<footer class="site-footer"', related_block + '\n<footer class="site-footer"', 1)

    # 5. Add enhance.js script if not present
    if 'enhance.js' not in html:
        html = html.replace('</body>', ENHANCE_SCRIPT + '\n</body>', 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    count += 1
    print(f'  enriched: {path}')

print(f'\nDone — {count} pages enriched')
