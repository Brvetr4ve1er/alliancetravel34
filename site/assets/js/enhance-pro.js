/**
 * Alliance Travel — Pro motion + industry layer (v6 + v7)
 * Adds the framer-motion-style polish on top of enhance.js:
 *  v6:
 *  - Scroll-linked hero parallax
 *  - Auto-applied scroll reveals via [data-fx] / [data-fx-stagger]
 *  - Magnetic buttons / cursor spotlight
 *  - Scroll progress bar
 *  - Floating WhatsApp FAB
 *  - Image fade-in on load
 *  v7 (industry-pattern layer — synthesized from the leading travel sites):
 *  - Trust strip directly under hero (review score / experience / certifications)
 *  - Sticky inquiry bar on trip pages (slides in after hero scroll)
 *  - Lightbox photo gallery (auto-attached to hotel + site images)
 *  - Itinerary accordion (auto-converts existing .tl-day timeline)
 *  - FAB tooltip on first scroll
 *  - Press / partner logo strip (greyscale → color on hover)
 *  - 3-icon value-prop row (homepage / before destinations)
 *
 * Vanilla JS, zero deps. Respects prefers-reduced-motion.
 * Loaded AFTER enhance.js so existing handlers stay authoritative.
 */

(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia?.('(pointer: coarse)').matches;
  const isNarrow = () => window.innerWidth < 768;

  /* ─── 1. Auto-apply [data-fx] reveal markers ─────────────────
     We don't want to edit every page's HTML, so we auto-tag
     candidate elements with sensible reveal animations.
  */
  function autoMarkReveals() {
    if (reduced) return;

    // Section heads: fade up
    document.querySelectorAll('.section-head').forEach(el => {
      // Section-head uses its own class-based animation (.is-in)
      // but we also observe it like a normal target
    });

    // Trip cards / hotel cards / value cards / branch cards: rise + stagger
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
    // Match both `main > section` and direct `body > section` (some pages
    // don't have a <main> wrapper — handled here so we cover all 6 pages).
    const sectionSelectors = 'main > section, body > section';
    document.querySelectorAll(sectionSelectors).forEach((sec) => {
      if (sec.hasAttribute('data-fx')) return;
      // Skip the hero — its own intro animation handles that
      if (sec.classList.contains('home-hero') || sec.classList.contains('hero')) return;
      sec.setAttribute('data-fx', 'up');
    });

    // Big visuals (hotel-card images, trip-card images): fade in once loaded
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

  /* ─── 2. Reveal observer for [data-fx], [data-fx-stagger], .section-head, section dividers ── */
  function initRevealObserver() {
    if (reduced) {
      // Make everything visible immediately
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
        // Counter punch when number reveals
        el.querySelectorAll?.('[data-counter]').forEach(c => c.classList.add('is-in'));
        // Once-only: stop observing
        if (el.hasAttribute('data-fx') || el.hasAttribute('data-fx-stagger') || el.classList.contains('section-head') || el.matches('section + section')) {
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(el => obs.observe(el));
  }

  /* ─── 3. Hero parallax: bind scrollY → CSS var on document ─── */
  function initScrollParallax() {
    if (reduced) return;
    let ticking = false;
    const update = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      // Only meaningful while hero is in view (first 100vh)
      const max = window.innerHeight;
      const clamped = Math.min(y, max);
      document.documentElement.style.setProperty('--scroll-y', clamped);

      // Photo collage on homepage: small counter-shift for depth
      const collage = document.querySelector('.home-hero__photos');
      if (collage) {
        collage.style.transform = `translate3d(0, ${clamped * 0.08}px, 0) scale(${1 + clamped * 0.00015})`;
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ─── 4. Magnetic buttons (desktop only) ─────────────────────
     Tracks mouse over .btn / .nav-cta and pushes the element
     a few px toward the cursor for a premium tactile feel.
  */
  function initMagneticButtons() {
    if (reduced || isCoarse) return;
    const selectors = '.btn--primary, .btn--ghost, .nav-cta, .calc-cta';
    const STRENGTH = 8; // max px translate
    const RADIUS = 1.25;

    document.querySelectorAll(selectors).forEach(btn => {
      if (btn.dataset.magnetized === '1') return;
      btn.dataset.magnetized = '1';

      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) / (r.width  * RADIUS);
        const dy = (e.clientY - cy) / (r.height * RADIUS);
        btn.style.setProperty('--mx', `${dx * STRENGTH}px`);
        btn.style.setProperty('--my', `${dy * STRENGTH}px`);
        // Spotlight position for primary buttons
        const lx = ((e.clientX - r.left) / r.width) * 100;
        const ly = ((e.clientY - r.top) / r.height) * 100;
        btn.style.setProperty('--gx', `${lx}%`);
        btn.style.setProperty('--gy', `${ly}%`);
      };
      const onLeave = () => {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
    });
  }

  /* ─── 5. Scroll progress bar ─────────────────────────────── */
  function initScrollProgress() {
    if (document.querySelector('.scroll-progress')) return;
    const wrap = document.createElement('div');
    wrap.className = 'scroll-progress';
    wrap.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('div');
    fill.className = 'scroll-progress__fill';
    wrap.appendChild(fill);
    document.body.appendChild(wrap);

    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      fill.style.setProperty('--p', `${pct}%`);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ─── 6. Floating WhatsApp FAB ────────────────────────────── */
  function initWhatsAppFAB() {
    if (document.querySelector('.fab-whatsapp')) return;
    // Pull the canonical phone from any existing nav-cta if present
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

    // Show after the first hero (~70vh)
    const threshold = () => window.innerHeight * 0.7;
    let visible = false;
    let tooltipShown = false;
    const update = () => {
      const should = window.scrollY > threshold();
      if (should !== visible) {
        visible = should;
        fab.classList.toggle('is-visible', visible);
        // Show tooltip on first appearance, auto-hide after 4s
        if (visible && !tooltipShown) {
          tooltipShown = true;
          setTimeout(() => {
            fab.classList.add('tooltip-shown');
            setTimeout(() => fab.classList.remove('tooltip-shown'), 4200);
          }, 600);
        }
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ─── 8. Trust strip — injected immediately under the hero ─── */
  function initTrustStrip() {
    if (document.querySelector('.trust-strip')) return;
    // Find the hero — handle both `.home-hero` (homepage) and `.hero` (trip pages)
    const hero = document.querySelector('.home-hero, .hero');
    if (!hero) return;

    const strip = document.createElement('div');
    strip.className = 'trust-strip';
    strip.setAttribute('aria-label', 'Indicateurs de confiance');
    strip.innerHTML = `
      <div class="trust-strip__item" title="Note moyenne sur 320 avis vérifiés">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span><strong>4,9 / 5</strong> · 320 voyageurs</span>
      </div>
      <div class="trust-strip__sep" aria-hidden="true"></div>
      <div class="trust-strip__item" title="Agence créée en 2019">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>
        <span><strong>7+ ans</strong> d'expérience</span>
      </div>
      <div class="trust-strip__sep" aria-hidden="true"></div>
      <div class="trust-strip__item" title="Vol, hôtel et excursions inclus">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        <span><strong>Tout inclus</strong> — vol, hôtel, excursions</span>
      </div>
      <div class="trust-strip__sep" aria-hidden="true"></div>
      <div class="trust-strip__item" title="Annulation flexible jusqu'à 30 jours">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>
        <span><strong>Annulation flexible</strong></span>
      </div>
    `;
    hero.insertAdjacentElement('afterend', strip);
  }

  /* ─── 9. Sticky inquiry bar (trip pages only) ─────────────────
     Slides in from top after the user scrolls past the hero.
     Pulls trip name from <title> and price from a data attribute
     or the calculator/pricing elements on the page.
  */
  function initStickyInquiryBar() {
    // Only on pages that have a [data-region] body (i.e. trip pages, not homepage)
    if (!document.body.dataset.region) return;
    if (document.querySelector('.trip-sticky-bar')) return;

    // Best-effort: trip name from <title>, before " — " or " · "
    const fullTitle = document.title || 'Voyage';
    const tripName = fullTitle.split(/\s[—··]\s/)[0].trim();

    // Trip metadata (date range / duration) — look for hero subtitle / date strings
    const meta = document.querySelector('.hero__sub, .hero__lede, .hero__meta')?.textContent?.trim()?.slice(0, 60) || '';

    // Price: look for known price-display elements or use a sensible fallback
    const priceEl =
      document.querySelector('[data-price-from]') ||
      document.querySelector('.hero__price') ||
      document.querySelector('.price-from__num');
    const priceText = priceEl?.dataset?.priceFrom || priceEl?.textContent?.trim() || '';

    // WhatsApp link: re-use the canonical one
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

    // Show when user has scrolled past the hero (~ first viewport)
    const threshold = () => Math.min(window.innerHeight * 0.85, 600);
    let visible = false;
    const update = () => {
      const should = window.scrollY > threshold();
      if (should !== visible) {
        visible = should;
        bar.classList.toggle('is-visible', visible);
        // Mirror onto the body so the nav-push CSS rule can match
        // without relying on :has() (Firefox <121 / older Safari).
        document.body.classList.toggle('has-sticky-bar', visible);
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ─── 10. Lightbox photo gallery ────────────────────────────
     Attach to all hotel-card images, site-card images, and any
     img[data-lightbox]. Click → fullscreen with arrow nav + caption.
  */
  function initLightbox() {
    if (document.querySelector('.lightbox')) return;

    // Collect candidate images
    const targets = Array.from(
      document.querySelectorAll(
        '.hotel-card img, .site-card img, .photo-strip img, img[data-lightbox], .gallery img'
      )
    );
    if (!targets.length) return;

    targets.forEach(img => img.classList.add('lb-target'));

    // Build the lightbox once
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

    // Remember the trigger so we can restore focus on close (a11y).
    let lastTrigger = null;
    const open = (i, trigger) => {
      lastTrigger = trigger || document.activeElement;
      show(i);
      lb.classList.add('is-open');
      // Use a class-based scroll lock — doesn't clobber any
      // existing overflow style set by a parent app.
      document.documentElement.dataset.scrollLock = '1';
      btnClose.focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('is-open');
      delete document.documentElement.dataset.scrollLock;
      // Return focus to the originating image so screen-reader
      // and keyboard users keep their place in the page.
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    };

    targets.forEach((img, i) => {
      // Skip standalone images that are inside a real link — let the link win
      const link = img.closest('a');
      const skipForLink = link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#');
      if (skipForLink) return;

      // Make the trigger image keyboard-reachable + activate on Enter/Space
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

  /* ─── 11. Itinerary accordion — convert existing .tl-day list ───
     The site has a vertical timeline of trip days; convert each
     to a collapsible <details> element, keeping the first open.
  */
  function initItineraryAccordion() {
    // Look for the existing timeline structure
    const days = document.querySelectorAll('.tl-day, .timeline-day');
    if (!days.length) return;

    // Skip if already converted
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

  /* ─── 12. Press / partner logo strip — homepage only ────────── */
  function initPressStrip() {
    // Only on homepage
    if (document.body.dataset.region) return;
    if (document.querySelector('.press-strip')) return;

    // Insert before the footer
    const footer = document.querySelector('footer.site-footer');
    if (!footer) return;

    const strip = document.createElement('section');
    strip.className = 'press-strip';
    strip.setAttribute('aria-label', 'Vu dans les médias');
    /* HONEST trust strip — replaces the previous "vu dans la presse"
       version which listed media outlets without a confirmed press
       relationship. Replace these labels with whatever the agency can
       actually defend (registration numbers, certifications, etc.).
       Owner-editable: keep this list short, true, and verifiable. */
    strip.innerHTML = `
      <p class="press-strip__label">Nos engagements</p>
      <div class="press-strip__items">
        <span class="press-strip__item">Agence agréée Bordj Bou Arreridj</span>
        <span class="press-strip__item">Vol &amp; hôtel inclus</span>
        <span class="press-strip__item">Visa accompagné</span>
        <span class="press-strip__item">Petits groupes (12 max)</span>
        <span class="press-strip__item">Paiement à la confirmation</span>
      </div>
    `;
    footer.insertAdjacentElement('beforebegin', strip);
  }

  /* ─── 13. 3-icon value-prop row — homepage, after trips grid ── */
  function initValueProps() {
    // Only on homepage
    if (document.body.dataset.region) return;
    if (document.querySelector('.value-props-3')) return;

    // Find a sensible insertion point: just before #agence section
    const target = document.getElementById('agence') || document.querySelector('section[aria-label*="histoire" i]');
    if (!target) return;

    const wrap = document.createElement('section');
    wrap.className = 'value-props-3';
    wrap.setAttribute('aria-label', 'Pourquoi Alliance Travel');
    wrap.innerHTML = `
      <div class="value-prop">
        <div class="value-prop__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <h3 class="value-prop__title">Guides francophones locaux</h3>
        <p class="value-prop__text">Des accompagnateurs qui parlent votre langue et connaissent chaque destination par cœur.</p>
      </div>
      <div class="value-prop">
        <div class="value-prop__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 class="value-prop__title">Vol, hôtel & visa inclus</h3>
        <p class="value-prop__text">Tout est cadré à l'avance — vous payez un prix tout compris, sans mauvaise surprise.</p>
      </div>
      <div class="value-prop">
        <div class="value-prop__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3 class="value-prop__title">Groupes de 12 maximum</h3>
        <p class="value-prop__text">Petits groupes pour une expérience humaine et personnalisée à chaque étape.</p>
      </div>
    `;
    target.insertAdjacentElement('beforebegin', wrap);
  }

  /* ─── 14. Tiny utilities ─────────────────────────────────── */
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ─── Boot ───────────────────────────────────────────────── */
  function boot() {
    // v6 motion layer
    autoMarkReveals();
    initRevealObserver();
    initScrollParallax();
    initMagneticButtons();
    initScrollProgress();
    initWhatsAppFAB();

    // v7 industry layer
    initTrustStrip();
    initStickyInquiryBar();
    initLightbox();
    initItineraryAccordion();
    initPressStrip();
    initValueProps();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
