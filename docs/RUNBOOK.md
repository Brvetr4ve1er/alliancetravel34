# Owner Runbook — Alliance Travel

A plain-language guide for running the website day to day. **You never touch code.**
Everything here is done from your dashboard, your phone, or a quick message to a developer.

Your dashboard lives at **`https://<your-site>/admin/`**. Log in with your email and password.
(First time, or setting a password? See `admin-setup.md`.)

The dashboard has four tabs along the bottom:

- **Accueil** — how the site is doing (visitors, WhatsApp clicks, new requests).
- **Demandes** — every request people send from the site (your leads inbox).
- **Pages** — where you edit your trip pages (prices, dates, text).
- **Réglages** — language of the dashboard, password, and a small health check.

---

## 1. Edit a trip's price, dates, or text

1. Open the **Pages** tab.
2. Tap the trip you want to change (Istanbul, Égypte, Azerbaïdjan, …).
3. Change what you need:
   - **Prices** are grouped under *Tarifs (DA)* — one box per hotel and room type.
   - **Dates / duration**, the **"à partir de" price**, the title, and the page's SEO text each
     have their own labelled box.
   - Advanced users can open **"Modifier le JSON"** to edit the raw data — but you rarely need to.
4. Tap **Publier**.

That's it. You do not save a file, push anything, or open GitHub — the dashboard does all of it.

## 2. What "Publié ✓" means

When you tap **Publier**, the dashboard:

1. **Checks your edit** — if a change would break the page (e.g. a missing hotel photo, a broken
   price), it is **refused** with a red message explaining why, and **nothing goes live**. Your old
   page stays exactly as it was. You cannot accidentally take the site down.
2. **Saves your edit** into the website's history (this is a *commit* — a permanent, dated snapshot).
3. **Rebuilds and republishes** the site automatically.

You'll see **"Publié ✓ — la page sera à jour dans ~1 minute."** Wait about a minute, then open the
live page (refresh, or open it in a private window) to see the change. A **"Voir le commit"** link
appears next to the confirmation — that link is the exact saved snapshot of what you just published.
Keep it if you might want to look back.

> Every publish is saved forever with your name and the time. Nothing is ever lost, which is what
> makes undo (below) safe.

## 3. Undo a bad publish

Because every publish is a saved snapshot, going back to how the page was before is quick and safe.

**Using the dashboard (recommended).** The Pages editor is getting a **"Restaurer la version
précédente"** (Restore previous version) button:

1. Open the **Pages** tab and the trip you want to fix.
2. Tap **Restaurer la version précédente**.
3. Pick the earlier version from the list (each shows a date, so choose the one from *before* the bad
   change).
4. Confirm. The page rebuilds and republishes the same way a normal publish does — live again in
   about a minute.

**If that button isn't available yet.** You do **not** have to fix it by hand:

- Re-open the trip in **Pages**, correct the wrong value, and tap **Publier** again. This is the
  fastest fix for a simple mistake (a wrong price or date).
- Or send a developer the **"Voir le commit"** link (or just say *"undo the last change to the
  Istanbul page"*). Because every save is a snapshot, a developer can roll it back in a couple of
  minutes without losing anything else.

## 4. If the site looks broken or is down

Work through these in order — most "it's broken" moments are cache or a still-running rebuild.

1. **Wait one minute and refresh.** A publish takes ~1 minute to go live. Try a **private/incognito
   window** or a different phone to rule out your browser showing an old cached copy.
2. **Check the dashboard's Accueil / Réglages tab.** At the bottom you'll see a status line — a green
   "en ligne" with the date of the last publish means the system is healthy. If it shows a warning
   about GitHub / publishing not being configured, publishing is temporarily unavailable — tell a
   developer (see §6).
3. **Did the last change cause it?** If the site broke right after a publish, **undo it** (§3). That
   restores the last-good version.
4. **Is it only one page, or the whole site?** One broken page usually means a bad edit on that
   trip — undo it. The whole site being unreachable is more likely a hosting issue (Vercel) or the
   domain — that's a developer question (§6).

You genuinely cannot break the site by editing a trip: a broken edit is refused before it can go
live. So it is always safe to try an edit and publish.

## 5. Leads — where requests come in, and how to export them

People contact you two ways, both captured for you:

- **WhatsApp.** Most buttons on the site open a pre-filled WhatsApp message to the agency. Those
  chats land in your normal WhatsApp.
- **The Demandes inbox.** Every request the site captures also appears in the **Demandes** tab, with
  the person's name, phone, city, chosen trip/hotel/dates, number of travellers, and the estimated
  total in DA.

In **Demandes** you can:

- **Filter** by status — *nouveau*, *contacté*, *conclu*. Tap the coloured chip on a card to move it
  along as you work the lead.
- **Call** or **reply on WhatsApp** straight from a card (the buttons dial or open WhatsApp with that
  person's number).
- **Search** by name, phone, trip, etc.
- **Export everything to a spreadsheet** — tap **Exporter** (the download button). It saves a
  `demandes.csv` file you can open in Excel or Google Sheets.

*(Optional: you can also receive an email the moment a new lead arrives. It's built in but switched
off until a developer adds the email settings — see `admin-setup.md`.)*

## 6. If something is really wrong — what to tell a developer

Give them these details so they can help fast:

- **What you were doing** — e.g. "I published a new price on the Istanbul page."
- **What you see** — the exact message or a screenshot (especially any red error, and the status line
  from the Réglages tab).
- **When** it started, and whether it's **one page or the whole site**.
- The **"Voir le commit" link** if the problem started right after a publish.
- If pages won't publish at all: say *"the dashboard shows a GitHub / publishing warning"* — a
  developer needs to check the site's **environment variables on Vercel** (the GitHub token) and, if
  needed, **redeploy on Vercel**. These are the two most common fixes and both are done by a
  developer, not by you.

Nothing you can do from the dashboard is destructive — the worst case is always recoverable by
undoing to an earlier saved version.
