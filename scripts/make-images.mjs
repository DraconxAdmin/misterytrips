import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');

// ---- 1200x630 social share image (Open Graph / Twitter) ----
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="78%" cy="-12%" r="125%">
      <stop offset="0%" stop-color="#20184A"/>
      <stop offset="55%" stop-color="#0C1026"/>
      <stop offset="100%" stop-color="#080B1C"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <path d="M-40 560 C 240 480, 360 320, 700 280 S 1120 150, 1320 80" fill="none" stroke="#DDA84A" stroke-opacity="0.30" stroke-width="3" stroke-dasharray="3 13" stroke-linecap="round"/>
  <g fill="#DDA84A" opacity="0.85">
    <path d="M150 175 l7 16 16 7 -16 7 -7 16 -7 -16 -16 -7 16 -7z"/>
    <path d="M1060 430 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" opacity="0.7"/>
    <path d="M1135 215 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z" opacity="0.6"/>
  </g>
  <g transform="translate(930,70) scale(1.7)">
    <path d="M90 14 L10 52 L52 60 Z" fill="#DDA84A"/>
    <path d="M90 14 L52 60 L44 86 Z" fill="#B07F2E"/>
  </g>
  <text x="90" y="232" font-family="Arial, Helvetica, sans-serif" font-size="21" letter-spacing="9" fill="#B9B6C9" font-weight="bold">DESTINATION CLASSIFIED</text>
  <text x="86" y="338" font-family="Georgia, 'Times New Roman', serif" font-size="78" fill="#F4EDDF">Go somewhere you&#8217;d</text>
  <text x="86" y="426" font-family="Georgia, 'Times New Roman', serif" font-size="78" fill="#F4EDDF"><tspan font-style="italic" fill="#DDA84A">never</tspan> choose yourself.</text>
  <text x="90" y="520" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#C7C3D6">Surprise trips, designed for you &#8212; sealed until the gate.</text>
  <text x="90" y="588" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#F4EDDF">mistery<tspan fill="#DDA84A">trips</tspan></text>
  <text x="1110" y="588" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="6" fill="#6B6788">PACK &#183; FLY &#183; REVEAL</text>
</svg>`;

// ---- favicon source (rounded dark tile + gold plane) ----
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0C1026"/>
  <g transform="translate(7,9) scale(0.84)">
    <path d="M90 14 L10 52 L52 60 Z" fill="#DDA84A"/>
    <path d="M90 14 L52 60 L44 86 Z" fill="#B07F2E"/>
  </g>
</svg>`;

await sharp(Buffer.from(ogSvg)).png().toFile(path.join(pub, 'assets', 'og-image.png'));
await sharp(Buffer.from(iconSvg)).resize(32, 32).png().toFile(path.join(pub, 'favicon-32.png'));
await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'));
console.log('Generated: og-image.png (1200x630), favicon-32.png, apple-touch-icon.png');
