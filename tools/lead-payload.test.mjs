import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Load the IIFE with fake browser globals so window.AT_buildLeadPayload is exposed.
function loadBuilder() {
  const code = readFileSync(new URL("../site/assets/js/lead-capture.js", import.meta.url), "utf8");
  const win = {};
  const ctx = {
    window: win,
    document: { getElementById: () => null, readyState: "complete", addEventListener() {} },
    location: { pathname: "/istanbul/" },
    fetch: () => Promise.resolve(),
    setInterval: () => 0,
    clearInterval: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return win.AT_buildLeadPayload;
}

test("maps calc state + fields to a leads row", () => {
  const build = loadBuilder();
  const row = build(
    { tripName: "Istanbul", hotel: "Grand Hotel", date: "12 août", room: "Double", adults: 2, kids: [1, 2], totalDA: 258000 },
    { name: "Ahmed", phone: "0561616266", city: "BBA", notes: "hi" },
    "whatsapp"
  );
  assert.equal(row.trip, "Istanbul");
  assert.equal(row.hotel, "Grand Hotel");
  assert.equal(row.adults, 2);
  assert.equal(row.kids, 2);            // array length
  assert.equal(row.total_da, 258000);
  assert.equal(row.channel, "whatsapp");
  assert.equal(row.page, "/istanbul/");
});

test("clamps oversize + out-of-range values and rejects bad channel", () => {
  const build = loadBuilder();
  const row = build(
    { adults: 999, kids: 999, totalDA: 9e12 },
    { name: "x".repeat(500), phone: "0", city: "c", notes: "n" },
    "sms"
  );
  assert.equal(row.name.length, 200);
  assert.equal(row.adults, 50);
  assert.equal(row.kids, 50);
  assert.equal(row.total_da, 100000000);
  assert.equal(row.channel, null);      // unknown channel → null
});
