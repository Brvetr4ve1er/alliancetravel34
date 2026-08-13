#!/usr/bin/env node
// tools/parse-source.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Stage-3 parser: turns the "easy" source documents into schema-shaped DRAFT
// trip JSON, to bulk-seed the catalogue. The PDF/DOCX is an INPUT only — the
// draft is the start of a trip, not a finished page.
//
// Handles the two structured formats (per the agreed scope):
//   • AyaBooking.biz printouts  (Tunisia bus packages, *.pdf)
//   • DOCX flyers               (Sharm / Istanbul / Kuala Lumpur, *.docx)
//
// Glossy designed brochures (Bali, Vietnam…) are deliberately NOT parsed — their
// pages carry far more data than the source PDFs contain; author those by hand.
//
// Drafts land in data/trips/_drafts/<slug>.json. They are IGNORED by
// build-trips.mjs, so an unfinished draft can never deploy. A human reviews each
// draft in the CMS, fills the `_provenance.todo` fields, then moves the file up
// to data/trips/ to publish.
//
// External tools (local authoring only): `pdftotext` (poppler) + `unzip`.
//
// USAGE
//   node tools/parse-source.mjs "source of truth/Voyages Organisés - SOUSSE ALG 3.pdf"
//   node tools/parse-source.mjs --dir "source of truth"      # batch every pdf/docx
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DRAFTS_DIR = join(ROOT, "data", "trips", "_drafts");

// ── tiny utils ───────────────────────────────────────────────────────────────
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60).replace(/-+$/g, "");

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const garbled = (s) => !s || /�/.test(s);  // pdftotext replacement char

// Parse an Algerian price token: "42 000,00 DA" / "150 000 Da" / "123.000 دج"
// / "211 000DA" / "20 0000DA" → 42000 / 150000 / 123000 / 211000 / 200000.
function parseAmount(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/DA|Da|دج|DZD/gi, "").trim();
  s = s.replace(/[.,]\d{2}\b/, "");                 // drop a ",00"/".00" decimal tail
  s = s.replace(/[\s  .,'’]/g, "");       // remove thousands separators
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

// Try several regexes for one price field; first hit wins. "GRATUIT" → 0.
function firstPrice(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return /GRATUIT/i.test(m[0]) ? 0 : parseAmount(m[1]);
  }
  return null;
}

function starsFrom(text) {
  const sym = (text.match(/★/g) || []).length;
  if (sym) return Math.min(sym, 5);
  const m = text.match(/h[oô]tel\s+0?(\d)\s*[ée]toil/i);   // "hôtel 04 etoils"
  return m ? Number(m[1]) : null;
}

// ── text extraction ──────────────────────────────────────────────────────────
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#160;|&nbsp;/g, " ");
}

function extractText(file) {
  const ext = extname(file).toLowerCase();
  if (ext === ".pdf") {
    return execFileSync("pdftotext", ["-enc", "UTF-8", file, "-"], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
  }
  if (ext === ".docx") {
    const xml = execFileSync("unzip", ["-p", file, "word/document.xml"], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
    return decodeEntities(
      xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/[ \t]+/g, " ")
    );
  }
  throw new Error(`unsupported extension: ${ext}`);
}

function detectFormat(file, text) {
  if (/ayabooking/i.test(text)) return "ayabooking";
  if (extname(file).toLowerCase() === ".docx") return "docx-flyer";
  return "unknown";
}

// ── AyaBooking (Tunisia bus packages) ────────────────────────────────────────
function parseAyaBooking(text, file) {
  const flat = text.replace(/\s+/g, " ");
  const todo = [];

  // Route: "Tunisie - Sousse-BUS-Alger" | "...Djerba-BUS" | "...Hammamet / BUS"
  const route = flat.match(/Tunisie\s*[-–]\s*([A-Za-zÀ-ÿ]+)\s*[-/]\s*BUS(?:\s*[-/]\s*([A-Za-zÀ-ÿ]+))?/i);
  const destination = cap(route ? route[1] : "Tunisie");
  const departure = route && route[2] ? cap(route[2]) : null;

  // nights + hotel name (between "nuitées" and the stars / "Par bus" / "Tarif").
  const head = flat.match(/(\d+)\s*nuit[ée]es\s+(.+?)\s*(?:★|Par bus|Tarif)/i);
  const nights = head ? Number(head[1]) : null;
  let hotelName = head && !garbled(head[2]) ? head[2].replace(/★/g, "").trim() : null;
  if (hotelName && hotelName.length > 50) hotelName = null;   // runaway match guard
  if (!hotelName) todo.push("hotels[0].name (unreadable in source font — set by hand)");

  const stars = starsFrom(flat);
  const tarif = parseAmount(flat.match(/Tarif\s+([\d\s.,]+?)\s*DA\s+Commission/i)?.[1]);
  const commission = parseAmount(flat.match(/Commission\s+([\d\s.,]+?)\s*DA/i)?.[1]);
  const dates = flat.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
  const supSingle = parseAmount(flat.match(/SUPP\s+SINGLE\s+([\d\s.,]+?)\s*DA/i)?.[1]);

  // Room prices: prefer explicit descriptive numbers, else fall back to Tarif.
  const dDouble = parseAmount(flat.match(/Chambre double\s+([\d\s.,]+?)\s*DA/i)?.[1]);
  const dTriple = parseAmount(flat.match(/Chambre Triple\s+([\d\s.,]+?)\s*DA/i)?.[1]);
  const double = dDouble ?? tarif;
  const triple = dTriple ?? tarif;
  const single = double != null && supSingle != null ? double + supSingle : null;
  if (dDouble == null) todo.push("hotels[0].prices.double (guessed from Tarif — verify)");
  if (single == null) todo.push("hotels[0].prices.single");

  // Children: the "Conditions enfants et réductions" block is the most consistent.
  const cond = text.match(/Conditions enfants[\s\S]*?(?:Les prix incluent|Effectuer une|$)/i)?.[0] ?? flat;
  const child1 = firstPrice(cond, [/Premier enfant[^:]*:\s*([\d\s.,]+|GRATUIT)/i, /1er enfant[^0-9G]*([\d\s.,]+|GRATUIT)\s*DA/i]);
  const child2 = firstPrice(cond, [/Enfant de moins de 12 ans[^:]*:\s*([\d\s.,]+)/i, /2[èe]me enfant[^:]*:\s*([\d\s.,]+)/i]);
  const baby = firstPrice(cond, [/B[ée]b[ée] de moins de 1 ans?\s*:\s*([\d\s.,]+)/i]) ?? 0;
  const busIncluded = parseAmount(flat.match(/transport en bus de\s+([\d\s.,]+?)\s*DA/i)?.[1]);

  const inclBlock = text.match(/CE QUI EST INCLUE[^:]*:([\s\S]+?)(?:Nos Excursions|Note à|Tableau de tarifs)/i);
  const included = inclBlock
    ? inclBlock[1].split(/[.\n•]/).map((s) => s.trim()).filter((s) => s.length > 2)
    : [];
  const excursions = [...text.matchAll(/([A-Za-zÀ-ÿ '’]+?)\s*\(\s*En extra\s+(\d+)\s*DT[^)]*\)/gi)]
    .map((m) => ({ label: m[1].trim(), amount: Number(m[2]), currency: "DT" }));

  if (!tarif) todo.push("hero.priceFrom (Tarif not detected)");
  if (!stars) todo.push("hotels[0].stars");

  return {
    region: "tunisia", destination, departure, nights, airline: null,
    dates: dates ? [`${dates[1]} → ${dates[2]}`] : [],
    dateTag: dates ? dates[1].slice(5).replace("-", "") : null,
    hotels: [{ name: hotelName ?? "TODO hôtel", stars, prices: { double, triple, single, child1, child2, baby } }],
    included, extras: excursions,
    source: { tarif, commission, supSingle, busIncluded },
    todo,
    slugBase: slugify(`${destination}-${hotelName ?? "hotel"}${departure ? "-" + departure : ""}`),
    title: `${destination} · ${hotelName ?? "hôtel"}${stars ? " " + "★".repeat(stars) : ""}${departure ? " — départ " + departure : ""}`,
  };
}

// ── DOCX flyer (Sharm / Istanbul / KL) ───────────────────────────────────────
// Multi-dialect: hotels may be "HOTEL <NAME> <N>****" (Sharm), "<N> * HOTEL
// <NAME>" (Istanbul) or "<NAME> <N> ★" (KL). Prices come in French, English or
// Arabic labels — firstPrice() tries each.
const PRICE_PATTERNS = {
  double: [/Chambre\s*Double\s*:?\s*([\d\s.]+)\s*Da/i, /double\/?TWIN\s*([\d\s.]+)\s*DA/i, /الثنائية\s*:?\s*([\d.,]+)/],
  triple: [/Chambre\s*Triple\s*:?\s*([\d\s.]+)\s*Da/i],
  single: [/Chambre\s*Single\s*:?\s*([\d\s.]+)\s*Da/i, /chambre\s*single\s*([\d\s.]+)\s*DA/i, /الفردية\s*:?\s*([\d.,]+)/],
  child1: [/1er?\s*Enfant[^:]*:?\s*([\d\s.]+)\s*Da/i, /AVEC\s*(?:EXTRA\s*)?BED\s*([\d\s.]+)\s*DA/i, /مع السرير\s*:?\s*([\d.,]+)/],
  child2: [/2[èe]m?\s*Enfant[^:]*:?\s*([\d\s.]+)\s*Da/i, /CHILD\s*\(sans lit\)\s*([\d\s.]+)\s*DA/i, /بدون سرير\s*:?\s*([\d.,]+)/],
  baby:   [/Enfant de 0\s*a\s*0?2[^:]*:?\s*([\d\s.]+)\s*Da/i, /B[ée]b[ée]\s*\([^)]*\)\s*([\d\s.]+)\s*DA/i, /سنتين\)\s*:?\s*([\d.,]+)/],
};

function parseDocxFlyer(text, file) {
  const flat = text.replace(/\s+/g, " ");
  const fname = basename(file).toUpperCase();
  const todo = [];

  let region = "unknown", destination = basename(file, extname(file));
  if (/SSH|SHARM/.test(fname)) { region = "sharm"; destination = "Sharm El Sheikh"; }
  else if (/ISTANBUL/.test(fname)) { region = "istanbul"; destination = "Istanbul"; }
  else if (/KUALA|MALAISIE/.test(fname)) { region = "malaysia"; destination = "Kuala Lumpur"; }

  // Collect hotel anchors across the three dialects.
  const anchors = [];
  for (const m of flat.matchAll(/H[ÔO]TEL\s+([A-Za-z0-9 &'’.-]+?)\s*(\d)\s*\*+/gi)) anchors.push({ idx: m.index, name: m[1].trim(), stars: +m[2] });
  for (const m of flat.matchAll(/(\d)\s*\*\s*H[ÔO]TEL\s+([A-Za-zÀ-ÿ' ]+?)\s*(?=:|للشخص|\s{2}|$)/gi)) anchors.push({ idx: m.index, name: m[2].trim(), stars: +m[1] });
  for (const m of flat.matchAll(/\b([A-Z][A-Z' ]{3,}?)\s+(\d)\s*★/g)) anchors.push({ idx: m.index, name: m[1].trim(), stars: +m[2] });
  anchors.sort((a, b) => a.idx - b.idx);

  const hotels = [];
  const seen = new Set();
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const key = slugify(a.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const end = anchors[i + 1] ? anchors[i + 1].idx : a.idx + 700;
    const win = flat.slice(a.idx, end);
    const prices = {};
    for (const [k, pats] of Object.entries(PRICE_PATTERNS)) prices[k] = firstPrice(win, pats);
    hotels.push({ name: a.name, stars: a.stars, prices });
  }

  // Dates: "Du : 09/04 au 18/04/2026" (Sharm). Arabic date prose → todo.
  const dates = [...flat.matchAll(/Du\s*:\s*([0-9]{2}\/[0-9]{2})\s*au\s*([0-9]{2}\/[0-9]{2}\s*\/?\s*[0-9]{4})/gi)]
    .map((d) => `${d[1]} → ${d[2].replace(/\s+/g, "")}`);

  const airline = /TURKISH/i.test(flat) ? "Turkish Airlines" : /Air Alg[ée]rie|الخطوط الجوية التركية/i.test(flat) ? (/تركية/.test(flat) ? "Turkish Airlines" : "Air Algérie") : null;
  const departure = /CONSTANTINE|CZL|قسنطين/i.test(flat) ? "Constantine" : /ALGER|\bALG\b|الجزائر/i.test(flat) ? "Alger" : null;

  if (!hotels.length) todo.push("hotels[] — no hotel blocks matched (Arabic-only table; fill by hand)");
  if (!hotels.some((h) => h.prices.double)) todo.push("hotels[].prices — verify (mixed-language source)");
  if (!dates.length) todo.push("calculator.dates (Arabic date prose not parsed)");

  return {
    region, destination, departure, airline, nights: null,
    dates, dateTag: null,
    hotels, included: [], extras: [],
    source: {},
    todo,
    slugBase: slugify(`${destination}`),
    title: `${destination}${airline ? " · " + airline : ""}${departure ? " — départ " + departure : ""}`,
  };
}

// ── map a parsed record → schema-shaped DRAFT ────────────────────────────────
function toDraft(rec, slug, file, format) {
  const T = "TODO";
  const fmtDA = (n) => (n != null ? `${n.toLocaleString("fr-FR").replace(/ |\s/g, ".")} DA` : T);

  const hotels = rec.hotels.map((h, i) => ({
    id: slugify(h.name) || `hotel-${i + 1}`,
    tier: T,                                          // economique|medium|premium|luxe
    name: h.name,
    stars: h.stars ?? null,
    ribbon: h.stars ? `${h.stars}★` : T,
    image: `../assets/images/hotels/hotel__${slugify(h.name) || "todo"}.jpg`,
    alt: `${h.name} — ${rec.destination}`,
    amenities: [T],
    priceFrom: fmtDA(h.prices.double),
    priceMeta: "par personne · chambre double",
    calcName: h.stars ? `${h.name} ${h.stars}★` : h.name,
    selectOption: `${h.name}${h.stars ? " " + h.stars + "★" : ""}`,
    prices: {
      double: h.prices.double ?? 0, triple: h.prices.triple ?? h.prices.double ?? 0,
      single: h.prices.single ?? 0, child1: h.prices.child1 ?? 0,
      child2: h.prices.child2 ?? 0, baby: h.prices.baby ?? 0,
    },
    why: T,
  }));

  const cheapest = hotels.map((h) => h.prices.double).filter((n) => n > 0).sort((a, b) => a - b)[0] ?? null;

  return {
    _draft: true,
    _provenance: {
      sourceFile: basename(file),
      format,
      parsedAt: "SET-ON-COMMIT",       // scripts can't read the clock; stamp in git
      todo: [
        ...rec.todo,
        "accent.color + accent.heroGradient",
        "hero copy: h1Em, lede, eyebrow/titlePost as needed",
        "itinerary (day-by-day) — not present in source",
        "highlights[4], faq[], trust, tripMap, related[2], infoBlocks[4]",
        "hotels[].tier / amenities / why",
      ],
    },

    slug,
    region: rec.region,
    dataPage: slug.replace(/-/g, "_"),
    lang: "fr",

    meta: { title: `${rec.title} — Alliance Travel`, description: T, themeColor: T },
    accent: { color: T, heroGradient: T },

    hero: {
      eyebrow: [rec.airline, rec.departure ? `Départ ${rec.departure}` : null].filter(Boolean).join(" · ") || T,
      date: rec.nights ? `${rec.nights} nuits` : (rec.dates[0] ?? T),
      titlePre: rec.destination, titlePost: null, titleSingle: null,
      h1Pre: rec.destination, h1Em: T,
      lede: T,
      priceFrom: fmtDA(cheapest),
      priceUnit: "par personne · chambre double",
    },

    // Real parsed data ↓
    hotels,
    inclus: { included: rec.included, excluded: [] },
    calculator: {
      name: rec.title,
      dates: rec.dates,
      roomTypes: hotels[0]?.prices.triple ? ["double", "triple", "single"] : ["double", "single"],
      extras: rec.extras,
    },

    _source: rec.source,     // commission / taxes / bus — provenance, not schema
  };
}

// ── main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let files = [];
const dirIdx = args.indexOf("--dir");
if (dirIdx !== -1) {
  const dir = args[dirIdx + 1];
  files = readdirSync(dir)
    .filter((f) => /\.(pdf|docx)$/i.test(f) && !f.startsWith("~$"))
    .map((f) => join(dir, f));
} else {
  files = args.filter((a) => !a.startsWith("--"));
}

if (!files.length) {
  console.error("Usage: node tools/parse-source.mjs <file…> | --dir <sourceDir>");
  process.exit(1);
}

mkdirSync(DRAFTS_DIR, { recursive: true });
const usedSlugs = new Set();
let ok = 0, skipped = 0;

for (const file of files) {
  if (!existsSync(file)) { console.error(`✗ not found: ${file}`); continue; }
  let text, format;
  try {
    text = extractText(file);
    format = detectFormat(file, text);
  } catch (e) {
    console.error(`✗ ${basename(file)} — extract failed: ${e.message}`);
    continue;
  }

  let rec;
  if (format === "ayabooking") rec = parseAyaBooking(text, file);
  else if (format === "docx-flyer") rec = parseDocxFlyer(text, file);
  else { console.log(`· skip ${basename(file)} (glossy brochure / unrecognized — author by hand)`); skipped++; continue; }

  // Final slug: base (+ date tag) with collision-safe suffixing.
  let slug = [rec.slugBase, rec.dateTag].filter(Boolean).join("-").slice(0, 60).replace(/-+$/g, "");
  let uniq = slug, n = 2;
  while (usedSlugs.has(uniq)) uniq = `${slug}-${n++}`;
  slug = uniq;
  usedSlugs.add(slug);

  const draft = toDraft(rec, slug, file, format);
  writeFileSync(join(DRAFTS_DIR, `${slug}.json`), JSON.stringify(draft, null, 2) + "\n");
  const priced = draft.hotels.filter((h) => h.prices.double > 0).length;
  console.log(`✓ ${basename(file)}  →  _drafts/${slug}.json  (${draft.hotels.length} hotel(s), ${priced} priced, ${draft._provenance.todo.length} todo)`);
  ok++;
}

console.log(`\n${ok} draft(s) written, ${skipped} skipped. Review each in the CMS, fill the todo list, then move to data/trips/ to publish.`);
