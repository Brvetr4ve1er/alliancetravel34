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
 *   attachDashAnimation() — ants-marching dash cycle on a line layer,
 *                           paused off-screen / on a hidden tab
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
       motion or the same timer key is already attached.

       GATED like every other animation here (globe.js): the 70ms interval is
       a paint-property write ~14×/second and used to run for the life of the
       page — while the map was scrolled far off-screen and while the tab was
       in the background — with no clearInterval anywhere in the repo. It now
       runs only while the map container is in view AND the tab is visible,
       stops on pagehide, and re-arms on a bfcache restore (pageshow.persisted)
       so pressing Back does not leave the ants dead. The cycle itself is
       unchanged (same sequence, same 70ms, resumes on the step it paused on),
       so the visible animation is identical whenever it is actually on screen.

       window[timerKey] still holds the live interval id (null while paused);
       the returned handle exposes stop()/dispose() so a caller can clear it. */
    attachDashAnimation(map, layerId, timerKey) {
      const ctlKey = timerKey + 'Ctl';
      // The controller — not the interval id — is the "already attached"
      // marker: the id is null whenever we're paused, and a re-style calling
      // this again in that window would otherwise start a second timer.
      if (this.reduced || window[ctlKey]) return window[ctlKey] || null;
      const dashSeq = [
        [0, 4, 3], [1, 4, 2], [2, 4, 1], [3, 4, 0],
        [0, 1, 3, 3], [0, 2, 3, 2], [0, 3, 3, 1]
      ];
      let step = 0;
      let inView = true;   // set by the pause observer below

      const tick = () => {
        if (!map.getLayer(layerId)) return;
        step = (step + 1) % dashSeq.length;
        map.setPaintProperty(layerId, 'line-dasharray', dashSeq[step]);
      };
      const running = () => inView && !document.hidden;
      const start = () => {
        if (window[timerKey] != null || !running()) return;
        window[timerKey] = setInterval(tick, 70);
      };
      const stop = () => {
        if (window[timerKey] != null) { clearInterval(window[timerKey]); window[timerKey] = null; }
      };
      const sync = () => { running() ? start() : stop(); };

      let pauseObs = null;
      const container = typeof map.getContainer === 'function' ? map.getContainer() : null;
      const observe = () => {
        if (pauseObs || !container || !('IntersectionObserver' in window)) return;
        pauseObs = new IntersectionObserver((entries) => {
          entries.forEach((e) => { inView = e.isIntersecting; });
          sync();
        }, { rootMargin: '0px' });
        pauseObs.observe(container);
      };
      const onVisibility = () => sync();

      // arm()/detach() are a PAIR, because a page can be frozen and revived any
      // number of times. arm() is idempotent and always re-runs sync(), so the
      // gates decide whether anything actually starts.
      let armed = false;
      const arm = () => {
        if (!armed) {
          armed = true;
          observe();
          document.addEventListener('visibilitychange', onVisibility);
        }
        sync();
      };
      const detach = () => {
        armed = false;
        stop();
        if (pauseObs) { pauseObs.disconnect(); pauseObs = null; }
        document.removeEventListener('visibilitychange', onVisibility);
      };

      // Battery hygiene: no timer survives a pagehide (mirrors globe.js). But a
      // pagehide is not always the end — with event.persisted the page is going
      // into the bfcache and comes back on Back. Tearing everything down there
      // (and leaving window[ctlKey] set, so attachDashAnimation can never
      // re-attach) killed the ants for the rest of that page's life. Freeze on
      // the way out, re-arm on the way in.
      const onPageHide = (e) => {
        if (e && e.persisted) { stop(); return; } // frozen: keep the gates wired
        detach();                                  // real unload: let it all go
      };
      const onPageShow = (e) => {
        if (!e || !e.persisted) return; // a normal load already armed itself
        arm();                          // rebuilds the gates only if detach() ran
      };
      window.addEventListener('pagehide', onPageHide);
      // Deliberately NOT removed by onPageHide: pagehide.persisted has been
      // unreliable across browsers, and a restore proves the page survived — so
      // pageshow stays listening and rebuilds whatever detach() dropped.
      window.addEventListener('pageshow', onPageShow);

      const ctl = {
        stop,
        // An explicit dispose() by a caller means "gone for good": unlike the
        // pagehide path it also unhooks the lifecycle listeners and releases the
        // attach marker, so a later attachDashAnimation() can start clean.
        dispose() {
          detach();
          window.removeEventListener('pagehide', onPageHide);
          window.removeEventListener('pageshow', onPageShow);
          if (window[ctlKey] === ctl) window[ctlKey] = null;
        }
      };

      window[ctlKey] = ctl;
      arm();
      return ctl;
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
      let teardown = null;
      const safeBoot = () => {
        if (booted) return;
        booted = true;
        // Detach the fallback scroll listener / observer the moment we boot,
        // whichever trigger fired — previously the scroll listener stayed
        // attached for the page's life as a short-circuited no-op (small leak).
        if (teardown) { teardown(); teardown = null; }
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
        }, { rootMargin: '600px 0px' }); // boot ~1 viewport early so the map is ready when it scrolls in
        io.observe(container);
        const checkVisible = () => {
          if (booted) return;
          const r = container.getBoundingClientRect();
          if (r.top < (window.innerHeight + 600) && r.bottom > -600) safeBoot();
        };
        window.addEventListener('scroll', checkVisible, { passive: true });
        teardown = () => {
          io.disconnect();
          window.removeEventListener('scroll', checkVisible);
        };
        checkVisible();
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
