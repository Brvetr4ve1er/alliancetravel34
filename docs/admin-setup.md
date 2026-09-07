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
| `LEAD_NOTIFY_SECRET` | *(email alerts only — see 4c)* any long random string you invent |
| `RESEND_API_KEY` | *(email alerts only)* the API key from your Resend account |
| `OWNER_NOTIFY_EMAIL` | *(email alerts only)* where alerts should land, e.g. `alliancetravel34@gmail.com` |
| `LEAD_NOTIFY_FROM` | *(optional)* sender address. Defaults to `Alliance Travel <alertes@alliancetravel.app>` |

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

### 4c. Email alerts: know the moment a customer writes
*Optional but recommended. Without this, a new enquiry is only visible if you open
the dashboard and look. With it, you get an email — name, phone, trip, budget and a
one-tap WhatsApp reply link — within seconds of the form being submitted.*

Nothing needs to be programmed. The endpoint (`api/notify-lead.mjs`) is already
deployed and stays inert until the four steps below are done. **Réglages →
Configuration** shows you which pieces are still missing, and the **« Envoyer un
email de test »** button proves the whole chain end to end — so you never have to
find out by losing a real customer.

**Step 1 — get a sending account.** Create a free account at
[resend.com](https://resend.com) and copy an **API key** (`re_…`). The free tier is
far above this site's volume.

**Step 2 — decide where mail is sent *from*.** Two options; you can start with the
first and move to the second later.

- **Fastest, zero DNS (recommended to start).** Set `LEAD_NOTIFY_FROM` to
  `onboarding@resend.dev`. Resend's shared test domain works with no setup at all,
  but it will **only deliver to the email address that owns your Resend account** —
  which is exactly the case here, since the only recipient is you. Make sure
  `OWNER_NOTIFY_EMAIL` is that same address.
- **Proper, uses your own domain.** In Resend, **Add Domain** → `alliancetravel.app`.
  Resend then shows the exact DNS records to create — typically a **DKIM `TXT`** at
  `resend._domainkey`, an **SPF `TXT`**, and an **`MX`** for bounce handling (for
  domains added recently Resend may issue **`CNAME`** records instead, which cover
  the same ground). Copy them *verbatim* into **Vercel → your project → Settings →
  Domains → `alliancetravel.app` → DNS Records**, since the domain's DNS is managed
  there. Verification usually completes in minutes. Optionally add a **DMARC `TXT`**
  at `_dmarc`. Then leave `LEAD_NOTIFY_FROM` unset (the default sender is already
  `alertes@alliancetravel.app`) — or set it to any address on the verified domain.

> Until a domain is verified, Resend refuses the send outright. That refusal is
> shown to you word for word by the test button, so you will never be guessing.

**Step 3 — set the environment variables** listed in step 3 above:
`RESEND_API_KEY`, `OWNER_NOTIFY_EMAIL`, and `LEAD_NOTIFY_SECRET` (invent a long
random string — it is a password shared between Supabase and this site, nothing
more). Redeploy so they take effect.

**Step 4 — tell Supabase to call the site on every new lead.**
Supabase → **Database** → **Webhooks** → **Create a new hook**:

| Field | Value |
|---|---|
| Name | `notify-lead` |
| Table | `public.leads` |
| Events | **Insert** only |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://alliancetravel.app/api/notify-lead/` |
| HTTP Header | name `x-notify-secret`, value = the **same** string you used for `LEAD_NOTIFY_SECRET` |

**Copy that URL exactly, final slash included.** Without the slash the site answers
with a redirect instead of running, and Supabase does not necessarily follow one:
the lead would be saved and no email would ever be sent, with no error anywhere.

Create the hook **in the Supabase dashboard**, not through SQL — the header value is
a secret, and a migration file would put it in the repository forever.

**Step 5 — prove it.** Open **Réglages** in the dashboard. Every line under
Configuration should be green, and pressing **« Envoyer un email de test »** should
land a `[TEST]` message in your inbox within a minute. If it does not:

| What the button says | What to do |
|---|---|
| `Configuration incomplète. Il manque : …` | that env var is not set, or the site has not been redeployed since you set it |
| `… domain is not verified` | finish the DNS records in step 2, or switch to `onboarding@resend.dev` |
| `… you can only send testing emails to your own email address` | you are on `onboarding@resend.dev`; `OWNER_NOTIFY_EMAIL` must be your Resend account's address |
| `API key is invalid` | re-copy `RESEND_API_KEY` |
| Nothing arrives but the button says sent | check the **spam** folder, then Resend → **Emails** for the delivery log |
| The test button works, but real leads send nothing | the webhook URL is missing its final slash (step 4), or the hook is not on `public.leads` / not on **Insert** |

**To switch it off later:** delete the Supabase webhook, or clear `RESEND_API_KEY`.
The endpoint goes back to doing nothing; no code change is needed.

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
1. On the **Pages** tab, choose a trip.
2. The form is split into collapsible sections. Open the one you want and change what you need:

| Section | What it controls |
|---|---|
| **Référencement (Google)** | The title and description Google shows, and what appears when the page is shared on WhatsApp or Facebook |
| **En-tête de la page** | The big headline, the sur-title, the intro paragraph, the duration line, the small print |
| **Titres des sections** | The headings above the itinerary, the hotels, the map, the calculator and the final call to action |
| **Tarifs hôtels (DA)** | The price grid. Everything else that shows a price — the "from" price in the hero, the hotel cards, the calculator — is recalculated from this on save, so you only ever change it here |
| **Dates de départ** | Add, edit, remove and preselect departures |
| **Questions fréquentes** | The FAQ at the bottom of the page |
| **Points forts** | The four cards under the header |
| **Itinéraire jour par jour** | The day-by-day programme |
| **Fiches hôtels** | Hotel names and star ratings |
| **Ce qui est inclus / n'est pas inclus** | The two columns; the counters above them update themselves |
| **Avis clients** | The testimonials |

3. Click **Publier**. You'll see **"Publié ✓ — la page sera à jour dans ~1 minute"** with a link to the saved change.

**Adding and removing items.** Every list has a **+ Ajouter…** button at the bottom
and a **✕** on each row. A list cannot be emptied — the page needs at least one of
each — and you'll be told so if you try.

**Departure dates.** Each one has two boxes: the **full date**, copied word for word
into the WhatsApp message (`03 – 11 Juillet 2026`), and the **short button text**
shown on the page (`3–11 Juil 2026`). A date that has passed disappears from the site
by itself, so there is no need to delete old ones — though tidying them up is fine.

**What the messages mean:**
- **Green "Publié ✓"** — saved. The page rebuilds and goes live in ~1 minute.
- **Orange "Publication annulée : … champ(s) vide(s) ou invalide(s)"** — caught before
  anything was sent. The first offending box is highlighted and its section opened for
  you. A field left empty would break the page, so it is refused rather than published.
- **Red "Refusé — l'édition casserait la page"** — the server checked your change and
  it would have broken the build, so it was **not** saved and your live site is
  untouched. Read the reasons, fix them, click Publier again.

> **What the safety net does and does not cover.** Before anything is saved, the
> server validates the structure, recomputes every price that is derived from the
> price grid, renders the page to make sure it still builds, and checks that no text
> a translation depends on has been left empty. An edit that would stop the site
> rebuilding is refused with an explanation. What it does **not** check is whether
> what you wrote is *true* — a wrong price or a wrong date publishes happily. Treat a
> green "Publié ✓" as "the page still works", not as "the change is correct".

### The "Avancé — JSON brut" panel
Most edits use the simple fields above. The **Avancé** panel lets you edit everything else in raw form. Edit it carefully — if the text isn't valid, saving is refused.
- **Image paths are checked when you save.** A path pointing at a file that does not exist is refused with an explanation, not published. (This was not always true — the check was added later. If you are working from an older note that says image paths are unchecked, it is out of date.) Adding a *new* image is still a developer job: the file has to be uploaded to the repository first.
- **⚠️ Editing French text here does not update English or Arabic.** Those translations are stored separately. If you change a price, a date or a departure month, the English and Arabic versions of that page keep showing the **old** value, with no warning. Ask for translation updates whenever you change a number or a date.

### Leads tab
The **Leads** tab shows everyone who submitted the booking form: name, phone, city,
chosen trip/hotel/dates, party size, estimated total, and how they contacted you
(WhatsApp / email / copy). Use the search box and the filters to narrow the list.

**Exporter** offers a choice, because the right file depends on what you are doing:

| | Use it for | Notes |
|---|---|---|
| **Excel (.xlsx)** | opening the list — this is the one to pick | Dates are real dates and totals are real numbers, so you can sort by month and select the Total column to see a sum. Header row is frozen and filters are on. |
| **CSV** | importing into another program | Plain text, UTF-8. Note that double-clicking a `.csv` on a French Windows can put every column into column A — that is Excel using the French list separator, not a broken file. Use the Excel option instead, or import the CSV via *Data → From Text*. |
| **JSON** | a technical backup | Raw values, re-importable. |

You also choose **the current view** (whatever the filters are showing) or **all
requests**. The file is named with today's date, e.g. `demandes-2026-09-07.xlsx`.

Times in the export are the office's local time (Algeria), not UTC — a request that
arrives at 00:30 is filed on the right day.

---

## If something doesn't work
- **"Ce compte n'est pas autorisé."** → your email isn't in `ADMIN_EMAILS` (Part A step 3), or the deploy predates adding it.
- **Login link does nothing** → the `/admin/` URL isn't in Supabase Redirect URLs (Part A step 4).
- **Leads tab is empty but you have leads** → your email isn't in `lead_readers` (Part A step 2).
- **Edits save but the live page never changes** → `GITHUB_BRANCH` doesn't match Vercel's production branch (Part A step 3).
- **No email when a lead arrives** → press **« Envoyer un email de test »** in Réglages; it names the broken link. If the test succeeds but real leads are silent, the Supabase webhook (Part A step 4c) is missing or its `x-notify-secret` header does not match `LEAD_NOTIFY_SECRET`.
