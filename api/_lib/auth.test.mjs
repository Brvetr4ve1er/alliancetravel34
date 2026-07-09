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
