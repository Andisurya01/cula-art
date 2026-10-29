import "server-only";
import { db } from "@/lib/db";
import { endOfWibWeek, isStale, startOfWibWeek, STALE_AFTER_DAYS } from "@/lib/date";
import { CONTENT_STAGES } from "@/lib/labels";
import { getSettings } from "@/features/settings/queries";

/**
 * Data Beranda Fase 1. "Post minggu ini" dihitung per konten (bukan per platform):
 * satu konten yang tayang di TikTok dan Instagram tetap dihitung satu post terhadap target.
 */
export async function getHomeOverview(now: Date = new Date()) {
  const weekStart = startOfWibWeek(now);
  const weekEnd = endOfWibWeek(now);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_DAYS * 86_400_000);

  const [settings, weekPosts, stageGroups, staleContents, newIdeaCount] = await Promise.all([
    getSettings(),
    db.post.findMany({
      where: {
        OR: [
          { postedAt: { gte: weekStart, lt: weekEnd } },
          { postedAt: null, scheduledAt: { gte: weekStart, lt: weekEnd } },
        ],
      },
      select: {
        id: true,
        platform: true,
        scheduledAt: true,
        postedAt: true,
        content: {
          select: { id: true, title: true, pillar: { select: { name: true, color: true } } },
        },
      },
      orderBy: [{ scheduledAt: "asc" }],
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
  ]);

  const byContent = new Map<
    string,
    {
      contentId: string;
      title: string;
      pillar: { name: string; color: string };
      at: Date;
      posted: boolean;
      platforms: (typeof weekPosts)[number]["platform"][];
    }
  >();
  for (const post of weekPosts) {
    const at = post.postedAt ?? post.scheduledAt;
    if (!at) continue;
    const existing = byContent.get(post.content.id);
    if (existing) {
      existing.platforms.push(post.platform);
      existing.posted ||= post.postedAt !== null;
      if (at < existing.at) existing.at = at;
    } else {
      byContent.set(post.content.id, {
        contentId: post.content.id,
        title: post.content.title,
        pillar: post.content.pillar,
        at,
        posted: post.postedAt !== null,
        platforms: [post.platform],
      });
    }
  }
  const weekItems = [...byContent.values()].sort((a, b) => a.at.getTime() - b.at.getTime());

  const stageCounts = Object.fromEntries(CONTENT_STAGES.map((s) => [s, 0])) as Record<
    (typeof CONTENT_STAGES)[number],
    number
  >;
  for (const group of stageGroups) stageCounts[group.stage] = group._count._all;

  return {
    weekStart,
    target: settings.weeklyPostTarget,
    weekItems,
    postedThisWeek: weekItems.filter((i) => i.posted).length,
    stageCounts,
    staleContents: staleContents.filter((c) => isStale(c.stageChangedAt, now)),
    newIdeaCount,
  };
}
