<section class="calc-section section" id="calculator"{{k.calcSection}}>
  <div class="container">
    <div class="section-head">
      <span class="phase-marker"><span class="phase-marker__num">3</span><span class="phase-marker__label"{{k.calcPhase}}>{{calcUi.phaseLabel}}</span></span>{{?calcUi.eyebrow}}<p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.calcEyebrow}}>{{calcUi.eyebrow}}</p>{{/?}}
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.calcTitle}}>{{calcUi.titleHtml}}</h2>{{?calcUi.sub}}
      <p class="section-head__sub"{{k.calcSub}}>{{calcUi.sub}}</p>{{/?}}
    </div>
    <div class="calc-grid">
      <div class="calc-form"{{k.calcFormAttrs}}>
        <div class="calc-form-group">
          <label class="calc-form-label"{{k.calcDateLabel}}>{{calcUi.dateLabel}}</label>
          <div class="date-chips"{{k.dateChipsRole}}>
{{#calcUi.dateChips}}            <button class="date-chip{{?.active}} active{{/?}}" type="button" role="radio" tabindex="{{?.active}}0{{:}}-1{{/?}}" aria-checked="{{?.active}}true{{:}}false{{/?}}" data-date="{{.value}}"{{.k}}>{{.label}}</button>
{{/calcUi.dateChips}}          </div>
{{?calcUi.dateHint}}          <p{{k.dateHintAttrs}}>{{calcUi.dateHint}}</p>
{{/?}}        </div>
        <div class="calc-form-group">
          <label class="calc-form-label" for="hotel-select"{{k.calcSelectLabel}}>{{calcUi.selectLabel}}</label>
          <select id="hotel-select" class="fs-body-sm u-text-1"{{k.selectAttrs}}>
{{calcUi.optionsHtml}}          </select>
        </div>
        <div class="calc-form-group">
          <label class="calc-form-label"{{k.calcRoomLabel}}>{{calcUi.roomLabel}}</label>
          <div class="segmented"{{k.segmentedAttrs}}>
{{#calcUi.roomOptions}}            <button class="seg-opt{{?.active}} active{{/?}}" data-room="{{.room}}"{{.k}}>{{.label}}</button>
{{/calcUi.roomOptions}}          </div>
        </div>
        <div class="calc-form-group">
          <label class="calc-form-label"{{k.calcTravLabel}}>{{calcUi.travellersLabel}}</label>
          <div class="stepper-row">{{calcUi.steppersHtml}}
          </div>
        </div>
{{calcUi.noteHtml}}      </div>
      <div>
        <div class="breakdown" id="breakdown"{{k.breakdownAttrs}}>
          <div class="breakdown__header"{{k.recap}}>Récapitulatif</div>
          <div class="breakdown__lines" id="breakdown-lines" aria-live="polite"><p class="breakdown__empty"{{k.recapEmpty}}>{{calcUi.emptyMsg}}</p></div>
          <div class="u-divider"></div>
          <div class="breakdown__total"><span class="breakdown__total-label"{{k.totalLabel}}>Total estimé</span><span class="breakdown__total-amount" id="breakdown-total" aria-live="polite" aria-atomic="true">—</span></div>
          <div class="breakdown__usd u-hidden" id="breakdown-usd"></div>
          <div class="breakdown__why"{{k.whyAttrs}}>{{calcUi.whyHtml}}</div>
          <div class="breakdown__ctas">
            <a href="#booking" class="btn btn--primary btn--full" data-track-event="calc_continue_to_booking"{{k.continueA}}>
              <span{{k.continue}}>{{calcUi.continueLabel}}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </a>
          </div>
        </div>
        <p class="fs-caption u-text-3 u-mt-sp3 u-text-center"{{k.nextStep}}>{{calcUi.nextStep}}</p>
      </div>
    </div>
  </div>
</section>
