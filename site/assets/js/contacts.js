/* Alliance Travel — agency contact directory.
 * SINGLE SOURCE for the booking-form office picker and the lead `wa_destination`.
 *
 * ⚠️ PLACEHOLDER NUMBERS — REPLACE BEFORE PROMOTING ⚠️
 * `wa` must be the office's WhatsApp number in INTERNATIONAL format, digits only
 * (country code + number, no "+", spaces or dashes). Example: +213 561 616 266
 * becomes "213561616266". The audit found the branch numbers inconsistent across
 * the site, so confirm each one with the owner before it goes live.
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
  // TODO(owner): replace the two placeholders below with the real office numbers.
  { id: 'zehour',  label: 'Bordj Bou Arreridj — Cité Zehour',     wa: '000000000000' },
  { id: 'msila',   label: "M'Sila",                                wa: '000000000000' },
];
