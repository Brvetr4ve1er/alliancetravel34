<section class="faq-bg section" id="faq"{{k.faqSection}}>
  <div class="container">
    <div class="section-head section-head--center u-text-center u-measure-md u-mx-auto"><p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.faqEyebrow}}>FAQ</p><h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.faqTitle}}>Questions <em>fréquentes</em></h2></div>
    <div class="faq-list">
{{#faq}}      <div class="faq-item{{?.open}} open{{:}}" data-aos="fade-up" data-aos-delay="{{.aosDelay:int}}" data-aos-duration="500{{/?}}"><button class="faq-q" aria-expanded="{{?.open}}true{{:}}false{{/?}}"{{.kBtn}}>{{?.kQ}}<span{{.kQ}}>{{.question}}</span>{{:}}{{.question}}{{/?}}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button><div class="faq-a"{{.kA}}>{{.answerHtml}}</div></div>
{{/faq}}    </div>
  </div>
</section>
