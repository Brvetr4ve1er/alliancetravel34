/* site/assets/js/contact-form.js — homepage contact form.
 *
 * Replaces the inline onsubmit handler that used to sit in the middle of
 * index.html. It fixes three things that were quietly costing the agency
 * enquiries:
 *
 * 1. THE LEAD IS NOW RECORDED. All seven trip pages load lead-capture.js and
 *    write to the `leads` table. The homepage — the page carrying the actual
 *    contact form — loaded neither it nor lead-config.js, so a visitor who
 *    filled in their name, phone, city and trip and then closed WhatsApp
 *    without pressing send left no trace at all: no row, no dashboard entry,
 *    no follow-up. The insert now happens before WhatsApp opens.
 *
 * 2. THE TRIP NAME CAN NO LONGER BE `undefined`. The old handler looked the
 *    selection up in a hand-written `tripLabels` map holding 4 of the 7
 *    options, so choosing Tunisie, Bali or Vietnam sent the agency
 *    "Je suis intéressé(e) par le voyage : *undefined*". The label is now read
 *    off the selected <option> itself, so it cannot disagree with the list the
 *    visitor just read, cannot go missing when a trip is added, and arrives
 *    already in their language.
 *
 * 3. THE MESSAGE FOLLOWS THE SITE LANGUAGE. It was hard-coded French for
 *    English and Arabic visitors alike.
 *
 * Loaded as a classic deferred script, like the other public scripts.
 */
(function () {
  'use strict';

  var LANGS = ['fr', 'en', 'ar'];

  /* Same precedence i18n.js itself uses: the stored choice wins, then whatever
     is on <html>. Kept in sync by reading, never writing — the language switcher
     stays the only thing that sets it. */
  function currentLang() {
    var stored = null;
    try { stored = localStorage.getItem('al-lang'); } catch (e) { /* private mode */ }
    if (LANGS.indexOf(stored) !== -1) return stored;
    var attr = document.documentElement.lang;
    return LANGS.indexOf(attr) !== -1 ? attr : 'fr';
  }

  /* The WhatsApp body is assembled here rather than pulled from the shared
     dictionary because assets/js/i18n.js exposes nothing on `window` — it is an
     IIFE that only ever writes into the DOM. These strings are therefore the
     one piece of user-facing copy on this page that the i18n manifest cannot
     see; keep the three languages in step by hand. Everything the visitor reads
     *before* pressing the button is DOM-bound and covered as usual. */
  var MSG = {
    fr: {
      hello: 'Bonjour Alliance Travel !',
      intro: function (n, c) { return 'Je m’appelle ' + n + ', je vous contacte depuis ' + c + '.'; },
      phone: function (p) { return 'Mon numéro WhatsApp : ' + p; },
      trip: function (t) { return 'Le voyage qui m’intéresse : *' + t + '*'; },
      noTrip: 'Je voudrais discuter d’un voyage avec vous.',
      close: 'Pourriez-vous me recontacter ? Merci !',
      opening: 'WhatsApp s’ouvre dans un nouvel onglet…',
      blocked: 'Votre navigateur a bloqué la fenêtre. Ouvrir WhatsApp'
    },
    en: {
      hello: 'Hello Alliance Travel!',
      intro: function (n, c) { return 'My name is ' + n + ', I am writing from ' + c + '.'; },
      phone: function (p) { return 'My WhatsApp number: ' + p; },
      trip: function (t) { return 'The trip I am interested in: *' + t + '*'; },
      noTrip: 'I would like to talk through a trip with you.',
      close: 'Could you get back to me? Thank you!',
      opening: 'WhatsApp is opening in a new tab…',
      blocked: 'Your browser blocked the window. Open WhatsApp'
    },
    ar: {
      hello: 'مرحبًا ألاينس ترافل!',
      intro: function (n, c) { return 'اسمي ' + n + '، أراسلكم من ' + c + '.'; },
      phone: function (p) { return 'رقم واتساب الخاص بي: ' + p; },
      trip: function (t) { return 'الرحلة التي تهمّني: *' + t + '*'; },
      noTrip: 'أودّ التحدّث معكم بشأن رحلة.',
      close: 'هل يمكنكم التواصل معي؟ شكرًا!',
      opening: 'يتم فتح واتساب في نافذة جديدة…',
      blocked: 'حجب المتصفّح النافذة. افتح واتساب'
    }
  };

  var AGENCY_WA = '213560860617';

  /* ------------------------------------------------------------ lead capture */

  /* Mirrors the column limits lead-capture.js applies on the trip pages. The
     table is written through the public anon key, so the row is
     attacker-controlled by design: clamp here, and never trust it on read. */
  var MAX = { name: 200, phone: 40, city: 120, trip: 200, page: 200 };
  function clamp(v, max) {
    if (v == null) return null;
    v = String(v).trim();
    return v === '' ? null : v.slice(0, max);
  }

  var lastKey = null; // a double-click must not create two rows

  function captureLead(fields) {
    var cfg = window.AT_LEADS;
    if (!cfg || !cfg.url || !cfg.anonKey) return; // capture disabled — behave as before

    var key = fields.phone + '|' + fields.trip;
    if (key === lastKey) return;
    lastKey = key;

    var payload = {
      name: clamp(fields.name, MAX.name),
      phone: clamp(fields.phone, MAX.phone),
      city: clamp(fields.city, MAX.city),
      trip: clamp(fields.trip, MAX.trip),
      channel: 'whatsapp',
      page: clamp(location.pathname, MAX.page)
    };

    try {
      fetch(cfg.url + '/rest/v1/leads', {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        // keepalive: opening WhatsApp can navigate this tab away, and without
        // this the browser is free to cancel the POST in flight — which is the
        // difference between recording the lead and losing it.
        keepalive: true
      }).catch(function () { /* a failed insert must never block the CTA */ });
    } catch (e) { /* never surfaced to the visitor */ }
  }

  /* ------------------------------------------------------------------- submit */

  function wireForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;
    var status = document.getElementById('cf-status');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Let the browser own validation messaging — it is already localised and
      // announced by screen readers.
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var m = MSG[currentLang()];
      var select = form.elements.trip;
      var opt = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
      // Empty value === the "not sure yet" placeholder, whatever its label says.
      var tripLabel = opt && select.value ? opt.textContent.trim() : '';

      var fields = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        city: form.elements.city.value.trim(),
        trip: tripLabel
      };

      // Record first, then open WhatsApp: the insert is fire-and-forget with
      // keepalive, so ordering it first costs nothing and survives navigation.
      captureLead(fields);

      var body = [
        m.hello,
        '',
        m.intro(fields.name, fields.city),
        m.phone(fields.phone),
        '',
        tripLabel ? m.trip(tripLabel) : m.noTrip,
        '',
        m.close
      ].join('\n');

      var url = 'https://wa.me/' + AGENCY_WA + '?text=' + encodeURIComponent(body);
      var win = window.open(url, '_blank', 'noopener');

      if (!status) return;
      if (win) {
        status.className = 'contact-form__status is-ok';
        status.textContent = m.opening;
      } else {
        // Popup blocked. The old handler failed silently here and the visitor
        // was left staring at a form that appeared to do nothing.
        status.className = 'contact-form__status is-warn';
        status.textContent = '';
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = m.blocked;
        status.appendChild(a);
      }
    });
  }

  /* ----------------------------------------------------------- advisor toggle */

  /* Six advisor numbers repeat the six already listed in the branches section
     directly above, so only two are shown until asked for. The extras carry
     `hidden`, which keeps them out of the accessibility tree and the tab order
     rather than merely hiding them visually. */
  function wireAdvisors() {
    var btn = document.getElementById('advisor-toggle');
    var list = document.getElementById('advisor-list');
    if (!btn || !list) return;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      list.querySelectorAll('[data-advisor-extra]').forEach(function (li) {
        if (open) li.setAttribute('hidden', '');
        else li.removeAttribute('hidden');
      });
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      // Both labels live in the DOM so i18n.js translates them like any other
      // string; the button just swaps which one is visible.
      btn.querySelector('[data-toggle-show]').hidden = !open;
      btn.querySelector('[data-toggle-hide]').hidden = open;
    });
  }

  function init() { wireForm(); wireAdvisors(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
