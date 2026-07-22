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
