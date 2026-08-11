// tools/sitemap-blog.mjs
// The blog's slice of site/sitemap.xml, and how it gets in there.
//
// It used to get in there with one line in tools/build.mjs:
//
//   sm.replace(/<!-- AT:blog START -->[\s\S]*?<!-- AT:blog END -->/, block)
//
// against a sitemap that has never contained those markers. The regex did not
// match, `next === sm`, nothing was written, and the build said nothing — a
// permanent, silent no-op. Publish a post and it would simply never reach the
// sitemap, with no error to trace it back to.
//
// So the injection now has three outcomes and the caller reports each one:
//   • "replaced" — the markers are there; the block between them is rewritten.
//   • "inserted" — no markers; the block goes in before </urlset>, which also
//     installs the markers so every later build takes the "replaced" path.
//   • "error"    — neither markers nor a closing </urlset>: the file is not a
//     sitemap we can safely edit. Returned, never swallowed.
//
// Correct at zero posts too: the block is then just the two markers, so the
// mechanism is live and the first published post lands in the sitemap.

// Deliberately does not match leading indentation: replacing keeps whatever
// whitespace already precedes the START marker.
const BLOG_BLOCK_RE = /<!-- AT:blog START -->[\s\S]*?<!-- AT:blog END -->/;

/**
 * renderBlogBlock(posts, baseUrl) -> string
 * The marker-delimited block: the /blog/ index (lastmod = newest post) followed
 * by one <url> per published post. `posts` is expected newest-first, as
 * tools/blog.mjs returns it. Zero posts → markers only, and no /blog/ entry:
 * an index with nothing on it is not worth a crawl.
 */
export function renderBlogBlock(posts, baseUrl) {
  const urls = posts.length
    ? [`  <url><loc>${baseUrl}/blog/</loc><lastmod>${posts[0].date}</lastmod></url>`,
       ...posts.map((p) => `  <url><loc>${baseUrl}/blog/${p.slug}/</loc><lastmod>${p.date}</lastmod></url>`)]
    : [];
  return `<!-- AT:blog START -->\n${urls.length ? urls.join("\n") + "\n" : ""}<!-- AT:blog END -->`;
}

/**
 * injectBlogBlock(xml, block) -> { xml, mode, error? }
 * mode: "replaced" | "inserted" | "error". On "error" the input is returned
 * unchanged so the caller can fail loudly without having half-written a file.
 */
export function injectBlogBlock(xml, block) {
  if (BLOG_BLOCK_RE.test(xml)) {
    return { xml: xml.replace(BLOG_BLOCK_RE, block), mode: "replaced" };
  }
  const close = xml.lastIndexOf("</urlset>");
  if (close === -1) {
    return {
      xml,
      mode: "error",
      error: "ni marqueurs <!-- AT:blog … --> ni </urlset> — impossible d'y insérer le bloc blog",
    };
  }
  return { xml: xml.slice(0, close) + block + "\n" + xml.slice(close), mode: "inserted" };
}
