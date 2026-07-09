# Sub-project 2 — One-login Owner Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the non-technical owner one magic-link login to edit trip pages (validated so they can't break the live site) and view/export leads, and capture leads from the public booking form.

**Architecture:** Content stays as `data/trips/*.json` in git (Sub-project 1's source of truth). A Supabase-magic-link-gated dashboard (`site/admin/`, vanilla JS + supabase-js CDN) reads/writes through zero-dependency Vercel Node serverless functions (`api/*.mjs`): `get-trip` reads a trip's JSON+SHA from GitHub, `save-trip` verifies the caller, validates the edit with the generator's own rules, dry-run-renders it, then commits to GitHub (Vercel auto-rebuilds). The public booking form additionally inserts a lead into Supabase via PostgREST.

**Tech Stack:** Vanilla HTML/CSS/JS (no build), Node ESM (`.mjs`), Vercel Node serverless functions (global `fetch`, no npm deps), Supabase (Auth magic-link + Postgres `leads` + RLS), `@supabase/supabase-js` from jsdelivr CDN (dashboard only), GitHub REST contents API, `node --test` for unit tests.

## Global Constraints

- **Zero runtime dependencies.** No `package.json`, no `node_modules`. Server functions use only Node built-ins + global `fetch`. The dashboard loads supabase-js from `https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm` (already in CSP `script-src`).
- **No service-role key anywhere.** Identity is proven by forwarding the caller's Supabase access token to `GET {SUPABASE_URL}/auth/v1/user`. The only server-side secret is `GITHUB_TOKEN` (a fine-grained PAT: this repo only, Contents = read/write).
- **Admin allowlist = `ADMIN_EMAILS`** (comma-separated) Vercel env var. Every privileged function checks the verified email against it. (For the Leads tab to show data, the same email must also be in the Supabase `lead_readers` table — the existing RLS gate.)
- **`leads` column limits (clamp to these):** `name`≤200, `phone`≤40, `city`≤120, `trip`≤200, `hotel`≤200, `date`≤80, `room`≤40, `adults`0–50, `kids`0–50, `total_da`0–100000000, `channel`∈{`whatsapp`,`email`,`copy`}, `page`≤200, `notes`≤2000.
- **Output convention** for any regenerated page: UTF-8 BOM + LF + single trailing newline (handled by `tools/build.mjs`; never hand-edit `site/<slug>/index.html`).
- **Supabase project:** ref `vxblgxiamtphabfswnxb`, url `https://vxblgxiamtphabfswnxb.supabase.co`. Anon key is public (in `site/assets/js/lead-config.js`).
- **Env vars (Vercel, set by owner):** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public — same value as in `lead-config.js`; used as the `apikey` when verifying tokens against `/auth/v1/user`), `GITHUB_TOKEN`, `GITHUB_REPO` (`owner/name`), `GITHUB_BRANCH` (`integrate/unified-admin` for now, `main` after merge), `ADMIN_EMAILS`.
- Branch: work on `integrate/unified-admin`. Commit after every task.

---

### Task 1: Lead capture on the public booking form

**Files:**
- Create: `site/assets/js/lead-capture.js`
- Create: `tools/lead-payload.test.mjs`
- Modify: `tools/templates/sections/scripts.tpl` (add one `<script>` line)
- Rebuild output: `node tools/build.mjs` (regenerates the 7 pages with the new script tag)

**Interfaces:**
- Consumes: `window.AT_LEADS` (`{url, anonKey}` from `lead-config.js`), `window.__calcState` (`{tripName, hotel, date, room, adults, kids[], totalDA}` set by `calculator.js`), DOM ids `#bf-name/#bf-phone/#bf-city/#bf-notes`, buttons `#bf-send-btn/#bf-email-btn/#bf-copy-btn` (from `booking-form.js`).
- Produces: a global `window.AT_buildLeadPayload(state, fields, channel)` (pure; exported for tests) returning a `leads`-shaped object.

- [ ] **Step 1: Write the failing test**

Create `tools/lead-payload.test.mjs`. It loads the browser script into a sandbox with stub globals and exercises the pure builder:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Load the IIFE with fake browser globals so window.AT_buildLeadPayload is exposed.
function loadBuilder() {
  const code = readFileSync(new URL("../site/assets/js/lead-capture.js", import.meta.url), "utf8");
  const win = {};
  const ctx = {
    window: win,
    document: { getElementById: () => null, readyState: "complete", addEventListener() {} },
    location: { pathname: "/istanbul/" },
    fetch: () => Promise.resolve(),
    setInterval: () => 0,
    clearInterval: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return win.AT_buildLeadPayload;
}

test("maps calc state + fields to a leads row", () => {
  const build = loadBuilder();
  const row = build(
    { tripName: "Istanbul", hotel: "Grand Hotel", date: "12 août", room: "Double", adults: 2, kids: [1, 2], totalDA: 258000 },
    { name: "Ahmed", phone: "0561616266", city: "BBA", notes: "hi" },
    "whatsapp"
  );
  assert.equal(row.trip, "Istanbul");
  assert.equal(row.hotel, "Grand Hotel");
  assert.equal(row.adults, 2);
  assert.equal(row.kids, 2);            // array length
  assert.equal(row.total_da, 258000);
  assert.equal(row.channel, "whatsapp");
  assert.equal(row.page, "/istanbul/");
});

test("clamps oversize + out-of-range values and rejects bad channel", () => {
  const build = loadBuilder();
  const row = build(
    { adults: 999, kids: 999, totalDA: 9e12 },
    { name: "x".repeat(500), phone: "0", city: "c", notes: "n" },
    "sms"
  );
  assert.equal(row.name.length, 200);
  assert.equal(row.adults, 50);
  assert.equal(row.kids, 50);
  assert.equal(row.total_da, 100000000);
  assert.equal(row.channel, null);      // unknown channel → null
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/lead-payload.test.mjs`
Expected: FAIL — `lead-capture.js` does not exist yet (`ENOENT`) / `AT_buildLeadPayload is not a function`.

- [ ] **Step 3: Write `site/assets/js/lead-capture.js`**

```js
/* Alliance Travel — lead capture (additive, fire-and-forget).
   On a valid booking-form submit (WhatsApp / email / copy) inserts one row into
   the Supabase `leads` table via PostgREST. Never blocks or delays the primary
   CTA; a failed insert is swallowed. Emptying window.AT_LEADS disables capture. */
(function () {
  'use strict';
  var CFG = (typeof window !== 'undefined') && window.AT_LEADS;

  var MAX = { name: 200, phone: 40, city: 120, trip: 200, hotel: 200, date: 80, room: 40, page: 200, notes: 2000 };
  function str(v, max) { return v == null || v === '' ? null : String(v).slice(0, max); }
  function clampInt(v, lo, hi) { v = parseInt(v, 10); if (!Number.isFinite(v)) return null; return Math.max(lo, Math.min(hi, v)); }

  function buildLeadPayload(state, fields, channel) {
    state = state || {}; fields = fields || {};
    var kids = Array.isArray(state.kids) ? state.kids.length : state.kids;
    return {
      name: str(fields.name, MAX.name),
      phone: str(fields.phone, MAX.phone),
      city: str(fields.city, MAX.city),
      trip: str(state.tripName, MAX.trip),
      hotel: str(state.hotel, MAX.hotel),
      date: str(state.date, MAX.date),
      room: str(state.room, MAX.room),
      adults: state.adults == null ? null : clampInt(state.adults, 0, 50),
      kids: kids == null ? null : clampInt(kids, 0, 50),
      total_da: state.totalDA == null ? null : clampInt(state.totalDA, 0, 100000000),
      channel: (channel === 'whatsapp' || channel === 'email' || channel === 'copy') ? channel : null,
      page: str((typeof location !== 'undefined' && location.pathname) || '', MAX.page),
      notes: str(fields.notes, MAX.notes)
    };
  }
  // Expose the pure builder for unit tests and defensive reuse.
  if (typeof window !== 'undefined') window.AT_buildLeadPayload = buildLeadPayload;

  if (!CFG || !CFG.url || !CFG.anonKey) return; // capture disabled — behave exactly as before

  function insertLead(payload) {
    try {
      fetch(CFG.url + '/rest/v1/leads', {
        method: 'POST',
        headers: {
          apikey: CFG.anonKey,
          Authorization: 'Bearer ' + CFG.anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload),
        keepalive: true // completes even as the tab navigates to wa.me / mailto
      }).catch(function () {});
    } catch (e) { /* never surface to the user */ }
  }

  function readFields() {
    var q = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    return { name: q('bf-name'), phone: q('bf-phone'), city: q('bf-city'), notes: q('bf-notes') };
  }

  var lastKey = null; // de-dupe identical consecutive sends
  function capture(channel) {
    var f = readFields();
    if (!f.name || !f.phone || !f.city) return; // mirror the form's required gate — no junk rows
    var payload = buildLeadPayload(window.__calcState, f, channel);
    var key = channel + '|' + f.phone + '|' + (payload.total_da || '') + '|' + (payload.hotel || '');
    if (key === lastKey) return;
    lastKey = key;
    insertLead(payload);
  }

  function wire() {
    var map = { 'bf-send-btn': 'whatsapp', 'bf-email-btn': 'email', 'bf-copy-btn': 'copy' };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { capture(map[id]); });
    });
  }

  // booking-form.js injects its DOM on boot; wait until the buttons exist.
  function ready() {
    if (document.getElementById('bf-send-btn')) return wire();
    var n = 0, t = setInterval(function () {
      if (document.getElementById('bf-send-btn') || ++n > 40) { clearInterval(t); wire(); }
    }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/lead-payload.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the script to the template and rebuild**

In `tools/templates/sections/scripts.tpl`, add the lead-capture script immediately after the `lead-config.js` line:

```html
<script src="../assets/js/lead-config.js" defer></script>
<script src="../assets/js/lead-capture.js" defer></script>
```

Then rebuild the pages:

Run: `node tools/build.mjs`
Expected: `Build OK — 7 fichier(s) validé(s), N rendu(s), ...` (the 7 pages now include the new `<script>`).

- [ ] **Step 6: Browser-verify the insert path (no real row needed)**

Start the preview server, open `/istanbul/`, and confirm the wiring loads + the builder works:

- `preview_console_logs` (level error) → no errors, no 404 for `lead-capture.js`.
- `preview_eval`: `typeof window.AT_buildLeadPayload` → `"function"`.
- `preview_eval`: `window.AT_buildLeadPayload({tripName:'Istanbul',hotel:'H',adults:2,kids:[1],totalDA:100000}, {name:'A',phone:'0561616266',city:'BBA'}, 'whatsapp')` → object with `channel:"whatsapp"`, `total_da:100000`, `kids:1`.

*(Do NOT click the real WhatsApp button in verification — that would write a live row. The builder check above is sufficient; a real end-to-end insert is verified once in Task 9.)*

- [ ] **Step 7: Commit**

```bash
git add site/assets/js/lead-capture.js tools/lead-payload.test.mjs tools/templates/sections/scripts.tpl site/*/index.html
git commit -m "feat(leads): capture booking submissions into Supabase (fire-and-forget)"
```

---

### Task 2: Extract the trip validator into an importable module

**Files:**
- Create: `tools/validate-trip.mjs`
- Modify: `tools/build.mjs` (replace the inline validator with an import)
- Create: `tools/validate-trip.test.mjs`

**Interfaces:**
- Produces: `validateTrip(file, data, { enabled = false, siteDir = null, checkImages = true }) → { errors: [{file,msg}], warnings: [{file,msg}] }`. Pure: no module-level state, no `process.exit`. When `checkImages` is false OR `siteDir` is null, the on-disk image-existence check is skipped (used server-side where images aren't bundled).
- Consumes (Task 5): the serverless `save-trip` imports `validateTrip`.

- [ ] **Step 1: Write the failing test**

Create `tools/validate-trip.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateTrip } from "./validate-trip.mjs";

const good = JSON.parse(readFileSync(new URL("../data/trips/istanbul.json", import.meta.url), "utf8"));

test("a known-good trip validates with zero errors (images skipped)", () => {
  const { errors } = validateTrip("data/trips/istanbul.json", good, { checkImages: false });
  assert.deepEqual(errors, []);
});

test("a missing required field is reported as an error", () => {
  const bad = structuredClone(good);
  delete bad.meta.title;
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("meta.title")));
});

test("a negative hotel price is reported", () => {
  const bad = structuredClone(good);
  const firstHotelId = Object.keys(bad.tripData.hotels[0].prices)[0];
  bad.tripData.hotels[0].prices[firstHotelId] = -5;
  const { errors } = validateTrip("data/trips/istanbul.json", bad, { checkImages: false });
  assert.ok(errors.some(e => e.msg.includes("prices")));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tools/validate-trip.test.mjs`
Expected: FAIL — `Cannot find module './validate-trip.mjs'`.

- [ ] **Step 3: Create `tools/validate-trip.mjs`**

Move the validator out of `build.mjs` into a pure function. Copy the helper block and `validateTrip` body **verbatim** from `build.mjs` (current lines 34–200), with exactly these changes:
1. Wrap everything in an exported function whose signature is below.
2. `errors`/`warnings` become **locals** initialized to `[]`; `err`/`warn` push to them.
3. Replace the module constant `SITE_DIR` usage with the `siteDir` parameter.
4. Guard the image-existence loop (current lines 182–193) with `if (checkImages && siteDir) { ... }` and likewise guard the `related` on-disk check (194–199).
5. Return `{ errors, warnings }` at the end.

```js
// tools/validate-trip.mjs
// Pure, importable trip-JSON validator. Same rules as the build gate, with no
// module state and no process.exit, so it can run inside a serverless function.
// checkImages/siteDir gate the only filesystem-dependent checks.
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

const isStr = (v) => typeof v === "string" && v.length > 0;
const isInt = (v) => Number.isInteger(v);

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function* strings(node, path = "") {
  if (typeof node === "string") { yield [path, node]; return; }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) yield* strings(v, path ? `${path}.${k}` : k);
  }
}

export function validateTrip(file, data, { enabled = false, siteDir = null, checkImages = true } = {}) {
  const errors = [];
  const warnings = [];
  const err = (f, m) => errors.push({ file: f, msg: m });
  const warn = (f, m) => warnings.push({ file: f, msg: m });
  const req = (f, d, path, check, expect) => {
    const v = get(d, path);
    if (!check(v)) err(f, `champ requis invalide ou manquant: "${path}" (attendu: ${expect})`);
    return v;
  };

  // ── BEGIN verbatim body from build.mjs validateTrip (lines 62–199) ──
  //    with SITE_DIR → siteDir, and the two on-disk checks guarded by
  //    `if (checkImages && siteDir)`. Paste the existing logic here unchanged
  //    except for those substitutions.
  // ── END verbatim body ──

  return { errors, warnings };
}
```

> Implementer note: the body is a mechanical move. After pasting, the only tokens that should differ from the original are `SITE_DIR`→`siteDir` and the two `if (checkImages && siteDir) {` guards. Do not otherwise alter the checks.

- [ ] **Step 4: Refactor `build.mjs` to import it**

In `tools/build.mjs`: delete the helper block + `validateTrip` (current lines 34–200, keeping `toOutput`/`renderEnabled` and below). Add near the top imports:

```js
import { validateTrip } from "./validate-trip.mjs";
```

Replace the call site (current line 253) so the returned arrays are merged into the build's `errors`/`warnings`:

```js
const { errors: vErr, warnings: vWarn } = validateTrip(rel, data, { enabled, siteDir: SITE_DIR, checkImages: true });
for (const e of vErr) errors.push(e);
for (const w of vWarn) warnings.push(w);
```

Keep `const errors = []` / `const warnings = []` in `build.mjs` (they still collect JSON-parse, manifest, and blog errors).

- [ ] **Step 5: Run the validator tests + a full build to prove parity**

Run: `node --test tools/validate-trip.test.mjs`
Expected: PASS (3 tests).

Run: `node tools/build.mjs`
Expected: `Build OK — 7 fichier(s) validé(s), ...` with the **same** result as before the refactor (0 errors). If any trip now errors, the move was not verbatim — diff against the original.

- [ ] **Step 6: Commit**

```bash
git add tools/validate-trip.mjs tools/validate-trip.test.mjs tools/build.mjs
git commit -m "refactor(build): extract validateTrip into importable tools/validate-trip.mjs"
```

---

### Task 3: Serverless shared library — auth + GitHub client

**Files:**
- Create: `api/_lib/auth.mjs`
- Create: `api/_lib/github.mjs`
- Create: `api/_lib/auth.test.mjs`

**Interfaces:**
- Produces `auth.mjs`:
  - `parseBearer(req) → string|null` — extract the token from the `Authorization` header.
  - `isAllowed(email) → boolean` — case-insensitive membership in `ADMIN_EMAILS`.
  - `async verifyAdmin(req) → { ok: true, email } | { ok: false, status, error }` — parse token → `GET {SUPABASE_URL}/auth/v1/user` → check `isAllowed`.
- Produces `github.mjs`:
  - `async getFile({ path }) → { content, sha }` — GET repo contents (decoded UTF-8) + blob SHA.
  - `async putFile({ path, content, sha, message }) → { commitUrl }` — PUT repo contents; throws `{ status: 409 }` on a stale-SHA conflict.
- Consumes: env `SUPABASE_URL`, `ADMIN_EMAILS`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`.

- [ ] **Step 1: Write the failing test** (pure helpers only — no network)

Create `api/_lib/auth.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBearer, isAllowed } from "./auth.mjs";

test("parseBearer extracts the token", () => {
  assert.equal(parseBearer({ headers: { authorization: "Bearer abc.def" } }), "abc.def");
  assert.equal(parseBearer({ headers: {} }), null);
});

test("isAllowed is case-insensitive and trims", () => {
  process.env.ADMIN_EMAILS = "Owner@Example.com, second@x.io";
  assert.equal(isAllowed("owner@example.com"), true);
  assert.equal(isAllowed("SECOND@X.IO"), true);
  assert.equal(isAllowed("nobody@x.io"), false);
  assert.equal(isAllowed(""), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test api/_lib/auth.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `api/_lib/auth.mjs`**

```js
// api/_lib/auth.mjs — identity + allowlist for privileged endpoints.
// No service-role key: the caller's own Supabase token is verified against
// the Auth server, then the returned email is checked against ADMIN_EMAILS.

export function parseBearer(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export function isAllowed(email) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email).trim().toLowerCase());
}

export async function verifyAdmin(req) {
  const token = parseBearer(req);
  if (!token) return { ok: false, status: 401, error: "missing bearer token" };
  const base = process.env.SUPABASE_URL;
  let res;
  try {
    res = await fetch(`${base}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: token },
    });
  } catch (e) {
    return { ok: false, status: 502, error: "auth server unreachable" };
  }
  if (!res.ok) return { ok: false, status: 401, error: "invalid session" };
  const user = await res.json();
  const email = user && user.email;
  if (!isAllowed(email)) return { ok: false, status: 403, error: "not authorized" };
  return { ok: true, email };
}
```

- [ ] **Step 4: Create `api/_lib/github.mjs`**

```js
// api/_lib/github.mjs — minimal GitHub contents-API client (fine-grained PAT).
const API = "https://api.github.com";

function repo() { return process.env.GITHUB_REPO; }        // "owner/name"
function branch() { return process.env.GITHUB_BRANCH || "main"; }
function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "alliance-travel-admin",
  };
}

export async function getFile({ path }) {
  const url = `${API}/repos/${repo()}/contents/${path}?ref=${encodeURIComponent(branch())}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) { const e = new Error("not found"); e.status = 404; throw e; }
  if (!res.ok) { const e = new Error(`github ${res.status}`); e.status = 502; throw e; }
  const json = await res.json();
  const content = Buffer.from(json.content || "", "base64").toString("utf8");
  return { content, sha: json.sha };
}

export async function putFile({ path, content, sha, message }) {
  const url = `${API}/repos/${repo()}/contents/${path}`;
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: branch(),
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
  if (res.status === 409) { const e = new Error("stale sha"); e.status = 409; throw e; }
  if (!res.ok) { const e = new Error(`github ${res.status}`); e.status = 502; throw e; }
  const json = await res.json();
  return { commitUrl: json.commit && json.commit.html_url };
}
```

- [ ] **Step 5: Run the pure tests to verify they pass**

Run: `node --test api/_lib/auth.test.mjs`
Expected: PASS (2 tests). (Network paths in `verifyAdmin`/`github.mjs` are covered end-to-end in Task 9.)

- [ ] **Step 6: Commit**

```bash
git add api/_lib/auth.mjs api/_lib/github.mjs api/_lib/auth.test.mjs
git commit -m "feat(api): shared serverless auth (token verify + allowlist) and GitHub client"
```

---

### Task 4: `api/me` and `api/get-trip` endpoints

**Files:**
- Create: `api/me.mjs`
- Create: `api/get-trip.mjs`

**Interfaces:**
- `GET /api/me` (Bearer) → `200 { email, admin: true }` when allowlisted; `401/403` otherwise. The dashboard uses this as its single admin gate.
- `GET /api/get-trip?slug=<slug>` (Bearer, admin) → `200 { slug, content: <parsed JSON>, sha }`. `400` on bad slug, `404` if the file is missing.
- Consumes: `verifyAdmin` (Task 3), `getFile` (Task 3).
- Produces: `{ content, sha }` consumed by the dashboard's Edit Pages (Task 8) and passed back to `save-trip` (Task 5).

- [ ] **Step 1: Create `api/me.mjs`**

```js
// api/me.mjs — GET: confirm the caller is an allowlisted admin.
import { verifyAdmin } from "./_lib/auth.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  return res.status(200).json({ email: auth.email, admin: true });
}
```

- [ ] **Step 2: Create `api/get-trip.mjs`**

```js
// api/get-trip.mjs — GET ?slug= : return a trip's current JSON + GitHub SHA.
import { verifyAdmin } from "./_lib/auth.mjs";
import { getFile } from "./_lib/github.mjs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const slug = String((req.query && req.query.slug) || "");
  if (!SLUG_RE.test(slug)) return res.status(400).json({ error: "invalid slug" });

  try {
    const { content, sha } = await getFile({ path: `data/trips/${slug}.json` });
    return res.status(200).json({ slug, content: JSON.parse(content), sha });
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ error: "trip not found" });
    return res.status(e.status || 500).json({ error: e.message });
  }
}
```

- [ ] **Step 3: Sanity-check syntax (no network)**

Run: `node --check api/me.mjs && node --check api/get-trip.mjs`
Expected: no output, exit 0 (files parse as valid ESM).

- [ ] **Step 4: Commit**

```bash
git add api/me.mjs api/get-trip.mjs
git commit -m "feat(api): add /api/me (admin gate) and /api/get-trip (read JSON+SHA)"
```

---

### Task 5: `api/save-trip` — validate, dry-run render, commit

**Files:**
- Create: `api/save-trip.mjs`
- Modify: `vercel.json` (add `functions` with `includeFiles` so the generator templates are bundled)

**Interfaces:**
- `POST /api/save-trip` (Bearer, admin) body `{ slug, content, sha }` → `200 { ok:true, commitUrl }`. `400` invalid slug/JSON; `422 { errors:[...] }` schema or render failure; `409` stale SHA after one retry.
- Consumes: `verifyAdmin`, `getFile`/`putFile` (Task 3), `validateTrip` (Task 2), `renderTrip` (existing `tools/templates/trip2.mjs`).

- [ ] **Step 1: Create `api/save-trip.mjs`**

```js
// api/save-trip.mjs — POST { slug, content, sha }: gate an owner edit and commit it.
// Order: verify admin → validate (generator rules) → dry-run render (must not throw)
// → commit data/trips/<slug>.json to GitHub. A bad edit is rejected, never committed.
import { verifyAdmin } from "./_lib/auth.mjs";
import { getFile, putFile } from "./_lib/github.mjs";
import { validateTrip } from "../tools/validate-trip.mjs";
import { renderTrip } from "../tools/templates/trip2.mjs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel pre-parses JSON
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const auth = await verifyAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  let body;
  try { body = await readBody(req); }
  catch { return res.status(400).json({ error: "invalid JSON body" }); }

  const { slug, content } = body;
  let sha = body.sha;
  if (!SLUG_RE.test(String(slug || ""))) return res.status(400).json({ error: "invalid slug" });
  if (!content || typeof content !== "object") return res.status(400).json({ error: "missing content" });
  if (content.slug !== slug) return res.status(400).json({ error: "content.slug must equal slug" });

  // 1. Schema validation (images skipped — not bundled; the real build still guards).
  const { errors } = validateTrip(`data/trips/${slug}.json`, content, { enabled: true, checkImages: false });
  if (errors.length) return res.status(422).json({ errors: errors.map((e) => e.msg) });

  // 2. Dry-run render — renderTrip throws on any missing field/array/codec.
  try { renderTrip(content); }
  catch (e) { return res.status(422).json({ errors: [`rendu impossible: ${e.message}`] }); }

  // 3. Commit (retry once on a stale SHA).
  const path = `data/trips/${slug}.json`;
  const json = JSON.stringify(content, null, 2) + "\n";
  const message = `content(${slug}): edit via dashboard by ${auth.email}`;
  try {
    if (!sha) sha = (await getFile({ path })).sha;
    const { commitUrl } = await putFile({ path, content: json, sha, message });
    return res.status(200).json({ ok: true, commitUrl });
  } catch (e) {
    if (e.status === 409) {
      try {
        const fresh = await getFile({ path });
        const { commitUrl } = await putFile({ path, content: json, sha: fresh.sha, message });
        return res.status(200).json({ ok: true, commitUrl });
      } catch (e2) { return res.status(e2.status || 500).json({ error: e2.message }); }
    }
    return res.status(e.status || 500).json({ error: e.message });
  }
}
```

- [ ] **Step 2: Bundle the generator templates with the function**

`renderTrip` `readFileSync`s `tools/templates/sections/*.tpl` at runtime, so Vercel must include them in the function bundle. Add a `functions` block to `vercel.json` (top level, sibling of `headers`):

```json
  "functions": {
    "api/save-trip.mjs": { "includeFiles": "tools/**", "maxDuration": 30 }
  },
```

- [ ] **Step 3: Sanity-check syntax + prove the imports resolve locally**

Run: `node --check api/save-trip.mjs`
Expected: exit 0.

Run (proves the function's validate+render pipeline works against a real trip, exactly as it will server-side):
```bash
node --input-type=module -e "import { validateTrip } from './tools/validate-trip.mjs'; import { renderTrip } from './tools/templates/trip2.mjs'; import { readFileSync } from 'node:fs'; const d = JSON.parse(readFileSync('data/trips/istanbul.json','utf8')); const { errors } = validateTrip('x', d, { checkImages:false }); console.log('errors', errors.length); console.log('html', renderTrip(d).length, 'bytes');"
```
Expected: `errors 0` and a positive byte count (render succeeds).

- [ ] **Step 4: Commit**

```bash
git add api/save-trip.mjs vercel.json
git commit -m "feat(api): add /api/save-trip (validate + dry-run render + GitHub commit)"
```

---

### Task 6: Dashboard shell — magic-link login + admin gate + tabs

**Files:**
- Create: `site/admin/index.html`
- Create: `site/admin/admin.css`
- Create: `site/admin/app.js`
- Delete: `site/admin/config.yml` (retire Sveltia)

**Interfaces:**
- Consumes: supabase-js CDN, `window.AT_LEADS` (reuse for url+anonKey), `GET /api/me`.
- Produces: `window.AT_ADMIN = { supabase, session, token, showTab(name) }` used by Task 7 (Leads) and Task 8 (Edit Pages). Renders `#tab-leads` and `#tab-pages` containers those tasks fill.

- [ ] **Step 1: Create `site/admin/index.html`**

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Alliance Travel — Admin</title>
  <link rel="stylesheet" href="./admin.css" />
  <script src="../assets/js/lead-config.js" defer></script>
  <script type="module" src="./app.js"></script>
</head>
<body>
  <main id="app" class="admin">
    <!-- Login view -->
    <section id="view-login" class="card" hidden>
      <h1>Espace administrateur</h1>
      <p>Entrez votre email — vous recevrez un lien de connexion.</p>
      <form id="login-form">
        <input type="email" id="login-email" placeholder="vous@exemple.com" required autocomplete="email" />
        <button type="submit" class="btn">Recevoir le lien</button>
      </form>
      <p id="login-msg" class="msg" role="status" aria-live="polite"></p>
    </section>

    <!-- App view -->
    <section id="view-app" hidden>
      <header class="topbar">
        <strong>Alliance Travel — Admin</strong>
        <nav class="tabs">
          <button data-tab="pages" class="tab is-active">Pages</button>
          <button data-tab="leads" class="tab">Leads</button>
        </nav>
        <span class="spacer"></span>
        <span id="who" class="who"></span>
        <button id="logout" class="btn btn--ghost">Se déconnecter</button>
      </header>
      <div id="tab-pages" class="tabpanel"></div>
      <div id="tab-leads" class="tabpanel" hidden></div>
    </section>

    <p id="boot-msg" class="msg">Chargement…</p>
  </main>
</body>
</html>
```

- [ ] **Step 2: Create `site/admin/admin.css`** (minimal, clean, theme-agnostic)

```css
:root { --bg:#0f1115; --card:#171a21; --line:#2a2f3a; --txt:#e8eaed; --txt2:#9aa3b2; --accent:#c9872e; --danger:#e0525b; --ok:#3ecf8e; }
* { box-sizing: border-box; }
body { margin:0; font:15px/1.5 system-ui, sans-serif; background:var(--bg); color:var(--txt); }
.admin { max-width:1100px; margin:0 auto; padding:24px; }
.card { max-width:420px; margin:12vh auto; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:28px; }
.card h1 { margin:0 0 8px; font-size:1.4rem; }
input, textarea, select { width:100%; padding:10px 12px; background:#0d0f14; border:1px solid var(--line); border-radius:9px; color:var(--txt); font:inherit; }
textarea { min-height:220px; font-family:ui-monospace, monospace; font-size:13px; }
.btn { padding:10px 16px; background:var(--accent); color:#fff; border:0; border-radius:9px; font:inherit; cursor:pointer; }
.btn--ghost { background:transparent; border:1px solid var(--line); color:var(--txt); }
.btn:disabled { opacity:.5; cursor:not-allowed; }
form { display:flex; gap:8px; margin-top:14px; }
.msg { color:var(--txt2); margin-top:12px; min-height:1.2em; }
.msg.err { color:var(--danger); } .msg.ok { color:var(--ok); }
.topbar { display:flex; align-items:center; gap:16px; padding-bottom:16px; border-bottom:1px solid var(--line); margin-bottom:20px; }
.spacer { flex:1; } .who { color:var(--txt2); font-size:.85rem; }
.tabs { display:flex; gap:4px; } .tab { background:transparent; border:0; color:var(--txt2); padding:8px 12px; border-radius:8px; cursor:pointer; }
.tab.is-active { background:var(--card); color:var(--txt); border:1px solid var(--line); }
table { width:100%; border-collapse:collapse; font-size:13px; }
th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); white-space:nowrap; }
th { color:var(--txt2); position:sticky; top:0; background:var(--bg); }
.field { margin:14px 0; } .field label { display:block; color:var(--txt2); font-size:.8rem; margin-bottom:4px; }
.row { display:flex; gap:12px; flex-wrap:wrap; } .row > * { flex:1; min-width:180px; }
details.adv { margin-top:18px; border:1px dashed var(--line); border-radius:9px; padding:12px; }
```

- [ ] **Step 3: Create `site/admin/app.js`** (auth + gate + tab switching)

```js
// site/admin/app.js — Supabase magic-link auth, admin gate via /api/me, tab shell.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const CFG = window.AT_LEADS || {};
const supabase = createClient(CFG.url, CFG.anonKey);
const $ = (id) => document.getElementById(id);
const show = (el, on) => { el.hidden = !on; };

const AT_ADMIN = { supabase, session: null, token: null, showTab };
window.AT_ADMIN = AT_ADMIN;

async function callApi(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${AT_ADMIN.token}` },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
AT_ADMIN.callApi = callApi;

function showTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  show($("tab-pages"), name === "pages");
  show($("tab-leads"), name === "leads");
  document.dispatchEvent(new CustomEvent("admin:tab", { detail: name }));
}

async function enterApp(session) {
  AT_ADMIN.session = session;
  AT_ADMIN.token = session.access_token;
  const me = await callApi("/api/me");
  if (!me.ok) {
    show($("view-login"), true); show($("view-app"), false);
    $("login-msg").textContent = "Ce compte n'est pas autorisé.";
    $("login-msg").className = "msg err";
    await supabase.auth.signOut();
    return;
  }
  $("who").textContent = me.data.email;
  show($("boot-msg"), false); show($("view-login"), false); show($("view-app"), true);
  showTab("pages");
  document.dispatchEvent(new CustomEvent("admin:ready"));
}

async function boot() {
  // Handle the magic-link redirect (token in URL hash) + existing sessions.
  const { data } = await supabase.auth.getSession();
  if (data.session) return enterApp(data.session);
  show($("boot-msg"), false); show($("view-login"), true);

  supabase.auth.onAuthStateChange((_e, session) => { if (session) enterApp(session); });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim();
    const msg = $("login-msg");
    msg.className = "msg"; msg.textContent = "Envoi…";
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.href.split("#")[0] },
    });
    msg.textContent = error ? error.message : "Lien envoyé — vérifiez votre boîte mail.";
    msg.className = error ? "msg err" : "msg ok";
  });

  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
}
boot();
```

- [ ] **Step 4: Delete the Sveltia config**

```bash
git rm site/admin/config.yml
```

- [ ] **Step 5: Verify it loads (no console errors, login view shows)**

Start the preview server and open `/admin/`:
- `preview_console_logs` (error) → no errors; supabase-js loads from jsdelivr; no CSP violation.
- `preview_snapshot` → the "Espace administrateur" login form is visible; the app view is hidden.

*(Full login requires the Supabase redirect URL config + env vars — done in Task 9. This step only confirms the shell renders and the CDN import + CSP are OK.)*

- [ ] **Step 6: Commit**

```bash
git add site/admin/index.html site/admin/admin.css site/admin/app.js
git commit -m "feat(admin): dashboard shell — magic-link auth, /api/me gate, tab scaffold; retire Sveltia config"
```

---

### Task 7: Leads tab

**Files:**
- Create: `site/admin/leads.js`
- Modify: `site/admin/index.html` (add `<script type="module" src="./leads.js">`)

**Interfaces:**
- Consumes: `window.AT_ADMIN.supabase` (authenticated), the `admin:ready`/`admin:tab` events, `#tab-leads` container.
- Produces: renders a searchable leads table + CSV export into `#tab-leads`.

- [ ] **Step 1: Create `site/admin/leads.js`**

```js
// site/admin/leads.js — authenticated leads table + search + CSV export.
// SECURITY: lead values come from the PUBLIC insert path (attacker-controlled).
// Every cell is filled with textContent (never innerHTML), so a value like
// "<img src=x onerror=...>" can never execute in the owner's browser.
const COLS = ["created_at", "name", "phone", "city", "trip", "hotel", "date", "room", "adults", "kids", "total_da", "channel", "page", "notes"];
let ROWS = [];

function makeRow(r) {
  const tr = document.createElement("tr");
  for (const c of COLS) {
    const td = document.createElement("td");
    const val = r[c] == null ? "" : String(r[c]);
    td.textContent = val;   // safe: no HTML parsing
    td.title = val;         // .title is a property assignment — also safe
    tr.appendChild(td);
  }
  return tr;
}

function paint(container, rows) {
  const body = container.querySelector("#leads-body");
  body.replaceChildren(...rows.map(makeRow));
  container.querySelector("#leads-count").textContent = `${rows.length} lead(s)`;
}

function render(container, rows) {
  // Static shell only (no lead data interpolated here).
  const head = COLS.map((c) => `<th>${c}</th>`).join("");
  container.innerHTML = `
    <div class="row" style="align-items:center;margin-bottom:12px">
      <input id="leads-search" placeholder="Rechercher (nom, téléphone, voyage…)" />
      <button id="leads-csv" class="btn btn--ghost" style="flex:0">Exporter CSV</button>
      <span id="leads-count" class="who"></span>
    </div>
    <div style="overflow:auto;max-height:70vh"><table><thead><tr>${head}</tr></thead><tbody id="leads-body"></tbody></table></div>`;
  paint(container, rows); // fill rows via textContent
  container.querySelector("#leads-search").addEventListener("input", (e) => filter(container, e.target.value));
  container.querySelector("#leads-csv").addEventListener("click", () => exportCsv(ROWS));
}

function filter(container, q) {
  q = q.trim().toLowerCase();
  const rows = !q ? ROWS : ROWS.filter((r) => COLS.some((c) => String(r[c] ?? "").toLowerCase().includes(q)));
  paint(container, rows);
}

function exportCsv(rows) {
  const escC = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => escC(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  URL.revokeObjectURL(url);
}

async function load() {
  const c = document.getElementById("tab-leads");
  c.innerHTML = `<p class="msg">Chargement des leads…</p>`;
  const { data, error } = await window.AT_ADMIN.supabase
    .from("leads").select("*").order("created_at", { ascending: false });
  if (error) { c.innerHTML = `<p class="msg err">Erreur: ${error.message}</p>`; return; }
  ROWS = data || [];
  if (!ROWS.length) { c.innerHTML = `<p class="msg">Aucun lead pour le moment.</p>`; return; }
  render(c, ROWS);
}

// Load lazily the first time the Leads tab is opened.
let loaded = false;
document.addEventListener("admin:tab", (e) => { if (e.detail === "leads" && !loaded) { loaded = true; load(); } });
```

- [ ] **Step 2: Wire the script into `index.html`**

Add before `</head>` (after `app.js`):

```html
  <script type="module" src="./leads.js"></script>
```

- [ ] **Step 3: Verify syntax**

Run: `node --check site/admin/leads.js`
Expected: exit 0.

*(Live data verification happens in Task 9 once env/redirect config exists and a test lead has been inserted.)*

- [ ] **Step 4: Commit**

```bash
git add site/admin/leads.js site/admin/index.html
git commit -m "feat(admin): Leads tab — authenticated table with search + CSV export"
```

---

### Task 8: Edit Pages tab

**Files:**
- Create: `site/admin/edit-pages.js`
- Modify: `site/admin/index.html` (add `<script type="module" src="./edit-pages.js">`)

**Interfaces:**
- Consumes: `window.AT_ADMIN.callApi`, `admin:ready`/`admin:tab` events, `#tab-pages` container, `GET /api/get-trip`, `POST /api/save-trip`.
- Produces: a trip picker → high-value field form + guarded raw-JSON `<details>` → Save. High-value fields (edit in place, merged into the loaded JSON): `hero.eyebrow`, `hero.titlePre`, `hero.date`, `hero.priceFrom`, `hero.aria`, `meta.title`, `meta.description`, `finalCta.scarcity`, plus each `hotels[].priceFrom` and each `tripData.hotels[].prices.*`. Everything else is edited via the raw-JSON panel.

- [ ] **Step 1: Create `site/admin/edit-pages.js`**

```js
// site/admin/edit-pages.js — pick a trip, edit high-value fields (+ raw JSON), save.
const SLUGS = ["istanbul", "bali", "tunisie", "vietnam", "azerbaidjan", "kuala-lumpur", "egypte"];
let current = null; // { slug, content, sha }

const el = (id) => document.getElementById(id);
const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const setPath = (o, p, v) => { const k = p.split("."); let x = o; for (const s of k.slice(0, -1)) x = x[s] ?? (x[s] = {}); x[k[k.length - 1]] = v; };
// Escape before interpolating trip content into markup. Browsers decode these
// entities back when you read input/textarea `.value`, so JSON round-trips intact.
const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// [label, json-path, type]
const FIELDS = [
  ["Titre SEO (<title>)", "meta.title", "text"],
  ["Meta description", "meta.description", "textarea"],
  ["Hero — sur-titre", "hero.eyebrow", "text"],
  ["Hero — titre", "hero.titlePre", "text"],
  ["Hero — dates/durée", "hero.date", "text"],
  ["Hero — prix « à partir de »", "hero.priceFrom", "text"],
  ["Hero — aria-label", "hero.aria", "text"],
  ["CTA final — accroche urgence", "finalCta.scarcity", "text"],
];

function fieldInput(label, path, type, val) {
  const input = type === "textarea"
    ? `<textarea data-path="${path}" style="min-height:70px">${escHtml(val)}</textarea>`
    : `<input data-path="${path}" value="${escHtml(val)}" />`;
  return `<div class="field"><label>${escHtml(label)}</label>${input}</div>`;
}

function hotelPriceInputs(content) {
  const hs = getPath(content, "tripData.hotels") || [];
  return hs.map((h, i) => {
    const prices = Object.entries(h.prices || {}).map(([room, p]) =>
      `<div class="field"><label>${escHtml(room)}</label><input data-path="tripData.hotels.${i}.prices.${escHtml(room)}" data-int="1" value="${escHtml(p)}" /></div>`
    ).join("");
    return `<fieldset class="adv"><legend>${escHtml(h.id || ("hôtel " + i))} — tarifs (DA)</legend><div class="row">${prices}</div></fieldset>`;
  }).join("");
}

function renderForm(container) {
  const c = current.content;
  container.innerHTML = `
    <div class="row" style="align-items:center;margin-bottom:14px">
      <select id="ep-slug">${SLUGS.map((s) => `<option ${s === current.slug ? "selected" : ""}>${s}</option>`).join("")}</select>
      <span class="spacer"></span>
      <button id="ep-save" class="btn">Publier</button>
    </div>
    <p id="ep-msg" class="msg" role="status" aria-live="polite"></p>
    ${FIELDS.map(([l, p, t]) => fieldInput(l, p, t, getPath(c, p))).join("")}
    ${hotelPriceInputs(c)}
    <details class="adv"><summary>Avancé — JSON brut (tout le reste)</summary>
      <p class="msg">Modifiez avec précaution. La sauvegarde est refusée si le JSON est invalide.</p>
      <textarea id="ep-json">${escHtml(JSON.stringify(c, null, 2))}</textarea>
    </details>`;
  el("ep-slug").addEventListener("change", (e) => loadTrip(e.target.value));
  el("ep-save").addEventListener("click", save);
}

function collectInto(content) {
  // 1. structured fields
  document.querySelectorAll("#tab-pages [data-path]").forEach((inp) => {
    let v = inp.value;
    if (inp.dataset.int) { v = parseInt(v, 10); if (!Number.isFinite(v)) return; }
    setPath(content, inp.dataset.path, v);
  });
  return content;
}

async function loadTrip(slug) {
  const c = el("tab-pages");
  c.innerHTML = `<p class="msg">Chargement de ${slug}…</p>`;
  const r = await window.AT_ADMIN.callApi(`/api/get-trip?slug=${encodeURIComponent(slug)}`);
  if (!r.ok) { c.innerHTML = `<p class="msg err">Erreur: ${r.data.error || r.status}</p>`; return; }
  current = { slug, content: r.data.content, sha: r.data.sha };
  renderForm(c);
}

async function save() {
  const msg = el("ep-msg");
  // Base = the raw-JSON panel (authoritative for untouched structure), then overlay structured fields.
  let content;
  try { content = JSON.parse(el("ep-json").value); }
  catch (e) { msg.className = "msg err"; msg.textContent = "JSON invalide: " + e.message; return; }
  collectInto(content);
  // keep the JSON panel in sync so the user sees exactly what will be saved
  el("ep-json").value = JSON.stringify(content, null, 2);

  msg.className = "msg"; msg.textContent = "Publication…";
  el("ep-save").disabled = true;
  const r = await window.AT_ADMIN.callApi("/api/save-trip", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: current.slug, content, sha: current.sha }),
  });
  el("ep-save").disabled = false;
  if (r.ok) {
    msg.className = "msg ok";
    msg.innerHTML = `Publié ✓ — la page sera à jour dans ~1 minute. ` +
      (r.data.commitUrl ? `<a href="${r.data.commitUrl}" target="_blank" rel="noopener">Voir le commit</a>` : "");
    await loadTrip(current.slug); // refresh SHA for the next save
  } else if (r.status === 422) {
    msg.className = "msg err";
    msg.innerHTML = "Refusé — l'édition casserait la page :<br>" + (r.data.errors || []).map((e) => "• " + e).join("<br>");
  } else {
    msg.className = "msg err";
    msg.textContent = `Erreur ${r.status}: ${r.data.error || "inconnue"}`;
  }
}

let inited = false;
document.addEventListener("admin:tab", (e) => { if (e.detail === "pages" && !inited) { inited = true; loadTrip(SLUGS[0]); } });
```

- [ ] **Step 2: Wire the script into `index.html`**

Add before `</head>` (after `leads.js`):

```html
  <script type="module" src="./edit-pages.js"></script>
```

- [ ] **Step 3: Verify syntax**

Run: `node --check site/admin/edit-pages.js`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add site/admin/edit-pages.js site/admin/index.html
git commit -m "feat(admin): Edit Pages tab — high-value fields + guarded raw-JSON, save via /api/save-trip"
```

---

### Task 9: Provisioning, end-to-end verification, and owner setup doc

**Files:**
- Create: `docs/admin-setup.md` (owner-facing setup steps)

This task provisions the cloud config and verifies the whole flow against a Vercel Preview deployment. It has no unit tests; each step is a concrete manual/automated check.

- [ ] **Step 1: Create the GitHub fine-grained PAT** (owner action — document it)

In GitHub → Settings → Developer settings → Fine-grained tokens: new token, **Repository access = only this repo**, **Permissions → Contents: Read and write** (nothing else). Copy the token.

- [ ] **Step 2: Set Vercel env vars** (Preview + Production scopes)

```
SUPABASE_URL      = https://vxblgxiamtphabfswnxb.supabase.co
SUPABASE_ANON_KEY = <the public anon key — copy from site/assets/js/lead-config.js>
GITHUB_TOKEN      = <the fine-grained PAT>
GITHUB_REPO       = <owner>/<repo>
GITHUB_BRANCH     = integrate/unified-admin
ADMIN_EMAILS      = brvetr4veler@gmail.com
```

- [ ] **Step 3: Configure Supabase Auth redirect URLs**

Supabase → Authentication → URL Configuration → add the admin URLs to **Redirect URLs**: `https://<preview-domain>/admin/` and the eventual production `https://<domain>/admin/`. (Magic-link `emailRedirectTo` must be an allowlisted URL.)

- [ ] **Step 4: Confirm the owner email is in `lead_readers`** (for the Leads tab)

Verify via the Supabase MCP:
```sql
select email from public.lead_readers;
```
Expected: includes `brvetr4veler@gmail.com`. If missing, insert it (owner action / MCP).

- [ ] **Step 5: Deploy a Preview and verify the read/gate path**

Push the branch; open the Vercel Preview `/admin/`:
- Login with an allowlisted email → magic link arrives → clicking it returns to `/admin/` and the app view shows (`#who` = your email).
- Login with a NON-allowlisted email → app shows "Ce compte n'est pas autorisé." and signs out. (Confirms the `/api/me` gate.)
- Leads tab loads (empty state if no leads).

- [ ] **Step 6: Verify lead capture end-to-end (one real row)**

On a live trip page (Preview), configure the calculator, fill name/phone/city, click **Copier le texte** (channel=`copy`, no navigation). Then in the admin Leads tab, refresh → the row appears with the right `trip/hotel/total_da/channel=copy`. Export CSV → file downloads with the row.

- [ ] **Step 7: Verify the edit path — happy + rejection**

In Edit Pages, pick `istanbul`, change `hero.priceFrom` to a new value, **Publier** → "Publié ✓" + commit link; within ~2 min the live Preview `/istanbul/` shows the new price. Then set the raw-JSON `meta.title` to an empty string and Save → **422** "Refusé — l'édition casserait la page" listing `meta.title`, and the live page is unchanged. (Confirms the validator gate.)

- [ ] **Step 8: Security spot-checks**

- View-source + network on `/admin/`: no `GITHUB_TOKEN`, no service-role key present (only the public anon key). 
- `curl -s -X POST <preview>/api/save-trip -d '{"slug":"istanbul","content":{}}'` (no bearer) → `401`.
- In the raw-JSON panel, set a text field to `<script>alert(1)</script>`, Publier; view the live page source → it renders inert/encoded, not as an executable tag. (Confirms generator XSS-encoding.)
- **Stored-XSS in the admin (attacker → owner):** insert a lead whose `name` is `<img src=x onerror=alert(1)>` (via the public form's raw insert, or a one-off `fetch` to `/rest/v1/leads` with the anon key). Open the Leads tab; confirm **no alert fires** and the cell shows the literal text — proving `leads.js` renders via `textContent`, not `innerHTML`. Delete the test row afterward (Supabase MCP).

- [ ] **Step 9: Write `docs/admin-setup.md`**

Document, for the owner: the login flow, how to edit a field, what "Publié ✓" means (live in ~1 min), what a red rejection means (page protected), and the env/PAT/redirect setup from steps 1–4 (so it's reproducible for Production). Keep it non-technical.

- [ ] **Step 10: Commit**

```bash
git add docs/admin-setup.md
git commit -m "docs(admin): owner setup guide + Sub-project 2 end-to-end verified"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-07-06-dashboard-sp2-design.md`):
- §4.1 dashboard shell + auth gate → Task 6. §4.2 Edit Pages (high-value + raw JSON) → Task 8. §4.3 Leads → Task 7. §4.4 save-trip (verify→validate→dry-run→commit) → Task 5 (validator from Task 2, github/auth from Task 3). §4.5 lead capture → Task 1. §4.6 get-trip → Task 4. §5 data flow → Tasks 4/5/7/8. §6 security (no service-role, single-repo PAT, XSS encoders, allowlist) → Tasks 3/5/9. §7 reuse/add/**retire Sveltia** → Task 6 (config.yml deleted). §8 testing → Tasks 1–3 unit + Task 9 e2e/security. §9 build order → Tasks 1–9. §10 open questions (includeFiles, validator import, SHA, allowlist=env) → resolved in Tasks 5/2/4/3. All covered.
- **Deviation logged:** the admin gate uses `ADMIN_EMAILS` (env) via `/api/me` rather than a Supabase `admins` table (spec §10 left this open) — chosen because `lead_readers` has RLS-on/no-policies and is unreadable by the client. Leads-read still uses the existing `lead_readers` RLS. Documented in Global Constraints + Task 9 step 4.

**2. Placeholder scan:** No "TBD"/"handle errors"/"similar to". The one verbatim-move (Task 2 body) is explicitly bounded with exact substitutions, not a vague "port the logic". Every function has real code.

**3. Type consistency:** `validateTrip(file, data, opts) → {errors, warnings}` — defined Task 2, consumed identically Task 5. `verifyAdmin(req) → {ok,email|status,error}` — Task 3, consumed Tasks 4/5. `getFile/putFile` signatures — Task 3, consumed Tasks 4/5. `window.AT_ADMIN.callApi/showTab/supabase` — Task 6, consumed Tasks 7/8. `get-trip` returns `{slug,content,sha}` — Task 4, consumed Task 8, echoed to `save-trip` Task 5. Consistent.
