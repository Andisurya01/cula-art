// Rencana minggu depan di Review Mingguan: kandidat konten dan slot kosong (E8). Fungsi murni, aman di client.

import type { ContentStage, Platform } from "@prisma/client";
import type { PostingSlot } from "@/features/settings/schema";
import { buildSlots, type CalendarSlot, type SlotPost } from "@/features/calendar/slots";
import { addWibDays, wibWeekDays } from "@/lib/date";
import { PLATFORMS } from "@/lib/labels";

/** Siap Posting didahulukan, lalu yang paling dekat siap. */
const STAGE_ORDER: Record<ContentStage, number> = {
  READY: 0,
  EDITING: 1,
  PRODUCTION: 2,
  PLANNING: 3,
  POSTED: 4,
};

export type PlanVersion = { platform: Platform; scheduledAt: Date | null; postedAt: Date | null };

export type PlanContentRow = {
  id: string;
  title: string;
  stage: ContentStage;
  stageChangedAt: Date;
  pillar: { name: string; color: string };
  posts: readonly PlanVersion[];
};

export type PlanOption = {
  id: string;
  title: string;
  stage: ContentStage;
  pillarName: string;
  pillarColor: string;
  /** Versi per platform (urutan PLATFORMS). */
  versions: PlanVersion[];
  /** Boleh ditambahkan ke rencana: belum tayang dan belum terjadwal di masa depan. */
  candidate: boolean;
};

/** Minggu rencana = minggu setelah minggu yang di-review. */
export function planWeekStart(reviewWeekStart: Date): Date {
  return addWibDays(reviewWeekStart, 7);
}

/** Belum tayang (tidak ada versi yang tayang, stage bukan Posted) dan tidak punya jadwal setelah `now`. */
export function isPlanCandidate(row: Pick<PlanContentRow, "stage" | "posts">, now: Date): boolean {
  if (row.stage === "POSTED") return false;
  if (row.posts.some((p) => p.postedAt !== null)) return false;
  return !row.posts.some((p) => p.scheduledAt !== null && p.scheduledAt.getTime() > now.getTime());
}

/**
 * Semua konten yang bisa tampil di rencana: kandidat dulu (Siap Posting → Editing → Produksi →
 * Perencanaan, lalu yang paling lama di stage itu), lalu sisanya (mis. yang sudah dijadwalkan dari
 * rencana ini) urut judul.
 */
export function planOptions(rows: readonly PlanContentRow[], now: Date): PlanOption[] {
  const ranked = rows.map((row) => ({ row, candidate: isPlanCandidate(row, now) }));
  ranked.sort(
    (a, b) =>
      Number(b.candidate) - Number(a.candidate) ||
      (a.candidate ? STAGE_ORDER[a.row.stage] - STAGE_ORDER[b.row.stage] : 0) ||
      (a.candidate ? a.row.stageChangedAt.getTime() - b.row.stageChangedAt.getTime() : 0) ||
      a.row.title.localeCompare(b.row.title, "id") ||
      a.row.id.localeCompare(b.row.id),
  );
  return ranked.map(
    ({ row, candidate }): PlanOption => ({
      id: row.id,
      title: row.title,
      stage: row.stage,
      pillarName: row.pillar.name,
      pillarColor: row.pillar.color,
      versions: PLATFORMS.flatMap((platform) => {
        const version = row.posts.find((p) => p.platform === platform);
        return version ? [{ platform, scheduledAt: version.scheduledAt, postedAt: version.postedAt }] : [];
      }),
      candidate,
    }),
  );
}

/** Slot posting kosong minggu rencana yang belum lewat (pola sama dengan Kalender). */
export function planSlots(
  postingSlots: PostingSlot[],
  posts: SlotPost[],
  planWeek: Date,
  now: Date,
): CalendarSlot[] {
  return buildSlots(wibWeekDays(planWeek), postingSlots, posts, now).filter(
    (slot) => !slot.filled && slot.at.getTime() > now.getTime(),
  );
}

/** Platform default saat menjadwalkan dari rencana: keduanya, kecuali yang sudah tayang. */
export function defaultPlanPlatforms(versions: readonly PlanVersion[]): Platform[] {
  const posted = versions.filter((v) => v.postedAt !== null).map((v) => v.platform);
  return PLATFORMS.filter((p) => !posted.includes(p));
}

/** Id rencana tersimpan yang kontennya masih ada (konten yang dihapus dibuang), urutan asli tanpa duplikat. */
export function existingPlanIds(ids: readonly string[], options: readonly Pick<PlanOption, "id">[]): string[] {
  const known = new Set(options.map((o) => o.id));
  return ids.filter((id, i) => known.has(id) && ids.indexOf(id) === i);
}
