# Continue Here

## Pick up at: verifying v5.2 hero photo backgrounds

The previous session ended right after applying the v5.2 CSS layer that:

1. **Fixed** the navbar-hidden-by-hero bug (removed `.site-nav` from a z-index: 1 reset, added `.site-nav { z-index: 100 !important; }`)
2. **Added** full-bleed hero photo backgrounds to each of the 5 trip pages, keyed off `body[data-region="..."]`
3. **Added** a 5-photo animated collage to the homepage hero (`.home-hero__photos`)

The CSS is committed to `site/assets/css/styles.css` (last 153 lines, appended from `_v5_2_styles.css`). The 5 hero JPGs exist in `site/assets/images/heroes/`. The homepage HTML has the `.home-hero__photos` markup. The 5 trip pages have `data-region` attributes.

**What was NOT verified before context ran out:** whether the photos actually render correctly in the browser on each page. That's the very next task.

---

## Step-by-step on resume

### 1. Start the dev server

```bash
# Use the preview MCP (preferred over Bash so you can take screenshots/eval JS)
preview_start path="site"
# or fall back to npx
npx serve site -p 5501 --no-clipboard
```

### 2. Visit each page and confirm the hero shows a real photo behind the dark gradient

Pages and the photo each one should be showing:

| URL path | `data-region` | Expected background photo |
|---|---|---|
| `/cairo-sharm/` | `egypt` | `assets/images/heroes/hero__cairo-sharm.jpg` |
| `/azerbaidjan/` | `azerbaijan` | `assets/images/heroes/hero__azerbaidjan.jpg` |
| `/istanbul/` | `istanbul` | `assets/images/heroes/hero__istanbul.jpg` |
| `/kuala-lumpur/` | `malaysia` | `assets/images/heroes/hero__kuala-lumpur.jpg` |
| `/sharm-constantine/` | `sharm` | `assets/images/heroes/hero__sharm-constantine.jpg` |

Screenshots help — take one per page, dark mode and light mode.

### 3. Verify the navbar is visible and on top

It should be a floating glass pill at top-center, sitting clearly above the hero photo. **Not hidden behind the hero.** That was the bug.

### 4. Verify the homepage hero has the 5-photo collage strip

`/` (homepage) — should show 5 dimmed photos in a grid behind the warm bronze gradient and the headline.

### 5. If anything is off

- Check `body` has `data-region` set: `document.body.dataset.region`
- Check the `.hero` background-image computed style: `getComputedStyle(document.querySelector('.hero')).backgroundImage`
- Check the photos are reachable: open the JPG path directly in the browser
- Check the v5.2 rules made it in: search `styles.css` for `[data-region="egypt"] .hero` — should exist
- Cache: hard reload with Ctrl+Shift+R

---

## After that's verified, the user will likely:

- Either approve and ship, or ask for further visual tweaks
- Possibly ask you to handle the **open items in [KNOWN-ISSUES.md](KNOWN-ISSUES.md)** — most notably:
  - Trust/testimonials section parity across all 5 trip pages (currently only Cairo+Sharm has it)
  - `<main id="main">` skip-link target on the 4 non-Cairo trip pages
  - Empty `og/` and `favicon/` folders

---

## Things NOT to do on resume

- Don't restart the v5/v5.2 CSS work from scratch. It's appended to `styles.css`. The `_v5_*_styles.css` files at root are historical scratch — **the real CSS is `site/assets/css/styles.css`**.
- Don't touch the data tokens in `:root` unless the user asks. They're calibrated for AA contrast.
- Don't replace "Bordj Bou Arreridj" with "Sétif" — the agency moved its identity to BBA in this session.
- Don't change phone numbers — the 6 numbers in [CONTACT-DATA.md](CONTACT-DATA.md) are canonical.
- Don't add a build step. The user wants vanilla.
