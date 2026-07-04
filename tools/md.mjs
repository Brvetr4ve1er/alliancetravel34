// tools/md.mjs
// Minimal zero-dependency Markdown → HTML for blog articles.
// Supported: #/##/### headings, paragraphs, **bold**, *italic*, `code`,
// [links](url), ![images](src), - / 1. lists, > blockquotes, --- rules.
// Anything fancier should just be written as inline HTML in the article.

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy"/>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let list = null; // "ul" | "ol" | null
  let para = [];

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3}) +(.*)$/);
    const li = line.match(/^(?:[-*]|(\d+)\.) +(.*)$/);
    if (line.trim() === "") { flushPara(); closeList(); continue; }
    if (h) {
      flushPara(); closeList();
      const level = h[1].length + 1; // # → h2 (h1 is the article title)
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    } else if (/^(---|\*\*\*)$/.test(line.trim())) {
      flushPara(); closeList();
      out.push("<hr/>");
    } else if (line.startsWith("> ")) {
      flushPara(); closeList();
      out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
    } else if (li) {
      flushPara();
      const kind = li[1] ? "ol" : "ul";
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(li[2])}</li>`);
    } else if (/^</.test(line.trim())) {
      // raw HTML line passes through
      flushPara(); closeList();
      out.push(line);
    } else {
      para.push(line.trim());
    }
  }
  flushPara(); closeList();
  return out.join("\n");
}

// Parse a markdown file with `---` frontmatter into { meta, body }.
export function parseFrontmatter(src) {
  const m = src.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v === "true") v = true;
    else if (v === "false") v = false;
    else if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, "");
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

export { esc };
