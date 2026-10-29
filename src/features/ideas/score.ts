// Skor gabungan ide (fungsi murni, tanpa Prisma/React).

/** Skor tertinggi yang mungkin: potensi 5 × (6 − effort 1). */
export const MAX_IDEA_SCORE = 25;

function isRating(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Skor gabungan = potensi × (6 − effort), rentang 1-25.
 * Potensi tinggi dan effort rendah = skor tinggi.
 * `null` jika potensi atau effort kosong / di luar 1-5.
 */
export function ideaScore(
  potential: number | null | undefined,
  effort: number | null | undefined,
): number | null {
  if (!isRating(potential) || !isRating(effort)) return null;
  return potential * (6 - effort);
}

export type ScorableIdea = {
  potential: number | null;
  effort: number | null;
  createdAt: Date;
};

/** Urutan terbaru dulu (createdAt menurun). */
export function compareByNewest(a: ScorableIdea, b: ScorableIdea): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * Urutan skor gabungan menurun; ide tanpa skor selalu paling bawah.
 * Skor sama → yang terbaru dulu.
 */
export function compareByScore(a: ScorableIdea, b: ScorableIdea): number {
  const scoreA = ideaScore(a.potential, a.effort);
  const scoreB = ideaScore(b.potential, b.effort);
  if (scoreA === null && scoreB !== null) return 1;
  if (scoreA !== null && scoreB === null) return -1;
  if (scoreA !== null && scoreB !== null && scoreA !== scoreB) return scoreB - scoreA;
  return compareByNewest(a, b);
}

export type IdeaSort = "newest" | "score";

/** Salinan baru yang sudah diurutkan; array asal tidak diubah. */
export function sortIdeas<T extends ScorableIdea>(ideas: readonly T[], sort: IdeaSort): T[] {
  return [...ideas].sort(sort === "score" ? compareByScore : compareByNewest);
}
