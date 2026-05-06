/* ──────────────────────────────────────────────────────────
   scroll-hero.js — v14 (sticky-scrub rewrite)
   Native scroll-driven progress. The browser does the work:
   we just compute progress = -scrub.top / (scrub.height - viewport)
   on every scroll/resize and write it to a CSS custom property.

   That gives us:
     • Free bidirectional scrolling (browser scroll IS bidirectional)
     • Free rewind (scroll up = progress decreases automatically)
     • Free smoothness (browser interpolates frames, transforms run on GPU)
     • Free accessibility (PgUp/PgDn, scrollbar drag, touch flick all work)
     • No wheel hijacking — doesn't fight the user's input habits

   Markup expectation (per trip page) — same as v13:
     <section class="scroll-hero" data-bg="..." data-fg="..." data-title-pre="..." ...>
       <div class="scroll-hero__continuation">...lede + price + CTAs...</div>
     </section>

   This script wraps the visual layers (bg + media + title + eyebrow + caption)
   inside a sticky+scrub structure during init.
   ────────────────────────────────────────────────────────── */

(function () {
  'use strict';
  if (window.AllianceScrollHero && window.AllianceScrollHero.__initialised) return;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Build the sticky-scrub markup inside an existing <section class="scroll-hero">.
   * The data-* attributes drive the content. The pre-existing
   * <div class="scroll-hero__continuation"> is moved AFTER the scrub area
   * so it appears once the user has scrolled past the animation runway.
   * Idempotent: skips if already built.
   */
  function buildMarkup(section) {
    if (section.querySelector('.scroll-hero__pinned')) return;

    var bg = section.dataset.bg || '';
    var fg = section.dataset.fg || '';
    var title = section.dataset.title || '';
    var eyebrow = section.dataset.eyebrow || '';
    var date = section.dataset.date || '';
    var prompt = section.dataset.prompt || 'Faites défiler';
    var skipText = section.dataset.skip || 'Passer';

    // Resolve URLs against the document baseURI so relative paths from the
    // HTML (e.g. ../assets/...) resolve correctly when set inline via JS.
    var bgURL = bg ? new URL(bg, document.baseURI).href : '';
    var fgURL = fg ? new URL(fg, document.baseURI).href : '';

    // Title split: explicit data-title-pre/post wins, else split on first space.
    var explicitPre = section.dataset.titlePre;
    var explicitPost = section.dataset.titlePost;
    var pre, post;
    if (explicitPre || explicitPost) {
      pre = explicitPre || '';
      post = explicitPost || '';
    } else {
      var firstSpace = title.indexOf(' ');
      pre = firstSpace === -1 ? title : title.slice(0, firstSpace);
      post = firstSpace === -1 ? '' : title.slice(firstSpace + 1);
    }

    // Snapshot existing children (typically just the continuation card)
    var existingChildren = Array.from(section.children);

    // Build the new structure:
    //   <section.scroll-hero>
    //     <div.scroll-hero__scrub>     ← the runway, taller than viewport
    //       <div.scroll-hero__pinned>  ← position: sticky, holds visuals
    //         (bg, media, title, eyebrow, caption, skip)
    //       </div>
    //     </div>
    //     <div.scroll-hero__continuation>...preserved from existing markup...</div>
    //   </section>

    var scrub = document.createElement('div');
    scrub.className = 'scroll-hero__scrub';

    var pinned = document.createElement('div');
    pinned.className = 'scroll-hero__pinned';
    scrub.appendChild(pinned);

    var bgEl = document.createElement('div');
    bgEl.className = 'scroll-hero__bg';
    bgEl.setAttribute('aria-hidden', 'true');
    if (bgURL) bgEl.style.backgroundImage = 'url("' + bgURL + '")';
    pinned.appendChild(bgEl);

    var mediaEl = document.createElement('div');
    mediaEl.className = 'scroll-hero__media';
    mediaEl.setAttribute('role', 'img');
    mediaEl.setAttribute('aria-label', title || pre + ' ' + post);
    if (fgURL) mediaEl.style.backgroundImage = 'url("' + fgURL + '")';
    pinned.appendChild(mediaEl);

    if (eyebrow) {
      var eyebrowEl = document.createElement('div');
      eyebrowEl.className = 'scroll-hero__eyebrow';
      eyebrowEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="10" r="3"/>' +
        '<path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>' +
        '</svg>' +
        '<span>' + escapeHtml(eyebrow) + '</span>';
      pinned.appendChild(eyebrowEl);
    }

    var titleEl = document.createElement('h1');
    titleEl.className = 'scroll-hero__title';
    titleEl.innerHTML =
      '<span class="scroll-hero__title-pre">' + escapeHtml(pre) + '</span>' +
      (post ? '<span class="scroll-hero__title-post">' + escapeHtml(post) + '</span>' : '');
    pinned.appendChild(titleEl);

    var captionEl = document.createElement('div');
    captionEl.className = 'scroll-hero__caption';
    captionEl.setAttribute('aria-hidden', 'true');
    captionEl.innerHTML =
      (date ? '<span class="scroll-hero__date">' + escapeHtml(date) + '</span>' : '') +
      '<span class="scroll-hero__prompt">' + escapeHtml(prompt) + '</span>';
    pinned.appendChild(captionEl);

    var skipEl = document.createElement('a');
    skipEl.href = '#scroll-hero-skip';
    skipEl.className = 'scroll-hero__skip';
    skipEl.textContent = skipText;
    skipEl.setAttribute('aria-label', "Passer l'animation");
    skipEl.addEventListener('click', function (e) {
      e.preventDefault();
      // Jump past the scrub area
      var target = section.offsetTop + scrub.offsetHeight;
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
    pinned.appendChild(skipEl);

    // Clear section + reassemble: scrub first, then preserve existing
    // continuation children at the end.
    section.innerHTML = '';
    section.appendChild(scrub);
    existingChildren.forEach(function (child) { section.appendChild(child); });
  }

  /**
   * Bind a single resize-aware scroll listener that updates --p on the section.
   * Uses requestAnimationFrame to throttle to one update per frame for smooth
   * 60fps scrubbing without jank.
   */
  function bindScroll(section) {
    var scrub = section.querySelector('.scroll-hero__scrub');
    if (!scrub) return;

    var rafId = 0;
    var lastProgress = -1;

    function update() {
      rafId = 0;
      var rect = scrub.getBoundingClientRect();
      var runway = rect.height - window.innerHeight;
      if (runway <= 0) {
        // Scrub area shorter than viewport (very small screen): treat as fully expanded
        if (lastProgress !== 1) {
          section.style.setProperty('--p', '1');
          lastProgress = 1;
        }
        return;
      }
      // -rect.top / runway: 0 when scrub is at viewport top, 1 when bottom
      // hits viewport bottom.
      var raw = -rect.top / runway;
      var p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      // Quantize to avoid setting the same value repeatedly
      var q = Math.round(p * 1000) / 1000;
      if (q !== lastProgress) {
        section.style.setProperty('--p', q.toFixed(3));
        lastProgress = q;
      }
    }

    function schedule() {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    // Initial compute
    update();
  }

  function init() {
    var sections = document.querySelectorAll('.scroll-hero');
    if (!sections.length) return;

    // Disable browser's automatic scroll restoration so each visit starts at
    // the top of the hero (progress 0).
    if ('scrollRestoration' in history) {
      try { history.scrollRestoration = 'manual'; } catch (_) {}
    }

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    sections.forEach(function (section) {
      buildMarkup(section);
      // Mark as initialised so the no-JS fallback CSS rule
      // (.scroll-hero:not([data-sh-init])) stops matching.
      section.setAttribute('data-sh-init', '');

      if (prefersReduced) {
        // Skip animation: render at p=1, let CSS show the fully-expanded state
        section.style.setProperty('--p', '1');
        section.classList.add('reduced-motion');
        return;
      }

      // Start at p=0 explicitly (handles soft navs / cached state)
      section.style.setProperty('--p', '0');
      bindScroll(section);
    });

    // On hard navigation, ensure we start at top so the hero is visible
    if (performance && performance.navigation && performance.navigation.type === 1) {
      window.scrollTo(0, 0);
    } else if ('scrollRestoration' in history && history.scrollRestoration === 'manual') {
      window.scrollTo(0, 0);
    }
  }

  // Public API
  window.AllianceScrollHero = {
    __initialised: true,
    init: init,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
