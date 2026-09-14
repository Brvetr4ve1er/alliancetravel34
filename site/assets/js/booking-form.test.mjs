// site/assets/js/booking-form.test.mjs
//
// booking-form.js is an IIFE browser script (wrapped to isolate `const fmt`
// from calculator.js), so its internals aren't module-exportable. Following
// the same technique as tools/lead-payload.test.mjs + calculator.test.mjs, we
// load the file into a node:vm context with fake browser globals; the IIFE
// publishes its pure, security-relevant helpers on window.AT_bookingInternals
// (a test hook, mirroring lead-capture.js's window.AT_buildLeadPayload). boot()
// no-ops because document.getElementById('booking') returns null.
//
// The point of this suite is a NON-VACUOUS lock on the innerHTML escaping: the
// booking form has no backend, so unescaped user input is only self-XSS, but
// the render helpers interpolate name/number/expiry/dob straight into an HTML
// string. renderPassportEntry() is exercised with hostile input so that if a
// future edit drops an escapeHtml() call at any sink, a test here goes red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function load() {
  const code = readFileSync(new URL("./booking-form.js", import.meta.url), "utf8");
  const win = {};
  const ctx = {
    window: win,
    document: {
      getElementById: () => null,      // boot() finds no #booking mount → returns early
      readyState: "complete",
      addEventListener() {},
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const api = win.AT_bookingInternals;
  assert.ok(api, "booking-form.js must expose window.AT_bookingInternals");
  return api;
}

/* ── escapeHtml: the primitive ─────────────────────────────────────────── */

test("escapeHtml(): neutralizes all five HTML-significant characters", () => {
  const { escapeHtml } = load();
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;');
  assert.equal(escapeHtml("O'Brien"), 'O&#39;Brien');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  // Order matters: & must be escaped first so it doesn't double-escape entities.
  assert.equal(escapeHtml('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

test("escapeHtml(): passes through null/undefined and plain text untouched", () => {
  const { escapeHtml } = load();
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml('Ahmed Benkhalifa'), 'Ahmed Benkhalifa');
  assert.equal(escapeHtml(''), '');
});

/* ── renderPassportEntry: the real sink (non-vacuous XSS lock) ──────────── */

const XSS = {
  name:   '"><script>alert(1)</script>',
  number: 'A" onmouseover="alert(2)',
  expiry: "'><img src=x onerror=alert(3)>",
  dob:    '"><svg/onload=alert(4)>',
};

test("renderPassportEntry(): escapes hostile input at every user-controlled field", () => {
  const { renderPassportEntry } = load();
  const html = renderPassportEntry(0, XSS);

  // No raw markup survives — the payloads must never appear verbatim.
  assert.ok(!html.includes('<script>'),        'raw <script> must not appear');
  assert.ok(!html.includes('<img src=x'),      'raw <img> must not appear');
  assert.ok(!html.includes('<svg/onload'),     'raw <svg> must not appear');
  assert.ok(!html.includes('"><'),             'no attribute breakout ("><) may survive');

  // The escaped forms are present — proving the input reached the sink escaped
  // (not merely stripped). If any escapeHtml() call is reverted this fails.
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'name field must be escaped');
  assert.ok(html.includes('&quot;'),  'double-quote payloads must be entity-escaped');
  assert.ok(html.includes('&lt;img'), 'expiry field must be escaped');
  assert.ok(html.includes('&lt;svg'), 'dob field must be escaped');
});

test("renderPassportEntry(): preserves valid input verbatim (escaping is not over-eager)", () => {
  const { renderPassportEntry } = load();
  const html = renderPassportEntry(0, { name: 'Ahmed Benkhalifa', number: 'AB 123456', expiry: '2027-05-01', dob: '1990-03-12' });
  assert.ok(html.includes('value="Ahmed Benkhalifa"'), 'a clean name must render unchanged');
  assert.ok(html.includes('value="AB 123456"'),        'a clean passport number must render unchanged');
  assert.ok(html.includes('value="2027-05-01"'),       'a clean expiry date must render unchanged');
});

test("renderPassportEntry(): first traveller has no remove button; later ones do", () => {
  const { renderPassportEntry } = load();
  assert.ok(!renderPassportEntry(0, {}).includes('data-remove="0"'), 'traveller 1 is not removable');
  assert.ok(renderPassportEntry(2, {}).includes('data-remove="2"'),  'traveller 3 is removable');
});

/* ── the form chrome is built per language ─────────────────────────────── */

test("UI: fr, en and ar carry exactly the same keys", () => {
  // A key missing from one language would render the literal string
  // "undefined" in that language's form, and nothing else would notice.
  const { UI } = load();
  const keys = (o) => Object.keys(o).sort().join(",");
  assert.equal(keys(UI.en), keys(UI.fr));
  assert.equal(keys(UI.ar), keys(UI.fr));
  for (const lang of ["fr", "en", "ar"]) {
    for (const [k, v] of Object.entries(UI[lang])) {
      const val = typeof v === "function" ? v(2) : v;
      assert.ok(typeof val === "string" && val.trim(), `${lang}.${k} must be a non-empty string`);
    }
  }
});

test("formHtml(): the Arabic form has no French chrome left and keeps every id the JS binds", () => {
  const { formHtml, UI } = load();
  const ar = formHtml(UI.ar);
  for (const id of ["bf-name", "bf-phone", "bf-city", "bf-office", "bf-passport-consent",
                    "bf-passport-fields", "bf-files", "bf-notes", "bf-send-btn", "bf-copy-btn"]) {
    assert.ok(ar.includes(`id="${id}"`), `#${id} must survive the rewrite`);
  }
  assert.ok(ar.includes(UI.ar.phase) && ar.includes(UI.ar.banner), "Arabic strings are in the markup");
  assert.ok(!ar.includes("Responsable du dossier") && !ar.includes("Copier le texte"), "no French left");
  // The French template escapes its own ampersand, exactly as the old literal did.
  assert.ok(formHtml(UI.fr).includes("Nom &amp; Prénom"));
});

test("formHtml(): a translation string cannot become markup", () => {
  const { formHtml, UI } = load();
  const hostile = { ...UI.fr, phase: '<img src=x onerror=alert(1)>', phNotes: '" autofocus onfocus="alert(2)' };
  const html = formHtml(hostile);
  assert.ok(!html.includes("<img src=x"), "text slots are escaped");
  assert.ok(!html.includes('placeholder="" autofocus'), "attribute slots are escaped");
});

test("renderPassportEntry(): renders in the language it is given", () => {
  const { renderPassportEntry, UI } = load();
  assert.ok(renderPassportEntry(1, {}, UI.ar).includes(UI.ar.traveler(2)));
  assert.ok(renderPassportEntry(1, {}, UI.en).includes('aria-label="Remove traveller 2"'));
  assert.ok(renderPassportEntry(0, {}).includes("Voyageur 1"), "French stays the default");
});

test("the office picker prefers the short label", () => {
  const src = readFileSync(new URL("./booking-form.js", import.meta.url), "utf8");
  // Two of the three office labels overflowed the 238px select at 375px.
  assert.match(src, /escapeHtml\(o\.short \|\| o\.label \|\| o\.id\)/);
  const contacts = readFileSync(new URL("./contacts.js", import.meta.url), "utf8");
  const shorts = contacts.match(/short:/g) || [];
  const offices = contacts.match(/\bwa: '/g) || [];
  assert.equal(shorts.length, offices.length, "every office needs a short label");
});

/* ── Phone validation + error announcement ────────────────────────────── */

test("the phone pattern bounds the length and tolerates a spaced +213", () => {
  // The old pattern was ^(\+213|0)[5-7][0-9 ]{8,}$ — open-ended, so a 19-digit
  // string passed, while "+213 561 616 266" (a space right after the country
  // code, which is how people actually write it) was rejected.
  const { formHtml, UI } = load();
  const m = formHtml(UI.fr).match(/id="bf-phone"[\s\S]*?pattern="([^"]+)"/);
  assert.ok(m, "#bf-phone must carry a pattern attribute");
  const re = new RegExp(`^(?:${m[1].replace(/&quot;/g, '"')})$`);   // same wrapping _validate uses

  for (const ok of ["0561616266", "0561 616 266", "+213561616266",
                    "+213 561 616 266", "+213-561-616-266", "0661616266", "0761616266"])
    assert.equal(re.test(ok), true, `${ok} should be accepted`);

  for (const bad of ["0561616266123456789", "056161626", "0461616266", "abcdefghij", ""])
    assert.equal(re.test(bad), false, `${bad} should be rejected`);
});

test("field errors are announced, not just shown", () => {
  // They are revealed on blur, by which time focus has already moved on, so
  // aria-describedby alone never gets read out.
  const { formHtml, UI } = load();
  const html = formHtml(UI.fr);
  for (const id of ["bf-name-err", "bf-phone-err", "bf-city-err"]) {
    const m = html.match(new RegExp(`<p[^>]*id="${id}"[^>]*>`));
    assert.ok(m, `#${id} must exist`);
    assert.match(m[0], /aria-live="polite"/, `#${id} must be a live region`);
    assert.match(m[0], /\bhidden\b/, `#${id} must still ship hidden`);
  }
});

test("a silent validation pass clears a resolved error but never raises one", () => {
  // Typing a fix re-enabled the send button while the red border and message
  // stayed put, because the whole UI branch was skipped when silent.
  const src = readFileSync(new URL("./booking-form.js", import.meta.url), "utf8");
  const at = src.indexOf("_validate({ silent");
  assert.ok(at > -1, "_validate must exist");
  const body = src.slice(at, at + 2400);
  const branchAt = body.search(/\}\s*else if \(!err\)\s*\{/);
  assert.ok(branchAt > -1, "silent mode must have a clear-only branch");
  const clearBranch = body.slice(branchAt, branchAt + 300);
  assert.match(clearBranch, /classList\.remove\('is-invalid'\)/);
  assert.match(clearBranch, /errEl\.hidden = true/);
});
