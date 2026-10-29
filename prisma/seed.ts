// Seed idempoten: aman dijalankan berulang (upsert berdasarkan nama/label unik).
// Nilai yang sudah diubah pengguna (warna, porsi, isActive) tidak ditimpa.

import { PrismaClient } from "@prisma/client";
import { DEFAULT_SCORE_WEIGHTS } from "../src/lib/analytics/metrics";
import { DEFAULT_POSTING_SLOTS } from "../src/features/settings/schema";

const prisma = new PrismaClient();

const pillars = [
  {
    name: "Progres Gambar",
    description: "Perjalanan belajar menggambar, latihan, before/after",
    color: "#3b82f6",
    targetShare: 30,
  },
  {
    name: "Proses Clay",
    description: "Proses patung dari armature sampai finishing",
    color: "#f97316",
    targetShare: 30,
  },
  {
    name: "Showcase",
    description: "Hasil akhir gambar atau patung, reveal",
    color: "#a855f7",
    targetShare: 15,
  },
  {
    name: "Tips dan Tutorial",
    description: "Pelajaran, alat, kesalahan pemula",
    color: "#10b981",
    targetShare: 15,
  },
  {
    name: "Behind the Scenes",
    description: "Meja kerja, alat, kegagalan, cerita personal",
    color: "#ec4899",
    targetShare: 10,
  },
];

const formats = [
  "Time-lapse",
  "Before/After",
  "Tutorial singkat",
  "Voice-over cerita",
  "Carousel foto (IG)",
  "Reveal",
];

const hookTypes = [
  "Hasil di depan",
  "Hari ke-N",
  "Pertanyaan",
  "Kesalahan atau gagal",
  "Transformasi",
  "Tantangan",
];

const checklistItems = [
  "Hook di 3 detik pertama",
  "Subtitle",
  "Cover",
  "CTA",
  "Caption",
  "Hashtag",
  "Audio",
];

async function main() {
  for (const [order, p] of pillars.entries()) {
    await prisma.pillar.upsert({
      where: { name: p.name },
      update: {},
      create: { ...p, order },
    });
  }

  for (const [order, name] of formats.entries()) {
    await prisma.format.upsert({ where: { name }, update: {}, create: { name, order } });
  }

  for (const [order, name] of hookTypes.entries()) {
    await prisma.hookType.upsert({ where: { name }, update: {}, create: { name, order } });
  }

  for (const [order, label] of checklistItems.entries()) {
    await prisma.checklistTemplateItem.upsert({
      where: { label },
      update: {},
      create: { label, order },
    });
  }

  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      weeklyPostTarget: 3,
      postingSlotsJson: JSON.stringify(DEFAULT_POSTING_SLOTS),
      scoreWeightsJson: JSON.stringify(DEFAULT_SCORE_WEIGHTS),
    },
  });

  const counts = await Promise.all([
    prisma.pillar.count(),
    prisma.format.count(),
    prisma.hookType.count(),
    prisma.checklistTemplateItem.count(),
  ]);
  console.log(
    `Seed selesai: ${counts[0]} pilar, ${counts[1]} format, ${counts[2]} tipe hook, ${counts[3]} item checklist.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
