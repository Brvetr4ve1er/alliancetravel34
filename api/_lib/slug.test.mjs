// api/_lib/slug.test.mjs — the shared path-traversal guard.
// Pure function, no mocks: this is the only thing standing between a
// caller-supplied string and `data/trips/${slug}.json` on the GitHub API.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLUG_RE, isValidSlug } from "./slug.mjs";

test("accepts the real trip slugs", () => {
  for (const s of ["istanbul", "bali", "egypte", "tunisie", "vietnam", "azerbaidjan", "kuala-lumpur"])
    assert.equal(isValidSlug(s), true, `${s} should be valid`);
});

test("rejects every traversal and encoding trick", () => {
  for (const s of [
    "../../etc/passwd", "..", "../istanbul", "istanbul/../../x", "..%2f",
    "%2e%2e%2f", "istanbul%2Fx", "istanbul/x", "istanbul\\x", "istanbul.json",
    "istanbul\0", "istanbul\n", ".", "/", "",
  ]) assert.equal(isValidSlug(s), false, `${JSON.stringify(s)} must be rejected`);
});

test("rejects casing, spaces and stray punctuation", () => {
  for (const s of ["Istanbul", "Not Valid!", "istanbul ", " istanbul", "-istanbul", "istanbul-", "kuala--lumpur", "istan_bul"])
    assert.equal(isValidSlug(s), false, `${JSON.stringify(s)} must be rejected`);
});

test("rejects non-strings, including the array shape that coerces to a valid slug", () => {
  // String(["istanbul"]) === "istanbul": a regex test on the coerced value would
  // wave this through. The type check is what stops it.
  assert.equal(isValidSlug(["istanbul"]), false);
  assert.equal(isValidSlug(["istanbul", "bali"]), false);
  assert.equal(isValidSlug(null), false);
  assert.equal(isValidSlug(undefined), false);
  assert.equal(isValidSlug(123), false);
  assert.equal(isValidSlug({ toString: () => "istanbul" }), false);
});

test("SLUG_RE is stateless — the shared instance cannot alternate between calls", () => {
  // A /g flag here would make the second .test() of the same string return false.
  assert.equal(SLUG_RE.global, false);
  assert.equal(SLUG_RE.test("istanbul"), true);
  assert.equal(SLUG_RE.test("istanbul"), true);
  assert.equal(SLUG_RE.lastIndex, 0);
});
