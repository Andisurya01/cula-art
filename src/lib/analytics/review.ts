// Fungsi murni: Review Mingguan (E8 di docs/FASE-5.md). Minggu = Senin-Minggu WIB.
// Tidak boleh import Prisma, React, atau Next.

import { addWibDays, endOfWibWeek, startOfWibWeek, toWibTimeString, wibIsoDay } from "@/lib/date";
import { followerSeries, type FollowerPoint } from "./kpi";
import type { AnalyticsPlatform } from "./metrics";
import { topAndBottomPosts } from "./scoring";

const PLATFORM_ORDER: readonly AnalyticsPlatform[] = ["TIKTOK", "INSTAGRAM"];

/** Pengingat review minggu ini mulai Minggu pukul 18.00 WIB. */
export const REVIEW_REMINDER_HOUR = 18;
/** Hari ISO terakhir pengingat "Review minggu lalu belum diisi" (2 = Selasa). */
export const REVIEW_LATE_LAST_ISO_DAY = 2;

function wibHour(date: Date): number {
  return Number(toWibTimeString(date).slice(0, 2));
}

/** Minggu 18.00 WIB atau lebih (masih hari Minggu). */
function isSundayEvening(now: Date): boolean {
  return wibIsoDay(now) === 7 && wibHour(now) >= REVIEW_REMINDER_HOUR;
}

/**
 * Minggu yang perlu di-review (default halaman Review): minggu berjalan mulai Minggu 18.00 WIB,
 * selain itu minggu lalu (minggu berjalan belum selesai).
 */
export function reviewWeekStart(now: Date): Date {
  const thisWeek = startOfWibWeek(now);
  return isSundayEvening(now) ? thisWeek : addWibDays(thisWeek, -7);
}

export type ReviewReminder = {
  weekStart: Date;
  /** THIS_WEEK = Minggu malam, review minggu ini; LAST_WEEK = Senin-Selasa, review minggu lalu belum diisi. */
  kind: "THIS_WEEK" | "LAST_WEEK";
};

/**
 * Pengingat di Beranda (E8): Minggu 18.00 WIB sampai review minggu itu tersimpan; Senin-Selasa
 * "Review minggu lalu belum diisi". Rabu-Minggu siang tidak ada pengingat.
 * `reviewedWeeks` = `weekStart` review yang sudah tersimpan.
 */
export function reviewReminder(now: Date, reviewedWeeks: readonly Date[]): ReviewReminder | null {
  const saved = new Set(reviewedWeeks.map((d) => d.getTime()));
  const thisWeek = startOfWibWeek(now);
  if (isSundayEvening(now)) {
    return saved.has(thisWeek.getTime()) ? null : { weekStart: thisWeek, kind: "THIS_WEEK" };
  }
  if (wibIsoDay(now) <= REVIEW_LATE_LAST_ISO_DAY) {
    const lastWeek = addWibDays(thisWeek, -7);
    return saved.has(lastWeek.getTime()) ? null : { weekStart: lastWeek, kind: "LAST_WEEK" };
  }
  return null;
}

/** Senin 00.00 WIB yang tidak di masa depan (minggu berjalan boleh). */
export function isReviewableWeek(weekStart: Date, now: Date): boolean {
  return startOfWibWeek(weekStart).getTime() === weekStart.getTime() && weekStart <= startOfWibWeek(now);
}

export type ReviewPost = {
  id: string;
  contentId: string;
  title: string;
  platform: AnalyticsPlatform;
  postedAt: Date;
  relativeScore: number | null;
};

export type ReviewPostRef = { id: string; title: string; relativeScore: number };

export type ReviewPlatformSummary = {
  platform: AnalyticsPlatform;
  /** Post tayang minggu ini di platform ini. */
  postCount: number;
  /** Yang sudah punya skor relatif (dasar terbaik/terburuk). */
  scoredCount: number;
  /** Followers pada snapshot pembanding awal dan akhir; `null` = tidak ada. */
  followersStart: number | null;
  followersEnd: number | null;
  /** Akhir − awal; `null` jika kurang dari 2 snapshot yang bisa dibandingkan. */
  followersGained: number | null;
  /** Skor relatif tertinggi dan terendah minggu ini; satu post tidak muncul di keduanya. */
  best: ReviewPostRef | null;
  worst: ReviewPostRef | null;
};

export type WeeklySummary = {
  weekStart: Date;
  /** Senin berikutnya 00.00 WIB (eksklusif). */
  weekEnd: Date;
  target: number;
  /** Konten tayang minggu ini (TikTok + Instagram dari konten yang sama = 1). */
  postedCount: number;
  targetMet: boolean;
  platforms: ReviewPlatformSummary[];
};

/**
 * Followers bertambah dalam minggu: snapshot terakhir sebelum minggu berakhir dikurangi snapshot
 * terakhir sebelum minggu dimulai (atau snapshot pertama di minggu itu jika belum ada sebelumnya).
 * Snapshot yang diisi Minggu malam saat review masuk minggu itu.
 */
function weekFollowers(points: readonly FollowerPoint[], platform: AnalyticsPlatform, weekStart: Date, weekEnd: Date) {
  const series = followerSeries(points, platform);
  const end = series.filter((p) => p.date < weekEnd).at(-1) ?? null;
  const start = series.filter((p) => p.date < weekStart).at(-1) ?? series.find((p) => p.date >= weekStart && p.date < weekEnd) ?? null;
  const comparable = end !== null && start !== null && end !== start;
  return {
    followersStart: start?.followers ?? null,
    followersEnd: end?.followers ?? null,
    followersGained: comparable ? end.followers - start.followers : null,
  };
}

/**
 * Ringkasan otomatis satu minggu (E8): post vs target, followers bertambah per platform, post terbaik
 * dan terburuk per platform (skor relatif). `posts` = semua post tayang (disaring di sini), skor relatif
 * dari getScoredPosts (dihitung dari riwayat penuh). Saran aktif ditambahkan pemanggil.
 */
export function weeklySummary(input: {
  weekStart: Date;
  target: number;
  posts: readonly ReviewPost[];
  followers: readonly FollowerPoint[];
}): WeeklySummary {
  const weekStart = startOfWibWeek(input.weekStart);
  const weekEnd = endOfWibWeek(weekStart);
  const inWeek = input.posts.filter((p) => p.postedAt >= weekStart && p.postedAt < weekEnd);
  const postedCount = new Set(inWeek.map((p) => p.contentId)).size;

  const platforms = PLATFORM_ORDER.map((platform): ReviewPlatformSummary => {
    const own = inWeek.filter((p) => p.platform === platform);
    const { top, bottom } = topAndBottomPosts(own, 1);
    const ref = (p: ReviewPost | undefined): ReviewPostRef | null =>
      p && p.relativeScore !== null ? { id: p.id, title: p.title, relativeScore: p.relativeScore } : null;
    return {
      platform,
      postCount: own.length,
      scoredCount: own.filter((p) => p.relativeScore !== null).length,
      ...weekFollowers(input.followers, platform, weekStart, weekEnd),
      best: ref(top[0]),
      worst: ref(bottom[0]),
    };
  });

  return {
    weekStart,
    weekEnd,
    target: input.target,
    postedCount,
    targetMet: input.target > 0 && postedCount >= input.target,
    platforms,
  };
}
