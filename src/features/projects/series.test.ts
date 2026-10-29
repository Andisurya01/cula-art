import { describe, expect, it } from "vitest";
import { buildSeriesItems, nextSeriesPart } from "./series";

describe("nextSeriesPart", () => {
  it("mulai dari 1 jika belum ada part", () => {
    expect(nextSeriesPart([])).toBe(1);
    expect(nextSeriesPart([null, undefined])).toBe(1);
  });

  it("melanjutkan dari part terbesar, bukan jumlah konten", () => {
    expect(nextSeriesPart([1, 2, 3])).toBe(4);
    expect(nextSeriesPart([5, null, 2])).toBe(6);
  });
});

describe("buildSeriesItems", () => {
  it("membuat judul berurutan dari part awal", () => {
    expect(buildSeriesItems("Patung kepala naga", 1, 3)).toEqual([
      { part: 1, title: "Patung kepala naga — Part 1" },
      { part: 2, title: "Patung kepala naga — Part 2" },
      { part: 3, title: "Patung kepala naga — Part 3" },
    ]);
  });

  it("melanjutkan nomor part yang sudah ada", () => {
    expect(buildSeriesItems("  Naga ", 5, 2).map((i) => i.title)).toEqual([
      "Naga — Part 5",
      "Naga — Part 6",
    ]);
  });

  it("kosong jika judul kosong atau jumlah tidak valid", () => {
    expect(buildSeriesItems("   ", 1, 3)).toEqual([]);
    expect(buildSeriesItems("Naga", 1, 0)).toEqual([]);
    expect(buildSeriesItems("Naga", 1, Number.NaN)).toEqual([]);
  });
});
