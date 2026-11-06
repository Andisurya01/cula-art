// Data contoh metrik untuk uji browser dan uji performa (bukan untuk produksi).
//
//   npx tsx scripts/demo-metrics.ts                 buat ulang 80 post contoh
//   npx tsx scripts/demo-metrics.ts --jumlah 1000   buat ulang dengan jumlah post tertentu
//   npx tsx scripts/demo-metrics.ts --hapus         hapus semua data contoh
//
// Hanya menyentuh data berlabel: konten, ide, dan proyek berjudul "[Demo] …" (post dan snapshot ikut
// terhapus lewat cascade), serta snapshot followers ber-id "demo_" (tabelnya tidak punya kolom teks).
// Snapshot followers asli pada tanggal yang sama tidak ditimpa. Butuh pilar, format, dan tipe hook dari seed.
//
// Isinya sengaja memuat kasus uji: semua status metrik, post views = 0, post dekat tengah malam WIB,
// grup < 3 post, post tanpa pembanding, dan tugas hari ini (lewat jadwal, hari ini, belum siap).

import { PrismaClient, type ContentStage, type Medium, type Platform, type PostType, type SnapshotKind } from "@prisma/client";
import { addWibDays, startOfWibDay, toWibDateString, wibToUtc } from "../src/lib/date";

try {
  process.loadEnvFile(".env");
} catch {
  // Tanpa .env: pakai variabel lingkungan yang sudah ada.
}

const LABEL = "[Demo]";
const FOLLOWER_ID_PREFIX = "demo_";
const REMOVE = process.argv.includes("--hapus");

function readCount(): number {
  const index = process.argv.indexOf("--jumlah");
  if (index === -1) return 80;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error("--jumlah harus bilangan bulat positif, mis. --jumlah 1000");
    process.exit(1);
  }
  return value;
}

if (process.env.NODE_ENV === "production" && !process.argv.includes("--paksa")) {
  console.error("NODE_ENV=production: data contoh tidak dibuat. Tambahkan --paksa jika memang sengaja.");
  process.exit(1);
}

const prisma = new PrismaClient();

/** PRNG kecil (mulberry32) supaya data contoh selalu sama. */
function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function removeDemo() {
  const contents = await prisma.content.deleteMany({ where: { title: { startsWith: LABEL } } });
  const ideas = await prisma.idea.deleteMany({ where: { title: { startsWith: LABEL } } });
  const projects = await prisma.project.deleteMany({ where: { title: { startsWith: LABEL } } });
  const followers = await prisma.accountSnapshot.deleteMany({ where: { id: { startsWith: FOLLOWER_ID_PREFIX } } });
  return { contents: contents.count, ideas: ideas.count, projects: projects.count, followers: followers.count };
}

const BASE_VIEWS: Record<Platform, number> = { TIKTOK: 6000, INSTAGRAM: 1800 };
const POST_TYPE: Record<Platform, PostType> = { TIKTOK: "VIDEO", INSTAGRAM: "REEL" };
/** Pilar pertama biasanya unggul, supaya grafik median terlihat berbeda. */
const PILLAR_EFFECT = [1.5, 1.2, 1, 0.8, 0.6];

/** Waktu posting: mundur dari hari ini; beberapa kasus khusus untuk status metrik dan zona waktu. */
function postedAtFor(index: number, now: Date, rnd: () => number): Date {
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
  if (index === 0) return hoursAgo(3); // Menunggu H+1
  if (index === 1) return hoursAgo(30); // Perlu H+1
  if (index === 2) return hoursAgo(72); // Menunggu H+7 (punya H+1)
  if (index === 3) return hoursAgo(8 * 24); // Perlu H+7 (punya H+1)
  if (index === 4) return hoursAgo(9 * 24); // Perlu H+7 (tanpa snapshot)

  const date = addWibDays(startOfWibDay(now), -(10 + Math.round((index - 5) * (7 / 3))));
  const day = toWibDateString(date);
  if (index % 9 === 0) return wibToUtc(day, "23:50"); // dekat tengah malam
  if (index % 11 === 0) return wibToUtc(day, "00:10"); // dekat tengah malam
  if (index === 12 || index === 25) return wibToUtc(day, "07:00"); // jam dengan < 3 post
  const roll = rnd();
  if (roll < 0.6) return wibToUtc(day, "19:00");
  if (roll < 0.8) return wibToUtc(day, "21:00");
  return wibToUtc(day, "12:00");
}

function snapshotKinds(index: number): SnapshotKind[] {
  if (index === 0 || index === 1 || index === 4) return [];
  if (index === 2 || index === 3) return ["H1"];
  if (index % 10 === 7) return ["H1"]; // sebagian post lama hanya punya H+1 (angka berpenanda)
  return ["H1", "H7"];
}

function metricsFor(platform: Platform, pillarIndex: number, kind: SnapshotKind, rnd: () => number) {
  const growth = kind === "H1" ? 0.65 : 1;
  const views = Math.round(BASE_VIEWS[platform] * growth * (0.3 + rnd() * 2.4));
  const effect = PILLAR_EFFECT[pillarIndex] ?? 1;
  const rate = (base: number) => Math.round(views * base * effect * (0.5 + rnd()));
  return {
    views,
    likes: rate(0.06),
    comments: rate(0.006),
    shares: rate(0.004),
    saves: rate(0.008),
    follows: rate(0.0015),
    avgWatchSec: Math.round((4 + rnd() * 14) * 10) / 10,
    completionRate: Math.round((15 + rnd() * 50) * 10) / 10,
  };
}

async function createDemo(postCount: number) {
  const [pillars, formats, hookTypes] = await Promise.all([
    prisma.pillar.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true } }),
    prisma.format.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true } }),
    prisma.hookType.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true } }),
  ]);
  if (pillars.length === 0 || formats.length === 0 || hookTypes.length === 0) {
    throw new Error("Pilar, format, atau tipe hook belum ada. Jalankan `npx prisma db seed` dulu.");
  }

  const now = new Date();
  const rnd = random(20261105);
  const projects: { id: string; title: string; medium: Medium }[] = [
    { id: "demo_project_clay", title: `${LABEL} Patung kepala naga`, medium: "CLAY" },
    { id: "demo_project_gambar", title: `${LABEL} 30 hari gambar tangan`, medium: "DRAWING" },
  ];
  await prisma.project.createMany({ data: projects.map((p) => ({ ...p, stage: "IN_PROGRESS" as const })) });

  const ideas: { id: string; title: string; medium: Medium | null; status: "PICKED" }[] = [];
  const contents: {
    id: string;
    title: string;
    pillarId: string;
    formatId: string;
    hookTypeId: string;
    projectId: string | null;
    ideaId: string | null;
    stage: ContentStage;
    stageChangedAt: Date;
  }[] = [];
  const posts: {
    id: string;
    contentId: string;
    platform: Platform;
    postType: PostType;
    scheduledAt: Date | null;
    postedAt: Date | null;
    url: string | null;
  }[] = [];
  const snapshots: {
    id: string;
    postId: string;
    kind: SnapshotKind;
    recordedAt: Date;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    follows: number;
    avgWatchSec: number;
    completionRate: number;
  }[] = [];

  // Grup < 3 post: pilar, format, dan tipe hook terakhir hanya dipakai dua konten.
  const pick = (count: number, index: number) => {
    if (count === 1) return 0;
    if (index === 8 || index === 21) return count - 1;
    return index % (count - 1);
  };

  let created = 0;
  for (let i = 0; created < postCount; i++) {
    const id = `demo_content_${i}`;
    const pillarIndex = pick(pillars.length, i);
    const postedAt = postedAtFor(i, now, rnd);

    // Medium dari proyek (D6), lalu ide, dan sebagian tanpa keduanya.
    let projectId: string | null = null;
    let ideaId: string | null = null;
    if (i % 4 === 0) projectId = projects[0].id;
    else if (i % 4 === 1) projectId = projects[1].id;
    else if (i % 4 === 2) {
      ideaId = `demo_idea_${i}`;
      ideas.push({ id: ideaId, title: `${LABEL} Ide ${i}`, medium: "MIXED", status: "PICKED" });
    }

    contents.push({
      id,
      title: `${LABEL} Konten ${i + 1}`,
      pillarId: pillars[pillarIndex].id,
      formatId: formats[pick(formats.length, i)].id,
      hookTypeId: hookTypes[pick(hookTypes.length, i)].id,
      projectId,
      ideaId,
      stage: "POSTED",
      stageChangedAt: postedAt,
    });

    // Dua dari tiga konten tayang di kedua platform; sisanya hanya satu platform.
    const platforms: Platform[] = i % 3 === 0 ? (i % 6 === 0 ? ["TIKTOK"] : ["INSTAGRAM"]) : ["TIKTOK", "INSTAGRAM"];
    for (const platform of platforms) {
      if (created >= postCount) break;
      const postId = `demo_post_${i}_${platform}`;
      const at = platform === "TIKTOK" ? postedAt : new Date(postedAt.getTime() + 20 * 60_000);
      // Selisih 20 menit jangan sampai melewati `now`.
      const safeAt = at.getTime() > now.getTime() ? postedAt : at;
      posts.push({
        id: postId,
        contentId: id,
        platform,
        postType: POST_TYPE[platform],
        scheduledAt: safeAt,
        postedAt: safeAt,
        url: `https://example.com/demo/${platform.toLowerCase()}/${i}`,
      });
      created += 1;

      for (const kind of snapshotKinds(i)) {
        const metrics =
          i === 6 // kasus views = 0
            ? { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, follows: 0, avgWatchSec: 0, completionRate: 0 }
            : metricsFor(platform, pillarIndex, kind, rnd);
        snapshots.push({
          id: `demo_snapshot_${i}_${platform}_${kind}`,
          postId,
          kind,
          recordedAt: new Date(safeAt.getTime() + (kind === "H1" ? 1 : 7) * 86_400_000),
          ...metrics,
        });
      }
    }
  }

  // Tugas hari ini (D7): lewat jadwal, nanti hari ini, dan segera tetapi belum siap.
  const today = toWibDateString(now);
  const later = new Date(Math.min(now.getTime() + 2 * 3_600_000, wibToUtc(today, "23:59").getTime()));
  const scheduled: { key: string; title: string; stage: ContentStage; at: Date; platforms: Platform[] }[] = [
    { key: "lewat", title: "Lewat jadwal", stage: "READY", at: addWibDays(now, -2), platforms: ["TIKTOK", "INSTAGRAM"] },
    { key: "hari_ini", title: "Tayang nanti hari ini", stage: "READY", at: later, platforms: ["TIKTOK"] },
    { key: "belum_siap", title: "Dua hari lagi, belum siap", stage: "EDITING", at: addWibDays(now, 2), platforms: ["INSTAGRAM"] },
  ];
  for (const item of scheduled) {
    const id = `demo_content_${item.key}`;
    contents.push({
      id,
      title: `${LABEL} ${item.title}`,
      pillarId: pillars[0].id,
      formatId: formats[0].id,
      hookTypeId: hookTypes[0].id,
      projectId: null,
      ideaId: null,
      stage: item.stage,
      stageChangedAt: now,
    });
    for (const platform of item.platforms) {
      posts.push({
        id: `demo_post_${item.key}_${platform}`,
        contentId: id,
        platform,
        postType: POST_TYPE[platform],
        scheduledAt: item.at,
        postedAt: null,
        url: null,
      });
    }
  }

  await prisma.idea.createMany({ data: ideas });
  await prisma.content.createMany({ data: contents });
  await prisma.post.createMany({ data: posts });
  await prisma.metricSnapshot.createMany({ data: snapshots });

  // Snapshot followers: 14 minggu ke belakang; yang terakhir sudah 8 hari untuk Instagram (pengingat D8).
  const followers: { id: string; platform: Platform; date: Date; followers: number }[] = [];
  for (let week = 0; week < 14; week++) {
    const tiktokDate = startOfWibDay(addWibDays(now, -week * 7));
    const instagramDate = startOfWibDay(addWibDays(now, -8 - week * 7));
    followers.push({
      id: `${FOLLOWER_ID_PREFIX}tiktok_${week}`,
      platform: "TIKTOK",
      date: tiktokDate,
      followers: 12000 - week * 310 + Math.round(rnd() * 120),
    });
    followers.push({
      id: `${FOLLOWER_ID_PREFIX}instagram_${week}`,
      platform: "INSTAGRAM",
      date: instagramDate,
      followers: 3400 - week * 95 + Math.round(rnd() * 40),
    });
  }
  const insertedFollowers = await prisma.accountSnapshot.createMany({ data: followers, skipDuplicates: true });

  return {
    contents: contents.length,
    posts: posts.length,
    snapshots: snapshots.length,
    followers: insertedFollowers.count,
  };
}

async function main() {
  const removed = await removeDemo();
  if (REMOVE) {
    console.log(
      `Data contoh dihapus: ${removed.contents} konten, ${removed.ideas} ide, ${removed.projects} proyek, ${removed.followers} snapshot followers.`,
    );
    return;
  }
  const created = await createDemo(readCount());
  console.log(
    `Data contoh dibuat: ${created.contents} konten, ${created.posts} post, ${created.snapshots} snapshot metrik, ${created.followers} snapshot followers.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
