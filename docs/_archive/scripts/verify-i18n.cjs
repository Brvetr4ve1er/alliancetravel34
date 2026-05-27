/* TEMP verification: confirm every data-i18n* key used in the HTML resolves
   in the FR/EN/AR dictionaries of site/assets/js/i18n.js. Deleted after use. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// --- extract the T object literal from i18n.js via brace matching ---
const src = fs.readFileSync(path.join(ROOT, 'site/assets/js/i18n.js'), 'utf8');
const start = src.indexOf('const T = {');
if (start < 0) { console.error('T not found'); process.exit(1); }
let i = src.indexOf('{', start), depth = 0, end = -1;
for (; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const objStr = src.slice(src.indexOf('{', start), end + 1);
let T;
try { T = eval('(' + objStr + ')'); } catch (e) { console.error('eval failed:', e.message); process.exit(1); }
console.log('Dict langs:', Object.keys(T).join(', '));

const lookup = (key, dict) => key.split('.').reduce((o, k) => (o && k in o) ? o[k] : null, dict);

const pages = [
  'site/index.html', 'site/voyages/index.html',
  'site/cairo-sharm/index.html', 'site/azerbaidjan/index.html',
  'site/istanbul/index.html', 'site/kuala-lumpur/index.html',
  'site/sharm-constantine/index.html',
];

const keyRe = /data-i18n(?:-(?:html|aria-label|title|placeholder|alt))?="([^"]+)"/g;
const allKeys = new Set();
const perPage = {};
for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  let m, n = 0;
  while ((m = keyRe.exec(html))) { allKeys.add(m[1]); n++; }
  perPage[p] = n;
}

console.log('\nattrs per page:');
for (const p of pages) console.log('  ' + p.padEnd(34), perPage[p]);

const missEN = [], missAR = [], missFR = [];
for (const k of [...allKeys].sort()) {
  if (lookup(k, T.fr) == null) missFR.push(k);
  if (lookup(k, T.en) == null) missEN.push(k);
  if (lookup(k, T.ar) == null) missAR.push(k);
}
console.log('\nunique keys used:', allKeys.size);
console.log('missing in FR dict (' + missFR.length + '):', missFR.join(', ') || '—');
console.log('missing in EN dict (' + missEN.length + '):', missEN.join(', ') || '—');
console.log('missing in AR dict (' + missAR.length + '):', missAR.join(', ') || '—');
