// Fungsi murni: skor dan skor relatif per post, per platform (D4 di docs/FASE-4.md).
// Tidak boleh import Prisma, React, atau Next.

import {
  contentScore,
  DEFAULT_SCORE_WEIGHTS,
  median,
  RELATIVE_SCORE_WINDOW,
  type AnalyticsPlatform,
  type MetricInput,
  type ScoreWeights,
} from "./metrics";

/** Pembanding kurang dari ini → skor relatif tampil "—" dan post tidak masuk top/bottom. */
export const MIN_COMPARISON_POSTS = 3;

export type ScoringInput = {
  id: string;
  platform: AnalyticsPlatform;
  postedAt: Date;
  /** Angka dari snapshot yang dipakai (H+7, cadangan H+1); `null` = belum ada snapshot. */
  metrics: MetricInput | null;
};

export type PostScore = {
  /** `null` = belum ada snapshot. `views = 0` → 0, bukan NaN. */
  score: number | null;
  /** Skor / median pembanding. `null` jika pembanding < 3, median 0, atau belum ada skor. */
  relativeScore: number | null;
  /** Median pembanding; `null` jika pembanding < 3. */
  baselineMedian: number | null;
  /** Jumlah pembanding yang dipakai (0 sampai 10). */
  baselineCount: number;
};

function byPostedAt(a: ScoringInput, b: ScoringInput): number {
  return a.postedAt.getTime() - b.postedAt.getTime() || a.id.localeCompare(b.id);
}

/**
 * Skor semua post. Pembanding sebuah post = sampai 10 post sebelumnya (menurut `postedAt`) di
 * platform yang sama yang sudah punya skor. Jadi hasil ini harus dihitung dari SEMUA post tayang,
 * bukan dari post dalam rentang filter.
 */
export function scorePosts(
  posts: readonly ScoringInput[],
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): Map<string, PostScore> {
  const result = new Map<string, PostScore>();
  const platforms = new Set(posts.map((p) => p.platform));

  for (const platform of platforms) {
    const previous: number[] = []; // skor post sebelumnya, terlama → terbaru
    const ordered = posts.filter((p) => p.platform === platform).sort(byPostedAt);

    for (const post of ordered) {
      const window = previous.slice(-RELATIVE_SCORE_WINDOW);
      const hasBaseline = window.length >= MIN_COMPARISON_POSTS;
      const baselineMedian = hasBaseline ? median(window) : null;
      const score = post.metrics ? contentScore(post.metrics, weights) : null;
      const relativeScore =
        score !== null && baselineMedian !== null && baselineMedian > 0 ? score / baselineMedian : null;

      result.set(post.id, { score, relativeScore, baselineMedian, baselineCount: window.length });
      if (score !== null) previous.push(score);
    }
  }
  return result;
}

/**
 * Top dan bottom N menurut skor relatif. Post tanpa skor relatif tidak ikut.
 * Satu post tidak muncul di dua daftar, jadi jika data sedikit, daftar bottom bisa lebih pendek.
 */
export function topAndBottomPosts<T extends { id: string; relativeScore: number | null }>(
  posts: readonly T[],
  count = 5,
): { top: T[]; bottom: T[] } {
  const ranked = posts
    .filter((p) => p.relativeScore !== null)
    .sort((a, b) => b.relativeScore! - a.relativeScore! || a.id.localeCompare(b.id));
  const top = ranked.slice(0, count);
  const bottom = ranked.slice(top.length).slice(-count).reverse();
  return { top, bottom };
}
