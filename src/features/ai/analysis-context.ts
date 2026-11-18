import "server-only";
import { db } from "@/lib/db";
import { DAY_LABELS, formatWib, formatWibWeekRange, toWibDateString, toWibTimeString, wibIsoDay, wibToUtc } from "@/lib/date";
import { durationBucket, groupScores, type GroupedScores, type GroupingPost, type GroupRow } from "@/lib/analytics/grouping";
import type { AnalyticsPlatform } from "@/lib/analytics/metrics";
import { isReviewableWeek, weeklySummary } from "@/lib/analytics/review";
import { PLATFORMS, PLATFORM_LABELS, VIEWS_LABELS } from "@/lib/labels";
import { getFollowerSnapshots, getScoredPosts, type ScoredPost } from "@/features/metrics/queries";
import { getSettings } from "@/features/settings/queries";
import { suggestionLine } from "@/features/suggestions/copy";
import { getSuggestionViews } from "@/features/suggestions/queries";
import { AiContextError } from "./context-error";
import type { GroupStat } from "./prompts/analysis-common";
import type { PostWhyContext, PostWhyInput } from "./prompts/post-why";
import type { ReviewDraftContext, ReviewDraftInput, ReviewPlatformContext } from "./prompts/review-draft";

// Pengambil data fitur AI analisis (allowlist). Semua angka dari src/lib/analytics (getScoredPosts,
// groupScores, weeklySummary, mesin aturan); AI tidak pernah diminta menghitung. Tidak pernah mengirim
// kontak, akun, sesi, URL post, atau id internal selain yang diperlukan.

function toGroupingPosts(posts: readonly ScoredPost[]): GroupingPost[] {
  return posts.flatMap((p) =>
    p.relativeScore === null
      ? []
      : [
          {
            platform: p.platform,
            postedAt: p.postedAt,
            score: p.relativeScore,
            pillar: { id: p.pillar.id, name: p.pillar.name },
            format: p.format,
            hookType: p.hookType,
            durationSec: p.durationSec,
          },
        ],
  );
}

function stat(dimension: string, row: GroupRow): GroupStat {
  return {
    dimension,
    label: row.label,
    postCount: row.postCount,
    median: row.enoughData ? row.medianScore : null,
    enoughData: row.enoughData,
  };
}

/** Grup yang memuat tag post ini; tanpa post lain bertag sama → 0 post, data belum cukup. */
function statFor(dimension: string, rows: readonly GroupRow[], key: string, label: string): GroupStat {
  const row = rows.find((r) => r.key === key);
  return row ? stat(dimension, row) : { dimension, label, postCount: 0, median: null, enoughData: false };
}

const wibHour = (date: Date) => Number(toWibTimeString(date).slice(0, 2));

export async function loadPostWhyContext(input: PostWhyInput): Promise<{ context: PostWhyContext; targetId: string }> {
  const posts = await getScoredPosts(new Date());
  const post = posts.find((p) => p.id === input.postId);
  if (!post) throw new AiContextError("Post tidak ditemukan atau belum tayang.");
  if (post.relativeScore === null || post.score === null || post.baselineMedian === null || !post.best) {
    throw new AiContextError("Post ini belum punya skor relatif, jadi belum bisa dijelaskan.");
  }
  const extra = await db.post.findUnique({
    where: { id: post.id },
    select: { content: { select: { hookText: true } } },
  });

  const others = posts.filter((p) => p.platform === post.platform && p.id !== post.id);
  const groups = groupScores(toGroupingPosts(others), post.platform);
  const day = wibIsoDay(post.postedAt);
  const hour = wibHour(post.postedAt);
  const duration = durationBucket(post.durationSec);
  const comparisons: GroupStat[] = [
    statFor("Pilar", groups.pillar, post.pillar.id, post.pillar.name),
    ...(post.format ? [statFor("Format", groups.format, post.format.id, post.format.name)] : []),
    ...(post.hookType ? [statFor("Tipe hook", groups.hookType, post.hookType.id, post.hookType.name)] : []),
    statFor("Hari", groups.day, String(day), DAY_LABELS[day]),
    statFor("Jam", groups.hour, String(hour), `${String(hour).padStart(2, "0")}.00`),
    ...(duration ? [statFor("Durasi", groups.duration, duration.key, duration.label)] : []),
  ];

  const { best } = post;
  return {
    targetId: post.id,
    context: {
      title: post.title,
      platform: PLATFORM_LABELS[post.platform],
      viewsLabel: VIEWS_LABELS[post.platform],
      postedAt: `${formatWib(post.postedAt, "EEEE, d MMM yyyy HH.mm")} WIB`,
      pillar: post.pillar.name,
      format: post.format?.name ?? null,
      hookType: post.hookType?.name ?? null,
      hookText: extra?.content.hookText?.trim() || null,
      durationSec: post.durationSec,
      snapshot: best.kind === "H7" ? "H+7" : "H+1",
      metrics: {
        views: best.views,
        likes: best.likes,
        comments: best.comments,
        shares: best.shares,
        saves: best.saves,
        follows: best.follows,
      },
      er: post.er ?? 0,
      saveRate: post.saveRate ?? 0,
      shareRate: post.shareRate ?? 0,
      followRate: post.followRate ?? 0,
      score: post.score,
      relativeScore: post.relativeScore,
      baselineMedian: post.baselineMedian,
      baselineCount: post.baselineCount,
      comparisons,
      comparablePostCount: others.filter((p) => p.relativeScore !== null).length,
    },
  };
}


const REVIEW_DIMENSIONS: { key: keyof GroupedScores; label: string }[] = [
  { key: "pillar", label: "Pilar" },
  { key: "format", label: "Format" },
  { key: "hookType", label: "Tipe hook" },
  { key: "hour", label: "Jam" },
];

export async function loadReviewDraftContext(
  input: ReviewDraftInput,
): Promise<{ context: ReviewDraftContext; targetId: string }> {
  const now = new Date();
  const weekStart = wibToUtc(input.weekStart);
  if (!isReviewableWeek(weekStart, now)) {
    throw new AiContextError("Minggu ini belum bisa di-review. Pilih minggu yang sudah berjalan.");
  }
  const [settings, posts, followers, suggestions] = await Promise.all([
    getSettings(),
    getScoredPosts(now),
    getFollowerSnapshots(),
    getSuggestionViews(now),
  ]);
  const summary = weeklySummary({ weekStart, target: settings.weeklyPostTarget, posts, followers });
  const upToWeekEnd = toGroupingPosts(posts.filter((p) => p.postedAt < summary.weekEnd));

  const platforms = summary.platforms.map((s): ReviewPlatformContext => {
    const platform: AnalyticsPlatform = s.platform;
    const groups = groupScores(upToWeekEnd, platform);
    return {
      platform: PLATFORM_LABELS[platform],
      viewsLabel: VIEWS_LABELS[platform],
      postCount: s.postCount,
      followersGained: s.followersGained,
      followersEnd: s.followersEnd,
      best: s.best && { title: s.best.title, relativeScore: s.best.relativeScore },
      worst: s.worst && { title: s.worst.title, relativeScore: s.worst.relativeScore },
      posts: posts
        .filter((p) => p.platform === platform && p.postedAt >= summary.weekStart && p.postedAt < summary.weekEnd)
        .sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime())
        .map((p) => ({
          title: p.title,
          relativeScore: p.relativeScore,
          pillar: p.pillar.name,
          format: p.format?.name ?? null,
          hookType: p.hookType?.name ?? null,
          postedAt: formatWib(p.postedAt, "EEEE HH.mm"),
        })),
      groups: REVIEW_DIMENSIONS.flatMap(({ key, label }) => groups[key].map((row) => stat(label, row))),
      scoredTotal: upToWeekEnd.filter((p) => p.platform === platform).length,
    };
  });

  const text = (value: string | null | undefined) => value?.trim() || null;
  return {
    targetId: toWibDateString(summary.weekStart),
    context: {
      weekLabel: formatWibWeekRange(summary.weekStart),
      target: summary.target,
      postedCount: summary.postedCount,
      platforms: PLATFORMS.map((p) => platforms.find((x) => x.platform === PLATFORM_LABELS[p])!),
      suggestions: suggestions.map(suggestionLine),
      current: {
        wins: text(input.wins),
        repeat: text(input.repeat),
        stop: text(input.stop),
        focusNext: text(input.focusNext),
      },
    },
  };
}
