// STALE / UNUSED — requires `sharp`, which is not installed and cannot be: this repo has zero dependencies and no package.json. Referenced by nothing. Do not run; candidate for deletion.
/**
 * One-shot script — re-encode the 3 heavy desktop hero layers flagged by
 * the Jun 5 audit (F5). Target: ~150-250 KB AVIF, ~300-400 KB WebP, to
 * match the well-optimised cairo-sharm/istanbul/kuala-lumpur set.
 *
 * Safety:
 *   - backs up originals to scripts/_hero-reencode-backup/ before writing
 *   - writes via tmp + rename so a crash never leaves a half-encoded file
 *   - prints before/after sizes; revert via `node scripts/reencode-heroes.cjs --revert`
 *
 * Run:   node scripts/reencode-heroes.cjs
 * Revert: node scripts/reencode-heroes.cjs --revert
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'site/assets/images/heroes-v2');
const BACKUP = path.join(__dirname, '_hero-reencode-backup');

// The 3 source JPGs to re-encode (their .avif and .webp siblings get rewritten).
const SOURCES = [
  'hero__sharm-constantine--fg.jpg',
  'hero__sharm-constantine--bg.jpg',
  'hero__azerbaidjan--fg.jpg',
];

const SIBLINGS = (jpg) => [
  jpg.replace(/\.jpg$/, '.avif'),
  jpg.replace(/\.jpg$/, '.webp'),
];

const kb = (n) => Math.round(n / 1024);

async function backup(file) {
  if (!fs.existsSync(BACKUP)) fs.mkdirSync(BACKUP, { recursive: true });
  const dst = path.join(BACKUP, path.basename(file));
  if (!fs.existsSync(dst)) fs.copyFileSync(file, dst);
}

async function revert() {
  if (!fs.existsSync(BACKUP)) {
    console.error('No backup directory found at', BACKUP);
    process.exit(1);
  }
  let n = 0;
  for (const f of fs.readdirSync(BACKUP)) {
    const src = path.join(BACKUP, f);
    const dst = path.join(DIR, f);
    fs.copyFileSync(src, dst);
    n++;
    console.log('  reverted', f);
  }
  console.log(`\n✓ Reverted ${n} file(s).`);
}

async function reencode() {
  console.log('Re-encoding desktop hero AVIF/WebP layers...\n');
  for (const jpgName of SOURCES) {
    const jpgPath = path.join(DIR, jpgName);
    if (!fs.existsSync(jpgPath)) {
      console.error('  source missing:', jpgPath);
      continue;
    }
    const meta = await sharp(jpgPath).metadata();
    console.log(`${jpgName}  (${meta.width}x${meta.height})`);

    for (const sibling of SIBLINGS(jpgName)) {
      const out = path.join(DIR, sibling);
      const before = fs.existsSync(out) ? fs.statSync(out).size : 0;
      await backup(out);

      const tmp = out + '.tmp';
      let pipeline = sharp(jpgPath);
      if (sibling.endsWith('.avif')) {
        // Quality 40 + effort 6 + 4:2:0 chroma — tuned so even the worst
        // case (sharm-constantine-fg at 2000×2667) lands under ~450 KB,
        // while the lighter layers (bg, azerbaidjan-fg) come in 180-260 KB.
        pipeline = pipeline.avif({ quality: 40, effort: 6, chromaSubsampling: '4:2:0' });
      } else {
        // WebP fallback for browsers without AVIF (Safari <16). Quality 72
        // is slightly below the AVIF target since AVIF will be selected first.
        pipeline = pipeline.webp({ quality: 72, effort: 6 });
      }
      await pipeline.toFile(tmp);
      fs.renameSync(tmp, out);

      const after = fs.statSync(out).size;
      const delta = before - after;
      const pct = before ? Math.round((delta / before) * 100) : 0;
      console.log(
        `  ${sibling.padEnd(46)} ${kb(before).toString().padStart(5)} KB → ${kb(after).toString().padStart(4)} KB  (-${pct}%)`,
      );
    }
  }
  console.log(`\n✓ Done. Backups at ${path.relative(ROOT, BACKUP)}/`);
}

(async () => {
  if (process.argv.includes('--revert')) {
    await revert();
  } else {
    await reencode();
  }
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
