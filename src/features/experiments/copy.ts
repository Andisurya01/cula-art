// Kalimat UI Eksperimen (fungsi murni). Angka diformat di sini supaya halaman dan test memakai teks yang sama.

import {
  EXPERIMENT_MIN_LIFT,
  EXPERIMENT_MIN_POSTS_PER_VARIANT,
  type ExperimentComparison,
  type ExperimentReason,
} from "@/lib/analytics/experiments";
import { EXPERIMENT_RESULT_LABELS } from "./schema";

const MIN_LIFT_PERCENT = Math.round(EXPERIMENT_MIN_LIFT * 100);

/** Kalimat penjelas usulan otomatis. */
export function proposalReasonText(reason: ExperimentReason): string {
  switch (reason) {
    case "NOT_ENOUGH_POSTS":
      return `Butuh minimal ${EXPERIMENT_MIN_POSTS_PER_VARIANT} post per varian sebelum ada usulan Terbukti atau Tidak terbukti.`;
    case "B_BETTER":
      return `Median B unggul minimal ${MIN_LIFT_PERCENT}% dari A.`;
    case "A_BETTER":
      return `Median A unggul minimal ${MIN_LIFT_PERCENT}% dari B.`;
    case "TOO_CLOSE":
      return `Selisih median kurang dari ${MIN_LIFT_PERCENT}%.`;
  }
}

/** Aturan usulan dan batasnya; selalu tampil di dekat usulan (E7). */
export const PROPOSAL_DISCLAIMER = `Usulan dihitung dengan aturan sederhana (minimal ${EXPERIMENT_MIN_POSTS_PER_VARIANT} post per varian dan selisih median minimal ${MIN_LIFT_PERCENT}%), bukan uji statistik. Keputusan akhir tetap di tanganmu.`;

export function waitingH7Text(waitingCount: number): string {
  return `Menunggu H+7 untuk ${waitingCount} post`;
}

/** Status singkat eksperimen berjalan (kartu daftar). */
export function comparisonStatusText(comparison: ExperimentComparison): string {
  switch (comparison.status) {
    case "EMPTY":
      return "Belum ada post";
    case "WAITING_H7":
      return waitingH7Text(comparison.waitingCount);
    case "READY":
      return `Siap disimpulkan · usulan ${EXPERIMENT_RESULT_LABELS[comparison.proposal]}`;
  }
}
