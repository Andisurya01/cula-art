import { describe, expect, it } from "vitest";
import {
  contentScore,
  DEFAULT_SCORE_WEIGHTS,
  engagementRate,
  followRate,
  median,
  relativeScore,
  saveRate,
  shareRate,
  type MetricInput,
} from "./metrics";

const sample: MetricInput = {
  views: 1000,
  likes: 50,
  comments: 10,
  shares: 5,
  saves: 15,
  follows: 4,
};

const zeroViews: MetricInput = { ...sample, views: 0 };

describe("rates", () => {
  it("menghitung ER, save, share, follow rate", () => {
    expect(engagementRate(sample)).toBeCloseTo(8);
    expect(saveRate(sample)).toBeCloseTo(1.5);
    expect(shareRate(sample)).toBeCloseTo(0.5);
    expect(followRate(sample)).toBeCloseTo(4);
  });

  it("views = 0 menghasilkan 0, bukan NaN/Infinity", () => {
    expect(engagementRate(zeroViews)).toBe(0);
    expect(saveRate(zeroViews)).toBe(0);
    expect(shareRate(zeroViews)).toBe(0);
    expect(followRate(zeroViews)).toBe(0);
    expect(contentScore(zeroViews)).toBe(0);
  });

  it("semua nol menghasilkan 0", () => {
    const empty: MetricInput = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, follows: 0 };
    expect(engagementRate(empty)).toBe(0);
    expect(contentScore(empty)).toBe(0);
  });
});

describe("contentScore", () => {
  it("memakai bobot default", () => {
    // (50 + 2·10 + 3·5 + 3·15 + 5·4) / 1000 × 1000 = 150
    expect(contentScore(sample)).toBeCloseTo(150);
    expect(contentScore(sample, DEFAULT_SCORE_WEIGHTS)).toBeCloseTo(150);
  });

  it("memakai bobot kustom", () => {
    const weights = { likes: 1, comments: 1, shares: 1, saves: 1, follows: 1 };
    expect(contentScore(sample, weights)).toBeCloseTo(84);
  });
});

describe("median", () => {
  it("data kosong → 0", () => {
    expect(median([])).toBe(0);
  });

  it("ganjil dan genap", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("mengabaikan nilai tidak hingga", () => {
    expect(median([1, Number.NaN, 3])).toBe(2);
  });
});

describe("relativeScore", () => {
  it("skor / median post sebelumnya", () => {
    expect(relativeScore(150, [100, 100, 100])).toBeCloseTo(1.5);
  });

  it("hanya memakai 10 post terakhir", () => {
    const previous = [...Array(10).fill(100), ...Array(20).fill(1000)];
    expect(relativeScore(200, previous)).toBeCloseTo(2);
  });

  it("tanpa pembanding atau median 0 → 0", () => {
    expect(relativeScore(150, [])).toBe(0);
    expect(relativeScore(150, [0, 0, 0])).toBe(0);
  });
});
