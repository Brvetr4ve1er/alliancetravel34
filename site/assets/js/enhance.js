/**
 * Alliance Travel — Site enhancements (merged v26)
 *
 * Single module covering everything that used to live in enhance.js +
 * enhance-pro.js. Merged 2026-05-28 to drop one HTTP request, share
 * the `reduced` / `isCoarse` matchMedia results, and surface every
 * init function in one boot.
 *
 *  Foundation layer
 *   - Theme switcher (data-theme="light" on <html>)
 *   - Service worker registration
 *
 *  v22 reveal + UX layer (legacy markup: .reveal / .reveal-stagger /
 *  [data-counter] / [data-aos])
 *   - Animated stat counters
 *   - Scroll-triggered reveals (staggered)
 *   - Share button (Web Share API + WhatsApp fallback)
 *   - Trip quick-switcher dropdown
 *   - Toast notifications
 *   - Smooth-scroll for anchor links
 *   - Subtle hero mouse parallax (desktop only)
 *   - Mobile nav drawer (display:contents at desktop)
 *
 *  v6 + v7 motion + industry layer ([data-fx] / [data-fx-stagger])
 *   - Single rAF scroll coordinator (replaces 4 separate listeners)
 *   - Auto-marked reveal targets
 *   - Hero scroll parallax (CSS var bound to scrollY)
 *   - Magnetic buttons + cursor spotlight (desktop only)
 *   - Scroll progress bar
 *   - Floating WhatsApp FAB
 *   - Trust strip under hero
 *   - Sticky inquiry bar (trip pages)
 *   - Lightbox photo gallery
 *   - Itinerary accordion (auto-converts .tl-day timeline)
 *   - Press / partner logo strip (homepage)
 *   - 3-icon value-prop row (homepage)
 *
 *  v21 phase C.3
 *   - Pause-off-screen IntersectionObserver — freezes ambient CSS
 *     keyframes outside the viewport per the Performance Contract
 *
 * Respects prefers-reduced-motion. Vanilla JS, no deps. Loaded with
 * defer so DOM is ready when boot() runs.
 */

(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia?.('(pointer: coarse)').matches;

  /* ─── Safe localStorage wrapper ──────────────────────────────────
     Safari private mode and some embedded webviews throw on setItem.
     Every call is a no-op on failure so the UI keeps working even if
     persistence isn't available. */
  const safeStorage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove(k) { try { localStorage.removeItem(k); return true; } catch (e) { return false; } }
  };

  /* ─── Single scroll coordinator (v21 phase F) ────────────────────
     All scroll-bound subscribers share one rAF-throttled window
     listener. Per the Performance Contract §0a item 3. */
  const scrollSubscribers = new Set();
  let scrollTicking = false;
  function dispatchScroll() {
    scrollTicking = false;
    const y = window.scrollY || window.pageYOffset || 0;
    scrollSubscribers.forEach((fn) => {
      try { fn(y); } catch (e) { /* one bad subscriber shouldn't break the frame */ }
    });
  }
  function onScrollY(fn) {
    scrollSubscribers.add(fn);
    fn(window.scrollY || 0);
  }
  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(dispatchScroll);
  }, { passive: true });

  /* ─── Tiny utilities ─────────────────────────────────── */
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ─── Theme switcher ────────────────── */
  function initThemeSwitcher() {
    const root = document.documentElement;
    const KEY = 'at-theme';

    // Initial: stored preference > system preference > dark
    const stored = safeStorage.get(KEY);
    const sysLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const initial = stored || (sysLight ? 'light' : 'dark');
    if (initial === 'light') root.setAttribute('data-theme', 'light');

    // a11y: aria-pressed='true' means the non-default (light) theme is active.
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', initial === 'light' ? 'true' : 'false');
      btn.addEventListener('click', () => {
        const isLight = root.getAttribute('data-theme') === 'light';
        if (isLight) {
          root.removeAttribute('data-theme');
          safeStorage.set(KEY, 'dark');
        } else {
          root.setAttribute('data-theme', 'light');
          safeStorage.set(KEY, 'light');
        }
        btn.setAttribute('aria-pressed', isLight ? 'false' : 'true');
      });
    });

    // React to system preference changes if user hasn't explicitly chosen
    if (!stored) {
      window.matchMedia?.('(prefers-color-scheme: light)')?.addEventListener?.('change', e => {
        if (safeStorage.get(KEY)) return;
        if (e.matches) root.setAttribute('data-theme', 'light');
        else root.removeAttribute('data-theme');
      });
    }
  }

  /* ─── Stat counters ────────────────────────────────────────
     On a fresh visit, animate 0 → target. Polished but feels repetitive
     on every reload (and slightly dishonest for "0.2K voyageurs"). Use
     sessionStorage to mark "already played"; subsequent counters in the
     same session just snap to final. */
  const COUNTER_PLAYED_KEY = 'at-counters-played';
  function _counterAlreadyPlayed() {
    try { return sessionStorage.getItem(COUNTER_PLAYED_KEY) === '1'; }
    catch (e) { return false; }
  }
  function _markCountersPlayed() {
    try { sessionStorage.setItem(COUNTER_PLAYED_KEY, '1'); }
    catch (e) { /* private mode / disabled storage */ }
  }

  function animateCounter(el) {
    if (reduced || _counterAlreadyPlayed()) {
      el.textContent = el.dataset.counterFormat
        ? el.dataset.counterFormat.replace('{n}', el.dataset.counter)
        : el.dataset.counter;
      return;
    }
    const target = parseFloat(el.dataset.counter);
    const format = el.dataset.counterFormat || '{n}';
    const dur    = parseInt(el.dataset.counterDuration || '1600');
    const start  = performance.now();

    function step(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = target * eased;
      let display;
      if (target >= 1000)      display = (cur / 1000).toFixed(cur >= target * 0.95 ? 1 : 1).replace('.0', '');
      else if (target >= 100)  display = Math.floor(cur);
      else                     display = (Math.round(cur * 10) / 10).toString().replace(/\.0$/, '');
      el.textContent = format.replace('{n}', display);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        _markCountersPlayed();
      }
    }
    requestAnimationFrame(step);
  }

  /* ─── Legacy reveal observer (v22) ──────────────────────────
     Handles .reveal / .reveal-stagger / [data-counter] / [data-aos]
     markup. AOS library was replaced 2026-05-22; this observer
     replicates AOS-compat reveal behaviour. */
  function initLegacyRevealObserver() {
    const els = document.querySelectorAll(
      '.reveal, .reveal-stagger > *, [data-counter], [data-aos]'
    );
    if (!els.length) return;

    if (reduced) {
      els.forEach(el => {
        el.classList.add('visible');
        if (el.hasAttribute('data-counter')) animateCounter(el);
      });
      return;
    }

    document.querySelectorAll('.reveal-stagger').forEach(parent => {
      [...parent.children].forEach((child, i) => {
        child.style.setProperty('--i', i);
        if (!child.classList.contains('reveal')) child.classList.add('reveal');
      });
    });

    els.forEach(el => {
      if (el.hasAttribute('data-aos')) {
        const delay = parseInt(el.getAttribute('data-aos-delay') || '0', 10);
        const dur   = parseInt(el.getAttribute('data-aos-duration') || '650', 10);
        if (delay) el.style.setProperty('--aos-delay', delay + 'ms');
        if (dur)   el.style.setProperty('--aos-duration', dur + 'ms');
      }
    });

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('visible');
        if (el.hasAttribute('data-counter')) animateCounter(el);
        obs.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => obs.observe(el));
  }

  /* ─── Toast notifications ─────────────────────────────────── */
  function showToast(msg, kind = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.className = `toast toast--${kind}`;
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>${msg}`;
    void toast.offsetWidth;   // force reflow so transition fires
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  /* ─── Share button on trip cards ──────────────────────────── */
  async function shareTrip(url, title, text) {
    if (navigator.share) {
      try { await navigator.share({ url, title, text }); return; } catch (e) { /* user cancel */ }
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(`${title}\n${text}\n${url}`)}`;
    window.open(wa, '_blank', 'noopener');
  }

  function initTripCardShares() {
    document.querySelectorAll('.trip-card').forEach(card => {
      if (card.querySelector('.trip-card__share')) return;
      const btn = document.createElement('button');
      btn.className = 'trip-card__share';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Partager ce voyage');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const title = card.querySelector('.trip-card__title')?.textContent.trim() || 'Voyage Alliance Travel';
        const flag  = card.querySelector('.trip-card__flag')?.textContent.trim() || '';
        const price = card.querySelector('.trip-card__from')?.textContent.replace(/\s+/g, ' ').trim() || '';
        const url   = new URL(card.getAttribute('href'), location.href).toString();
        shareTrip(url, `${title} — Alliance Travel`, `${flag}\n${price}`);
      });
      card.appendChild(btn);
    });
  }

  /* ─── Trip quick-switcher in nav ──────────────────────────── */
  const ALL_TRIPS = [
    { slug: 'egypte',       name: 'Égypte · Le Caire, Sharm & Hurghada', price: '169.000 DA', color: '#C9872E', sub: 'Égypte · 5 programmes 2026' },
    { slug: 'azerbaidjan',  name: 'Azerbaïdjan · Bakou & Gabala',        price: '249.900 DA', color: '#3AAFAF', sub: 'Juillet–Septembre 2026' },
    { slug: 'istanbul',     name: 'Istanbul',                            price: '129.000 DA', color: '#5B9EC9', sub: 'Septembre–Novembre 2026' },
    { slug: 'kuala-lumpur', name: 'Kuala Lumpur & Langkawi',             price: '370.000 DA', color: '#4CAF82', sub: 'Malaisie · Été 2026' },
    { slug: 'tunisie',      name: 'Tunisie · Hammamet, Sousse & Djerba', price: '36.000 DA',  color: '#19B5B0', sub: 'Été 2026' },
    { slug: 'bali',         name: 'Bali · Indonésie',                    price: '419.000 DA', color: '#D98E48', sub: 'Août–Septembre 2026' },
    { slug: 'vietnam',      name: 'Vietnam · Circuit',                   price: '439.000 DA', color: '#15A88E', sub: 'Août–Septembre 2026' },
  ];

  function initTripSwitcher() {
    const nav = document.querySelector('.site-nav');
    if (!nav || nav.querySelector('.trip-switcher')) return;

    const currentSlug = location.pathname.split('/').filter(Boolean).pop()?.replace('.html','') || '';
    const isHomepage = currentSlug === 'site' || currentSlug === '' || currentSlug === 'index';
    if (isHomepage) return;

    const wrap = document.createElement('div');
    wrap.className = 'trip-switcher';
    wrap.innerHTML = `
      <button class="trip-switcher__trigger" type="button" aria-haspopup="true" aria-expanded="false">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>Tous les voyages</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="trip-switcher__menu" role="menu">
        ${ALL_TRIPS.map(t => `
          <a class="trip-switcher__item ${t.slug === currentSlug ? 'current' : ''}"
             href="../${t.slug}/" role="menuitem">
            <span class="trip-switcher__item-flag" style="background:${t.color}"></span>
            <span class="trip-switcher__item-name">
              ${t.name}
              <span style="display:block;font-size:.6875rem;color:var(--txt-3);font-weight:400;letter-spacing:0;margin-top:1px">${t.sub}</span>
            </span>
            <span class="trip-switcher__item-price">dès ${t.price}</span>
          </a>`).join('')}
      </div>
    `;

    const cta = nav.querySelector('.nav-cta');
    if (cta) {
      nav.insertBefore(wrap, cta);
    } else {
      nav.appendChild(wrap);
    }

    const trigger = wrap.querySelector('.trip-switcher__trigger');
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('open');
      trigger.setAttribute('aria-expanded', wrap.classList.contains('open') ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        wrap.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ─── Smooth-scroll for anchor links ──────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  /* ─── Subtle parallax on hero based on mouse (desktop) ── */
  function initHeroMouseParallax() {
    if (reduced) return;
    const heroes = document.querySelectorAll('.hero__visual');
    if (!heroes.length || window.innerWidth < 1024) return;

    heroes.forEach(hero => {
      // Cache the art node once (was re-queried on every pointer move) and
      // read the hero rect on enter, not per-move, so the hot mousemove path
      // does no DOM query and no forced layout. Writes are coalesced into one
      // rAF tick — the transform itself is composited.
      const art = hero.querySelector('.hero__visual-art > svg');
      if (!art) return;
      let rect = null, raf = 0, px = 0, py = 0;

      hero.addEventListener('mouseenter', () => { rect = hero.getBoundingClientRect(); });
      hero.addEventListener('mousemove', (e) => {
        if (!rect) rect = hero.getBoundingClientRect();
        px = e.clientX; py = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const x = ((px - rect.left) / rect.width  - 0.5) * 8;
          const y = ((py - rect.top)  / rect.height - 0.5) * 8;
          art.style.transform = `translate(${-x}px, ${-y}px)`;
        });
      });
      hero.addEventListener('mouseleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        rect = null;
        art.style.transform = '';
      });
    });
  }

  /* ─── Mobile nav drawer ─────────────────────────────────────
     Builds the hamburger button + drawer panel + backdrop on first
     run, then moves the existing right-side controls (nav-links,
     lang-switcher, theme-toggle, nav-cta) into the drawer. The drawer
     wrapper has `display: contents` at desktop so the layout is
     identical to pre-drawer at ≥901px. */
  function initNavDrawer() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    // Wait one tick so i18n.js can finish building .lang-switcher first.
    if (!nav.querySelector('.lang-switcher')) {
      return setTimeout(initNavDrawer, 50);
    }

    /* ── 1. Hamburger button ── */
    let btn = nav.querySelector('.nav-hamburger');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'nav-hamburger';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Ouvrir le menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'nav-drawer');
      btn.innerHTML = `
        <svg class="icon-menu" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="3" y1="6"  x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <svg class="icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6"  x2="6"  y2="18"/>
          <line x1="6"  y1="6"  x2="18" y2="18"/>
        </svg>`;
      nav.appendChild(btn);
    }

    /* ── 2. Drawer container ── */
    let drawer = nav.querySelector('.nav-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'nav-drawer';
      drawer.id = 'nav-drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('aria-label', 'Menu de navigation');
      drawer.setAttribute('aria-hidden', 'true');

      // Move (not clone) right-side controls into the drawer so existing
      // event listeners (lang-switcher click, theme toggle, i18n bindings)
      // survive intact.
      ['.nav-links', '.lang-switcher', '.theme-toggle', '.nav-cta'].forEach((sel) => {
        const el = nav.querySelector(`:scope > ${sel}`);
        if (el) drawer.appendChild(el);
      });

      nav.appendChild(drawer);
    }

    /* ── 3. Backdrop overlay ── */
    let backdrop = document.querySelector('.nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    /* ── 4. Open / close ── */
    const setOpen = (open) => {
      nav.classList.toggle('nav-open', open);
      drawer.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-visible', open);
      document.body.classList.toggle('nav-scroll-lock', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');

      if (open) {
        const firstFocusable = drawer.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        requestAnimationFrame(() => firstFocusable?.focus({ preventScroll: true }));
      } else {
        btn.focus({ preventScroll: true });
      }
    };

    /* ── 5. Wire events ── */
    btn.addEventListener('click', () => setOpen(!nav.classList.contains('nav-open')));
    backdrop.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
        setOpen(false);
      }
    });

    // Auto-close when a nav link is tapped. Skip lang buttons + theme
    // toggle so users can switch language/theme without the drawer
    // disappearing.
    drawer.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (link && !link.closest('.lang-switcher, .theme-toggle')) {
        setTimeout(() => setOpen(false), 200);
      }
    });

    // If viewport widens past 900px while drawer is open, close it so
    // the desktop layout takes over cleanly.
    let resizeRaf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        if (window.innerWidth > 900 && nav.classList.contains('nav-open')) {
          setOpen(false);
        }
      });
    });
  }

  /* ─── Auto-apply [data-fx] reveal markers ─────────────────
     We don't want to edit every page's HTML, so we auto-tag
     candidate elements with sensible reveal animations. */
  function autoMarkReveals() {
    if (reduced) return;

    // NOTE: these grids drive the data-fx-stagger reveal. Some names below
    // (hotels-grid, branches-grid, programme-list, faq__list) match nothing —
    // those sections already reveal via AOS (data-aos), and `[data-fx-stagger]
    // > *` forces opacity:0 until the fx observer fires, so pointing these at
    // the real classes (.hotel-grid/.faq-list/...) would give AOS cards a
    // SECOND opacity-0 master and risk stuck-hidden content. Left as-is
    // intentionally; consolidating onto one reveal system is a separate task.
    const cardGroups = [
      '.trips-grid',
      '.hotels-grid',
      '.values-grid',
      '.branches-grid',
      '.programme-list',
      '.faq__list',
      '.inclus-grid'
    ];
    cardGroups.forEach(sel => {
      document.querySelectorAll(sel).forEach(grid => {
        if (grid.hasAttribute('data-fx-stagger')) return;
        grid.setAttribute('data-fx-stagger', '');
        Array.from(grid.children).forEach((child, i) => {
          child.style.setProperty('--d', i);
        });
      });
    });

    // Section bodies (non-hero) — gentle rise.
    const sectionSelectors = 'main > section, body > section';
    document.querySelectorAll(sectionSelectors).forEach((sec) => {
      if (sec.hasAttribute('data-fx')) return;
      if (sec.classList.contains('home-hero') || sec.classList.contains('hero')) return;
      sec.setAttribute('data-fx', 'up');
    });

    // Big visuals fade in once loaded
    document.querySelectorAll('.trip-card img, .hotel-card img, .site-card img').forEach(img => {
      if (img.classList.contains('fx-img')) return;
      img.classList.add('fx-img');
      const markLoaded = () => img.classList.add('loaded');
      if (img.complete && img.naturalWidth > 0) {
        markLoaded();
      } else {
        img.addEventListener('load', markLoaded, { once: true });
        img.addEventListener('error', markLoaded, { once: true });
      }
    });
  }

  /* ─── FX reveal observer for [data-fx], [data-fx-stagger],
         .section-head, section dividers ── */
  function initFxRevealObserver() {
    if (reduced) {
      document.querySelectorAll('[data-fx], [data-fx-stagger], .section-head').forEach(el => {
        el.classList.add('is-in');
      });
      return;
    }

    const targets = document.querySelectorAll('[data-fx], [data-fx-stagger], .section-head, section + section');
    if (!targets.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-in');
        el.querySelectorAll?.('[data-counter]').forEach(c => c.classList.add('is-in'));
        if (el.hasAttribute('data-fx') || el.hasAttribute('data-fx-stagger') || el.classList.contains('section-head') || el.matches('section + section')) {
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(el => obs.observe(el));
  }

  /* ─── Hero parallax: bind scrollY → CSS var on document ─── */
  function initScrollParallax() {
    if (reduced) return;
    onScrollY((y) => {
      const clamped = Math.min(y, window.innerHeight);
      document.documentElement.style.setProperty('--scroll-y', clamped);

      const collage = document.querySelector('.home-hero__photos');
      if (collage) {
        collage.style.transform = `translate3d(0, ${clamped * 0.08}px, 0) scale(${1 + clamped * 0.00015})`;
      }
    });
  }

  /* ─── Magnetic buttons (desktop only) ───────────────────── */
  function initMagneticButtons() {
    if (reduced || isCoarse) return;
    const selectors = '.btn--primary, .btn--ghost, .nav-cta, .calc-cta';
    const STRENGTH = 8;
    const RADIUS = 1.25;

    document.querySelectorAll(selectors).forEach(btn => {
      if (btn.dataset.magnetized === '1') return;
      btn.dataset.magnetized = '1';

      // Read the rect once on enter (was getBoundingClientRect() on every move
      // → forced layout per pointer move) and coalesce the four CSS-var writes
      // into a single rAF tick. The vars feed a composited transform.
      let r = null, raf = 0, px = 0, py = 0;
      const onEnter = () => { r = btn.getBoundingClientRect(); };
      const onMove = (e) => {
        if (!r) r = btn.getBoundingClientRect();
        px = e.clientX; py = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = (px - cx) / (r.width  * RADIUS);
          const dy = (py - cy) / (r.height * RADIUS);
          btn.style.setProperty('--mx', `${dx * STRENGTH}px`);
          btn.style.setProperty('--my', `${dy * STRENGTH}px`);
          const lx = ((px - r.left) / r.width) * 100;
          const ly = ((py - r.top) / r.height) * 100;
          btn.style.setProperty('--gx', `${lx}%`);
          btn.style.setProperty('--gy', `${ly}%`);
        });
      };
      const onLeave = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        r = null;
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      };
      btn.addEventListener('mouseenter', onEnter);
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
    });
  }

  /* ─── Scroll progress bar ─────────────────────────────── */
  function initScrollProgress() {
    if (document.querySelector('.scroll-progress')) return;
    const wrap = document.createElement('div');
    wrap.className = 'scroll-progress';
    wrap.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'scroll-progress__fill';
    wrap.appendChild(fill);
    document.body.appendChild(wrap);

    onScrollY((y) => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      const pct = Math.min(100, Math.max(0, (y / max) * 100));
      fill.style.setProperty('--p', `${pct}%`);
    });
  }

  /* ─── Floating WhatsApp FAB ────────────────────────────── */
  function initWhatsAppFAB() {
    if (document.querySelector('.fab-whatsapp')) return;
    const navCta = document.querySelector('a.nav-cta[href*="wa.me"]');
    const href = navCta ? navCta.getAttribute('href') : 'https://wa.me/213561616266';

    const fab = document.createElement('a');
    fab.className = 'fab-whatsapp';
    fab.href = href;
    fab.target = '_blank';
    fab.rel = 'noopener';
    fab.setAttribute('aria-label', 'Discuter sur WhatsApp');
    fab.title = 'Discuter sur WhatsApp';
    fab.innerHTML = `
      <span class="fab-whatsapp__tooltip">Une question ? Écrivez-nous</span>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>`;
    document.body.appendChild(fab);

    const threshold = () => window.innerHeight * 0.7;
    let visible = false;
    let tooltipShown = false;
    onScrollY((y) => {
      const should = y > threshold();
      if (should !== visible) {
        visible = should;
        fab.classList.toggle('is-visible', visible);
        if (visible && !tooltipShown) {
          tooltipShown = true;
          setTimeout(() => {
            fab.classList.add('tooltip-shown');
            setTimeout(() => fab.classList.remove('tooltip-shown'), 4200);
          }, 600);
        }
      }
    });
  }

  /* ─── Trust strip under the hero ─── */
  function initTrustStrip() {
    if (document.querySelector('.trust-strip')) return;
    const hero = document.querySelector('.home-hero, .hero');
    if (!hero) return;

    const strip = document.createElement('div');
    strip.className = 'trust-strip';
    strip.setAttribute('aria-label', 'Indicateurs de confiance');
    strip.setAttribute('data-i18n-aria-label', 'trust_strip.aria');
    strip.innerHTML = `
      <div class="trust-strip__item" title="Note moyenne sur 320 avis vérifiés">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span data-i18n-html="trust_strip.rating"><strong>4,9 / 5</strong> · 320 voyageurs</span>
      </div>
      <div class="trust-strip__sep" aria-hidden="true"></div>
      <div class="trust-strip__item" title="Agence créée en 2019">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>
        <span data-i18n-html="trust_strip.experience"><strong>7+ ans</strong> d'expérience</span>
      </div>
      <div class="trust-strip__sep" aria-hidden="true"></div>
      <div class="trust-strip__item" title="Vol, hôtel et excursions inclus">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        <span data-i18n-html="trust_strip.all_inclusive"><strong>Tout inclus</strong> — vol, hôtel, excursions</span>
      </div>
      <div class="trust-strip__sep" aria-hidden="true"></div>
      <div class="trust-strip__item" title="Annulation flexible jusqu'à 30 jours">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>
        <span data-i18n-html="trust_strip.flexible"><strong>Annulation flexible</strong></span>
      </div>
    `;
    hero.insertAdjacentElement('afterend', strip);
    if (window.alTranslate) window.alTranslate();
  }

  /* ─── Sticky inquiry bar (trip pages only) ─── */
  function initStickyInquiryBar() {
    if (!document.body.dataset.region) return;
    if (document.querySelector('.trip-sticky-bar')) return;

    const fullTitle = document.title || 'Voyage';
    const tripName = fullTitle.split(/\s[—··]\s/)[0].trim();

    const meta = document.querySelector('.hero__sub, .hero__lede, .hero__meta')?.textContent?.trim()?.slice(0, 60) || '';

    const priceFromAttr = document.querySelector('[data-price-from]')?.dataset?.priceFrom;
    const heroPriceStrong = document.querySelector('.hero__price strong');
    const priceFromNum = document.querySelector('.price-from__num');
    const priceText = priceFromAttr
      || heroPriceStrong?.textContent?.trim()
      || priceFromNum?.textContent?.trim()
      || '';

    const navCta = document.querySelector('a.nav-cta[href*="wa.me"]');
    const waHref = navCta ? navCta.getAttribute('href') : 'https://wa.me/213561616266';

    const bar = document.createElement('div');
    bar.className = 'trip-sticky-bar';
    bar.setAttribute('role', 'complementary');
    bar.setAttribute('aria-label', 'Demande de devis rapide');
    bar.innerHTML = `
      <div class="trip-sticky-bar__info">
        <div class="trip-sticky-bar__name">${escapeHtml(tripName)}</div>
        ${meta ? `<div class="trip-sticky-bar__meta">${escapeHtml(meta)}</div>` : ''}
      </div>
      ${priceText ? `
      <div class="trip-sticky-bar__price">
        <span class="trip-sticky-bar__price-from">À partir de</span>
        <span class="trip-sticky-bar__price-num">${escapeHtml(priceText)}</span>
      </div>` : ''}
      <a class="trip-sticky-bar__cta" href="${escapeHtml(waHref)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
        Demander un devis
      </a>
    `;
    document.body.appendChild(bar);

    const threshold = () => Math.min(window.innerHeight * 0.85, 600);
    let visible = false;
    onScrollY((y) => {
      const should = y > threshold();
      if (should !== visible) {
        visible = should;
        bar.classList.toggle('is-visible', visible);
        document.body.classList.toggle('has-sticky-bar', visible);
      }
    });
  }

  /* ─── Lightbox photo gallery ────────────────────────────── */
  function initLightbox() {
    if (document.querySelector('.lightbox')) return;

    const targets = Array.from(
      document.querySelectorAll(
        '.hotel-card img, .site-card img, img[data-lightbox], .gallery img'
      )
    );
    if (!targets.length) return;

    targets.forEach(img => img.classList.add('lb-target'));

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Galerie de photos');
    lb.innerHTML = `
      <span class="lightbox__counter" aria-live="polite"></span>
      <button class="lightbox__close" type="button" aria-label="Fermer la galerie">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Photo précédente">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <img class="lightbox__img" alt=""/>
      <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Photo suivante">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <span class="lightbox__caption"></span>
    `;
    document.body.appendChild(lb);

    const lbImg = lb.querySelector('.lightbox__img');
    const lbCaption = lb.querySelector('.lightbox__caption');
    const lbCounter = lb.querySelector('.lightbox__counter');
    const btnClose = lb.querySelector('.lightbox__close');
    const btnPrev = lb.querySelector('.lightbox__nav--prev');
    const btnNext = lb.querySelector('.lightbox__nav--next');

    let idx = 0;
    const show = (i) => {
      idx = (i + targets.length) % targets.length;
      const img = targets[idx];
      lbImg.src = img.src;
      lbImg.alt = img.alt || '';
      const caption = img.alt || img.dataset.caption || '';
      lbCaption.textContent = caption;
      lbCaption.style.display = caption ? '' : 'none';
      lbCounter.textContent = `${idx + 1} / ${targets.length}`;
    };

    let lastTrigger = null;
    const open = (i, trigger) => {
      lastTrigger = trigger || document.activeElement;
      show(i);
      lb.classList.add('is-open');
      document.documentElement.dataset.scrollLock = '1';
      btnClose.focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('is-open');
      delete document.documentElement.dataset.scrollLock;
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    };

    targets.forEach((img, i) => {
      const link = img.closest('a');
      const skipForLink = link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#');
      if (skipForLink) return;

      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', img.alt ? `Voir ${img.alt} en grand` : 'Voir en grand');
      img.addEventListener('click', (e) => {
        e.preventDefault();
        open(i, img);
      });
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(i, img);
        }
      });
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(idx - 1));
    btnNext.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ─── Itinerary accordion — convert .tl-day list to <details> ─── */
  function initItineraryAccordion() {
    /* v28 guard: the spine timeline keeps rich markup (tags/i18n keys/photos).
       Rebuilding it from textContent would strip all of that. Migrated pages
       carry .timeline--spine — bail so they keep their markup; un-migrated
       pages still get the <details> accordion below. */
    if (document.querySelector('.timeline--spine')) return;
    const days = document.querySelectorAll('.tl-day, .timeline-day');
    if (!days.length) return;
    if (document.querySelector('[data-accordion]')) return;

    days.forEach((day, i) => {
      const node = day.querySelector('.tl-node, .day-num')?.textContent?.trim() || `J${i + 1}`;
      const title = day.querySelector('.tl-title, .day-title')?.textContent?.trim() || `Jour ${i + 1}`;
      const dayLabel = day.querySelector('.tl-day-label, .day-label')?.textContent?.trim() || '';
      const activities = day.querySelector('.tl-activities, .day-activities')?.textContent?.trim() || '';

      const details = document.createElement('details');
      details.setAttribute('data-accordion', '');
      if (i === 0) details.open = true;

      details.innerHTML = `
        <summary>
          <span class="acc-day-num">${escapeHtml(node)}</span>
          <span class="acc-title">${escapeHtml(title)}</span>
        </summary>
        ${activities || dayLabel ? `<div class="acc-body">${dayLabel ? `<p style="opacity:.7;font-size:.8125rem;margin-bottom:6px">${escapeHtml(dayLabel)}</p>` : ''}<p>${escapeHtml(activities)}</p></div>` : ''}
      `;
      day.replaceWith(details);
    });
  }

  /* ─── Press / partner logo strip — homepage only ─── */
  function initPressStrip() {
    if (document.body.dataset.region) return;
    if (document.querySelector('.press-strip')) return;

    const footer = document.querySelector('footer.site-footer');
    if (!footer) return;

    const strip = document.createElement('section');
    strip.className = 'press-strip';
    strip.setAttribute('aria-label', 'Nos engagements');
    strip.setAttribute('data-i18n-aria-label', 'press_strip.aria');
    /* HONEST trust strip — replaces the previous "vu dans la presse"
       version which listed media outlets without a confirmed press
       relationship. Replace these labels with whatever the agency can
       actually defend (registration numbers, certifications, etc.). */
    strip.innerHTML = `
      <p class="press-strip__label" data-i18n="press_strip.label">Nos engagements</p>
      <div class="press-strip__items">
        <span class="press-strip__item" data-i18n="press_strip.item_licensed">Agence agréée Bordj Bou Arreridj</span>
        <span class="press-strip__item" data-i18n="press_strip.item_included">Vol &amp; hôtel inclus</span>
        <span class="press-strip__item" data-i18n="press_strip.item_visa">Visa accompagné</span>
        <span class="press-strip__item" data-i18n="press_strip.item_groups">Petits groupes (12 max)</span>
        <span class="press-strip__item" data-i18n="press_strip.item_payment">Paiement à la confirmation</span>
      </div>
    `;
    footer.insertAdjacentElement('beforebegin', strip);
    if (window.alTranslate) window.alTranslate();
  }

  /* ─── 3-icon value-prop row — homepage, after trips grid ─── */
  function initValueProps() {
    if (document.body.dataset.region) return;
    if (document.querySelector('.value-props-3')) return;

    const target = document.getElementById('agence') || document.querySelector('section[aria-label*="histoire" i]');
    if (!target) return;

    const wrap = document.createElement('section');
    wrap.className = 'value-props-3';
    wrap.setAttribute('aria-label', 'Pourquoi Alliance Travel');
    wrap.setAttribute('data-i18n-aria-label', 'value_props.aria');
    wrap.innerHTML = `
      <div class="value-prop">
        <div class="value-prop__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <h3 class="value-prop__title" data-i18n="value_props.guides_title">Guides francophones locaux</h3>
        <p class="value-prop__text" data-i18n="value_props.guides_text">Des accompagnateurs qui parlent votre langue et connaissent chaque destination par cœur.</p>
      </div>
      <div class="value-prop">
        <div class="value-prop__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 class="value-prop__title" data-i18n="value_props.included_title">Vol, hôtel & visa inclus</h3>
        <p class="value-prop__text" data-i18n="value_props.included_text">Tout est cadré à l'avance — vous payez un prix tout compris, sans mauvaise surprise.</p>
      </div>
      <div class="value-prop">
        <div class="value-prop__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3 class="value-prop__title" data-i18n="value_props.groups_title">Groupes de 12 maximum</h3>
        <p class="value-prop__text" data-i18n="value_props.groups_text">Petits groupes pour une expérience humaine et personnalisée à chaque étape.</p>
      </div>
    `;
    target.insertAdjacentElement('beforebegin', wrap);
    if (window.alTranslate) window.alTranslate();
  }

  /* ─── Pause-off-screen IntersectionObserver (v21 phase C.3) ───
     CSS keyframes still tick when off-screen — the browser doesn't
     auto-pause them. On low-end devices this consumed up to 8 ms/frame
     for nothing. Pause via .is-paused class + CSS rule:
       .is-paused, .is-paused * { animation-play-state: paused !important; } */
  function initPauseOffScreen() {
    if (!('IntersectionObserver' in window)) return;

    const hosts = new Set();
    /* v28: #alliance-globe removed — globe.js solely owns its pause via
       .is-paused on #globe-stage. Toggling .is-paused on the canvas here
       conflicted with that ownership and caused the globe to be born hidden. */
    document.querySelectorAll(
      '.home-hero, .hero, [data-pause-off-screen]'
    ).forEach(el => hosts.add(el));

    if (!hosts.size) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const offScreen = !entry.isIntersecting;
        entry.target.classList.toggle('is-paused', offScreen);
      });
    }, { rootMargin: '120px 0px' });

    hosts.forEach((el) => obs.observe(el));
  }

  /* ─── Boot ───────────────────────────────────────────────── */
  function boot() {
    // Foundation
    initThemeSwitcher();

    // v22 reveal + UX layer
    initLegacyRevealObserver();
    initTripCardShares();
    initTripSwitcher();
    initSmoothScroll();
    initHeroMouseParallax();
    initNavDrawer();

    // v6 + v7 motion + industry layer
    autoMarkReveals();
    initFxRevealObserver();
    initScrollParallax();
    initMagneticButtons();
    initScrollProgress();
    initWhatsAppFAB();
    initTrustStrip();
    initStickyInquiryBar();
    initLightbox();
    initItineraryAccordion();
    initPressStrip();
    initValueProps();

    // v21 phase C.3 — pause ambient loops off-screen
    initPauseOffScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Export toast for other scripts
  window.AT_showToast = showToast;
})();

/* ─── Service worker registration ───────────────────────────────
   Stale-while-revalidate cache for fonts/images/CSS so repeat visits
   load near-instantly and the site is browsable offline. Skipped on
   localhost (avoids cache surprises in dev) AND when served from
   file:// (no SW context). */
if ('serviceWorker' in navigator
    && location.protocol === 'https:'
    && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* fail silent */});
  });
}
