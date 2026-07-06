<!-- ── HERO · Horizon Aurora (v27 full-bleed) ───────────────────────────────── -->
<section class="aurora-hero" data-region="{{region}}" aria-label="{{hero.aria}}">
  <div class="aurora-hero__sky" aria-hidden="true"></div>
  <picture class="aurora-hero__photo">
    <source type="image/avif" media="(max-width:768px)" srcset="{{=d.hero.bg.replace('--bg.jpg','--bg--mobile.avif')}}"/>
    <source type="image/webp" media="(max-width:768px)" srcset="{{=d.hero.bg.replace('--bg.jpg','--bg--mobile.webp')}}"/>
    <source type="image/jpeg" media="(max-width:768px)" srcset="{{=d.hero.bg.replace('--bg.jpg','--bg--mobile.jpg')}}"/>
    <source type="image/avif" srcset="{{=d.hero.bg.replace('--bg.jpg','--bg.avif')}}"/>
    <source type="image/webp" srcset="{{=d.hero.bg.replace('--bg.jpg','--bg.webp')}}"/>
    <img class="aurora-hero__img" src="{{hero.bg}}" alt="" width="1920" height="1280" fetchpriority="high" decoding="async"/>
  </picture>
  <div class="aurora-hero__scrim" aria-hidden="true"></div>

  <div class="aurora-hero__inner">
    <p class="aurora-hero__eyebrow">
      <svg class="aurora-hero__pin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      <span data-i18n="{{keyPrefix}}HeroEyebrow">{{hero.eyebrow}}</span>
    </p>
    <h1 class="aurora-hero__title" data-i18n-html="{{keyPrefix}}HeroH1">{{hero.h1Pre}}<em>{{hero.h1Em}}</em></h1>
    <p class="aurora-hero__date" data-i18n="{{keyPrefix}}HeroDate">{{hero.date}}</p>
  </div>

  <div class="aurora-hero__offer">
    <p class="aurora-hero__price">
      <span class="aurora-hero__from" data-i18n="heroFrom">À partir de</span>
      <strong class="aurora-hero__amount">{{=d.hero.priceFrom.replace('.',' ')}}</strong>
      <span class="aurora-hero__unit" data-i18n="{{keyPrefix}}HeroPriceUnit">{{hero.priceUnit}}</span>
    </p>
    <div class="aurora-hero__actions">
      <a href="#calculator" class="btn btn--primary" data-track-event="hero_cta_calculate" data-i18n="{{keyPrefix}}HeroCtaCalc">Calculer mon prix</a>
      <a href="https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." class="btn btn--ghost aurora-hero__wa" data-track-event="hero_cta_whatsapp" target="_blank" rel="noopener">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-1.14.07-1.84-.12-.42-.13-.97-.31-1.67-.61-2.94-1.27-4.86-4.23-5.01-4.43-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.83 2.04.9 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.14 1.01 2.1 1.33 2.4 1.48.3.15.47.12.65-.07.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.35.07.12.07.71-.17 1.39Z"/></svg>
        WhatsApp</a>
    </div>
  </div>
</section>

<!-- slim intro strip: lede + fineprint (carries {{keyPrefix}}HeroLede / {{keyPrefix}}HeroFineprint) -->
<section class="hero-intro" id="hero-intro" data-region="{{region}}" aria-label="Présentation du voyage">
  <div class="container hero-intro__inner">
    <p class="hero-intro__lede" data-i18n="{{keyPrefix}}HeroLede">{{hero.lede}}</p>
    <p class="hero-intro__fineprint" data-i18n="{{keyPrefix}}HeroFineprint">{{hero.fineprint}}</p>
  </div>
</section>
