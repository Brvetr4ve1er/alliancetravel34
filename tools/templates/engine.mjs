// tools/templates/engine.mjs
// Micro template engine powering BOTH directions of the trip pipeline:
//   render(tpl, data)  — fill slots  → exact page bytes
//   extract(tpl, html) — parse bytes → data (inverse of render)
// One .tpl file per page section (tools/templates/sections/*.tpl) is the single
// source of truth, so the generator and the extractor can never drift apart.
//
// Syntax:
//   {{path.to.field}}        string slot (verbatim bytes)
//   {{path:int}}             integer slot (digits only)
//   {{#path}} … {{/path}}    loop over array field; inside, paths are relative
//                            to the item; `.` prefix reads the item itself
//                            ({{.name}}), `..foo` reads parent scope
//   {{?path}} A {{:}} B {{/?}}   conditional on truthy field (else optional)
//   {{path:uri}}             WhatsApp-style URI slot: rendered with the site's
//                            partial percent-encoding (spaces/commas/… encoded,
//                            accented letters left raw), decoded on extraction
//   {{=expr}}                computed slot (render only; extraction validates
//                            position but discards value). expr is JS over
//                            (d=root data, item, i=loop index, H=helpers),
//                            e.g. {{=i*50}} or {{=H.plain(item.answerHtml)}}
//   {{&name}}                custom codec slot — registered via codecs param
//
// Extraction builds an anchored regex from the literal bytes between slots.
// Loops are extracted by matching the item pattern repeatedly and REQUIRING
// full coverage of the loop region — any unexplained bytes throw, so a page
// that drifted from the template fails loudly instead of losing content.

/* ----------------------------------------------------------------- parsing */

const TOKEN = /\{\{([#/?:&=]?)([^}]*)\}\}/g;

export function parse(tpl) {
  const root = { type: "seq", children: [] };
  const stack = [root];
  let last = 0;
  for (const m of tpl.matchAll(TOKEN)) {
    const lit = tpl.slice(last, m.index);
    if (lit) top().children.push({ type: "lit", text: lit });
    last = m.index + m[0].length;
    const [, sigil, body] = m;
    if (sigil === "#") {
      const node = { type: "loop", path: body.trim(), children: [] };
      top().children.push(node);
      stack.push(node);
    } else if (sigil === "?") {
      const node = { type: "cond", path: body.trim(), children: [], elseChildren: null };
      top().children.push(node);
      stack.push(node);
    } else if (sigil === ":") {
      const node = top();
      if (node.type !== "cond" || node.elseChildren) throw new Error("stray {{:}}");
      node.elseChildren = [];
    } else if (sigil === "/") {
      const closed = stack.pop();
      const want = body.trim();
      if (want === "?" ? closed.type !== "cond" : closed.path !== want)
        throw new Error(`mismatched {{/${want}}} closing ${closed.type} ${closed.path ?? ""}`);
    } else if (sigil === "&") {
      top().children.push({ type: "codec", name: body.trim() });
    } else if (sigil === "=") {
      top().children.push({ type: "expr", src: body });
    } else {
      const [path, kind] = body.split(":");
      top().children.push({ type: "slot", path: path.trim(), kind: (kind || "str").trim() });
    }
  }
  const tail = tpl.slice(last);
  if (tail) top().children.push({ type: "lit", text: tail });
  if (stack.length !== 1) throw new Error("unclosed block in template");
  return root;

  function top() {
    const node = stack[stack.length - 1];
    return node.type === "cond" && node.elseChildren ? { children: node.elseChildren } : node;
  }
}

/* ------------------------------------------------------------ path helpers */

function get(scopes, path) {
  if (path.startsWith("..")) return get(scopes.slice(0, -1), path.slice(2));
  if (path === ".") return scopes[scopes.length - 1];
  const from = path.startsWith(".") ? [scopes[scopes.length - 1]] : [scopes[0]];
  return path.replace(/^\./, "").split(".").reduce((o, k) => (o == null ? o : o[k]), from[0]);
}

function set(target, path, value) {
  const keys = path.replace(/^\./, "").split(".");
  let o = target;
  for (const k of keys.slice(0, -1)) o = o[k] ?? (o[k] = {});
  o[keys[keys.length - 1]] = value;
}

function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k]))
      deepMerge(target[k], v);
    else target[k] = v;
  }
  return target;
}

/* -------------------------------------------------- uri (WhatsApp) coding */
// The site's wa.me links percent-encode ASCII punctuation but leave accented
// letters raw (hand-encoded style, NOT encodeURIComponent). Keep the exact
// same alphabet so round-trips are byte-stable.
const URI_MAP = [["%", "%25"], [" ", "%20"], [",", "%2C"], ["'", "%27"], ['"', "%22"], ["&", "%26"], ["+", "%2B"], ["?", "%3F"], ["#", "%23"], ["=", "%3D"]];
export function uriEncode(s) {
  let out = String(s);
  for (const [ch, code] of URI_MAP) out = out.split(ch).join(code);
  return out;
}
export function uriDecode(s) {
  let out = String(s);
  for (const [ch, code] of [...URI_MAP].reverse()) out = out.split(code).join(ch);
  return out;
}

/* ------------------------------------------------------------------ render */

export function render(ast, data, codecs = {}, helpers = {}) {
  const out = [];
  walk(ast.children, [data], 0);
  return out.join("");

  function walk(children, scopes, idx) {
    for (const node of children) {
      if (node.type === "lit") out.push(node.text);
      else if (node.type === "slot") {
        const v = get(scopes, node.path);
        if (v == null) throw new Error(`render: "${node.path}" is missing`);
        out.push(node.kind === "uri" ? uriEncode(v) : String(v));
      } else if (node.type === "expr") {
        const fn = new Function("d", "item", "i", "H", `return (${node.src});`);
        out.push(String(fn(scopes[0], scopes[scopes.length - 1], idx, helpers)));
      } else if (node.type === "codec") {
        const c = codecs[node.name];
        if (!c) throw new Error(`render: no codec "${node.name}"`);
        out.push(c.render(scopes[0]));
      } else if (node.type === "cond") {
        const v = get(scopes, node.path);
        walk(v ? node.children : (node.elseChildren ?? []), scopes, idx);
      } else if (node.type === "loop") {
        const arr = get(scopes, node.path);
        if (!Array.isArray(arr)) throw new Error(`render: "${node.path}" is not an array`);
        arr.forEach((item, i) => walk(node.children, [...scopes, item], i));
      }
    }
  }
}

/* ----------------------------------------------------------------- extract */

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build a regex source for a node list. Slots/loops/codecs become capture
// groups; `groups` records how to interpret each capture.
function pattern(children, groups, codecs) {
  let src = "";
  for (const node of children) {
    if (node.type === "lit") src += reEsc(node.text);
    else if (node.type === "slot") {
      groups.push({ node });
      src += node.kind === "int" ? "(\\d+)" : "([\\s\\S]*?)";
    } else if (node.type === "expr") {
      groups.push({ node });
      src += "([\\s\\S]*?)"; // matched but value discarded
    } else if (node.type === "codec") {
      groups.push({ node });
      src += "([\\s\\S]*?)";
    } else if (node.type === "cond") {
      const a = [], b = [];
      const aSrc = pattern(node.children, a, codecs);
      const bSrc = pattern(node.elseChildren ?? [], b, codecs);
      // Capture-group order mirrors the groups list: then-wrapper, then-inners,
      // else-wrapper, else-inners. The wrapper being non-undefined tells us
      // which branch matched.
      src += `(?:(${aSrc})|(${bSrc}))`;
      groups.push({ node, kind: "cond-marker" });
      groups.push(...a.map(g => ({ ...g, branch: "then", of: node })));
      groups.push({ node, kind: "cond-else-marker" });
      groups.push(...b.map(g => ({ ...g, branch: "else", of: node })));
    } else if (node.type === "loop") {
      // Only reached by diagnose() — the extractor handles loops itself.
      groups.push({ node, kind: "loop-region" });
      src += "([\\s\\S]*?)";
    }
  }
  return src;
}

// A cond whose branches contain loops cannot live inside a single run regex.
function hasLoop(node) {
  const kids = [...(node.children ?? []), ...(node.elseChildren ?? [])];
  return kids.some((k) => k.type === "loop" || (k.type === "cond" && hasLoop(k)));
}

// Pinpoint where a template stops matching: grow the child-prefix until the
// unanchored regex fails, then show the live bytes at the last good offset.
function diagnose(children, text, codecs) {
  let lastEnd = 0;
  for (let k = 1; k <= children.length; k++) {
    const groups = [];
    const src = pattern(children.slice(0, k), groups, codecs);
    const m = new RegExp("^" + src).exec(text);
    if (!m) {
      const node = children[k - 1];
      let what = node.type === "lit"
        ? `literal ${JSON.stringify(node.text.slice(0, 90))}`
        : `${node.type} ${node.path ?? node.name ?? node.src ?? ""}`;
      if (node.type === "lit") {
        // Pinpoint the exact offset where the literal stops matching.
        let o = 0;
        while (o < node.text.length && node.text[o] === text[lastEnd + o]) o++;
        what += `; matches ${o} chars, then template has ${JSON.stringify(node.text.slice(o, o + 80))} vs live ${JSON.stringify(text.slice(lastEnd + o, lastEnd + o + 80))}`;
      }
      return (
        `extract: template diverges at child ${k - 1} (${what});` +
        ` live bytes at last match point: ${JSON.stringify(text.slice(lastEnd, lastEnd + 120))}`
      );
    }
    lastEnd = m[0].length;
  }
  return "extract: template did not match (prefixes all match — likely end-anchor/backtracking issue)";
}

// Sequential cursor matcher. Regexes are only used for "runs" — stretches of
// lit/slot/expr/codec/simple-cond nodes between control nodes — anchored at
// the cursor with the sticky flag. Loops and loop-bearing conds are walked
// recursively with exact positions, so an ambiguous lazy capture can never
// cut an item in half and there is no catastrophic backtracking.
export function extract(ast, html, codecs = {}) {
  const data = {};
  const end = matchNodes(ast.children, html, 0, data);
  if (end !== html.length)
    throw new Error(`extract: trailing bytes not covered by template: ${JSON.stringify(html.slice(end, end + 160))}`);
  return data;

  function fail(pos, msg) {
    throw Object.assign(new Error(msg), { matchPos: pos });
  }

  function matchNodes(children, text, pos, target) {
    let run = [];
    const flush = () => {
      if (run.length) { pos = matchRun(run, text, pos, target); run = []; }
    };
    for (const node of children) {
      if (node.type === "loop") {
        flush();
        pos = matchLoop(node, text, pos, target);
      } else if (node.type === "cond" && hasLoop(node)) {
        flush();
        pos = matchCond(node, text, pos, target);
      } else {
        run.push(node);
      }
    }
    flush();
    return pos;
  }

  function matchRun(run, text, pos, target) {
    const groups = [];
    const src = pattern(run, groups, codecs);
    const re = new RegExp(src, "y");
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) fail(pos, diagnose(run, text.slice(pos), codecs));
    assignGroups(groups, m, target);
    return pos + m[0].length;
  }

  function matchLoop(node, text, pos, target) {
    const items = [];
    for (;;) {
      const item = {};
      let next;
      try {
        next = matchNodes(node.children, text, pos, item);
      } catch (e) {
        if (e.matchPos === pos) break; // no progress → clean end of the list
        throw new Error(`extract: loop "${node.path}" item ${items.length} — ${e.message}`);
      }
      if (next === pos) break; // zero-length item safety
      // A lone {{.}} slot means the items are scalars, not objects.
      const keys = Object.keys(item);
      items.push(keys.length === 1 && keys[0] === "" ? item[""] : item);
      pos = next;
    }
    set(target, node.path, items);
    return pos;
  }

  function matchCond(node, text, pos, target) {
    try {
      const trial = {};
      const next = matchNodes(node.children, text, pos, trial);
      set(target, node.path, true);
      deepMerge(target, trial);
      return next;
    } catch {
      set(target, node.path, false);
      if (node.elseChildren?.length) return matchNodes(node.elseChildren, text, pos, target);
      return pos;
    }
  }

  // Group→data assignment for a matched run. Conditionals: the marker sets
  // the tested path to a boolean; if the taken branch contains a slot for
  // that same path, it overwrites the boolean with the real value.
  function assignGroups(groups, m, target) {
    let gi = 1;
    let thenMatched = false;
    for (const g of groups) {
      const val = m[gi];
      if (g.kind === "cond-marker") {
        thenMatched = val !== undefined;
        set(target, g.node.path, thenMatched);
        gi++; continue;
      }
      if (g.kind === "cond-else-marker") { gi++; continue; }
      if (g.branch && (g.branch === "then") !== thenMatched) { gi++; continue; }
      const node = g.node;
      if (node.type === "slot") {
        if (val !== undefined) set(target, node.path, node.kind === "int" ? parseInt(val, 10) : node.kind === "uri" ? uriDecode(val) : val);
      } else if (node.type === "codec") {
        if (val !== undefined) deepMerge(target, codecs[node.name].extract(val));
      }
      gi++;
    }
  }
}

/* ------------------------------------------------- convenience: full cycle */

export function compile(tpl, codecs = {}, helpers = {}) {
  const ast = parse(tpl);
  return {
    render: (data) => render(ast, data, codecs, helpers),
    extract: (html) => extract(ast, html, codecs),
  };
}
