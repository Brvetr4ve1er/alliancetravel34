// site/admin/fields.js — the flat text fields of the trip editor, as data.
//
// Split out of edit-pages.js so it can be READ without a DOM. edit-pages.js
// registers document listeners at module scope, so importing it in Node throws;
// that forced tools/check-admin-fields.mjs to regex the array out of the source,
// and it stopped site/admin/save-errors.js from being tested against the real
// labels at all. The spec is data — it belongs in a file that is only data.
//
// [label, json-path, type]
//
// Every path here MUST be read by a template in tools/templates/sections/.
// A path the templates ignore is invisible when wrong: getPath returns
// undefined so the input renders blank, and setPath happily *creates* the key
// on save — the owner edits, sees "Publié ✓", and nothing changes. Two fields
// shipped that way ("hero.titlePre", "finalCta.scarcity").
// tools/check-admin-fields.mjs enforces the rule at build time; every path
// below was checked against the template AST before being added.
//
// Deliberately absent, and each for a reason:
//   • hero.priceFrom, seo.offerPrice, hotels[].priceFrom/priceMeta,
//     calcUi.optionsHtml — owned by tools/value-graph.mjs, which recomputes them
//     from the price grid on every save. An input here would be overwritten.
//   • inclus.includedCount / excludedCount — generated from the list lengths.
//   • hero.titlePre / titlePost / prompt — validated, rendered by nothing.
export const FIELDS = [
  // ── Référencement et partage ──
  ["Titre SEO (<title>)", "meta.title", "text"],
  ["Meta description", "meta.description", "textarea"],
  ["Titre de partage (WhatsApp, Facebook)", "meta.ogTitle", "text"],
  ["Image de partage (WhatsApp, Facebook)", "meta.ogImage", "image"],
  ["Description de partage", "meta.ogDescription", "textarea"],
  ["Nom du voyage (données Google)", "seo.tripName", "text"],
  ["Description du voyage (données Google)", "seo.tripDescription", "textarea"],
  ["Fil d'Ariane", "jsonLd.breadcrumbName", "text"],
  // ── Hero ──
  ["Hero — photo de fond", "hero.bg", "image"],
  ["Hero — sur-titre", "hero.eyebrow", "text"],
  // The H1 is two slots: hero.tpl renders {{hero.h1Pre}}<em>{{hero.h1Em}}</em>.
  ["Hero — titre (1re partie)", "hero.h1Pre", "text"],
  ["Hero — titre (partie colorée)", "hero.h1Em", "text"],
  ["Hero — dates/durée", "hero.date", "text"],
  ["Hero — texte d'introduction", "hero.lede", "textarea"],
  ["Hero — unité du prix", "hero.priceUnit", "text"],
  ["Hero — mention en petits caractères", "hero.fineprint", "textarea"],
  ["Hero — description pour lecteur d'écran", "hero.aria", "text"],
  // ── Titres de sections ──
  ["Itinéraire — étape", "itinerary.phaseLabel", "text"],
  ["Itinéraire — sur-titre", "itinerary.eyebrow", "text"],
  ["Itinéraire — titre", "itinerary.titleHtml", "text"],
  ["Hôtels — étape", "hotelsSection.phaseLabel", "text"],
  ["Hôtels — sur-titre", "hotelsSection.eyebrow", "text"],
  ["Hôtels — titre", "hotelsSection.titleHtml", "text"],
  ["Hôtels — sous-titre", "hotelsSection.sub", "textarea"],
  ["Carte — sur-titre", "tripMap.eyebrow", "text"],
  ["Carte — titre", "tripMap.titleHtml", "text"],
  ["Carte — sous-titre", "tripMap.subHead", "textarea"],
  ["Carte — description pour lecteur d'écran", "tripMap.ariaLabel", "text"],
  ["Carte — texte affiché pendant le chargement", "tripMap.subFallback", "text"],
  ["Carte — légende « hôtels »", "tripMap.legendHotels", "text"],
  ["Carte — légende « sites »", "tripMap.legendSites", "text"],
  ["Carte — légende « excursions »", "tripMap.legendTours", "text"],
  ["Calculateur — étape", "calcUi.phaseLabel", "text"],
  ["Calculateur — sur-titre", "calcUi.eyebrow", "text"],
  ["Calculateur — titre", "calcUi.titleHtml", "text"],
  ["Calculateur — libellé « date de départ »", "calcUi.dateLabel", "text"],
  ["Appel final — titre", "finalCta.titleHtml", "text"],
  ["Appel final — sous-titre", "finalCta.sub", "textarea"],
  ["Appel final — mention de disponibilité", "finalCta.scarcityHtml", "wrapped"],
];
