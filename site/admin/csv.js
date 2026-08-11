// site/admin/csv.js — CSV cell escaping for the admin's "Exporter CSV" download.
//
// This is a DELIBERATE, TESTED duplicate of api/export-leads.mjs's csvFormulaGuard
// + csvCell: the server backup and the browser export must produce byte-identical
// files, but a browser module cannot import a Vercel function. site/admin/csv.test.mjs
// runs both implementations over the same battery and asserts they agree, so the two
// copies cannot drift. Keep api/export-leads.mjs as the source of truth.
//
// It lives in its own module (rather than inside leads.js) because leads.js touches
// window/document at import time and therefore cannot be loaded by `node --test`.

// Characters that make Excel / LibreOffice / Google Sheets treat a cell as a
// FORMULA instead of text. =, + and @ start one outright; - starts one too (it is
// unary minus applied to whatever follows); TAB and CR are stripped by those apps
// before they look at the first character, so they smuggle the other four through.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

// …with one deliberate exception: a bare numeric literal. total_da can legitimately
// be negative (a refund, a credit) and "-15000" is a NUMBER to every spreadsheet, not
// a formula. Prefixing it would turn the owner's arithmetic into text, so anything
// that is exactly a number — optional sign, digits, optional decimal, optional
// exponent — is passed through untouched. "+213 555 12 34 56" is NOT a bare numeral
// and is therefore still guarded, which is also what makes it display correctly.
const BARE_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;

// CSV injection guard (OWASP). Lead name / notes / city come straight off the PUBLIC
// lead form, so `=cmd|' /C calc'!A0` in a name field is code the OWNER executes when
// she opens the download. Prefixing with a single quote makes the spreadsheet store
// the value as literal text; the quote is the standard, universally understood marker.
export function csvFormulaGuard(s) {
  if (!FORMULA_LEAD.test(s) || BARE_NUMBER.test(s)) return s;
  return `'${s}`;
}

// RFC 4180 field escaping (pure): quote a field only when it contains a comma, a
// double-quote or a newline, and double any embedded quotes. Objects (jsonb columns)
// are JSON-stringified so structured values survive the round-trip. null/undefined → "".
//
// The formula guard runs BEFORE the quoting, never after: the ' must end up INSIDE
// the RFC-4180 quotes so the CSV reader hands the spreadsheet a single text field.
// Guarding afterwards would put it outside and break the field instead of the attack.
export function csvCell(v) {
  if (v == null) return "";
  const s = csvFormulaGuard(typeof v === "object" ? JSON.stringify(v) : String(v));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
