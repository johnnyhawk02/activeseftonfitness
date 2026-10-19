// Builds the logo and favicon files in public/ from the originals in brand/.
// Run with `npm run brand` after replacing brand/mark.webp or brand/wordmark.webp.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const out = 'public/images/brand';
await mkdir(out, { recursive: true });

// Wordmark: trim the transparent margin, then export at 2x and 3x of the
// header height (32px).
const wordmark = await sharp('brand/wordmark.webp').trim().toBuffer();
for (const h of [64, 96]) {
  await sharp(wordmark).resize({ height: h }).webp({ quality: 90 }).toFile(`${out}/wordmark-${h}.webp`);
}

// Mark: the blue square with the white cross.
for (const s of [64, 96]) {
  await sharp('brand/mark.webp').resize(s, s).webp({ quality: 90 }).toFile(`${out}/mark-${s}.webp`);
}
await sharp('brand/mark.webp').resize(32, 32).png().toFile('public/favicon-32.png');
await sharp('brand/mark.webp').resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp('brand/mark.webp').resize(512, 512).png().toFile('public/icon-512.png');

console.log('Brand images written.');
