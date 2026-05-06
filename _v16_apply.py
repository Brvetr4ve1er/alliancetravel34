#!/usr/bin/env python3
"""
v16 — apply design-audit fixes:
  P1-D: Calc CTA explainer on each voyage page
  P1-C: Contact form on homepage
  P2-C: Destination filter pills on homepage
  P3-D: Social media links in footer (all 6 pages)

Idempotent.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"

TRIP_PAGES = [
    SITE / "cairo-sharm" / "index.html",
    SITE / "sharm-constantine" / "index.html",
    SITE / "azerbaidjan" / "index.html",
    SITE / "istanbul" / "index.html",
    SITE / "kuala-lumpur" / "index.html",
]
HOMEPAGE = SITE / "index.html"

# ─── P1-D · Calc CTA explainer ───────────────────────────────
# Match the .hero__ctas div inside scroll-hero__continuation; insert a
# .calc-cta-hint <p> right after it.
CALC_CTA_HINT_RE = re.compile(
    r'(<div class="scroll-hero__continuation">.*?'
    r'<div class="hero__ctas">.*?</div>)\s*'
    r'(?!\s*<p class="calc-cta-hint")',
    re.DOTALL,
)
CALC_CTA_HINT = (
    '\n    <p class="calc-cta-hint">'
    'Choisissez vos dates, votre type de chambre, le nombre de voyageurs — '
    'votre prix se calcule en direct, puis ouvrez WhatsApp pour confirmer.'
    '</p>'
)

def add_calc_cta_hint(html: str) -> tuple[str, bool]:
    if 'calc-cta-hint' in html:
        return html, False
    new_html, n = CALC_CTA_HINT_RE.subn(r'\1' + CALC_CTA_HINT, html, count=1)
    return new_html, n > 0


# ─── P3-D · Social media links in footer ────────────────────
SOCIAL_HTML = """
        <div class="footer-social">
          <a href="https://www.instagram.com/alliance.travel.dz" target="_blank" rel="noopener" aria-label="Instagram Alliance Travel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="https://www.facebook.com/alliance.travel.dz" target="_blank" rel="noopener" aria-label="Facebook Alliance Travel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.5 9.95v-7.04H8v-2.91h2.5V9.84c0-2.47 1.49-3.84 3.77-3.84 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91H13.6v7.04A10 10 0 0 0 22 12z"/></svg>
          </a>
          <a href="https://www.tiktok.com/@alliance.travel.dz" target="_blank" rel="noopener" aria-label="TikTok Alliance Travel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.05z"/></svg>
          </a>
        </div>"""

# Insert right after the .footer-tagline paragraph in the footer-brand column
SOCIAL_INSERT_RE = re.compile(
    r'(<div class="footer-brand">.*?<p class="footer-tagline">[^<]+</p>)',
    re.DOTALL,
)

def add_social_links(html: str) -> tuple[str, bool]:
    if 'footer-social' in html:
        return html, False
    new_html, n = SOCIAL_INSERT_RE.subn(r'\1' + SOCIAL_HTML, html, count=1)
    return new_html, n > 0


# ─── P2-C · Destination filter pills (homepage only) ────────
DEST_FILTER_HTML = """
      <div class="dest-filter" role="toolbar" aria-label="Filtrer les destinations par région" id="destFilter">
        <button class="dest-filter__pill" type="button" aria-pressed="true" data-filter="all" data-track-event="dest_filter" data-track-label="all">Tous <span class="dest-filter__count">5</span></button>
        <button class="dest-filter__pill" type="button" aria-pressed="false" data-filter="egypt" data-track-event="dest_filter" data-track-label="egypt">Égypte</button>
        <button class="dest-filter__pill" type="button" aria-pressed="false" data-filter="azerbaijan" data-track-event="dest_filter" data-track-label="azerbaijan">Caucase</button>
        <button class="dest-filter__pill" type="button" aria-pressed="false" data-filter="istanbul" data-track-event="dest_filter" data-track-label="istanbul">Turquie</button>
        <button class="dest-filter__pill" type="button" aria-pressed="false" data-filter="malaysia" data-track-event="dest_filter" data-track-label="malaysia">Asie</button>
      </div>
      <script>
      (function() {
        const pills = document.querySelectorAll('.dest-filter__pill');
        const cards = document.querySelectorAll('.trip-card');
        function applyFilter(region) {
          cards.forEach(card => {
            const match = region === 'all' || card.dataset.region === region;
            card.classList.toggle('is-filtered-out', !match);
          });
          pills.forEach(p => p.setAttribute('aria-pressed', p.dataset.filter === region ? 'true' : 'false'));
          // Update count on "Tous" pill
          const totalPill = document.querySelector('.dest-filter__pill[data-filter="all"] .dest-filter__count');
          if (totalPill) totalPill.textContent = region === 'all' ? cards.length : Array.from(cards).filter(c => c.dataset.region === region).length;
        }
        pills.forEach(p => p.addEventListener('click', () => applyFilter(p.dataset.filter)));
      })();
      </script>
"""

# Insert directly before the trip-card grid (which starts with `<div class="trips-grid">` or `<div class="dest-grid">` — let me check)
# Actually each trip-card has data-region. The grid is the first <div> with multiple trip-card siblings.
# Match the section-head closing </div> right before the cards.

DEST_FILTER_INSERT_RE = re.compile(
    r'(<section[^>]*id="voyages"[^>]*>\s*<div class="container">\s*<div class="section-head">.*?</div>)\s*'
    r'(?!\s*<div class="dest-filter")',
    re.DOTALL,
)

def add_dest_filter(html: str) -> tuple[str, bool]:
    if 'dest-filter' in html:
        return html, False
    new_html, n = DEST_FILTER_INSERT_RE.subn(r'\1' + DEST_FILTER_HTML, html, count=1)
    return new_html, n > 0


# Add data-region to each trip-card if not present, based on href
TRIP_CARD_REGION_MAP = {
    'cairo-sharm': 'egypt',
    'sharm-constantine': 'egypt',
    'azerbaidjan': 'azerbaijan',
    'istanbul': 'istanbul',
    'kuala-lumpur': 'malaysia',
}

def annotate_trip_cards(html: str) -> tuple[str, int]:
    n = 0
    for slug, region in TRIP_CARD_REGION_MAP.items():
        # Skip if already has data-region
        pat = re.compile(
            rf'(<a href="{re.escape(slug)}/index\.html" class="trip-card"(?![^>]*data-region))'
        )
        new_html, k = pat.subn(rf'\1 data-region="{region}"', html)
        if k:
            n += k
            html = new_html
    return html, n


# ─── P1-C · Homepage contact form ────────────────────────────
CONTACT_FORM_HTML = """
        <form class="contact-form" id="contactForm" onsubmit="return submitContactForm(event)" aria-label="Formulaire de demande de devis">
          <div class="contact-form__field">
            <label for="cf-name">Nom &amp; Prénom</label>
            <input type="text" id="cf-name" name="name" required minlength="2" autocomplete="name" placeholder="Ahmed Benkhalifa"/>
          </div>
          <div class="contact-form__field">
            <label for="cf-phone">Téléphone WhatsApp</label>
            <input type="tel" id="cf-phone" name="phone" required pattern="^(\\+213|0)[5-7][0-9 ]{8,}$" autocomplete="tel" inputmode="tel" placeholder="0561 616 266"/>
          </div>
          <div class="contact-form__field">
            <label for="cf-city">Wilaya / Ville</label>
            <input type="text" id="cf-city" name="city" required minlength="2" autocomplete="address-level2" placeholder="Bordj Bou Arreridj"/>
          </div>
          <div class="contact-form__field">
            <label for="cf-trip">Voyage qui vous intéresse</label>
            <select id="cf-trip" name="trip">
              <option value="">— À déterminer —</option>
              <option value="cairo-sharm">Le Caire &amp; Sharm El Sheikh — dès 190 000 DA</option>
              <option value="sharm-constantine">Sharm El Sheikh (départ Constantine) — dès 155 000 DA</option>
              <option value="istanbul">Istanbul — dès 123 000 DA</option>
              <option value="azerbaidjan">Azerbaïdjan (Bakou + Gabala) — dès 227 000 DA</option>
              <option value="kuala-lumpur">Kuala Lumpur (Malaisie) — dès 211 000 DA</option>
            </select>
          </div>
          <div class="contact-form__submit-wrap">
            <p class="contact-form__hint">Aucun envoi automatique : votre message s'ouvre dans WhatsApp prêt à envoyer.</p>
            <button type="submit" class="btn btn--primary" data-track-event="contact_form_submit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Envoyer ma demande sur WhatsApp
            </button>
          </div>
        </form>
        <script>
        function submitContactForm(e) {
          e.preventDefault();
          const form = e.target;
          const name = form.name.value.trim();
          const phone = form.phone.value.trim();
          const city = form.city.value.trim();
          const trip = form.trip.value;
          const tripLabels = {
            'cairo-sharm': 'Le Caire & Sharm El Sheikh',
            'sharm-constantine': 'Sharm El Sheikh (départ Constantine)',
            'istanbul': 'Istanbul',
            'azerbaidjan': 'Azerbaïdjan (Bakou + Gabala)',
            'kuala-lumpur': 'Kuala Lumpur (Malaisie)',
          };
          const lines = [
            'Bonjour Alliance Travel !',
            '',
            `Je m'appelle ${name}, je vous contacte depuis ${city}.`,
            `📱 Mon numéro WhatsApp : ${phone}`,
            '',
            trip ? `Je suis intéressé(e) par le voyage : *${tripLabels[trip]}*` : `Je voudrais discuter d'un voyage avec vous.`,
            '',
            'Pourriez-vous me recontacter ? Merci !',
          ];
          const msg = lines.join('\\n');
          const url = 'https://wa.me/213560860617?text=' + encodeURIComponent(msg);
          window.open(url, '_blank', 'noopener');
          return false;
        }
        </script>"""

CONTACT_FORM_INSERT_RE = re.compile(
    r'(<section[^>]*id="contact"[^>]*>.*?<h2[^>]*>.*?</h2>\s*<p[^>]*>[^<]+</p>)',
    re.DOTALL,
)

def add_contact_form(html: str) -> tuple[str, bool]:
    if 'contact-form' in html and 'cf-name' in html:
        return html, False
    new_html, n = CONTACT_FORM_INSERT_RE.subn(r'\1' + CONTACT_FORM_HTML, html, count=1)
    return new_html, n > 0


# ─── Driver ──────────────────────────────────────────────────
def process_homepage(path: Path) -> dict:
    if not path.exists():
        return {"slug": "index", "error": "missing"}
    html = path.read_text(encoding="utf-8")
    original = html
    html, social_added = add_social_links(html)
    html, filter_added = add_dest_filter(html)
    html, region_n     = annotate_trip_cards(html)
    html, contact_added = add_contact_form(html)
    if html != original:
        path.write_text(html, encoding="utf-8")
    return {
        "slug": "index",
        "social": social_added,
        "filter": filter_added,
        "regions": region_n,
        "contact": contact_added,
        "changed": html != original,
    }

def process_trip_page(path: Path) -> dict:
    if not path.exists():
        return {"slug": path.parent.name, "error": "missing"}
    html = path.read_text(encoding="utf-8")
    original = html
    html, hint_added = add_calc_cta_hint(html)
    html, social_added = add_social_links(html)
    if html != original:
        path.write_text(html, encoding="utf-8")
    return {
        "slug": path.parent.name,
        "calc_hint": hint_added,
        "social": social_added,
        "changed": html != original,
    }


if __name__ == "__main__":
    print("v16 design-audit fixes\n")
    print("Homepage:")
    r = process_homepage(HOMEPAGE)
    print(f"  social:{int(r.get('social',0))}  filter:{int(r.get('filter',0))}  regions:{r.get('regions',0)}  contact:{int(r.get('contact',0))}")
    print("Trip pages:")
    for path in TRIP_PAGES:
        r = process_trip_page(path)
        print(f"  {r['slug']:<22} calc-hint:{int(r.get('calc_hint',0))}  social:{int(r.get('social',0))}")
    print("\nDone.")
