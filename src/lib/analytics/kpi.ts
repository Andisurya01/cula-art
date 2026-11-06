// Fungsi murni: KPI Analitik untuk SATU platform dalam satu rentang.
// Tidak boleh import Prisma, React, atau Next.

import { addWibDays, startOfWibDay } from "@/lib/date";
import type { AnalyticsPlatform } from "./metrics";

export type KpiPost = {
  platform: AnalyticsPlatform;
  /** Engagement rate dari snapshot yang dipakai; `null` = belum ada snapshot. */
  er: number | null;
};

export type FollowerPoint = {
  platform: AnalyticsPlatform;
  /** Tanggal WIB (00.00 WIB). */
  date: Date;
  followers: number;
};

export type Kpi = {
  totalPosts: number;
  /** Post yang punya snapshot, dasar rata-rata ER. */
  measuredPosts: number;
  /** Rata-rata ER per post dalam persen; `null` = belum ada snapshot. */
  averageEr: number | null;
  /** Snapshot terakhir dikurangi snapshot pertama (D10); `null` = kurang dari 2 snapshot. */
  followersGained: number | null;
  /** Followers pada snapshot terakhir dalam rentang; `null` = belum ada snapshot. */
  latestFollowers: number | null;
  postsPerWeek: number;
};

/**
 * Batas bawah rentang "N hari terakhir" (inklusif): 00.00 WIB, hari ini dihitung sebagai hari ke-N.
 * Rentang tidak punya batas atas selain `now`.
 */
export function rangeStart(now: Date, days: number): Date {
  return addWibDays(startOfWibDay(now), -(days - 1));
}

/** Titik followers satu platform, urut tanggal. */
export function followerSeries(
  points: readonly FollowerPoint[],
  platform: AnalyticsPlatform,
): FollowerPoint[] {
  return points
    .filter((p) => p.platform === platform)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** D10: snapshot terakhir dikurangi snapshot pertama, per platform. Kurang dari 2 → `null`. */
export function followersGained(points: readonly FollowerPoint[], platform: AnalyticsPlatform): number | null {
  const series = followerSeries(points, platform);
  if (series.length < 2) return null;
  return series[series.length - 1].followers - series[0].followers;
}

/**
 * KPI satu platform. `posts` dan `followers` sudah dibatasi rentang oleh pemanggil, tetapi platform
 * lain tetap disaring di sini supaya angka TikTok dan Instagram tidak pernah tercampur.
 */
export function computeKpi(input: {
  platform: AnalyticsPlatform;
  days: number;
  posts: readonly KpiPost[];
  followers: readonly FollowerPoint[];
}): Kpi {
  const { platform, days } = input;
  const posts = input.posts.filter((p) => p.platform === platform);
  const rates = posts.flatMap((p) => (p.er === null ? [] : [p.er]));
  const series = followerSeries(input.followers, platform);

  return {
    totalPosts: posts.length,
    measuredPosts: rates.length,
    averageEr: rates.length > 0 ? rates.reduce((sum, er) => sum + er, 0) / rates.length : null,
    followersGained: followersGained(input.followers, platform),
    latestFollowers: series.length > 0 ? series[series.length - 1].followers : null,
    postsPerWeek: days > 0 ? posts.length / (days / 7) : 0,
  };
}
