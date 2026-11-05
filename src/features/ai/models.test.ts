import { describe, expect, it } from "vitest";
import { computeRunCost, EMPTY_RUN_COST, estimateInputTokens, MOCK_MODEL, priceOf, worstCaseCostUsd } from "./models";

describe("computeRunCost", () => {
  it("menghitung biaya Opus 5.5 termasuk baca/tulis cache", () => {
    const cost = computeRunCost(
      { input_tokens: 1000, output_tokens: 2000, cache_read_input_tokens: 3000, cache_creation_input_tokens: 4000 },
      "claude-opus-5-5",
    );
    // 1000×4 + 2000×20 + 3000×0,2 + 4000×5 = 64.600 per juta
    expect(cost).toEqual({
      inputTokens: 1000,
      outputTokens: 2000,
      cacheReadTokens: 3000,
      cacheWriteTokens: 4000,
      costUsd: 0.0646,
    });
  });

  it("memakai harga per model di setiap percobaan saat fallback", () => {
    const cost = computeRunCost(
      {
        input_tokens: 500,
        output_tokens: 100,
        iterations: [
          { model: null, input_tokens: 1000, output_tokens: 0 },
          { model: "claude-opus-4-8", input_tokens: 1000, output_tokens: 1000 },
        ],
      },
      "claude-opus-5-5",
    );
    // Opus 5.5: 1000×4 = 4000; Opus 4.8: 1000×5 + 1000×25 = 30.000 → total 34.000 per juta
    expect(cost.costUsd).toBeCloseTo(0.034, 6);
    expect(cost.inputTokens).toBe(2000);
    expect(cost.outputTokens).toBe(1000);
  });

  it("mode uji gratis, usage kosong → nol", () => {
    expect(computeRunCost({ input_tokens: 10_000, output_tokens: 10_000 }, MOCK_MODEL).costUsd).toBe(0);
    expect(computeRunCost(null, "claude-opus-5-5")).toEqual(EMPTY_RUN_COST);
  });

  it("biaya terburuk untuk reservasi: input tanpa cache + max_tokens output; fallback pakai harga termahal", () => {
    expect(estimateInputTokens(3000, 2)).toBe(1000 + 2200);
    // Opus 5.5 punya fallback → harga termahal (5/25): 1000×5 + 16000×25 = 405.000 per juta
    expect(worstCaseCostUsd("claude-opus-5-5", 1000, 16_000)).toBeCloseTo(0.405, 6);
    // Haiku tanpa fallback → harganya sendiri: 1000×0,1 + 16000×0,5 = 8.100 per juta
    expect(worstCaseCostUsd("claude-haiku-5-5", 1000, 16_000)).toBeCloseTo(0.0081, 6);
  });

  it("model tak dikenal dihitung dengan harga termahal (batas biaya tidak kebobolan)", () => {
    expect(priceOf("claude-model-baru").output).toBeGreaterThanOrEqual(priceOf("claude-opus-5-5").output);
  });
});
