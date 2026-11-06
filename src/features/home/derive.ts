// Fungsi murni Beranda: menyiapkan daftar, progres, dan data grafik dari hasil query.
// Tanpa Prisma/React/Next, jadi bisa diuji tanpa database.

import type { Platform } from "@prisma/client";
import { followerSeries, followersGained, rangeStart, type FollowerPoint } from "@/lib/analytics/kpi";
import type { TaskKind, TodayTask } from "@/lib/analytics/tasks";
import { formatWib, startOfWibDay, wibDaysBetween } from "@/lib/date";
import { CONTENT_STAGE_LABELS, PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";

export type WeekPost = {
  platform: Platform;
  scheduledAt: Date | null;
  postedAt: Date | null;
  content: { id: string; title: string; pillar: { name: string; color: string } };
};

export type WeekItem = {
  contentId: string;
  title: string;
  pillar: { name: string; color: string };
  /** Waktu paling awal di antara versi platform konten ini (tayang, atau jadwal jika belum tayang). */
  at: Date;
  posted: boolean;
  platforms: Platform[];
};

/**
 * "Post minggu ini" dihitung per konten, bukan per platform: satu konten yang tayang di TikTok dan
 * Instagram tetap dihitung satu post terhadap target.
 */
export function groupWeekItems(posts: readonly WeekPost[]): WeekItem[] {
  const byContent = new Map<string, WeekItem>();
  for (const post of posts) {
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
  return [...byContent.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}

export type WeekProgress = {
  posted: number;
  /** Konten terjadwal minggu ini yang belum tayang di platform mana pun. */
  scheduled: number;
  /** Slot target yang belum terisi post tayang atau terjadwal. */
  remaining: number;
  /** Bagian bilah progres (0-1). Jumlah keduanya tidak pernah lebih dari 1. */
  postedRatio: number;
  scheduledRatio: number;
};

export function weekProgress(items: readonly { posted: boolean }[], target: number): WeekProgress {
  const posted = items.filter((item) => item.posted).length;
  const scheduled = items.length - posted;
  const postedRatio = target > 0 ? Math.min(posted / target, 1) : 0;
  const scheduledRatio = target > 0 ? Math.min(scheduled / target, 1 - postedRatio) : 0;
  return {
    posted,
    scheduled,
    remaining: Math.max(target - items.length, 0),
    postedRatio,
    scheduledRatio,
  };
}

/** Kalimat di bawah bilah progres. */
export function weekProgressNote(progress: Pick<WeekProgress, "posted" | "remaining">, target: number): string {
  if (progress.remaining > 0) return `kurang ${progress.remaining} slot terjadwal`;
  return progress.posted >= target ? "target minggu ini tercapai" : "target terjadwal terpenuhi";
}

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  OVERDUE: "Lewat jadwal",
  TODAY: "Hari ini",
  NOT_READY: "Belum siap",
};

/** Stage disebut untuk tugas tayang yang kontennya belum siap. "Belum siap" sudah menyatakannya sendiri. */
export function taskStageNote(task: Pick<TodayTask, "kind" | "notReady" | "stage">): string | null {
  if (task.kind === "NOT_READY" || !task.notReady) return null;
  return `Masih ${CONTENT_STAGE_LABELS[task.stage]}`;
}

/** Jam saja untuk hari ini. Hari lain menyertakan tanggal, karena lewat jadwal bisa sampai 7 hari ke belakang. */
export function taskTimeLabel(at: Date, now: Date): string {
  return formatWib(at, wibDaysBetween(at, now) === 0 ? "HH.mm" : "EEE, d MMM HH.mm");
}

/** Platform selalu dalam urutan tetap, apa pun urutan datanya. */
export function orderedPlatforms(platforms: readonly Platform[]): Platform[] {
  return PLATFORMS.filter((platform) => platforms.includes(platform));
}

/** "TikTok", "TikTok dan Instagram". */
export function platformList(platforms: readonly Platform[]): string {
  return orderedPlatforms(platforms)
    .map((platform) => PLATFORM_LABELS[platform])
    .join(" dan ");
}

/** Rentang grafik mini followers. */
export const FOLLOWER_RANGE_DAYS = 30;

export type FollowerCardData = {
  platform: Platform;
  points: { t: number; value: number }[];
  /** Snapshot terakhir dalam rentang; `null` = belum ada. */
  latest: number | null;
  /** Selisih dalam rentang (D10); `null` = kurang dari 2 snapshot. */
  gained: number | null;
};

/** Satu kartu per platform, selalu terpisah, juga saat platform itu belum punya snapshot. */
export function followerCards(points: readonly FollowerPoint[]): FollowerCardData[] {
  return PLATFORMS.map((platform) => {
    const series = followerSeries(points, platform);
    return {
      platform,
      points: series.map((point) => ({ t: point.date.getTime(), value: point.followers })),
      latest: series.at(-1)?.followers ?? null,
      gained: followersGained(points, platform),
    };
  });
}

/** Sumbu waktu grafik mini: awal rentang sampai hari ini, sama untuk kedua platform. */
export function followerDomain(now: Date): [number, number] {
  return [rangeStart(now, FOLLOWER_RANGE_DAYS).getTime(), startOfWibDay(now).getTime()];
}
