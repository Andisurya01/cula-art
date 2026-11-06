import "server-only";
import { db } from "@/lib/db";
import { rangeStart } from "@/lib/analytics/kpi";
import { pendingMetrics } from "@/lib/analytics/snapshots";
import { weeklyStreak } from "@/lib/analytics/streak";
import { followerSnapshotReminders, taskWindow, todayTasks } from "@/lib/analytics/tasks";
import { endOfWibWeek, isStale, startOfWibWeek, STALE_AFTER_DAYS } from "@/lib/date";
import { CONTENT_STAGES } from "@/lib/labels";
import {
  getFollowerSnapshots,
  getLatestFollowerSnapshots,
  getScoredPosts,
} from "@/features/metrics/queries";
import { getSettings } from "@/features/settings/queries";
import {
  followerCards,
  followerDomain,
  FOLLOWER_RANGE_DAYS,
  groupWeekItems,
  weekProgress,
} from "./derive";

/** Baris metrik tertunda yang tampil di Beranda; sisanya lewat tautan ke Postingan. */
export const PENDING_METRICS_LIMIT = 8;

/** Post belum tayang di dalam jendela tugas (D7), sudah berisi judul dan stage konten. */
async function getTaskPosts(now: Date) {
  const { from, to } = taskWindow(now);
  const rows = await db.post.findMany({
    where: { postedAt: null, scheduledAt: { gte: from, lt: to } },
    select: {
      contentId: true,
      platform: true,
      scheduledAt: true,
      postedAt: true,
      content: { select: { title: true, stage: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { platform: "asc" }],
  });
  return rows.map(({ content, ...post }) => ({ ...post, title: content.title, stage: content.stage }));
}

/**
 * Semua data Beranda untuk satu `now`. Tidak ada query per baris: semua dimuat sekali lalu dihitung
 * oleh fungsi murni, supaya halaman tetap < 1 detik dengan 1.000 post.
 */
export async function getHomeOverview(now: Date = new Date()) {
  const weekStart = startOfWibWeek(now);
  const weekEnd = endOfWibWeek(now);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_DAYS * 86_400_000);

  const [
    { weeklyPostTarget: target },
    weekPosts,
    stageGroups,
    staleContents,
    newIdeaCount,
    taskPosts,
    scoredPosts,
    followerRows,
    latestFollowers,
  ] = await Promise.all([
    getSettings(),
    db.post.findMany({
      where: {
        OR: [
          { postedAt: { gte: weekStart, lt: weekEnd } },
          { postedAt: null, scheduledAt: { gte: weekStart, lt: weekEnd } },
        ],
      },
      select: {
        platform: true,
        scheduledAt: true,
        postedAt: true,
        content: {
          select: { id: true, title: true, pillar: { select: { name: true, color: true } } },
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { platform: "asc" }],
    }),
    db.content.groupBy({ by: ["stage"], _count: { _all: true } }),
    db.content.findMany({
      where: { stage: { not: "POSTED" }, stageChangedAt: { lt: staleBefore } },
      select: {
        id: true,
        title: true,
        stage: true,
        stageChangedAt: true,
        pillar: { select: { name: true, color: true } },
      },
      orderBy: { stageChangedAt: "asc" },
      take: 10,
    }),
    db.idea.count({ where: { status: "NEW" } }),
    getTaskPosts(now),
    getScoredPosts(now),
    getFollowerSnapshots({ from: rangeStart(now, FOLLOWER_RANGE_DAYS) }),
    getLatestFollowerSnapshots(),
  ]);

  const weekItems = groupWeekItems(weekPosts);

  const stageCounts = Object.fromEntries(CONTENT_STAGES.map((s) => [s, 0])) as Record<
    (typeof CONTENT_STAGES)[number],
    number
  >;
  for (const group of stageGroups) stageCounts[group.stage] = group._count._all;

  const pending = pendingMetrics(scoredPosts, now);

  return {
    weekStart,
    target,
    weekItems,
    progress: weekProgress(weekItems, target),
    streak: weeklyStreak(scoredPosts, target, now),
    tasks: todayTasks(taskPosts, now),
    pendingMetrics: pending.slice(0, PENDING_METRICS_LIMIT),
    pendingTotal: pending.length,
    followerCards: followerCards(followerRows),
    followerDomain: followerDomain(now),
    followerReminders: followerSnapshotReminders(latestFollowers, now),
    latestFollowers,
    stageCounts,
    staleContents: staleContents.filter((c) => isStale(c.stageChangedAt, now)),
    newIdeaCount,
  };
}
export type HomeOverview = Awaited<ReturnType<typeof getHomeOverview>>;
