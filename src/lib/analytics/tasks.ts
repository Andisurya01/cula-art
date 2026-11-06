// Fungsi murni: tugas hari ini (D7) dan pengingat snapshot followers (D8) di docs/FASE-4.md.
// Tidak boleh import Prisma, React, atau Next.

import { addWibDays, startOfWibDay, wibDaysBetween } from "@/lib/date";
import type { AnalyticsPlatform } from "./metrics";

export type ContentStageValue = "PLANNING" | "PRODUCTION" | "EDITING" | "READY" | "POSTED";

export type TaskPost = {
  contentId: string;
  title: string;
  platform: AnalyticsPlatform;
  scheduledAt: Date | null;
  postedAt: Date | null;
  stage: ContentStageValue;
};

/**
 * OVERDUE = jadwal sudah lewat dan belum tayang; TODAY = dijadwalkan nanti hari ini;
 * NOT_READY = terjadwal 1-2 hari lagi tetapi belum Siap Posting.
 */
export type TaskKind = "OVERDUE" | "TODAY" | "NOT_READY";

export type TodayTask = {
  kind: TaskKind;
  contentId: string;
  title: string;
  /** Jadwal paling awal di antara versi platform baris ini. */
  at: Date;
  platforms: AnalyticsPlatform[];
  stage: ContentStageValue;
  /** Konten belum sampai Siap Posting, juga untuk OVERDUE dan TODAY. */
  notReady: boolean;
};

/** Post lewat jadwal lebih lama dari ini dianggap sudah ditinggalkan (D7). */
export const OVERDUE_LOOKBACK_DAYS = 7;
/** Konten terjadwal paling jauh sekian hari lagi yang ditagih kesiapannya (D7). */
export const NOT_READY_LOOKAHEAD_DAYS = 2;

const KIND_ORDER: Record<TaskKind, number> = { OVERDUE: 0, TODAY: 1, NOT_READY: 2 };

function isNotReady(stage: ContentStageValue): boolean {
  return stage !== "READY" && stage !== "POSTED";
}

/** Batas jadwal yang relevan untuk `todayTasks`, supaya query tidak memuat semua post. */
export function taskWindow(now: Date): { from: Date; to: Date } {
  const today = startOfWibDay(now);
  return {
    from: addWibDays(today, -OVERDUE_LOOKBACK_DAYS),
    to: addWibDays(today, NOT_READY_LOOKAHEAD_DAYS + 1),
  };
}

/** Tugas hari ini: satu baris per konten + jenis, urut lewat jadwal → hari ini → segera. */
export function todayTasks(posts: readonly TaskPost[], now: Date): TodayTask[] {
  const { from, to } = taskWindow(now);
  const tomorrow = addWibDays(startOfWibDay(now), 1);
  const rows = new Map<string, TodayTask>();

  for (const post of posts) {
    const at = post.scheduledAt;
    if (!at || post.postedAt || at < from || at >= to) continue;

    let kind: TaskKind | null = null;
    if (at < now) kind = "OVERDUE";
    else if (at < tomorrow) kind = "TODAY";
    else if (isNotReady(post.stage)) kind = "NOT_READY";
    if (!kind) continue;

    const key = `${post.contentId}:${kind}`;
    const row = rows.get(key);
    if (row) {
      row.platforms.push(post.platform);
      if (at < row.at) row.at = at;
    } else {
      rows.set(key, {
        kind,
        contentId: post.contentId,
        title: post.title,
        at,
        platforms: [post.platform],
        stage: post.stage,
        notReady: isNotReady(post.stage),
      });
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.at.getTime() - b.at.getTime() ||
      a.contentId.localeCompare(b.contentId),
  );
}

/** Pengingat muncul jika snapshot terakhir sudah sekian hari kalender WIB atau lebih (D8). */
export const FOLLOWER_REMINDER_DAYS = 7;

/**
 * Platform yang belum punya snapshot followers dalam 7 hari terakhir (hari ini + 6 hari sebelumnya).
 * `latest` berisi tanggal snapshot terakhir per platform; `null` = belum pernah.
 */
export function followerSnapshotReminders(
  latest: readonly { platform: AnalyticsPlatform; date: Date | null }[],
  now: Date,
): AnalyticsPlatform[] {
  return latest
    .filter(({ date }) => !date || wibDaysBetween(date, now) >= FOLLOWER_REMINDER_DAYS)
    .map(({ platform }) => platform);
}
