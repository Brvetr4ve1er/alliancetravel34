/* Alliance Travel — lead capture (additive, fire-and-forget).
   On a valid booking-form submit (WhatsApp / email / copy) inserts one row into
   the Supabase `leads` table via PostgREST. Never blocks or delays the primary
   CTA; a failed insert is swallowed. Emptying window.AT_LEADS disables capture. */
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

  function insertLead(payload) {
    try {
      fetch(CFG.url + '/rest/v1/leads', {
        method: 'POST',
        headers: {
          apikey: CFG.anonKey,
          Authorization: 'Bearer ' + CFG.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        keepalive: true // keepalive: don't cancel the POST if the click also triggers navigation
      }).catch(function () {});
    } catch (e) { /* never surface to the user */ }
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
})();
