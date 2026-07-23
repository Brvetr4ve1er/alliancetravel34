<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>{{meta.title}}</title>
  <meta name="description" content="{{meta.description}}"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="preconnect" href="https://basemaps.cartocdn.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Sans:ital,opsz,wght@1,9..40,400{{?sora}}&family=Sora:wght@600;700{{/?}}&display=swap" rel="stylesheet" fetchpriority="high"/>
  <!-- Returning Arabic-preferring visitors: fetch the Arabic webfont right
       away instead of waiting for the deferred i18n.js to run, so they
       don't pay a visible fallback-font flash on every load. Mirrors the
       hard gate in ensureArabicFont() (i18n.js) — FR/EN visitors never
       trigger this. -->
  <script>try{if(localStorage.getItem('al-lang')==='ar'){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Tajawal:wght@400;700&display=swap';l.dataset.arabicFont='1';document.head.appendChild(l);}}catch(e){}</script>
  <!-- v22: html.js flag for [data-aos] reveal CSS -->
  <script>document.documentElement.classList.add("js");</script>
  <link rel="stylesheet" href="../assets/css/styles.css"/>
  <style>
    :root {
      --accent:      {{accent.color}};
      --accent-dim:  {{accent.dim}};
      --accent-glow: {{accent.glow}};
      --hero-gradient: {{accent.heroGradient}};
    }
  </style>
<!-- Open Graph / Social -->
<meta property="og:type" content="website"/>
<meta property="og:title" content="{{meta.ogTitle}}"/>
<meta property="og:description" content="{{meta.ogDescription}}"/>
<meta property="og:url" content="https://alliance-travel.dz/{{slug}}/"/>
<meta property="og:site_name" content="Alliance Travel"/>
<meta property="og:locale" content="fr_FR"/>
<meta name="twitter:title" content="{{meta.ogTitle}}"/>
<meta name="twitter:description" content="{{meta.ogDescription}}"/>
<meta name="theme-color" content="{{meta.themeColor}}"/>
<link rel="canonical" href="https://alliance-travel.dz/{{slug}}/"/>
<!-- v22 i18n-SEO strategy (c): see docs/I18N-SEO.md -->
<link rel="alternate" hreflang="x-default" href="https://alliance-travel.dz/{{slug}}/"/>
<!-- v21 prod-prep: preload the LCP hero bg image -->
<link rel="preload" as="image" type="image/webp"
      href="{{=d.hero.bg.replace('--bg.jpg','--bg.webp')}}"
      imagesrcset="{{=d.hero.bg.replace('--bg.jpg','--bg--mobile.webp')}} 768w, {{=d.hero.bg.replace('--bg.jpg','--bg.webp')}} 1920w"
      imagesizes="100vw"
      fetchpriority="high"/>
<!-- v21 phase I.2: BreadcrumbList for SERP nav hierarchy -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Accueil",  "item": "https://alliance-travel.dz/" },
    { "@type": "ListItem", "position": 2, "name": "Voyages",  "item": "https://alliance-travel.dz/voyages/" },
    { "@type": "ListItem", "position": 3, "name": "{{jsonLd.breadcrumbName}}", "item": "https://alliance-travel.dz/{{slug}}/" }
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "{{seo.tripName}}",
  "description": "{{seo.tripDescription}}",
  "subjectOf": {
    "@type": "WebPage",
    "url": "https://alliance-travel.dz/{{slug}}/"
  },
  "offers": {
    "@type": "Offer",
    "price": "{{seo.offerPrice}}",
    "priceCurrency": "DZD",
    "availability": "https://schema.org/InStock",
    "url": "https://alliance-travel.dz/{{slug}}/"
  },
  "provider": {
    "@type": "TravelAgency",
    "name": "Alliance Travel",
    "telephone": "+213561616266",
    "url": "https://alliance-travel.dz/",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Boulevard Houari Boumediene, La Graf",
      "addressLocality": "Bordj Bou Arreridj",
      "addressCountry": "DZ"
    }
  }
}
</script>
<!-- AT:faqpage-jsonld START -->
<script type="application/ld+json">{{&faqJsonLd}}</script>
<!-- AT:faqpage-jsonld END -->
<!-- /enrich:meta -->
  <!-- AT:favicons-og START -->
<link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="../assets/images/favicon/favicon-16x16.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="../assets/images/favicon/apple-touch-icon.png"/>
<link rel="icon" type="image/x-icon" href="../assets/images/favicon/favicon.ico"/>
<link rel="manifest" href="../site.webmanifest"/>
<meta property="og:image" content="https://alliance-travel.dz/assets/images/og/{{meta.ogImage}}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:image" content="https://alliance-travel.dz/assets/images/og/{{meta.ogImage}}"/>
<meta name="twitter:card" content="summary_large_image"/>
<!-- AT:favicons-og END -->
</head>
