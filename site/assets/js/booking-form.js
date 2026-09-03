/**
 * Alliance Travel — WhatsApp Booking Form
 * Mounts into <section id="booking"> on each trip page.
 * Syncs with the pricing calculator via window.__calcState.
 * Compiles a formatted WhatsApp message, no backend required.
 *
 * Wrapped in IIFE to isolate scope from calculator.js
 * (both files used `const fmt` which collided in global scope).
 */
(function () {
'use strict';

const fmt = (n) =>
  n ? new Intl.NumberFormat('fr-DZ').format(n) + ' DA' : null;

/* Bidi isolation for LTR values dropped into the recap. Under dir=rtl the
   bidi-neutral spaces between phone digit groups and the en-dash in
   "20 - 26 Aout 2026" resolve right-to-left, so the value renders reversed
   ("266 616 0561", "26 Aout 2026 - 20") both in the on-page <pre> and in
   WhatsApp's own RTL view. U+2066 LRI ... U+2069 PDI pins each value to its
   own left-to-right run. Written as unicode escapes so the isolates stay
   visible in source; NOT HTML entities - _liveUpdate's &-escape would print
   them as text. Wrap values only, never the Arabic labels or a whole line. */
const ltr = (v) => `\u2066${v}\u2069`;

/* Escape user-controlled values before interpolating into innerHTML.
   No backend exists so the only exposure is self-XSS, but escaping is
   cheap and removes the footgun. Safe in attribute and text contexts. */
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── HTML Template ───────────────────────────────────────────── */
const FORM_HTML = `
<div class="container">
  <div class="section-head" style="text-align:center;max-width:680px;margin-inline:auto">
    <span class="phase-marker"><span class="phase-marker__num">4</span><span class="phase-marker__label">Réserver par WhatsApp</span></span>
    <p class="section-head__eyebrow">Composez votre dossier</p>
    <h2 class="section-head__title">Votre <em>réservation</em></h2>
    <p class="section-head__sub">
      Renseignez vos informations, importez les copies de passeports,
      et un message complet sera généré automatiquement.
      Un seul clic ouvre WhatsApp avec tout pré-rempli.
    </p>
  </div>

  <div class="bform-grid">

    <!-- ── LEFT: Form ───────────────────────────────────────── -->
    <div class="bform-left">

      <!-- Block 1 · Trip summary (auto-synced with calculator) -->
      <div class="bform-block">
        <h3 class="bform-block__title">
          ${icon('calendar')}
          Votre sélection (depuis le calculateur)
        </h3>
        <div id="bf-trip-summary">
          <p class="bf-trip-empty">Configurez votre voyage dans la section Tarifs ci-dessus pour voir votre sélection ici.</p>
        </div>
      </div>

      <!-- Block 2 · Contact -->
      <div class="bform-block">
        <h3 class="bform-block__title">
          ${icon('user')}
          Responsable du dossier
        </h3>
        <div class="bform-row-2">
          <div class="bform-field">
            <label for="bf-name">Nom &amp; Prénom <span class="req" aria-hidden="true">*</span></label>
            <input type="text" id="bf-name" placeholder="Ahmed Benkhalifa"
              autocomplete="name" inputmode="text" required minlength="2"
              aria-required="true" aria-describedby="bf-name-err"/>
            <p class="bf-field-err" id="bf-name-err" hidden>Veuillez indiquer votre nom complet.</p>
          </div>
          <div class="bform-field">
            <label for="bf-phone">Téléphone WhatsApp <span class="req" aria-hidden="true">*</span></label>
            <input type="tel" id="bf-phone" placeholder="0561 616 266"
              autocomplete="tel" inputmode="tel" required
              pattern="^(\\+213|0)[5-7][0-9 ]{8,}$"
              aria-required="true" aria-describedby="bf-phone-err"/>
            <p class="bf-field-err" id="bf-phone-err" hidden>Numéro algérien attendu : 05/06/07 suivi de 8 chiffres.</p>
          </div>
        </div>
        <div class="bform-field">
          <label for="bf-city">Wilaya / Ville <span class="req" aria-hidden="true">*</span></label>
          <input type="text" id="bf-city" placeholder="Bordj Bou Arreridj"
            autocomplete="address-level2" required minlength="2"
            aria-required="true" aria-describedby="bf-city-err"/>
          <p class="bf-field-err" id="bf-city-err" hidden>Indiquez votre wilaya ou ville.</p>
        </div>
        <!-- Office picker: which agency WhatsApp the dossier is sent to.
             Populated at runtime from window.AT_CONTACTS; hidden if unavailable. -->
        <div class="bform-field" id="bf-office-field" hidden>
          <label for="bf-office">Agence à contacter</label>
          <select id="bf-office" autocomplete="off"></select>
          <p class="bform-hint" id="bf-office-hint">Votre demande WhatsApp sera envoyée à cette agence.</p>
        </div>
      </div>

      <!-- Block 3 · Passport info per traveler -->
      <div class="bform-block">
        <h3 class="bform-block__title">
          ${icon('passport')}
          Informations passeports
        </h3>
        <p class="bform-hint">
          <strong>Facultatif.</strong> Ces informations ne sont pas nécessaires pour obtenir un
          devis. Si vous les renseignez, elles sont incluses dans le message WhatsApp que vous
          envoyez à l'agence — elles ne sont pas enregistrées dans notre outil de suivi.
          <a href="/confidentialite/" target="_blank" rel="noopener">Politique de confidentialité</a>
        </p>
        <label class="bf-consent" for="bf-passport-consent">
          <input type="checkbox" id="bf-passport-consent"/>
          <span>J'accepte de transmettre les données de passeport des voyageurs via WhatsApp
            pour la préparation de mon dossier.</span>
        </label>
        <div id="bf-passport-fields" hidden>
          <div id="bf-passports-list"></div>
          <button class="btn btn--ghost btn--sm" id="bf-add-passport" type="button"
            style="width:fit-content;margin-top:var(--s1)">
            ${icon('plus')} Ajouter un voyageur
          </button>
        </div>
      </div>

      <!-- Block 4 · Document upload -->
      <div class="bform-block">
        <h3 class="bform-block__title">
          ${icon('upload')}
          Copies des passeports
        </h3>
        <div class="upload-zone" id="bf-upload-zone">
          <div class="upload-zone__icon">
            ${icon('upload-cloud')}
          </div>
          <p><strong>Glissez vos copies ici</strong></p>
          <p>ou <label for="bf-files" class="upload-browse">sélectionnez les fichiers</label></p>
          <p class="upload-formats">Images (JPG, PNG) · Scans · PDF</p>
          <input type="file" id="bf-files" multiple accept="image/*,.pdf" hidden/>
        </div>
        <div id="bf-previews" class="upload-previews"></div>
        <p class="bform-note">
          ${icon('info')}
          Les fichiers ne sont <strong>pas</strong> transmis automatiquement. Vous les enverrez
          manuellement dans le chat WhatsApp juste après votre demande.
        </p>
      </div>

      <!-- Block 5 · Extra notes -->
      <div class="bform-block">
        <h3 class="bform-block__title">
          ${icon('chat')}
          Message complémentaire (optionnel)
        </h3>
        <div class="bform-field">
          <textarea id="bf-notes" rows="3"
            placeholder="Questions, demandes spéciales, chambre non-fumeur, régime alimentaire..."></textarea>
        </div>
      </div>

    </div><!-- /bform-left -->

    <!-- ── RIGHT: Preview panel ─────────────────────────────── -->
    <div class="bform-right">
      <div class="bform-preview">
        <div class="bform-preview__header">
          ${icon('whatsapp')}
          Aperçu du message WhatsApp
        </div>
        <div class="bform-preview__content">
          <div class="bf-validation-banner" id="bf-validation-banner" role="alert" hidden>
            ${icon('info')} Veuillez compléter les champs marqués en rouge avant d'envoyer.
          </div>
          <div id="bf-msg-preview" aria-live="polite" aria-atomic="false">
            <p class="bform-preview__empty">Remplissez le formulaire pour voir l'aperçu de votre message…</p>
          </div>
        </div>
        <div class="bform-preview__footer">
          <a class="btn btn--wa btn--full" id="bf-send-btn" href="#" target="_blank" rel="noopener"
             style="pointer-events:none;opacity:.45;text-align:center;justify-content:center">
            ${icon('whatsapp')}
            Ouvrir WhatsApp &amp; Envoyer
          </a>
          <div class="bform-preview__actions" style="display:flex;gap:8px;margin-top:8px">
            <a class="btn btn--ghost" id="bf-email-btn" href="#" style="flex:1;justify-content:center;pointer-events:none;opacity:.45">
              ${icon('chat')} Envoyer par email
            </a>
            <button class="btn btn--ghost" id="bf-copy-btn" type="button" style="flex:1;justify-content:center">
              ${icon('copy')} Copier le texte
            </button>
          </div>
          <p class="bform-preview__foot-note">
            WhatsApp est plus rapide. Email et copie disponibles si vous n'avez pas WhatsApp.
          </p>
        </div>
      </div>
    </div>

  </div><!-- /bform-grid -->
</div>
`;

/* ─── SVG Icons (inline Lucide-style) ────────────────────────── */
function icon(name) {
  const icons = {
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    passport: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-1a5 5 0 0 1 10 0v1"/></svg>`,
    upload: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    'upload-cloud': `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
    chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    info: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline;vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    whatsapp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    x: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    pdf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`,
  };
  return icons[name] ?? '';
}

/* ─── Passport entry renderer ─────────────────────────────────── */
function renderPassportEntry(idx, data = {}) {
  // Use HTML id="pp-name-N" etc so labels can <label for="..."> properly.
  // Type=date for DOB and expiry brings up the OS date picker on mobile and
  // gives format-validated values (YYYY-MM-DD on submit). Visible label
  // explains the convention.
  return `
  <div class="bf-passport-entry" data-idx="${idx}">
    <div class="bf-passport-entry__header">
      <span class="bf-passport-entry__label">Voyageur ${idx + 1}</span>
      ${idx > 0 ? `<button class="bf-passport-entry__remove" data-remove="${idx}" type="button" aria-label="Supprimer voyageur ${idx + 1}">${icon('x')}</button>` : ''}
    </div>
    <div class="bf-passport-grid">
      <div class="bform-field">
        <label for="pp-name-${idx}">Nom &amp; Prénom</label>
        <input type="text" id="pp-name-${idx}" class="pp-name" data-idx="${idx}"
          placeholder="Ahmed Benkhalifa" value="${escapeHtml(data.name)}"
          autocomplete="off"/>
      </div>
      <div class="bform-field">
        <label for="pp-num-${idx}">N° de passeport</label>
        <input type="text" id="pp-num-${idx}" class="pp-num" data-idx="${idx}"
          placeholder="AB 123456" value="${escapeHtml(data.number)}"
          inputmode="text" pattern="[A-Z0-9 ]{4,12}"
          aria-describedby="pp-num-${idx}-hint"/>
        <p class="bf-field-hint" id="pp-num-${idx}-hint">8 caractères alphanumériques.</p>
      </div>
      <div class="bform-field">
        <label for="pp-expiry-${idx}">Date d'expiration</label>
        <input type="date" id="pp-expiry-${idx}" class="pp-expiry" data-idx="${idx}"
          value="${escapeHtml(data.expiry)}"
          aria-describedby="pp-expiry-${idx}-hint"/>
        <p class="bf-field-hint" id="pp-expiry-${idx}-hint">Doit être valide ≥ 6 mois après le retour.</p>
      </div>
      <div class="bform-field">
        <label for="pp-dob-${idx}">Date de naissance</label>
        <input type="date" id="pp-dob-${idx}" class="pp-dob" data-idx="${idx}"
          value="${escapeHtml(data.dob)}"/>
      </div>
    </div>
  </div>`;
}

/* ─── Main BookingForm class ──────────────────────────────────── */
class BookingForm {
  constructor(mountEl) {
    this.mount  = mountEl;
    this.passports  = [{}];   // array of { name, number, expiry, dob }
    this.uploads    = [];     // array of { name, url, type }
    this.debounceTimer = null;
    this.WA_NUMBER  = '213561616266';
    this.EMAIL      = 'contact@alliance-travel.dz';
    this.AGENCY     = 'Alliance Travel';

    this.mount.innerHTML = FORM_HTML;
    this.el = {
      tripSummary:  this.mount.querySelector('#bf-trip-summary'),
      passportList: this.mount.querySelector('#bf-passports-list'),
      addPassport:  this.mount.querySelector('#bf-add-passport'),
      ppConsent:    this.mount.querySelector('#bf-passport-consent'),
      ppFields:     this.mount.querySelector('#bf-passport-fields'),
      uploadZone:   this.mount.querySelector('#bf-upload-zone'),
      fileInput:    this.mount.querySelector('#bf-files'),
      previews:     this.mount.querySelector('#bf-previews'),
      msgPreview:   this.mount.querySelector('#bf-msg-preview'),
      sendBtn:      this.mount.querySelector('#bf-send-btn'),
      emailBtn:     this.mount.querySelector('#bf-email-btn'),
      copyBtn:      this.mount.querySelector('#bf-copy-btn'),
      officeField:  this.mount.querySelector('#bf-office-field'),
      officeSelect: this.mount.querySelector('#bf-office'),
    };

    // Office picker → WhatsApp destination. Populated from window.AT_CONTACTS
    // (site/assets/js/contacts.js). If absent/empty, keep the hardcoded default
    // number and leave the picker hidden — behaves exactly as before this feature.
    const offices = Array.isArray(window.AT_CONTACTS)
      ? window.AT_CONTACTS.filter((o) => o && o.id && o.wa)
      : [];
    if (offices.length) {
      const def = offices.find((o) => o.default) || offices[0];
      this.WA_NUMBER = String(def.wa);
      if (this.el.officeSelect) {
        this.el.officeSelect.innerHTML = offices.map((o) =>
          `<option value="${escapeHtml(o.id)}"${o === def ? ' selected' : ''}>${escapeHtml(o.label || o.id)}</option>`
        ).join('');
        this.el.officeSelect.addEventListener('change', () => {
          const sel = offices.find((o) => o.id === this.el.officeSelect.value) || def;
          this.WA_NUMBER = String(sel.wa);
          this._liveUpdate();
        });
        // Only surface the picker when there's an actual choice to make.
        if (offices.length > 1 && this.el.officeField) this.el.officeField.hidden = false;
      }
    }

    this._renderPassports();
    this._bindAll();
    this._syncCalc();  // initial sync
    this._liveUpdate();
  }

  /* ── Calc sync ───────────────────────────────────────────── */
  _syncCalc() {
    const s = window.__calcState;
    const el = this.el.tripSummary;
    if (!el) return;

    // _lang() always resolves to 'fr' | 'en' | 'ar', so this lookup never misses.
    const SUM = {
      fr: { empty: 'Configurez votre voyage dans la section <strong>Tarifs</strong> ci-dessus pour voir votre sélection ici.',
            destination: 'Destination', hotel: 'Hôtel', date: 'Date', room: 'Chambre', adults: 'Adultes', kids: 'Enfants/Bébés', total: 'Total estimé' },
      en: { empty: 'Configure your trip in the <strong>Pricing</strong> section above to see your selection here.',
            destination: 'Destination', hotel: 'Hotel', date: 'Date', room: 'Room', adults: 'Adults', kids: 'Children/Babies', total: 'Estimated total' },
      ar: { empty: 'اضبط رحلتك في قسم <strong>الأسعار</strong> أعلاه لرؤية اختيارك هنا.',
            destination: 'الوجهة', hotel: 'الفندق', date: 'التاريخ', room: 'الغرفة', adults: 'البالغون', kids: 'أطفال/رضّع', total: 'الإجمالي التقديري' },
    };
    const T = SUM[this._lang()];

    if (!s || !s.hotel) {
      el.innerHTML = `<p class="bf-trip-empty">${T.empty}</p>`;
      return;
    }

    const chips = [
      { label: T.destination, val: s.tripName },
      { label: T.hotel,       val: s.hotel },
      { label: T.date,        val: s.date || '—' },
      // Guarded like kids/total below, and like every line in _buildMessage:
      // a page without the price calculator (e.g. /omra/) sets only tripName
      // and hotel, and an unguarded chip rendered the string "undefined".
      s.room ? { label: T.room, val: s.room } : null,
      s.adults != null ? { label: T.adults, val: s.adults } : null,
      s.kids?.length ? { label: T.kids, val: s.kids.length } : null,
      s.totalDA ? { label: T.total, val: fmt(s.totalDA), highlight: true } : null,
    ].filter(Boolean);

    el.innerHTML = `<div class="bf-trip-chips">
      ${chips.map(c => `
        <div class="bf-trip-chip">
          <span style="color:var(--txt-3);font-size:.7rem">${c.label}</span>
          <strong class="${c.highlight ? 'is-hl' : ''}">${c.val}</strong>
        </div>`).join('')}
    </div>`;
  }

  /* ── Passport list ───────────────────────────────────────── */
  _renderPassports() {
    this.el.passportList.innerHTML = this.passports
      .map((p, i) => renderPassportEntry(i, p))
      .join('');

    // Bind remove buttons
    this.el.passportList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.remove);
        this.passports.splice(idx, 1);
        this._renderPassports();
        this._liveUpdate();
      });
    });

    // Bind field changes → save data
    const bindField = (cls, key) => {
      this.el.passportList.querySelectorAll(cls).forEach(inp => {
        inp.addEventListener('input', () => {
          const i = parseInt(inp.dataset.idx);
          if (!this.passports[i]) this.passports[i] = {};
          this.passports[i][key] = inp.value.trim();
          this._scheduleUpdate();
        });
      });
    };
    bindField('.pp-name',   'name');
    bindField('.pp-num',    'number');
    bindField('.pp-expiry', 'expiry');
    bindField('.pp-dob',    'dob');
  }

  /* ── File upload ─────────────────────────────────────────── */
  /** Per-file and total upload limits — kept generous for passport scans
   *  but hard enough to prevent a 50MB drag-drop from blocking the UI. */
  static MAX_FILE_BYTES = 8 * 1024 * 1024;   // 8 MB
  static MAX_TOTAL_BYTES = 40 * 1024 * 1024; // 40 MB
  static MAX_FILE_COUNT = 12;
  static ALLOWED_TYPES = /^(image\/(jpeg|jpg|png|webp|heic|heif)|application\/pdf)$/i;

  _handleFiles(files) {
    const errors = [];
    const accepted = [];
    let totalAfter = this.uploads.reduce((sum, f) => sum + (f.size || 0), 0);

    [...files].forEach(file => {
      // 1. Type check (browser already filters via accept= but double-check)
      if (!BookingForm.ALLOWED_TYPES.test(file.type)) {
        errors.push(`${file.name} — type non supporté (JPG, PNG, WebP, HEIC ou PDF uniquement)`);
        return;
      }
      // 2. Per-file size check
      if (file.size > BookingForm.MAX_FILE_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        errors.push(`${file.name} — fichier trop lourd (${mb} MB, max 8 MB)`);
        return;
      }
      // 3. Total count check
      if (this.uploads.length + accepted.length >= BookingForm.MAX_FILE_COUNT) {
        errors.push(`Limite atteinte (${BookingForm.MAX_FILE_COUNT} fichiers maximum)`);
        return;
      }
      // 4. Total size check
      if (totalAfter + file.size > BookingForm.MAX_TOTAL_BYTES) {
        errors.push(`${file.name} — taille totale dépassée (max 40 MB)`);
        return;
      }
      totalAfter += file.size;
      accepted.push(file);
    });

    // Surface errors via toast (one per error, queued)
    errors.forEach(msg => window.AT_showToast?.(msg, 'error'));

    // Read the accepted files
    accepted.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploads.push({
          name: file.name,
          url: e.target.result,
          type: file.type,
          size: file.size,
        });
        this._renderPreviews();
        this._liveUpdate();
      };
      reader.onerror = () => {
        window.AT_showToast?.(`Impossible de lire ${file.name}`, 'error');
      };
      reader.readAsDataURL(file);
    });

    if (accepted.length && !errors.length) {
      window.AT_showToast?.(`${accepted.length} fichier(s) ajouté(s)`);
    }
  }

  _renderPreviews() {
    this.el.previews.innerHTML = this.uploads.map((f, i) => {
      const isImg = f.type.startsWith('image/');
      const safeName = escapeHtml(f.name);
      return `
      <div class="upload-thumb">
        ${isImg
          ? `<img src="${f.url}" alt="${safeName}"/>`
          : `<div class="upload-pdf-icon">${icon('pdf')}</div>`}
        <span class="upload-thumb__label">${safeName}</span>
        <button class="upload-thumb__remove" data-remove="${i}" title="Supprimer">${icon('x')}</button>
      </div>`;
    }).join('');

    this.el.previews.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.uploads.splice(parseInt(btn.dataset.remove), 1);
        this._renderPreviews();
        this._liveUpdate();
      });
    });
  }

  /* ── i18n ─────────────────────────────────────────────────────
     Active UI language ('fr' | 'en' | 'ar'), read off <html lang>.
     Falls back to 'fr'. Mirrors calculator.js _lang()/_labels(). */
  _lang() {
    const l = document.documentElement.getAttribute('lang') || 'fr';
    return (l === 'en' || l === 'ar') ? l : 'fr';
  }

  // Single source of truth for the per-language strings used by the WhatsApp
  // (and email) message body. Names, numbers, prices and uploaded values stay
  // as-is (Western digits). Wording/style mirror calculator.js _labels() and
  // the booking empty-state FR/EN/AR strings in _liveUpdate().
  _labels(lang) {
    lang = lang || this._lang();
    const sets = {
      fr: {
        title:      '🌍 *Demande de réservation — Alliance Travel*',
        tripHead:   '📋 *VOYAGE SÉLECTIONNÉ*',
        destination:'Destination',
        hotel:      'Hôtel',
        date:       'Date de départ',
        room:       'Chambre',
        adults:     'Adultes',
        kids:       'Enfants/Bébés',
        price:      'Prix estimé',
        localTax:   (usd) => `Taxe locale : ${usd} USD (sur place)`,
        ownerHead:  '👤 *RESPONSABLE DU DOSSIER*',
        nameField:  'Nom',
        nameEmpty:  '• Nom : (non renseigné)',
        phone:      'Téléphone WA',
        city:       'Wilaya/Ville',
        passHead:   '📄 *INFORMATIONS PASSEPORTS*',
        traveler:   'Voyageur',
        passNum:    (n) => `N° ${n}`,
        passExpiry: (d) => `Exp. ${d}`,
        passDob:    (d) => `Né(e) le ${d}`,
        uploads:    (n) => `📎 *${n} copie(s) de passeport* seront envoyées dans ce chat.`,
        note:       (txt) => `💬 *NOTE :* ${txt}`,
        thanks:     'Merci ! ✅',
      },
      en: {
        title:      '🌍 *Booking request — Alliance Travel*',
        tripHead:   '📋 *SELECTED TRIP*',
        destination:'Destination',
        hotel:      'Hotel',
        date:       'Departure date',
        room:       'Room',
        adults:     'Adults',
        kids:       'Children/Babies',
        price:      'Estimated price',
        localTax:   (usd) => `Local tax: ${usd} USD (on site)`,
        ownerHead:  '👤 *FILE HOLDER*',
        nameField:  'Name',
        nameEmpty:  '• Name: (not provided)',
        phone:      'WhatsApp phone',
        city:       'Wilaya/City',
        passHead:   '📄 *PASSPORT DETAILS*',
        traveler:   'Traveler',
        passNum:    (n) => `No. ${n}`,
        passExpiry: (d) => `Exp. ${d}`,
        passDob:    (d) => `Born ${d}`,
        uploads:    (n) => `📎 *${n} passport copy/copies* will be sent in this chat.`,
        note:       (txt) => `💬 *NOTE:* ${txt}`,
        thanks:     'Thank you! ✅',
      },
      ar: {
        title:      '🌍 *طلب حجز — Alliance Travel*',
        tripHead:   '📋 *الرحلة المختارة*',
        destination:'الوجهة',
        hotel:      'الفندق',
        date:       'تاريخ المغادرة',
        room:       'الغرفة',
        adults:     'البالغون',
        kids:       'أطفال/رضّع',
        price:      'السعر التقديري',
        localTax:   (usd) => `الضريبة المحلية: ${usd} USD (في الموقع)`,
        ownerHead:  '👤 *صاحب الملف*',
        nameField:  'الاسم',
        nameEmpty:  '• الاسم: (غير محدّد)',
        phone:      'هاتف واتساب',
        city:       'الولاية/المدينة',
        passHead:   '📄 *معلومات جوازات السفر*',
        traveler:   'المسافر',
        passNum:    (n) => `رقم ${n}`,
        passExpiry: (d) => `انتهاء ${d}`,
        passDob:    (d) => `تاريخ الميلاد ${d}`,
        uploads:    (n) => `📎 *${n} نسخة من جواز السفر* ستُرسَل في هذه المحادثة.`,
        note:       (txt) => `💬 *ملاحظة:* ${txt}`,
        thanks:     'شكراً! ✅',
      },
    };
    return sets[lang] || sets.fr;
  }

  /* ── Message builder ─────────────────────────────────────── */
  _buildMessage() {
    const s    = window.__calcState ?? {};
    const name = this.mount.querySelector('#bf-name')?.value.trim()  || '';
    const ph   = this.mount.querySelector('#bf-phone')?.value.trim() || '';
    const city = this.mount.querySelector('#bf-city')?.value.trim()  || '';
    const notes = this.mount.querySelector('#bf-notes')?.value.trim() || '';

    const L = this._labels();

    const validPassports = this.passports.filter(p => p.name || p.number);

    const lines = [
      L.title,
      '',
      L.tripHead,
      `• ${L.destination} : ${s.tripName || '—'}`,
      s.hotel  ? `• ${L.hotel} : ${s.hotel}`          : null,
      s.date   ? `• ${L.date} : ${ltr(s.date)}`        : null,
      s.room   ? `• ${L.room} : ${s.room}`             : null,
      s.adults ? `• ${L.adults} : ${s.adults}`         : null,
      (s.kids?.length) ? `• ${L.kids} : ${s.kids.length}` : null,
      s.totalDA ? `• ${L.price} : ${ltr(fmt(s.totalDA))}` : null,
      s.totalUSD ? `• ${L.localTax(s.totalUSD)}` : null,
      '',
      L.ownerHead,
      name ? `• ${L.nameField} : ${name}`  : L.nameEmpty,
      ph   ? `• ${L.phone} : ${ltr(ph)}`   : null,
      city ? `• ${L.city} : ${city}`       : null,
    ];

    if (validPassports.length) {
      lines.push('', L.passHead);
      validPassports.forEach((p, i) => {
        const parts = [
          p.name   ? p.name   : null,
          p.number ? L.passNum(p.number) : null,
          p.expiry ? L.passExpiry(ltr(p.expiry)) : null,
          p.dob    ? L.passDob(ltr(p.dob)) : null,
        ].filter(Boolean);
        lines.push(`• ${L.traveler} ${i + 1} : ${parts.join(' · ') || '—'}`);
      });
    }

    if (this.uploads.length) {
      lines.push('', L.uploads(this.uploads.length));
    }

    if (notes) {
      lines.push('', L.note(notes));
    }

    lines.push('', L.thanks);

    return lines.filter(l => l !== null).join('\n');
  }

  /* ── Validation gate ─────────────────────────────────────────
     Returns { ok, fields: { id: errorMessage|null } }. Renders inline
     error UI (.is-invalid + .bf-field-err visibility) as a side effect
     and toggles the WhatsApp/email send buttons accordingly. */
  _validate({ silent = false } = {}) {
    const fields = ['bf-name', 'bf-phone', 'bf-city'];
    const errors = {};
    let ok = true;

    fields.forEach(id => {
      const inp = this.mount.querySelector('#' + id);
      if (!inp) return;
      const v = (inp.value || '').trim();
      let err = null;

      // Required + minlength
      if (inp.hasAttribute('required') && !v) {
        err = inp.dataset.errEmpty || 'Champ requis.';
      } else if (inp.minLength > 0 && v.length < inp.minLength) {
        err = `Minimum ${inp.minLength} caractères.`;
      } else if (inp.pattern && v && !new RegExp(`^(?:${inp.pattern})$`).test(v)) {
        err = inp.getAttribute('aria-describedby')
          ? this.mount.querySelector('#' + inp.getAttribute('aria-describedby'))?.textContent || 'Format invalide.'
          : 'Format invalide.';
      }

      errors[id] = err;
      if (err) ok = false;

      if (!silent) {
        inp.classList.toggle('is-invalid', !!err);
        inp.setAttribute('aria-invalid', err ? 'true' : 'false');
        const errEl = this.mount.querySelector('#' + id + '-err');
        if (errEl) errEl.hidden = !err;
      }
    });

    return { ok, errors };
  }

  /* ── Live preview update ─────────────────────────────────── */
  _liveUpdate() {
    const msg = this._buildMessage();
    const preview = this.el.msgPreview;
    if (!preview) return;

    // v22 Agent 3 — empty-state guard.
    // If the calculator has no hotel selected AND the user hasn't typed
    // anything into the contact fields, render a friendly empty-state
    // instead of a barely-filled WhatsApp preview. The skeleton message
    // is intimidating before the user has done anything.
    const calc = window.__calcState;
    const hasCalcSelection = !!(calc && calc.hotel);
    const name = this.mount.querySelector('#bf-name')?.value.trim();
    const phone = this.mount.querySelector('#bf-phone')?.value.trim();
    const hasContact = !!(name || phone);
    if (!hasCalcSelection && !hasContact) {
      // Empty-state copy, localized at injection time off <html lang> via
      // _lang(). This preview is re-rendered on every keystroke (debounced
      // _liveUpdate), so we resolve the string here rather than relying on the
      // i18n baseline — mirrors _renderTripSummary()'s SUM[this._lang()] pattern.
      const EMPTY = {
        fr: 'Configurez votre voyage avec le calculateur ci-dessus — votre récap WhatsApp apparaîtra ici.',
        en: 'Configure your trip with the calculator above — your WhatsApp summary will appear here.',
        ar: 'اضبط رحلتك باستخدام الحاسبة أعلاه — سيظهر ملخّص واتساب الخاص بك هنا.'
      };
      const emptyMsg = EMPTY[this._lang()] || EMPTY.fr;
      preview.innerHTML = `<p class="bform-preview__empty">${emptyMsg}</p>`;
      // Keep the send buttons disabled in this state — fall through to the
      // _validate() block below so href/aria stay coherent.
    } else {
      // Escape HTML but preserve bold (*text*)
      const escaped = msg
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*(.+?)\*/g, '<strong>$1</strong>');

      preview.innerHTML = `<pre>${escaped}</pre>`;
    }

    // Validate silently for the gate (don't show errors until user tries to send
    // or has touched the field). _validate() with silent:true skips the UI render.
    const { ok } = this._validate({ silent: true });

    // Toggle send buttons. Disable visually + via inert pointer-events when invalid.
    const btn = this.el.sendBtn;
    if (btn) {
      btn.href = `https://wa.me/${this.WA_NUMBER}?text=${encodeURIComponent(msg)}`;
      btn.classList.toggle('is-disabled', !ok);
      btn.style.pointerEvents = ok ? '' : 'none';
      btn.style.opacity = ok ? '' : '.45';
      btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    }
    const ebtn = this.el.emailBtn;
    if (ebtn) {
      const subjectLead = { fr: 'Demande de devis', en: 'Quote request', ar: 'طلب عرض سعر' }[this._lang()] || 'Demande de devis';
      const subject = `${subjectLead} — ${this._tripName()}`;
      ebtn.href = `mailto:${this.EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
      ebtn.classList.toggle('is-disabled', !ok);
      ebtn.style.pointerEvents = ok ? '' : 'none';
      ebtn.style.opacity = ok ? '' : '.45';
      ebtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    }

    // Hint banner above preview when invalid (but only after user has interacted)
    const banner = this.mount.querySelector('#bf-validation-banner');
    if (banner) {
      const touched = this.mount.querySelector('.is-invalid, [aria-invalid="true"]');
      banner.hidden = ok || !touched;
    }
  }

  /* Pull a short trip name from the page title for the email subject */
  _tripName() {
    const t = document.title || this.AGENCY;
    return t.split(/\s[—··]\s/)[0].trim() || this.AGENCY;
  }

  /* Robust copy: try the modern Clipboard API first, fall back to a
     hidden textarea + document.execCommand('copy') for older browsers
     and non-secure contexts. Returns true on success. */
  async _copy(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) { /* permissions denied — fall through */ }
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  _scheduleUpdate() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._liveUpdate(), 160);
  }

  /* ── Bind all events ─────────────────────────────────────── */
  _bindAll() {
    // Text inputs → live update
    ['bf-name','bf-phone','bf-city','bf-notes'].forEach(id => {
      const el = this.mount.querySelector(`#${id}`);
      el?.addEventListener('input', () => this._scheduleUpdate());
      // On blur, run full validation (with UI) for that field only — but only
      // if the user actually typed something. This avoids screaming at an
      // empty form on first focus.
      el?.addEventListener('blur', () => {
        if (id === 'bf-notes') return; // optional field
        if (!el.value.trim() && !el.classList.contains('is-invalid')) return;
        this._validate(); // full UI render
        this._liveUpdate();
      });
    });

    // Click gate on send buttons: if invalid, run validation with UI and stop
    // the navigation so the user sees what's missing. Once they fix it the
    // button re-enables on the next _liveUpdate().
    const sendGate = (e) => {
      const { ok } = this._validate();
      if (!ok) {
        e.preventDefault();
        // Focus first invalid field for keyboard / SR users
        const firstBad = this.mount.querySelector('.is-invalid');
        firstBad?.focus();
        firstBad?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.AT_showToast?.('Veuillez compléter les champs marqués', 'error');
      }
    };
    this.el.sendBtn?.addEventListener('click', sendGate);
    this.el.emailBtn?.addEventListener('click', sendGate);

    // Add passport row
    this.el.ppConsent?.addEventListener('change', () => {
      const on = this.el.ppConsent.checked;
      if (this.el.ppFields) this.el.ppFields.hidden = !on;
      if (!on) {
        // Withdrawing consent must drop the data, not merely hide the fields —
        // otherwise a cleared checkbox still ships passport numbers to WhatsApp.
        this.passports = [{}];
        this._renderPassports?.();
        this._scheduleUpdate?.();
      }
    });

    this.el.addPassport?.addEventListener('click', () => {
      this.passports.push({});
      this._renderPassports();
      this._liveUpdate();
    });

    // Upload zone click
    this.el.uploadZone?.addEventListener('click', () => {
      this.el.fileInput?.click();
    });

    // File input change
    this.el.fileInput?.addEventListener('change', (e) => {
      this._handleFiles(e.target.files);
      e.target.value = '';
    });

    // Drag & drop
    this.el.uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.el.uploadZone.classList.add('drag-over');
    });
    this.el.uploadZone?.addEventListener('dragleave', () => {
      this.el.uploadZone.classList.remove('drag-over');
    });
    this.el.uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.el.uploadZone.classList.remove('drag-over');
      this._handleFiles(e.dataTransfer.files);
    });

    // Copy button — async clipboard with execCommand fallback
    this.el.copyBtn?.addEventListener('click', async () => {
      const msg = this._buildMessage();
      const ok = await this._copy(msg);
      if (!ok) {
        window.AT_showToast?.('Impossible de copier — sélectionnez le texte manuellement', 'error');
        return;
      }
      const btn = this.el.copyBtn;
      // Capture the label ONCE per confirmation cycle. A second click inside
      // the 2s window used to capture the already-swapped "Copié !" markup
      // and restore *that*, so the button kept saying "Copié !" for good.
      if (btn._copyResetTimer) clearTimeout(btn._copyResetTimer);
      else btn._copyOrigHTML = btn.innerHTML;
      btn.innerHTML = `${icon('check')} Copié&nbsp;!`;
      btn.classList.add('copied');
      btn._copyResetTimer = setTimeout(() => {
        btn._copyResetTimer = null;
        btn.innerHTML = btn._copyOrigHTML;
        btn.classList.remove('copied');
      }, 2000);
      window.AT_showToast?.('Texte du dossier copié — collez-le où vous voulez');
    });

    // Email button — toast confirms the mail client opened
    this.el.emailBtn?.addEventListener('click', () => {
      // mailto: navigation handles itself; the toast is a safety net so
      // the user knows what happened (mail client may open in background)
      setTimeout(() => {
        window.AT_showToast?.(`Email préparé pour ${this.EMAIL}`);
      }, 200);
    });

    // Listen for calculator state updates
    document.addEventListener('calcStateUpdated', () => {
      this._syncCalc();
      this._liveUpdate();
    });
  }
}

/* ─── Test hook ───────────────────────────────────────────────────
   Expose the pure, security-relevant helpers so the HTML-escaping of
   user input can be regression-tested without a DOM (see
   site/assets/js/booking-form.test.mjs). Mirrors lead-capture.js's
   window.AT_buildLeadPayload. Inert in the browser: two pure functions,
   no side effects — the guard against escapeHtml/renderPassportEntry
   silently losing their escaping lives here. */
if (typeof window !== 'undefined') {
  window.AT_bookingInternals = { escapeHtml, renderPassportEntry };
}

/* ─── Boot ────────────────────────────────────────────────────── */
function boot() {
  const mount = document.getElementById('booking');
  if (!mount) return;
  new BookingForm(mount);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();   // already loaded (script ran after DOMContentLoaded)
}

})();
