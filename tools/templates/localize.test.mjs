// tools/templates/localize.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { localizeHtml } from './localize.mjs';

// Repo root, resolved from this file's location so the suite is cwd-independent.
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// A resolve() built from a plain flat dictionary; misses return null.
const dictResolve = (dict) => (key) =>
  Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : null;

test('data-i18n leaf: replaced and text-escaped (& < >)', () => {
  const html = '<p data-i18n="k">Bonjour</p>';
  const out = localizeHtml(html, dictResolve({ k: 'A & B < C > D' }));
  assert.equal(out, '<p data-i18n="k">A &amp; B &lt; C &gt; D</p>');
  // raw ampersand / angle brackets must not survive unescaped
  assert.ok(!/A & B/.test(out));
});

test('data-i18n with resolve -> null leaves French untouched', () => {
  const html = '<p data-i18n="missing">Bonjour le monde</p>';
  const out = localizeHtml(html, dictResolve({}));
  assert.equal(out, html);
});

test('data-i18n with resolve -> undefined leaves French untouched', () => {
  const html = '<p data-i18n="x">Salut</p>';
  const out = localizeHtml(html, () => undefined);
  assert.equal(out, html);
});

test('data-i18n-html: replaced RAW, embedded markup preserved (not escaped)', () => {
  const html = '<h1 data-i18n-html="title">Azerbaïdjan <em>Bakou</em></h1>';
  const out = localizeHtml(html, dictResolve({ title: 'Azerbaijan <em>Baku &amp; Gabala</em>' }));
  assert.equal(out, '<h1 data-i18n-html="title">Azerbaijan <em>Baku &amp; Gabala</em></h1>');
  // the <em> is real markup, not text-escaped into &lt;em&gt;
  assert.ok(out.includes('<em>Baku'));
  assert.ok(!out.includes('&lt;em&gt;'));
});

test('data-i18n on element with NESTED children: entire inner replaced', () => {
  const html = '<button class="faq" data-i18n="q">Question ?<svg viewBox="0 0 24 24"><path d="M1 2"></path></svg></button>';
  const out = localizeHtml(html, dictResolve({ q: 'How does it work?' }));
  // the nested <svg>…</svg> is destroyed, exactly as button.textContent = … would do
  assert.equal(out, '<button class="faq" data-i18n="q">How does it work?</button>');
  assert.ok(!out.includes('<svg'));
  assert.ok(!out.includes('</path>'));
});

test('nesting-aware: same-tag descendants do not stop the scan early', () => {
  const html = '<div data-i18n-html="k"><div>x</div></div>';
  const out = localizeHtml(html, dictResolve({ k: 'NEW' }));
  // must replace the WHOLE inner <div>x</div>, not stop at the first </div>
  assert.equal(out, '<div data-i18n-html="k">NEW</div>');
});

test('data-i18n-aria-label and data-i18n-title on one element: both updated, other attrs preserved', () => {
  const html =
    '<button class="theme-toggle" type="button" data-i18n-aria-label="a" data-i18n-title="b" aria-label="Changer de thème" title="Changer de thème">x</button>';
  const out = localizeHtml(html, dictResolve({ a: 'Toggle "theme" & mode', b: 'Toggle theme' }));
  // both attribute values overwritten, attribute-escaped (& and ")
  assert.ok(out.includes('aria-label="Toggle &quot;theme&quot; &amp; mode"'));
  assert.ok(out.includes('title="Toggle theme"'));
  // French values gone
  assert.ok(!out.includes('Changer de thème'));
  // untouched attrs and inner text preserved
  assert.ok(out.includes('class="theme-toggle"'));
  assert.ok(out.includes('type="button"'));
  assert.ok(out.endsWith('>x</button>'));
  // directive attributes are NOT stripped (client still needs them to switch back)
  assert.ok(out.includes('data-i18n-aria-label="a"'));
  assert.ok(out.includes('data-i18n-title="b"'));
});

test('text directive AND attr directive on the same element: both applied', () => {
  const html = '<button data-i18n="t" data-i18n-aria-label="a" aria-label="FR aria">FR text</button>';
  const out = localizeHtml(html, dictResolve({ t: 'EN text', a: 'EN aria' }));
  assert.equal(
    out,
    '<button data-i18n="t" data-i18n-aria-label="a" aria-label="EN aria">EN text</button>'
  );
});

test('attribute directive with target attribute ABSENT: inserts the attribute (setAttribute semantics)', () => {
  const html = '<input type="text" data-i18n-placeholder="p">';
  const out = localizeHtml(html, dictResolve({ p: 'Type here' }));
  assert.ok(out.includes('placeholder="Type here"'));
  assert.ok(out.includes('data-i18n-placeholder="p"'));
  // void element: no phantom end tag introduced
  assert.ok(!out.includes('</input>'));
});

test('data-i18n-alt attribute directive updates alt', () => {
  const html = '<img src="x.jpg" alt="Photo FR" data-i18n-alt="cap">';
  const out = localizeHtml(html, dictResolve({ cap: 'Photo EN' }));
  assert.ok(out.includes('alt="Photo EN"'));
  assert.ok(!out.includes('Photo FR'));
});

test('attr directive resolving null leaves the existing attribute value', () => {
  const html = '<a data-i18n-aria-label="miss" aria-label="Ouvrir WhatsApp">CTA</a>';
  const out = localizeHtml(html, dictResolve({}));
  assert.equal(out, html);
});

test('active ancestor html directive WINS: nested directive is discarded', () => {
  const html = '<div data-i18n-html="outer"><span data-i18n="inner">x</span></div>';
  const out = localizeHtml(html, dictResolve({ outer: '<b>NEW</b>', inner: 'SHOULD_NOT_APPEAR' }));
  assert.equal(out, '<div data-i18n-html="outer"><b>NEW</b></div>');
  assert.ok(!out.includes('SHOULD_NOT_APPEAR'));
  assert.ok(!out.includes('data-i18n="inner"')); // nested element wiped
});

test('inactive ancestor (null) does NOT discard a nested directive that resolves', () => {
  const html = '<div data-i18n-html="outer"><span data-i18n="inner">x</span></div>';
  // outer has no translation -> French wrapper kept; inner still gets translated
  const out = localizeHtml(html, dictResolve({ inner: 'NEW' }));
  assert.equal(out, '<div data-i18n-html="outer"><span data-i18n="inner">NEW</span></div>');
});

test('html directive takes precedence over text directive on the same element', () => {
  const html = '<h2 data-i18n="t" data-i18n-html="h">Titre</h2>';
  const out = localizeHtml(html, dictResolve({ t: 'plain', h: '<em>rich</em>' }));
  // innerHTML pass runs after textContent pass in the client -> html wins
  assert.equal(out, '<h2 data-i18n="t" data-i18n-html="h"><em>rich</em></h2>');
});

test('no-directive HTML round-trips byte-identical (strict no-op)', () => {
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><title>Hi & bye</title></head>' +
    '<body><div class="a"><p>Bonjour <strong>le</strong> monde</p>' +
    '<!-- a comment with <fake> tags --><img src="x.png"></div></body></html>';
  const out = localizeHtml(html, () => 'SHOULD_NOT_BE_USED');
  assert.equal(out, html);
});

test('bytes outside targeted spans are preserved exactly', () => {
  const html = 'PREFIX<span data-i18n="k">FR</span>MIDDLE<span>plain</span>SUFFIX';
  const out = localizeHtml(html, dictResolve({ k: 'EN' }));
  assert.equal(out, 'PREFIX<span data-i18n="k">EN</span>MIDDLE<span>plain</span>SUFFIX');
});

test('attribute value containing > does not break start-tag parsing', () => {
  const html = '<button title="a > b" data-i18n="k">Salut</button>';
  const out = localizeHtml(html, dictResolve({ k: 'Hi' }));
  assert.equal(out, '<button title="a > b" data-i18n="k">Hi</button>');
});

test('directives inside <script> raw content are ignored (rawtext)', () => {
  const html = '<script>var s = \'<div data-i18n="k">x</div>\';</script><p data-i18n="k">FR</p>';
  const out = localizeHtml(html, dictResolve({ k: 'EN' }));
  // the <script> body is opaque and untouched; only the real <p> is translated
  assert.equal(
    out,
    '<script>var s = \'<div data-i18n="k">x</div>\';</script><p data-i18n="k">EN</p>'
  );
});

test('REAL DATA: azerbaidjan/index.html localized against data/trips/azerbaidjan.json i18n.en', () => {
  const html = readFileSync(new URL('site/azerbaidjan/index.html', `file://${ROOT}`), 'utf8');
  const trip = JSON.parse(
    readFileSync(new URL('data/trips/azerbaidjan.json', `file://${ROOT}`), 'utf8')
  );
  const en = trip.i18n.en;
  assert.ok(en && typeof en === 'object', 'i18n.en block present');

  const resolve = dictResolve(en); // flat lookup, misses -> null
  const out = localizeHtml(html, resolve);

  const countClose = (s) => (s.match(/<\//g) || []).length;
  const inClose = countClose(html);
  const outClose = countClose(out);

  // Structural sanity: the transform never fabricates net-new closing tags, and
  // only ever REMOVES a small, bounded number. On this page exactly 4 disappear:
  // four FAQ <button data-i18n="…"> carry an <svg> chevron that the client's
  // textContent assignment destroys — a quirk this module faithfully reproduces.
  assert.ok(outClose <= inClose, 'closing-tag count never increases');
  assert.ok(inClose - outClose <= 8, `closing-tag count barely changes (${inClose} -> ${outClose})`);

  // The directive attributes themselves survive untouched (needed so the client
  // can still switch languages after hydration).
  const countAttr = (s, re) => (s.match(re) || []).length;
  assert.equal(countAttr(out, /data-i18n="/g), countAttr(html, /data-i18n="/g));
  assert.equal(countAttr(out, /data-i18n-html="/g), countAttr(html, /data-i18n-html="/g));

  // A known French string that HAS an English translation is now English.
  const frEyebrow = 'Voyage guidé · Départ Alger · 2026';
  const enEyebrow = en.azHeroEyebrow;
  assert.equal(enEyebrow, 'Guided tour · Departure from Algiers · 2026');
  assert.ok(out.includes(enEyebrow), 'English hero eyebrow present after localize');
  assert.ok(!out.includes(frEyebrow), 'French hero eyebrow fully replaced');

  // Overall byte length changed only modestly (EN copy differs from FR).
  const ratio = Math.abs(out.length - html.length) / html.length;
  assert.ok(ratio < 0.05, `byte length change is modest (${(ratio * 100).toFixed(2)}%)`);
});
