/**
 * Alliance Travel — interactive 3D globe (cobe-powered)
 * Replaces the homepage SVG with a real WebGL globe.
 * - Auto-rotates at slow speed
 * - Drag to spin (pointer events, mobile + desktop)
 * - Markers in brand mint over a navy globe with cream atmosphere
 * - Polaroid photos that follow each destination as the globe spins
 *   (positioned per-frame via lat/lng -> screen projection)
 * - Graceful fallback: if the cobe CDN is unreachable, the stage falls
 *   back to its CSS-only atmosphere (glow ring + soft polaroid cluster).
 *
 * Loaded as ES module. Cobe is open-source (MIT). Dynamic import so a
 * CDN outage degrades to the static fallback instead of breaking the hero.
 *
 * v26 perf optimizations:
 * - DPR capped at 2 (prevents 4-9× pixel load on retina displays)
 * - mapSamples reduced 16000 → 10000 desktop (visually similar, ~37% lighter)
 * - Polaroid updates use single GPU-friendly transform (no left/top thrash)
 * - Per-frame polaroid math skipped when paused or prefers-reduced-motion
 * - Init deferred to window.load + requestIdleCallback for snappier FCP
 * - Aspirational dots trimmed 18 → 10 (cuts marker-rendering cost)
 *
 * TODO (CSS — needs visual review on running page):
 * - .globe-polaroid[data-marker="egypt"] now anchors to Cairo (30.04°N,
 *   31.24°E) instead of Sharm El Sheikh (27.92°N, 34.33°E). The caption
 *   still reads "Le Caire · Sharm" which is accurate for the photo
 *   subject; if the layout needs adjustment, eyeball it on /index.html
 *   and tune the rotation offset in the `rot` map (currently -4°).
 * - Sharm El Sheikh + Gabala render as cobe dots only (no polaroid HTML).
 *   If product wants polaroids for them, add:
 *     <div class="globe-polaroid" data-marker="sharm" aria-hidden="true">
 *       <img src="assets/images/heroes/hero__sharm.jpg" ... />
 *       <span class="globe-polaroid__caption">Sharm El Sheikh</span>
 *     </div>
 *   and the matching entries with `polaroidId: 'sharm'` / `polaroidId: 'gabala'`
 *   in the DESTINATIONS array below.
 */

let createGlobe = null;
async function loadCobe() {
  if (createGlobe) return createGlobe;
  try {
    const mod = await import('https://esm.sh/cobe@0.6.4');
    createGlobe = mod.default || mod;
    return createGlobe;
  } catch (err) {
    console.warn('[globe] cobe CDN unreachable, falling back to CSS-only stage:', err);
    return null;
  }
}

/* PRIMARY destinations — Alliance Travel's actual offerings.
   These get a polaroid photo overlay anchored to the marker.
   Coords are spec-precise (lat, lng in degrees). cobe marker format:
   `{ location: [lat, lng], size }`. HQ has a slightly larger marker.
   Cairo + Sharm are close on the globe (~3° apart) — disambiguated
   by slightly different `size`. */
const DESTINATIONS = [
  // `id` = cobe internal id, `polaroidId` = which `.globe-polaroid[data-marker]`
  // DOM node tracks this marker. The egypt polaroid (single photo) anchors to
  // Cairo since it's the headline city; Sharm appears as a dot only.
  { id: 'bba',    loc: [36.0686,   4.7616], size: 0.10,  home: true, polaroidId: 'bba',   label: 'Bordj Bou Arreridj' },
  { id: 'cairo',  loc: [30.0444,  31.2357], size: 0.07,              polaroidId: 'egypt', label: 'Le Caire' },
  { id: 'sharm',  loc: [27.9158,  34.3300], size: 0.065,                                   label: 'Sharm El Sheikh' },
  { id: 'aze',    loc: [40.4093,  49.8671], size: 0.07,              polaroidId: 'aze',   label: 'Bakou' },
  { id: 'gabala', loc: [40.9852,  47.8460], size: 0.06,                                   label: 'Gabala' },
  { id: 'ist',    loc: [41.0082,  28.9784], size: 0.07,              polaroidId: 'ist',   label: 'Istanbul' },
  { id: 'kl',     loc: [ 3.1390, 101.6869], size: 0.07,              polaroidId: 'kl',    label: 'Kuala Lumpur' }
];

/* SECONDARY destinations — top global tourist hotspots that decorate the
   globe to make it feel worldwide and aspirational. They appear as smaller
   mint dots without polaroids — a visual hint that travel is everywhere.
   Trimmed v26: fewer dots = lighter per-frame WebGL load. Kept the most
   iconic hubs across continents. */
const ASPIRATIONAL = [
  { name: 'Paris',          loc: [ 48.86,    2.35] },
  { name: 'London',         loc: [ 51.51,   -0.13] },
  { name: 'Rome',           loc: [ 41.90,   12.50] },
  { name: 'Dubai',          loc: [ 25.20,   55.27] },
  { name: 'Tokyo',          loc: [ 35.68,  139.65] },
  { name: 'Bangkok',        loc: [ 13.76,  100.50] },
  { name: 'Bali',           loc: [ -8.65,  115.22] },
  { name: 'Cape Town',      loc: [-33.92,   18.42] },
  { name: 'New York',       loc: [ 40.71,  -74.01] },
  { name: 'Sydney',         loc: [-33.87,  151.21] }
];
const ASPIRATIONAL_SIZE = 0.035;

const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ROT_SPEED = reduced ? 0 : 0.0028;

// PC-only viewport gate — keep this aligned with the CSS rule
// `.home-hero__globe { display: none }` at ≤1024px in index.html.
// Below the threshold the entire globe column is invisible, so
// downloading cobe (~50 KB) + running the rAF render loop is
// pure waste. Reading matchMedia is cheap; this also fires on
// orientation change via the `resize` listener below.
const GLOBE_BREAKPOINT = '(min-width: 1025px)';
const isDesktop = () => window.matchMedia?.(GLOBE_BREAKPOINT).matches;

async function init() {
  const canvas = document.getElementById('alliance-globe');
  const stage = document.getElementById('globe-stage');
  if (!canvas || !stage) return;

  // Mobile / tablet: bail before any network or GPU work happens.
  if (!isDesktop()) return;

  // Try to load cobe — if the CDN is unreachable, fall back to the
  // CSS-only stage and reveal polaroids in a static cluster instead.
  const cobe = await loadCobe();
  if (!cobe) {
    stage.classList.add('globe-stage--fallback');
    canvas.style.display = 'none';
    document.querySelectorAll('.globe-polaroid').forEach((el, i) => {
      // Fan polaroids in a circle around the stage center
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const r = stage.offsetWidth * 0.36;
      el.style.left = `${stage.offsetWidth / 2 + Math.cos(angle) * r}px`;
      el.style.top  = `${stage.offsetHeight / 2 + Math.sin(angle) * r}px`;
      el.style.opacity = '1';
    });
    document.getElementById('globe-hint')?.remove();
    return;
  }
  // Local alias so the rest of init() reads naturally
  const createGlobe = cobe;

  // Brand color tokens converted to cobe's [r,g,b] 0..1 floats.
  // navy  #002c51 -> [0.000, 0.173, 0.318]
  // mint  #9ce8b2 -> [0.612, 0.910, 0.698]
  // cream #efe8df -> [0.937, 0.910, 0.875]
  const baseColor   = [0.04, 0.10, 0.22];   // dark navy with a touch of life
  const markerColor = [0.612, 0.910, 0.698];
  const glowColor   = [0.937, 0.910, 0.875];

  let phi = 0;
  let theta = 0.18;
  let phiOffset = 0;
  let thetaOffset = 0;
  const drag = { phi: 0, theta: 0 };
  let pointerStart = null;
  let paused = false;
  let pointerX = 0;
  let pointerY = 0;
  let dpr = 1;

  // Pre-resolve polaroid DOM nodes once (cheap each-frame lookup).
  // Only destinations with a `polaroidId` get a DOM overlay — others render
  // as cobe dots only (e.g. Sharm shares the Egypt photo with Cairo).
  const polaroids = DESTINATIONS
    .filter(d => d.polaroidId)
    .map(d => ({
      dest: d,
      el: document.querySelector(`.globe-polaroid[data-marker="${d.polaroidId}"]`),
      rot: { bba: 0, egypt: -4, aze: 3, ist: -2, kl: 5 }[d.polaroidId] || 0
    }))
    .filter(p => p.el);

  /* Project a [lat, lng] onto the rendered canvas at the given globe rotation.
     Returns { x, y, depth } in CSS pixels relative to the canvas, where
     depth ∈ [-1, 1] (1 = facing camera, -1 = far side). */
  function projectMarker(lat, lng, rotPhi, rotTheta) {
    const r = canvas.offsetWidth / 2;
    const phiR = (lng * Math.PI) / 180 + rotPhi;
    const thetaR = (lat * Math.PI) / 180;
    // 3D point on unit sphere
    let x = Math.cos(thetaR) * Math.sin(phiR);
    let y = Math.sin(thetaR);
    let z = Math.cos(thetaR) * Math.cos(phiR);
    // Rotate around X axis by rotTheta (camera tilt)
    const ct = Math.cos(rotTheta);
    const st = Math.sin(rotTheta);
    const yT = y * ct - z * st;
    const zT = y * st + z * ct;
    return {
      x: r + x * r,
      y: r - yT * r,
      depth: zT
    };
  }

  /* Update each polaroid's screen position + visibility on every frame.
     Perf v26: pinned to `left:0; top:0` and driven by a single 3D transform
     so the browser keeps the polaroids on the compositor layer (no layout/
     paint thrash per frame). The CSS rule already sets left:0/top:0. */
  function updatePolaroids(rotPhi, rotTheta) {
    for (const p of polaroids) {
      const pos = projectMarker(p.dest.loc[0], p.dest.loc[1], rotPhi, rotTheta);
      // Fade based on depth — front-facing = full, edge = transparent, back = hidden
      const visibility = Math.max(0, Math.min(1, (pos.depth - 0.05) / 0.5));
      // translate3d primes the GPU path; nudge above the marker by 14px + the
      // polaroid's own height (handled by translate(-50%, -100%)).
      p.el.style.transform =
        `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0) ` +
        `translate(-50%, calc(-100% - 14px)) rotate(${p.rot}deg)`;
      p.el.style.opacity = visibility.toFixed(3);
      // Skip the blur filter when fully visible — composite blurs are GPU-cheap
      // but not free; gating on (visibility < 0.95) drops it in the common case.
      p.el.style.filter = visibility >= 0.95
        ? 'none'
        : `blur(${((1 - visibility) * 6).toFixed(1)}px)`;
    }
  }

  // Initialize the globe sized to the rendered canvas.
  // Cobe drives its own animation loop via rAF and calls our onRender
  // each frame so we can mutate `state.phi` / `state.theta`.
  const ensure = () => {
    const w = canvas.offsetWidth || stage.offsetWidth || 420;
    if (w === 0) return null;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    return createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: w * dpr,
      height: w * dpr,
      phi: 0,
      theta: 0.18,
      dark: 1,
      diffuse: 1.4,
      // mapSamples = sphere-sampling density. cobe default is 16000; on
      // high-DPI displays with DPR 2 that's already a 4× pixel budget on
      // top — far past the visual diminishing returns. 10000 desktop /
      // 8000 mobile keeps the dotted-globe aesthetic without burning a
      // first-paint budget. Drop further (e.g. 6000) if you still see jank.
      mapSamples: window.matchMedia('(max-width: 768px)').matches ? 8000 : 10000,
      mapBrightness: 4,
      baseColor,
      markerColor,
      glowColor,
      markers: [
        // Primary destinations — Alliance Travel's actual trip catalog
        ...DESTINATIONS.map(d => ({ location: d.loc, size: d.size })),
        // Aspirational world map — top tourist hotspots as smaller dots
        ...ASPIRATIONAL.map(d => ({ location: d.loc, size: ASPIRATIONAL_SIZE }))
      ],
      onRender: (state) => {
        // When paused (offscreen or user dragging-released), skip the rotation
        // step. cobe still re-paints the frame, but at least the geometry is
        // static so the GPU just composites the last buffer.
        if (!paused) phi += ROT_SPEED;
        const curPhi = phi + phiOffset + drag.phi;
        const curTheta = theta + thetaOffset + drag.theta;
        state.phi = curPhi;
        state.theta = curTheta;
        // Resize defensively in case the canvas changed
        state.width = canvas.offsetWidth * dpr;
        state.height = canvas.offsetWidth * dpr;
        // Project polaroids to follow markers as the globe rotates.
        // Reduced-motion users see the globe at theta=0.18 phi=0 (set once on
        // init); skipping per-frame polaroid math saves 5 trig ops × 5 polaroids.
        // When paused we also don't need to recompute — nothing moved.
        if (!reduced && !paused) updatePolaroids(curPhi, curTheta);
      }
    });
  };

  let globe = null;

  // Wait for the canvas to actually have a measurable width before init
  const tryInit = () => {
    if (globe || canvas.offsetWidth === 0) return;
    try {
      globe = ensure();
    } catch (err) {
      console.error('[globe] init failed:', err);
      canvas.style.opacity = '0';
      return;
    }
    if (globe) {
      canvas.style.opacity = '1';
      // Project polaroids once synchronously so they appear at correct
      // positions even before the first rAF tick.
      updatePolaroids(0, theta);
    }
  };

  tryInit();
  if (!globe) {
    const ro = new ResizeObserver(() => {
      if (!globe) tryInit();
    });
    ro.observe(canvas);
  }

  // Drag-to-spin
  canvas.addEventListener('pointerdown', (e) => {
    pointerStart = { x: e.clientX, y: e.clientY };
    pointerX = e.clientX;
    pointerY = e.clientY;
    paused = true;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(e.pointerId);
    dismissHint();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerStart) return;
    pointerX = e.clientX;
    pointerY = e.clientY;
    drag.phi = (pointerX - pointerStart.x) / 220;
    drag.theta = -(pointerY - pointerStart.y) / 480;
    // Clamp theta to avoid flipping over the poles
    drag.theta = Math.max(-0.6, Math.min(0.6, drag.theta));
  });

  const endDrag = () => {
    if (pointerStart) {
      phiOffset += drag.phi;
      thetaOffset += drag.theta;
      drag.phi = 0;
      drag.theta = 0;
    }
    pointerStart = null;
    paused = false;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // Resize handler — recreate globe on viewport change
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (globe) {
        globe.destroy();
        globe = null;
      }
      tryInit();
    }, 220);
  }, { passive: true });

  /* Pause globe when offscreen.
     Cobe runs its own internal rAF; when the globe scrolls below the viewport
     (or to a different page section), there's no point spending GPU/CPU on it.
     We freeze rotation via the `paused` flag (already used for drag) and add
     a CSS class that flips visibility: hidden — modern browsers' compositors
     skip paint for hidden subtrees, so the GPU work effectively stops.

     IntersectionObserver with rootMargin:0 means "only when even one pixel is
     visible". As soon as the user scrolls back, we resume. Dirt cheap. */
  if ('IntersectionObserver' in window) {
    let wasVisible = true;
    const visObs = new IntersectionObserver((entries) => {
      const visible = entries[0]?.isIntersecting ?? true;
      if (visible === wasVisible) return;
      wasVisible = visible;
      if (visible) {
        stage.classList.remove('is-paused');
        // Resume rotation only if the user isn't currently dragging
        if (!pointerStart) paused = false;
      } else {
        stage.classList.add('is-paused');
        paused = true;
      }
    }, { rootMargin: '50px' });
    visObs.observe(stage);
  }

  // Polaroid overlays — fade in once the globe has loaded
  setTimeout(() => {
    document.querySelectorAll('.globe-polaroid').forEach(el => el.classList.add('is-ready'));
  }, 900);

  /* "Drag to explore" hint — first-visit only, dismisses on first
     pointer interaction with the canvas. Persisted in localStorage. */
  const HINT_KEY = 'at-globe-hint-dismissed';
  const hint = document.getElementById('globe-hint');
  let hintShown = false;
  let hintAutoHideT = null;

  function dismissHint() {
    if (!hint || !hintShown) return;
    hint.classList.add('is-dismissed');
    hint.classList.remove('is-visible');
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* private mode */ }
    clearTimeout(hintAutoHideT);
  }

  if (hint) {
    let alreadyDismissed = false;
    try { alreadyDismissed = !!localStorage.getItem(HINT_KEY); } catch (e) {}
    if (!alreadyDismissed && !reduced) {
      // Show after the globe has had a moment to settle
      setTimeout(() => {
        hint.classList.add('is-visible');
        hintShown = true;
      }, 1800);
      // Auto-hide after 12s if no interaction
      hintAutoHideT = setTimeout(dismissHint, 14000);
    }
  }
}

/* Defer globe init until after the page has settled.
   Cobe pulls ~50 KB from esm.sh and warms a WebGL context — both expensive
   during the critical first-paint window. Sequencing:
     1) wait for `load` (HTML, CSS, hero images are done downloading)
     2) wait for `requestIdleCallback` (any leftover layout / paint flushes)
     3) finally call init()
   Browsers without rIC fall back to a 200 ms setTimeout. */
function scheduleInit() {
  const run = () => init();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 200);
  }
}

if (document.readyState === 'complete') {
  scheduleInit();
} else {
  window.addEventListener('load', scheduleInit, { once: true });
}
