<section class="info-block-section section" id="conditions" aria-label="Informations pratiques pour votre réservation">
  <div class="container">
    <div class="section-head section-head--center">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.infoEyebrow}}>Avant de partir</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.infoTitle}}>Tout ce qu'il <em>faut savoir</em></h2>
      <p class="section-head__sub"{{k.infoSub}}>Paiement, annulation, formalités visa, assurance — la transparence en quatre blocs.</p>
    </div>
    <div class="info-block-grid">
{{#infoBlocks}}
        <details class="info-card"{{?.open}} open{{/?}}>
          <summary class="info-card__head">
            <span class="info-card__icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{{.iconSvg}}</svg>
            </span>
            <span class="info-card__title"{{.kTitle}}>{{.title}}</span>
            <svg class="info-card__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </summary>
          <div class="info-card__body">
{{?.ledeHtml}}            <p class="info-card__lede"{{.kLede}}>{{.ledeHtml}}</p>
{{/?}}            <ul class="info-list">
{{#.list}}              <li{{.k}}>{{.t}}</li>
{{/.list}}            </ul>
{{?.noteHtml}}            <p class="info-card__note"{{.kNote}}>{{.noteHtml}}</p>
{{/?}}          </div>
        </details>

{{/infoBlocks}}    </div>
  </div>
</section>
