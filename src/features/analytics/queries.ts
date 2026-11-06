import "server-only";
import { groupScores } from "@/lib/analytics/grouping";
import { computeKpi, rangeStart } from "@/lib/analytics/kpi";
import { topAndBottomPosts } from "@/lib/analytics/scoring";
import { startOfWibDay } from "@/lib/date";
import {
  getFollowerSnapshots,
  getLatestFollowerSnapshots,
  getScoredPosts,
} from "@/features/metrics/queries";
import { getSettings } from "@/features/settings/queries";
import type { AnalyticsFilters } from "./schema";
import { selectComparison, selectPlatformPosts, toGroupingPosts } from "./select-posts";
import { platformTarget } from "./targets";

/**
 * Data halaman Analitik untuk SATU platform (D1). Skor relatif sudah dihitung dari riwayat penuh di
 * `getScoredPosts` (D4), jadi hasilnya hanya disaring, tidak dihitung ulang.
 * `comparison` satu-satunya bagian berisi dua platform, dan tidak pernah digabung.
 */
export async function getAnalyticsData(filters: AnalyticsFilters, now: Date) {
  const { platform, medium, days } = filters;
  const from = rangeStart(now, days);
  const window = { from, now };

  const [settings, allPosts, followers, latestFollowers] = await Promise.all([
    getSettings(),
    getScoredPosts(),
    getFollowerSnapshots({ from, platform }),
    getLatestFollowerSnapshots(),
  ]);

  const posts = selectPlatformPosts(allPosts, { platform, medium }, window);
  const scored = toGroupingPosts(posts);

  return {
    /** Sumbu waktu grafik followers: awal rentang sampai hari ini. */
    domain: [from.getTime(), startOfWibDay(now).getTime()] as const,
    kpi: computeKpi({ platform, days, posts, followers }),
    /** Followers tidak terpengaruh filter medium. */
    followers,
    latestFollowers,
    /** Snapshot terakhir, tidak terikat rentang: dasar "sekarang" di pembanding target. */
    currentFollowers: latestFollowers.find((item) => item.platform === platform)?.followers ?? null,
    target: platformTarget(settings.followerTarget, platform),
    scoredCount: scored.length,
    groups: groupScores(scored, platform),
    ranking: topAndBottomPosts(posts),
    comparison: selectComparison(allPosts, medium, window),
  };
}
export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;
