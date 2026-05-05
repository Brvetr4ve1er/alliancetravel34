/**
 * Alliance Travel — Trip itinerary map (vanilla MapLibre GL)
 *
 * One generic module that powers the map on every trip page. Each
 * page injects its own data via window.TRIP_MAP_DATA before this
 * script loads, e.g.:
 *
 *   window.TRIP_MAP_DATA = {
 *     name:    'Cairo & Sharm El Sheikh',
 *     hotels:  [{ id, name, loc:[lng,lat], stars, area }, ...],
 *     sites:   [{ name, loc:[lng,lat], day, featured? }, ...],
 *     tours:   [{ name, loc:[lng,lat], day }, ...],   // optional, falls in with sites
 *     hubs:    [{ name, loc:[lng,lat], days }, ...],  // big city labels
 *     routes:  [{ from:[lng,lat], to:[lng,lat], label, type:'flight'|'road' }, ...]
 *   };
 *
 * Renders:
 *   - mint hotel pins (with hover popup)
 *   - amber site pins (visited landmarks)
 *   - cyan tour pins (guided excursions; falls back to amber palette
 *     if no `tours` array provided — sites + tours share visual weight)
 *   - destination "hubs" with permanent labels + soft glow
 *   - animated dashed Bezier arcs between hubs (flight/road routes)
 *   - auto-fit bounds, theme-aware basemap, CDN fallback, lazy-boot
 *
 * Loads MapLibre GL via CDN (same as algeria-map.js + globe.js).
 */
(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /* ─── 1. Read inline data ──────────────────────────────────── */
  const DATA = window.TRIP_MAP_DATA;
  if (!DATA) return;   // page didn't define data — silently no-op

  const HOTELS = Array.isArray(DATA.hotels)  ? DATA.hotels  : [];
  const SITES  = Array.isArray(DATA.sites)   ? DATA.sites   : [];
  const TOURS  = Array.isArray(DATA.tours)   ? DATA.tours   : [];
  const HUBS   = Array.isArray(DATA.hubs)    ? DATA.hubs    : [];
  const ROUTES = Array.isArray(DATA.routes)  ? DATA.routes  : [];

  /* ─── 2. Style URLs (CARTO basemaps — free, no API key) ────── */
  const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
  const STYLE_DARK  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  const isLightTheme = () => document.documentElement.dataset.theme === 'light';

  /* ─── 3. Bezier arc helper (same as algeria-map) ───────────── */
  function arcCoords(from, to, samples = 64, lift = 0.18) {
    const [x1, y1] = from, [x2, y2] = to;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const cx = mx - dy * lift, cy = my + dx * lift;
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples, u = 1 - t;
      pts.push([
        u * u * x1 + 2 * u * t * cx + t * t * x2,
        u * u * y1 + 2 * u * t * cy + t * t * y2
      ]);
    }
    return pts;
  }

  /* ─── 4. Lazy-load MapLibre from CDN ──────────────────────── */
  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    return new Promise((resolve, reject) => {
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        document.head.appendChild(css);
      }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      s.async = true;
      s.onload = () => resolve(window.maplibregl);
      s.onerror = () => reject(new Error('MapLibre GL failed to load'));
      document.head.appendChild(s);
    });
  }

  /* ─── 5. Boot ─────────────────────────────────────────────── */
  async function boot() {
    const container = document.getElementById('trip-map');
    if (!container) return;

    let maplibregl;
    try {
      maplibregl = await loadMapLibre();
    } catch (e) {
      console.warn('[trip-map]', e.message);
      renderFallback(container);
      return;
    }
    container.classList.add('trip-map--ready');

    const map = new maplibregl.Map({
      container: 'trip-map',
      style: isLightTheme() ? STYLE_LIGHT : STYLE_DARK,
      center: DATA.center || [30, 30],   // overridden by fitBounds
      zoom: 3,
      attributionControl: { compact: true },
      cooperativeGestures: true
    });
    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: false, showCompass: false, showZoom: true
    }), 'top-right');

    /* Hotels — mint pins with bed icon */
    HOTELS.forEach(h => {
      const el = document.createElement('div');
      el.className = 'tmap-pin tmap-pin--hotel';
      el.setAttribute('aria-label', `Hôtel ${h.name}`);
      el.innerHTML = `
        <span class="tmap-pin__dot" aria-hidden="true">${iconBed()}</span>
        <span class="tmap-pin__label">${escape(h.name)}</span>
      `;
      const popupHtml = `
        <div class="tmap-popup">
          <div class="tmap-popup__role">${'★'.repeat(h.stars || 0)} HÔTEL</div>
          <h3 class="tmap-popup__name">${escape(h.name)}</h3>
          ${h.area ? `<p class="tmap-popup__addr">${escape(h.area)}</p>` : ''}
        </div>`;
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(h.loc)
        .setPopup(new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(popupHtml))
        .addTo(map);
    });

    /* Sites — amber pins (visited landmarks) */
    SITES.forEach(s => {
      const el = document.createElement('div');
      el.className = 'tmap-pin tmap-pin--site' + (s.featured ? ' tmap-pin--featured' : '');
      el.setAttribute('aria-label', s.name);
      el.innerHTML = `
        <span class="tmap-pin__dot" aria-hidden="true"></span>
        <span class="tmap-pin__label">${escape(s.name)}</span>
      `;
      const popupHtml = `
        <div class="tmap-popup">
          ${s.day ? `<div class="tmap-popup__role">${dayLabel(s.day)}</div>` : ''}
          <h3 class="tmap-popup__name">${escape(s.name)}</h3>
          ${s.note ? `<p class="tmap-popup__addr">${escape(s.note)}</p>` : ''}
        </div>`;
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(s.loc)
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(popupHtml))
        .addTo(map);
    });

    /* Tours — cyan pins (guided excursions) */
    TOURS.forEach(t => {
      const el = document.createElement('div');
      el.className = 'tmap-pin tmap-pin--tour';
      el.setAttribute('aria-label', t.name);
      el.innerHTML = `
        <span class="tmap-pin__dot" aria-hidden="true"></span>
        <span class="tmap-pin__label">${escape(t.name)}</span>
      `;
      const popupHtml = `
        <div class="tmap-popup">
          ${t.day ? `<div class="tmap-popup__role">${dayLabel(t.day)} · EXCURSION</div>` : '<div class="tmap-popup__role">EXCURSION</div>'}
          <h3 class="tmap-popup__name">${escape(t.name)}</h3>
          ${t.note ? `<p class="tmap-popup__addr">${escape(t.note)}</p>` : ''}
        </div>`;
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(t.loc)
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(popupHtml))
        .addTo(map);
    });

    /* Hubs — big city labels with permanent display + glow */
    HUBS.forEach(hub => {
      const el = document.createElement('div');
      el.className = 'tmap-hub';
      el.innerHTML = `
        <span class="tmap-hub__dot" aria-hidden="true"></span>
        <span class="tmap-hub__halo" aria-hidden="true"></span>
        <span class="tmap-hub__label">${escape(hub.name)}${hub.days ? `<span class="tmap-hub__days"> · ${escape(String(hub.days))}</span>` : ''}</span>
      `;
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(hub.loc)
        .addTo(map);
    });

    /* Animated dashed routes between hubs */
    const addRouteLayers = () => {
      if (map.getSource('tmap-routes')) return;
      const features = ROUTES.map((r, i) => ({
        type: 'Feature',
        properties: { id: i, type: r.type || 'flight', label: r.label || '' },
        geometry: {
          type: 'LineString',
          coordinates: arcCoords(r.from, r.to, 64, r.lift ?? 0.22)
        }
      }));

      map.addSource('tmap-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features }
      });
      map.addLayer({
        id: 'tmap-routes-glow',
        type: 'line',
        source: 'tmap-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#9ce8b2',
          'line-width': 6,
          'line-opacity': 0.18,
          'line-blur': 4
        }
      });
      map.addLayer({
        id: 'tmap-routes-line',
        type: 'line',
        source: 'tmap-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#9ce8b2',
          'line-width': 2,
          'line-opacity': 0.85,
          'line-dasharray': [2, 3]
        }
      });

      if (!reduced && !window.__tmapDashTimer) {
        const dashSeq = [
          [0, 4, 3], [1, 4, 2], [2, 4, 1], [3, 4, 0],
          [0, 1, 3, 3], [0, 2, 3, 2], [0, 3, 3, 1]
        ];
        let step = 0;
        window.__tmapDashTimer = setInterval(() => {
          if (!map.getLayer('tmap-routes-line')) return;
          step = (step + 1) % dashSeq.length;
          map.setPaintProperty('tmap-routes-line', 'line-dasharray', dashSeq[step]);
        }, 70);
      }
    };

    /* Triple-listener: load + styledata + 200ms polling. Same belt-and-
       suspenders pattern as algeria-map — handles iframes/tabs where
       rAF is suspended (document.visibilityState=hidden). */
    map.on('load', addRouteLayers);
    map.on('styledata', () => {
      if (map.isStyleLoaded()) addRouteLayers();
    });
    let polls = 0;
    const styleWatcher = setInterval(() => {
      if (map.isStyleLoaded() && !map.getSource('tmap-routes')) addRouteLayers();
      if (map.getSource('tmap-routes') || ++polls > 75) clearInterval(styleWatcher);
    }, 200);

    /* Auto-fit bounds to all markers. Heavier padding + lower maxZoom
       so dense clusters (Sultanahmet, Vieille Ville Bakou, Khan El-Khalili)
       don't get crammed against the canvas edges. */
    let initialBounds = null;
    function fitToContent(animate = false) {
      if (!HOTELS.length && !SITES.length && !TOURS.length && !HUBS.length) return;
      const allLocs = [...HOTELS, ...SITES, ...TOURS, ...HUBS].map(p => p.loc).filter(Boolean);
      if (!allLocs.length) return;
      if (!initialBounds) {
        initialBounds = allLocs.reduce(
          (b, loc) => b.extend(loc),
          new maplibregl.LngLatBounds(allLocs[0], allLocs[0])
        );
      }
      map.fitBounds(initialBounds, {
        padding: { top: 110, bottom: 110, left: 90, right: 90 },
        duration: animate ? 700 : 0,
        maxZoom: 8           // capped so clustered POIs stay readable
      });
    }
    fitToContent();

    /* Zoom-aware label visibility — at overview zoom keep the map
       clean (only featured + hover labels show); zoom in past 9 and
       every site/tour/hotel reveals its name. */
    function syncZoomClass() {
      container.classList.toggle('is-zoomed-in', map.getZoom() >= 9);
    }
    map.on('zoomend', syncZoomClass);
    map.on('moveend', syncZoomClass);
    syncZoomClass();

    /* Recenter button — small floating chip bottom-left.
       Re-fits bounds when the user has panned or zoomed away. */
    const recenterBtn = document.createElement('button');
    recenterBtn.type = 'button';
    recenterBtn.className = 'tmap-recenter';
    recenterBtn.setAttribute('aria-label', 'Recentrer la carte');
    recenterBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      </svg>
      <span>Recentrer</span>`;
    recenterBtn.addEventListener('click', () => fitToContent(true));
    container.appendChild(recenterBtn);

    /* Theme-swap: re-add layers after setStyle clears them */
    new MutationObserver(() => {
      map.setStyle(isLightTheme() ? STYLE_LIGHT : STYLE_DARK);
      map.once('styledata', addRouteLayers);
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    window.__alliance_trip_map = map;
  }

  /* ─── 6. Fallback when MapLibre CDN unreachable ────────────── */
  function renderFallback(container) {
    container.classList.add('trip-map--fallback');
    const summary = [...HUBS, ...HOTELS].slice(0, 6).map(p => p.name).join(' · ');
    container.innerHTML = `
      <div class="tmap-fallback">
        <p class="tmap-fallback__title">Carte indisponible</p>
        <p class="tmap-fallback__sub">${escape(DATA.name || 'Itinéraire')}${summary ? ' · ' + escape(summary) : ''}</p>
      </div>
    `;
  }

  /* ─── 7. Helpers ─────────────────────────────────────────── */
  function escape(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function dayLabel(d) {
    if (typeof d === 'number') return `JOUR ${d}`;
    return `JOUR ${escape(String(d))}`;
  }
  function iconBed() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M2 11h20M4 11V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M2 18v-7M22 18v-7M2 18h20"/>
    </svg>`;
  }

  /* ─── 8. Lazy boot ───────────────────────────────────────── */
  let booted = false;
  function safeBoot() {
    if (booted) return;
    booted = true;
    boot().catch(err => console.warn('[trip-map] boot failed:', err));
  }
  function lazyBoot() {
    const container = document.getElementById('trip-map');
    if (!container) return;
    if (!('IntersectionObserver' in window)) { safeBoot(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          io.disconnect();
          safeBoot();
        }
      });
    }, { rootMargin: '200px 0px' });
    io.observe(container);

    const checkVisible = () => {
      if (booted) return;
      const r = container.getBoundingClientRect();
      if (r.top < (window.innerHeight + 200) && r.bottom > -200) safeBoot();
    };
    checkVisible();
    window.addEventListener('scroll', checkVisible, { passive: true });
    setTimeout(safeBoot, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lazyBoot);
  } else {
    lazyBoot();
  }
})();
