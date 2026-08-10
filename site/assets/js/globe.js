/**
 * Alliance Travel — "Nos destinations" globe (homepage-only three.js showpiece)
 *
 * ONE tasteful WebGL flourish: a slowly-rotating procedural globe with the
 * agency's 7 destinations pinned, mounted BELOW THE FOLD in the #voyages
 * section. A globe was shipped here once and pulled (see the "the v28 WebGL
 * globe is gone" gravestone in enhance.js) because it was always-on and
 * costly. This one is built so it can never hurt performance:
 *
 *   • SKIP-FIRST — phones (<=768px), prefers-reduced-motion, Save-Data and
 *     low-memory devices do NOTHING: three.js is never fetched, the static
 *     CSS fallback inside #globe-stage simply stays. (Requirement 1.)
 *   • LAZY — three.js (~150KB) is loaded from cdn.jsdelivr.net only when the
 *     stage nears the viewport (IntersectionObserver + rootMargin), mirroring
 *     map-base.js. Users who never scroll there never download it. (Req 2.)
 *   • SRI — a pinned version (three@0.149.0, the last line with a UMD global
 *     build/three.min.js exposing window.THREE) with a REAL sha384 integrity
 *     hash + crossOrigin="anonymous". A wrong hash => the script is blocked =>
 *     the fallback must remain, so init is fully try/catch-guarded. (Req 3.)
 *   • PROCEDURAL — no external textures (CSP-clean, light): a phong sphere +
 *     accent wireframe graticule + glowing pin markers. Colors are read from
 *     the site's --accent token so it tracks the palette + theme. (Req 4.)
 *   • OFF-SCREEN PAUSE — the rAF loop STOPS the moment the globe leaves the
 *     viewport (IntersectionObserver) or the tab is hidden (visibilitychange),
 *     and resumes on return. It never renders a frame while off-screen — the
 *     likely reason the old one was pulled. (Req 5.)
 *   • GRACEFUL — every load/init step is wrapped; on ANY failure the static
 *     fallback stays and nothing is left half-drawn. devicePixelRatio is
 *     capped at 2 so retina screens aren't punished. (Req 6.)
 *
 * Homepage-only: this file is included from site/index.html alone, NOT from
 * the trip-page scripts template. Style mirrors map-base.js + anim.js.
 */
(() => {
  'use strict';

  const mm = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false });

  /* ── 1. SKIP CONDITIONS — evaluated BEFORE anything is fetched ────────────
        If ANY hold, we return immediately: three.js is never requested and the
        static fallback in #globe-stage stays exactly as authored. */
  const conn = navigator.connection || navigator.webkitConnection || null;
  const skip =
    mm('(prefers-reduced-motion: reduce)').matches ||   // motion-averse users
    mm('(max-width: 768px)').matches ||                 // phones never download three.js
    (conn && conn.saveData === true) ||                 // Save-Data / metered
    (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory > 0 && navigator.deviceMemory < 4); // low-RAM (best-effort)

  if (skip) return;

  /* ── 2 + 3. Lazy, idempotent, SRI-pinned three.js loader ──────────────────
        three@0.149.0 build/three.min.js is a UMD bundle whose global is
        `window.THREE`. The integrity below was computed from the byte-identical
        npm tarball (openssl dgst -sha384 build/three.min.js | base64) and is
        served identically by jsDelivr, which CSP script-src already allows. */
  const THREE_SRC = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
  const THREE_SRI = 'sha384-RRHfJ6w1mTlKUBMYT/hvnRiOzEB/vyRV3DrQOseb6oYfvaZSfdd0byS4bHps0k2R';

  let threePromise = null;
  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (threePromise) return threePromise;
    threePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-three-lib]');
      if (existing) {
        existing.addEventListener('load', () => (window.THREE ? resolve(window.THREE) : reject(new Error('THREE global missing'))));
        existing.addEventListener('error', () => reject(new Error('three.js failed to load')));
        return;
      }
      const s = document.createElement('script');
      s.src = THREE_SRC;
      s.integrity = THREE_SRI;          // SRI — a mismatch blocks the script (fallback stays)
      s.crossOrigin = 'anonymous';      // required for SRI on a cross-origin CDN
      s.async = true;
      s.setAttribute('data-three-lib', '');
      s.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error('THREE global missing')));
      s.onerror = () => reject(new Error('three.js failed to load'));
      document.head.appendChild(s);
    });
    return threePromise;
  }

  /* ── 4. The 7 destinations (approx lat/long) ──────────────────────────────
        Cairo, Istanbul, Baku, Kuala Lumpur, Bali (Denpasar), Hanoi, Tunis. */
  const DESTINATIONS = [
    { name: 'Le Caire',      lat: 30.04, lng: 31.24 },  // Égypte
    { name: 'Istanbul',      lat: 41.01, lng: 28.98 },  // Turquie
    { name: 'Bakou',         lat: 40.41, lng: 49.87 },  // Azerbaïdjan
    { name: 'Kuala Lumpur',  lat: 3.14,  lng: 101.69 }, // Malaisie
    { name: 'Bali',          lat: -8.65, lng: 115.22 }, // Indonésie (Denpasar)
    { name: 'Hanoï',         lat: 21.03, lng: 105.85 }, // Vietnam
    { name: 'Tunis',         lat: 36.81, lng: 10.18 }   // Tunisie
  ];

  const ROT_SPEED = 0.14;   // radians / second — a full turn ≈ 45s (slow, tasteful)
  const AXIAL_TILT = 0.35;  // gentle Earth-like tilt so pins read well

  function readAccent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return v || '#9ce8b2';
  }

  /* Approx lat/long -> a point on a sphere of radius r (three.js right-handed,
     y-up). Orientation is decorative, only internal consistency matters. */
  function latLngToVec3(THREE, lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  /* ── Init: build the scene, then guard the run loop ───────────────────────
        Everything is inside the caller's try/catch. The stage is only marked
        `--live` (which reveals the canvas + hides the fallback) AFTER a
        successful first render, so any throw leaves the fallback in place. */
  function init(THREE, stage, canvas) {
    // Measure the STAGE (always sized via CSS aspect-ratio) — the canvas is
    // still display:none at this point, so its own clientWidth would be 0.
    let w = stage.clientWidth || 0;
    let h = stage.clientHeight || 0;
    if (w < 2 || h < 2) return null;   // not laid out yet → keep fallback

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // retina cap (Req 6)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);       // false = don't touch CSS size (CSS owns it)

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    const globe = new THREE.Group();
    globe.rotation.x = AXIAL_TILT;
    scene.add(globe);

    const R = 1;
    const accent = new THREE.Color(readAccent());

    // Base sphere: a deep, accent-tinted phong sphere. Directional light gives
    // it a soft terminator so it reads as a globe (low-poly, cheap).
    const baseGeo = new THREE.SphereGeometry(R, 40, 28);
    const baseMat = new THREE.MeshPhongMaterial({
      color: accent.clone().multiplyScalar(0.18),
      emissive: accent.clone().multiplyScalar(0.06),
      shininess: 6,
      transparent: true,
      opacity: 0.95
    });
    globe.add(new THREE.Mesh(baseGeo, baseMat));

    // Accent wireframe graticule just above the surface.
    const wireGeo = new THREE.SphereGeometry(R * 1.004, 24, 18);
    const wireMat = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.16 });
    globe.add(new THREE.Mesh(wireGeo, wireMat));

    // Pins: a bright accent core (unlit basic material) + an additive halo for
    // a subtle glow. Geometries are shared across all 7 markers.
    const pinGeo = new THREE.SphereGeometry(0.03, 10, 8);
    const pinMat = new THREE.MeshBasicMaterial({ color: accent });
    const haloGeo = new THREE.SphereGeometry(0.058, 10, 8);
    const haloMat = new THREE.MeshBasicMaterial({
      color: accent, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    DESTINATIONS.forEach((d) => {
      const pos = latLngToVec3(THREE, d.lat, d.lng, R * 1.005);
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      globe.add(pin);
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(pos);
      globe.add(halo);
    });

    // Soft lighting.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(-1.2, 1.0, 2.0);
    scene.add(dir);

    // First frame — if WebGL is unhappy it throws here and the caller keeps
    // the fallback. Reveal the canvas only after this succeeds.
    renderer.render(scene, camera);

    /* ── run loop + guards ────────────────────────────────────────────── */
    const clock = new THREE.Clock();
    let rafId = null;
    let inView = true;      // set by the pause observer
    let dragging = false;

    function frame() {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.1); // clamp to avoid a jump after any hitch
      if (!dragging) globe.rotation.y += dt * ROT_SPEED;
      renderer.render(scene, camera);
    }
    function running() { return inView && !document.hidden; }
    function start() {
      if (rafId != null || !running()) return;
      clock.getDelta();                 // flush elapsed time so it doesn't jump
      stage.classList.remove('is-paused');
      frame();
    }
    function stop() {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      stage.classList.add('is-paused'); // globe.js owns .is-paused on #globe-stage (enhance.js only pauses the CSS heroes)
    }

    // Off-screen pause (Req 5): stop rendering the instant the globe leaves the
    // viewport; resume when it returns.
    let pauseObs = null;
    if ('IntersectionObserver' in window) {
      pauseObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { inView = e.isIntersecting; });
        running() ? start() : stop();
      }, { rootMargin: '0px' });
      pauseObs.observe(stage);
    }
    // Also pause when the tab is hidden.
    const onVisibility = () => { running() ? start() : stop(); };
    document.addEventListener('visibilitychange', onVisibility);

    // Keep the buffer + aspect in sync with layout (cheap, infrequent).
    let resizeObs = null;
    const applySize = () => {
      const nw = stage.clientWidth, nh = stage.clientHeight;
      if (nw < 2 || nh < 2 || (nw === w && nh === h)) return;
      w = nw; h = nh;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      if (!running()) renderer.render(scene, camera); // repaint even while paused
    };
    if ('ResizeObserver' in window) {
      resizeObs = new ResizeObserver(applySize);
      resizeObs.observe(stage);
    } else {
      window.addEventListener('resize', applySize, { passive: true });
    }

    // Optional slow drag-to-spin (desktop pointer). touch-action:pan-y (CSS)
    // lets vertical page scroll pass through; only horizontal-ish drags spin.
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = clamp(globe.rotation.x + dy * 0.005, AXIAL_TILT - 0.6, AXIAL_TILT + 0.6);
    });
    const endDrag = () => { dragging = false; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);

    // Theme swap: re-tint materials when --accent flips (matches map-base's
    // setupThemeSwap intent). Cheap — fires only on data-theme changes.
    const themeObs = new MutationObserver(() => {
      const c = new THREE.Color(readAccent());
      baseMat.color.copy(c).multiplyScalar(0.18);
      baseMat.emissive.copy(c).multiplyScalar(0.06);
      wireMat.color.copy(c);
      pinMat.color.copy(c);
      haloMat.color.copy(c);
      if (!running()) renderer.render(scene, camera);
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Battery hygiene: hard-stop on pagehide.
    window.addEventListener('pagehide', stop, { once: true });

    // Reveal the live canvas (hides the fallback) now that we have a frame.
    stage.classList.add('globe-stage--live');
    start();

    return {
      dispose() {
        stop();
        if (pauseObs) pauseObs.disconnect();
        if (resizeObs) resizeObs.disconnect();
        themeObs.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) o.material.dispose();
        });
        renderer.dispose();
      }
    };
  }

  /* ── Boot: lazy-load three.js when the stage nears the viewport ────────────
        Mirrors map-base.js lazyBoot — IntersectionObserver primary, a scroll
        fallback for throttled IO, and a hard timeout so it never silently
        stalls. Boots at most once; any failure leaves the fallback intact. */
  function boot() {
    const stage = document.getElementById('globe-stage');
    if (!stage) return;
    const canvas = stage.querySelector('canvas');
    if (!canvas) return;

    let booted = false;
    let teardown = null;
    let handle = null;

    const go = () => {
      if (booted) return;
      booted = true;
      if (teardown) { teardown(); teardown = null; }
      loadThree()
        .then((THREE) => { handle = init(THREE, stage, canvas); }) // may return null → fallback stays
        .catch((err) => { console.warn('[globe] init skipped:', err && err.message); });
    };

    if (!('IntersectionObserver' in window)) { go(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.disconnect(); go(); } });
    }, { rootMargin: '600px 0px' }); // start ~1 viewport early so it's ready on arrival
    io.observe(stage);

    const onScroll = () => {
      if (booted) return;
      const r = stage.getBoundingClientRect();
      if (r.top < window.innerHeight + 600 && r.bottom > -600) go();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    teardown = () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
    onScroll();
    setTimeout(go, 30000); // hard safety net
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
