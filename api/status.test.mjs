import { test } from "node:test";
import assert from "node:assert/strict";
import { shapeStatus } from "./status.mjs";

test("shapeStatus extracts the newest commit", () => {
  const gh = [{ commit: { author: { name: "Owner", date: "2026-07-21T10:00:00Z" }, message: "content(egypte): edit via dashboard" } }];
  assert.deepEqual(shapeStatus(gh), { date: "2026-07-21T10:00:00Z", author: "Owner", message: "content(egypte): edit via dashboard" });
});
test("shapeStatus returns null on empty or malformed input", () => {
  assert.equal(shapeStatus([]), null);
  assert.equal(shapeStatus(null), null);
  assert.equal(shapeStatus([{}]), null);
});
