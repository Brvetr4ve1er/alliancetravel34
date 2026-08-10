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
