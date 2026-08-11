/* Alliance Travel — lead capture (additive, fire-and-forget).
   On a valid booking-form submit (WhatsApp / email / copy) inserts one row into
   the Supabase `leads` table via PostgREST. Never blocks or delays the primary
   CTA. Emptying window.AT_LEADS disables capture.

   A failed insert used to be swallowed whole: the WhatsApp tab opened, the
   visitor left satisfied, and the agency never learned the lead existed —
   silent lost revenue. The handoff is still unconditional (nothing below is
   awaited by the click handler), but a failure is no longer invisible:
     • every POST carries an AbortController deadline — a hung request could
       previously stay pending for the life of the tab;
     • a transient failure (network, timeout, 5xx, 408, 429) is retried once,
       then parked in localStorage and re-sent on the visitor's next page view;
     • a permanent rejection (any other 4xx: malformed payload, RLS refusal)
       is NOT queued — it would never drain — and raises a quiet toast so the
       visitor knows to press send in WhatsApp. */
(function () {
  'use strict';
  var CFG = (typeof window !== 'undefined') && window.AT_LEADS;

  var MAX = { name: 200, phone: 40, city: 120, trip: 200, hotel: 200, date: 80, room: 40, page: 200, notes: 2000 };
  function str(v, max) { return v == null || v === '' ? null : String(v).slice(0, max); }
  function clampInt(v, lo, hi) { v = parseInt(v, 10); if (!Number.isFinite(v)) return null; return Math.max(lo, Math.min(hi, v)); }

  function buildLeadPayload(state, fields, channel) {
    state = state || {}; fields = fields || {};
    var kids = Array.isArray(state.kids) ? state.kids.length : state.kids;
    return {
      name: str(fields.name, MAX.name),
      phone: str(fields.phone, MAX.phone),
      city: str(fields.city, MAX.city),
      trip: str(state.tripName, MAX.trip),
      hotel: str(state.hotel, MAX.hotel),
      date: str(state.date, MAX.date),
      room: str(state.room, MAX.room),
      adults: state.adults == null ? null : clampInt(state.adults, 0, 50),
      kids: kids == null ? null : clampInt(kids, 0, 50),
      total_da: state.totalDA == null ? null : clampInt(state.totalDA, 0, 100000000),
      channel: (channel === 'whatsapp' || channel === 'email' || channel === 'copy') ? channel : null,
      page: str((typeof location !== 'undefined' && location.pathname) || '', MAX.page),
      notes: str(fields.notes, MAX.notes)
    };
  }
  // Expose the pure builder for unit tests and defensive reuse.
  if (typeof window !== 'undefined') window.AT_buildLeadPayload = buildLeadPayload;

  if (!CFG || !CFG.url || !CFG.anonKey) return; // capture disabled — behave exactly as before

  /* ------------------------------------------------------------------ network */

  var TIMEOUT_MS   = 8000;                    // no client fetch may hang forever
  var QUEUE_KEY    = 'at-lead-queue';         // shared with contact-form.js
  var QUEUE_MAX    = 20;                      // a broken endpoint can't grow storage without bound
  var QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a lead nobody chased in a week is cold

  /* Resolves with the HTTP status, or 0 for a network error / timeout / abort.
     Never rejects: every caller below is a background task. */
  function postLead(payload) {
    var ctl = null, timer = null;
    var opts = {
      method: 'POST',
      headers: {
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + CFG.anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload),
      keepalive: true // keepalive: don't cancel the POST if the click also triggers navigation
    };
    try {
      if (typeof AbortController === 'function') {
        ctl = new AbortController();
        opts.signal = ctl.signal;
        timer = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, TIMEOUT_MS);
      }
    } catch (e) { /* no AbortController — behaves exactly as before, no deadline */ }
    function done(status) { if (timer) { clearTimeout(timer); timer = null; } return status; }
    try {
      return fetch(CFG.url + '/rest/v1/leads', opts)
        .then(function (res) { return done(res && typeof res.status === 'number' ? res.status : 0); })
        .catch(function () { return done(0); });
    } catch (e) {
      return Promise.resolve(done(0));
    }
  }

  function isOk(status) { return status >= 200 && status < 300; }
  /* Worth trying again: no answer at all (0 = network error / our timeout),
     the server asked us to wait (408 / 429) or it broke (5xx). Every other
     4xx is a verdict on the payload — retrying sends the same bytes. */
  function isTransient(status) {
    return status === 0 || status === 408 || status === 429 || status >= 500;
  }

  /* ------------------------------------------------------------ retry queue */

  function queueRead() {
    try {
      var arr = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; } // private mode / corrupt value
  }
  function queueWrite(arr) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(arr.slice(-QUEUE_MAX))); } catch (e) { /* quota */ }
  }
  function queuePush(payload) {
    var arr = queueRead();
    arr.push({ at: Date.now(), payload: payload });
    queueWrite(arr);
  }

  /* Re-send what the last visit could not. Once per page — the flag is on
     window so contact-form.js's copy of this queue cannot double-send it.
     The batch is taken (queue cleared) before sending: an entry that fails
     transiently re-queues itself, and the only loss window is the page being
     closed mid-flight, where keepalive means the POST most likely landed
     anyway. Erring the other way would re-send delivered leads as duplicates. */
  function flushQueue() {
    if (window.__atLeadQueueFlushed) return;
    window.__atLeadQueueFlushed = true;
    var now = Date.now();
    var pending = queueRead().filter(function (it) {
      return it && it.payload && typeof it.at === 'number' && (now - it.at) < QUEUE_TTL_MS;
    });
    if (!pending.length) { if (queueRead().length) queueWrite([]); return; }
    queueWrite([]);
    pending.forEach(function (it) {
      postLead(it.payload).then(function (status) {
        if (!isOk(status) && isTransient(status)) queuePush(it.payload);
      });
    });
  }

  /* --------------------------------------------------------------- notice */

  /* Same three-language hand-kept dict as contact-form.js / lead-whatsapp.js:
     this string is created in JS after a network answer, so i18n.js — which
     only ever translates DOM nodes carrying data-i18n — cannot reach it. */
  var LANGS = ['fr', 'en', 'ar'];
  function currentLang() {
    var stored = null;
    try { stored = localStorage.getItem('al-lang'); } catch (e) { /* private mode */ }
    if (LANGS.indexOf(stored) !== -1) return stored;
    var attr = document.documentElement.lang;
    return LANGS.indexOf(attr) !== -1 ? attr : 'fr';
  }
  var NOTICE = {
    fr: 'Nous n’avons pas pu enregistrer votre demande — envoyez le message WhatsApp, il nous parviendra.',
    en: 'We couldn’t save your request — please send the WhatsApp message and it will reach us.',
    ar: 'لم نتمكّن من حفظ طلبك — أرسل رسالة واتساب وستصلنا.'
  };
  /* Non-blocking by construction: a toast from enhance.js, raised long after
     the WhatsApp tab opened. If enhance.js isn't loaded we stay silent rather
     than invent UI on top of the page. */
  function notify() {
    try {
      if (typeof window.AT_showToast === 'function') {
        window.AT_showToast(NOTICE[currentLang()] || NOTICE.fr, 'error');
      }
    } catch (e) { /* a notice must never throw into the CTA path */ }
  }

  /* Fire-and-forget from the caller's point of view: returns nothing, awaits
     nothing, and every branch ends in a background promise. */
  function insertLead(payload) {
    postLead(payload).then(function (status) {
      if (isOk(status)) return;
      if (!isTransient(status)) { notify(); return; }
      // One immediate retry — keepalive, so it still survives the tab switch.
      return postLead(payload).then(function (again) {
        if (isOk(again)) return;
        if (isTransient(again)) queuePush(payload); // parked for the next visit
        else notify();
      });
    }).catch(function () { /* postLead never rejects; belt and braces */ });
  }

  function readFields() {
    var q = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    return { name: q('bf-name'), phone: q('bf-phone'), city: q('bf-city'), notes: q('bf-notes') };
  }

  function fieldsValid() {
    // Mirror the booking form's own HTML constraints (required + minlength + pattern
    // on #bf-name/#bf-phone/#bf-city). #bf-copy-btn has no gate in booking-form.js,
    // so for the "copy" channel this is the sole guard against junk rows.
    var ids = ['bf-name', 'bf-phone', 'bf-city'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) return false;
      var ok = typeof el.checkValidity === 'function' ? el.checkValidity() : !!el.value.trim();
      if (!ok) return false;
    }
    return true;
  }

  var lastKey = null; // de-dupe identical consecutive sends
  function capture(channel) {
    if (!fieldsValid()) return; // no junk rows — mirrors the form's required/minlength/pattern
    var f = readFields();
    var payload = buildLeadPayload(window.__calcState, f, channel);
    var key = channel + '|' + f.phone + '|' + (payload.total_da || '') + '|' + (payload.hotel || '');
    if (key === lastKey) return;
    lastKey = key;
    insertLead(payload);
  }

  function wire() {
    var map = { 'bf-send-btn': 'whatsapp', 'bf-email-btn': 'email', 'bf-copy-btn': 'copy' };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { capture(map[id]); });
    });
  }

  // booking-form.js injects its DOM on boot; wait until the buttons exist.
  function ready() {
    if (document.getElementById('bf-send-btn')) return wire();
    var n = 0, t = setInterval(function () {
      if (document.getElementById('bf-send-btn') || ++n > 40) { clearInterval(t); wire(); }
    }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();

  // Drain anything a previous visit couldn't deliver, off the critical path.
  setTimeout(flushQueue, 1500);

  /* Test hook — the pure/queue half of this module, mirroring
     window.AT_bookingInternals in booking-form.js. Nothing here reads or
     writes the DOM; see site/assets/js/lead-queue.test.mjs. */
  window.AT_leadInternals = {
    postLead: postLead,
    insertLead: insertLead,
    isOk: isOk,
    isTransient: isTransient,
    queueRead: queueRead,
    queueWrite: queueWrite,
    queuePush: queuePush,
    flushQueue: flushQueue,
    QUEUE_KEY: QUEUE_KEY,
    QUEUE_MAX: QUEUE_MAX,
    TIMEOUT_MS: TIMEOUT_MS
  };
})();
