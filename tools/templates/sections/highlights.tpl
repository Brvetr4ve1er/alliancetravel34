<section class="highlights section-sm"{{k.hlSection}}>
  <div class="container">
    <div class="highlights__grid">
{{#highlights}}      <div class="hl-card" data-aos="fade-up" data-aos-delay="{{=i*100}}" data-aos-duration="600"><div class="hl-card__icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{{.iconSvg}}</svg></div><span class="hl-card__label"{{.kLabel}}>{{.label}}</span><h2 class="hl-card__title"{{.kTitle}}>{{.title}}</h2><p class="hl-card__body"{{.kBody}}>{{.body}}</p></div>
{{/highlights}}    </div>
  </div>
</section>
