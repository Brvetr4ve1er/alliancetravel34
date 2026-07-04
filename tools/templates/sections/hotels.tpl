<section class="hotels section" id="hotels"{{k.hotelsSection}}>
  <div class="container">
    <div class="section-head section-head--center">
      <span class="phase-marker"><span class="phase-marker__num">2</span><span class="phase-marker__label"{{k.hotelsPhase}}>{{hotelsSection.phaseLabel}}</span></span>{{?hotelsSection.eyebrow}}<p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.hotelsEyebrow}}>{{hotelsSection.eyebrow}}</p>{{/?}}
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.hotelsTitle}}>{{hotelsSection.titleHtml}}</h2>
      <p class="section-head__sub"{{k.hotelsSub}}>{{hotelsSection.sub}}</p>
    </div>
{{?hotelsSection.tierTabs}}    <div class="tier-tabs" role="tablist"{{k.tierTabsAria}}>
{{#hotelsSection.tierTabs}}      <button class="tier-tab" role="tab" aria-pressed="{{?.active}}true{{:}}false{{/?}}" data-tier="{{.tier}}" data-track-event="tier_filter" data-track-label="{{.tier2}}"{{.k}}>{{.label}}</button>
{{/hotelsSection.tierTabs}}    </div>
{{/?}}{{?hotelsSection.hint}}    <p class="fs-caption u-text-3 u-mt-sp3" style="margin-bottom:var(--space-6)"{{k.hotelsHint}}>{{hotelsSection.hint}}</p>

{{/?}}    <div class="hotel-grid"{{k.hotelGridAttrs}}>
{{#hotels}}
      <article class="hotel-card" data-aos="fade-up" data-aos-delay="{{.aosDelay:int}}" data-aos-duration="550"{{.kRole}} data-hotel-id="{{.calcId}}" data-tier="{{.tier}}" tabindex="0"{{.kAria}}>
        <div class="hotel-card__img"><img class="hotel-card__photo" src="{{.image}}" alt="{{.alt}}" loading="lazy" width="800" height="600" decoding="async"/><span class="hotel-card__ribbon {{.ribbonClass}}"{{.kRibbon}}>{{.ribbon}}</span></div>
        <div class="hotel-card__body">
          <div class="hotel-card__stars" aria-label="{{.stars:int}} étoiles">{{.starsHtml}}</div>
          <h3 class="hotel-card__name">{{.name}}</h3>
          <div class="hotel-card__amenities">{{#.amenities}}<span class="amenity-pill"{{.k}}>{{.t}}</span>{{/.amenities}}</div>
          <div class="hotel-card__price">
            <span class="hotel-card__price-label"{{.kPriceLabel}}>{{.priceLabel}}</span>
            <strong{{.kPrice}}>{{.priceFrom}}</strong>
            <span class="hotel-card__price-meta"{{.kMeta}}>{{.priceMeta}}</span>
          </div>
          <button class="hotel-card__cta" data-track-event="hotel_select"{{.kCta}}>Sélectionner</button>
        </div>
      </article>
{{/hotels}}
    </div>
  </div>
</section>
