# Contact Data (canonical)

This is the single source of truth for the agency's contact info. **Don't change these without explicit user direction.** All site pages have been migrated to use exactly these values.

## Phone numbers (the official 6)

| Number | Format | Use |
|---|---|---|
| `0561 61 62 66` | `tel:+213561616266` / `wa.me/213561616266` | General |
| `0561 61 62 67` | `tel:+213561616267` / `wa.me/213561616267` | General |
| `0561 61 62 68` | `tel:+213561616268` / `wa.me/213561616268` | General |
| `0561 61 62 69` | `tel:+213561616269` / `wa.me/213561616269` | General |
| `0560 86 99 05` | `tel:+213560869905` / `wa.me/213560869905` | General |
| `0560 86 06 17` | `tel:+213560860617` / `wa.me/213560860617` | **Primary booking number** (used in WhatsApp dossier link) |

### Format notes

- Display format on the site: `0561 61 62 66` (with spaces, leading 0)
- `tel:` and `wa.me` format: `+213` prefix, drop leading 0, no spaces
- Algerian country code: `+213`
- All 6 are mobile numbers (`05xx` prefix)

## Address (home base)

**Bordj Bou Arreridj, Algeria** — replaced "Sétif" mid-session per user direction.

The agency narrative describes BBA as: *"ville-charnière entre les Hauts-Plateaux et l'Est algérien"* (a hinge city between the High Plateaus and Eastern Algeria).

The agency operates a **6-wilaya network** (mentioned in "Notre histoire") — exact wilaya list is in the homepage `#agences` section's branch cards.

## City reference list (Algeria branches map)

The Algeria map on the homepage (`#agences`) shows pins at:

- **Bordj Bou Arreridj** (HQ — has the central pin with `halo-pulse` ring)
- Plus 6 other cities (the branch cards specify each — read `site/index.html` to confirm exact list)

Connecting routes (5 dashed lines with `route-draw` keyframe) all originate from Bordj Bou Arreridj.

## WhatsApp dossier link

The "Envoyer sur WhatsApp" button on each trip page builds:

```
https://wa.me/213560860617?text=<URL-encoded-dossier>
```

Where `<URL-encoded-dossier>` is the structured French message built by `booking-form.js` from:
- Personal info (name, phone, email, city)
- Trip choice (destination, dates, hotel, room type)
- Pricing (total, deposit, balance — pulled from `window.__calcState`)

## Email

Need to check current value in HTML — wasn't migrated this session as far as the summary notes. Search for `mailto:` in `site/**/*.html` to find the current email if needed.

## Social links

Also not part of this session's migration. Check footer markup in any page for current handles.

## Confirmed via

- `_phone_city_migrate.py` — the migration script that did this work
- All 6 trip pages were checked; all `tel:` and `wa.me` links were verified
- Booking form placeholder updated: `placeholder="Bordj Bou Arreridj"` (was `"Sétif"`)
