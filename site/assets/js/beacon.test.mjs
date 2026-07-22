import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvent } from "./beacon.js";

test("buildEvent shapes a view", () => {
  assert.deepEqual(buildEvent("view", "egypte", null), { kind: "view", page: "egypte", event: null });
});
test("buildEvent shapes a click with its event name", () => {
  assert.deepEqual(buildEvent("wa_click", "istanbul", "hero_cta_whatsapp"),
    { kind: "wa_click", page: "istanbul", event: "hero_cta_whatsapp" });
});
test("buildEvent clamps page and event to 64 chars", () => {
  const long = "x".repeat(200);
  const e = buildEvent("view", long, long);
  assert.equal(e.page.length, 64);
  assert.equal(e.event.length, 64);
});
test("buildEvent rejects unknown kinds and empty page", () => {
  assert.equal(buildEvent("purchase", "p", null), null);
  assert.equal(buildEvent("view", "", null), null);
  assert.equal(buildEvent("view", null, null), null);
});
