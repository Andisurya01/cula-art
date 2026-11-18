import { describe, expect, it } from "vitest";
import {
  compareExperiment,
  DECIDING_METRICS,
  metricValue,
  proposeResult,
  type ExperimentPostInput,
  type VariantStats,
} from "./experiments";
import type { MetricInput } from "./metrics";

/** Skor tepat `score` dengan bobot default (likes × 1 per 1.000 views). */
const withScore = (score: number, views = 1000): MetricInput => ({
  views,
  likes: (score * views) / 1000,
  comments: 0,
  shares: 0,
  saves: 0,
  follows: 0,
});

let seq = 0;
function post(variant: "A" | "B", h7: MetricInput | null, platform: ExperimentPostInput["platform"] = "TIKTOK"): ExperimentPostInput {
  seq += 1;
  return { postId: `p${seq}`, platform, variant, h7 };
}

const variant = (count: number, median: number | null): VariantStats => ({ count, median, values: [] });

describe("metricValue", () => {
  const m: MetricInput = { views: 2000, likes: 100, comments: 10, shares: 20, saves: 40, follows: 4 };

  it("rumus PRD per metrik", () => {
    expect(metricValue("SCORE", m)).toBeCloseTo(((100 + 20 + 60 + 120 + 20) / 2000) * 1000);
    expect(metricValue("ER", m)).toBeCloseTo(8.5);
    expect(metricValue("SAVE_RATE", m)).toBeCloseTo(2);
    expect(metricValue("SHARE_RATE", m)).toBeCloseTo(1);
    expect(metricValue("FOLLOW_RATE", m)).toBeCloseTo(2);
    expect(metricValue("VIEWS", m)).toBe(2000);
  });

  it("views = 0 → semua metrik 0, bukan NaN", () => {
    const zero: MetricInput = { views: 0, likes: 5, comments: 1, shares: 1, saves: 1, follows: 1 };
    for (const metric of DECIDING_METRICS) expect(metricValue(metric, zero)).toBe(0);
  });

  it("bobot skor dari Pengaturan dipakai", () => {
    expect(metricValue("SCORE", m, { likes: 0, comments: 0, shares: 0, saves: 0, follows: 1000 })).toBeCloseTo(2000);
  });
});

describe("compareExperiment", () => {
  it("tanpa post → EMPTY", () => {
    expect(compareExperiment({ platform: "TIKTOK", metric: "SCORE", posts: [] })).toEqual({ status: "EMPTY" });
  });

  it("ada post tanpa H+7 → menunggu H+7 untuk N post", () => {
    const posts = [post("A", withScore(10)), post("A", null), post("B", null)];
    expect(compareExperiment({ platform: "TIKTOK", metric: "SCORE", posts })).toEqual({
      status: "WAITING_H7",
      waitingCount: 2,
      total: 3,
    });
  });

  it("B unggul ≥ 10% dengan ≥ 2 post per varian → Terbukti, selisih %", () => {
    const posts = [post("A", withScore(100)), post("A", withScore(100)), post("B", withScore(110)), post("B", withScore(130))];
    const result = compareExperiment({ platform: "TIKTOK", metric: "SCORE", posts });
    expect(result).toMatchObject({ status: "READY", proposal: "SUPPORTED", reason: "B_BETTER" });
    if (result.status !== "READY") throw new Error();
    expect(result.a).toMatchObject({ count: 2, median: 100 });
    expect(result.b.median).toBeCloseTo(120);
    expect(result.diffPercent).toBeCloseTo(20);
    expect(result.b.values.map((v) => v.value)).toEqual([110, 130]);
  });

  it("A unggul ≥ 10% → Tidak terbukti; selisih < 10% → Belum jelas", () => {
    const rejected = compareExperiment({
      platform: "TIKTOK",
      metric: "SCORE",
      posts: [post("A", withScore(110)), post("A", withScore(110)), post("B", withScore(100)), post("B", withScore(100))],
    });
    expect(rejected).toMatchObject({ proposal: "REJECTED", reason: "A_BETTER" });
    const close = compareExperiment({
      platform: "TIKTOK",
      metric: "SCORE",
      posts: [post("A", withScore(100)), post("A", withScore(100)), post("B", withScore(109)), post("B", withScore(109))],
    });
    expect(close).toMatchObject({ proposal: "INCONCLUSIVE", reason: "TOO_CLOSE" });
  });

  it("kurang dari 2 post di salah satu varian → Belum jelas meski selisih besar", () => {
    const result = compareExperiment({
      platform: "TIKTOK",
      metric: "VIEWS",
      posts: [post("A", withScore(1, 100)), post("B", withScore(1, 9000)), post("B", withScore(1, 9000))],
    });
    expect(result).toMatchObject({ status: "READY", proposal: "INCONCLUSIVE", reason: "NOT_ENOUGH_POSTS" });
  });

  it("platform lain diabaikan (juga untuk status menunggu)", () => {
    const posts = [post("A", withScore(10)), post("B", withScore(20)), post("B", null, "INSTAGRAM")];
    const result = compareExperiment({ platform: "TIKTOK", metric: "SCORE", posts });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") throw new Error();
    expect(result.a.count + result.b.count).toBe(2);
  });

  it("varian kosong: median null; median A 0 → selisih null (tak terhingga), keduanya 0 → 0", () => {
    const onlyB = compareExperiment({ platform: "TIKTOK", metric: "SCORE", posts: [post("B", withScore(10))] });
    expect(onlyB).toMatchObject({ status: "READY", a: { count: 0, median: null }, diffPercent: null });
    const zeroA = compareExperiment({
      platform: "TIKTOK",
      metric: "SCORE",
      posts: [post("A", withScore(0, 0)), post("A", withScore(0, 0)), post("B", withScore(5)), post("B", withScore(5))],
    });
    expect(zeroA).toMatchObject({ diffPercent: null, proposal: "SUPPORTED" });
    const bothZero = compareExperiment({
      platform: "TIKTOK",
      metric: "ER",
      posts: [post("A", withScore(0, 0)), post("A", withScore(0, 0)), post("B", withScore(0, 0)), post("B", withScore(0, 0))],
    });
    expect(bothZero).toMatchObject({ diffPercent: 0, proposal: "INCONCLUSIVE", reason: "TOO_CLOSE" });
  });
});

describe("proposeResult: batas 10%", () => {
  it("tepat 10% unggul → Terbukti / Tidak terbukti", () => {
    expect(proposeResult(variant(2, 100), variant(2, 110)).proposal).toBe("SUPPORTED");
    expect(proposeResult(variant(2, 110), variant(3, 100)).proposal).toBe("REJECTED");
    expect(proposeResult(variant(2, 100), variant(2, 109.9)).proposal).toBe("INCONCLUSIVE");
  });
});
