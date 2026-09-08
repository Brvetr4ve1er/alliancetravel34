# PHOTOS-TODO · Copyright risk register

> **Status** — HIGH RISK · 17 hotel photos representing real branded hotels
> are currently shipped in `site/assets/images/hotels/`. No provenance,
> licence, or credit line is documented anywhere in the repo. They were
> most likely scraped from the hotels' own sites or from OTAs (Booking,
> Expedia, Agoda). Using them without authorisation is a copyright
> infringement of the photographer's/hotel's rights and, in Algeria, is
> punishable under **Ordonnance n° 03-05 du 19 juillet 2003** relative
> aux droits d'auteur (up to 500 000 DA fine and asset seizure).

> **Action required** — Replace each file with either:
> 1. A photo from the hotel's own press-kit (email their sales dept.),
> 2. A commissioned photo (photographer + written transfer of rights), or
> 3. A stock-photo licence (Getty / Shutterstock / Adobe Stock — keep the
>    invoice + licence PDF).
>
> Until then, each `<img>` referencing a hotel photo should either be
> **removed** or **replaced** with the generic SVG placeholder that we
> ship in this same commit. Do NOT push to production while these files
> are in the tree.

---

## Files flagged `[REMOVE OR RELICENCE]`

| # | File | Represented hotel | Trip page(s) referencing it |
|---|------|-------------------|------------------------------|
| 1  | `hotel__alpin-due.jpg`        | Alpin Due — Istanbul                 | `site/istanbul/index.html` |
| 2  | `hotel__charmillion.jpg`      | Charmillion Club Aqua Park — Sharm  | `site/cairo-sharm/index.html` |
| 3  | `hotel__cleopatra.jpg`        | Cleopatra Luxury Resort — Sharm     | `site/cairo-sharm/index.html` |
| 4  | `hotel__grand-mercure-kl.jpg` | Grand Mercure — Kuala Lumpur         | `site/kuala-lumpur/index.html` |
| 5  | `hotel__ozer-palace.jpg`      | Ozer Palace — Istanbul               | `site/istanbul/index.html` |
| 6  | `hotel__parkside-baku.jpg`    | Parkside Baku — Bakou                | `site/azerbaidjan/index.html` |
| 7  | `hotel__pickalbatros.jpg`     | Pickalbatros — Sharm                 | `site/cairo-sharm/index.html` |
| 8  | `hotel__rehana-4star.jpg`     | Rehana Aqua Park 4★ — Sharm         | `site/cairo-sharm/index.html` |
| 9  | `hotel__rehana-czl.jpg`       | Rehana (CZL variant) — Sharm         | `site/sharm-constantine/index.html` |
| 10 | `hotel__rehana-royal-czl.jpg` | Rehana Royal Beach (CZL) — Sharm     | `site/sharm-constantine/index.html` |
| 11 | `hotel__rehana-royal.jpg`     | Rehana Royal Beach — Sharm           | `site/cairo-sharm/index.html` |
| 12 | `hotel__river-istanbul.jpg`   | Hotel River — Istanbul               | `site/istanbul/index.html` |
| 13 | `hotel__tilia.jpg`            | Tilia — Istanbul                     | `site/istanbul/index.html` |
| 14 | `hotel__tivoli-czl.jpg`       | Tivoli Aqua Park (CZL) — Sharm       | `site/sharm-constantine/index.html` |
| 15 | `hotel__tivoli.jpg`           | Tivoli Aqua Park — Sharm             | `site/cairo-sharm/index.html` |
| 16 | `hotel__verginia.jpg`         | Verginia Aqua Park — Sharm           | `site/cairo-sharm/index.html` |
| 17 | `hotel__yengice-gabala.jpg`   | Yengice Termal — Gabala              | `site/azerbaidjan/index.html` |

---

## Recommended email template to send each hotel

> Objet : Demande de photos officielles pour promotion (Alliance Travel — Algérie)
>
> Bonjour,
>
> L'agence Alliance Travel (Bordj Bou Arreridj, Algérie) commercialise
> auprès de sa clientèle algérienne des séjours incluant [nom de l'hôtel].
> Nous préparons la refonte de notre site vitrine et souhaitons obtenir
> **votre press-kit officiel** (photos haute résolution avec licence
> d'utilisation) afin de représenter fidèlement votre établissement à
> nos clients.
>
> Auriez-vous l'obligeance de nous transmettre :
> - 3 à 5 photos extérieures / piscine / plage,
> - 2 à 3 photos de chambre standard,
> - le logo officiel,
> - votre note de licence (usage web éditorial).
>
> Nous ajouterons volontiers un crédit photo en pied de galerie.
>
> Cordialement,
> [Nom · Alliance Travel]

---

## Provenance ledger — to be filled as replacements arrive

| File | Source (URL or email of press-kit sender) | Licence type | Licence term | Credit line to display | Date received |
|------|-------------------------------------------|--------------|--------------|------------------------|---------------|
| _(add rows as photos come in)_ | | | | | |

---

## Also review — decoration photos

`site/assets/images/heroes/` and `site/assets/images/heroes-v2/` — per
`docs/reference/IMAGE-ASSETS.md` these are documented as AI-generated.
**Verify** that the model licence of the generator (Midjourney / DALL·E /
Stable Diffusion / etc.) actually permits commercial use, and that the
generated images do not reproduce copyrighted landmarks in a way that
infringes trademark (e.g. the Petronas Towers are a registered mark
belonging to KLCC Holdings). AI-generated ≠ risk-free — the mark on
what's depicted still matters.
