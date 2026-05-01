# How to Run

The site is plain static HTML/CSS/JS — any static server works. Pick one:

## Option 1 — Claude Preview MCP (recommended for agents)

```
preview_start path="site"
```

Then take screenshots and inspect via the other `preview_*` tools. This is the right choice when verifying visual changes.

## Option 2 — npx serve (recommended for human dev)

```bash
cd "C:/Users/ROG STRIX/Documents/alliance travel"
npx serve site -p 5501 --no-clipboard
```

Then visit `http://localhost:5501/`.

## Option 3 — Python http.server (no Node dependency)

```bash
cd "C:/Users/ROG STRIX/Documents/alliance travel"
python -m http.server 5500 --directory site
```

Then visit `http://localhost:5500/`.

## Option 4 — VS Code launch profiles

`.claude/launch.json` has both servers preconfigured:

| Profile | Tool | Port |
|---|---|---|
| `Alliance Travel (Python)` | `python -m http.server` | 5500 |
| `Alliance Travel (npx serve)` | `npx serve` | 5501 |

## Pages to visit

| Path | What it is |
|---|---|
| `/` | Homepage (5-photo collage hero, destinations grid, Algeria branches map, contact) |
| `/cairo-sharm/` | Cairo + Sharm El Sheikh All-Inclusive (`data-region="egypt"`) |
| `/azerbaidjan/` | Azerbaijan All-Inclusive (`data-region="azerbaijan"`) |
| `/istanbul/` | Istanbul (`data-region="istanbul"`) |
| `/kuala-lumpur/` | Kuala Lumpur All-Inclusive (`data-region="malaysia"`) |
| `/sharm-constantine/` | Sharm + Constantine combo (`data-region="sharm"`) |

## Theme toggle

Click the moon/sun icon at the right end of the floating nav. State persists in `localStorage`.

## Testing the calculator + booking flow

1. Open any trip page (e.g. `/cairo-sharm/`)
2. Scroll to `#reserver`
3. Change inputs in the calculator (room type, occupancy, dates) — breakdown updates live
4. Fill out the booking form below it
5. Click "Envoyer sur WhatsApp" — opens `wa.me/...` with the dossier prefilled

Behind the scenes:
- `calculator.js` updates `window.__calcState` and dispatches `calcStateUpdated`
- `booking-form.js` listens to that event and rebuilds the WhatsApp message body

## Browser dev console — useful checks

```js
// Verify region attribute
document.body.dataset.region

// Verify hero background image was applied
getComputedStyle(document.querySelector('.hero')).backgroundImage

// Inspect calculator state
window.__calcState

// Force theme toggle
document.documentElement.dataset.theme = 'light'
// or
document.documentElement.dataset.theme = 'dark'
```

## Hard refresh after CSS edits

Windows: `Ctrl+Shift+R`
Mac: `Cmd+Shift+R`

CSS sometimes caches aggressively even on localhost.
