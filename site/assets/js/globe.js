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
   These get a polaroid photo overlay anchored to the marker. */
const DESTINATIONS = [
  { id: 'bba',   loc: [36.073,   4.761], size: 0.10, home: true,  label: 'Bordj Bou Arreridj' },
  { id: 'egypt', loc: [27.916,  34.330], size: 0.07, label: 'Le Caire & Sharm' },
  { id: 'aze',   loc: [40.409,  49.867], size: 0.07, label: 'Bakou' },
  { id: 'ist',   loc: [41.008,  28.978], size: 0.07, label: 'Istanbul' },
  { id: 'kl',    loc: [ 3.139, 101.687], size: 0.07, label: 'Kuala Lumpur' }
];

/* SECONDARY destinations — top global tourist hotspots that decorate the
   globe to make it feel worldwide and aspirational. They appear as smaller
   mint dots without polaroids — a visual hint that travel is everywhere. */
const ASPIRATIONAL = [
  { name: 'Paris',          loc: [ 48.86,    2.35] },
  { name: 'London',         loc: [ 51.51,   -0.13] },
  { name: 'Rome',           loc: [ 41.90,   12.50] },
  { name: 'Barcelona',      loc: [ 41.39,    2.17] },
  { name: 'Amsterdam',      loc: [ 52.37,    4.90] },
  { name: 'Athens',         loc: [ 37.98,   23.73] },
  { name: 'Marrakech',      loc: [ 31.63,   -8.01] },
  { name: 'Dubai',          loc: [ 25.20,   55.27] },
  { name: 'Tokyo',          loc: [ 35.68,  139.65] },
  { name: 'Bangkok',        loc: [ 13.76,  100.50] },
  { name: 'Bali',           loc: [ -8.65,  115.22] },
  { name: 'Maldives',       loc: [  3.20,   73.22] },
  { name: 'Mauritius',      loc: [-20.35,   57.55] },
  { name: 'Zanzibar',       loc: [ -6.16,   39.20] },
  { name: 'Cape Town',      loc: [-33.92,   18.42] },
  { name: 'New York',       loc: [ 40.71,  -74.01] },
  { name: 'Rio de Janeiro', loc: [-22.91,  -43.17] },
  { name: 'Sydney',         loc: [-33.87,  151.21] }
];
const ASPIRATIONAL_SIZE = 0.035;

const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const ROT_SPEED = reduced ? 0 : 0.0028;

async function init() {
  const canvas = document.getElementById('alliance-globe');
  const stage = document.getElementById('globe-stage');
  if (!canvas || !stage) return;

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

  // Pre-resolve polaroid DOM nodes once (cheap each-frame lookup)
  const polaroids = DESTINATIONS.map(d => ({
    dest: d,
    el: document.querySelector(`.globe-polaroid[data-marker="${d.id}"]`),
    rot: { bba: 0, egypt: -4, aze: 3, ist: -2, kl: 5 }[d.id] || 0
  })).filter(p => p.el);

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

  /* Update each polaroid's screen position + visibility on every frame */
  function updatePolaroids(rotPhi, rotTheta) {
    for (const p of polaroids) {
      const pos = projectMarker(p.dest.loc[0], p.dest.loc[1], rotPhi, rotTheta);
      // Fade based on depth — front-facing = full, edge = transparent, back = hidden
      const visibility = Math.max(0, Math.min(1, (pos.depth - 0.05) / 0.5));
      p.el.style.left = pos.x + 'px';
      p.el.style.top = pos.y + 'px';
      p.el.style.transform = `translate(-50%, calc(-100% - 14px)) rotate(${p.rot}deg)`;
      p.el.style.opacity = visibility.toFixed(3);
      p.el.style.filter = `blur(${((1 - visibility) * 6).toFixed(1)}px)`;
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
      // Mobile gets fewer samples — saves ~150ms WebGL setup on low-end Android
      mapSamples: window.matchMedia('(max-width: 768px)').matches ? 8000 : 16000,
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
        if (!paused) phi += ROT_SPEED;
        const curPhi = phi + phiOffset + drag.phi;
        const curTheta = theta + thetaOffset + drag.theta;
        state.phi = curPhi;
        state.theta = curTheta;
        // Resize defensively in case the canvas changed
        state.width = canvas.offsetWidth * dpr;
        state.height = canvas.offsetWidth * dpr;
        // Project polaroids to follow markers as the globe rotates
        updatePolaroids(curPhi, curTheta);
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
