<section class="itinerary-bg section" id="itinerary"{{k.itinSection}}>
  <div class="container">
    <div class="section-head"><span class="phase-marker"><span class="phase-marker__num">1</span><span class="phase-marker__label"{{k.itinPhase}}>{{itinerary.phaseLabel}}</span></span>{{?itinerary.eyebrow}}<p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.itinEyebrow}}>{{itinerary.eyebrow}}</p>{{/?}}<h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.itinTitle}}>{{itinerary.titleHtml}}</h2>{{?itinerary.sub}}<p class="section-head__sub"{{k.itinSub}}>{{itinerary.sub}}</p>{{/?}}</div>
    <div class="timeline">
{{#itinerary.days}}      <div class="tl-day{{?.active}} active{{:}}" data-aos="fade-up" data-aos-delay="{{.aosDelay:int}}" data-aos-duration="550{{/?}}"><div class="tl-node"{{.kNode}}>{{.node}}</div><div class="tl-content"><p class="tl-day-label"{{.kLabel}}>{{.dayLabel}}</p><h4 class="tl-title"{{.kTitle}}>{{.title}}</h4><p class="tl-activities"{{.kAct}}>{{.activities}}</p>{{?.tags}}<div class="tl-tags">{{#.tags}}<span class="tl-tag"{{.k}}>{{.t}}</span>{{/.tags}}</div>{{/?}}</div></div>
{{/itinerary.days}}    </div>
  </div>
</section>
<!-- ── ITINERARY MAP ───────────────────────────────────────────── -->
