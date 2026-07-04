<section class="trust-bg section" id="confiance" aria-label="Témoignages et confiance">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.trustEyebrow}}>Plus de 1.200 voyageurs guidés</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.trustTitle}}>Ils nous ont <em>fait confiance</em></h2>
    </div>
    <div class="stats-grid" style="margin-bottom:var(--s10)">
{{#trust.stats}}      <div class="stat-card"><div class="stat-card__num"{{.kNum}}>{{.num}}</div><p class="stat-card__label"{{.k}}>{{.label}}</p></div>
{{/trust.stats}}    </div>
    <div class="testimonials-grid">
{{#trust.testimonials}}      <div class="testi-card">
        <div class="testi-stars" aria-label="5 étoiles">★★★★★</div>
        <p class="testi-text"{{.kText}}>{{.text}}</p>
        <div class="testi-author">
          <div class="testi-avatar" aria-hidden="true">{{.initials}}</div>
          <div><p class="testi-name">{{.name}}</p><p class="testi-trip"{{.kTrip}}>{{.trip}}</p></div>
        </div>
      </div>
{{/trust.testimonials}}    </div>
  </div>
</section>
