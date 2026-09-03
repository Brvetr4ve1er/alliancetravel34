# Global audit — legitimacy, structure, complexity

**Date:** 2026-08-31 · **Scope:** the whole deployed site, the build pipeline, the API
surface and the public repository · **Branch:** `integrate/unified-admin`

The headline finding is inverted from what you might expect. **The engineered parts are in
good shape** — API authentication, security headers, the build gates, price consistency.
Every serious problem sat in the parts nobody engineered: marketing copy nobody re-read, a
domain nobody re-checked, and legal pages nobody wrote.

---

## 1. Needs you — I could not fix these

| # | Item | Why it needs you |
|---|---|---|
| 1 | **Complete the legal pages** | `/mentions-legales/`, `/confidentialite/` and `/cgv/` are live but carry `[À COMPLÉTER]` markers for **RC, NIF, article d'imposition, agrément n°, forme juridique, directeur de publication**, plus retention periods, the deposit percentage and the claims window. These come from your registre de commerce — inventing them would be worse than leaving them blank. |
| 2 | **76.3 MB of supplier rate sheets are in the public git history** | Untracked in `b694a05` and correctly `.gitignore`d, but **still retrievable from history** — 11 PDFs including wholesale pricing and the 31 MB brand chart. Removing them rewrites history on a public repo: destructive, and other clones exist. Your call. Command in §5. |
| 3 | **Expired departures** | As of today, **5 of 7 trips pre-select a departure that has already gone**. Kuala Lumpur has **0 of 6** remaining and Égypte **0 of 7** — both still emit `availability: InStock`. I cannot invent your 2026/27 calendar. |
| 4 | **`contact@alliance-travel.dz` is a dead mailbox** | That domain has no DNS at all, so the booking form's email fallback bounces. I rewrote the *web* URLs but deliberately did not guess an email — a mailbox on `.app` may not exist either. Tell me the real address. |
| 5 | **"Agence agréée" has no number** | The word appears in three languages with no agrément number, issuing authority or register entry anywhere. Either add the number or drop the word. `enhance.js` already carries a comment from a previous pass asking for exactly this. |

---

## 2. Fixed in this pass

### Legitimacy

- **The site pointed Google at a domain that does not exist.** Every canonical, hreflang,
  `og:url`, sitemap entry and JSON-LD `@id` declared `https://alliance-travel.dz` — **no DNS
  record at all**, while the live site is `alliancetravel.app`. This is close to the worst
  available SEO state: the crawler is told the real page lives somewhere unreachable.
  **410 URLs across 34 files** rewritten.
- **Contradictory, unsourced traveller numbers.** The homepage showed *"4,9 / 5 · 320
  voyageurs"* under the hero, *"1.2K+ Voyageurs guidés"* below it and *"1.200 voyageurs
  satisfaits"* in the footer — 320 and 1,200 visible on one screen. A tooltip claimed *"320
  avis vérifiés"* though no review store exists anywhere in the repo, and the EN/AR copy
  insisted the 98% *"isn't a marketing tagline"* — the most exposed possible framing for a
  number with no source. All removed, replaced with defensible facts (founded 2019, three
  branches, eight destinations) across the hero, about section, footer, four meta/OG/JSON-LD
  copies, the stat cards on all seven trips, and every FR/EN/AR string behind them.
- **Claims contradicted by our own data.** *"Tout inclus — vol, hôtel, excursions"* is false
  on every trip (all seven exclude meals, four exclude the visa, Tunisia travels by bus).
  *"Annulation flexible jusqu'à 30 jours"* contradicts the published barème (full refund
  needs 60 days; 30–59 days retains 30%).
- **The trust strip leaked onto Omra.** It matched `.hero`, not just the homepage, so
  `/omra/` carried an *"Annulation flexible"* badge directly above its own statement that an
  Omra booking usually **cannot** be cancelled. Now homepage-only.
- **Stale catalogue claims.** Tunisia advertised *"9 hôtels"* and *"Hammamet, Sousse &
  Djerba"* after the catalogue was pruned to four hotels in Sousse — **20 strings** across
  the homepage, `/voyages/`, the shared dictionary, breadcrumb JSON-LD and the contact form's
  trip selector, in three languages. Destination counts said 5 (hero) vs 7 (meta) vs 8
  (footer); now consistently 8.
- **Fabricated-looking testimonials.** "Rania H.", "Mohamed T." and "Leïla K." each appeared
  on **five** destinations, with one closing clause byte-identical across three, and "Leïla
  K." credited to Sétif, Alger *and* Annaba. You chose to keep the sections, so the
  contradictions are gone (21 testimonials, 21 distinct names) — but these are still
  agency-written copy, not collected reviews.

### Legal and privacy

- **Three legal pages created**, linked from every footer: mentions légales, politique de
  confidentialité, CGV. French only for now — the wording has to be completed and approved
  before translating it is anything but waste; `STATIC_PAGES` carries them as `["fr"]`, so
  publishing EN/AR later is one line plus a dictionary.
- **Consent before passport collection.** The form collected passport numbers and dates of
  birth with no notice and no opt-in. The block now states plainly that it is optional and
  not needed for a quote, links to the privacy page, and hides the fields behind an explicit
  opt-in. **Unticking clears the data**, not just the display — a cleared checkbox that still
  shipped passport numbers to WhatsApp would be worse than no checkbox.
- The privacy page documents what actually happens rather than boilerplate: passport data
  goes into the WhatsApp message and is **not** written to Supabase; the lead row
  (name/phone/city/notes) is stored in the EU region; a failed send can sit in `localStorage`
  for 7 days; the audience beacon is anonymous and honours Do Not Track. Framed under
  **loi n° 18-07 du 10 juin 2018**.

### Translation

- **`/voyages/` was 65% unbound.** The page loads `i18n.js` and had 28 working bindings in
  its chrome — wrapped around seven trip cards carrying no `data-i18n` at all, so an EN/AR
  visitor got a translated shell around fully French cards. **48 strings now bound**;
  verified by reimplementing `resolve()`/`lookup()` against the committed files: 86 bindings,
  71 unique keys, **zero unresolved** in either language.

---

## 3. Verified healthy — no action needed

Worth recording, because an audit that only lists problems is misleading:

- **API authentication is solid.** All six sensitive endpoints (`save-trip`, `revert-trip`,
  `get-trip`, `export-leads`, `status`, `me`) call `verifyAdmin(req)` as their first
  statement and reject before doing work. The one public endpoint, `notify-lead`, is guarded
  by a shared secret, capped at 1 MB, and dormant until provisioned.
- **Security headers are strong**: CSP with `default-src 'self'` and `object-src 'none'`,
  HSTS with preload, `nosniff`, `SAMEORIGIN`, Referrer-Policy, Permissions-Policy. The
  `'unsafe-inline'` in `script-src` is an accepted trade-off for inline JSON-LD on a static
  host.
- **Prices do not drift.** 99 hardcoded price tokens across the homepage, `/voyages/` and
  `enhance.js` were compared against `data/trips/*.json` — **zero mismatches**, in all four
  number formats.
- **Footers are byte-identical** across all carriers (same sha1), and the office phone
  numbers agree across `index.html`, `algeria-map.js`, `contacts.js` and every footer.
- **No fabricated review schema.** Despite the invented testimonials, no page emits
  `AggregateRating`, `Review`, `ratingValue` or `reviewCount` — the one thing that would have
  turned a copy problem into a Google penalty. `README.md` shows this was a deliberate call.
- **`source of truth/` is correctly `.gitignore`d** going forward (line 52, with a thorough
  comment). Only the history remains exposed.

---

## 4. Structure and complexity — the verdict

**The project is not over-engineered.** ~27k lines across 527 files with 305 tests, a
zero-dependency build, and gates that genuinely prevent the failure they were written for
(`check-value-graph` for price drift, `validate-trip` for schema, `sw-version` for cache
staleness, the orphan gate for stale pages). That complexity buys something.

**The real structural risk is the opposite: the un-gated surfaces.**

> **14 of the 15 build gates only ever inspect `data/trips/` and generated output.** The
> hand-authored pages — the homepage, `/voyages/`, `/rendez-vous-visa/` — get essentially
> none of them. Every content bug in this audit lived there.

Three specific weaknesses, in priority order:

1. **The coverage check cannot see unbound text.** `missingKeys()` extracts keys *out of the
   markup* and diffs them against the dictionary. Text with no `data-i18n` attribute
   contributes no key, so it can never be reported missing. Enrolling `/voyages/` in
   `STATIC_PAGES` would have reported **0 missing keys** while shipping seven French cards.
   The check needs to walk text nodes, not attributes. This blind spot reaches generated
   pages too: `"La Graf · siège"` and `"Centre-ville · M'Sila"` are unbound in the shared
   footer and therefore appear untranslated on `/ar/omra/` and `/ar/egypte/` with every gate
   passing.
2. **`tools/sync-static-prices.mjs` was specced and never built.** Prices are correct today
   by discipline, not enforcement — 99 copies with no gate, one admin edit away from a wrong
   price in a Google rich result.
3. **Three i18n mechanisms coexist**: the global `T`, inline `AL_PAGE_I18N`, and
   `data/pages/*.i18n.json`. That is defensible, but the flat-vs-nested key trap has now
   caused two dead dictionaries (the visa page's, and nearly the Omra one). `expandDict()`
   exists — the visa page's inline block should be deleted, as its 18 entries were long ago
   promoted into `T` with byte-identical values.

Minor: `data/trips/SCHEMA.md` and `_VARIATIONS.md` are two generations stale (they document a
`cairo-sharm.json` that no longer exists and quote wrong prices); `styles.css` carries 78
tombstone comments over 264 lines; four tools (`parity.mjs`, `parse-source.mjs`,
`extract-trip.mjs`, `templates/canon.mjs`) are unreferenced.

---

## 5. Removing the rate sheets from history

**Destructive and irreversible. Do not run this without deciding you want it.** It rewrites
every commit hash, so every existing clone must be re-cloned.

```bash
pip install git-filter-repo && git filter-repo --path "source of truth" --invert-paths --force
```

Then `git push --force origin integrate/unified-admin`. Because the repo is **public**, treat
the pricing as already disclosed regardless — rotate anything that behaves like a secret.
Making the repository private is a faster, non-destructive alternative that closes future
access, though caches and forks may persist.

---

## Commits in this pass

`6914741` live domain + unsubstantiated claims · `25f3f77` legal pages + consent gate ·
`24e7062` `/voyages/` bindings + stale Tunisia copy · `c08f9cf` testimonial personas +
gitignore
