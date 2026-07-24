/**
 * Alliance Travel — anime.js polish layer (lazy, reduced-motion-aware)
 *
 * A thin choreography layer over the motion hooks already baked into the
 * markup + CSS. It NEVER runs under prefers-reduced-motion and NEVER
 * duplicates enhance.js: it only enriches a few one-shot moments and
 * degrades cleanly to the CSS baseline if anime.js is blocked/absent.
 *
 * Design mirrors site/assets/js/map-base.js:
 *   - anime.js is loaded lazily from cdn.jsdelivr.net with a pinned
 *     version, a REAL sha384 SRI hash and crossOrigin="anonymous".
 *   - the CDN fetch only fires when a section that uses it nears the
 *     viewport (IntersectionObserver + rootMargin) or on first CTA hover.
 *   - any load/parse failure is swallowed so the static CSS baseline holds.
 *
 * Choreographed moments (tasteful, one-shot, never looping):
 *   a. Stat count-up on trip-page trust cards (.stat-card__num) — enhance.js
 *      only counts [data-counter] nodes (homepage .value-card__num); the
 *      trip .stat-card__num are plain text, so this owns them exclusively.
 *   b. Staggered icon pop (.stat-card__icon / .value-card__icon) + a
 *      staggered tick reveal (.inclus-check, respecting --tick-i order),
 *      taking over the CSS baseline via inline styles (no double-animation).
 *   c. Subtle one-shot icon pulse on hover of the primary CTAs.
 *
 * RTL-safe: only scale / translateY / opacity are animated — no directional
 * (translateX / left / right) motion that would invert under dir="rtl".
 */
(() => {
  'use strict';

  /* 1. Reduced-motion FIRST — do nothing, never even fetch anime.js.
        The CSS baseline already shows every hook statically. */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* 2. Lazy, idempotent CDN loader with a REAL SRI hash + crossorigin.
        Hash computed from the byte-identical npm file:
          animejs@3.2.2/lib/anime.min.js  (17384 bytes)
        UMD global is `window.anime`. */
  const CDN = 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js';
  const SRI = 'sha384-oLmuahJgYYR1aWgZwdMQQ2AClE6A2eEwV2x1Z7cbIHehfkkmommQLH3wX1NDEszb';

  let animePromise = null;
  function ensureAnime() {
    if (window.anime) return Promise.resolve(window.anime);
    if (animePromise) return animePromise;
    animePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-anime-lib]');
      if (existing) {
        existing.addEventListener('load', () => window.anime ? resolve(window.anime) : reject(new Error('anime global missing')));
        existing.addEventListener('error', () => reject(new Error('anime.js failed to load')));
        return;
      }
      const s = document.createElement('script');
      s.src = CDN;
      s.integrity = SRI;
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.setAttribute('data-anime-lib', '');
      s.onload = () => window.anime ? resolve(window.anime) : reject(new Error('anime global missing'));
      s.onerror = () => reject(new Error('anime.js failed to load'));
      document.head.appendChild(s);
    });
    return animePromise;
  }

  /* Run `fn(anime)` once the library is present; swallow any failure so a
     blocked CDN leaves the CSS baseline untouched (graceful degradation). */
  function withAnime(fn) {
    ensureAnime().then((anime) => {
      try { fn(anime); } catch (e) { /* never break the page */ }
    }).catch(() => { /* baseline stays intact */ });
  }

  /* ── a. Stat count-up (trip pages) ─────────────────────────────────
     Parses "1.2K+", "98%", "11", "5" → animates the numeric part 0→final
     while preserving any prefix / decimal separator / suffix. Guarded to
     `.stat-card__num:not([data-counter])` so it never fights enhance.js's
     own [data-counter] animator (which owns the homepage value cards). */
  function parseStat(text) {
    const m = String(text).trim().match(/^(\D*?)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m) return null;
    const raw = m[2];
    const sep = raw.indexOf(',') !== -1 ? ',' : '.';
    const value = parseFloat(raw.replace(',', '.'));
    const decimals = /[.,]/.test(raw) ? raw.split(/[.,]/)[1].length : 0;
    return { prefix: m[1], value, decimals, sep, suffix: m[3] };
  }

  function countUpStats(anime, section) {
    section.querySelectorAll('.stat-card__num:not([data-counter])').forEach((el) => {
      if (el.dataset.animCount) return;
      const p = parseStat(el.textContent);
      if (!p || !isFinite(p.value)) return;   // leave non-numeric values alone
      el.dataset.animCount = '1';
      const fmt = (v) => p.prefix + v.toFixed(p.decimals).replace('.', p.sep) + p.suffix;
      const state = { v: 0 };
      el.textContent = fmt(0);
      anime({
        targets: state,
        v: p.value,
        duration: 1500,
        easing: 'easeOutCubic',
        update: () => { el.textContent = fmt(state.v); }
      });
    });
  }

  /* ── b1. Icon pop (.stat-card__icon / .value-card__icon) ───────────
     Secondary staggered pop on top of the card's own data-aos reveal.
     Transform-only (scale + translateY): inline styles are cleared on
     complete so the CSS :hover micro-motion keeps working afterwards. */
  function popIcons(anime, nodeList) {
    const icons = Array.prototype.filter.call(nodeList, (el) => !el.dataset.animPop);
    if (!icons.length) return;
    icons.forEach((el) => { el.dataset.animPop = '1'; el.style.transition = 'none'; });
    anime({
      targets: icons,
      scale: [0.55, 1],
      translateY: [10, 0],
      duration: 620,
      delay: anime.stagger(85),
      easing: 'easeOutBack',
      complete: () => {
        icons.forEach((el) => { el.style.transform = ''; el.style.transition = ''; });
      }
    });
  }

  /* ── b2. Inclus tick reveal (.inclus-check) ────────────────────────
     Takes over the CSS baseline by driving opacity/scale inline (inline
     wins over the stylesheet), so the two never double-animate. If the
     baseline already revealed the ticks (anime loaded late), we bail and
     leave them as-is. Stagger follows DOM order == the --tick-i order. */
  function playTicks(anime, col) {
    if (col.dataset.animTick) return;
    const checks = Array.prototype.slice.call(col.querySelectorAll('.inclus-check'));
    if (!checks.length) { col.dataset.animTick = '1'; return; }
    const shown = parseFloat(getComputedStyle(checks[0]).opacity || '0') > 0.85;
    if (shown && col.classList.contains('visible')) { col.dataset.animTick = '1'; return; }
    col.dataset.animTick = '1';
    checks.forEach((c) => { c.style.transition = 'none'; c.style.opacity = '0'; c.style.transform = 'scale(0.4)'; });
    anime({
      targets: checks,
      opacity: [0, 1],
      scale: [0.4, 1],
      duration: 520,
      delay: anime.stagger(55),
      easing: 'easeOutBack'
    });
  }

  /* ── Reveal wiring ─────────────────────────────────────────────────
     Preloader warms anime.js ~500px early; the player fires at the same
     ~0.15 threshold enhance.js uses so motion is synced to the section
     actually appearing. Never fetches anime.js unless a target nears view. */
  function initReveals() {
    const IO = window.IntersectionObserver;
    const stats  = document.querySelectorAll('.stats-grid');
    const values = document.querySelectorAll('.values-grid');
    const cols   = document.querySelectorAll('.inclus-col');
    if (!stats.length && !values.length && !cols.length) return;

    const playOne = (anime, el) => {
      if (el.matches('.stats-grid')) {
        countUpStats(anime, el);
        popIcons(anime, el.querySelectorAll('.stat-card__icon'));
      } else if (el.matches('.values-grid')) {
        popIcons(anime, el.querySelectorAll('.value-card__icon'));
      } else if (el.matches('.inclus-col')) {
        playTicks(anime, el);
      }
    };

    if (!IO) {
      // No IntersectionObserver: run once (still gated by reduced-motion).
      withAnime((anime) => {
        stats.forEach((el) => playOne(anime, el));
        values.forEach((el) => playOne(anime, el));
        cols.forEach((el) => playOne(anime, el));
      });
      return;
    }

    // Preloader — warm the library before it is needed.
    const preload = new IO((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        preload.disconnect();
        ensureAnime().catch(() => {});
      }
    }, { rootMargin: '500px 0px' });
    stats.forEach((el) => preload.observe(el));
    values.forEach((el) => preload.observe(el));
    cols.forEach((el) => preload.observe(el));

    // Player — choreograph when the section reveals.
    const player = new IO((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        player.unobserve(el);
        withAnime((anime) => playOne(anime, el));
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    stats.forEach((el) => player.observe(el));
    values.forEach((el) => player.observe(el));
    cols.forEach((el) => player.observe(el));
  }

  /* ── c. Primary CTA hover nudge ────────────────────────────────────
     Delegated (mouseover/mouseout emulate enter/leave) so it also covers
     CTAs that enhance.js injects later (FAB, sticky bar). Animates the
     CTA's icon only — never the magnetized button transform — with a
     subtle non-directional scale/translateY pulse. One-shot per hover. */
  function initCtaNudge() {
    const SEL = '.nav-cta, #sticky-cta-btn, .trip-sticky-bar__cta, .fab-whatsapp, .btn--primary';
    document.addEventListener('mouseover', (e) => {
      const cta = e.target.closest && e.target.closest(SEL);
      if (!cta || cta.dataset.animHover === '1') return;
      const icon = cta.querySelector('svg');
      if (!icon) return;                  // text-only CTA → nothing to nudge
      cta.dataset.animHover = '1';        // gate until pointer leaves
      withAnime((anime) => {
        anime.remove(icon);
        icon.style.transformOrigin = 'center';
        anime({
          targets: icon,
          scale: [1, 1.16, 1],
          translateY: [0, -2, 0],
          duration: 460,
          easing: 'easeOutQuad',
          complete: () => { icon.style.transform = ''; }
        });
      });
    }, { passive: true });
    document.addEventListener('mouseout', (e) => {
      const cta = e.target.closest && e.target.closest(SEL);
      if (cta && !cta.contains(e.relatedTarget)) cta.dataset.animHover = '';
    }, { passive: true });
  }

  /* ── Boot ──────────────────────────────────────────────────────── */
  function boot() {
    initReveals();
    initCtaNudge();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
