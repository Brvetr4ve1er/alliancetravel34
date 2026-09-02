import { test } from "node:test";
import assert from "node:assert/strict";
import { renderBlogBlock, injectBlogBlock } from "./sitemap-blog.mjs";

const BASE = "https://alliancetravel.app";
const wrap = (inner) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n  <url><loc>${BASE}/</loc></url>\n${inner}</urlset>\n`;

test("renderBlogBlock lists the index plus one URL per post, newest lastmod first", () => {
  const block = renderBlogBlock(
    [{ slug: "b", date: "2026-08-01" }, { slug: "a", date: "2026-07-01" }],
    BASE
  );
  assert.match(block, /^<!-- AT:blog START -->\n/);
  assert.match(block, /<!-- AT:blog END -->$/);
  assert.equal(block.split("\n").length, 5); // start + index + 2 posts + end
  assert.ok(block.includes(`<loc>${BASE}/blog/</loc><lastmod>2026-08-01</lastmod>`));
  assert.ok(block.includes(`<loc>${BASE}/blog/b/</loc><lastmod>2026-08-01</lastmod>`));
  assert.ok(block.includes(`<loc>${BASE}/blog/a/</loc><lastmod>2026-07-01</lastmod>`));
});

test("renderBlogBlock with zero published posts emits the markers and no /blog/ URL", () => {
  const block = renderBlogBlock([], BASE);
  assert.equal(block, "<!-- AT:blog START -->\n<!-- AT:blog END -->");
  assert.ok(!block.includes("/blog/"));
});

test("injectBlogBlock replaces the existing block between the markers", () => {
  const xml = wrap("<!-- AT:blog START -->\n  <url><loc>old</loc></url>\n<!-- AT:blog END -->\n");
  const r = injectBlogBlock(xml, renderBlogBlock([{ slug: "a", date: "2026-07-01" }], BASE));
  assert.equal(r.mode, "replaced");
  assert.ok(!r.xml.includes("old"));
  assert.ok(r.xml.includes(`${BASE}/blog/a/`));
  assert.equal(r.xml.match(/AT:blog START/g).length, 1);
});

test("injectBlogBlock inserts the block before </urlset> when the markers are absent", () => {
  // This is the live sitemap's shape: it has never carried AT:blog markers, so
  // the marker-only replace silently dropped every blog URL.
  const xml = wrap("");
  const r = injectBlogBlock(xml, renderBlogBlock([{ slug: "a", date: "2026-07-01" }], BASE));
  assert.equal(r.mode, "inserted");
  assert.ok(r.xml.includes(`<loc>${BASE}/blog/a/</loc>`));
  assert.ok(r.xml.indexOf("AT:blog END") < r.xml.indexOf("</urlset>"));
  assert.ok(r.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
});

test("a second pass over an inserted block replaces it instead of stacking a new one", () => {
  const first = injectBlogBlock(wrap(""), renderBlogBlock([{ slug: "a", date: "2026-07-01" }], BASE));
  const second = injectBlogBlock(first.xml, renderBlogBlock([{ slug: "b", date: "2026-08-02" }], BASE));
  assert.equal(second.mode, "replaced");
  assert.equal(second.xml.match(/AT:blog START/g).length, 1);
  assert.ok(!second.xml.includes("/blog/a/"));
  assert.ok(second.xml.includes("/blog/b/"));
});

test("zero posts still installs the markers, so a later post can enter the sitemap", () => {
  const first = injectBlogBlock(wrap(""), renderBlogBlock([], BASE));
  assert.equal(first.mode, "inserted");
  const second = injectBlogBlock(first.xml, renderBlogBlock([{ slug: "a", date: "2026-07-01" }], BASE));
  assert.equal(second.mode, "replaced");
  assert.ok(second.xml.includes("/blog/a/"));
});

test("a sitemap with neither markers nor </urlset> is reported, never silently skipped", () => {
  const r = injectBlogBlock("<nope/>", renderBlogBlock([], BASE));
  assert.equal(r.mode, "error");
  assert.equal(r.xml, "<nope/>"); // unchanged
  assert.match(r.error, /urlset/);
});
