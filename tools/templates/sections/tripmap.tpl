<section class="trip-map-section section" id="trip-map-section" aria-label="Carte de l'itinéraire">
  <div class="container">
    <div class="section-head section-head--center u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.mapEyebrow}}>{{tripMap.eyebrow}}</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.mapTitle}}>{{tripMap.titleHtml}}</h2>
      <p class="section-head__sub"{{k.mapSub}}>{{tripMap.subHead}}</p>
    </div>
    <div id="trip-map" role="img" aria-label="{{tripMap.ariaLabel}}">
      <div class="tmap-fallback">
        <div class="tmap-skel-dots" aria-hidden="true">
          <span class="tmap-skel-dot tmap-skel-dot--hotel"></span>
          <span class="tmap-skel-dot tmap-skel-dot--site"></span>
          <span class="tmap-skel-dot tmap-skel-dot--tour"></span>
        </div>
        <p class="tmap-fallback__title"{{k.mapLoading}}>Chargement de la carte…</p>
        <p class="tmap-fallback__sub">{{tripMap.subFallback}}</p>
      </div>
    </div>
    <div class="trip-map-legend" role="list" aria-label="Légende de la carte">
      <span class="trip-map-legend__item" role="listitem"><span class="trip-map-legend__chip trip-map-legend__chip--hotel" aria-hidden="true"></span>{{?k.legendHotels}}<span{{k.legendHotels}}>{{tripMap.legendHotels}}</span>{{:}}{{tripMap.legendHotels}}{{/?}}</span>
      <span class="trip-map-legend__item" role="listitem"><span class="trip-map-legend__chip trip-map-legend__chip--site" aria-hidden="true"></span>{{?k.legendSites}}<span{{k.legendSites}}>{{tripMap.legendSites}}</span>{{:}}{{tripMap.legendSites}}{{/?}}</span>
      <span class="trip-map-legend__item" role="listitem"><span class="trip-map-legend__chip trip-map-legend__chip--tour" aria-hidden="true"></span>{{?k.legendTours}}<span{{k.legendTours}}>{{tripMap.legendTours}}</span>{{:}}{{tripMap.legendTours}}{{/?}}</span>
    </div>
  </div>
</section>
<script>{{&tripMapData}}</script>
<script src="../assets/js/map-base.js" defer></script>
<script src="../assets/js/trip-map.js" defer></script>

