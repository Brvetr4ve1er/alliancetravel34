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
| `GITHUB_REPO` | `owner/repo` (your GitHub owner + repository name) |
| `GITHUB_BRANCH` | the branch Vercel deploys to production (usually `main`) |
| `ADMIN_EMAILS` | your login email (comma-separated if more than one person) |

> **Important:** `GITHUB_BRANCH` must be the **same branch Vercel builds for production**. Edits are committed to this branch; if it doesn't match, your changes will save but never appear on the live site.

### 4. Allow the login link to return to your dashboard
Supabase → **Authentication** → **URL Configuration** → **Redirect URLs** → add:
`https://<your-site>/admin/`
(and the Vercel preview URL's `/admin/` if you test on previews). Without this, the emailed login link won't work.

### 5. Deploy
Redeploy the site so the new environment variables take effect. Then go to **Part B**.

---

## Part B — Using the dashboard (for the owner, no technical knowledge needed)

### Logging in
1. Open **`https://<your-site>/admin/`**.
2. Type your email, click **Recevoir le lien**.
3. Check your inbox for the email, click the link — it brings you back, logged in. No password to remember.

### Editing a page
1. On the **Pages** tab, choose a trip from the dropdown.
2. Change any of the fields shown (title, hero text, dates, "from" price, hotel prices, etc.).
3. Click **Publier**.
4. You'll see **"Publié ✓ — la page sera à jour dans ~1 minute"** with a link to the saved change. Your live page updates within about a minute.

**What the messages mean:**
- **Green "Publié ✓"** — saved. The page rebuilds and goes live in ~1 minute.
- **Red "Refusé — l'édition casserait la page"** — your change would have broken the page (e.g. a required field left empty), so it was **not** saved and your live site is untouched. Read the reasons listed, fix them, and click Publier again. *This is the safety net — you cannot break the live site.*

### The "Avancé — JSON brut" panel
Most edits use the simple fields above. The **Avancé** panel lets you edit everything else in raw form. Edit it carefully — if the text isn't valid, saving is refused.
- **One caveat:** if you change an **image path** in this panel, make sure that image file actually exists on the site. The safety check can't see images while saving, so a wrong image path will save but the page won't go live until it's corrected. (Normal field edits — prices, text, dates — are never affected by this.)

### Leads tab
The **Leads** tab shows everyone who submitted the booking form: name, phone, city, chosen trip/hotel/dates, party size, estimated total, and how they contacted you (WhatsApp / email / copy). Use the search box to filter, and **Exporter CSV** to download them for Excel.

---

## If something doesn't work
- **"Ce compte n'est pas autorisé."** → your email isn't in `ADMIN_EMAILS` (Part A step 3), or the deploy predates adding it.
- **Login link does nothing** → the `/admin/` URL isn't in Supabase Redirect URLs (Part A step 4).
- **Leads tab is empty but you have leads** → your email isn't in `lead_readers` (Part A step 2).
- **Edits save but the live page never changes** → `GITHUB_BRANCH` doesn't match Vercel's production branch (Part A step 3).
