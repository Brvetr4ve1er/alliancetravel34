# WhatsApp lead capture — "log instantly + invite details"

**Date:** 2026-08-02
**Status:** Implemented & verified locally (not yet deployed)

## Problem

The admin panel ("Demandes") showed no leads. Investigation (against the live
`alliance-travel-leads` Supabase project `vxblgxiamtphabfswnxb`) proved the lead
pipeline was **already fully functional**:

- Anonymous inserts to `leads` succeed (HTTP 201 with `Prefer: return=minimal`).
- The homepage contact form and the trip-page booking form both capture
  end-to-end (verified: real rows landed).
- The read side works: owner `alliancetravel34@gmail.com` exists, is confirmed,
  is the sole entry in `lead_readers`, and `is_lead_reader()` gates SELECT.

The real gap was **coverage**: the site's dominant conversion — a `wa.me`
deep-link (FAB, sticky bar, hero, trip cards, footer, advisors) — recorded only
a `wa_click` *event*, never a lead. ~100 WhatsApp taps/week produced 0 leads
because only the two *forms* capture, and visitors rarely complete them. The one
row in `leads` was seed data ("Test Screenshot", 2026-07-22).

## Solution

A self-contained module, `site/assets/js/lead-whatsapp.js`, loaded on every
public page (not admin), with two additive, fire-and-forget layers:

1. **Log instantly.** A capture-phase click listener on `a[href*="wa.me"]`
   (excluding `#bf-send-btn`, which lead-capture.js already captures) inserts an
   anonymous lead — `channel:'whatsapp'`, `page`, `trip` (from `__calcState`),
   client-generated `id` — with `keepalive`. De-duped to one row per
   `(session, trip/page)` via `sessionStorage`.
2. **Invite details.** Because the tap opens WhatsApp in a new tab, this tab
   stays; a dismissible card asks for name + phone and calls the `enrich_lead`
   RPC to fill in the row from step 1. Shown once per session, FR/EN/AR + RTL,
   reduced-motion safe.

### DB migration (applied to production)

`enrich_lead(p_id uuid, p_name text, p_phone text)` — `SECURITY DEFINER`,
granted to `anon`. Deliberately narrow: only updates a row that is **recent**
(< 2h) and **still anonymous** (`name IS NULL`), so it can never read or
overwrite a real captured lead. Needed because `anon` can INSERT but has no
UPDATE/SELECT RLS on `leads` (correct posture — kept intact).

### Admin display

Anonymous click-leads (null name/phone) render as "Contact WhatsApp"
(`leads.anon`, FR/AR) + page instead of "—" and "0 adulte(s)". The "people"
line is shown only when `adults`/`kids` are present.

## Privacy / safety

- Honors Do Not Track and the localhost dev gate (no dev clicks pollute prod
  unless `?beacon=force`), mirroring beacon.js.
- The anon key is public by design; RLS confines it to INSERT + enrich_lead.

## Verification (local preview + live DB)

- Instant log: tap → row inserted (channel/page/trip). ✓
- Dedup: repeat tap reuses the id, no duplicate. ✓
- Enrichment: prompt submit → same row gains name + phone via RPC. ✓
- Prompt: dark & light tokens correct, Fraunces heading; LTR & RTL sit opposite
  the (mirrored) FAB with no overlap; mobile spans and clears the FAB; no
  horizontal overflow; no console errors. ✓
- Build clean; module present on all 10 public pages + 404; admin excluded. ✓

## Deploy

Static JS/CSS/HTML ships via the normal build (`node tools/build.mjs`) + commit
+ push + promote. The `enrich_lead` migration is already live and harmless until
the client ships.

## Files

- `site/assets/js/lead-whatsapp.js` (new)
- `site/assets/css/styles.css` (`.wa-lead-prompt` block)
- `tools/templates/sections/scripts.tpl` + `site/{index,voyages,rendez-vous-visa,404}.html` (includes)
- `site/admin/{leads,accueil,i18n}.js` (anonymous-lead display)
- Supabase migration `add_enrich_lead_rpc`
