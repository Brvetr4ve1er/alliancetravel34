import { test } from "node:test";
import assert from "node:assert/strict";
import { STRINGS } from "./i18n.js";

test("fr and ar carry exactly the same keys", () => {
  const fr = Object.keys(STRINGS.fr).sort();
  const ar = Object.keys(STRINGS.ar).sort();
  assert.deepEqual(ar, fr);
});
test("no empty strings", () => {
  for (const lang of ["fr", "ar"])
    for (const [k, v] of Object.entries(STRINGS[lang]))
      assert.ok(typeof v === "string" && v.length > 0, `${lang}.${k}`);
});

test("applyI18n sets aria-label from data-i18n-aria-label, and re-applies on setLang", async () => {
  // #lang-toggle's own visible text is the OTHER language's name ("عربي" on a
  // French screen), so its aria-label cannot come from data-i18n the way an
  // ordinary label does without the two fighting over the same node's text.
  // Minimal global.document stub: only what setLang()/applyI18n() touch.
  const elements = new Map();
  function makeEl() {
    const attrs = {};
    return {
      setAttribute(k, v) { attrs[k] = v; },
      getAttribute(k) { return attrs[k]; },
      dataset: {},
    };
  }
  const target = makeEl();
  target.dataset.i18nAriaLabel = "nav.lang_toggle";
  const fakeDocumentElement = { lang: "", dir: "" };
  global.document = {
    documentElement: fakeDocumentElement,
    querySelectorAll(sel) {
      if (sel === "[data-i18n-aria-label]") return [target];
      return [];
    },
    dispatchEvent() {},
  };
  try {
    const { setLang, t } = await import("./i18n.js?cachebust=" + Date.now());
    setLang("fr");
    assert.equal(target.getAttribute("aria-label"), t("nav.lang_toggle"));
    setLang("ar");
    assert.equal(target.getAttribute("aria-label"), t("nav.lang_toggle"));
    assert.notEqual(STRINGS.fr["nav.lang_toggle"], STRINGS.ar["nav.lang_toggle"]);
  } finally {
    delete global.document;
  }
});
