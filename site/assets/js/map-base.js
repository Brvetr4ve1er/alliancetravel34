/**
 * Alliance Travel — Shared MapLibre helpers
 *
 * Pure helpers used by BOTH algeria-map.js (homepage branch network)
 * and trip-map.js (per-trip itinerary). Exposed on window.MapBase so
 * the vanilla-no-build constraint is preserved. Must be loaded before
 * either map module (defer respects document order).
 *
 * Helpers (no DOM mutation outside the consumer's container):
 *   STYLES                — CARTO basemap URLs (free, no API key)
 *   isLightTheme()        — reads documentElement.dataset.theme
 *   currentStyle()        — returns the basemap URL for the active theme
 *   reduced               — boolean from prefers-reduced-motion
 *   arcCoords(from,to,…)  — quadratic Bezier curve points (64 samples)
 *   loadMapLibre()        — lazy CDN load, idempotent
 *   escapeHtml(s)         — HTML-entity escape for popup text
 *   attachDashAnimation() — ants-marching dash cycle on a line layer
 *   setupSinglePopup()    — auto-close older popups
 *   setupThemeSwap()      — re-style on data-theme attribute change
 *   lazyBoot()            — IO + scroll fallback + 30s safety boot
 */
(() => {
  const MapBase = {
    STYLES: {
      light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      dark:  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    },

    isLightTheme() {
      return document.documentElement.dataset.theme === 'light';
    },

    currentStyle() {
      return this.isLightTheme() ? this.STYLES.light : this.STYLES.dark;
    },

    reduced: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,

    /* Quadratic Bezier between two lng/lat points. `lift` controls how
       much the curve bows away from the straight line (negative bows
       the other way). 64 samples gives a visibly smooth arc on map. */
    arcCoords(from, to, samples = 64, lift = 0.18) {
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
    },

    /* Idempotent CDN loader — resolves the global maplibregl. */
    loadMapLibre() {
      if (window.maplibregl) return Promise.resolve(window.maplibregl);
      return new Promise((resolve, reject) => {
        // jsDelivr (not unpkg) — more reliable across MENA edges and serves
        // byte-identical npm files, so the SRI hashes below are stable.
        // SRI + crossorigin guard against CDN compromise (audit F6).
        if (!document.querySelector('link[href*="maplibre-gl"]')) {
          const css = document.createElement('link');
          css.rel = 'stylesheet';
          css.href = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
          css.integrity = 'sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V';
          css.crossOrigin = 'anonymous';
          document.head.appendChild(css);
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
        s.integrity = 'sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj';
        s.crossOrigin = 'anonymous';
        s.async = true;
        s.onload = () => resolve(window.maplibregl);
        s.onerror = () => reject(new Error('MapLibre GL failed to load'));
        document.head.appendChild(s);
      });
    },

    escapeHtml(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /* Ants-marching dash cycle on a line layer. Skips when reduced
       motion or the same timer key is already running. */
    attachDashAnimation(map, layerId, timerKey) {
      if (this.reduced || window[timerKey]) return;
      const dashSeq = [
        [0, 4, 3], [1, 4, 2], [2, 4, 1], [3, 4, 0],
        [0, 1, 3, 3], [0, 2, 3, 2], [0, 3, 3, 1]
      ];
      let step = 0;
      window[timerKey] = setInterval(() => {
        if (!map.getLayer(layerId)) return;
        step = (step + 1) % dashSeq.length;
        map.setPaintProperty(layerId, 'line-dasharray', dashSeq[step]);
      }, 70);
    },

    /* When a new maplibregl-popup appears in the container, remove any
       older sibling popups. Cheap — fires only on popup DOM changes. */
    setupSinglePopup(container) {
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
    },

    /* Re-style the map when data-theme flips. Calls onRestyle once
       the new style fires its first styledata event. */
    setupThemeSwap(map, onRestyle) {
      new MutationObserver(() => {
        map.setStyle(this.currentStyle());
        map.once('styledata', onRestyle);
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    },

    /* Lazy boot pattern with three safety nets:
       1. IntersectionObserver — primary trigger
       2. Manual scroll check — handles iframes / hidden tabs where IO
          is throttled
       3. 30-second hard timeout — never silently fails */
    lazyBoot(containerId, bootFn) {
      let booted = false;
      const safeBoot = () => {
        if (booted) return;
        booted = true;
        bootFn().catch(err => console.warn(`[${containerId}] boot failed:`, err));
      };
      const launch = () => {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!('IntersectionObserver' in window)) { safeBoot(); return; }
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) { io.disconnect(); safeBoot(); }
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
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', launch);
      } else {
        launch();
      }
    }
  };

  window.MapBase = MapBase;
})();
