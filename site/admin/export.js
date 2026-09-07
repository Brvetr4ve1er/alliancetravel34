// site/admin/export.js — turn lead rows into a file the owner can actually open.
//
// WHY XLSX EXISTS HERE. The dashboard shipped a comma-delimited .csv. Excel does
// not read a .csv with a fixed delimiter: on double-click it uses the machine's
// locale "list separator", which on a French/Algerian Windows is a SEMICOLON. So
// the whole export landed in column A for the one person it was written for. The
// robust fix is not a different delimiter (that breaks every other tool) — it is
// a real .xlsx, which carries its own structure and cannot be misparsed.
//
// THREE FORMATS, THREE AUDIENCES:
//   • xlsx — the owner. Typed cells (dates sort, totals SUM), French headers,
//            frozen header row, autofilter.
//   • csv  — anything else that reads tables. RFC 4180, UTF-8 BOM, OWASP
//            formula guard.
//   • json — machines. RAW column keys and raw values, so a backup can be
//            re-imported without guessing which French label meant `total_da`.
//
// ZERO DEPENDENCIES, ON PURPOSE. This repo has no package.json and no bundler.
// An .xlsx is a ZIP of XML parts, so both are implemented below: ZIP with the
// STORE method (no compression — a few hundred leads is tens of KB) plus CRC32,
// and five OOXML parts. ~40 lines of ZIP, ~90 of XML, and no supply chain.
//
// PURE MODULE. Nothing here touches window or document, so `node --test` can
// import it and api/export-leads.mjs can too — which is what makes the browser
// download and the server backup the same bytes rather than two drifting
// implementations (they used to disagree on the column list).

// ── Columns ────────────────────────────────────────────────────────────
// One list, in the order the owner reads a lead: when, who, what, how much.
// `type` drives the XLSX cell type — this is what makes a total SUM-able and a
// date sortable instead of both being text.
//
// `id` is last on purpose: it is a UUID, useful for a backup and re-import,
// useless when scanning the sheet.
export const LEAD_FIELDS = [
  { key: "created_at",     label: "Reçue le",          type: "datetime" },
  { key: "status",         label: "Statut",            type: "text" },
  { key: "name",           label: "Nom",               type: "text" },
  { key: "phone",          label: "Téléphone",         type: "text" },
  { key: "city",           label: "Ville",             type: "text" },
  { key: "trip",           label: "Voyage",            type: "text" },
  { key: "hotel",          label: "Hôtel",             type: "text" },
  { key: "date",           label: "Dates",             type: "text" },
  { key: "room",           label: "Chambre",           type: "text" },
  { key: "adults",         label: "Adultes",           type: "number" },
  { key: "kids",           label: "Enfants",           type: "number" },
  { key: "total_da",       label: "Total (DA)",        type: "number" },
  { key: "channel",        label: "Canal",             type: "text" },
  { key: "wa_destination", label: "Agence WhatsApp",   type: "office" },
  { key: "page",           label: "Page",              type: "text" },
  { key: "notes",          label: "Notes",             type: "text" },
  { key: "id",             label: "Référence interne", type: "text" },
];

// `wa_destination` stores a slug; the owner knows the branch by name.
// SOURCE OF TRUTH is site/assets/js/contacts.js, which cannot be imported here
// (it is a classic script assigning window.AT_CONTACTS, not a module).
// site/admin/export.test.mjs parses that file and asserts these ids and labels
// still match it, so the copy cannot drift — same contract csv.js has with
// api/export-leads.mjs.
export const OFFICE_LABELS = {
  "la-graf": "BBA · La Graf (siège)",
  "zehour": "BBA · Cité Zehour",
  "msila": "M'Sila",
};

// Fields for a given set of rows: the canonical list, then any column the
// database has grown since. A backup that silently drops a new field is worse
// than one with an ugly header, so an unknown key ships under its raw name.
export function leadFields(rows) {
  const out = [...LEAD_FIELDS];
  const seen = new Set(out.map((f) => f.key));
  for (const r of rows || []) {
    if (r && typeof r === "object") {
      for (const k of Object.keys(r)) {
        if (!seen.has(k)) { seen.add(k); out.push({ key: k, label: k, type: "text" }); }
      }
    }
  }
  return out;
}

// ── Time ───────────────────────────────────────────────────────────────
// Leads are stored as UTC timestamps. A spreadsheet has NO timezone concept —
// whatever number you write is displayed verbatim — so the instant must be
// converted to the office's wall clock first, or a lead that arrived at 00:30
// in Bordj Bou Arréridj is filed under the previous day.
export const OFFICE_TZ = "Africa/Algiers";

export function wallClockParts(d, tz = OFFICE_TZ) {
  try {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
    return {
      y: +p.year, mo: +p.month, d: +p.day,
      // hour12:false legitimately yields "24" for midnight in some engines.
      h: p.hour === "24" ? 0 : +p.hour, mi: +p.minute, s: +p.second,
    };
  } catch {
    // A runtime without full timezone data. Algeria has observed no DST since
    // 1981 and sits at a fixed UTC+01:00, so this fallback is exact today.
    // Revisit only if that ever changes.
    const t = new Date(d.getTime() + 60 * 60000);
    return {
      y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(),
      h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds(),
    };
  }
}

const pad2 = (n) => String(n).padStart(2, "0");

/** Human timestamp, identical in the CSV and on screen in the XLSX. */
export function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value ?? "");
  const p = wallClockParts(d);
  return `${pad2(p.d)}/${pad2(p.mo)}/${p.y} ${pad2(p.h)}:${pad2(p.mi)}`;
}

// Excel counts days since 1899-12-30. The -30 rather than -31 absorbs Excel's
// deliberate (and permanent) 1900-leap-year bug.
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

export function excelSerial(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = wallClockParts(d);
  return (Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - EXCEL_EPOCH_UTC) / 86400000;
}

// ── Cell values ────────────────────────────────────────────────────────
const isNum = (v) => v != null && v !== "" && Number.isFinite(Number(v));

/** The value a human should see, as a string. Shared by CSV and XLSX text cells. */
export function displayValue(row, field) {
  const v = row == null ? null : row[field.key];
  if (v == null || v === "") return "";
  if (field.type === "datetime") return formatDateTime(v);
  if (field.type === "office") return OFFICE_LABELS[v] || String(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── CSV ────────────────────────────────────────────────────────────────
// Characters that make a spreadsheet treat a cell as a FORMULA instead of text.
// =, + and @ start one outright; - starts one too (unary minus); TAB and CR are
// stripped by those apps before they look at the first character, so they
// smuggle the other four through.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

// …with one deliberate exception: a bare numeric literal. A total can legitimately
// be negative (a refund) and "-15000" is a NUMBER to every spreadsheet, not a
// formula; prefixing it would turn the owner's arithmetic into text.
// "+213 555 12 34 56" is NOT a bare numeral and is therefore still guarded.
const BARE_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;

// CSV injection guard (OWASP). Name / notes / city come straight off the PUBLIC
// lead form, so `=cmd|' /C calc'!A0` in a name field is code the OWNER executes
// when she opens the download. The single quote makes it literal text.
export function csvFormulaGuard(s) {
  if (!FORMULA_LEAD.test(s) || BARE_NUMBER.test(s)) return s;
  return `'${s}`;
}

// RFC 4180 field escaping. The formula guard runs BEFORE the quoting, never
// after: the ' has to end up INSIDE the quotes so the reader hands the
// spreadsheet a single text field.
export function csvCell(v) {
  if (v == null) return "";
  const s = csvFormulaGuard(typeof v === "object" ? JSON.stringify(v) : String(v));
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** rows → CSV text: French headers, CRLF line endings, RFC 4180 quoting. */
export function toCsv(rows, fields) {
  const fs = fields || leadFields(rows);
  const header = fs.map((f) => csvCell(f.label)).join(",");
  const body = (rows || []).map((r) => fs.map((f) => csvCell(displayValue(r, f))).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

/** rows → JSON text. RAW keys and RAW values: this is the re-importable one. */
export function toJson(rows, fields) {
  const fs = fields || leadFields(rows);
  const keys = fs.map((f) => f.key);
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      count: (rows || []).length,
      columns: keys,
      leads: (rows || []).map((r) => Object.fromEntries(keys.map((k) => [k, r == null ? null : r[k] ?? null]))),
    },
    null, 2,
  ) + "\n";
}

// ── ZIP (STORE) ────────────────────────────────────────────────────────
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (CRC_TABLE = t);
}

export function crc32(bytes) {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = (s) => new TextEncoder().encode(s);
const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

function concatBytes(chunks) {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * files: [{ name, data: Uint8Array }] → a ZIP archive as Uint8Array.
 * STORE only (method 0): an .xlsx of a few hundred rows is tens of KB, so
 * compression buys nothing and would cost a DEFLATE implementation.
 */
export function zipStore(files, { date = new Date() } = {}) {
  // MS-DOS timestamp: 2-second resolution, and the epoch is 1980.
  const y = Math.max(1980, date.getFullYear());
  const dosTime = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((y - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;

  const local = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const name = enc(f.name);
    const data = f.data;
    const crc = crc32(data);
    // Bit 11 (0x0800) declares the filename as UTF-8. Every part name here is
    // ASCII, but setting it costs nothing and is correct if that ever changes.
    const head = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0),
    ]);
    local.push(head, name, data);

    central.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0),
      ...u32(offset),
    ]), name);

    offset += head.length + name.length + data.length;
  }

  const cd = concatBytes(central);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(files.length), ...u16(files.length),
    ...u32(cd.length), ...u32(offset), ...u16(0),
  ]);
  return concatBytes([...local, cd, end]);
}

// ── XLSX ───────────────────────────────────────────────────────────────
// XML 1.0 has no escape for most C0 control characters — they are simply
// forbidden. A note pasted from a phone can carry one, and Excel refuses to open
// a workbook that contains one ("unreadable content"). So they are stripped, not
// escaped. This is the difference between "usually works" and the export the
// owner asked to be able to rely on.
const XML_FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function xmlText(s) {
  return String(s ?? "")
    .replace(XML_FORBIDDEN, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** 1 → "A", 27 → "AA". */
export function colName(n) {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
}

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// Style indexes used below (see cellXfs order in STYLES):
const S_HEADER = 1, S_DATE = 2, S_INT = 3;

const CONTENT_TYPES = XML_DECL +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  "</Types>";

const ROOT_RELS = XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK_RELS = XML_DECL +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

// fills[0] MUST be "none" and fills[1] MUST be "gray125" — Excel requires both
// placeholders before any real fill, and rejects the file without them.
const STYLES = XML_DECL +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2">' +
  '<numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/>' +
  '<numFmt numFmtId="165" formatCode="#,##0"/>' +
  "</numFmts>" +
  '<fonts count="2">' +
  '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
  "</fonts>" +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1C4E3A"/><bgColor indexed="64"/></patternFill></fill>' +
  "</fills>" +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

function workbookXml(sheetName) {
  return XML_DECL +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${xmlText(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    "</workbook>";
}

// A rough width per column so nothing opens as "#####" or a 3-character sliver.
const WIDTHS = { datetime: 17, number: 12, text: 20, office: 22 };
const WIDE = { name: 24, notes: 46, trip: 18, hotel: 26, date: 22, id: 38, phone: 16, status: 12 };

function cell(ref, field, row) {
  // A NUMBER cell (t="n") is what lets the owner select the Total column and
  // read a sum in the status bar. Written as text it is inert.
  if (field.type === "number") {
    const v = row[field.key];
    if (isNum(v)) return `<c r="${ref}" s="${S_INT}"><v>${Number(v)}</v></c>`;
  }
  if (field.type === "datetime") {
    const serial = row[field.key] == null || row[field.key] === "" ? null : excelSerial(row[field.key]);
    if (serial != null) return `<c r="${ref}" s="${S_DATE}"><v>${serial}</v></c>`;
  }
  const s = displayValue(row, field);
  if (s === "") return "";
  // inlineStr — a cell typed as a string. NOTE: the CSV formula guard must NOT
  // be applied here. In OOXML the type says "this is text", so a leading `'`
  // would be shown to the owner as a literal apostrophe rather than protecting
  // anything. Typing is the stronger guarantee.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlText(s)}</t></is></c>`;
}

/** rows → .xlsx bytes (Uint8Array). */
export function toXlsx(rows, fields, { sheetName = "Demandes", date = new Date() } = {}) {
  const fs = fields || leadFields(rows);
  const data = rows || [];
  const lastCol = colName(fs.length);
  const lastRow = data.length + 1;
  const ref = `A1:${lastCol}${lastRow}`;

  const cols = fs.map((f, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${WIDE[f.key] || WIDTHS[f.type] || 18}" customWidth="1"/>`
  ).join("");

  const header = `<row r="1">` + fs.map((f, i) =>
    `<c r="${colName(i + 1)}1" s="${S_HEADER}" t="inlineStr"><is><t>${xmlText(f.label)}</t></is></c>`
  ).join("") + "</row>";

  const body = data.map((r, ri) =>
    `<row r="${ri + 2}">` + fs.map((f, ci) => cell(`${colName(ci + 1)}${ri + 2}`, f, r || {})).join("") + "</row>"
  ).join("");

  const sheet = XML_DECL +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="${ref}"/>` +
    // Freeze the header and turn on the filter dropdowns: the two things that
    // make a few hundred rows workable rather than a wall.
    '<sheetViews><sheetView tabSelected="1" workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
    "</sheetView></sheetViews>" +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${header}${body}</sheetData>` +
    `<autoFilter ref="${ref}"/>` +
    "</worksheet>";

  return zipStore([
    { name: "[Content_Types].xml", data: enc(CONTENT_TYPES) },
    { name: "_rels/.rels", data: enc(ROOT_RELS) },
    { name: "xl/workbook.xml", data: enc(workbookXml(sheetName)) },
    { name: "xl/_rels/workbook.xml.rels", data: enc(WORKBOOK_RELS) },
    { name: "xl/styles.xml", data: enc(STYLES) },
    { name: "xl/worksheets/sheet1.xml", data: enc(sheet) },
  ], { date });
}

// ── One entry point ────────────────────────────────────────────────────
export const FORMATS = {
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  csv: { ext: "csv", mime: "text/csv;charset=utf-8" },
  json: { ext: "json", mime: "application/json;charset=utf-8" },
};

export function filenameFor(format, date = new Date()) {
  const p = wallClockParts(date);
  const stamp = `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`;
  return `demandes-${stamp}.${(FORMATS[format] || FORMATS.csv).ext}`;
}

/**
 * rows + format → { bytes: Uint8Array, filename, mime }.
 * The single place both the browser download and the server backup go through,
 * so the two can no longer produce different files.
 */
export function buildExport(rows, format = "xlsx", { date = new Date() } = {}) {
  const fs = leadFields(rows);
  const f = FORMATS[format] ? format : "csv";
  let bytes;
  if (f === "xlsx") {
    bytes = toXlsx(rows, fs, { date });
  } else if (f === "json") {
    bytes = enc(toJson(rows, fs));
  } else {
    // Leading BOM so Excel reads the accents in a city or a note as UTF-8
    // rather than as mojibake.
    bytes = enc("﻿" + toCsv(rows, fs));
  }
  return { bytes, filename: filenameFor(f, date), mime: FORMATS[f].mime, format: f, count: (rows || []).length };
}
