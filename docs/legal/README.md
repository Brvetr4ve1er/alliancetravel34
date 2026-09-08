# docs/legal — Legal, compliance & accessibility audit trail

This folder tracks the legal-and-accessibility hardening pass performed
on branch `claude/legal-a11y-hardening`, spun off from `main`.

## Files here

| File | Purpose |
|------|---------|
| [`CLIENT-DATA-REQUIREMENTS.md`](./CLIENT-DATA-REQUIREMENTS.md) | Bilingual (FR + AR) checklist to send the client. Ten sections covering identity, licence Tour Operator, tax IDs, hosting, data-protection contact, CGV, hotel photos, testimonials, insurance. **Send this to the client first.** |
| [`PHOTOS-TODO.md`](./PHOTOS-TODO.md) | The 17 hotel photos in `site/assets/images/hotels/` that need press-kit / licensed replacements. **Do not push to production** while the current files remain. |
| `README.md` | This file. |

## What was shipped in this branch

### New pages (with `[À REMPLIR]` and `[À CONFIRMER]` placeholders)

- `site/mentions-legales/index.html` — legal notice (Algerian décret 21-197 + loi 04-08)
- `site/politique-confidentialite/index.html` — privacy policy (loi 18-07 / ANPDP)
- `site/politique-cookies/index.html` — cookie & third-party services policy
- `site/conditions-generales/index.html` — CGV (cancellation, payment, visa, insurance…)
- `site/assets/css/legal.css` — shared styles for the four pages above

### Footer links added to every existing page

Homepage + all five trip pages now expose an "Informations légales" column
in the footer linking the four new pages.

### Form-consent gate

- `site/assets/js/booking-form.js` — two required checkboxes (privacy consent + adult certification) gate the WhatsApp / email send buttons.
- `site/index.html` (contact form) — required checkbox for privacy consent.
- `site/assets/css/styles.css` — new `.bform-consent` + `.bform-field--checkbox` styles.

### Privacy notice banner

- `site/assets/js/consent-notice.js` — informational, dismissible, localStorage-remembered.
- Loaded on the homepage + all trip pages; suppressed on the legal pages themselves.
- CSS in `styles.css` under "Privacy notice banner".

### Claims cleaned

- **"Agence agréée"** — removed from `enhance-pro.js` press strip and `i18n.js` hero eyebrow / OG description. Will be restored as `"Agence agréée n° [xxx] — cat. [A/B/C]"` once the client provides the licence number (see CLIENT-DATA-REQUIREMENTS § 3).
- **Cairo "Lettre de garantie pour le visa"** — reworded to **"Attestation d'hébergement"** everywhere it appeared (FAQ JSON-LD, highlight block, FAQ answer). Adds the mandatory disclosure that the visa remains at the consular authority's discretion.
- **Insurance "≥ 100 000 €"** — every trip page now prefixes with "à titre indicatif, plafond minimum recommandé" + adds "Les montants et conditions dépendent de votre assureur".
- **Testimonials** — every trip page's testimonial block now carries the disclaimer *"Prénoms modifiés pour la confidentialité. Avis collectés en agence, originaux disponibles sur demande."*

### Schema.org bait-and-switch fixed

Every trip page's JSON-LD `TouristTrip.offers` changed from a fixed
`Offer { price, InStock }` to `AggregateOffer { lowPrice, highPrice,
offerCount, InStock }` — matches what the calculator can actually
produce.

### Accessibility & HTML validity

- Fixed duplicate `</main>` closing tag on the homepage.
- Fixed two duplicate `class=""` attributes on the homepage.
- Bumped every `var(--txt-3, #8a99a8)` fallback to `#5a6a7c` (WCAG AA
  compliant on the cream background).
- Homepage hero LCP tile now has a descriptive `alt`.
- Added an SR-only text-list alternative to the drag-only interactive
  globe, so screen-reader users still discover every destination.

### Supply chain

- MapLibre loaders in `algeria-map.js` and `trip-map.js` now set
  `crossOrigin="anonymous"` and read from `MAPLIBRE_JS_SRI` /
  `MAPLIBRE_CSS_SRI` constants — currently empty with a TODO and the
  exact `openssl` command to compute them from a machine with outbound
  access to unpkg.com. Fill in before production launch.
- `globe.js` documents why cobe cannot use SRI (dynamic `import()`
  limitation) and lists three mitigations, including self-hosting.

## Still required (blocking public launch)

1. **Client fills in `CLIENT-DATA-REQUIREMENTS.md`** — this replaces
   every `[À REMPLIR]` in the four legal pages.
2. **Juriste review of the CGV** — 17 clauses currently marked
   `[À CONFIRMER : juriste]`. See `site/conditions-generales/index.html`.
3. **Hotel photos** — either replace with licensed / press-kit versions
   or remove; see `PHOTOS-TODO.md`.
4. **Testimonials** — collect signed consent for the pseudonymised names
   OR replace with real signed ones (see CLIENT-DATA-REQUIREMENTS § 8).
5. **SRI hashes for MapLibre** — compute from a machine with network
   access, paste into `algeria-map.js` and `trip-map.js`.
6. **`webmanifest`** — verify all icons still resolve after any asset
   moves.

## Verifying the placeholder markers are gone before deploy

```bash
# Nothing should be printed by these two commands before pushing to prod:
grep -rn '\[À REMPLIR' site/
grep -rn '\[À CONFIRMER' site/
```

Any hit is a blocker.
