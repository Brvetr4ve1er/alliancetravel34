<section class="trust-bg section" id="confiance" aria-label="Témoignages et confiance">
  <div class="container">
    <div class="section-head section-head--center">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.trustEyebrow}}>Plus de 1.200 voyageurs guidés</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.trustTitle}}>Ils nous ont <em>fait confiance</em></h2>
    </div>
    <div class="stats-grid" style="margin-bottom:var(--s10)">
{{#trust.stats}}      <div class="stat-card" data-aos="zoom-in" data-aos-delay="{{=i*100}}" data-aos-duration="600"><span class="stat-card__icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{{=i===0?'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>':i===1?'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>':i===2?'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>':i===3?'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>':'<circle cx="12" cy="12" r="9"/>'}}</svg></span><div class="stat-card__num"{{.kNum}}>{{.num}}</div><p class="stat-card__label"{{.k}}>{{.label}}</p></div>
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
