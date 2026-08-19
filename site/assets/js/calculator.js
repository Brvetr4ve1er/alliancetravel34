/**
 * Alliance Travel — Live Pricing Calculator
 * Binds to .calc-section on the page, reads TRIP_DATA from the window,
 * re-renders the breakdown in real-time on every input change.
 */

// Guard against NaN/undefined ever reaching the UI as "NaN DA".
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number.isFinite(n) ? n : 0) + ' DA';

// --- Past-due departure filtering -----------------------------------------
// Parse the END date of a French departure label into a Date. Handles
// "13 – 20 Juin 2026", "27 Juin – 04 Juillet 2026" and single "3 Septembre 2026".
const _FR_MONTHS = { 'janvier':0,'février':1,'fevrier':1,'mars':2,'avril':3,'mai':4,'juin':5,'juillet':6,'août':7,'aout':7,'septembre':8,'octobre':9,'novembre':10,'décembre':11,'decembre':11 };
function parseDepartureEnd(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  const years = s.match(/\d{4}/g);
  const parts = s.split(/[–—-]/);                 // en/em dash or hyphen range
  const endPart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const startPart = parts[0];
  const dm = endPart.match(/(\d{1,2})/);
  const day = dm ? +dm[1] : 1;
  const monthFrom = (txt) => { for (const k in _FR_MONTHS) if (txt.includes(k)) return _FR_MONTHS[k]; return null; };
  let month = monthFrom(endPart);
  const startMonth = monthFrom(startPart);
  if (month == null) month = startMonth;
  if (month == null) return null;
  // Use the LAST 4-digit run as the end year (cross-year ranges spell out both);
  // if only one year is present and the end month wraps below the start, add 1.
  let year = years && years.length ? +years[years.length - 1] : new Date().getFullYear();
  if (years && years.length === 1 && startMonth != null && month < startMonth) year += 1;
  return new Date(year, month, day);
}
// Bookable if the departure's end date is today or later (client clock).
function isFutureDeparture(str) {
  const d = parseDepartureEnd(str);
  if (!d) return true;                            // unparseable → keep, don't hide
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

class TripCalculator {
  constructor() {
    this.trip = window.TRIP_DATA;
    if (!this.trip) return;

    this.state = {
      hotelId:  this.trip.hotels[0]?.id ?? null,
      date:     this.trip.dates[0]     ?? null,
      room:     'double',
      adults:   2,
      kids:     [],  // [{ age: 5 }, ...]
      extras:   this.trip.extras.map(e => ({ ...e, checked: false })),
    };

    this.el = {
      dateChips:    document.querySelectorAll('.date-chip'),
      segOpts:      document.querySelectorAll('.seg-opt'),
      adultsMinus:  document.getElementById('adults-minus'),
      adultsPlus:   document.getElementById('adults-plus'),
      adultsVal:    document.getElementById('adults-val'),
      kidsSteppers: document.querySelectorAll('.kid-stepper'),
      extraToggles: document.querySelectorAll('.extra-toggle'),
      hotelSel:     document.getElementById('hotel-select'),
      breakdown:    document.getElementById('breakdown-lines'),
      totalEl:      document.getElementById('breakdown-total'),
      usdEl:        document.getElementById('breakdown-usd'),
      whatsappBtn:  document.getElementById('wa-book-btn'),
      stickyTotal:  document.getElementById('sticky-total-amount'),
      stickyBtn:    document.getElementById('sticky-cta-btn'),
      whyDetails:   document.getElementById('breakdown-why-details'),
    };

    this.pruneDates();
    this.bind();
    this.syncHotelFromPicker();
    this.render();
    this.initIntersectionObs();
  }

  /**
   * Hide departure chips whose end date is already in the past (vs the
   * client's clock) and re-anchor the active chip + state to the first
   * still-bookable date. Also trims TRIP_DATA.dates so the WhatsApp summary
   * never offers a past departure. Past dates vanish automatically as the
   * season advances — no manual pruning per page.
   */
  pruneDates() {
    const chips = [...this.el.dateChips];
    if (chips.length) {
      let firstVisible = null;
      chips.forEach(chip => {
        if (!isFutureDeparture(chip.dataset.date)) {
          chip.style.display = 'none';
          chip.classList.remove('active');
          chip.setAttribute('aria-checked', 'false');
          chip.setAttribute('tabindex', '-1');
        } else if (!firstVisible) {
          firstVisible = chip;
        }
      });
      if (firstVisible) {
        chips.forEach(c => {
          const on = c === firstVisible;
          c.classList.toggle('active', on);
          c.setAttribute('aria-checked', on ? 'true' : 'false');
          c.setAttribute('tabindex', on ? '0' : '-1');
        });
        this.state.date = firstVisible.dataset.date;
      }
    }
    if (Array.isArray(this.trip.dates)) {
      const future = this.trip.dates.filter(isFutureDeparture);
      if (future.length) { this.trip.dates = future; this.state.date = this.state.date ?? future[0]; }
      else { this.trip.dates = []; this.state.date = null; }
    }
  }

  bind() {
    // Date chips — ARIA radiogroup. Keep .active, aria-checked AND the
    // roving tabindex in sync. (Bug fix: the old handler only moved
    // .active, so the first chip's hardcoded aria-checked="true" kept it
    // painted as selected via the `.date-chip[aria-checked="true"]` rule
    // even after another date was picked — two chips looked selected.)
    this.el.dateChips.forEach(chip => {
      chip.addEventListener('click', () => this.selectDateChip(chip));
      // Arrow-key navigation within the radiogroup (a11y).
      chip.addEventListener('keydown', e => {
        // Only navigate between still-bookable chips: pruneDates() hides past
        // departures with display:none, and the old full-NodeList walk let a
        // keyboard user land on a hidden past date (corrupting state.date and
        // stranding focus on a display:none element).
        const chips = [...this.el.dateChips].filter(c => c.style.display !== 'none');
        const i = chips.indexOf(chip);
        if (i < 0) return;
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = chips[(i + 1) % chips.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = chips[(i - 1 + chips.length) % chips.length];
        if (next) { e.preventDefault(); this.selectDateChip(next); next.focus(); }
      });
    });

    // Room type (segmented)
    this.el.segOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        this.state.room = opt.dataset.room;
        this.el.segOpts.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.render();
      });
    });

    // Adults stepper
    this.el.adultsMinus?.addEventListener('click', () => {
      if (this.state.adults > 1) { this.state.adults--; this.syncStepper(); this.render(); }
    });
    this.el.adultsPlus?.addEventListener('click', () => {
      if (this.state.adults < 8) { this.state.adults++; this.syncStepper(); this.render(); }
    });

    // Children steppers (data-kid-type="child_a|child_b|baby")
    this.el.kidsSteppers.forEach(row => {
      const minusBtn = row.querySelector('.kid-minus');
      const plusBtn  = row.querySelector('.kid-plus');
      const valEl    = row.querySelector('.kid-val');
      const type     = row.dataset.kidType;
      let count = 0;

      minusBtn?.addEventListener('click', () => {
        if (count < 1) return;
        count--;
        valEl.textContent = count;
        this.buildKids();
        this.render();
        this.updateStepperBtns(minusBtn, plusBtn, count, 0, 4);
      });
      plusBtn?.addEventListener('click', () => {
        if (count >= 4) return;
        count++;
        valEl.textContent = count;
        this.buildKids();
        this.render();
        this.updateStepperBtns(minusBtn, plusBtn, count, 0, 4);
      });
      this.updateStepperBtns(minusBtn, plusBtn, count, 0, 4);
    });

    // Extras
    this.el.extraToggles.forEach((toggle, i) => {
      toggle.addEventListener('click', () => {
        this.state.extras[i].checked = !this.state.extras[i].checked;
        toggle.classList.toggle('checked', this.state.extras[i].checked);
        // role="checkbox" — keep aria-checked in sync (was never updated,
        // so screen readers always announced "unchecked").
        toggle.setAttribute('aria-checked', this.state.extras[i].checked ? 'true' : 'false');
        const checkIcon = toggle.querySelector('.extra-toggle__check');
        if (checkIcon) checkIcon.innerHTML = this.state.extras[i].checked
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:#fff"><polyline points="20 6 9 17 4 12"/></svg>'
          : '';
        this.render();
      });
    });

    // Hotel dropdown (if no picker)
    this.el.hotelSel?.addEventListener('change', () => {
      this.state.hotelId = this.el.hotelSel.value;
      this.render();
    });

    // WhatsApp button
    this.el.whatsappBtn?.addEventListener('click', () => this.openWhatsApp());
    this.el.stickyBtn?.addEventListener('click', () => this.openWhatsApp());

    // Re-render when the language switches so dynamic strings (esp. the
    // "Pourquoi ce prix" details) re-localize immediately instead of staying
    // in the language they were last drawn in.
    document.addEventListener('langchange', () => this.render());

    // Listen for hotel selection from the picker cards
    document.addEventListener('hotelSelected', e => {
      this.state.hotelId = e.detail.id;
      if (this.el.hotelSel) this.el.hotelSel.value = e.detail.id;
      this.render();
      // Smooth scroll to calculator and flash it
      const calcEl = document.getElementById('calculator');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => calcEl.querySelector('.breakdown')?.classList.add('highlight-flash'), 400);
        setTimeout(() => calcEl.querySelector('.breakdown')?.classList.remove('highlight-flash'), 1100);
      }
    });
  }

  selectDateChip(chip) {
    if (!chip) return;
    this.state.date = chip.dataset.date;
    this.el.dateChips.forEach(c => {
      const on = c === chip;
      c.classList.toggle('active', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      c.setAttribute('tabindex', on ? '0' : '-1');
    });
    this.render();
  }

  buildKids() {
    const kids = [];
    document.querySelectorAll('.kid-stepper').forEach(row => {
      const type  = row.dataset.kidType;
      const count = parseInt(row.querySelector('.kid-val')?.textContent || '0');
      // Map type to age representative
      const age = type === 'baby' ? 0 : type === 'child_a' ? 4 : 9;
      for (let i = 0; i < count; i++) kids.push({ age, type });
    });
    this.state.kids = kids;
  }

  syncStepper() {
    if (this.el.adultsVal) this.el.adultsVal.textContent = this.state.adults;
    if (this.el.adultsMinus) this.el.adultsMinus.disabled = this.state.adults <= 1;
    if (this.el.adultsPlus)  this.el.adultsPlus.disabled  = this.state.adults >= 8;
  }

  updateStepperBtns(minBtn, plusBtn, val, min, max) {
    if (minBtn) minBtn.disabled = val <= min;
    if (plusBtn) plusBtn.disabled = val >= max;
  }

  syncHotelFromPicker() {
    // If picker already has a card selected, pick it up
    const sel = document.querySelector('.hotel-card.selected');
    if (sel) this.state.hotelId = sel.dataset.hotelId;
  }

  calculate() {
    const hotel = this.trip.hotels.find(h => h.id === this.state.hotelId);
    if (!hotel) return null;

    const lines = [];
    const room  = this.state.room;

    // Adults
    const rateKey = room === 'triple' ? 'triple' : room === 'single' ? 'single' : 'double';
    const rate = hotel.prices[rateKey] ?? hotel.prices.double ?? 0;
    lines.push({
      label: `${hotel.name} — ${this.roomLabel(room)} × ${this.state.adults} adulte${this.state.adults > 1 ? 's' : ''}`,
      amount: rate * this.state.adults,
      currency: 'DA',
    });

    // Children — priced by TYPE via kidPriceKey() so the charged amount always
    // equals the amount advertised next to each stepper (see _updateKidPriceLabels).
    // (Was insertion-order: a lone "2e enfant" got billed child1 while its label
    // advertised child2. Keying off kid.type removes the contradiction.)
    this.state.kids.forEach(kid => {
      if (kid.type === 'baby' || kid.age < 2) {
        lines.push({ label: 'Bébé (0–2 ans)', amount: hotel.prices.baby, currency: 'DA' });
      } else {
        const priceKey = this.kidPriceKey(kid.type);
        const isFirst = kid.type === 'child_b';
        lines.push({
          label: `${isFirst ? '1ᵉʳ' : '2ᵉ'} enfant (2–11.99 ans)`,
          amount: hotel.prices[priceKey] ?? hotel.prices.child1,
          currency: 'DA',
        });
      }
    });

    // Extras
    const enabledExtras = this.state.extras.filter(e => e.checked);
    enabledExtras.forEach(e => {
      lines.push({ label: e.label, amount: e.amount, currency: e.currency ?? 'DA' });
    });

    const totalDA  = lines.filter(l => l.currency === 'DA').reduce((s, l) => s + l.amount, 0);
    const totalUSD = lines.filter(l => l.currency === 'USD').reduce((s, l) => s + l.amount, 0);
    return { lines, totalDA, totalUSD, hotel };
  }

  render() {
    const result = this.calculate();
    if (!result) {
      if (this.el.breakdown) this.el.breakdown.innerHTML = '<p class="breakdown__empty">Sélectionnez un hôtel pour voir le prix.</p>';
      return;
    }

    const { lines, totalDA, totalUSD, hotel } = result;

    // Lines
    if (this.el.breakdown) {
      this.el.breakdown.innerHTML = lines.map(l => `
        <div class="breakdown__line">
          <span style="color:var(--txt-2)">${l.label}</span>
          <span>${l.currency === 'USD' ? l.amount + ' USD' : fmt(l.amount)}</span>
        </div>`).join('<div class="breakdown__divider"></div>') || '<p class="breakdown__empty">Ajoutez des voyageurs.</p>';
    }

    // Total
    if (this.el.totalEl) this.el.totalEl.textContent = fmt(totalDA);
    if (this.el.usdEl) {
      if (totalUSD > 0) {
        this.el.usdEl.style.display = 'flex';
        this.el.usdEl.textContent = `+ ${totalUSD} USD payable sur place`;
      } else {
        this.el.usdEl.style.display = 'none';
      }
    }

    // Sticky
    if (this.el.stickyTotal) this.el.stickyTotal.textContent = fmt(totalDA);
    // Sticky CTA — value-bearing, localized label ("Réserver · {total}").
    if (this.el.stickyBtn) {
      const reserveLabel = this._labels().reserve;
      this.el.stickyBtn.textContent = reserveLabel + ' · ' + fmt(totalDA);
    }

    // Why — localized. hotel.why may be a French string (legacy) or { fr, en, ar }.
    // When only a French string exists but the UI is EN/AR, fall back to the page's
    // generic localized line (window.AL_PAGE_I18N[lang].calcWhyGeneric) so non-French
    // users no longer see French here. Re-runs on 'langchange' (see bind()).
    if (this.el.whyDetails) {
      const lang = document.documentElement.getAttribute('lang') || 'fr';
      const w = hotel.why;
      let why;
      if (w && typeof w === 'object') {
        why = w[lang] || w.fr || '';
      } else if (lang === 'fr') {
        why = w || '';
      } else {
        const page = window.AL_PAGE_I18N && window.AL_PAGE_I18N[lang];
        why = (page && page.calcWhyGeneric) || w || '';
      }
      this.el.whyDetails.textContent = why || `Prix par personne en chambre ${this.roomLabel(this.state.room)}, vol inclus, transferts inclus, selon la grille tarifaire de ${hotel.name}.`;
    }

    // Surface child/baby prices next to each kid stepper. Reads the selected
    // hotel's tariffs and writes them into the .stepper-item__info <p>. Keeps
    // pricing transparent without the user having to increment a counter first.
    this._updateKidPriceLabels(hotel);

    // Expose state globally for the booking form
    window.__calcState = {
      tripName: this.trip.name,
      hotel:    hotel.name,
      hotelId:  this.state.hotelId,
      date:     this.state.date,
      room:     this.roomLabel(this.state.room),
      adults:   this.state.adults,
      kids:     this.state.kids,
      totalDA,
      totalUSD,
    };
    // Notify booking form of state update
    document.dispatchEvent(new CustomEvent('calcStateUpdated'));
  }

  roomLabel(r) {
    return { double: 'Double', triple: 'Triple', single: 'Individuelle' }[r] ?? r;
  }

  // Single source of truth mapping a kid stepper TYPE to its hotel price key.
  // Both calculate() (what is charged) and _updateKidPriceLabels() (what is
  // advertised) go through this so the two can never diverge. child_b is the
  // "1er enfant" stepper (child1 rate), child_a the "2e enfant" (child2),
  // baby the infant (baby). Falls back to child1 for unknown types.
  kidPriceKey(type) {
    return { child_b: 'child1', child_a: 'child2', baby: 'baby' }[type] ?? 'child1';
  }

  // Active UI language ('fr' | 'en' | 'ar'), read off <html lang>. Falls back to 'fr'.
  _lang() {
    const l = document.documentElement.getAttribute('lang') || 'fr';
    return (l === 'en' || l === 'ar') ? l : 'fr';
  }

  // Lang-aware room label for the WhatsApp message (and reusable on-page).
  // Keeps roomLabel() (French) untouched so existing behaviour is preserved.
  roomLabelL(r, lang) {
    lang = lang || this._lang();
    const map = {
      fr: { double: 'Double', triple: 'Triple', single: 'Individuelle' },
      en: { double: 'Double', triple: 'Triple', single: 'Single' },
      ar: { double: 'مزدوجة', triple: 'ثلاثية', single: 'فردية' },
    };
    return (map[lang] || map.fr)[r] ?? r;
  }

  // Single source of truth for all per-language UI strings used by both the
  // WhatsApp message (openWhatsApp) and the sticky CTA label (render).
  // {name} is interpolated with the trip name; numbers stay Western digits.
  _labels(lang) {
    lang = lang || this._lang();
    const sets = {
      fr: {
        greeting: (name) => `Bonjour Alliance Travel! Je voudrais réserver le voyage ${name}.`,
        hotel:    'Hôtel choisi',
        date:     'Date de départ',
        room:     'Chambre',
        adults:   (n) => `${n} adulte${n > 1 ? 's' : ''}`,
        kids:     'Enfants/Bébés',
        total:    'Total estimé',
        thanks:   'Merci!',
        reserve:  'Réserver',
      },
      en: {
        greeting: (name) => `Hello Alliance Travel! I'd like to book the trip ${name}.`,
        hotel:    'Chosen hotel',
        date:     'Departure date',
        room:     'Room',
        adults:   (n) => `${n} adult${n > 1 ? 's' : ''}`,
        kids:     'Children/Babies',
        total:    'Estimated total',
        thanks:   'Thank you!',
        reserve:  'Book',
      },
      ar: {
        greeting: (name) => `مرحباً Alliance Travel! أودّ حجز رحلة ${name}.`,
        hotel:    'الفندق المختار',
        date:     'تاريخ المغادرة',
        room:     'الغرفة',
        adults:   (n) => `${n} بالغ`,
        kids:     'أطفال/رضّع',
        total:    'الإجمالي التقديري',
        thanks:   'شكراً!',
        reserve:  'احجز',
      },
    };
    return sets[lang] || sets.fr;
  }

  /**
   * Inject the actual child / baby price for the currently selected hotel
   * into each kid stepper's info paragraph. The base markup uses generic
   * copy ("tarif réduit") which doesn't tell the user what to expect; this
   * method replaces the <p> text with the real number per hotel.
   */
  _updateKidPriceLabels(hotel) {
    const ageBand = { child_b: '2–11.99 ans', child_a: '2–11.99 ans', baby: '0–2 ans' };
    document.querySelectorAll('.stepper-item').forEach(item => {
      const kidStepper = item.querySelector('.kid-stepper');
      if (!kidStepper) return;
      const type = kidStepper.dataset.kidType;
      const age = ageBand[type];
      if (!age) return;
      const cfg = { age, priceKey: this.kidPriceKey(type) };
      const price = hotel.prices[cfg.priceKey];
      if (price == null) return;
      const p = item.querySelector('.stepper-item__info p');
      if (p) p.textContent = `${cfg.age} · ${fmt(price)}`;
    });
  }

  openWhatsApp() {
    const result = this.calculate();
    const hotel  = result?.hotel;
    const total  = result ? fmt(result.totalDA) : '—';
    const lang   = this._lang();
    const L      = this._labels(lang);
    // trip.name, hotel.name and the fmt() total keep Western digits as-is.
    const msg = [
      L.greeting(this.trip.name),
      hotel    ? `${L.hotel} : ${hotel.name}` : '',
      this.state.date ? `${L.date} : ${this.state.date}` : '',
      `${L.room} : ${this.roomLabelL(this.state.room, lang)} — ${L.adults(this.state.adults)}`,
      this.state.kids.length ? `${L.kids} : ${this.state.kids.length}` : '',
      `${L.total} : ${total}`,
      L.thanks,
    ].filter(Boolean).join('\n');

    const num = '213561616266';
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  initIntersectionObs() {
    // Activate fade-up elements when they enter viewport
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.style.animationPlayState = 'running'; obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => {
      el.style.animationPlayState = 'paused';
      obs.observe(el);
    });
  }
}

// Hotel picker — shared across all trip pages
function initHotelPicker() {
  const cards  = document.querySelectorAll('.hotel-card');
  const tabs   = document.querySelectorAll('.tier-tab');

  // Tab filtering
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-pressed', 'false'));
      tab.setAttribute('aria-pressed', 'true');
      const tier = tab.dataset.tier;
      cards.forEach(card => {
        card.style.display = (tier === 'all' || card.dataset.tier === tier) ? '' : 'none';
      });
      checkEmpty();
      // If this tier is a single "formule"/package (all its cards share one
      // hotel id), selecting the tab also reprices the calculator to that
      // package — so circuit/combo formula tabs drive the price. Multi-hotel
      // category tabs (e.g. Tunisia cities) have many ids → choice stays the user's.
      if (tier && tier !== 'all') {
        const ids = [...new Set([...cards].filter(c => c.dataset.tier === tier).map(c => c.dataset.hotelId))];
        const sel = document.getElementById('hotel-select');
        if (ids.length === 1 && sel && sel.value !== ids[0]) {
          sel.value = ids[0];
          sel.dispatchEvent(new Event('change'));
        }
      }
    });
  });

  // Card selection
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const hotelId = card.dataset.hotelId;
      cards.forEach(c => {
        c.classList.remove('selected');
        const btn = c.querySelector('.hotel-card__cta');
        if (btn) btn.textContent = 'Sélectionner';
      });
      card.classList.add('selected');
      // Just swap the label — the v18 CSS handles the visual swap
      // (background flip + ::after content "→" → "✓") via .selected.
      const btn = card.querySelector('.hotel-card__cta');
      if (btn) btn.textContent = 'Sélectionné';
      document.dispatchEvent(new CustomEvent('hotelSelected', { detail: { id: hotelId } }));
    });

    // Keyboard
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
  });

  function checkEmpty() {
    const grid = document.querySelector('.hotel-grid');
    if (!grid) return;
    const visible = [...cards].some(c => c.style.display !== 'none');
    let empty = grid.querySelector('.hotel-empty');
    if (!visible && !empty) {
      // Localize off <html lang> at injection time (mirrors _lang() logic;
      // these are top-level helpers with no `this`). Reset button keeps its
      // inline onclick → resetFilters(), so behavior is unchanged.
      const l = document.documentElement.getAttribute('lang') || 'fr';
      const lang = (l === 'en' || l === 'ar') ? l : 'fr';
      const EMPTY = {
        fr: { msg: 'Aucun hôtel ne correspond aux filtres.', reset: 'Réinitialiser' },
        en: { msg: 'No hotel matches these filters.',        reset: 'Reset' },
        ar: { msg: 'لا يوجد فندق مطابق لعوامل التصفية.',      reset: 'إعادة الضبط' }
      };
      const L = EMPTY[lang];
      empty = document.createElement('div');
      empty.className = 'hotel-empty';
      empty.innerHTML = `<p>${L.msg}</p><button onclick="resetFilters()">${L.reset}</button>`;
      grid.appendChild(empty);
    } else if (visible && empty) {
      empty.remove();
    }
  }
}

window.resetFilters = () => {
  document.querySelectorAll('.tier-tab').forEach((t, i) => t.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'));
  document.querySelectorAll('.hotel-card').forEach(c => c.style.display = '');
};

// Nav scroll effect
function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// FAQ accordion
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// Itinerary interactive nodes
function initTimeline() {
  document.querySelectorAll('.tl-day').forEach(day => {
    day.addEventListener('click', () => {
      document.querySelectorAll('.tl-day.active').forEach(d => d.classList.remove('active'));
      day.classList.add('active');
    });
  });
}

// Keep --sticky-bar-h honest. The token is a static 68px, but the bar
// auto-sizes: 87px in EN, 111px in AR, 118px at 320px FR once the CTA label
// wraps to two lines. Everything that clears the bar reads the token — body
// padding, the FAB lift, the aurora offer margin — so a stale 68px hid the
// last 19-50px of every trip page and parked the FAB on the Réserver button.
// One observer covers viewport resize, FR/EN/AR label swaps, font swap and
// the wrap states; the bar's height never depends on the token, so no loop.
function initStickyBarHeight() {
  const bar = document.getElementById('sticky-total-bar');
  if (!bar || !('ResizeObserver' in window)) return;   // old browsers keep today's behaviour
  const root = document.documentElement;
  new ResizeObserver(() => {
    const h = bar.getBoundingClientRect().height;
    // Above 1024px the bar is display:none (h = 0). Writing 0px would collapse
    // the desktop .aurora-hero__offer margin, which consumes the same token —
    // so drop the override and let the :root 68px fallback stand.
    if (h > 0) root.style.setProperty('--sticky-bar-h', Math.ceil(h) + 'px');
    else root.style.removeProperty('--sticky-bar-h');
  }).observe(bar);
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHotelPicker();
  initFAQ();
  initTimeline();
  initStickyBarHeight();
  new TripCalculator();
});
