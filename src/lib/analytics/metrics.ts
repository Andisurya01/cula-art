// Fungsi murni untuk metrik konten. Tidak boleh import Prisma, React, atau Next.
// Rumus mengikuti docs/PRD.md bagian "Metrik, rumus, dan aturan saran".

export type MetricInput = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
};

export type ScoreWeights = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  follows: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  likes: 1,
  comments: 2,
  shares: 3,
  saves: 3,
  follows: 5,
};

function safeRatio(numerator: number, views: number): number {
  if (!Number.isFinite(views) || views <= 0) return 0;
  const value = numerator / views;
  return Number.isFinite(value) ? value : 0;
}

/** Engagement rate dalam persen: (likes + comments + shares + saves) / views × 100. */
export function engagementRate(m: MetricInput): number {
  return safeRatio(m.likes + m.comments + m.shares + m.saves, m.views) * 100;
}

/** Save rate dalam persen. */
export function saveRate(m: MetricInput): number {
  return safeRatio(m.saves, m.views) * 100;
}

/** Share rate dalam persen. */
export function shareRate(m: MetricInput): number {
  return safeRatio(m.shares, m.views) * 100;
}

/** Follows per 1.000 views. */
export function followRate(m: MetricInput): number {
  return safeRatio(m.follows, m.views) * 1000;
}

/** Skor konten: jumlah interaksi berbobot per 1.000 views. */
export function contentScore(
  m: MetricInput,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): number {
  const weighted =
    weights.likes * m.likes +
    weights.comments * m.comments +
    weights.shares * m.shares +
    weights.saves * m.saves +
    weights.follows * m.follows;
  return safeRatio(weighted, m.views) * 1000;
}

/** Median; array kosong → 0. */
export function median(values: readonly number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export const RELATIVE_SCORE_WINDOW = 10;

/**
 * Skor relatif = skor post / median skor N post terakhir di platform yang sama.
 * `previousScores` harus sudah difilter per platform dan diurutkan dari terbaru.
 * Tanpa pembanding atau median 0 → 0 (tidak bisa dibandingkan).
 */
export function relativeScore(
  score: number,
  previousScores: readonly number[],
  window: number = RELATIVE_SCORE_WINDOW,
): number {
  const base = median(previousScores.slice(0, window));
  if (base <= 0 || !Number.isFinite(score)) return 0;
  return score / base;
}
