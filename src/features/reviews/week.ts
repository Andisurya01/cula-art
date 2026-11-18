// Pilihan minggu Review Mingguan (`?minggu=yyyy-MM-dd`, Senin WIB). Fungsi murni, aman di client.

import { isReviewableWeek, reviewWeekStart } from "@/lib/analytics/review";
import { addWibDays, formatWibWeekRange, isValidWibDateString, startOfWibWeek, toWibDateString, wibToUtc } from "@/lib/date";

/** Nama parameter URL (disepakati di brief Fase 5, lihat `routes.studio.reviewWeek`). */
export const REVIEW_WEEK_PARAM = "minggu";

/**
 * Minggu dari parameter URL. Tanggal selain Senin diarahkan ke Senin minggunya. Tanpa parameter,
 * tanggal tidak valid, atau minggu di masa depan → minggu yang perlu di-review (`reviewWeekStart`).
 */
export function parseReviewWeek(value: string | string[] | undefined, now: Date): Date {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && isValidWibDateString(raw)) {
    const week = startOfWibWeek(wibToUtc(raw));
    if (isReviewableWeek(week, now)) return week;
  }
  return reviewWeekStart(now);
}

export type ReviewWeekNav = {
  weekStart: Date;
  /** `yyyy-MM-dd` (nilai `?minggu=`). */
  key: string;
  prev: string;
  /** `null` jika minggu berikutnya belum dimulai (tidak melewati minggu berjalan). */
  next: string | null;
  /** Minggu yang perlu di-review sekarang (default halaman). */
  due: string;
  isDue: boolean;
  /** Minggu berjalan: angka masih bisa bertambah sampai Minggu malam. */
  isCurrentWeek: boolean;
};

export function reviewWeekNav(weekStart: Date, now: Date): ReviewWeekNav {
  const next = addWibDays(weekStart, 7);
  const due = toWibDateString(reviewWeekStart(now));
  const key = toWibDateString(weekStart);
  return {
    weekStart,
    key,
    prev: toWibDateString(addWibDays(weekStart, -7)),
    next: isReviewableWeek(next, now) ? toWibDateString(next) : null,
    due,
    isDue: key === due,
    isCurrentWeek: weekStart.getTime() === startOfWibWeek(now).getTime(),
  };
}

/** Rentang Senin-Minggu (lihat `formatWibWeekRange` di src/lib/date.ts). */
export function weekRangeLabel(weekStart: Date, options: { short?: boolean } = {}): string {
  return formatWibWeekRange(weekStart, options);
}
