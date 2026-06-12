/**
 * Alliance Travel — Live Pricing Calculator
 * Binds to .calc-section on the page, reads TRIP_DATA from the window,
 * re-renders the breakdown in real-time on every input change.
 */

// Guard against NaN/undefined ever reaching the UI as "NaN DA".
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number.isFinite(n) ? n : 0) + ' DA';

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

    this.bind();
    this.syncHotelFromPicker();
    this.render();
    this.initIntersectionObs();
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
        const chips = [...this.el.dateChips];
        const i = chips.indexOf(chip);
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

    // Children — first, second, baby per trip rules
    let childIdx = 0;
    this.state.kids.forEach(kid => {
      if (kid.age < 2) {
        lines.push({ label: 'Bébé (0–2 ans)', amount: hotel.prices.baby, currency: 'DA' });
      } else {
        const isFirst = childIdx === 0;
        const priceKey = isFirst ? 'child1' : 'child2';
        const ageLabel = kid.type === 'child_a' ? '2–5 ans' : '2–11.99 ans';
        lines.push({
          label: `${isFirst ? '1ᵉʳ' : (childIdx + 1) + 'ᵉ'} enfant (${ageLabel})`,
          amount: hotel.prices[priceKey] ?? hotel.prices.child1,
          currency: 'DA',
        });
        childIdx++;
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

    // Why
    if (this.el.whyDetails) {
      this.el.whyDetails.textContent = hotel.why ?? `Prix par personne en chambre ${this.roomLabel(this.state.room)}, vol inclus, transferts inclus, selon la grille tarifaire de ${hotel.name}.`;
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

  /**
   * Inject the actual child / baby price for the currently selected hotel
   * into each kid stepper's info paragraph. The base markup uses generic
   * copy ("tarif réduit") which doesn't tell the user what to expect; this
   * method replaces the <p> text with the real number per hotel.
   */
  _updateKidPriceLabels(hotel) {
    const map = {
      child_b: { age: '2–11.99 ans', priceKey: 'child1' },
      child_a: { age: '2–11.99 ans', priceKey: 'child2' },
      baby:    { age: '0–2 ans',     priceKey: 'baby'   },
    };
    document.querySelectorAll('.stepper-item').forEach(item => {
      const kidStepper = item.querySelector('.kid-stepper');
      if (!kidStepper) return;
      const type = kidStepper.dataset.kidType;
      const cfg = map[type];
      if (!cfg) return;
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
    const msg = [
      `Bonjour Alliance Travel! Je voudrais réserver le voyage ${this.trip.name}.`,
      hotel    ? `Hôtel choisi : ${hotel.name}` : '',
      this.state.date ? `Date de départ : ${this.state.date}` : '',
      `Chambre : ${this.roomLabel(this.state.room)} — ${this.state.adults} adulte(s)`,
      this.state.kids.length ? `Enfants/Bébés : ${this.state.kids.length}` : '',
      `Total estimé : ${total}`,
      `Merci!`,
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
      empty = document.createElement('div');
      empty.className = 'hotel-empty';
      empty.innerHTML = '<p>Aucun hôtel ne correspond aux filtres.</p><button onclick="resetFilters()">Réinitialiser</button>';
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

// Boot
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHotelPicker();
  initFAQ();
  initTimeline();
  new TripCalculator();
});
