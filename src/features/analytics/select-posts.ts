// Fungsi murni: menyaring post untuk Analitik menurut platform, rentang, dan medium.
// Skor relatif sudah dihitung dari riwayat penuh (D4), jadi di sini hanya menyaring, tidak menghitung ulang.

import type { Medium, Platform } from "@prisma/client";
import { comparePlatforms, type ComparablePost } from "@/lib/analytics/compare";
import type { GroupingPost } from "@/lib/analytics/grouping";
import type { MetricKind } from "@/lib/analytics/snapshots";

/** Batas rentang: `from` dari `rangeStart` (inklusif), tanpa batas atas selain `now`. */
export type RangeWindow = { from: Date; now: Date };

/** Bagian `ScoredPost` yang dipakai penyaringan. */
export type SelectablePost = {
  id: string;
  contentId: string;
  title: string;
  platform: Platform;
  postedAt: Date;
  medium: Medium | null;
  best: { kind: MetricKind; views: number } | null;
  er: number | null;
  score: number | null;
  relativeScore: number | null;
};

export function isInRange(post: { postedAt: Date }, { from, now }: RangeWindow): boolean {
  const time = post.postedAt.getTime();
  return time >= from.getTime() && time <= now.getTime();
}

/** D6: konten tanpa medium hanya muncul saat Semua medium. */
export function matchesMedium(post: { medium: Medium | null }, medium: Medium | null): boolean {
  return medium === null || post.medium === medium;
}

/** Post satu platform dalam rentang dan medium: dasar KPI, median, dan top/bottom. */
export function selectPlatformPosts<T extends Pick<SelectablePost, "platform" | "postedAt" | "medium">>(
  posts: readonly T[],
  filters: { platform: Platform; medium: Medium | null },
  window: RangeWindow,
): T[] {
  return posts.filter(
    (post) => post.platform === filters.platform && matchesMedium(post, filters.medium) && isInRange(post, window),
  );
}

/** Masukan `groupScores`: hanya post yang sudah punya skor. Skor 0 (`views = 0`) tetap ikut. */
export function toGroupingPosts<T extends Omit<GroupingPost, "score"> & { score: number | null }>(
  posts: readonly T[],
): GroupingPost[] {
  return posts.flatMap((post) => (post.score === null ? [] : [{ ...post, score: post.score }]));
}

/** Satu sisi perbandingan: hanya angka platformnya sendiri. */
export type ComparisonSide = {
  postId: string;
  /** Views (TikTok) atau reach (Instagram). */
  views: number | null;
  er: number | null;
  relativeScore: number | null;
  /** Snapshot yang dipakai, untuk penanda H+1 (D5). */
  kind: MetricKind | null;
};

export type ComparisonRow = {
  contentId: string;
  title: string;
  tiktok: ComparisonSide;
  instagram: ComparisonSide;
};

/**
 * TikTok vs Instagram untuk konten yang sama, tetap memakai filter rentang dan medium.
 * Medium milik konten, jadi kedua versi selalu sama-sama lolos atau sama-sama tidak.
 * Sengaja tanpa total, rata-rata gabungan, atau selisih antar-platform.
 */
export function selectComparison(
  posts: readonly SelectablePost[],
  medium: Medium | null,
  window: RangeWindow,
): ComparisonRow[] {
  const kinds = new Map<string, MetricKind | null>();
  const comparable: ComparablePost[] = [];
  for (const post of posts) {
    if (!matchesMedium(post, medium)) continue;
    kinds.set(post.id, post.best?.kind ?? null);
    comparable.push({
      id: post.id,
      contentId: post.contentId,
      title: post.title,
      platform: post.platform,
      postedAt: post.postedAt,
      views: post.best?.views ?? null,
      er: post.er,
      score: post.score,
      relativeScore: post.relativeScore,
    });
  }

  const toSide = (post: ComparablePost): ComparisonSide => ({
    postId: post.id,
    views: post.views,
    er: post.er,
    relativeScore: post.relativeScore,
    kind: kinds.get(post.id) ?? null,
  });

  return comparePlatforms(comparable, (post) => isInRange(post, window)).map((row) => ({
    contentId: row.contentId,
    title: row.title,
    tiktok: toSide(row.tiktok),
    instagram: toSide(row.instagram),
  }));
}
