// Fungsi murni: perbandingan eksperimen A/B (E7 di docs/FASE-5.md).
// Tidak boleh import Prisma, React, atau Next.
//
// - Satu platform per eksperimen; post platform lain diabaikan di sini juga.
// - Perbandingan hanya memakai angka H+7 dan baru tampil setelah SEMUA post punya H+7.
// - Usulan kesimpulan: ≥ 2 post per varian dan B unggul ≥ 10% → Terbukti; A unggul ≥ 10% → Tidak terbukti;
//   selain itu Belum jelas. Ini bukan uji statistik; keputusan akhir tetap di tangan pengguna.

import {
  contentScore,
  DEFAULT_SCORE_WEIGHTS,
  engagementRate,
  followRate,
  median,
  saveRate,
  shareRate,
  type AnalyticsPlatform,
  type MetricInput,
  type ScoreWeights,
} from "./metrics";

export const EXPERIMENT_VARIABLES = ["HOOK", "FORMAT", "TIME", "DURATION", "COVER", "OTHER"] as const;
export type ExperimentVariable = (typeof EXPERIMENT_VARIABLES)[number];

export const DECIDING_METRICS = ["SCORE", "ER", "SAVE_RATE", "SHARE_RATE", "FOLLOW_RATE", "VIEWS"] as const;
export type DecidingMetric = (typeof DECIDING_METRICS)[number];

export type ExperimentVariant = "A" | "B";
export type ExperimentResultValue = "SUPPORTED" | "REJECTED" | "INCONCLUSIVE";

/** Minimal post per varian sebelum usulan Terbukti/Tidak terbukti. */
export const EXPERIMENT_MIN_POSTS_PER_VARIANT = 2;
/** Selisih minimal (10%) agar satu varian dianggap unggul. */
export const EXPERIMENT_MIN_LIFT = 0.1;

/** Nilai metrik penentu dari satu snapshot. Rate dalam persen, follow rate per 1.000, views apa adanya. */
export function metricValue(
  metric: DecidingMetric,
  m: MetricInput,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): number {
  switch (metric) {
    case "SCORE":
      return contentScore(m, weights);
    case "ER":
      return engagementRate(m);
    case "SAVE_RATE":
      return saveRate(m);
    case "SHARE_RATE":
      return shareRate(m);
    case "FOLLOW_RATE":
      return followRate(m);
    case "VIEWS":
      return Number.isFinite(m.views) && m.views > 0 ? m.views : 0;
  }
}

export type ExperimentPostInput = {
  postId: string;
  platform: AnalyticsPlatform;
  variant: ExperimentVariant;
  /** Angka snapshot H+7; `null` = H+7 belum diisi (H+1 tidak dipakai untuk perbandingan). */
  h7: MetricInput | null;
};

export type VariantStats = {
  count: number;
  /** Median metrik penentu; `null` jika varian belum punya post. */
  median: number | null;
  /** Nilai per post (urutan masukan), untuk tabel. */
  values: { postId: string; value: number }[];
};

export type ExperimentReason = "NOT_ENOUGH_POSTS" | "B_BETTER" | "A_BETTER" | "TOO_CLOSE";

export type ExperimentComparison =
  | { status: "EMPTY" }
  | { status: "WAITING_H7"; waitingCount: number; total: number }
  | {
      status: "READY";
      a: VariantStats;
      b: VariantStats;
      /** (median B − median A) / median A × 100. `null` jika median A 0 (atau varian kosong) dan B > 0. */
      diffPercent: number | null;
      proposal: ExperimentResultValue;
      reason: ExperimentReason;
    };

function stats(posts: readonly ExperimentPostInput[], metric: DecidingMetric, weights: ScoreWeights): VariantStats {
  const values = posts.map((p) => ({ postId: p.postId, value: metricValue(metric, p.h7!, weights) }));
  return { count: values.length, median: values.length ? median(values.map((v) => v.value)) : null, values };
}

function diff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  if (a === 0) return b === 0 ? 0 : null;
  return ((b - a) / a) * 100;
}

/** `high` unggul ≥ 10% dari `low` (toleransi kecil supaya 110 vs 100 tepat dihitung 10%). */
function leads(high: number, low: number): boolean {
  return high > low && high - low >= low * EXPERIMENT_MIN_LIFT - 1e-9 * Math.max(1, Math.abs(low));
}

/** Usulan kesimpulan dari dua median (E7). */
export function proposeResult(a: VariantStats, b: VariantStats): { proposal: ExperimentResultValue; reason: ExperimentReason } {
  if (a.count < EXPERIMENT_MIN_POSTS_PER_VARIANT || b.count < EXPERIMENT_MIN_POSTS_PER_VARIANT) {
    return { proposal: "INCONCLUSIVE", reason: "NOT_ENOUGH_POSTS" };
  }
  const ma = a.median ?? 0;
  const mb = b.median ?? 0;
  if (leads(mb, ma)) return { proposal: "SUPPORTED", reason: "B_BETTER" };
  if (leads(ma, mb)) return { proposal: "REJECTED", reason: "A_BETTER" };
  return { proposal: "INCONCLUSIVE", reason: "TOO_CLOSE" };
}

/** Perbandingan satu eksperimen: kosong, menunggu H+7 untuk N post, atau median per varian + usulan. */
export function compareExperiment(input: {
  platform: AnalyticsPlatform;
  metric: DecidingMetric;
  posts: readonly ExperimentPostInput[];
  weights?: ScoreWeights;
}): ExperimentComparison {
  const posts = input.posts.filter((p) => p.platform === input.platform);
  if (posts.length === 0) return { status: "EMPTY" };
  const waitingCount = posts.filter((p) => p.h7 === null).length;
  if (waitingCount > 0) return { status: "WAITING_H7", waitingCount, total: posts.length };

  const weights = input.weights ?? DEFAULT_SCORE_WEIGHTS;
  const a = stats(posts.filter((p) => p.variant === "A"), input.metric, weights);
  const b = stats(posts.filter((p) => p.variant === "B"), input.metric, weights);
  return { status: "READY", a, b, diffPercent: diff(a.median, b.median), ...proposeResult(a, b) };
}
