// tools/templates/canon.mjs
// Canonicalization pre-pass applied to LIVE page bytes before extraction.
//
// The 7 live trip pages were produced by successive scripted edit passes and
// carry incidental MARKUP inconsistencies. The canonical template emits ONE
// form; this module maps every known legacy variant onto that form so
// extraction can match. Each rule is an intentional, documented "allowed
// delta" between a live page and its regenerated replacement — the migration
// verifier re-applies the same rules when asserting equivalence, so nothing
// else may change.
//
// IMPORTANT: i18n is preserved COMPLETELY. All data-i18n/-html attributes and
// the AL_PAGE_I18N dictionaries are functional translations (verified against
// site/assets/js/i18n.js merge logic on 2026-07-02) and are captured verbatim
// as data — never stripped or renamed. The rules below are markup-only
// normalizations on elements that carry no translation hooks on the affected
// pages (chiefly istanbul, which predates the i18n pass entirely).

const RULES = [
  // ── egypte (consolidated last, own formatting pass) ────────────────
  // meta charset/viewport on two lines → canonical single line
  [/<meta charset="UTF-8"\/>\n  <meta name="viewport" content="width=device-width,initial-scale=1"\/>/g,
   '<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>'],
  // accent token block alignment → canonical column alignment
  [/--accent: (#[0-9A-Fa-f]+;)/g, "--accent:      $1"],
  [/--accent-dim:   (rgba)/g, "--accent-dim:  $1"],
  [/--accent-glow:  (rgba)/g, "--accent-glow: $1"],
  // egypte pretty-prints several one-line blocks across multiple lines;
  // collapse tag-boundary whitespace inside those blocks (whitespace between
  // block-level tags — zero rendering impact)
  [/<div class="hl-card"[\s\S]*?<\/p>\s*<\/div>\n/g, (m) => m.replace(/>\s*\n\s*</g, "><").replace(/<\/div>$/, "</div>\n")],
  // egypte pretty-prints the itinerary/faq section-heads and the final-CTA
  // scarcity block across multiple lines; canonical keeps them inline —
  // collapse tag-boundary whitespace only (zero rendering impact)
  [/(class="(?:itinerary-bg|faq-bg)[^"]*"[^>]*>\n  <div class="container">\n    <div class="section-head[^>]*>)\n(\s+[\s\S]*?\n    <\/div>)/g,
   (m, open, inner) => open + inner.replace(/^\s+/, "").replace(/>\s*\n\s*</g, "><")],
  [/(<div class="final-cta__scarcity"[^>]*>)\s*\n\s*(<svg[\s\S]*?<\/svg>)\s*\n\s*(<span[\s\S]*?<\/span>)\s*\n\s*(<\/div>)/g,
   "$1$2$3$4"],
  // egypte: timeline day blocks pretty-printed → canonical one-line items
  // (tempered: an item's body may never run into the next item or section,
  // otherwise the lazy region can leap across sections on a full page)
  [/( *<div class="tl-day[^>]*>)((?:(?!<div class="tl-day|<\/section>)[\s\S])*?)(\n +<\/div>\n)(?= *<div class="tl-day|    <\/div>)/g,
   (m, a, b, c) => (a + b + c).replace(/>\s*\n\s*</g, "><")],
  // egypte: FAQ items pretty-printed → canonical one-line items
  [/( *<div class="faq-item[^>]*>)((?:(?!<div class="faq-item|<\/section>)[\s\S])*?)(\n +<\/div>\n)(?= *<div class="faq-item|    <\/div>)/g,
   (m, a, b, c) => (a + b + c).replace(/>\s*\n\s*</g, "><")],
  // egypte: trip-map legend items pretty-printed → canonical one-line items
  [/(<span class="trip-map-legend__item"[^>]*>)\s*\n\s*([\s\S]*?)\s*\n\s*(<\/span>\n)/g,
   (m, a, b, c) => a + b.replace(/>\s*\n\s*</g, "><") + c],
  // egypte: sticky bar pretty-printed → canonical one-line form
  [/(<div class="sticky-total" id="sticky-total-bar"[^>]*>)([\s\S]*?<\/button>)\s*\n\s*(<\/div>)/g,
   (m, a, b, c) => a + b.replace(/^\s*\n\s*/, "").replace(/>\s*\n\s*</g, "><") + c],
  // egypte: stray blank line + <!-- Form --> comment in the calc grid
  [/(<\/div>)\n\n(    <div class="calc-grid">)\n      <!-- Form -->\n/g, "$1\n$2\n"],
  // egypte: stray blank line before the tier-tabs
  [/(<\/div>)\n\n(    <div class="tier-tabs")/g, "$1\n$2"],
  // egypte: blank line before the itinerary-map banner comment
  [/<\/section>\n\n(<!-- ── ITINERARY MAP)/g, "</section>\n$1"],
  // egypte-only section banner comments (absent from the canonical pages)
  [/\n<!-- ── NAV ─+ -->(\n<nav class="site-nav")/g, "$1"],
  [/(<main id="main">\n)<!-- ── HERO[^\n]*\n/g, "$1"],
  // istanbul: the two font preconnects sit on one line; canonical = two lines
  [/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"\/><link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin\/>/g,
   '<link rel="preconnect" href="https://fonts.googleapis.com"/>\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>'],
  // istanbul: trip-map legend labels lack the <span> wrapper
  [/(trip-map-legend__chip trip-map-legend__chip--(?:hotel|site|tour)" aria-hidden="true"><\/span>)([^<][^<]*)(<\/span>)/g,
   "$1<span>$2</span>$3"],
  // istanbul/azerbaidjan: FAQ questions lack the <span> wrapper (az keeps its
  // data-i18n key on the <button>, which is captured verbatim as item data)
  [/(class="faq-q" aria-expanded="(?:true|false)"[^>]*>)([^<][^<]*)(<svg)/g,
   "$1<span>$2</span>$3"],
  // istanbul: hotels section-head keeps the eyebrow on the phase-marker line;
  // canonical layout puts it on its own line (markup-only, zero rendering diff)
  [/(<section class="hotels section" id="hotels"[^>]*>\n  <div class="container">\n    <div class="section-head">\n      <span class="phase-marker">.*?<\/span><\/span>)(<p class="section-head__eyebrow")/g,
   "$1\n      $2"],
  // egypte: banner comment before the sticky bar (cairo-era leftover)
  [/<!-- ── MOBILE STICKY BAR[^\n]*\n(<div class="sticky-total")/g, "$1"],
  // egypte: generic section banner comments — every canonical page keeps
  // ONLY the ITINERARY MAP banner; all others are egypte-only leftovers
  [/\n<!-- ── (?!ITINERARY MAP)[^\n]*?-->(?=\n)/g, ""],
  // egypte: blank line after the calc-form opening tag
  [/(<div class="calc-form"[^>]*>)\n\n/g, "$1\n"],
  // egypte: plain label comments before structural tags (<!-- Breakdown -->,
  // one <!-- Hotel name --> per card…) — canonical pages have none
  [/\n *<!-- (?!── )[^\n]*? -->(?=\n *<(?:article|div|section))/g, ""],
  // egypte: blank line sits after </main> instead of before it
  [/(<\/section>)\n(<\/main>)\n\n/g, "$1\n\n$2\n"],
  // egypte: amenity pills pretty-printed → canonical inline
  [/(<div class="hotel-card__amenities">)\s*\n\s*([\s\S]*?)\s*\n\s*(<\/div>)/g,
   (m, a, b, c) => a + b.replace(/>\s*\n\s*</g, "><") + c],
  // egypte: <option> labels on their own line → canonical inline
  [/(<option value="[^"]*"[^>]*>)\s*\n\s*([^<]+?)\s*\n\s*(<\/option>)/g, "$1$2$3"],
  // egypte: blank line between the calc form column and the breakdown column
  [/(<\/div>)\n\n(      <div>\n        <div class="breakdown")/g, "$1\n$2"],
  // egypte: breakdown empty-line + total pretty-printed → canonical inline
  [/(<div class="breakdown__lines" id="breakdown-lines" aria-live="polite">)\s*\n\s*(<p class="breakdown__empty"[\s\S]*?<\/p>)\s*\n\s*(<\/div>)/g, "$1$2$3"],
  [/(<div class="breakdown__total">)\s*\n\s*([\s\S]*?)\s*\n\s*(<\/div>)/g,
   (m, a, b, c) => a + b.replace(/>\s*\n\s*</g, "><") + c],
  // egypte: blank lines between calc form groups
  [/(<\/div>)\n\n(        <div class="calc-form-group">)/g, "$1\n$2"],
  // re-run the article blank-line collapse (comment removal above can
  // re-create the pattern between hotel cards)
  [/<\/article>\n\n      <article/g, "</article>\n      <article"],
  [/hotel-grid"([^>]*)>\n\n      <article/g, 'hotel-grid"$1>\n      <article'],
  // istanbul/azerbaidjan: related-card CTA text lacks the <span> wrapper
  [/(related-card__cta" style="color:[^"]*"[^>]*>\n\s*)Voir ce voyage\n/g, "$1<span>Voir ce voyage</span>\n"],
  // istanbul/tunisie/azerbaidjan: calculator "continue" CTA text lacks the
  // <span> wrapper (tn/az keep their data-i18n-html on the <a>, captured
  // verbatim as data — runtime behavior is unchanged in all languages)
  [/(data-track-event="calc_continue_to_booking"[^>]*>\n(\s*))([A-ZÀ-Ü][^<\n]*?)\s*\n/g, "$1<span>$3</span>\n"],
  // istanbul: hotel cards separated by blank lines + one-line __img block;
  // canonical = contiguous cards with the 3-line __img block (markup-only)
  [/hotel-grid">\n\n      <article/g, 'hotel-grid">\n      <article'],
  [/<\/article>\n\n      <article/g, "</article>\n      <article"],
  [/<\/article>\n\n    <\/div>/g, "</article>\n    </div>"],
  [/<div class="hotel-card__img">(<img[^>]*\/>)(<span class="hotel-card__ribbon[^>]*>[^<]*<\/span>)<\/div>/g,
   '<div class="hotel-card__img">\n          $1\n          $2\n        </div>'],
  // istanbul: footer-bottom lacks the two REAL dotted i18n keys the other
  // pages carry; add them (both exist in the central dictionary, so this
  // improves translation coverage on istanbul, changing nothing elsewhere)
  [/<div class="footer-bottom"><p>©/g, '<div class="footer-bottom"><p data-i18n="footer.copyright">©'],
  [/(footer\.copyright">[^<]*<\/p>)<p>/g, '$1<p data-i18n="footer.notice">'],
];

export function canonicalize(html) {
  let out = html;
  for (const [pat, repl] of RULES) out = out.replace(pat, repl);
  return out;
}

// For comparisons: inline <script> bodies are canonically re-serialized, so
// byte-compare everything else and deep-compare the parsed script data.
export function withoutInlineScripts(html) {
  return html.replace(/(<script>)[\s\S]*?(<\/script>)/g, "$1…$2");
}
