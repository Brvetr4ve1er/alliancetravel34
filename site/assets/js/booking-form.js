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
            <label for="bf-name">Nom &amp; Prénom <span class="req">*</span></label>
            <input type="text" id="bf-name" placeholder="Ahmed Benkhalifa"
              autocomplete="name" inputmode="text"/>
          </div>
          <div class="bform-field">
            <label for="bf-phone">Téléphone WhatsApp <span class="req">*</span></label>
            <input type="tel" id="bf-phone" placeholder="0561 616 266"
              autocomplete="tel" inputmode="tel"/>
          </div>
        </div>
        <div class="bform-field">
          <label for="bf-city">Wilaya / Ville <span class="req">*</span></label>
          <input type="text" id="bf-city" placeholder="Bordj Bou Arreridj"
            autocomplete="address-level2"/>
        </div>
      </div>

      <!-- Block 3 · Passport info per traveler -->
      <div class="bform-block">
        <h3 class="bform-block__title">
          ${icon('passport')}
          Informations passeports
        </h3>
        <p class="bform-hint">
          Renseignez les données de chaque voyageur. Ajoutez autant de lignes
          que nécessaire (adultes + enfants avec passeport).
        </p>
        <div id="bf-passports-list"></div>
        <button class="btn btn--ghost btn--sm" id="bf-add-passport" type="button"
          style="width:fit-content;margin-top:var(--s1)">
          ${icon('plus')} Ajouter un voyageur
        </button>
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
          <div id="bf-msg-preview">
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
    calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    passport: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-1a5 5 0 0 1 10 0v1"/></svg>`,
    upload: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    'upload-cloud': `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
    chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    info: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline;vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    whatsapp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    x: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    pdf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`,
  };
  return icons[name] ?? '';
}

/* ─── Passport entry renderer ─────────────────────────────────── */
function renderPassportEntry(idx, data = {}) {
  return `
  <div class="bf-passport-entry" data-idx="${idx}">
    <div class="bf-passport-entry__header">
      <span class="bf-passport-entry__label">Voyageur ${idx + 1}</span>
      ${idx > 0 ? `<button class="bf-passport-entry__remove" data-remove="${idx}" type="button" title="Supprimer">${icon('x')}</button>` : ''}
    </div>
    <div class="bf-passport-grid">
      <div class="bform-field">
        <label>Nom &amp; Prénom</label>
        <input type="text" class="pp-name" data-idx="${idx}"
          placeholder="Ahmed Benkhalifa" value="${data.name || ''}"
          autocomplete="off"/>
      </div>
      <div class="bform-field">
        <label>N° de passeport</label>
        <input type="text" class="pp-num" data-idx="${idx}"
          placeholder="AB 123456" value="${data.number || ''}"/>
      </div>
      <div class="bform-field">
        <label>Date d'expiration</label>
        <input type="text" class="pp-expiry" data-idx="${idx}"
          placeholder="12/2028" value="${data.expiry || ''}"/>
      </div>
      <div class="bform-field">
        <label>Date de naissance</label>
        <input type="text" class="pp-dob" data-idx="${idx}"
          placeholder="15/06/1990" value="${data.dob || ''}"/>
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
      uploadZone:   this.mount.querySelector('#bf-upload-zone'),
      fileInput:    this.mount.querySelector('#bf-files'),
      previews:     this.mount.querySelector('#bf-previews'),
      msgPreview:   this.mount.querySelector('#bf-msg-preview'),
      sendBtn:      this.mount.querySelector('#bf-send-btn'),
      emailBtn:     this.mount.querySelector('#bf-email-btn'),
      copyBtn:      this.mount.querySelector('#bf-copy-btn'),
    };

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

    if (!s || !s.hotel) {
      el.innerHTML = `<p class="bf-trip-empty">Configurez votre voyage dans la section <strong>Tarifs</strong> ci-dessus pour voir votre sélection ici.</p>`;
      return;
    }

    const chips = [
      { label: 'Destination', val: s.tripName },
      { label: 'Hôtel',       val: s.hotel },
      { label: 'Date',        val: s.date || '—' },
      { label: 'Chambre',     val: s.room },
      { label: 'Adultes',     val: s.adults },
      s.kids?.length ? { label: 'Enfants/Bébés', val: s.kids.length } : null,
      s.totalDA ? { label: 'Total estimé', val: fmt(s.totalDA), highlight: true } : null,
    ].filter(Boolean);

    el.innerHTML = `<div class="bf-trip-chips">
      ${chips.map(c => `
        <div class="bf-trip-chip">
          <span style="color:var(--txt-3);font-size:.7rem">${c.label}</span>
          <strong style="${c.highlight ? 'color:var(--bronze)' : ''}">${c.val}</strong>
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
  _handleFiles(files) {
    [...files].forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploads.push({ name: file.name, url: e.target.result, type: file.type });
        this._renderPreviews();
        this._liveUpdate();
      };
      reader.readAsDataURL(file);
    });
  }

  _renderPreviews() {
    this.el.previews.innerHTML = this.uploads.map((f, i) => {
      const isImg = f.type.startsWith('image/');
      return `
      <div class="upload-thumb">
        ${isImg
          ? `<img src="${f.url}" alt="${f.name}"/>`
          : `<div class="upload-pdf-icon">${icon('pdf')}</div>`}
        <span class="upload-thumb__label">${f.name}</span>
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

  /* ── Message builder ─────────────────────────────────────── */
  _buildMessage() {
    const s    = window.__calcState ?? {};
    const name = this.mount.querySelector('#bf-name')?.value.trim()  || '';
    const ph   = this.mount.querySelector('#bf-phone')?.value.trim() || '';
    const city = this.mount.querySelector('#bf-city')?.value.trim()  || '';
    const notes = this.mount.querySelector('#bf-notes')?.value.trim() || '';

    const validPassports = this.passports.filter(p => p.name || p.number);

    const lines = [
      '🌍 *Demande de réservation — Alliance Travel*',
      '',
      '📋 *VOYAGE SÉLECTIONNÉ*',
      `• Destination : ${s.tripName || '—'}`,
      s.hotel  ? `• Hôtel : ${s.hotel}`          : null,
      s.date   ? `• Date de départ : ${s.date}`   : null,
      s.room   ? `• Chambre : ${s.room}`           : null,
      s.adults ? `• Adultes : ${s.adults}`         : null,
      (s.kids?.length) ? `• Enfants/Bébés : ${s.kids.length}` : null,
      s.totalDA ? `• Prix estimé : ${fmt(s.totalDA)}` : null,
      s.totalUSD ? `• Taxe locale : ${s.totalUSD} USD (sur place)` : null,
      '',
      '👤 *RESPONSABLE DU DOSSIER*',
      name ? `• Nom : ${name}`             : '• Nom : (non renseigné)',
      ph   ? `• Téléphone WA : ${ph}`      : null,
      city ? `• Wilaya/Ville : ${city}`    : null,
    ];

    if (validPassports.length) {
      lines.push('', '📄 *INFORMATIONS PASSEPORTS*');
      validPassports.forEach((p, i) => {
        const parts = [
          p.name   ? p.name   : null,
          p.number ? `N° ${p.number}` : null,
          p.expiry ? `Exp. ${p.expiry}` : null,
          p.dob    ? `Né(e) le ${p.dob}` : null,
        ].filter(Boolean);
        lines.push(`• Voyageur ${i + 1} : ${parts.join(' · ') || '—'}`);
      });
    }

    if (this.uploads.length) {
      lines.push('', `📎 *${this.uploads.length} copie(s) de passeport* seront envoyées dans ce chat.`);
    }

    if (notes) {
      lines.push('', `💬 *NOTE :* ${notes}`);
    }

    lines.push('', 'Merci ! ✅');

    return lines.filter(l => l !== null).join('\n');
  }

  /* ── Live preview update ─────────────────────────────────── */
  _liveUpdate() {
    const msg = this._buildMessage();
    const preview = this.el.msgPreview;
    if (!preview) return;

    // Escape HTML but preserve bold (*text*)
    const escaped = msg
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*(.+?)\*/g, '<strong>$1</strong>');

    preview.innerHTML = `<pre>${escaped}</pre>`;

    // Enable send buttons (WhatsApp primary + email secondary)
    const btn = this.el.sendBtn;
    if (btn) {
      btn.href = `https://wa.me/${this.WA_NUMBER}?text=${encodeURIComponent(msg)}`;
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
    }
    const ebtn = this.el.emailBtn;
    if (ebtn) {
      const subject = `Demande de devis — ${this._tripName()}`;
      ebtn.href = `mailto:${this.EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
      ebtn.style.pointerEvents = '';
      ebtn.style.opacity = '';
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
    });

    // Add passport row
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
      const orig = btn.innerHTML;
      btn.innerHTML = `${icon('check')} Copié&nbsp;!`;
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
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
