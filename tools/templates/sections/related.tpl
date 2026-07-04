<section class="related-section section" aria-label="Vous aimerez aussi">
  <div class="container">
    <div class="section-head section-head--center">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.relEyebrow}}>Vous aimerez aussi</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.relTitle}}>Continuez votre <em>découverte</em></h2>
    </div>
    <div class="related-grid">

{{#related}}      <a href="../{{.slug}}/" class="related-card reveal">
        <div class="related-card__art u-radius-clip">
          {{.artSvg}}
        </div>
        <div class="related-card__body">
          <span class="related-card__flag"{{.kFlag}}>{{.flag}}</span>
          <h3 class="related-card__title"{{.kTitle}}>{{.title}}</h3>
          <p class="related-card__price"{{.kPrice}}>{{.priceHtml}}</p>
          <span class="related-card__cta"{{.kCtaOuter}}>
            {{?.kCta}}<span{{.kCta}}>Voir ce voyage</span>{{:}}Voir ce voyage{{/?}}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </a>
{{/related}}    </div>
  </div>
</section>
