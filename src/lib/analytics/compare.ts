// Fungsi murni: TikTok vs Instagram untuk konten yang sama.
// Tidak boleh import Prisma, React, atau Next.
// Sengaja tanpa total gabungan: tiap sisi hanya berisi angka platformnya sendiri.

import type { AnalyticsPlatform } from "./metrics";

export type ComparablePost = {
  id: string;
  contentId: string;
  title: string;
  platform: AnalyticsPlatform;
  postedAt: Date;
  /** Views (TikTok) atau reach (Instagram) dari snapshot yang dipakai; `null` = belum ada snapshot. */
  views: number | null;
  er: number | null;
  score: number | null;
  relativeScore: number | null;
};

export type PlatformComparison = {
  contentId: string;
  title: string;
  tiktok: ComparablePost;
  instagram: ComparablePost;
};

/**
 * Konten yang tayang di kedua platform dan sudah punya snapshot di keduanya, terbaru lebih dulu.
 * Masuk rentang jika salah satu versinya tayang dalam rentang (`inRange`).
 */
export function comparePlatforms(
  posts: readonly ComparablePost[],
  inRange: (post: ComparablePost) => boolean,
): PlatformComparison[] {
  const byContent = new Map<string, Partial<Record<AnalyticsPlatform, ComparablePost>>>();
  for (const post of posts) {
    const versions = byContent.get(post.contentId) ?? {};
    versions[post.platform] = post;
    byContent.set(post.contentId, versions);
  }

  const rows: PlatformComparison[] = [];
  for (const [contentId, { TIKTOK: tiktok, INSTAGRAM: instagram }] of byContent) {
    if (!tiktok || !instagram) continue;
    if (tiktok.score === null || instagram.score === null) continue;
    if (!inRange(tiktok) && !inRange(instagram)) continue;
    rows.push({ contentId, title: tiktok.title, tiktok, instagram });
  }

  const latest = (row: PlatformComparison) => Math.max(row.tiktok.postedAt.getTime(), row.instagram.postedAt.getTime());
  return rows.sort((a, b) => latest(b) - latest(a) || a.contentId.localeCompare(b.contentId));
}
