import "server-only";
import { cache } from "react";
import type { Medium, Platform, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PLATFORMS } from "@/lib/labels";
import {
  engagementRate,
  followRate,
  saveRate,
  shareRate,
} from "@/lib/analytics/metrics";
import { scorePosts } from "@/lib/analytics/scoring";
import { metricStatus, pickBestSnapshot } from "@/lib/analytics/snapshots";
import { getSettings } from "@/features/settings/queries";

const snapshotSelect = {
  id: true,
  kind: true,
  source: true,
  recordedAt: true,
  views: true,
  likes: true,
  comments: true,
  shares: true,
  saves: true,
  follows: true,
  avgWatchSec: true,
  completionRate: true,
} as const;

const scoredPostSelect = {
  id: true,
  contentId: true,
  platform: true,
  postType: true,
  postedAt: true,
  url: true,
  snapshots: { select: snapshotSelect, where: { kind: { in: ["H1", "H7"] } } },
  content: {
    select: {
      title: true,
      pillar: { select: { id: true, name: true, color: true } },
      format: { select: { id: true, name: true } },
      hookType: { select: { id: true, name: true } },
      project: { select: { medium: true } },
      idea: { select: { medium: true } },
    },
  },
} satisfies Prisma.PostSelect;

/**
 * Semua post tayang + status metrik + angka terhitung + skor, urut terbaru dulu.
 * Skor relatif butuh riwayat penuh per platform (D4), jadi selalu dihitung dari semua post,
 * lalu halaman menyaring hasilnya. Satu kali per request lewat `cache`.
 *
 * Angka di sini per post dan per platform. Jangan menjumlahkan lintas platform.
 */
export const getScoredPosts = cache(async (now: Date = new Date()) => {
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.post.findMany({
      where: { postedAt: { not: null } },
      select: scoredPostSelect,
      orderBy: [{ postedAt: "desc" }, { id: "asc" }],
    }),
  ]);

  const posts = rows.map((row) => {
    const postedAt = row.postedAt as Date; // difilter `not: null` di query
    const best = pickBestSnapshot(row.snapshots);
    return { row, postedAt, best };
  });
  const scores = scorePosts(
    posts.map(({ row, postedAt, best }) => ({
      id: row.id,
      platform: row.platform,
      postedAt,
      metrics: best,
    })),
    settings.scoreWeights,
  );

  return posts.map(({ row, postedAt, best }) => {
    const { content } = row;
    const score = scores.get(row.id);
    return {
      id: row.id,
      contentId: row.contentId,
      title: content.title,
      platform: row.platform,
      postType: row.postType,
      postedAt,
      url: row.url,
      pillar: content.pillar,
      format: content.format,
      hookType: content.hookType,
      /** D6: `Content` tidak punya kolom medium. Pakai proyek, lalu ide; tanpa keduanya `null`. */
      medium: (content.project?.medium ?? content.idea?.medium ?? null) as Medium | null,
      snapshots: row.snapshots,
      /** Snapshot yang dipakai untuk angka: H+7, cadangan H+1 (D5). */
      best,
      status: metricStatus(postedAt, row.snapshots, now),
      er: best ? engagementRate(best) : null,
      saveRate: best ? saveRate(best) : null,
      shareRate: best ? shareRate(best) : null,
      followRate: best ? followRate(best) : null,
      score: score?.score ?? null,
      relativeScore: score?.relativeScore ?? null,
      baselineMedian: score?.baselineMedian ?? null,
      baselineCount: score?.baselineCount ?? 0,
    };
  });
});
export type ScoredPost = Awaited<ReturnType<typeof getScoredPosts>>[number];
export type MetricSnapshotRow = ScoredPost["snapshots"][number];

/** Satu post tayang untuk halaman detail, atau `null` jika tidak ada atau belum tayang. */
export const getScoredPost = cache(async (id: string) => {
  const posts = await getScoredPosts();
  return posts.find((post) => post.id === id) ?? null;
});

/** Snapshot followers, opsional mulai tanggal tertentu, urut tanggal lama → baru. */
export async function getFollowerSnapshots(options: { from?: Date; platform?: Platform } = {}) {
  return db.accountSnapshot.findMany({
    where: {
      ...(options.from ? { date: { gte: options.from } } : {}),
      ...(options.platform ? { platform: options.platform } : {}),
    },
    select: { id: true, platform: true, date: true, followers: true, source: true },
    orderBy: [{ date: "asc" }, { platform: "asc" }],
  });
}
export type FollowerSnapshotRow = Awaited<ReturnType<typeof getFollowerSnapshots>>[number];

/** Snapshot followers terakhir per platform (dasar pengingat D8 dan isi awal dialog). */
export const getLatestFollowerSnapshots = cache(async () => {
  return Promise.all(
    PLATFORMS.map(async (platform) => {
      const latest = await db.accountSnapshot.findFirst({
        where: { platform },
        orderBy: { date: "desc" },
        select: { date: true, followers: true },
      });
      return { platform, date: latest?.date ?? null, followers: latest?.followers ?? null };
    }),
  );
});
export type LatestFollowerSnapshot = Awaited<ReturnType<typeof getLatestFollowerSnapshots>>[number];
