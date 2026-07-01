import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsSrc = path.join(__dirname, '..', 'assets-src');
const assetsOut = path.join(__dirname, '..', 'public', 'assets');

// Remove a neutral (low-saturation) light background from assets-src only.
async function strip(name, { minLight = 198, maxSat = 16 } = {}) {
  const src = path.join(assetsSrc, name);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let removed = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx - mn;
    if (mn >= minLight && sat <= maxSat) {
      data[i + 3] = 0;
      removed++;
    }
  }
  const pct = ((removed / (width * height)) * 100).toFixed(1);

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(path.join(assetsOut, name));
  console.log(`${name}: ${width}x${height}, removed ${pct}% of pixels -> transparent`);
}

await strip('step2-map.png');
await strip('step3-dossier.png');
await strip('quiz-welcome.png');
await strip('quiz-part1.png');
await strip('quiz-part2.png');
await strip('quiz-part3.png');
console.log('done');
