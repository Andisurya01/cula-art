// Fungsi murni: perbandingan skor post terhadap median post sebelumnya di platform yang sama (D4).

import { MIN_COMPARISON_POSTS } from "@/lib/analytics/scoring";

export type BaselineComparison =
  | { kind: "NOT_ENOUGH" }
  | { kind: "NO_SCORE" }
  | { kind: "SAME" }
  /** `percent` = selisih terhadap median; `null` jika median 0 (persen tidak bisa dihitung). */
  | { kind: "HIGHER" | "LOWER"; percent: number | null };

/** Selisih di bawah ini tampil "0,0%", jadi dianggap sama dengan median. */
const SAME_BELOW_PERCENT = 0.05;

export function compareToBaseline({
  score,
  baselineMedian,
  baselineCount,
}: {
  score: number | null;
  baselineMedian: number | null;
  baselineCount: number;
}): BaselineComparison {
  if (baselineMedian === null || baselineCount < MIN_COMPARISON_POSTS) return { kind: "NOT_ENOUGH" };
  if (score === null) return { kind: "NO_SCORE" };
  if (baselineMedian <= 0) return score > 0 ? { kind: "HIGHER", percent: null } : { kind: "SAME" };

  const percent = ((score - baselineMedian) / baselineMedian) * 100;
  if (Math.abs(percent) < SAME_BELOW_PERCENT) return { kind: "SAME" };
  return { kind: percent > 0 ? "HIGHER" : "LOWER", percent: Math.abs(percent) };
}
