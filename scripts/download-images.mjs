// Downloads venue photography into public/images/centers/.
// Also writes 480w/960w WebP variants used by the venue cards' srcset.
// Usage: npm run images  (add --force to re-download existing files)
import { mkdir, writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'images', 'centers');
const force = process.argv.includes('--force');

const base = 'https://static.wixstatic.com/media/';
// Image IDs as published on www.activeseftonfitness.co.uk (Wix media, "f295b6_" account).
// Note: the "11062b_…" IDs from the original brief return 403 — they don't exist on the CDN.
const images = {
  bootle: 'f295b6_150b063455d34ec28fdb3d037d66906d~mv2.jpg', // Bootle Exterior.jpg
  crosby: 'f295b6_a40e0abd4cdb4450a6ff26bb1618770b~mv2.jpg', // CLAC Exterior Square.jpg
  dunes: 'f295b6_3aae5769e6394e6c817640832b3beef5~mv2.jpg', // Dunes Slide.jpg
  litherland: 'f295b6_ab5a7d48e599497d84632d2f6cacbd7c~mv2.jpg', // Litherland Exterior.jpg
  meadows: 'f295b6_ecf4bfdaf6e24e59baa7e37fd1d0372b~mv2.jpg', // Meadows Exterior.jpg
  netherton: 'f295b6_4f3495ff197448b1b842d4cd38c1f350~mv2.jpg', // Netherton Exterior.jpg
};

// Wix serves resized variants via this path suffix; 1600px wide is plenty for cards.
const sized = (file) => `${base}${file}/v1/fill/w_1600,h_1067,al_c,q_80,enc_auto/${file}`;

const widths = [480, 960];

const exists = (p) => access(p).then(() => true, () => false);

async function writeVariants(slug, input) {
  for (const w of widths) {
    await sharp(input).resize({ width: w }).webp({ quality: 72 }).toFile(join(outDir, `${slug}-${w}.webp`));
  }
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (asset-sync)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`unexpected content-type "${type}"`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(outDir, { recursive: true });

let failed = 0;
for (const [slug, file] of Object.entries(images)) {
  const dest = join(outDir, `${slug}.jpg`);
  if (!force && (await exists(dest))) {
    await writeVariants(slug, dest);
    console.log(`skip  ${slug}.jpg (exists, variants refreshed)`);
    continue;
  }
  try {
    let buf;
    try {
      buf = await fetchImage(sized(file));
    } catch {
      buf = await fetchImage(base + file); // fall back to the original upload
    }
    await writeFile(dest, buf);
    await writeVariants(slug, buf);
    console.log(`saved ${slug}.jpg (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    failed++;
    console.error(`fail  ${slug}.jpg: ${err.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} image(s) failed to download.`);
  process.exit(1);
}
