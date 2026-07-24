<section class="itinerary-bg section" id="itinerary"{{k.itinSection}}>
  <div class="container">
    <div class="section-head section-head--center"><span class="phase-marker"><span class="phase-marker__num">1</span><span class="phase-marker__label"{{k.itinPhase}}>{{itinerary.phaseLabel}}</span></span>{{?itinerary.eyebrow}}<p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400"{{k.itinEyebrow}}>{{itinerary.eyebrow}}</p>{{/?}}<h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500"{{k.itinTitle}}>{{itinerary.titleHtml}}</h2>{{?itinerary.sub}}<p class="section-head__sub"{{k.itinSub}}>{{itinerary.sub}}</p>{{/?}}</div>
    <div class="timeline timeline--spine">
{{#itinerary.days}}      <div class="tl-day tl-day--{{=i%2===0?"right":"left"}}{{?.active}} active{{/?}}"{{?.wrapperAos}} data-aos="{{=i%2===0?"fade-left":"fade-right"}}" data-aos-delay="{{=i*80}}" data-aos-duration="550"{{/?}}><div class="tl-node" data-aos="zoom-in" data-aos-delay="{{=i*80}}" data-aos-duration="450"{{.kNode}}>{{.node}}</div><div class="tl-content" data-aos="{{=i%2===0?"fade-left":"fade-right"}}" data-aos-delay="{{=i*80}}" data-aos-duration="550"><p class="tl-day-label"{{.kLabel}}>{{.dayLabel}}</p><h3 class="tl-title"{{.kTitle}}>{{.title}}</h3><p class="tl-activities"{{.kAct}}>{{.activities}}</p>{{?.tags}}<div class="tl-tags">{{#.tags}}<span class="tl-tag"{{.k}}>{{.t}}</span>{{/.tags}}</div>{{/?}}</div></div>
{{/itinerary.days}}    </div>
  </div>
</section>
<!-- ── ITINERARY MAP ───────────────────────────────────────────── -->
