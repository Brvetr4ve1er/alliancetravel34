/**
 * Alliance Travel — Algeria branches map (vanilla MapLibre GL)
 *
 * Replaces the homepage hand-drawn SVG outline with real geography:
 *   - CARTO Voyager / Dark Matter basemap (theme-aware, free, no API key)
 *   - HQ pin in Bordj Bou Arreridj (La Graf) with a pulsing halo
 *   - Branch pins for the real Alliance Travel network:
 *     BBA · Cité Zehour and M'Sila
 *   - Animated dashed arcs from HQ to every branch (Bezier curves
 *     so the lines breathe rather than feel rigid)
 *
 * Loads MapLibre GL via CDN (same approach as cobe globe). Falls
 * back to a static "the map can't load" placeholder if the CDN is
 * unreachable so the section never appears blank.
 *
 * No build step required.
 */
(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /* ─── 1. Data ──────────────────────────────────────────────── */
  /* Real Alliance Travel network — 3 owned agencies.
     Coordinates are approximate (pin centred on the addressed street);
     fine-tune if a precise Google Maps shortlink is shared. */
  const HQ = {
    id: 'bba-graf',
    name: 'BBA · La Graf',
    role: 'SIÈGE SOCIAL',
    loc: [4.7642, 36.0710],
    addr: 'Boulevard Houari Boumediene · La Graf',
    phone: '0561 616 266',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Alliance+Travel+Boulevard+Houari+Boumediene+La+Graf+Bordj+Bou+Arreridj'
  };

  const BRANCHES = [
    {
      id: 'bba-zehour',
      name: 'BBA · Cité Zehour',
      loc: [4.7549, 36.0788],
      addr: 'Cité Zehour · Route de Medjana',
      phone: '0561 616 268',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Alliance+Travel+Cit%C3%A9+Zehour+Route+de+Medjana+Bordj+Bou+Arreridj'
    },
    {
      id: 'msila',
      name: "M'Sila",
      loc: [4.5418, 35.7044],
      addr: 'Centre-ville',
      phone: '0560 869 905',
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alliance+Travel+M%27Sila"
    }
  ];

  /* ─── 2. Style URLs (CARTO basemaps — free, no API key) ────── */
  const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
  const STYLE_DARK  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  const isLightTheme = () => document.documentElement.dataset.theme === 'light';

  /* ─── 3. Geometry helper: Bezier arc between two points ───── */
  function arcCoords(from, to, samples = 64, lift = 0.18) {
    // lift = how much the curve bows away from the straight line.
    // Negative lift would bow the other way.
    const [x1, y1] = from, [x2, y2] = to;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    // Perpendicular vector (rotated 90deg)
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
  //
  // Supply-chain hardening: crossOrigin='anonymous' is set so a
  // Subresource Integrity check will actually run. The `integrity`
  // hashes below are TODOs — the build/deploy environment must fill
  // them in from a machine with outbound HTTPS access to unpkg.com.
  //
  // Compute the hashes with:
  //   curl -sSL https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js  | openssl dgst -sha384 -binary | base64
  //   curl -sSL https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css | openssl dgst -sha384 -binary | base64
  // then set the two constants below to `sha384-<base64>`.
  //
  // While these remain empty, the script still loads (browsers only
  // enforce SRI when the `integrity` attribute is non-empty), so the
  // site keeps working — but a compromised CDN would go undetected.
  const MAPLIBRE_JS_SRI  = '';  // TODO: sha384-...
  const MAPLIBRE_CSS_SRI = '';  // TODO: sha384-...

  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    return new Promise((resolve, reject) => {
      // CSS first (parallel)
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        css.crossOrigin = 'anonymous';
        if (MAPLIBRE_CSS_SRI) css.integrity = MAPLIBRE_CSS_SRI;
        document.head.appendChild(css);
      }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      if (MAPLIBRE_JS_SRI) s.integrity = MAPLIBRE_JS_SRI;
      s.onload = () => resolve(window.maplibregl);
      s.onerror = () => reject(new Error('MapLibre GL failed to load'));
      document.head.appendChild(s);
    });
  }

  /* ─── 5. Boot ─────────────────────────────────────────────── */
  async function boot() {
    const container = document.getElementById('algeria-map');
    if (!container) return;

    let maplibregl;
    try {
      maplibregl = await loadMapLibre();
    } catch (e) {
      console.warn('[algeria-map]', e.message);
      renderFallback(container);
      return;
    }

    // Hide the fallback placeholder (it shows by default in case JS fails)
    container.classList.add('algeria-map--ready');

    const map = new maplibregl.Map({
      container: 'algeria-map',
      style: isLightTheme() ? STYLE_LIGHT : STYLE_DARK,
      center: [4.65, 35.89],        // mid-point between BBA & M'Sila
      zoom: 7.2,
      minZoom: 5.5,
      maxZoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
      cooperativeGestures: true,    // require Ctrl+scroll — the map sits in a long page
      maxBounds: [[2.2, 34.4], [7.3, 37.2]]   // tight corral around BBA + M'Sila + breathing room
    });

    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: false, showCompass: false, showZoom: true
    }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    /* HQ marker — custom DOM element with a pulsing halo */
    const hqEl = document.createElement('div');
    hqEl.className = 'amap-hq';
    hqEl.innerHTML = `
      <span class="amap-hq__dot" aria-hidden="true"></span>
      <span class="amap-hq__halo" aria-hidden="true"></span>
      <span class="amap-hq__halo amap-hq__halo--2" aria-hidden="true"></span>
      <span class="amap-hq__label">${HQ.name}</span>
    `;
    new maplibregl.Marker({ element: hqEl, anchor: 'center' })
      .setLngLat(HQ.loc)
      .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div class="amap-popup">
          <div class="amap-popup__role">${HQ.role}</div>
          <h3 class="amap-popup__name">${HQ.name}</h3>
          <p class="amap-popup__addr">${HQ.addr}</p>
          <a class="amap-popup__phone" href="tel:+213${HQ.phone.replace(/\D/g, '')}">
            ${HQ.phone}
          </a>
          ${HQ.mapsUrl ? `<a class="amap-popup__maps" href="${HQ.mapsUrl}" target="_blank" rel="noopener">Itinéraire ↗</a>` : ''}
        </div>
      `))
      .addTo(map);

    /* Branch markers — smaller dot for "future" cities */
    BRANCHES.forEach(b => {
      const el = document.createElement('div');
      el.className = b.future ? 'amap-branch amap-branch--future' : 'amap-branch';
      el.innerHTML = `
        <span class="amap-branch__dot" aria-hidden="true"></span>
        <span class="amap-branch__label">${b.name}</span>
      `;
      const m = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(b.loc);
      if (!b.future) {
        m.setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
          <div class="amap-popup">
            <h3 class="amap-popup__name">${b.name}</h3>
            <p class="amap-popup__addr">${b.addr || ''}</p>
            ${b.phone ? `<a class="amap-popup__phone" href="tel:+213${b.phone.replace(/\D/g, '')}">${b.phone}</a>` : ''}
            ${b.mapsUrl ? `<a class="amap-popup__maps" href="${b.mapsUrl}" target="_blank" rel="noopener">Itinéraire ↗</a>` : ''}
          </div>
        `));
      }
      m.addTo(map);
    });

    /* Animated dashed arcs from HQ to each branch */
    const addRouteLayers = () => {
      if (map.getSource('amap-routes')) return;

      const features = BRANCHES.map(b => {
        // Tighten the curve for very short pairings (intra-BBA) so the arc
        // doesn't balloon ridiculously over the city. M'Sila gets the
        // standard lift since the distance is comfortable.
        const dist = Math.hypot(HQ.loc[0] - b.loc[0], HQ.loc[1] - b.loc[1]);
        const lift = dist < 0.1 ? 0.35 : 0.18;
        return {
          type: 'Feature',
          properties: { id: b.id, future: !!b.future },
          geometry: {
            type: 'LineString',
            coordinates: arcCoords(HQ.loc, b.loc, 64, lift)
          }
        };
      });

      map.addSource('amap-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features }
      });

      // Soft glow (wider, transparent) — gives the line a "lit" feel
      map.addLayer({
        id: 'amap-routes-glow',
        type: 'line',
        source: 'amap-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#9ce8b2',
          'line-width': 5,
          'line-opacity': 0.18,
          'line-blur': 4
        }
      });

      // Main dashed line
      map.addLayer({
        id: 'amap-routes-line',
        type: 'line',
        source: 'amap-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#9ce8b2',
          'line-width': ['case', ['get', 'future'], 1.2, 1.8],
          'line-opacity': ['case', ['get', 'future'], 0.45, 0.85],
          'line-dasharray': [2, 3]
        }
      });

      if (!reduced && !window.__amapDashTimer) {
        // The "ants marching" animation — cycles a series of dash patterns
        const dashSeq = [
          [0, 4, 3], [1, 4, 2], [2, 4, 1], [3, 4, 0],
          [0, 1, 3, 3], [0, 2, 3, 2], [0, 3, 3, 1]
        ];
        let step = 0;
        window.__amapDashTimer = setInterval(() => {
          if (!map.getLayer('amap-routes-line')) return;
          step = (step + 1) % dashSeq.length;
          map.setPaintProperty('amap-routes-line', 'line-dasharray', dashSeq[step]);
        }, 70);
      }
    };

    // Race-safe: addRouteLayers needs the style fully loaded. Listen on
    // BOTH the 'load' event (fires once everything's ready) AND
    // 'styledata' (fires earlier, on every style swap including the
    // initial one). idempotent guard inside addRouteLayers prevents
    // double-add.
    map.on('load', addRouteLayers);
    map.on('styledata', () => {
      if (map.isStyleLoaded()) addRouteLayers();
    });
    // Final safety net: poll for up to 15s in case neither event fires
    // (happens in iframes where document.visibilityState=hidden suspends
    // rAF and event loops). 200ms cadence is unnoticeable.
    let polls = 0;
    const styleWatcher = setInterval(() => {
      if (map.isStyleLoaded() && !map.getSource('amap-routes')) {
        addRouteLayers();
      }
      if (map.getSource('amap-routes') || ++polls > 75) {
        clearInterval(styleWatcher);
      }
    }, 200);

    /* Zoom-aware label visibility — at the new tighter default zoom
       every label fits, so reveal them straight away. */
    function syncZoomClass() {
      container.classList.toggle('is-zoomed-in', map.getZoom() >= 6.8);
    }
    map.on('zoomend', syncZoomClass);
    map.on('moveend', syncZoomClass);
    syncZoomClass();

    /* Recenter button — re-fits to the original 3-agency view if the
       user has panned/zoomed away. */
    const INITIAL = { center: [4.65, 35.89], zoom: 7.2 };
    const recenterBtn = document.createElement('button');
    recenterBtn.type = 'button';
    recenterBtn.className = 'amap-recenter';
    recenterBtn.setAttribute('aria-label', 'Recentrer la carte');
    recenterBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      </svg>
      <span>Recentrer</span>`;
    recenterBtn.addEventListener('click', () => {
      map.flyTo({ center: INITIAL.center, zoom: INITIAL.zoom, duration: 700 });
    });
    container.appendChild(recenterBtn);

    /* ─── ANTI-CLUTTER ENGINE (same model as trip-map.js) ─────────
       Pin-stack detection within 30 px on screen + label collision.
       Algeria branches are spread across the country so most of the
       time nothing collides — but at very wide zoom or odd viewports
       it kicks in to keep things tidy. */
    const PRIORITY = { hq: 100, branch: 30, future: 10 };
    function classifyPin(el) {
      if (el.classList.contains('amap-hq')) return 'hq';
      if (el.classList.contains('amap-branch--future')) return 'future';
      return 'branch';
    }
    const pinRegistry = Array.from(container.querySelectorAll('.amap-hq, .amap-branch'))
      .map(el => {
        const kind = classifyPin(el);
        const labelEl = el.querySelector('.amap-hq__label, .amap-branch__label');
        return {
          el, kind, prio: PRIORITY[kind], labelEl,
          name: labelEl ? labelEl.textContent.trim() : ''
        };
      });

    let clutterRaf = null;
    function deClutter() {
      clutterRaf = null;
      pinRegistry.forEach(p => {
        p.el.classList.remove('amap-collide-hidden');
        p.el.removeAttribute('data-stack-count');
        p.el.removeAttribute('data-stacked-names');
        p.el.removeAttribute('title');
        if (p.labelEl) p.labelEl.classList.remove('amap-label-collide');
      });
      const sorted = [...pinRegistry].sort((a, b) => b.prio - a.prio);

      const visiblePins = [];
      sorted.forEach(p => {
        const rect = p.el.getBoundingClientRect();
        if (rect.width === 0) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // HQ added unconditionally — but it CAN now absorb other pins
        // sitting at the same screen position (intra-BBA case).
        if (p.kind === 'hq') {
          p.x = cx; p.y = cy;
          visiblePins.push(p);
          return;
        }
        // Try to find any visible pin (HQ or branch) within 30px to
        // merge into. HQ takes priority because of its higher prio so
        // it sits earlier in the visiblePins array.
        const absorber = visiblePins.find(v =>
          Math.hypot(v.x - cx, v.y - cy) < 30
        );
        if (absorber) {
          p.el.classList.add('amap-collide-hidden');
          absorber.stack = (absorber.stack || 1) + 1;
          absorber.stackedNames = (absorber.stackedNames || [absorber.name]).concat(p.name);
          absorber.el.setAttribute('data-stack-count', '+' + (absorber.stack - 1));
          absorber.el.setAttribute('data-stacked-names', absorber.stackedNames.join(' · '));
          absorber.el.setAttribute('title',
            `${absorber.stack} agences groupées : ${absorber.stackedNames.join(', ')}`);
        } else {
          p.x = cx; p.y = cy;
          visiblePins.push(p);
        }
      });

      const labelBoxes = [];
      visiblePins.forEach(p => {
        if (!p.labelEl) return;
        if (p.kind === 'hq') {
          const lw = p.labelEl.offsetWidth || 100;
          const lh = p.labelEl.offsetHeight || 22;
          labelBoxes.push({
            x1: p.x - lw / 2 - 4, y1: p.y - 28 - lh,
            x2: p.x + lw / 2 + 4, y2: p.y - 24
          });
          return;
        }
        const lw = p.labelEl.offsetWidth || 80;
        const lh = p.labelEl.offsetHeight || 18;
        const box = {
          x1: p.x - lw / 2 - 4, y1: p.y - 26 - lh,
          x2: p.x + lw / 2 + 4, y2: p.y - 22
        };
        const overlaps = labelBoxes.some(b =>
          !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
        );
        if (overlaps) p.labelEl.classList.add('amap-label-collide');
        else labelBoxes.push(box);
      });
    }
    function scheduleDeClutter() {
      if (clutterRaf) return;
      clutterRaf = requestAnimationFrame(deClutter);
    }
    map.on('move', scheduleDeClutter);
    map.on('zoom', scheduleDeClutter);
    map.on('resize', scheduleDeClutter);
    // Direct initial call (no rAF) so it runs even when rAF is suspended.
    let initTries = 0;
    const initInterval = setInterval(() => {
      const someLaidOut = pinRegistry.some(p => p.el.getBoundingClientRect().width > 0);
      if (someLaidOut || ++initTries > 30) {
        clearInterval(initInterval);
        deClutter();
      }
    }, 100);

    /* Stack-click → zoom in on the cluster */
    container.addEventListener('click', (e) => {
      const pin = e.target.closest('.amap-branch[data-stack-count], .amap-hq[data-stack-count]');
      if (!pin) return;
      const rect = pin.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const point = [
        rect.left + rect.width / 2 - containerRect.left,
        rect.top + rect.height / 2 - containerRect.top
      ];
      const lngLat = map.unproject(point);
      map.flyTo({
        center: [lngLat.lng, lngLat.lat],
        zoom: Math.min(map.getZoom() + 2, 12),
        duration: 600
      });
    }, true);

    /* Click-to-isolate */
    let isolateTimer = null;
    container.addEventListener('click', (e) => {
      const pin = e.target.closest('.amap-branch, .amap-hq');
      if (!pin) return;
      if (pin.hasAttribute('data-stack-count')) return;
      container.classList.add('is-isolating');
      pinRegistry.forEach(p => p.el.classList.toggle('is-focused', p.el === pin));
      clearTimeout(isolateTimer);
      isolateTimer = setTimeout(() => {
        container.classList.remove('is-isolating');
        pinRegistry.forEach(p => p.el.classList.remove('is-focused'));
      }, 2400);
    });

    /* Single-popup mode */
    new MutationObserver((mutations) => {
      const newPopups = mutations.flatMap(m =>
        Array.from(m.addedNodes).filter(n =>
          n.nodeType === 1 && n.classList?.contains('maplibregl-popup')
        )
      );
      if (!newPopups.length) return;
      const all = container.querySelectorAll('.maplibregl-popup');
      const keep = newPopups[newPopups.length - 1];
      all.forEach(p => { if (p !== keep) p.remove(); });
    }).observe(container, { childList: true, subtree: true });

    /* Theme switching — re-add layers after setStyle clears them */
    const observer = new MutationObserver(() => {
      const newStyle = isLightTheme() ? STYLE_LIGHT : STYLE_DARK;
      map.setStyle(newStyle);
      map.once('styledata', addRouteLayers);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Expose for debugging
    window.__alliance_algeria_map = map;
  }

  /* ─── 6. Fallback when MapLibre CDN is unreachable ─────────── */
  function renderFallback(container) {
    container.classList.add('algeria-map--fallback');
    container.innerHTML = `
      <div class="amap-fallback">
        <p class="amap-fallback__title">Carte indisponible hors-ligne</p>
        <p class="amap-fallback__sub">3 agences Alliance Travel · <strong>Bordj Bou Arreridj</strong> (La Graf &amp; Cité Zehour) · <strong>M'Sila</strong></p>
      </div>
    `;
  }

  /* ─── 7. Lazy boot — only init when map is in viewport ──────
     IntersectionObserver lazy-loads the map when it scrolls in.
     Two safety nets so the map never silently fails to appear:
       a) If IO isn't supported, boot immediately
       b) If the container is already in viewport at script start
          (or becomes visible while IO is throttled — e.g. iframe
          embeds with document.visibilityState=hidden), boot anyway. */
  let booted = false;
  function safeBoot() {
    if (booted) return;
    booted = true;
    boot().catch(err => console.warn('[algeria-map] boot failed:', err));
  }

  function lazyBoot() {
    const container = document.getElementById('algeria-map');
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

    // Fallback: if the container is already on-screen (or becomes
    // on-screen while IO is throttled) boot via a manual scroll check.
    const checkVisible = () => {
      if (booted) return;
      const r = container.getBoundingClientRect();
      const onScreen = r.top < (window.innerHeight + 200) && r.bottom > -200;
      if (onScreen) safeBoot();
    };
    checkVisible();   // immediate
    window.addEventListener('scroll', checkVisible, { passive: true });
    // Final long-tail safety: if 30s pass and we're still not booted,
    // boot anyway — better a wasted resource load than a blank section.
    setTimeout(safeBoot, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', lazyBoot);
  } else {
    lazyBoot();
  }
})();
