/* Alliance Travel — agency contact directory.
 * SINGLE SOURCE for the booking-form office picker and the lead `wa_destination`.
 *
 * `wa` is the office's WhatsApp number in INTERNATIONAL format, digits only
 * (country code + number, no "+", spaces or dashes): +213 561 616 266 becomes
 * "213561616266".
 *
 * Each number below is the branch's PRIMARY line, cross-checked against the two
 * places that already carried per-office numbers and agree with each other:
 * the AGENCES section in index.html and the HQ/BRANCHES arrays in
 * assets/js/algeria-map.js. Where an office answers on two lines (La Graf
 * 266/267, Zehour 268/269) the primary is the one algeria-map.js designates.
 *
 *   - The `default:true` office is preselected in the booking form.
 *   - `id` is a stable slug stored on each lead (leads.wa_destination) — do not
 *     rename ids casually; the label is the human-facing text and can change freely.
 *   - Emptying this array (or removing the script) makes the booking form fall
 *     back to a single hardcoded number, exactly as before this feature.
 */
window.AT_CONTACTS = [
  // La Graf (HQ) keeps the number the form used before this feature, so the
  // default office works out-of-the-box with zero change in behaviour.
  { id: 'la-graf', label: 'Bordj Bou Arreridj — La Graf (siège)', wa: '213561616266', default: true },
  { id: 'zehour',  label: 'Bordj Bou Arreridj — Cité Zehour',     wa: '213561616268' },
  { id: 'msila',   label: "M'Sila",                                wa: '213560869905' },
];
