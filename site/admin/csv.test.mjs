import { test } from "node:test";
import assert from "node:assert/strict";
import { csvFormulaGuard, csvCell } from "./csv.js";
import { csvCell as serverCsvCell } from "../../api/export-leads.mjs";

// ── The formula guard (OWASP CSV injection) ───────────────────────────
test("csvFormulaGuard: prefixes the four formula starters", () => {
  assert.equal(csvFormulaGuard("=1+1"), "'=1+1");
  assert.equal(csvFormulaGuard("+1+1"), "'+1+1");
  assert.equal(csvFormulaGuard("-1+1"), "'-1+1");
  assert.equal(csvFormulaGuard("@SUM(A1)"), "'@SUM(A1)");
});

test("csvFormulaGuard: prefixes TAB and CR (smuggled formula starters)", () => {
  assert.equal(csvFormulaGuard("\t=cmd"), "'\t=cmd");
  assert.equal(csvFormulaGuard("\r=cmd"), "'\r=cmd");
});

test("csvFormulaGuard: the real-world attack in a lead name", () => {
  assert.equal(csvFormulaGuard(`=cmd|' /C calc'!A0`), `'=cmd|' /C calc'!A0`);
});

test("csvFormulaGuard: leaves ordinary text alone", () => {
  assert.equal(csvFormulaGuard("Amina"), "Amina");
  assert.equal(csvFormulaGuard(""), "");
  assert.equal(csvFormulaGuard("0550 12 34 56"), "0550 12 34 56");
});

test("csvFormulaGuard: a bare negative number stays a number", () => {
  // total_da can legitimately be a refund; "-15000" must stay arithmetic.
  assert.equal(csvFormulaGuard("-15000"), "-15000");
  assert.equal(csvFormulaGuard("+1.5"), "+1.5");
  assert.equal(csvFormulaGuard("-1.5e3"), "-1.5e3");
});

test("csvFormulaGuard: a phone in +213 form is NOT a bare number", () => {
  assert.equal(csvFormulaGuard("+213 555 12 34 56"), "'+213 555 12 34 56");
});

// ── Cell escaping ─────────────────────────────────────────────────────
test("csvCell: null/undefined → empty string", () => {
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
});

test("csvCell: quotes only when the field needs it, doubling quotes", () => {
  assert.equal(csvCell("Oran"), "Oran");
  assert.equal(csvCell(185000), "185000");
  assert.equal(csvCell("Alger, Algérie"), '"Alger, Algérie"');
  assert.equal(csvCell('il a dit "oui"'), '"il a dit ""oui"""');
  assert.equal(csvCell("ligne1\nligne2"), '"ligne1\nligne2"');
});

test("csvCell: the guard quote lands INSIDE the RFC-4180 quotes", () => {
  // Outside, it would break the field instead of the attack.
  assert.equal(csvCell("=HYPERLINK(1,2)"), `"'=HYPERLINK(1,2)"`);
  assert.equal(csvCell("=1+1"), "'=1+1"); // no comma/quote/newline → no quoting
});

test("csvCell: objects are JSON-stringified, then guarded", () => {
  assert.equal(csvCell({ a: 1 }), '"{""a"":1}"');
});

// ── One rule, two exports ─────────────────────────────────────────────
test("the admin export and the server backup escape identically", () => {
  const battery = [
    null, undefined, "", "Amina", 185000, -15000, "-15000", "+213 555 12 34 56",
    "=cmd|' /C calc'!A0", "@SUM(1)", "\t=1+1", "\r=1+1", "-1+1", "+1+1",
    "Alger, Algérie", 'il a dit "oui"', "ligne1\r\nligne2", { a: 1 }, 0, false,
  ];
  for (const v of battery) {
    assert.equal(csvCell(v), serverCsvCell(v), `mismatch for ${JSON.stringify(v)}`);
  }
});
