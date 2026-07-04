// tools/templates/codecs.mjs
// Custom codecs for the {{&name}} slots — the two inline <script> data blobs.
//
// The live pages carry hand-written JS object literals (single quotes,
// unquoted keys, comments, column alignment). That formatting cannot be
// derived from data, so these blobs are the one place the pipeline is
// canonical-not-byte-identical: extraction EVALUATES the literal (repo-owned
// content only), rendering re-serializes it in one deterministic style, and
// the migration verifier checks deep-equality of the parsed values.

/* --------------------------------------------------------- JS literal I/O */

export function evalObjectLiteral(src) {
  // Trusted input: our own repository's pages. Not used in any browser.
  return new Function(`"use strict"; return (${src});`)();
}

const QUOTE = (s) =>
  `'${String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")}'`;

export function serializeJs(value, indent = "") {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    // Primitive-only arrays (coordinates, date lists…) stay on one line.
    if (value.every((v) => v === null || typeof v !== "object"))
      return "[" + value.map((v) => serializeJs(v, indent)).join(", ") + "]";
    const inner = value.map((v) => indent + "  " + serializeJs(v, indent + "  "));
    return "[\n" + inner.join(",\n") + "\n" + indent + "]";
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => {
      const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : QUOTE(k);
      return `${key}: ${serializeJs(v, indent)}`;
    });
    return "{ " + entries.join(", ") + " }";
  }
  if (typeof value === "string") return QUOTE(value);
  return String(value); // number / boolean / null
}

// Top-level pretty form matching the live pages' base style; TRIP_MAP_DATA
// sits at base indent 2 ("  window.…"), TRIP_DATA at base indent 0.
function serializeTop(name, obj, base) {
  const inner = base + "  ";
  const lines = Object.entries(obj).map(([k, v]) => `${inner}${k}: ${serializeJs(v, inner)}`);
  return `\n${base}window.${name} = {\n${lines.join(",\n")}\n${base}};\n`;
}

function stripAssignment(region, name) {
  const m = region.match(new RegExp(`window\\.${name}\\s*=\\s*([\\s\\S]*?);\\s*$`));
  if (!m) throw new Error(`codec ${name}: assignment not found`);
  return m[1];
}

/* ------------------------------------------------------------- the codecs */

const I18N_COMMENT =
  "/* Page-local EN/AR translations. French stays in the DOM as the baseline.\n" +
  "   Keys map to data-i18n / data-i18n-html attributes + the hero *-key attrs. */\n";

export const codecs = {
  tripMapData: {
    render(data) {
      return serializeTop("TRIP_MAP_DATA", data.tripMap.data, "  ");
    },
    extract(region) {
      return { tripMap: { data: evalObjectLiteral(stripAssignment(region, "TRIP_MAP_DATA")) } };
    },
  },

  tripData: {
    render(data) {
      return serializeTop("TRIP_DATA", data.tripData, "");
    },
    extract(region) {
      return { tripData: evalObjectLiteral(stripAssignment(region, "TRIP_DATA")) };
    },
  },

  // window.AL_PAGE_I18N — the page-local EN/AR translation dictionary.
  pageI18n: {
    render(data) {
      const lines = Object.entries(data.i18n).map(([lang, dict]) => {
        const entries = Object.entries(dict).map(([k, v]) => `    ${k}: ${serializeJs(v, "    ")}`);
        return `  ${lang}: {\n${entries.join(",\n")}\n  }`;
      });
      return `\n${I18N_COMMENT}window.AL_PAGE_I18N = {\n${lines.join(",\n")}\n};\n`;
    },
    extract(region) {
      return { i18n: evalObjectLiteral(stripAssignment(region, "AL_PAGE_I18N")) };
    },
  },

  // FAQPage JSON-LD — mirrors the FAQ section as plain text. Stored verbatim
  // (the plain-text answers were hand-derived); build validation cross-checks
  // the questions against the FAQ section.
  faqJsonLd: {
    render(data) {
      const obj = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: data.seo.faqJsonLd.map((f) => ({
          "@type": "Question",
          name: f.name,
          acceptedAnswer: { "@type": "Answer", text: f.text },
        })),
      };
      return "\n" + JSON.stringify(obj, null, 2) + "\n";
    },
    extract(region) {
      const parsed = JSON.parse(region);
      return {
        seo: {
          faqJsonLd: parsed.mainEntity.map((q) => ({ name: q.name, text: q.acceptedAnswer.text })),
        },
      };
    },
  },
};
