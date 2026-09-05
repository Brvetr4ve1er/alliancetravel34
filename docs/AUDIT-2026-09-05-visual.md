# Front-end visual audit — findings and fixes

**Date:** 2026-09-05 · **Scope:** the rendered site at 1440/1920/768/375, FR and AR,
dark and light · **Branch:** `integrate/unified-admin` · **Commits:** `94332fc`,
`b2120c0`, `5e65389`

This audit looked at the page, not the code. Three lenses rendered the live site and
measured what they saw — `getBoundingClientRect`, `getComputedStyle`, contrast ratios —
rather than reading CSS and reasoning about it. That distinction matters: **six of the
defects were regressions introduced earlier the same day**, by work whose own tests
passed.

**48 distinct findings** → 9 HIGH, 27 MED, 12 LOW. All fixed, in two waves.

---

## 1. Needs you — I could not fix these

| # | Item | Why it needs you |
|---|---|---|
| 1 | **The legal identifiers** | `/mentions-legales/` and `/cgv/` still carry `[À COMPLÉTER]` for RC, NIF, article d'imposition, agrément n°, forme juridique and directeur de publication. Per your decision the three pages are now `noindex,follow` and unlinked from every footer until you supply them. The privacy page stays reachable from the booking form, because a form that collects passport data must link its policy. |
| 2 | **The 2026–27 departure calendar** | You said you would handle dates in the admin, so no calendar was touched. Égypte is down to **one** bookable departure of seven and Kuala Lumpur has none. The UI now degrades honestly — one departure renders as "Prochain départ : …" plus a link to ask for another date instead of a one-option radio group — but only you can add real dates. |
| 3 | **`contact@alliance-travel.dz`** | Still a dead mailbox on a domain with no DNS. The booking form's email fallback bounces. Tell me the real address. |
| 4 | **"Agence agréée" has no number** | Unchanged from the August audit: the phrase appears with no agrément number or issuing authority. Add the number or drop the word. |
| 5 | **76.3 MB of rate sheets in public git history** | Unchanged. Removing them rewrites every commit hash on a public repo. Your call. |

---

## 2. What was wrong, and what it looks like now

### Things that were invisible or simply broken

- **The hero counter animated "2019" to "2".** Any target ≥ 1000 was divided by 1000, so
  the founding year settled on a single digit. Only first-time visitors saw it — a
  session flag skips the animation on reload, which is why it survived review. Now the
  abbreviation only fires when the format asks for it, with a unit test.
- **The legal pages' `<h1>` was permanently invisible.** The reveal rule hides
  `.section-head__title` until an ancestor `.section-head` gets its in-view class, and
  no such ancestor existed on those pages, so the title could never appear.
- **Legal body text ran at ~142 characters per line.** The measure utility and
  `.container` have the same specificity, and `.container` is declared later, so 1280px
  won. Compound selectors placed after it restore the intended 720px.
- **Every booking-form error painted on first load.** The field errors and the red
  "complete the fields" banner are `display:flex` and ship with the `hidden` attribute,
  which the browser's own rule cannot out-specify. The codebase already carried this
  exact fix for another component; the form never got it.

### Claims the agency cannot substantiate

The August audit removed "1.200 voyageurs" from the pages it could see. It survived in
five places that audit never looked: two shared templates, eight inline footers, a
social-preview description and an Arabic dictionary string. All replaced with facts —
three agencies, eight destinations, since 2019. The visa page's "1 200+ dossiers
traités" is gone too. Two trip pages had a price line ending on a dangling "· dès".

### Arabic

- **Three forced-left-to-right rules targeted containers, not numbers.** They existed to
  stop digits reordering, but they were pointed at elements holding Arabic *words*, so
  "3 وكالات" and the booking chips read backwards. Only the numeric parts are isolated
  now.
- **Both of those rules also used a Latin-only font stack**, so Arabic inside them fell
  to whatever the operating system chose.
- **The booking form was a French template on every Arabic and English page** — around
  forty labels, hints, placeholders, buttons, validation lines and toasts. It is built
  from a per-language table now, with a test that fails if the three languages drift
  apart.
- **The trip switcher in the navigation was French everywhere**, including all seven
  destination names and their date lines.
- **A French-only page no longer flips to right-to-left.** The legal pages have no
  translation, so an Arabic visitor used to get French prose right-aligned under an
  Arabic `lang` attribute. They stay French, and the language pills take the visitor to
  the home page instead of pretending to switch.
- `/ar/istanbul/` was the one trip whose related-card prices had no translation, so a
  French price line sat in a right-to-left block and reversed. Bound.

### Consistency

Three non-region pages overrode the brand green with a *different* green. Review stars
followed `--accent`, which every trip page overrides, so they came out sky-blue on
Istanbul and orange on Bali. A link and a button with identical classes rendered 52px
and 59.5px side by side, because the button style set no line-height. Eyebrow letter-
spacing depended on what the *next* element's class happened to be. In light theme,
three call-to-action variants were navy on green at 2.67:1.

### Mobile and tablet

The homepage grid collapsed to one 679×849px card at exactly 768px while the trips page
showed two. Language buttons were 28×28 in the drawer — the primary controls of a
trilingual site — and the rule that sized them stopped at 768px while the drawer opens
at 900px. The drawer menu was indented 73px by a margin that leaked in from the nav bar,
and the hamburger was not the last item. Visa country rows clipped their chevron and
status pill on long names. Controls that were 44px on a phone shrank at tablet.

### Design changes (approved 2026-09-04)

You asked for these as well as the defects.

- **The FAQ existed three times** — 780/820/760px wide, two chevron sizes, different
  fills — because the trip pages and the hand-authored pages use different HTML for the
  same component. One spec now handles both.
- **Omra is the eighth card on the homepage.** The grid had seven cards in three
  columns, so every desktop width ended on an orphan, and the page claimed eight
  destinations while showing seven. There is no photograph of Omra in the library, so
  the card is a designed surface rather than a borrowed image.
- **The filter pills could not reach every trip**: "Asie" showed one of three Asian
  destinations, and Tunisia was on no pill at all.
- **The homepage nav had an empty right-hand slot**, leaving 248px of dead space at
  1440px and 488px at 1920px.
- **The sticky bar quoted a total before any input** — "Total estimé 440 000 DA" beside
  a hero saying "dès 169 000 DA".
- The hotel dropdown had its native arrow removed and nothing put back. The hero date
  line was grey 13px on a bright photo with no shadow. The card arrow was painted in
  on-accent ink but positioned outside the accent pill, on the photograph.

---

## 3. Verified, not asserted

Every wave passed the same six gates:

1. `node tools/build.mjs --check` reports `0 rendu(s)` — the build is idempotent.
2. `node --test` — **317 pass, 0 fail** (nine tests added).
3. Every `data-i18n` key on all eight hand-authored pages resolves in English and
   Arabic: **768 keys, 0 unresolved**, checked by reimplementing the resolver against
   the committed files.
4. Browser measurement of each fixed finding, at 1440, 768 and 375, dark and light.
5. Arabic round-trip: server-rendered `/ar/` pages and client-swapped pages both
   checked, then switched back to French with zero Arabic text remaining.
6. Live check after deploy.

Two measurements were initially misread and are worth recording, because the same traps
will catch the next session:

- **A hidden browser pane pauses CSS transitions and never fires the in-view observer.**
  The legal `<h1>` measured `opacity: 0` even after the fix; disabling the transition
  showed it resolving to 1 correctly.
- **An animation outranks a normal declaration.** The light-theme hero photo opacity had
  no effect because a keyframe animation drives the same property. The dimming moved to
  the container, where it multiplies.

---

## 4. One process note

The August audit's own conclusion was that the un-gated surfaces are the real structural
risk: 14 of 15 build gates only inspect `data/trips/` and generated output, so the
hand-authored pages get essentially none of them. This audit is the evidence. Every
defect above lived where no gate looks, and six were introduced by that same day's work.

A gate that would have caught the largest single class of finding here: **walk rendered
text nodes rather than `data-i18n` attributes.** The current coverage check extracts keys
from the markup and diffs them against the dictionary, so text with no attribute
contributes no key and can never be reported missing. That blind spot is why a French
booking form shipped on every Arabic page, and why "1.200 voyageurs" survived a sitewide
search-and-replace in five places.
