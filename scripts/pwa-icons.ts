// Membuat ikon PWA Studio (public/studio-icons/*.png) dari SVG di bawah. Jalankan ulang jika desain berubah:
//   npx tsx scripts/pwa-icons.ts
// Desain: kartu planner putih dengan dua garis dan titik oranye di latar gelap.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(process.cwd(), "public", "studio-icons");

/** `pad` = ruang aman (maskable butuh ±10% di tiap sisi). */
function svg(size: number, pad: number): string {
  const s = size;
  const inner = s - pad * 2;
  const u = inner / 16; // satuan grid
  const x = pad;
  const y = pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#171717"/>
  <rect x="${x + 2 * u}" y="${y + 2.5 * u}" width="${12 * u}" height="${11 * u}" rx="${1.6 * u}" fill="#fafafa"/>
  <rect x="${x + 4 * u}" y="${y + 5.5 * u}" width="${6.5 * u}" height="${1.3 * u}" rx="${0.65 * u}" fill="#171717"/>
  <rect x="${x + 4 * u}" y="${y + 8.4 * u}" width="${4.5 * u}" height="${1.3 * u}" rx="${0.65 * u}" fill="#171717"/>
  <circle cx="${x + 11.2 * u}" cy="${y + 10.6 * u}" r="${1.6 * u}" fill="#f97316"/>
</svg>`;
}

async function write(name: string, size: number, pad: number) {
  await sharp(Buffer.from(svg(size, pad))).png({ compressionLevel: 9 }).toFile(join(OUT, name));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await write("icon-192.png", 192, 0);
  await write("icon-512.png", 512, 0);
  await write("icon-maskable-512.png", 512, 52);
  await write("apple-touch-icon.png", 180, 14);
  console.log(`Ikon ditulis ke ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
