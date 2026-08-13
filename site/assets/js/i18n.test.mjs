// site/assets/js/i18n.test.mjs
//
// What happens when the i18n engine boots on a page that is ALREADY in its
// language — i.e. a server-rendered /ar/<trip>/ or /en/<trip>/ variant
// (tools/templates/langpage.mjs). Enabling Arabic in data/build-manifest.json
// turned those into 8 real URLs; before that, only /en/azerbaidjan/ existed and
// nobody had ever looked at what this script does to one.
//
// It did three things, all wrong:
//   • getLang() returned the stored/navigator preference ("fr" for nearly every
//     Algerian visitor), so setHtmlAttrs() rewrote <html dir="rtl"> to "ltr" and
//     the whole Arabic layout un-mirrored on load;
//   • captureBaseline() then recorded the Arabic DOM as the "live French"
//     baseline, so every later alTranslate() (enhance.js injects trust strip,
//     sticky bar and FAB after boot and calls it) resolved missing keys against
//     T.fr and painted French into an Arabic page;
//   • the switcher swapped text in place on pages whose siblings have their own
//     canonical URLs, so the URL, <title>, hreflang and the visible language
//     disagreed.
//
// The engine is a classic IIFE over a live document, like enhance.js, so it is
// loaded into a node:vm with a document stub (same idiom as enhance.test.mjs).
// The stub is deliberately thin: only what the boot path touches.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SRC = readFileSync(new URL("./i18n.js", import.meta.url), "utf8");

// A minimal element: enough for textContent swaps, attributes and classList.
function el(tag, attrs = {}) {
  const node = {
    tag,
    textContent: attrs.text ?? "",
    innerHTML: "",
    dataset: attrs.dataset ?? {},
    className: "",
    _attrs: {},
    children: [],
    style: { cssText: "" },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    addEventListener(type, fn) { (this._on ??= {})[type] = fn; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
  if (attrs.className) node.className = attrs.className;
  return node;
}

// pageLang: what <html lang> says when the script parses (a server-rendered
// variant is stamped by langpage.mjs). tripLangs: window.AL_TRIP_LANGS.
function boot({ pageLang = "fr", dir = "ltr", stored = null, path = "/", tripLangs = null,
                i18nNodes = [], nav = true } = {}) {
  const assigned = [];
  const head = el("head");
  const body = el("body");
  body.dataset = { page: "bali" };
  const documentElement = {
    lang: pageLang,
    dir,
    dataset: {},
    classList: { add() {}, remove() {} },
    getAttribute(k) { return k === "lang" ? this.lang : null; },
    setAttribute(k, v) { if (k === "lang") this.lang = v; },
  };
  const navEl = el("nav", { className: "site-nav" });
  const created = [];

  const doc = {
    readyState: "complete",
    documentElement,
    head,
    body,
    title: "",
    createElement(tag) { const n = el(tag); created.push(n); return n; },
    querySelector(sel) {
      if (sel === ".site-nav") return nav ? navEl : null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === "[data-i18n]") return i18nNodes;
      return [];
    },
    addEventListener() {},
    dispatchEvent() {},
  };

  const store = new Map();
  if (stored) store.set("al-lang", stored);

  const win = {
    location: {
      pathname: path,
      assign(url) { assigned.push(url); },
    },
    navigator: { language: "fr-FR" },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
    addEventListener() {},
  };
  if (tripLangs) win.AL_TRIP_LANGS = tripLangs;

  const ctx = {
    window: win,
    document: doc,
    navigator: win.navigator,
    localStorage: win.localStorage,
    location: win.location,
    CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
    console,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "i18n.js" });
  return { ctx, win, doc, documentElement, assigned, navEl, store };
}

/* ── the page's own language wins over the stored preference ───────────── */

test("a server-rendered /ar/ page keeps dir=rtl even when the stored preference is French", () => {
  const { documentElement } = boot({ pageLang: "ar", dir: "rtl", stored: "fr", path: "/ar/bali/" });
  assert.equal(documentElement.lang, "ar");
  assert.equal(documentElement.dir, "rtl");
});

test("a node injected after boot is localized into Arabic, not French", () => {
  // enhance.js appends the trust strip / sticky bar / FAB after boot and then
  // calls window.alTranslate(). Its keys are absent from the baseline, so they
  // resolve from a dictionary — which one is decided by getLang(). With the
  // stored preference winning, that dictionary was T.fr.
  const served = el("p", { text: "الفنادق", dataset: { i18n: "trip_page.hotels" } });
  // A page-local key the shared dictionary knows nothing about: langpage.mjs
  // left the French in place, and re-running must not "fix" that into a dict
  // string it never had.
  const fallback = el("p", { text: "Programmes optionnels", dataset: { i18n: "baOptionalDays" } });
  const nodes = [served, fallback];
  const { ctx } = boot({ pageLang: "ar", dir: "rtl", stored: "fr", path: "/ar/bali/", i18nNodes: nodes });
  const late = el("span", { text: "", dataset: { i18n: "trip_page.nights" } });
  nodes.push(late);
  ctx.window.alTranslate();
  assert.equal(late.textContent, "ليلة");                       // T.ar.trip_page.nights
  assert.equal(served.textContent, "الفنادق");                  // re-run is idempotent
  assert.equal(fallback.textContent, "Programmes optionnels");  // served copy preserved
});

test("alGetLang() reports the page's language, so late alTranslate() calls stay Arabic", () => {
  const { win } = boot({ pageLang: "ar", dir: "rtl", stored: "fr", path: "/ar/bali/" });
  assert.equal(win.alGetLang(), "ar");
});

test("the French page still follows the stored preference", () => {
  const node = el("p", { text: "nuits", dataset: { i18n: "trip_page.nights" } });
  const { documentElement, win } = boot({ pageLang: "fr", stored: "en", path: "/bali/", i18nNodes: [node] });
  assert.equal(win.alGetLang(), "en");
  assert.equal(documentElement.lang, "en");
  assert.equal(node.textContent, "nights");
});

/* ── the Arabic webfont ────────────────────────────────────────────────── */

test("Cairo is requested on a server-rendered Arabic page even though no switch happened", () => {
  const { head } = boot({ pageLang: "ar", dir: "rtl", stored: "fr", path: "/ar/bali/" }).doc;
  const font = head.children.find((c) => c.tag === "link");
  assert.ok(font, "no <link> appended to <head>");
  assert.match(font.href, /family=Cairo/);
});

/* ── the switcher navigates between real URLs ──────────────────────────── */

test("switching to a language that has its own URL navigates there and persists the choice", () => {
  const { ctx, assigned, store } = boot({
    pageLang: "ar", dir: "rtl", path: "/ar/bali/", tripLangs: ["fr", "ar"],
  });
  ctx.window.alSetLang("fr");
  assert.deepEqual(assigned, ["/bali/"]);
  assert.equal(store.get("al-lang"), "fr");
});

test("from the French page, Arabic navigates to /ar/<slug>/ instead of swapping text", () => {
  const { ctx, assigned } = boot({ pageLang: "fr", path: "/bali/", tripLangs: ["fr", "ar"] });
  ctx.window.alSetLang("ar");
  assert.deepEqual(assigned, ["/ar/bali/"]);
});

test("a language the trip does not publish falls back to the French URL from a variant", () => {
  // bali is fr+ar only. Asking for EN on /ar/bali/ must not translate in place:
  // the baseline would be Arabic, so the page would come out half-Arabic.
  const { ctx, assigned, store } = boot({
    pageLang: "ar", dir: "rtl", path: "/ar/bali/", tripLangs: ["fr", "ar"],
  });
  ctx.window.alSetLang("en");
  assert.deepEqual(assigned, ["/bali/"]);
  assert.equal(store.get("al-lang"), "en"); // the FR page then applies EN client-side
});

test("a page with no published siblings still switches in place", () => {
  const node = el("p", { text: "nuits", dataset: { i18n: "trip_page.nights" } });
  const { ctx, assigned } = boot({ pageLang: "fr", path: "/", i18nNodes: [node] });
  ctx.window.alSetLang("en");
  assert.deepEqual(assigned, []);
  assert.equal(node.textContent, "nights");
});

test("clicking the language you are already on never navigates", () => {
  const { ctx, assigned } = boot({
    pageLang: "ar", dir: "rtl", path: "/ar/bali/", tripLangs: ["fr", "ar"],
  });
  ctx.window.alSetLang("ar");
  assert.deepEqual(assigned, []);
});

test("the language prefix is stripped once, whatever the depth", () => {
  const { ctx, assigned } = boot({
    pageLang: "en", path: "/en/azerbaidjan/", tripLangs: ["fr", "en", "ar"],
  });
  ctx.window.alSetLang("ar");
  assert.deepEqual(assigned, ["/ar/azerbaidjan/"]);
});
