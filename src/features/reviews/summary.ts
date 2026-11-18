// Ringkasan Review Mingguan dalam bentuk yang bisa dibekukan di `WeeklyReview.summaryJson` (E8).
// Fungsi murni, aman di client. Tanggal disimpan sebagai string; JSON rusak atau versi lain = tidak ada.

import { z } from "zod";
import type { WeeklySummary } from "@/lib/analytics/review";
import { isValidWibDateString, toWibDateString } from "@/lib/date";
import { PLATFORMS } from "@/lib/labels";

/** Naikkan jika bentuk ringkasan berubah; ringkasan versi lama lalu dianggap tidak ada. */
export const FROZEN_SUMMARY_VERSION = 1;

const count = z.number().int().nonnegative();
const followers = z.number().int().nullable();
const postRef = z
  .object({ id: z.string().min(1), title: z.string(), relativeScore: z.number() })
  .nullable();

const platformSummarySchema = z.object({
  platform: z.enum(PLATFORMS),
  postCount: count,
  scoredCount: count,
  followersStart: followers,
  followersEnd: followers,
  followersGained: followers,
  best: postRef,
  worst: postRef,
});

const summaryDataShape = {
  /** Senin minggu itu, `yyyy-MM-dd` WIB. */
  weekStart: z.string().refine(isValidWibDateString),
  target: count,
  postedCount: count,
  targetMet: z.boolean(),
  platforms: z.array(platformSummarySchema).max(PLATFORMS.length),
  /** Saran aturan yang aktif (kalimat jadi, "Judul: kalimat"). */
  suggestions: z.array(z.string()).max(50),
};

export const frozenSummarySchema = z.object({
  version: z.literal(FROZEN_SUMMARY_VERSION),
  /** Waktu dibekukan, ISO 8601 UTC. */
  frozenAt: z.iso.datetime(),
  ...summaryDataShape,
});

export type FrozenSummary = z.infer<typeof frozenSummarySchema>;
export type ReviewPlatformData = z.infer<typeof platformSummarySchema>;
/** Ringkasan siap tampil: angka terkini atau yang dibekukan (tanpa `version`/`frozenAt`). */
export type ReviewSummaryData = Omit<FrozenSummary, "version" | "frozenAt">;

/** Ubah hasil `weeklySummary` + kalimat saran aktif ke bentuk yang bisa diserialisasi. */
export function toSummaryData(summary: WeeklySummary, suggestions: readonly string[]): ReviewSummaryData {
  return {
    weekStart: toWibDateString(summary.weekStart),
    target: summary.target,
    postedCount: summary.postedCount,
    targetMet: summary.targetMet,
    platforms: summary.platforms.map((p) => ({
      platform: p.platform,
      postCount: p.postCount,
      scoredCount: p.scoredCount,
      followersStart: p.followersStart,
      followersEnd: p.followersEnd,
      followersGained: p.followersGained,
      best: p.best && { id: p.best.id, title: p.best.title, relativeScore: p.best.relativeScore },
      worst: p.worst && { id: p.worst.id, title: p.worst.title, relativeScore: p.worst.relativeScore },
    })),
    suggestions: [...suggestions],
  };
}

/** JSON untuk `summaryJson`. */
export function freezeSummary(data: ReviewSummaryData, frozenAt: Date): string {
  const frozen: FrozenSummary = { version: FROZEN_SUMMARY_VERSION, frozenAt: frozenAt.toISOString(), ...data };
  return JSON.stringify(frozen);
}

/** Baca `summaryJson`. Kosong, JSON rusak, bentuk salah, atau versi lain → `null` (dianggap tidak ada). */
export function parseFrozenSummary(json: string | null | undefined): FrozenSummary | null {
  if (!json) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = frozenSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Ringkasan satu platform (urutan PLATFORMS); `null` jika tidak ada di ringkasan. */
export function platformData(data: ReviewSummaryData, platform: (typeof PLATFORMS)[number]): ReviewPlatformData | null {
  return data.platforms.find((p) => p.platform === platform) ?? null;
}

function numbers(data: ReviewSummaryData) {
  return {
    target: data.target,
    postedCount: data.postedCount,
    platforms: PLATFORMS.map((platform) => {
      const p = platformData(data, platform);
      const ref = (r: ReviewPlatformData["best"]) => r && [r.id, r.relativeScore];
      return (
        p && [p.postCount, p.scoredCount, p.followersStart, p.followersEnd, p.followersGained, ref(p.best), ref(p.worst)]
      );
    }),
  };
}

/**
 * Apakah angka terkini berbeda dari yang dibekukan (target, post, followers, terbaik/terburuk).
 * Judul dan saran tidak dibandingkan: saran berubah mengikuti hari ini, bukan minggu itu.
 */
export function summaryNumbersDiffer(frozen: ReviewSummaryData, live: ReviewSummaryData): boolean {
  return JSON.stringify(numbers(frozen)) !== JSON.stringify(numbers(live));
}
