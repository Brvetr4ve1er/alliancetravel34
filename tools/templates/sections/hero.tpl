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
      <svg class="aurora-hero__pin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
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
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
