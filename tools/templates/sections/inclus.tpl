<section class="inclus-section section" aria-label="Ce qui est inclus et non inclus">
  <div class="container">
    <div class="section-head section-head--center">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.inclEyebrow}}>Tout est dit, rien n'est caché</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.inclTitle}}>Ce qui est <em>inclus</em>, ce qui ne l'est pas</h2>
      <p class="section-head__sub"{{k.inclSub}}>Aucune surprise à l'arrivée. Voici exactement ce que couvre votre forfait — et ce que vous prévoirez en plus.</p>
    </div>
    <div class="inclus-grid">

      <div class="inclus-col reveal">
        <div class="inclus-col__head">
          <div class="inclus-col__icon inclus-col__icon--yes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <h3 class="inclus-col__title"{{k.inclColTitle}}>Inclus dans le <em>forfait</em></h3>
            <p class="inclus-col__count"{{k.inclColCount}}>{{inclus.includedCount}}</p>
          </div>
        </div>
        <div class="inclus-list">
{{#inclus.included}}        <div class="inclus-item inclus-item--yes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          <span{{.k}}>{{.t}}</span>
        </div>
{{/inclus.included}}        </div>
      </div>

      <div class="inclus-col reveal">
        <div class="inclus-col__head">
          <div class="inclus-col__icon inclus-col__icon--no">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <h3 class="inclus-col__title"{{k.exclColTitle}}>À <em>prévoir</em> en plus</h3>
            <p class="inclus-col__count"{{k.exclColCount}}>{{inclus.excludedCount}}</p>
          </div>
        </div>
        <div class="inclus-list">
{{#inclus.excluded}}        <div class="inclus-item inclus-item--no">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span{{.k}}>{{.t}}</span>
        </div>
{{/inclus.excluded}}        </div>
      </div>

    </div>
  </div>
</section>
