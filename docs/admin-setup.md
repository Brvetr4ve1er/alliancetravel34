# Alliance Travel — Admin Dashboard: Setup & Owner Guide

Your dashboard lives at **`https://<your-site>/admin/`**. One login lets you **edit your trip pages** and **see the leads** people send from the site. You never touch code, GitHub, or a database.

---

## Part A — One-time setup (technical, ~15 minutes)

Do this **once**, in your Vercel project and your Supabase project. After that, only Part B matters.

### 1. Create a GitHub access token (so the dashboard can save your edits)
1. GitHub → your profile → **Settings** → **Developer settings** → **Fine-grained tokens** → **Generate new token**.
2. **Repository access:** *Only select repositories* → pick **this website's repo only**.
3. **Permissions:** under *Repository permissions*, set **Contents = Read and write**. Leave everything else off.
4. Generate, and **copy the token** (starts with `github_pat_…`). You'll paste it in step 3.

### 2. Confirm the two allowlists have your email
- **Supabase → your project → Table Editor → `lead_readers`** must contain your login email. (Already set to `brvetr4veler@gmail.com` — change only if a different person will log in.)
- The `ADMIN_EMAILS` env var in step 3 must be the **same** email. *(Both lists need your email: `lead_readers` unlocks the Leads tab, `ADMIN_EMAILS` unlocks page editing.)*

### 3. Set the environment variables in Vercel
Vercel → your project → **Settings** → **Environment Variables**. Add these to **Production** *and* **Preview**:

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://vxblgxiamtphabfswnxb.supabase.co` |
| `SUPABASE_ANON_KEY` | the public anon key — copy the `anonKey` value from `site/assets/js/lead-config.js` |
| `GITHUB_TOKEN` | the token from step 1 |
| `GITHUB_REPO` | `Brvetr4ve1er/alliancetravel34` |
| `GITHUB_BRANCH` | `integrate/unified-admin` |
| `ADMIN_EMAILS` | your login email (comma-separated if more than one person) |

> **Important:** `GITHUB_BRANCH` must be the **same branch Vercel builds for production**. Edits are committed to this branch; if it doesn't match, your changes will save but never appear on the live site.
>
> For this project that branch is **`integrate/unified-admin`**, *not* `main`. All the site and admin work lives there; `main` has none of it. Check Vercel → Settings → Git → **Production Branch** and make it match before doing anything else.

### 4. Point the email links at your site (not localhost)
Supabase → **Authentication** → **URL Configuration**:

- **Site URL** → `https://<your-site>` — it ships as `http://localhost:3000`, which is nobody's site.
- **Redirect URLs** → add `https://<your-site>/admin/` (and your Vercel preview URL's `/admin/` if you test previews).

Both matter, and the failure is silent: Supabase only honours a redirect that
**exactly matches** an entry in Redirect URLs, and when it doesn't match it quietly
substitutes Site URL instead of reporting an error. With the defaults in place the
login link "works" — it signs you in and then drops you on `localhost:3000`, a page
that doesn't exist. Password sign-in (Part B) is unaffected by all of this.

### 4b. Recommended for production: your own SMTP
Supabase → **Authentication** → **SMTP Settings**. The built-in mailer is capped at
a few messages per hour project-wide, carries no delivery guarantee, and is shared
by every email flow. Any real provider (Resend, Brevo, SendGrid, Gmail SMTP…) lifts
that to a configurable limit. Not required to use the dashboard — only to make the
email-based flows dependable.

### 5. Deploy
Redeploy the site so the new environment variables take effect. Then go to **Part B**.

---

## Part B — Using the dashboard (for the owner, no technical knowledge needed)

### Logging in
1. Open **`https://<your-site>/admin/`**.
2. Enter your email and password, click **Se connecter**.

That's it — no email, no link. Your browser can remember the password, and the
session refreshes itself while you work.

**If you don't have a password yet**, open *« Je n'ai pas encore de mot de passe »*
and click **Recevoir un lien par email**. Once you're in, click **Mot de passe** in
the top bar and choose one. From then on, use the form above.

> **Why password rather than the email link.** Supabase's built-in mailer is
> capped at a handful of messages per hour project-wide and is best-effort only —
> Supabase says outright it isn't for production. Magic links, password resets and
> confirmations all share that one bucket, so when it runs out you lose every way
> in at once. Signing in with a password doesn't send mail and doesn't depend on
> the redirect configuration below, so it keeps working regardless.

### If you are ever locked out completely
Set a password directly, with no email involved: Supabase → **SQL Editor** →
```sql
update auth.users
set encrypted_password = extensions.crypt('YOUR-NEW-PASSWORD', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'you@example.com';
```
Then sign in normally. (`gen_salt('bf')` is required — Supabase stores bcrypt, and
a hash in any other format saves fine but fails every login.)

### Editing a page
1. On the **Pages** tab, choose a trip from the dropdown.
2. Change any of the fields shown (title, hero text, dates, "from" price, hotel prices, etc.).
3. Click **Publier**.
4. You'll see **"Publié ✓ — la page sera à jour dans ~1 minute"** with a link to the saved change. Your live page updates within about a minute.

**What the messages mean:**
- **Green "Publié ✓"** — saved. The page rebuilds and goes live in ~1 minute.
- **Red "Refusé — l'édition casserait la page"** — your change would have broken the page (e.g. a required field left empty), so it was **not** saved and your live site is untouched. Read the reasons listed, fix them, and click Publier again.

> **What the safety net does and does not cover.** It checks that the page still *builds*: required fields present, valid structure, the page renders. It does **not** check that what you wrote is *true* or *consistent* — and it cannot see image files while saving (see the Avancé section below). Treat a green "Publié ✓" as "the page still works", not as "the change is correct".

### The "Avancé — JSON brut" panel
Most edits use the simple fields above. The **Avancé** panel lets you edit everything else in raw form. Edit it carefully — if the text isn't valid, saving is refused.
- **⚠️ Do not change image paths here.** The safety check cannot see image files while saving. A wrong image path saves with a green "Publié ✓" — and then **blocks the rebuild of the entire site**, so *every* page stops updating until a developer fixes it. Ask for an image change instead of doing it here. (Normal field edits — prices, text, dates — are never affected by this.)
- **⚠️ Editing French text here does not update English or Arabic.** Those translations are stored separately. If you change a price, a date or a departure month, the English and Arabic versions of that page keep showing the **old** value, with no warning. Ask for translation updates whenever you change a number or a date.

### Leads tab
The **Leads** tab shows everyone who submitted the booking form: name, phone, city, chosen trip/hotel/dates, party size, estimated total, and how they contacted you (WhatsApp / email / copy). Use the search box to filter, and **Exporter CSV** to download them for Excel.

---

## Part C — Instant email alerts for new leads (optional, off by default)

By default the dashboard collects leads silently — you see them when you open the **Leads** tab. This optional feature emails you the moment a lead lands, so none sits unseen. **It is dormant until you complete the steps below.** The endpoint `/api/notify-lead` ships with the site but sends nothing until these environment variables are set — with them unset it is a deliberate no-op (a call to it is acknowledged and ignored, no email attempted). Setting them up does **not** change anything the visitor sees, and it does not touch the existing lead capture.

### C1. Create a Resend account and verify your sending domain
1. Sign up at **resend.com** (free tier is enough for lead alerts).
2. **Domains** → **Add Domain** → enter **`alliance-travel.dz`**.
3. Resend shows a few DNS records (SPF / DKIM, and optionally DMARC). Add them at whoever hosts the `alliance-travel.dz` DNS, then click **Verify**. Until the domain is *Verified*, mail sent "from" it will be rejected.
4. **API Keys** → **Create API Key** (Sending access is enough). Copy it — it starts with `re_…`. You'll paste it as `RESEND_API_KEY` below.

*(Resend is not required — Brevo, SendGrid or Postmark work the same way. Switching providers is a small code change to the single request in `api/notify-lead.mjs`; the env vars and the webhook stay the same.)*

### C2. Set the environment variables in Vercel
Vercel → your project → **Settings** → **Environment Variables** → add to **Production** *and* **Preview**:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the `re_…` key from step C1 |
| `OWNER_NOTIFY_EMAIL` | the inbox that should receive the alerts (e.g. your Gmail) |
| `LEAD_NOTIFY_SECRET` | a long random string you invent — a shared password between Supabase and this endpoint. Generate one, e.g. `openssl rand -hex 32`, and keep it secret. |
| `LEAD_NOTIFY_FROM` | *(optional)* the "from" address; defaults to `notifications@alliance-travel.dz`. Must be on the domain you verified in C1. |

> **All three of `RESEND_API_KEY`, `OWNER_NOTIFY_EMAIL` and `LEAD_NOTIFY_SECRET` are required to activate alerts.** With `LEAD_NOTIFY_SECRET` unset the endpoint rejects every call; with `RESEND_API_KEY` or `OWNER_NOTIFY_EMAIL` unset it stays a silent no-op. Redeploy after adding them.

### C3. Create the Supabase Database Webhook
This is what actually calls the endpoint when a lead is inserted.

Supabase → your project → **Database** → **Webhooks** → **Create a new hook**:
- **Name:** `lead-notify` (any name)
- **Table:** `public.leads`
- **Events:** tick **Insert** only
- **Type:** *HTTP Request*
- **Method:** `POST`
- **URL:** `https://<your-site>/api/notify-lead`
- **HTTP Headers:** add one header — **`x-notify-secret`** with the value = the exact `LEAD_NOTIFY_SECRET` you set in C2.

Save. Supabase now POSTs `{ type:'INSERT', table:'leads', record:{…} }` to the endpoint on every new lead; the endpoint checks the secret header, formats the lead into a short French email (name, phone, city, trip, hotel, dates, party size, total in DA, channel, plus a one-tap **wa.me** WhatsApp reply link) and sends it through Resend to `OWNER_NOTIFY_EMAIL`.

### C4. Test it
Submit the booking form on your live site (or insert a test row into `leads`). Within a few seconds you should get an email. If not, see the notes below — nothing about this affects the site itself, so a misconfiguration here only means "no alert email", never a broken page.

**Security note:** the endpoint is public (a Supabase webhook can't log in), so the `x-notify-secret` header is the only thing that stops a stranger from POSTing fake alerts to your inbox. Keep `LEAD_NOTIFY_SECRET` private and rotate it (change it in both Vercel and the Supabase webhook) if it ever leaks.

---

## If something doesn't work
- **"Ce compte n'est pas autorisé."** → your email isn't in `ADMIN_EMAILS` (Part A step 3), or the deploy predates adding it.
- **Login link does nothing** → the `/admin/` URL isn't in Supabase Redirect URLs (Part A step 4).
- **Leads tab is empty but you have leads** → your email isn't in `lead_readers` (Part A step 2).
- **Edits save but the live page never changes** → `GITHUB_BRANCH` doesn't match Vercel's production branch (Part A step 3).
- **No email alert for a new lead** → check, in order: all three of `RESEND_API_KEY` / `OWNER_NOTIFY_EMAIL` / `LEAD_NOTIFY_SECRET` are set in Vercel and the site was redeployed (Part C2); the Supabase webhook's `x-notify-secret` header exactly matches `LEAD_NOTIFY_SECRET` (Part C3); the `alliance-travel.dz` domain shows *Verified* in Resend (Part C1). This never affects the site or the Leads tab — it only means no alert email was sent.
