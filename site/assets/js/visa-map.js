/**
 * Alliance Travel — Visa centres + Alliance branches map (MapLibre GL)
 *
 * Renders, on the /rendez-vous-visa/ page:
 *   - Embassy + visa-application-centre pins for the 10 destination countries
 *     (mostly clustered in Algiers; Capago France has 4 country-wide centres)
 *   - The 3 Alliance Travel branch pins (BBA · La Graf · M'Sila) for context
 *   - Country-flag marker icons so users can scan visually
 *
 * Shares CDN load, basemap style, popup + theme observers, and lazy-boot
 * with algeria-map.js / trip-map.js via window.MapBase (map-base.js loaded
 * before this file via <script defer>).
 *
 * Falls back to a static placeholder if MapBase can't load so the section
 * never appears blank. No build step required.
 */
(() => {
  const MB = window.MapBase;
  if (!MB) { console.warn('[visa-map] map-base.js not loaded'); return; }

  /* ─── Data ─────────────────────────────────────────────────
     Coordinates marked `verified: true` are confirmed against the
     entity's own published page or Google Maps. Pins marked
     `verified: false` are accurate to neighbourhood (~200m) and
     can be fine-tuned in a follow-up Street View pass. */

  const AGENCIES = [
    { id: 'bba-graf',   name: 'BBA · La Graf',     loc: [4.7642, 36.0710], kind: 'agency' },
    { id: 'bba-zehour', name: 'BBA · Cité Zehour', loc: [4.7549, 36.0788], kind: 'agency' },
    { id: 'msila',      name: "M'Sila",             loc: [4.5418, 35.7044], kind: 'agency' }
  ];

  const VISA_CENTRES = [
    /* France — Capago (sole provider since 8 Apr 2025) */
    { id: 'fr-capago-alger',       cc: 'fr', flagId: 'fr', label: 'Capago Alger',       country: 'France',      role: 'centre officiel', loc: [3.1817, 36.7261], kind: 'centre' },
    { id: 'fr-capago-oran',        cc: 'fr', flagId: 'fr', label: 'Capago Oran',        country: 'France',      role: 'centre officiel', loc: [-0.5961, 35.7039], kind: 'centre' },
    { id: 'fr-capago-annaba',      cc: 'fr', flagId: 'fr', label: 'Capago Annaba',      country: 'France',      role: 'centre officiel', loc: [7.7667, 36.9000], kind: 'centre' },
    { id: 'fr-capago-constantine', cc: 'fr', flagId: 'fr', label: 'Capago Constantine', country: 'France',      role: 'centre officiel', loc: [6.6019, 36.3650], kind: 'centre' },

    /* Türkiye — Embassy direct */
    { id: 'tr-embassy', cc: 'tr', flagId: 'tr', label: 'Ambassade Türkiye',  country: 'Türkiye',  role: 'ambassade',         loc: [3.0405638, 36.7605773], kind: 'embassy' },

    /* Germany — VFS + Embassy */
    { id: 'de-vfs',     cc: 'de', flagId: 'de', label: 'VFS Global Allemagne', country: 'Allemagne', role: 'centre VFS',      loc: [3.0451, 36.7416], kind: 'centre' },
    { id: 'de-embassy', cc: 'de', flagId: 'de', label: 'Ambassade Allemagne',  country: 'Allemagne', role: 'ambassade',       loc: [3.0500, 36.7547], kind: 'embassy' },

    /* Spain — BLS (Alger + Oran) */
    { id: 'es-bls-alger', cc: 'es', flagId: 'es', label: 'BLS Espagne Alger', country: 'Espagne',  role: 'centre BLS',       loc: [3.0489, 36.7458], kind: 'centre' },
    { id: 'es-bls-oran',  cc: 'es', flagId: 'es', label: 'BLS Espagne Oran',  country: 'Espagne',  role: 'centre BLS',       loc: [-0.6363, 35.6976], kind: 'centre' },

    /* China — CVASC + Embassy */
    { id: 'cn-cvasc',     cc: 'cn', flagId: 'cn', label: 'CVASC',              country: 'Chine',    role: 'centre CVASC',     loc: [3.0090, 36.7560], kind: 'centre' },
    { id: 'cn-embassy',   cc: 'cn', flagId: 'cn', label: 'Ambassade Chine',    country: 'Chine',    role: 'ambassade',        loc: [3.0425182, 36.7535686], kind: 'embassy' },

    /* Russia — Embassy direct */
    { id: 'ru-embassy',   cc: 'ru', flagId: 'ru', label: 'Ambassade Russie',   country: 'Russie',   role: 'ambassade',        loc: [3.0339, 36.7641], kind: 'embassy' },

    /* Egypt — Embassy direct */
    { id: 'eg-embassy',   cc: 'eg', flagId: 'eg', label: 'Ambassade Égypte',   country: 'Égypte',   role: 'ambassade',        loc: [3.0467, 36.7444], kind: 'embassy' },

    /* Saudi Arabia — Embassy */
    { id: 'sa-embassy',   cc: 'sa', flagId: 'sa', label: 'Ambassade Arabie Saoudite', country: 'Arabie Saoudite', role: 'ambassade', loc: [3.0149271, 36.7507703], kind: 'embassy' },

    /* USA — Embassy */
    { id: 'us-embassy',   cc: 'us', flagId: 'us', label: 'Ambassade États-Unis', country: 'États-Unis', role: 'ambassade',     loc: [3.0416653, 36.7547454], kind: 'embassy' },

    /* Canada — VAC + Embassy */
    { id: 'ca-vac',       cc: 'ca', flagId: 'ca', label: 'VFS Canada VAC',     country: 'Canada',   role: 'centre VFS',       loc: [3.0160, 36.7610], kind: 'centre' },
    { id: 'ca-embassy',   cc: 'ca', flagId: 'ca', label: 'Ambassade Canada',   country: 'Canada',   role: 'ambassade',        loc: [3.0171605, 36.761142], kind: 'embassy' }
  ];

  /* ─── Boot ─────────────────────────────────────────────── */
  async function boot() {
    const container = document.getElementById('visa-map');
    if (!container) return;

    let maplibregl;
    try {
      maplibregl = await MB.loadMapLibre();
    } catch (e) {
      console.warn('[visa-map]', e.message);
      return;  // existing .tmap-fallback stays visible
    }

    // Add both 'visa-map--ready' (page-specific) and 'trip-map--ready'
    // (existing CSS hook in styles.css:6680 that hides .tmap-fallback).
    container.classList.add('visa-map--ready', 'trip-map--ready');

    // Algeria-wide view: Capago Annaba is far east (7.77E), Capago Oran far
    // west (-0.59E). Centre roughly on Algiers, fit padding handles the rest.
    const map = new maplibregl.Map({
      container: 'visa-map',
      style: MB.currentStyle(),
      center: [3.0, 36.5],
      zoom: 5.2,
      minZoom: 4.5,
      maxZoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      maxBounds: [[-3.5, 33.5], [10.5, 38.0]]
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showCompass: false, showZoom: true }), 'top-right');

    /* ── Agency markers (Alliance Travel branches) ── */
    AGENCIES.forEach(a => {
      const el = document.createElement('div');
      el.className = 'amap-branch';
      el.innerHTML = `<span class="amap-branch__dot" aria-hidden="true"></span><span class="amap-branch__label">${escapeHtml(a.name)}</span>`;
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(a.loc)
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
          <div class="amap-popup">
            <div class="amap-popup__role">AGENCE ALLIANCE</div>
            <h3 class="amap-popup__name">${escapeHtml(a.name)}</h3>
          </div>
        `))
        .addTo(map);
    });

    /* ── Visa centre + embassy markers ── */
    VISA_CENTRES.forEach(c => {
      const el = document.createElement('div');
      el.className = `vmap-pin vmap-pin--${c.kind}`;
      el.title = `${c.label} (${c.country})`;
      el.innerHTML = `
        <span class="vmap-pin__flag" aria-hidden="true">
          <img src="../assets/images/flags/${c.flagId}.svg" alt="" width="18" height="14"/>
        </span>
        <span class="vmap-pin__dot ${c.kind === 'embassy' ? 'vmap-pin__dot--embassy' : 'vmap-pin__dot--centre'}" aria-hidden="true"></span>
      `;
      new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(c.loc)
        .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
          <div class="amap-popup">
            <div class="amap-popup__role">${escapeHtml(c.role.toUpperCase())} · ${escapeHtml(c.country.toUpperCase())}</div>
            <h3 class="amap-popup__name">${escapeHtml(c.label)}</h3>
          </div>
        `))
        .addTo(map);
    });

    /* ── Inject vmap-pin styles (scoped, no styles.css edit) ── */
    if (!document.getElementById('vmap-pin-styles')) {
      const style = document.createElement('style');
      style.id = 'vmap-pin-styles';
      style.textContent = `
        .vmap-pin { display: inline-flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform .2s ease; }
        .vmap-pin:hover { transform: translateY(-2px); }
        .vmap-pin__flag { width: 18px; height: 14px; border-radius: 2px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.4); margin-bottom: 2px; }
        .vmap-pin__flag img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .vmap-pin__dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(0,0,0,.55); }
        .vmap-pin__dot--embassy { background: #5b9eC9; }
        .vmap-pin__dot--centre  { background: #E0A04A; }
      `;
      document.head.appendChild(style);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* MapBase exposes lazy-boot via IntersectionObserver — visa-map only
     mounts once the section enters the viewport, saving the cobe-globe-
     style upfront cost. */
  MB.lazyBoot('visa-map', boot);
})();
