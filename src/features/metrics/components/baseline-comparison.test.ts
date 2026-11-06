import { describe, expect, it } from "vitest";
import { compareToBaseline } from "./baseline-comparison";

describe("compareToBaseline", () => {
  it("pembanding kurang dari 3: tidak bisa dibandingkan", () => {
    expect(compareToBaseline({ score: 150, baselineMedian: null, baselineCount: 2 })).toEqual({
      kind: "NOT_ENOUGH",
    });
    expect(compareToBaseline({ score: null, baselineMedian: null, baselineCount: 0 })).toEqual({
      kind: "NOT_ENOUGH",
    });
  });

  it("belum ada skor", () => {
    expect(compareToBaseline({ score: null, baselineMedian: 100, baselineCount: 5 })).toEqual({
      kind: "NO_SCORE",
    });
  });

  it("lebih tinggi", () => {
    expect(compareToBaseline({ score: 150, baselineMedian: 100, baselineCount: 3 })).toEqual({
      kind: "HIGHER",
      percent: 50,
    });
  });

  it("lebih rendah, persen positif", () => {
    expect(compareToBaseline({ score: 75, baselineMedian: 100, baselineCount: 10 })).toEqual({
      kind: "LOWER",
      percent: 25,
    });
  });

  it("sama dengan median, termasuk selisih yang tampil 0,0%", () => {
    expect(compareToBaseline({ score: 100, baselineMedian: 100, baselineCount: 3 })).toEqual({ kind: "SAME" });
    expect(compareToBaseline({ score: 100.01, baselineMedian: 100, baselineCount: 3 })).toEqual({ kind: "SAME" });
  });

  it("median 0 tidak menghasilkan NaN atau Infinity", () => {
    expect(compareToBaseline({ score: 12, baselineMedian: 0, baselineCount: 3 })).toEqual({
      kind: "HIGHER",
      percent: null,
    });
    expect(compareToBaseline({ score: 0, baselineMedian: 0, baselineCount: 3 })).toEqual({ kind: "SAME" });
  });

  it("skor 0 (views = 0) tetap dibandingkan", () => {
    expect(compareToBaseline({ score: 0, baselineMedian: 100, baselineCount: 3 })).toEqual({
      kind: "LOWER",
      percent: 100,
    });
  });
});
