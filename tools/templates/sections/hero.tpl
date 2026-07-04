<section class="scroll-hero" data-region="{{region}}"
         data-bg="{{hero.bg}}"
         data-fg="{{hero.fg}}"
         data-title-pre="{{hero.titlePre}}"
         data-title-post="{{hero.titlePost}}"
         data-eyebrow="{{hero.eyebrow}}"
         data-date="{{hero.date}}"
         data-prompt="{{hero.prompt}}"
         data-skip="{{hero.skip}}"{{k.heroKeys}}>
  <div class="scroll-hero__continuation">
    <h1{{k.heroH1}}>{{hero.h1Pre}}<em>{{hero.h1Em}}</em></h1>
    <p{{k.heroLede}}>{{hero.lede}}</p>
    <div class="hero__price">
      <strong>{{hero.priceFrom}}</strong><span{{k.heroPriceUnit}}>{{hero.priceUnit}}</span>
    </div>
    <p class="hero-fineprint"{{k.heroFineprint}}>{{hero.fineprint}}</p>
    <div class="hero__ctas">
      <a href="#calculator" class="btn btn--primary" data-track-event="hero_cta_calculate"{{k.heroCtaCalc}}>Calculer mon prix</a>
      <a href="https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." class="btn btn--ghost" data-track-event="hero_cta_whatsapp" target="_blank" rel="noopener">WhatsApp</a>
    </div>
    <!-- v21 phase E.2: .calc-cta-hint removed from hero — calculator UI is self-explanatory. --></div>
</section>
