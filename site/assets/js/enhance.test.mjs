// site/assets/js/enhance.test.mjs
//
// enhance.js is a large IIFE that mutates a real document, so only the piece
// with a security contract is exercised behaviourally: showToast(), which it
// publishes as window.AT_showToast. It is loaded into a node:vm context with a
// document stub whose readyState is "loading", so boot() is merely queued on
// DOMContentLoaded and never runs.
//
// Why this matters: showToast wrote `msg` straight into innerHTML, and
// booking-form.js feeds it file.name — `${file.name} — type non supporté`,
// `Impossible de lire ${file.name}` — so dropping a file named
// `<img src=x onerror=…>.txt` on the upload zone executed script (self-XSS,
// and the same sink would fire on any future caller passing lead data).
//
// The nav-drawer assertions below are structural (a regex over the source)
// rather than behavioural: initNavDrawer is not exported and only runs inside
// boot(), which needs a full DOM this repo has no dependency to fake. They are
// deliberately narrow — they name the two constructs whose absence caused the
// bug: the retry cap and the once-only wiring marker.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("./enhance.js", import.meta.url), "utf8");

function loadToast() {
  const created = [];
  const makeEl = (tag) => ({
    tag,
    className: "",
    innerHTML: "",
    offsetWidth: 0,
    dataset: {},
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    setAttribute() {},
    appendChild() {},
  });
  const win = {
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
  };
  const ctx = {
    window: win,
    document: {
      readyState: "loading",           // boot() is queued, never invoked
      documentElement: { dataset: {}, setAttribute() {}, classList: { add() {}, remove() {} } },
      body: { appendChild(el) { created.push(el); }, classList: { toggle() {} } },
      querySelector: () => null,       // no .toast yet → one is created
      querySelectorAll: () => [],
      createElement: (tag) => makeEl(tag),
      addEventListener() {},
      getElementById: () => null,
    },
    navigator: {},                     // no serviceWorker key → registration skipped
    location: { protocol: "file:", hostname: "localhost" },
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  assert.ok(typeof win.AT_showToast === "function", "enhance.js must export window.AT_showToast");
  return { showToast: win.AT_showToast, created, formatCounter: win.AT_formatCounter };
}

/* ── showToast: the message is data, the icon is markup ────────────────── */

test("showToast(): a hostile file name cannot inject markup", () => {
  const { showToast, created } = loadToast();
  showToast('<img src=x onerror=alert(1)>.txt — type non supporté', "error");
  const html = created[0].innerHTML;

  assert.ok(!html.includes("<img"), "raw <img> must not reach the DOM");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;.txt"),
    "the name must appear escaped — proof it reached the sink through escapeHtml, not stripped");
});

test("showToast(): every HTML-significant character in the message is neutralised", () => {
  const { showToast, created } = loadToast();
  showToast(`<svg/onload=alert(1)> & "quotes" and 'apostrophes'`);
  const html = created[0].innerHTML;
  // (`<svg` alone would match the icon we authored — match the payload.)
  assert.ok(!html.includes("<svg/onload"), "raw <svg> must not reach the DOM");
  assert.ok(html.includes("&amp;"));
  assert.ok(html.includes("&quot;"));
  assert.ok(html.includes("&#39;"));
});

test("showToast(): the check icon is still real markup", () => {
  const { showToast, created } = loadToast();
  showToast("3 fichier(s) ajouté(s)");
  const html = created[0].innerHTML;
  assert.ok(html.includes("<svg"), "the icon we authored stays markup");
  assert.ok(html.includes("<polyline"));
  assert.ok(html.includes("3 fichier(s) ajouté(s)"), "clean text is untouched — escaping is not over-eager");
});

test("showToast(): the kind still drives the modifier class", () => {
  const { showToast, created } = loadToast();
  showToast("ok");
  assert.equal(created[0].className, "toast toast--success");
  const second = loadToast();
  second.showToast("bad", "error");
  assert.equal(second.created[0].className, "toast toast--error");
});

/* ── initNavDrawer: no unbounded retry, no double binding ──────────────── */

test("the nav-drawer i18n wait is capped instead of re-firing forever", () => {
  assert.match(SRC, /navDrawerTries\s*<\s*NAV_DRAWER_MAX_TRIES/,
    "the 50ms setTimeout(initNavDrawer) retry must be bounded by an attempt counter");
  assert.match(SRC, /const NAV_DRAWER_MAX_TRIES = \d+;/, "the cap must be a named constant");
  assert.match(SRC, /navDrawerTries\+\+/, "…and the counter must actually advance");
});

test("nav-drawer listeners are wired at most once across re-entries", () => {
  // Scope to initNavDrawer's own body — `btn.addEventListener('click'` also
  // appears in other init functions of this file.
  const from = SRC.indexOf("function initNavDrawer()");
  const to = SRC.indexOf("function autoMarkReveals()");
  assert.ok(from > -1 && to > from, "initNavDrawer must still be findable");
  const BODY = SRC.slice(from, to);

  const guard = BODY.indexOf("nav.dataset.drawerWired");
  assert.ok(guard > -1, "a once-only marker must gate the wiring section");

  // Every listener bound inside initNavDrawer must sit AFTER the marker: the
  // retry re-enters this function, and the button / backdrop / document /
  // window it binds to all survive that re-entry.
  for (const bind of [
    "btn.addEventListener('click'",
    "backdrop.addEventListener('click'",
    "drawer.addEventListener('click'",
    "window.addEventListener('resize'",
  ]) {
    const at = BODY.indexOf(bind);
    assert.ok(at > -1, `${bind} should still exist`);
    assert.ok(at > guard, `${bind} must be guarded by nav.dataset.drawerWired`);
  }
});

/* ── hero counters: a year is a number, not "2" ───────────────────────── */

test("a four-digit counter with a plain format counts in whole numbers", () => {
  const { formatCounter } = loadToast();
  // data-counter="2019" data-counter-format="{n}" on the homepage hero. The
  // old rule divided every target >= 1000 by 1000, so first-time visitors
  // watched the founding year settle on "2".
  assert.equal(formatCounter(2019, 2019, "{n}"), "2019");
  assert.equal(formatCounter(1210.4, 2019, "{n}"), "1210");
});

test("the K abbreviation only fires when the format asks for it", () => {
  const { formatCounter } = loadToast();
  assert.equal(formatCounter(1200, 1200, "{n}K+"), "1.2K+");
  assert.equal(formatCounter(1000, 1000, "{n}k"), "1k");
  assert.equal(formatCounter(7, 7, "{n}+"), "7+");
  assert.equal(formatCounter(4.94, 4.9, "{n}"), "4.9");
});
