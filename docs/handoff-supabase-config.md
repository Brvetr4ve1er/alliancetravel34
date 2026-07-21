# Handoff — Supabase-side config for the Alliance Travel admin

**For:** a fresh Claude session opened on the Supabase project `vxblgxiamtphabfswnxb` (**alliance-travel-leads**, eu-west-3).
**From:** the alliance-travel repo session of 2026-07-21 (full context lives there, not here).

---

## 1. Goal of this session

Make the **email-based auth flows** of `https://alliancetravel34.vercel.app/admin/` land on the right page, and (optionally) free them from the built-in mailer's hourly cap. Two dashboard settings and one optional SMTP setup. **Nothing else.**

Password sign-in already works end-to-end and does **not** depend on anything below — this session is fixing the fallback/recovery paths, not the primary one.

## 2. State of play

**Done (do not redo):**
- Admin dashboard live at `https://alliancetravel34.vercel.app/admin/` with password login as primary auth (commit `f5ae6cb` and later on branch `integrate/unified-admin`).
- Vercel Production env vars repaired by hand on 2026-07-21 (~18:39 UTC): `SUPABASE_URL` / `SUPABASE_ANON_KEY` now point at **this** project. They previously pointed at the user's *other, paused* project (FELINEKKI / `rahvemfyrcaiscytntmn`), injected by a Supabase↔Vercel integration — which is why every `/api/me` call returned 401 and login looked broken.
- A temporary password was set for the sole `auth.users` row via SQL; the owner rotates it in-app.
- `lead_readers` allowlist + leads RLS: in place and correct.

**Blocking / this session's work:** Authentication → URL Configuration still has factory defaults; every emailed link redirects to `http://localhost:3000`, i.e. nowhere.

**Known-good facts to trust:** project ref `vxblgxiamtphabfswnxb`; live domain `https://alliancetravel34.vercel.app`; the correct `SUPABASE_URL` form is the bare project URL — **never** the `/rest/v1/` REST endpoint.

## 3. Actions (in order)

1. **Authentication → URL Configuration → Site URL**
   `http://localhost:3000` → `https://alliancetravel34.vercel.app`
   (Supabase silently falls back to Site URL whenever a `redirect_to` doesn't match the allowlist — this default is the root cause of "the login link leads to localhost".)
2. **Authentication → URL Configuration → Redirect URLs** — add BOTH:
   - `https://alliancetravel34.vercel.app/admin/`
   - `http://localhost:8880/admin/` (the repo's local preview; matching must be exact)
3. **Optional but recommended — Authentication → SMTP Settings:** configure a real provider (Resend / Brevo / SendGrid). The built-in mailer is a few messages **per hour, project-wide, shared by magic-link + recovery + confirmation**, best-effort, and already exhausted twice today. If the user declines, skip — password login is unaffected.
4. **Verify:** with the owner, send one magic link from `/admin/` ("Recevoir un lien par email") and confirm it lands back on `/admin/` logged in. If the mailer is still rate-limited, verification waits for the bucket (~1 h after last burst) — do not burn retries.

## 4. Hard boundaries — do NOT

- **Do not touch `auth.users`** (no password changes, no deletes — a fresh temp credential is in play and the owner is rotating it).
- **Do not touch the `leads` table, its RLS, or `lead_readers`.**
- **Do not rotate/regenerate any keys** (anon, service_role, JWT secret). The Vercel side was just hand-repaired against the current keys; rotation would break it again.
- **Do not reconnect or "fix" the Supabase↔Vercel integration** — that's Vercel-side, the user handles it there (disconnect or re-link away from FELINEKKI).
- Never paste secrets into the handoff/chat: no keys, no tokens, and the temporary password stays out of everything (it exists only in the parent session's transcript).

## 5. Open decisions (owner's call, surface then act)

- **SMTP provider choice** for step 3 (Resend is the lowest-friction; any is fine) — or explicitly defer.
- Whether to keep the magic-link button long-term once a permanent password exists (current lean: keep it as recovery).

## 6. Artifacts / references

- Owner runbook (already corrected for all of the above): `docs/admin-setup.md` in repo `Brvetr4ve1er/alliancetravel34`, branch **`integrate/unified-admin`** (canon — `main` is stale).
- Deploys to production are currently **manual**: `vercel deploy --prod` (git pushes only create previews until the user flips Vercel → Settings → Git → Production Branch to `integrate/unified-admin`).
- Auth forensics that established all of the above: parent session of 2026-07-21 (log-verified; trust its conclusions over re-derivation).
