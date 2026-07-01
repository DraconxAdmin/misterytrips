import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsOut = path.join(__dirname, '..', 'public', 'assets');

async function processImage(name, predicate) {
  const src = path.join(assetsOut, name);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let removed = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (predicate(r, g, b)) {
      data[i + 3] = 0;
      removed++;
    }
  }
  const pct = ((removed / (width * height)) * 100).toFixed(1);
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(src);
  console.log(`${name}: ${width}x${height}, removed ${pct}% -> transparent`);
}

const isNearBlack = (r, g, b) => r < 42 && g < 42 && b < 42;
const isMustard = (r, g, b) => r > 165 && g > 120 && b < 95 && r - b > 80;
const isLightNeutral = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mn >= 198 && mx - mn <= 16;
};

await processImage('step1-quiz.png', isNearBlack);
await processImage('step2-map.png', isNearBlack);
await processImage('step3-dossier.png', isNearBlack);
await processImage('step4-gate.png', isMustard);
console.log('done');
