/* site/assets/js/lead-whatsapp.js — turn WhatsApp CTA taps into leads.
 *
 * The agency's primary conversion is a WhatsApp deep-link, but a bare wa.me tap
 * used to record NOTHING: the visitor's identity only ever reached the owner's
 * phone, never the admin panel — so the "Demandes" screen stayed empty while
 * ~100 people/week clicked to chat. This module closes that gap with two
 * additive, fire-and-forget layers, neither of which blocks or delays the CTA:
 *
 *   1. LOG INSTANTLY. The first WhatsApp tap of a session (per trip/page)
 *      inserts an anonymous lead — channel + page + trip + a client-generated
 *      id — with keepalive, so it survives the tab switch the tap triggers.
 *      Repeat taps in the same session are de-duped to one row per trip/page.
 *   2. INVITE DETAILS. The tap opens WhatsApp in a NEW tab, so THIS tab stays
 *      put; a small, dismissible card then asks for name + phone and, if given,
 *      calls the enrich_lead() RPC to fill in the row logged in step 1.
 *
 * Excludes #bf-send-btn: the booking form already captures a full, richer lead
 * through lead-capture.js, so hooking it too would double-log.
 *
 * Config is duplicated from lead-config.js (as beacon.js does) so this file
 * works standalone on every page, including those without the booking form
 * (voyages, rendez-vous-visa). The anon key is PUBLIC by design: row-level
 * security lets it only INSERT a lead and call enrich_lead — never read one.
 */
(function () {
  'use strict';

  var CFG = {
    url: 'https://vxblgxiamtphabfswnxb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4YmxneGlhbXRwaGFiZnN3bnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDkyODMsImV4cCI6MjA5ODY4NTI4M30.76mBGuCTKGoaVCexkpzsc8pMBRyAfRMNDRPuX2nrVks'
  };

  /* Same privacy gates as beacon.js. Do Not Track disables everything. Local
     dev never writes to the production table unless ?beacon=force is present,
     so a developer clicking around can't pollute real leads. */
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    && location.search.indexOf('beacon=force') === -1;
  var dnt = typeof navigator !== 'undefined' && navigator.doNotTrack === '1';
  if (dnt) return;

  var LANGS = ['fr', 'en', 'ar'];
  function currentLang() {
    var stored = null;
    try { stored = localStorage.getItem('al-lang'); } catch (e) { /* private mode */ }
    if (LANGS.indexOf(stored) !== -1) return stored;
    var attr = document.documentElement.lang;
    return LANGS.indexOf(attr) !== -1 ? attr : 'fr';
  }

  function uuid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* old browser */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function pageId() {
    return (document.body && document.body.dataset && document.body.dataset.page) || location.pathname || '/';
  }
  /* A human-readable trip label when we have one (the live calculator knows it
     on trip pages); null on the home / catalog / visa pages, where only the
     page id is meaningful. */
  function tripName() {
    try { if (window.__calcState && window.__calcState.tripName) return String(window.__calcState.tripName); } catch (e) { /* not a trip page */ }
    var b = document.body;
    if (b && b.dataset && b.dataset.trip) return b.dataset.trip;
    return null;
  }

  /* ---------------------------------------------------------- network (POST) */

  function post(path, body) {
    try {
      fetch(CFG.url + path, {
        method: 'POST',
        headers: {
          apikey: CFG.anonKey,
          Authorization: 'Bearer ' + CFG.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(body),
        keepalive: true // survives the navigation a WhatsApp tap triggers
      }).catch(function () { /* a failed insert must never block the CTA */ });
    } catch (e) { /* never surfaced to the visitor */ }
  }
  function insertLead(id, trip, page) {
    post('/rest/v1/leads', { id: id, channel: 'whatsapp', trip: trip || null, page: String(page || '').slice(0, 200) });
  }
  function enrichLead(id, name, phone) {
    post('/rest/v1/rpc/enrich_lead', { p_id: id, p_name: name, p_phone: phone });
  }

  /* ----------------------------------------------- one lead per trip/session */

  var SKEY = 'at_wa_leads';            // { "<tripOrPage>": "<leadId>" }
  function readMap() { try { return JSON.parse(sessionStorage.getItem(SKEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeMap(m) { try { sessionStorage.setItem(SKEY, JSON.stringify(m)); } catch (e) { /* private mode */ } }

  var activeLeadId = null; // the row the enrichment prompt will fill in

  function logTap() {
    var page = pageId(), trip = tripName();
    var key = trip || page;
    var m = readMap();
    if (m[key]) { activeLeadId = m[key]; return; } // already logged this trip this session
    var id = uuid();
    m[key] = id; writeMap(m);
    activeLeadId = id;
    if (!isLocal) insertLead(id, trip, page);
  }

  /* ------------------------------------------------------- enrichment prompt */

  var STR = {
    fr: { q: 'On vous rappelle ?', sub: 'Laissez votre nom et numéro — c’est facultatif.', name: 'Votre nom', phone: 'Téléphone', send: 'Être rappelé(e)', done: 'Merci ✓ On vous recontacte.', close: 'Fermer' },
    en: { q: 'Want a callback?', sub: 'Leave your name and number — it’s optional.', name: 'Your name', phone: 'Phone', send: 'Call me back', done: 'Thanks ✓ We’ll be in touch.', close: 'Close' },
    ar: { q: 'نعاود الاتصال بك؟', sub: 'اترك اسمك ورقمك — هذا اختياري.', name: 'اسمك', phone: 'الهاتف', send: 'اتصلوا بي', done: 'شكرًا ✓ سنتواصل معك.', close: 'إغلاق' }
  };

  var promptEl = null, handled = false;
  var DKEY = 'at_wa_prompt_done';
  function alreadyHandled() {
    if (handled) return true;
    try { return sessionStorage.getItem(DKEY) === '1'; } catch (e) { return false; }
  }
  function markHandled() {
    handled = true;
    try { sessionStorage.setItem(DKEY, '1'); } catch (e) { /* private mode */ }
  }

  function buildPrompt() {
    var s = STR[currentLang()] || STR.fr;
    var wrap = document.createElement('div');
    wrap.className = 'wa-lead-prompt';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', s.q);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'wa-lead-prompt__close';
    close.setAttribute('aria-label', s.close);
    close.textContent = '✕';
    close.addEventListener('click', hidePrompt);

    var h = document.createElement('p'); h.className = 'wa-lead-prompt__q'; h.textContent = s.q;
    var sub = document.createElement('p'); sub.className = 'wa-lead-prompt__sub'; sub.textContent = s.sub;

    var form = document.createElement('form');
    form.className = 'wa-lead-prompt__form';
    form.noValidate = true;

    var nameI = document.createElement('input');
    nameI.type = 'text'; nameI.className = 'wa-lead-prompt__input';
    nameI.placeholder = s.name; nameI.autocomplete = 'name'; nameI.maxLength = 200;

    var phoneI = document.createElement('input');
    phoneI.type = 'tel'; phoneI.className = 'wa-lead-prompt__input';
    phoneI.placeholder = s.phone; phoneI.autocomplete = 'tel'; phoneI.maxLength = 40; phoneI.dir = 'ltr';

    var send = document.createElement('button');
    send.type = 'submit'; send.className = 'btn btn--primary btn--sm wa-lead-prompt__send';
    send.textContent = s.send;

    form.append(nameI, phoneI, send);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = nameI.value.trim(), p = phoneI.value.trim();
      if (!n && !p) { hidePrompt(); return; } // nothing to add — treat as dismiss
      if (activeLeadId && !isLocal) enrichLead(activeLeadId, n, p);
      markHandled();
      wrap.textContent = '';                  // clear our own node (no lead data)
      var ok = document.createElement('p');
      ok.className = 'wa-lead-prompt__done';
      ok.textContent = s.done;
      wrap.appendChild(ok);
      setTimeout(hidePrompt, 2600);
    });

    wrap.append(close, h, sub, form);
    return wrap;
  }

  function showPrompt() {
    if (alreadyHandled() || !document.body) return;
    if (!promptEl) { promptEl = buildPrompt(); document.body.appendChild(promptEl); }
    var el = promptEl;
    var reveal = function () { if (el) el.classList.add('is-visible'); };
    // rAF gives the append a frame so the transition plays; the timer is a
    // fallback because rAF is throttled/paused while the tab is backgrounded —
    // which is exactly the state after the WhatsApp tab steals focus.
    requestAnimationFrame(reveal);
    setTimeout(reveal, 80);
  }
  function hidePrompt() {
    markHandled();
    if (promptEl) promptEl.classList.remove('is-visible');
  }

  /* --------------------------------------------------- sitewide click hook */

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (!a || a.id === 'bf-send-btn') return; // booking form captures its own lead
    logTap();
    // The CTA opens WhatsApp in a new tab (target=_blank), so this tab remains
    // — invite details here, a beat later so it doesn't fight the tab switch.
    setTimeout(showPrompt, 450);
  }, { capture: true, passive: true });

  // If the visitor switches language, drop the stale-language prompt; it will be
  // rebuilt in the new language on the next tap.
  document.addEventListener('langchange', function () {
    if (promptEl) { promptEl.remove(); promptEl = null; }
  });
})();
