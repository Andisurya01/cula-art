import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { weeklySummary } from "@/lib/analytics/review";
import { addWibDays, toWibDateString } from "@/lib/date";
import { getFollowerSnapshots, getLatestFollowerSnapshots, getScoredPosts } from "@/features/metrics/queries";
import { getSettings } from "@/features/settings/queries";
import { suggestionLine, type SuggestionView } from "@/features/suggestions/copy";
import { getSuggestionViews } from "@/features/suggestions/queries";
import { existingPlanIds, planOptions, planSlots, planWeekStart } from "./plan";
import { parseFrozenSummary, toSummaryData, type FrozenSummary, type ReviewSummaryData } from "./summary";

/**
 * Ringkasan otomatis satu minggu dengan angka terkini (E8): post vs target, followers, terbaik/terburuk
 * per platform dari `getScoredPosts` (skor relatif riwayat penuh), plus saran aktif. Dipakai halaman dan
 * aksi Simpan (yang membekukannya). Panggil dengan `now` yang sama dengan halaman (cache per request).
 */
export async function getLiveSummary(
  weekStart: Date,
  now: Date,
): Promise<{ data: ReviewSummaryData; suggestions: SuggestionView[] }> {
  const [settings, posts, followers, suggestions] = await Promise.all([
    getSettings(),
    getScoredPosts(now),
    getFollowerSnapshots(),
    getSuggestionViews(now),
  ]);
  const summary = weeklySummary({ weekStart, target: settings.weeklyPostTarget, posts, followers });
  return { data: toSummaryData(summary, suggestions.map(suggestionLine)), suggestions };
}

export type SavedReview = {
  id: string;
  wins: string;
  repeat: string;
  stop: string;
  focusNext: string;
  plannedContentIds: string[];
  /** `null` jika `summaryJson` kosong atau rusak. */
  frozen: FrozenSummary | null;
  updatedAt: Date;
};

/** Review tersimpan untuk satu minggu (Senin 00.00 WIB), atau `null`. */
export async function getWeeklyReview(weekStart: Date): Promise<SavedReview | null> {
  const row = await db.weeklyReview.findUnique({
    where: { weekStart },
    select: {
      id: true,
      wins: true,
      repeat: true,
      stop: true,
      focusNext: true,
      plannedContentIds: true,
      summaryJson: true,
      updatedAt: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    wins: row.wins ?? "",
    repeat: row.repeat ?? "",
    stop: row.stop ?? "",
    focusNext: row.focusNext ?? "",
    plannedContentIds: row.plannedContentIds,
    frozen: parseFrozenSummary(row.summaryJson),
    updatedAt: row.updatedAt,
  };
}

export type ReviewHistoryItem = {
  weekStart: Date;
  /** `yyyy-MM-dd` untuk `?minggu=`. */
  key: string;
  /** Dari ringkasan beku; `null` jika ringkasannya tidak ada/rusak. */
  postedCount: number | null;
  target: number | null;
  targetMet: boolean | null;
  focusNext: string | null;
  updatedAt: Date;
};

/** Semua review tersimpan, minggu terbaru dulu. */
export async function getReviewHistory(): Promise<ReviewHistoryItem[]> {
  const rows = await db.weeklyReview.findMany({
    orderBy: { weekStart: "desc" },
    select: { weekStart: true, focusNext: true, summaryJson: true, updatedAt: true },
  });
  return rows.map((row) => {
    const frozen = parseFrozenSummary(row.summaryJson);
    return {
      weekStart: row.weekStart,
      key: toWibDateString(row.weekStart),
      postedCount: frozen?.postedCount ?? null,
      target: frozen?.target ?? null,
      targetMet: frozen?.targetMet ?? null,
      focusNext: row.focusNext?.trim() || null,
      updatedAt: row.updatedAt,
    };
  });
}

const planContentSelect = {
  id: true,
  title: true,
  stage: true,
  stageChangedAt: true,
  pillar: { select: { name: true, color: true } },
  posts: { select: { platform: true, scheduledAt: true, postedAt: true } },
} satisfies Prisma.ContentSelect;

/**
 * Data "Rencana minggu depan": kandidat konten (belum tayang, belum terjadwal di masa depan), konten
 * yang sudah ada di rencana atau terjadwal di minggu rencana (supaya pilihan yang baru dijadwalkan tetap
 * tampil), dan slot kosong minggu rencana yang belum lewat.
 */
export async function getPlanData(reviewWeek: Date, savedIds: readonly string[], now: Date) {
  const weekStart = planWeekStart(reviewWeek);
  const weekEnd = addWibDays(weekStart, 7);
  const inWeek = { gte: weekStart, lt: weekEnd };
  const [settings, rows, posts] = await Promise.all([
    getSettings(),
    db.content.findMany({
      where: {
        OR: [
          { stage: { not: "POSTED" } },
          { id: { in: [...savedIds] } },
          { posts: { some: { postedAt: null, scheduledAt: inWeek } } },
        ],
      },
      select: planContentSelect,
    }),
    db.post.findMany({
      where: { OR: [{ postedAt: inWeek }, { postedAt: null, scheduledAt: inWeek }] },
      select: { contentId: true, postedAt: true, scheduledAt: true },
    }),
  ]);
  const options = planOptions(rows, now);
  const slotPosts = posts.flatMap((p) => {
    const at = p.postedAt ?? p.scheduledAt;
    return at ? [{ contentId: p.contentId, at }] : [];
  });
  return {
    weekStart,
    /** Minggu rencana belum berakhir: masih bisa memilih dan menjadwalkan. */
    editable: now.getTime() < weekEnd.getTime(),
    options,
    /** Rencana tersimpan tanpa konten yang sudah dihapus. */
    savedIds: existingPlanIds(savedIds, options),
    slots: planSlots(settings.postingSlots, slotPosts, weekStart, now),
  };
}
export type PlanData = Awaited<ReturnType<typeof getPlanData>>;

/** Semua data halaman Review Mingguan untuk satu minggu. */
export async function getReviewPageData(weekStart: Date, now: Date) {
  const saved = await getWeeklyReview(weekStart);
  const [live, history, latestFollowers, plan] = await Promise.all([
    getLiveSummary(weekStart, now),
    getReviewHistory(),
    getLatestFollowerSnapshots(),
    getPlanData(weekStart, saved?.plannedContentIds ?? [], now),
  ]);
  return { saved, live, history, latestFollowers, plan };
}
