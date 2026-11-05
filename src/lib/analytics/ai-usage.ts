// Angka pemakaian Asisten AI (tab Panduan AI, perkiraan biaya di panel). Fungsi murni.

import { median } from "./metrics";

export type AiRunStatusValue = "RUNNING" | "OK" | "ERROR" | "REFUSED";

export type AiRunRecord = {
  status: AiRunStatusValue;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  accepted: boolean;
};

export type AiUsageSummary = {
  /** Semua panggilan yang dikirim (termasuk gagal dan yang masih berjalan). */
  calls: number;
  okCalls: number;
  failedCalls: number;
  refusedCalls: number;
  /** Masih berjalan, atau tertinggal karena server mati di tengah panggilan (tetap dihitung batas). */
  runningCalls: number;
  /** Semua token (input + output + baca/tulis cache). */
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  acceptedCalls: number;
  /** Persentase run OK yang drafnya dipakai (0-100); 0 jika belum ada run OK. */
  acceptedPercent: number;
  /** Persentase batas bulanan yang sudah terpakai (0-100+); 0 jika batas 0. */
  budgetUsedPercent: number;
};

export function summarizeAiUsage(runs: readonly AiRunRecord[], monthlyBudgetUsd: number): AiUsageSummary {
  const sum = (pick: (r: AiRunRecord) => number) => runs.reduce((total, r) => total + pick(r), 0);
  const okCalls = runs.filter((r) => r.status === "OK").length;
  const acceptedCalls = runs.filter((r) => r.status === "OK" && r.accepted).length;
  const inputTokens = sum((r) => r.inputTokens);
  const outputTokens = sum((r) => r.outputTokens);
  const cacheReadTokens = sum((r) => r.cacheReadTokens);
  const cacheWriteTokens = sum((r) => r.cacheWriteTokens);
  const costUsd = roundUsd(sum((r) => r.costUsd));
  return {
    calls: runs.length,
    okCalls,
    failedCalls: runs.filter((r) => r.status === "ERROR").length,
    refusedCalls: runs.filter((r) => r.status === "REFUSED").length,
    runningCalls: runs.filter((r) => r.status === "RUNNING").length,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costUsd,
    acceptedCalls,
    acceptedPercent: okCalls > 0 ? (acceptedCalls / okCalls) * 100 : 0,
    budgetUsedPercent: monthlyBudgetUsd > 0 ? (costUsd / monthlyBudgetUsd) * 100 : 0,
  };
}

/** Jumlah run terakhir yang dipakai untuk perkiraan biaya. */
export const COST_ESTIMATE_SAMPLE = 20;

/**
 * Perkiraan biaya satu panggilan: median biaya run OK terbaru (input diurutkan dari terbaru), maks.
 * `COST_ESTIMATE_SAMPLE` run. Tanpa riwayat → `fallbackUsd`.
 */
export function estimateCallCost(
  recentRuns: readonly Pick<AiRunRecord, "status" | "costUsd">[],
  fallbackUsd: number,
): number {
  const costs = recentRuns
    .filter((r) => r.status === "OK")
    .slice(0, COST_ESTIMATE_SAMPLE)
    .map((r) => r.costUsd);
  return costs.length ? roundUsd(median(costs)) : fallbackUsd;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
