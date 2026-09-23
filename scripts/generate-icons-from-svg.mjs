// Régénère icon-192.png / icon-512.png depuis public/icon.svg (logo principal).
// Usage : node scripts/generate-icons-from-svg.mjs
// Requiert : npm i -D sharp (ou cairosvg côté Python).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'public', 'icon.svg');
const out192 = path.join(root, 'public', 'icon-192.png');
const out512 = path.join(root, 'public', 'icon-512.png');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error("❌ sharp n'est pas installé. Lance : npm i -D sharp");
  process.exit(1);
}

if (!fs.existsSync(svgPath)) {
  console.error(`❌ SVG introuvable : ${svgPath}`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath);
await sharp(svg).resize(192, 192, { fit: 'contain', background: '#1F3D2E' }).png().toFile(out192);
await sharp(svg).resize(512, 512, { fit: 'contain', background: '#1F3D2E' }).png().toFile(out512);
console.log('✅ Icônes PWA régénérées depuis public/icon.svg (192 + 512).');
