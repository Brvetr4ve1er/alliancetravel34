// tools/blog.mjs
// Blog generator: data/blog/*.md → site/blog/<slug>/index.html + site/blog/index.html
// Zero dependencies. Called from tools/build.mjs.
//
// Frontmatter (data/blog/exemple-*.md is the reference):
//   title, description, date (YYYY-MM-DD), cover (optional, /assets/… path),
//   tags (optional [a, b]), draft (true → not published)
//
// Blog pages use ABSOLUTE asset paths (/assets/…) so one template serves both
// /blog/ (depth 1) and /blog/<slug>/ (depth 2).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { mdToHtml, parseFrontmatter, esc } from "./md.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function frDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// The real nav logo (inline SVG) comes straight from the shared nav template.
function navLogo() {
  const nav = readFileSync(join(ROOT, "tools", "templates", "sections", "nav.tpl"), "utf8");
  const m = nav.match(/<a href="\.\.\/index\.html" class="nav-logo"[\s\S]*?<\/a>/);
  if (!m) throw new Error("blog: nav logo not found in nav.tpl");
  return m[0].replace('href="../index.html"', 'href="/"');
}

function chrome(site) {
  const nav = `<nav class="site-nav">
  ${navLogo()}
  <ul class="nav-links">
    <li><a href="/">Accueil</a></li>
    <li><a href="/voyages/" data-i18n="nav.trips">Nos voyages</a></li>
    <li><a href="/rendez-vous-visa/" data-i18n="nav.visa_rdv">Visa</a></li>
    <li><a href="/blog/">Blog</a></li>
  </ul>
  <button class="theme-toggle" type="button" data-i18n-aria-label="nav.theme_label" data-i18n-title="nav.theme_label" aria-label="Changer de thème" title="Changer de thème">
    <svg class="theme-toggle__sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
    <svg class="theme-toggle__moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
  <a href="https://wa.me/${site.whatsapp}?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." class="nav-cta" target="_blank" rel="noopener" data-i18n-aria-label="nav.whatsapp_label">Réserver</a>
</nav>`;
  const footer = `<footer class="site-footer"><div class="container">
  <div class="footer-bottom" style="border-top:none; margin-top:0; padding-top:0">
    <p data-i18n="footer.copyright">© 2026 ${site.name} · Bordj Bou Arreridj</p>
    <p><a href="/">alliance-travel.dz</a> · <a href="https://wa.me/${site.whatsapp}" target="_blank" rel="noopener">WhatsApp ${site.phoneDisplay}</a></p>
  </div>
</div></footer>`;
  return { nav, footer };
}

function head(site, { title, description, path, ogImage, jsonLd }) {
  const url = `${site.baseUrl}${path}`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Sans:ital,opsz,wght@1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&display=swap" rel="stylesheet"/>
  <script>document.documentElement.classList.add("js");</script>
  <link rel="stylesheet" href="/assets/css/styles.css"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:site_name" content="${site.name}"/>
<meta property="og:locale" content="fr_FR"/>
<meta property="og:image" content="${site.baseUrl}${ogImage || "/assets/images/og/og-default.jpg"}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="canonical" href="${url}"/>
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon/favicon-16x16.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/favicon/apple-touch-icon.png"/>
<link rel="icon" type="image/x-icon" href="/assets/images/favicon/favicon.ico"/>
<link rel="manifest" href="/site.webmanifest"/>
</head>
<body data-page="blog">
<a href="#main" class="skip-link">Aller au contenu principal</a>
`;
}

const SCRIPTS = `<script src="/assets/js/i18n.js" defer></script>
  <script src="/assets/js/enhance.js" defer></script>
  </body>
</html>`;

export function renderPost(post, site) {
  const { nav, footer } = chrome(site);
  const path = `/blog/${post.slug}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: "fr",
    mainEntityOfPage: `${site.baseUrl}${path}`,
    author: { "@type": "Organization", name: site.name, url: `${site.baseUrl}/` },
    publisher: { "@type": "Organization", name: site.name },
    ...(post.cover ? { image: `${site.baseUrl}${post.cover}` } : {}),
  };
  const tags = (post.tags || []).map((t) => `<span class="amenity-pill">${esc(t)}</span>`).join("");
  return `${head(site, { title: `${post.title} — ${site.name}`, description: post.description, path, ogImage: post.cover, jsonLd })}${nav}

<main id="main">
<section class="section">
  <div class="container u-measure-md u-mx-auto">
    <div class="section-head">
      <p class="section-head__eyebrow">${esc(frDate(post.date))}${tags ? " · " : ""}${tags}</p>
      <h1 class="section-head__title">${esc(post.title)}</h1>
      <p class="section-head__sub">${esc(post.description)}</p>
    </div>
${post.cover ? `    <p><img src="${post.cover}" alt="${esc(post.coverAlt || post.title)}" class="u-radius-clip" style="width:100%; height:auto" loading="lazy"/></p>\n` : ""}    <article style="line-height:1.75">
${post.html}
    </article>
    <div class="u-divider" style="margin:var(--s8) 0"></div>
    <p><a href="/blog/" class="btn btn--ghost">← Tous les articles</a>
    <a href="https://wa.me/${site.whatsapp}?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." class="btn btn--primary" target="_blank" rel="noopener">Parler à un conseiller</a></p>
  </div>
</section>
</main>
${footer}

${SCRIPTS}`;
}

export function renderIndex(posts, site) {
  const { nav, footer } = chrome(site);
  const b = site.blog;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: b.title,
    description: b.description,
    url: `${site.baseUrl}/blog/`,
    inLanguage: "fr",
  };
  const cards = posts.map((p) => `      <a href="/blog/${p.slug}/" class="related-card reveal">
        <div class="related-card__art u-radius-clip">${p.cover
          ? `<img src="${p.cover}" alt="" loading="lazy" style="width:100%; height:100%; object-fit:cover"/>`
          : `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="u-size-full"><rect width="100" height="100" fill="var(--bg-card)"/><circle cx="70" cy="30" r="12" fill="var(--mint)" fill-opacity=".25"/><rect x="0" y="70" width="100" height="30" fill="var(--mint)" fill-opacity=".12"/></svg>`}
        </div>
        <div class="related-card__body">
          <span class="related-card__flag">${esc(frDate(p.date))}</span>
          <h3 class="related-card__title">${esc(p.title)}</h3>
          <p class="related-card__price">${esc(p.description)}</p>
          <span class="related-card__cta">
            <span>Lire l'article</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </a>`).join("\n");
  return `${head(site, { title: b.title, description: b.description, path: "/blog/", jsonLd })}${nav}

<main id="main">
<section class="section">
  <div class="container">
    <div class="section-head u-text-center u-measure-md u-mx-auto">
      <p class="section-head__eyebrow">${esc(b.heroEyebrow)}</p>
      <h1 class="section-head__title">${b.heroTitle}</h1>
      <p class="section-head__sub">${esc(b.heroSub)}</p>
    </div>
    <div class="related-grid">
${cards}
    </div>
  </div>
</section>
</main>
${footer}

${SCRIPTS}`;
}

// Read + validate all posts. Returns { posts, errors } — published, newest first.
export function loadPosts({ includeDrafts = false } = {}) {
  const dir = join(ROOT, "data", "blog");
  const errors = [];
  const posts = [];
  if (!existsSync(dir)) return { posts, errors };
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const rel = `data/blog/${f}`;
    const { meta, body } = parseFrontmatter(readFileSync(join(dir, f), "utf8"));
    const slug = basename(f, ".md");
    if (!/^[a-z0-9-]+$/.test(slug)) errors.push({ file: rel, msg: "nom de fichier: minuscules/chiffres/tirets uniquement" });
    if (!meta.title) errors.push({ file: rel, msg: "titre manquant (frontmatter `title:`)" });
    if (!meta.description) errors.push({ file: rel, msg: "description manquante" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date || "")) errors.push({ file: rel, msg: "date manquante ou invalide (format AAAA-MM-JJ)" });
    if (meta.cover && !meta.cover.startsWith("/assets/")) errors.push({ file: rel, msg: "cover: chemin absolu /assets/… requis" });
    if (meta.cover && !existsSync(join(ROOT, "site", meta.cover.slice(1))))
      errors.push({ file: rel, msg: `cover introuvable: ${meta.cover}` });
    if (meta.draft === true && !includeDrafts) continue;
    posts.push({ ...meta, slug, html: mdToHtml(body.trim()) });
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { posts, errors };
}
