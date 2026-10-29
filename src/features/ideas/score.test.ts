import { describe, expect, it } from "vitest";
import { MAX_IDEA_SCORE, compareByScore, ideaScore, sortIdeas } from "./score";

describe("ideaScore", () => {
  it("menghitung potensi × (6 − effort)", () => {
    expect(ideaScore(4, 2)).toBe(16);
    expect(ideaScore(3, 3)).toBe(9);
  });

  it("rentang 1 sampai 25", () => {
    expect(ideaScore(1, 5)).toBe(1);
    expect(ideaScore(5, 1)).toBe(MAX_IDEA_SCORE);
  });

  it("null jika potensi atau effort kosong", () => {
    expect(ideaScore(null, 3)).toBeNull();
    expect(ideaScore(3, null)).toBeNull();
    expect(ideaScore(undefined, undefined)).toBeNull();
    expect(ideaScore(null, null)).toBeNull();
  });

  it("null jika nilai di luar 1-5 atau bukan bilangan bulat", () => {
    expect(ideaScore(0, 3)).toBeNull();
    expect(ideaScore(6, 3)).toBeNull();
    expect(ideaScore(3, 0)).toBeNull();
    expect(ideaScore(2.5, 3)).toBeNull();
    expect(ideaScore(Number.NaN, 3)).toBeNull();
  });
});

type Row = { id: string; potential: number | null; effort: number | null; createdAt: Date };

function row(id: string, potential: number | null, effort: number | null, day: number): Row {
  return { id, potential, effort, createdAt: new Date(Date.UTC(2026, 0, day)) };
}

describe("sortIdeas", () => {
  const ideas: Row[] = [
    row("kosong-baru", null, null, 10),
    row("rendah", 1, 5, 2),
    row("tinggi", 5, 1, 1),
    row("sedang-lama", 3, 3, 3),
    row("sedang-baru", 3, 3, 4),
    row("potensi-saja", 5, null, 9),
    row("effort-saja", null, 1, 8),
  ];

  it("urut skor: tertinggi dulu, skor sama → terbaru, tanpa skor paling bawah", () => {
    expect(sortIdeas(ideas, "score").map((i) => i.id)).toEqual([
      "tinggi",
      "sedang-baru",
      "sedang-lama",
      "rendah",
      "kosong-baru",
      "potensi-saja",
      "effort-saja",
    ]);
  });

  it("urut terbaru: createdAt menurun tanpa melihat skor", () => {
    expect(sortIdeas(ideas, "newest").map((i) => i.id)).toEqual([
      "kosong-baru",
      "potensi-saja",
      "effort-saja",
      "sedang-baru",
      "sedang-lama",
      "rendah",
      "tinggi",
    ]);
  });

  it("tidak mengubah array asal dan aman untuk data kosong", () => {
    const copy = [...ideas];
    sortIdeas(ideas, "score");
    expect(ideas).toEqual(copy);
    expect(sortIdeas([], "score")).toEqual([]);
  });

  it("ide tanpa skor selalu di bawah ide berskor terendah", () => {
    expect(compareByScore(row("a", null, null, 30), row("b", 1, 5, 1))).toBeGreaterThan(0);
    expect(compareByScore(row("a", 1, 5, 1), row("b", null, 2, 30))).toBeLessThan(0);
  });
});
