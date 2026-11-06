import { describe, expect, it } from "vitest";
import type { MetricInput } from "./metrics";
import { scorePosts, topAndBottomPosts, type ScoringInput } from "./scoring";

const DAY = 86_400_000;
const START = new Date("2026-01-01T12:00:00.000Z").getTime();

/** Metrik dengan skor tepat `score` (bobot default: likes × 1 per 1.000 views). */
function metricsFor(score: number): MetricInput {
  return { views: 1000, likes: score, comments: 0, shares: 0, saves: 0, follows: 0 };
}

function post(
  id: string,
  day: number,
  score: number | null,
  platform: ScoringInput["platform"] = "TIKTOK",
): ScoringInput {
  return {
    id,
    platform,
    postedAt: new Date(START + day * DAY),
    metrics: score === null ? null : metricsFor(score),
  };
}

describe("scorePosts", () => {
  it("data kosong → map kosong", () => {
    expect(scorePosts([]).size).toBe(0);
  });

  it("post tanpa snapshot: skor null dan tidak jadi pembanding", () => {
    const scores = scorePosts([
      post("a", 0, 100),
      post("b", 1, null),
      post("c", 2, 100),
      post("d", 3, 100),
      post("e", 4, 200),
    ]);
    expect(scores.get("b")).toMatchObject({ score: null, relativeScore: null });
    // "e" punya 3 pembanding (a, c, d); "b" tidak dihitung.
    expect(scores.get("e")).toMatchObject({ score: 200, relativeScore: 2, baselineCount: 3 });
  });

  it("pembanding kurang dari 3 → skor relatif dan median null (D4)", () => {
    const scores = scorePosts([post("a", 0, 100), post("b", 1, 100), post("c", 2, 100)]);
    expect(scores.get("a")).toMatchObject({ score: 100, relativeScore: null, baselineMedian: null, baselineCount: 0 });
    expect(scores.get("c")).toMatchObject({ score: 100, relativeScore: null, baselineMedian: null, baselineCount: 2 });
  });

  it("median dari post SEBELUMNYA saja; post sesudahnya tidak berpengaruh", () => {
    const scores = scorePosts([
      post("a", 0, 10),
      post("b", 1, 20),
      post("c", 2, 30),
      post("d", 3, 40),
      post("nanti", 4, 100000),
    ]);
    expect(scores.get("d")?.baselineMedian).toBe(20);
    expect(scores.get("d")?.relativeScore).toBe(2);
  });

  it("urutan input tidak berpengaruh (diurutkan menurut postedAt)", () => {
    const scores = scorePosts([post("d", 3, 40), post("b", 1, 20), post("a", 0, 10), post("c", 2, 30)]);
    expect(scores.get("d")?.baselineMedian).toBe(20);
    expect(scores.get("a")?.baselineCount).toBe(0);
  });

  it("hanya memakai 10 post terakhir sebagai pembanding", () => {
    const old = Array.from({ length: 20 }, (_, i) => post(`lama-${i}`, i, 1000));
    const recent = Array.from({ length: 10 }, (_, i) => post(`baru-${i}`, 20 + i, 100));
    const scores = scorePosts([...old, ...recent, post("x", 40, 300)]);
    expect(scores.get("x")).toMatchObject({ baselineMedian: 100, relativeScore: 3, baselineCount: 10 });
  });

  it("TikTok dan Instagram tidak pernah saling jadi pembanding", () => {
    const scores = scorePosts([
      post("t1", 0, 10, "TIKTOK"),
      post("t2", 1, 10, "TIKTOK"),
      post("t3", 2, 10, "TIKTOK"),
      post("t4", 3, 20, "TIKTOK"),
      post("i1", 0, 1000, "INSTAGRAM"),
      post("i2", 1, 1000, "INSTAGRAM"),
      post("i3", 2, 1000, "INSTAGRAM"),
      post("i4", 3, 500, "INSTAGRAM"),
      // Dua post pertama platform lain, walau tayang paling akhir, belum punya pembanding.
    ]);
    expect(scores.get("t4")).toMatchObject({ baselineMedian: 10, relativeScore: 2 });
    expect(scores.get("i4")).toMatchObject({ baselineMedian: 1000, relativeScore: 0.5 });
  });

  it("views = 0: skor 0 (bukan NaN), tetap jadi pembanding", () => {
    const zero: ScoringInput = {
      id: "nol",
      platform: "TIKTOK",
      postedAt: new Date(START),
      metrics: { views: 0, likes: 5, comments: 1, shares: 1, saves: 1, follows: 1 },
    };
    const scores = scorePosts([zero, post("b", 1, 100), post("c", 2, 100), post("d", 3, 100)]);
    expect(scores.get("nol")?.score).toBe(0);
    expect(scores.get("d")).toMatchObject({ baselineMedian: 100, relativeScore: 1 });
  });

  it("views = 0 pada post yang dinilai: skor relatif 0, bukan NaN", () => {
    const zero: ScoringInput = {
      id: "nol",
      platform: "TIKTOK",
      postedAt: new Date(START + 10 * DAY),
      metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, follows: 0 },
    };
    const scores = scorePosts([post("a", 0, 100), post("b", 1, 100), post("c", 2, 100), zero]);
    expect(scores.get("nol")).toMatchObject({ score: 0, relativeScore: 0, baselineMedian: 100 });
  });

  it("median pembanding 0 → skor relatif null, bukan Infinity", () => {
    const scores = scorePosts([post("a", 0, 0), post("b", 1, 0), post("c", 2, 0), post("d", 3, 50)]);
    expect(scores.get("d")).toMatchObject({ score: 50, baselineMedian: 0, relativeScore: null, baselineCount: 3 });
  });

  it("memakai bobot dari Setting", () => {
    const weights = { likes: 2, comments: 0, shares: 0, saves: 0, follows: 0 };
    const scores = scorePosts([post("a", 0, 10)], weights);
    expect(scores.get("a")?.score).toBe(20);
  });
});

describe("topAndBottomPosts", () => {
  const row = (id: string, relativeScore: number | null) => ({ id, relativeScore });

  it("data kosong → dua daftar kosong", () => {
    expect(topAndBottomPosts([])).toEqual({ top: [], bottom: [] });
  });

  it("post tanpa skor relatif tidak ikut (D4)", () => {
    const { top, bottom } = topAndBottomPosts([row("a", 1), row("b", null)]);
    expect(top.map((p) => p.id)).toEqual(["a"]);
    expect(bottom).toEqual([]);
  });

  it("top menurun, bottom dari yang terendah, tanpa tumpang tindih", () => {
    const rows = [0.5, 1.5, 0.8, 1.2, 2.0, 0.3, 1.0, 0.9, 1.1, 1.3, 0.7, 1.4].map((v, i) => row(`p${i}`, v));
    const { top, bottom } = topAndBottomPosts(rows);
    expect(top.map((p) => p.relativeScore)).toEqual([2, 1.5, 1.4, 1.3, 1.2]);
    expect(bottom.map((p) => p.relativeScore)).toEqual([0.3, 0.5, 0.7, 0.8, 0.9]);
  });

  it("data sedikit: satu post hanya di satu daftar", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((v) => row(`p${v}`, v));
    const { top, bottom } = topAndBottomPosts(rows);
    expect(top.map((p) => p.id)).toEqual(["p6", "p5", "p4", "p3", "p2"]);
    expect(bottom.map((p) => p.id)).toEqual(["p1"]);
  });

  it("tidak mengubah array input", () => {
    const rows = [row("a", 1), row("b", 2)];
    topAndBottomPosts(rows);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
