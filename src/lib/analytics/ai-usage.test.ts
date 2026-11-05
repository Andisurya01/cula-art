import { describe, expect, it } from "vitest";
import { estimateCallCost, summarizeAiUsage, type AiRunRecord } from "./ai-usage";

const run = (overrides: Partial<AiRunRecord> = {}): AiRunRecord => ({
  status: "OK",
  inputTokens: 100,
  outputTokens: 50,
  cacheReadTokens: 10,
  cacheWriteTokens: 5,
  costUsd: 0.04,
  accepted: false,
  ...overrides,
});

describe("summarizeAiUsage", () => {
  it("data kosong → semua 0, bukan NaN", () => {
    const summary = summarizeAiUsage([], 10);
    expect(summary.calls).toBe(0);
    expect(summary.acceptedPercent).toBe(0);
    expect(summary.budgetUsedPercent).toBe(0);
    expect(Object.values(summary).every((v) => Number.isFinite(v))).toBe(true);
  });

  it("menjumlahkan token dan biaya; % dipakai dihitung dari run OK saja", () => {
    const summary = summarizeAiUsage(
      [
        run({ accepted: true }),
        run(),
        run({ status: "ERROR", costUsd: 0.01, accepted: false }),
        run({ status: "REFUSED", costUsd: 0 }),
        run({ status: "RUNNING", costUsd: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
      ],
      0.5,
    );
    expect(summary.calls).toBe(5);
    expect(summary.okCalls).toBe(2);
    expect(summary.failedCalls).toBe(1);
    expect(summary.refusedCalls).toBe(1);
    expect(summary.runningCalls).toBe(1);
    expect(summary.acceptedCalls).toBe(1);
    expect(summary.acceptedPercent).toBe(50);
    expect(summary.costUsd).toBeCloseTo(0.09, 6);
    expect(summary.budgetUsedPercent).toBeCloseTo(18, 6);
    expect(summary.totalTokens).toBe(4 * 165);
  });

  it("batas bulanan 0 → persentase 0 (bukan Infinity)", () => {
    expect(summarizeAiUsage([run()], 0).budgetUsedPercent).toBe(0);
  });
});

describe("estimateCallCost", () => {
  it("tanpa riwayat → angka awal", () => {
    expect(estimateCallCost([], 0.05)).toBe(0.05);
    expect(estimateCallCost([{ status: "ERROR", costUsd: 1 }], 0.05)).toBe(0.05);
  });

  it("median 20 run OK terbaru", () => {
    const runs = [
      { status: "OK" as const, costUsd: 0.02 },
      { status: "ERROR" as const, costUsd: 5 },
      { status: "OK" as const, costUsd: 0.06 },
      { status: "OK" as const, costUsd: 0.03 },
      ...Array.from({ length: 30 }, () => ({ status: "OK" as const, costUsd: 9 })),
    ];
    expect(estimateCallCost(runs.slice(0, 4), 0.5)).toBeCloseTo(0.03, 6);
    // Hanya 20 run OK pertama: 3 murah + 17 mahal → median mahal.
    expect(estimateCallCost(runs, 0.5)).toBe(9);
  });
});
