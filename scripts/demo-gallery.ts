// Data contoh Galeri untuk uji tampilan (bukan untuk produksi).
//
//   npx tsx scripts/demo-gallery.ts          buat ulang karya contoh (slug berawalan "contoh-")
//   npx tsx scripts/demo-gallery.ts --hapus  hapus karya contoh + filenya
//
// Membuat 10 karya Terbit (campuran medium/ketersediaan/tahun, 5 unggulan, 1 harga tersembunyi,
// 1 dengan foto proses) + 1 Draft, dengan gambar gradasi buatan sharp yang ditulis langsung ke
// UPLOAD_DIR. Profil contoh (tagline, bio, aboutText, kota) hanya diisi jika field itu masih kosong.
// Hanya menyentuh baris karya ber-slug "contoh-" dan field profil yang kosong/berisi teks contoh.
// Catatan: skrip ini tidak me-revalidate cache Galeri; di `next start` jalankan ulang build atau
// simpan sesuatu di Studio. Di `next dev` perubahan langsung terlihat.

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, type Availability, type Medium } from "@prisma/client";
import sharp from "sharp";

try {
  process.loadEnvFile(".env");
} catch {
  // Tanpa .env: pakai variabel lingkungan yang sudah ada.
}

const PREFIX = "contoh-";
const REMOVE = process.argv.includes("--hapus");

if (process.env.NODE_ENV === "production" && !process.argv.includes("--paksa")) {
  console.error("NODE_ENV=production: data contoh tidak dibuat. Tambahkan --paksa jika memang sengaja.");
  process.exit(1);
}

const prisma = new PrismaClient();
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./uploads");

// ---- Gambar ----

type Palette = { from: string; to: string; accent: string; ink: string };
type ImageKind = "clay" | "drawing" | "mixed" | "process";
type ImageSpec = { kind: ImageKind; width: number; height: number; palette: Palette; seed: number };

/** PRNG kecil (mulberry32) supaya gambar contoh selalu sama untuk seed yang sama. */
function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function artSvg({ kind, width: w, height: h, palette: p, seed }: ImageSpec): string {
  const rnd = random(seed);
  const min = Math.min(w, h);
  const shapes: string[] = [];

  if (kind === "drawing") {
    // Kertas dengan garis-garis pensil/tinta.
    const m = min * 0.07;
    shapes.push(`<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="#fbf8f1" />`);
    for (let i = 0; i < 26; i++) {
      const x1 = m + rnd() * (w - 2 * m);
      const y1 = m + rnd() * (h - 2 * m);
      const cx = m + rnd() * (w - 2 * m);
      const cy = m + rnd() * (h - 2 * m);
      const x2 = m + rnd() * (w - 2 * m);
      const y2 = m + rnd() * (h - 2 * m);
      const stroke = i % 4 === 0 ? p.accent : p.ink;
      shapes.push(
        `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${stroke}" stroke-opacity="${0.25 + rnd() * 0.5}" stroke-width="${2 + rnd() * 6}" fill="none" stroke-linecap="round" />`,
      );
    }
    shapes.push(
      `<circle cx="${w * (0.35 + rnd() * 0.3)}" cy="${h * (0.35 + rnd() * 0.3)}" r="${min * 0.18}" fill="${p.accent}" fill-opacity="0.22" />`,
    );
  } else if (kind === "clay") {
    // "Patung": bentuk membulat dengan gradasi radial + bayangan di alas.
    const cx = w / 2;
    const cy = h * 0.55;
    const rx = min * (0.24 + rnd() * 0.08);
    const ry = rx * (1.1 + rnd() * 0.35);
    shapes.push(`<ellipse cx="${cx}" cy="${cy + ry * 0.98}" rx="${rx * 1.25}" ry="${rx * 0.18}" fill="#000" fill-opacity="0.18" />`);
    shapes.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#body)" />`);
    shapes.push(`<ellipse cx="${cx - rx * 0.1}" cy="${cy - ry * 0.85}" rx="${rx * 0.62}" ry="${rx * 0.55}" fill="url(#body)" />`);
    shapes.push(`<circle cx="${cx - rx * 0.3}" cy="${cy - ry * 0.92}" r="${rx * 0.08}" fill="${p.ink}" />`);
    shapes.push(`<circle cx="${cx + rx * 0.12}" cy="${cy - ry * 0.92}" r="${rx * 0.08}" fill="${p.ink}" />`);
  } else if (kind === "mixed") {
    for (let i = 0; i < 7; i++) {
      shapes.push(
        `<circle cx="${rnd() * w}" cy="${rnd() * h}" r="${min * (0.1 + rnd() * 0.25)}" fill="${i % 2 ? p.accent : p.ink}" fill-opacity="${0.25 + rnd() * 0.4}" />`,
      );
    }
    shapes.push(`<rect x="${w * 0.2}" y="${h * 0.2}" width="${w * 0.6}" height="${h * 0.6}" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="${min * 0.012}" />`);
  } else {
    // Proses: meja kerja dengan alat dan bentuk setengah jadi.
    shapes.push(`<rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${p.ink}" fill-opacity="0.35" />`);
    for (let i = 0; i < 4; i++) {
      shapes.push(
        `<rect x="${w * (0.08 + i * 0.12)}" y="${h * (0.66 + rnd() * 0.1)}" width="${w * 0.03}" height="${h * 0.2}" rx="${w * 0.01}" fill="${p.accent}" fill-opacity="0.8" transform="rotate(${-20 + rnd() * 40} ${w * (0.1 + i * 0.12)} ${h * 0.75})" />`,
      );
    }
    shapes.push(`<ellipse cx="${w * 0.65}" cy="${h * 0.5}" rx="${min * 0.18}" ry="${min * 0.24}" fill="${p.accent}" fill-opacity="0.55" />`);
  }

  const angle = Math.round(rnd() * 360);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0" stop-color="${p.from}" /><stop offset="1" stop-color="${p.to}" />
    </linearGradient>
    <radialGradient id="body" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55" />
      <stop offset="0.25" stop-color="${p.accent}" />
      <stop offset="1" stop-color="${p.ink}" />
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  ${shapes.join("\n  ")}
</svg>`;
}

const writtenKeys: string[] = [];

async function writeImage(spec: ImageSpec): Promise<{ storageKey: string; width: number; height: number }> {
  const { data, info } = await sharp(Buffer.from(artSvg(spec)))
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const storageKey = `${randomBytes(16).toString("hex")}.webp`;
  await writeFile(path.join(uploadDir, storageKey), data, { flag: "wx" });
  writtenKeys.push(storageKey);
  return { storageKey, width: info.width, height: info.height };
}

// ---- Data ----

const P = {
  merah: { from: "#f6e7dc", to: "#e9c7b0", accent: "#c2412d", ink: "#5b1a10" },
  grafit: { from: "#ecebe8", to: "#d6d3cd", accent: "#57534e", ink: "#292524" },
  biru: { from: "#dbeafe", to: "#a5d8e6", accent: "#2563eb", ink: "#0f3a5f" },
  hijau: { from: "#e3eedb", to: "#bcd4b0", accent: "#4d7c0f", ink: "#1f3a12" },
  senja: { from: "#fcd9b8", to: "#c4a0d9", accent: "#ea580c", ink: "#4c1d95" },
  coklat: { from: "#efe3d3", to: "#d8bf9f", accent: "#92400e", ink: "#3f2410" },
  sepia: { from: "#f3ead8", to: "#dccfb4", accent: "#78716c", ink: "#3b2f22" },
  koi: { from: "#e0f2fe", to: "#f1f5f9", accent: "#dc2626", ink: "#1e3a8a" },
  krem: { from: "#faf3e3", to: "#eadcbc", accent: "#0f766e", ink: "#1c1917" },
  lumut: { from: "#dfe8d5", to: "#a7b99a", accent: "#65a30d", ink: "#3f3a1d" },
  naga: { from: "#dbeafe", to: "#93c5fd", accent: "#1d4ed8", ink: "#172554" },
} satisfies Record<string, Palette>;

type DemoArtwork = {
  slug: string;
  title: string;
  medium: Medium;
  year: number;
  availability: Availability;
  priceIdr?: number;
  showPrice?: boolean;
  featuredOrder?: number;
  draft?: boolean;
  size: [number | null, number | null, number | null];
  materials: string;
  summary: string;
  description: string;
  palette: Palette;
  /** Foto karya jadi (pertama = cover): [lebar, tinggi, teks alternatif]. */
  photos: [number, number, string][];
  process?: [number, number, string][];
};

const ARTWORKS: DemoArtwork[] = [
  {
    slug: "kepala-naga-merah",
    title: "Kepala Naga Merah",
    medium: "CLAY",
    year: 2026,
    availability: "AVAILABLE",
    priceIdr: 1_850_000,
    showPrice: true,
    featuredOrder: 1,
    size: [12, 18, 10],
    materials: "Clay polimer, cat akrilik, pernis doff",
    summary: "Kepala naga kecil dengan sisik yang dibentuk satu per satu.",
    description:
      "Naga ini berawal dari sketsa iseng di buku catatan. Bentuk dasarnya dibuat dari kerangka kawat dan aluminium foil supaya ringan.\n\nSisiknya ditekan satu per satu dengan ujung kuas yang dipotong, lalu dibakar dua kali.\nWarnanya dibangun berlapis: merah tua, jingga, lalu sapuan emas tipis di tepi sisik.",
    palette: P.merah,
    photos: [
      [1600, 2000, "Kepala naga merah dari clay, tampak depan"],
      [1600, 2000, "Kepala naga merah, tampak samping kiri"],
      [2000, 1500, "Detail sisik naga dari dekat"],
    ],
    process: [
      [1600, 1600, "Kerangka kawat dan foil sebelum dilapisi clay"],
      [1600, 1600, "Naga setelah dibakar, sebelum dicat"],
    ],
  },
  {
    slug: "studi-tangan-no-3",
    title: "Studi Tangan No. 3",
    medium: "DRAWING",
    year: 2026,
    availability: "SOLD",
    priceIdr: 650_000,
    showPrice: true,
    featuredOrder: 2,
    size: [21, 29.7, null],
    materials: "Pensil grafit 2B–8B di kertas 200 gsm",
    summary: "Latihan anatomi tangan dengan pencahayaan dari samping.",
    description: "Bagian dari seri latihan menggambar tangan setiap hari selama sebulan.",
    palette: P.grafit,
    photos: [[1500, 2000, "Gambar pensil tangan yang menggenggam, di atas kertas putih"]],
  },
  {
    slug: "kucing-tidur-di-jendela",
    title: "Kucing Tidur di Jendela",
    medium: "DRAWING",
    year: 2025,
    availability: "AVAILABLE",
    featuredOrder: 3,
    size: [40, 30, null],
    materials: "Cat air di kertas cotton 300 gsm",
    summary: "Sore yang tenang dengan cahaya biru dari jendela.",
    description: "Dilukis dari foto kucing tetangga yang selalu tidur di ambang jendela setiap sore.",
    palette: P.biru,
    photos: [
      [2000, 1500, "Lukisan cat air kucing tidur di ambang jendela"],
      [1500, 2000, "Detail wajah kucing pada lukisan"],
    ],
  },
  {
    slug: "penjaga-kebun",
    title: "Penjaga Kebun",
    medium: "CLAY",
    year: 2025,
    availability: "NOT_FOR_SALE",
    featuredOrder: 4,
    size: [15, 22, 15],
    materials: "Clay air-dry, cat akrilik",
    summary: "Figur kecil penjaga tanaman di meja kerja.",
    description: "Dibuat sebagai hadiah untuk ibu. Tidak dijual, tapi boleh dipesan versi lain.",
    palette: P.hijau,
    photos: [[1600, 2000, "Figur clay hijau berbentuk penjaga kebun"]],
  },
  {
    slug: "senja-di-pelabuhan",
    title: "Senja di Pelabuhan",
    medium: "DRAWING",
    year: 2024,
    availability: "RESERVED",
    priceIdr: 1_200_000,
    showPrice: true,
    size: [42, 29.7, null],
    materials: "Pastel minyak di kertas pastel",
    summary: "Warna jingga dan ungu di langit pelabuhan.",
    description: "Digambar langsung di lokasi dalam dua kali kunjungan.",
    palette: P.senja,
    photos: [[2100, 1400, "Gambar pastel pelabuhan saat senja dengan langit jingga dan ungu"]],
  },
  {
    slug: "burung-hantu-kecil",
    title: "Burung Hantu Kecil",
    medium: "CLAY",
    year: 2026,
    availability: "AVAILABLE",
    // Harga tersembunyi: tidak boleh muncul di Galeri ("Harga atas permintaan").
    priceIdr: 450_000,
    showPrice: false,
    featuredOrder: 5,
    size: [8, 12, 8],
    materials: "Clay polimer",
    summary: "Burung hantu seukuran telapak tangan.",
    description: "Mata dibuat dari manik kaca kecil.",
    palette: P.coklat,
    photos: [
      [1800, 1800, "Burung hantu kecil dari clay berwarna coklat"],
      [1800, 1800, "Burung hantu kecil tampak belakang"],
    ],
  },
  {
    slug: "potret-nenek",
    title: "Potret Nenek",
    medium: "DRAWING",
    year: 2023,
    availability: "NOT_FOR_SALE",
    size: [25, 35, null],
    materials: "Charcoal di kertas",
    summary: "Potret pertama yang benar-benar selesai.",
    description: "Disimpan sebagai koleksi pribadi keluarga.",
    palette: P.sepia,
    photos: [[1600, 2000, "Potret charcoal seorang nenek tersenyum"]],
  },
  {
    slug: "ikan-koi-berpasangan",
    title: "Ikan Koi Berpasangan",
    medium: "MIXED",
    year: 2025,
    availability: "AVAILABLE",
    priceIdr: 2_400_000,
    showPrice: true,
    size: [30, 30, 5],
    materials: "Clay polimer di atas kanvas, cat akrilik",
    summary: "Relief dua ikan koi berenang melingkar.",
    description: "Campuran lukisan dan relief clay yang ditempel di kanvas.",
    palette: P.koi,
    photos: [[1800, 1800, "Relief clay dua ikan koi merah putih di atas kanvas biru muda"]],
  },
  {
    slug: "rumah-panggung",
    title: "Rumah Panggung",
    medium: "DRAWING",
    year: 2026,
    availability: "AVAILABLE",
    priceIdr: 900_000,
    showPrice: true,
    size: [29.7, 21, null],
    materials: "Drawing pen di kertas 160 gsm",
    summary: "Sketsa rumah panggung kayu di kampung.",
    description: "Garis tinta tanpa pensil dulu.",
    palette: P.krem,
    photos: [[2000, 1500, "Sketsa tinta rumah panggung kayu"]],
  },
  {
    slug: "kura-kura-lumut",
    title: "Kura-kura Lumut",
    medium: "CLAY",
    year: 2024,
    availability: "SOLD",
    size: [10, 6, 14],
    materials: "Clay polimer, serbuk flok",
    summary: "Kura-kura dengan cangkang berlumut.",
    description: "Sudah terjual ke kolektor di Bandung.",
    palette: P.lumut,
    photos: [[2000, 1600, "Kura-kura clay hijau dengan cangkang berlumut"]],
  },
  {
    slug: "naga-biru-draft",
    title: "Naga Biru (draft)",
    medium: "CLAY",
    year: 2026,
    availability: "AVAILABLE",
    priceIdr: 3_000_000,
    showPrice: true,
    draft: true,
    size: [20, 30, 15],
    materials: "Clay polimer",
    summary: "Draft: tidak boleh muncul di Galeri.",
    description: "Karya Draft untuk menguji batas data Galeri.",
    palette: P.naga,
    photos: [[1600, 2000, "Naga biru dari clay (draft)"]],
  },
];

const DEMO_PROFILE = {
  tagline: "Gambar dan patung clay buatan tangan, lengkap dengan cerita prosesnya.",
  bio: "Belajar menggambar sejak kecil dan jatuh cinta pada clay tiga tahun lalu. Setiap karya dibuat pelan-pelan di meja kerja kecil di rumah.",
  aboutText:
    "Awalnya hanya menggambar di buku tulis sekolah. Setelah bekerja, menggambar jadi cara untuk istirahat dari layar.\n\nTiga tahun lalu mencoba clay polimer untuk pertama kali, dan sejak itu meja kerja selalu penuh bentuk setengah jadi.\nProses tiap karya direkam dan dibagikan di TikTok dan Instagram.\n\nSekarang sedang belajar membuat figur yang lebih besar dan menerima pesanan dalam jumlah terbatas.",
  city: "Bandung",
} as const;

type ProfileField = keyof typeof DEMO_PROFILE;
const PROFILE_FIELDS = Object.keys(DEMO_PROFILE) as ProfileField[];
const DEMO_SELECT = { tagline: true, bio: true, aboutText: true, city: true } as const satisfies Record<ProfileField, true>;

// ---- Aksi ----

async function removeDemoArtworks(): Promise<number> {
  const rows = await prisma.artwork.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, images: { select: { storageKey: true } } },
  });
  if (rows.length === 0) return 0;
  await prisma.artwork.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  // File dihapus setelah baris DB terhapus (pola yang sama dengan Studio).
  for (const key of rows.flatMap((r) => r.images.map((i) => i.storageKey))) {
    if (!/^[a-f0-9]{32}\.webp$/.test(key)) continue;
    await unlink(path.join(uploadDir, key)).catch(() => undefined);
  }
  return rows.length;
}

async function fillProfile(): Promise<ProfileField[]> {
  const current = await prisma.setting.findUnique({ where: { id: "default" }, select: DEMO_SELECT });
  const missing = PROFILE_FIELDS.filter((f) => !current?.[f]?.trim());
  if (missing.length === 0) return [];
  const data = Object.fromEntries(missing.map((f) => [f, DEMO_PROFILE[f]]));
  await prisma.setting.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  return missing;
}

/** --hapus: kosongkan field profil yang masih berisi teks contoh (yang sudah diubah tidak disentuh). */
async function clearDemoProfile(): Promise<ProfileField[]> {
  const current = await prisma.setting.findUnique({ where: { id: "default" }, select: DEMO_SELECT });
  if (!current) return [];
  const demo = PROFILE_FIELDS.filter((f) => current[f] === DEMO_PROFILE[f]);
  if (demo.length > 0) {
    await prisma.setting.update({ where: { id: "default" }, data: Object.fromEntries(demo.map((f) => [f, null])) });
  }
  return demo;
}


const KIND: Record<Medium, ImageKind> = { CLAY: "clay", DRAWING: "drawing", MIXED: "mixed" };

async function createDemoArtworks(): Promise<void> {
  await mkdir(uploadDir, { recursive: true });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (const [index, art] of ARTWORKS.entries()) {
    const photos = await Promise.all(
      art.photos.map(async ([width, height, alt], i) => ({
        ...(await writeImage({ kind: KIND[art.medium], width, height, palette: art.palette, seed: index * 100 + i + 1 })),
        alt,
        order: i,
        isCover: i === 0,
        isProcess: false,
      })),
    );
    const process = await Promise.all(
      (art.process ?? []).map(async ([width, height, alt], i) => ({
        ...(await writeImage({ kind: "process", width, height, palette: art.palette, seed: index * 100 + 50 + i })),
        alt,
        order: photos.length + i,
        isCover: false,
        isProcess: true,
      })),
    );

    await prisma.artwork.create({
      data: {
        slug: `${PREFIX}${art.slug}`,
        title: art.title,
        summary: art.summary,
        description: art.description,
        medium: art.medium,
        year: art.year,
        widthCm: art.size[0],
        heightCm: art.size[1],
        depthCm: art.size[2],
        materials: art.materials,
        availability: art.availability,
        priceIdr: art.priceIdr ?? null,
        showPrice: art.showPrice ?? false,
        isFeatured: art.featuredOrder !== undefined,
        featuredOrder: art.featuredOrder ?? 0,
        visibility: art.draft ? "DRAFT" : "PUBLISHED",
        // Terbaru dulu sesuai urutan daftar: satu karya tiap ±5 hari ke belakang.
        publishedAt: art.draft ? null : new Date(now - index * 5 * day),
        images: { create: [...photos, ...process] },
      },
    });
    console.log(`  + ${PREFIX}${art.slug}${art.draft ? " (Draft)" : ""}`);
  }
}

async function main() {
  console.log(`UPLOAD_DIR: ${uploadDir}`);
  const removed = await removeDemoArtworks();
  if (removed > 0) console.log(`Karya contoh lama dihapus: ${removed}`);

  if (REMOVE) {
    const cleared = await clearDemoProfile();
    if (cleared.length > 0) console.log(`Profil contoh dikosongkan: ${cleared.join(", ")}`);
    console.log("Selesai.");
    return;
  }

  console.log("Membuat karya contoh…");
  try {
    await createDemoArtworks();
  } catch (error) {
    // Jangan tinggalkan file yatim jika pembuatan gagal di tengah jalan.
    await removeDemoArtworks();
    await Promise.all(writtenKeys.map((key) => unlink(path.join(uploadDir, key)).catch(() => undefined)));
    throw error;
  }
  const filled = await fillProfile();
  console.log(filled.length > 0 ? `Profil contoh diisi: ${filled.join(", ")}` : "Profil sudah terisi, tidak diubah.");
  const published = ARTWORKS.filter((a) => !a.draft).length;
  console.log(`Selesai: ${published} karya Terbit + ${ARTWORKS.length - published} Draft, ${writtenKeys.length} foto.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
