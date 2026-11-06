// Fungsi murni: streak mingguan (D9 di docs/FASE-4.md).
// Tidak boleh import Prisma, React, atau Next.

import { addWibDays, startOfWibWeek } from "@/lib/date";

export type StreakPost = { contentId: string; postedAt: Date };

export type WeeklyStreak = {
  /** Minggu berturut-turut yang memenuhi target, termasuk minggu berjalan jika sudah memenuhi. */
  current: number;
  /** Konten yang sudah tayang minggu ini. */
  thisWeekCount: number;
  thisWeekMet: boolean;
};

/**
 * Minggu WIB berturut-turut dengan post tayang ≥ target, dihitung per konten (TikTok + Instagram =
 * satu post) dan memakai target saat ini. Minggu berjalan menambah streak jika sudah memenuhi target,
 * dan tidak memutusnya jika belum. Konten yang tayang di dua minggu berbeda dihitung di keduanya,
 * sama dengan kartu "Post minggu ini".
 */
export function weeklyStreak(posts: readonly StreakPost[], target: number, now: Date): WeeklyStreak {
  const contentsByWeek = new Map<number, Set<string>>();
  for (const post of posts) {
    if (post.postedAt.getTime() > now.getTime()) continue;
    const week = startOfWibWeek(post.postedAt).getTime();
    const contents = contentsByWeek.get(week);
    if (contents) contents.add(post.contentId);
    else contentsByWeek.set(week, new Set([post.contentId]));
  }

  const count = (week: Date) => contentsByWeek.get(week.getTime())?.size ?? 0;
  const thisWeek = startOfWibWeek(now);
  const thisWeekCount = count(thisWeek);
  const thisWeekMet = target > 0 && thisWeekCount >= target;

  let current = thisWeekMet ? 1 : 0;
  if (target > 0) {
    let week = addWibDays(thisWeek, -7);
    while (count(week) >= target) {
      current += 1;
      week = addWibDays(week, -7);
    }
  }
  return { current, thisWeekCount, thisWeekMet };
}
