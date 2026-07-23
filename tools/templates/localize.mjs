// tools/templates/localize.mjs
//
// Server-side i18n text substitution on generated HTML. Replicates exactly what
// the browser's site/assets/js/i18n.js `translate(lang)` does to the live DOM,
// but as a pure string transform so pages can be pre-localized at build time.
//
// Client semantics being mirrored (i18n.js ~lines 1150-1215):
//   [data-i18n]           -> el.textContent = resolve(key)      (text-escaped)
//   [data-i18n-html]      -> el.innerHTML   = resolve(key)      (raw)
//   [data-i18n-aria-label]-> el.setAttribute('aria-label', …)   (attr-escaped)
//   [data-i18n-title]     -> el.setAttribute('title', …)
//   [data-i18n-placeholder]-> el.setAttribute('placeholder', …)
//   [data-i18n-alt]       -> el.setAttribute('alt', …)
//
// The client applies text (data-i18n) in one pass, then html (data-i18n-html)
// in a later pass, then attributes last. Because innerHTML/textContent replace
// all descendants, an ancestor directive that actually fires wipes any nested
// directive; html wins over text on the same element (its pass runs later). A
// directive whose resolve returns a non-string is a no-op (French stays). This
// module reproduces all of that.
//
//   resolve: (key) => string | null | undefined
//     string       -> use as translation
//     null/undefined -> "no translation", leave existing French untouched
//
// The transform is a strict no-op on any HTML containing no data-i18n* attrs,
// and only ever rewrites the exact inner-content spans / attribute values it
// targets. It never strips the data-i18n* attributes themselves, and never
// reformats surrounding bytes.

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Elements whose content is raw/escapable text (never child elements). We skip
// their content while tokenizing so a `<` inside a <script> string is not
// mistaken for a tag, and so depth-counting for enclosing elements stays honest.
const RAWTEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

// [directive attribute, target attribute] — mirrors the client's ATTRS array.
const ATTR_DIRECTIVES = [
  ['data-i18n-aria-label', 'aria-label'],
  ['data-i18n-title', 'title'],
  ['data-i18n-placeholder', 'placeholder'],
  ['data-i18n-alt', 'alt']
];

// Minimal HTML text-node escape (matches how a browser serializes textContent).
function escapeText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Minimal double-quoted attribute-value escape.
function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

// Decode the handful of entities a directive key could theoretically carry, so
// the key handed to resolve() matches el.dataset.* (which is already decoded).
// Keys in practice are bare identifiers, so this is belt-and-suspenders.
function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const NAME_CHAR = /[a-zA-Z0-9:_-]/;
const WS = /\s/;
const ATTR_NAME_STOP = /[\s=/>]/;

// Parse a start tag beginning at index `lt` (the '<'). Returns null if it does
// not close (malformed / truncated). Attribute values are assumed quoted by the
// generator, but unquoted and boolean attributes are tolerated.
function parseStartTag(html, lt) {
  const n = html.length;
  let p = lt + 1;
  const nameStart = p;
  while (p < n && NAME_CHAR.test(html[p])) p++;
  if (p === nameStart) return null;
  const name = html.slice(nameStart, p).toLowerCase();
  const attrs = new Map();

  while (p < n) {
    while (p < n && WS.test(html[p])) p++;
    if (p >= n) return null;
    const c = html[p];
    if (c === '>') {
      return { name, attrs, selfClosing: false, tagEnd: p + 1, insertPos: p };
    }
    if (c === '/') {
      if (html[p + 1] === '>') {
        return { name, attrs, selfClosing: true, tagEnd: p + 2, insertPos: p };
      }
      p++; // stray slash
      continue;
    }
    // attribute name
    const anStart = p;
    while (p < n && !ATTR_NAME_STOP.test(html[p])) p++;
    if (p === anStart) { p++; continue; } // defensive: never spin
    const attrName = html.slice(anStart, p).toLowerCase();

    let q = p;
    while (q < n && WS.test(html[q])) q++;
    if (html[q] === '=') {
      q++;
      while (q < n && WS.test(html[q])) q++;
      const quote = html[q];
      if (quote === '"' || quote === "'") {
        const valStart = q + 1;
        let valEnd = html.indexOf(quote, valStart);
        if (valEnd === -1) valEnd = n;
        if (!attrs.has(attrName)) {
          attrs.set(attrName, { valStart, valEnd, boolean: false });
        }
        p = valEnd + 1;
      } else {
        // unquoted value
        const valStart = q;
        let valEnd = q;
        while (valEnd < n && !/[\s>]/.test(html[valEnd])) valEnd++;
        if (!attrs.has(attrName)) {
          attrs.set(attrName, { valStart, valEnd, boolean: false });
        }
        p = valEnd;
      }
    } else {
      // boolean attribute (no value)
      if (!attrs.has(attrName)) {
        attrs.set(attrName, { valStart: -1, valEnd: -1, boolean: true });
      }
      p = q > p ? p : p; // leave p at end of name; loop re-skips whitespace
    }
  }
  return null;
}

// Tokenize into an ordered list of start/end tokens, skipping comments,
// declarations, PIs, and rawtext element contents.
function tokenize(html) {
  const tokens = [];
  const n = html.length;
  let i = 0;

  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html.startsWith('<![CDATA[', lt)) {
      const end = html.indexOf(']]>', lt + 9);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const gt = html.indexOf('>', lt + 2);
      i = gt === -1 ? n : gt + 1;
      continue;
    }
    if (html[lt + 1] === '/') {
      let p = lt + 2;
      const ns = p;
      while (p < n && NAME_CHAR.test(html[p])) p++;
      const name = html.slice(ns, p).toLowerCase();
      const gt = html.indexOf('>', p);
      const tagEnd = gt === -1 ? n : gt + 1;
      tokens.push({ type: 'end', name, tagStart: lt, tagEnd });
      i = tagEnd;
      continue;
    }
    if (/[a-zA-Z]/.test(html[lt + 1] || '')) {
      const parsed = parseStartTag(html, lt);
      if (!parsed) { i = lt + 1; continue; }
      const isVoid = VOID_ELEMENTS.has(parsed.name);
      const hasEnd = !isVoid && !parsed.selfClosing;
      tokens.push({
        type: 'start',
        name: parsed.name,
        tagStart: lt,
        tagEnd: parsed.tagEnd,
        attrs: parsed.attrs,
        selfClosing: parsed.selfClosing,
        insertPos: parsed.insertPos,
        hasEnd
      });

      if (hasEnd && RAWTEXT_ELEMENTS.has(parsed.name)) {
        // Jump straight to the matching close tag; content is opaque.
        const closeRe = new RegExp('</' + parsed.name + '(?=[\\s/>])', 'i');
        const m = closeRe.exec(html.slice(parsed.tagEnd));
        if (m) {
          const closeLt = parsed.tagEnd + m.index;
          const gt = html.indexOf('>', closeLt);
          const tagEnd = gt === -1 ? n : gt + 1;
          tokens.push({ type: 'end', name: parsed.name, tagStart: closeLt, tagEnd });
          i = tagEnd;
        } else {
          i = parsed.tagEnd;
        }
      } else {
        i = parsed.tagEnd;
      }
      continue;
    }
    i = lt + 1; // stray '<'
  }
  return tokens;
}

// Nesting-aware search for the end tag matching the start token at index `s`.
// Only container-capable start tokens (not void, not self-closing) of the same
// name increase depth. Returns the index of the '<' of the matching end tag, or
// null if unbalanced (defensive — generated HTML is well-formed).
function findMatchingEnd(tokens, s, name) {
  let depth = 1;
  for (let j = s + 1; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.type === 'start' && t.name === name && t.hasEnd) {
      depth++;
    } else if (t.type === 'end' && t.name === name) {
      depth--;
      if (depth === 0) return t.tagStart;
    }
  }
  return null;
}

function readAttrValue(html, info) {
  if (!info || info.boolean || info.valStart < 0) return null;
  return decodeEntities(html.slice(info.valStart, info.valEnd));
}

export function localizeHtml(html, resolve) {
  if (typeof html !== 'string' || html.indexOf('data-i18n') === -1) return html;
  if (typeof resolve !== 'function') return html;

  const tokens = tokenize(html);
  const edits = [];        // { start, end, text }
  const containers = [];   // inner spans that were actually replaced

  for (let s = 0; s < tokens.length; s++) {
    const tok = tokens[s];
    if (tok.type !== 'start') continue;
    const attrs = tok.attrs;

    // ── attribute directives (may be several on one element) ──
    for (const [directive, target] of ATTR_DIRECTIVES) {
      if (!attrs.has(directive)) continue;
      const key = readAttrValue(html, attrs.get(directive));
      if (key == null) continue;
      const val = resolve(key);
      if (typeof val !== 'string') continue;
      const escaped = escapeAttr(val);
      const existing = attrs.get(target);
      if (existing && !existing.boolean && existing.valStart >= 0) {
        // overwrite the current (French) value in place
        edits.push({ start: existing.valStart, end: existing.valEnd, text: escaped });
      } else {
        // attribute absent — insert it, like el.setAttribute would
        edits.push({ start: tok.insertPos, end: tok.insertPos, text: ` ${target}="${escaped}"` });
      }
    }

    // ── inner-content directives (html takes precedence over text) ──
    if (!tok.hasEnd) continue; // void / self-closing: no inner content

    let replacement = null;
    if (attrs.has('data-i18n-html')) {
      const key = readAttrValue(html, attrs.get('data-i18n-html'));
      if (key != null) {
        const val = resolve(key);
        if (typeof val === 'string') replacement = val; // raw
      }
    }
    if (replacement === null && attrs.has('data-i18n')) {
      const key = readAttrValue(html, attrs.get('data-i18n'));
      if (key != null) {
        const val = resolve(key);
        if (typeof val === 'string') replacement = escapeText(val);
      }
    }
    if (replacement === null) continue;

    const innerEnd = findMatchingEnd(tokens, s, tok.name);
    if (innerEnd == null) continue; // unbalanced — leave untouched
    edits.push({ start: tok.tagEnd, end: innerEnd, text: replacement });
    containers.push({ start: tok.tagEnd, end: innerEnd });
  }

  // Drop any edit that lands inside an inner span we actually replaced — the
  // ancestor's textContent/innerHTML assignment already wiped those descendants.
  const kept = edits.filter((e) => {
    for (const c of containers) {
      if (c.start === e.start && c.end === e.end) continue; // the container edit itself
      if (c.start <= e.start && e.end <= c.end) return false;
    }
    return true;
  });

  kept.sort((a, b) => a.start - b.start || a.end - b.end);

  let out = '';
  let prev = 0;
  for (const e of kept) {
    if (e.start < prev) continue; // defensive against overlap
    out += html.slice(prev, e.start) + e.text;
    prev = e.end;
  }
  out += html.slice(prev);
  return out;
}
