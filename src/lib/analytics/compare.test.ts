import { describe, expect, it } from "vitest";
import { comparePlatforms, type ComparablePost } from "./compare";

function post(partial: Partial<ComparablePost> & { contentId: string; platform: ComparablePost["platform"] }): ComparablePost {
  return {
    id: `${partial.contentId}-${partial.platform}`,
    title: `Konten ${partial.contentId}`,
    postedAt: new Date("2026-11-01T12:00:00Z"),
    views: 1000,
    er: 5,
    score: 100,
    relativeScore: 1,
    ...partial,
  };
}

const always = () => true;

describe("comparePlatforms", () => {
  it("data kosong → kosong", () => {
    expect(comparePlatforms([], always)).toEqual([]);
  });

  it("hanya konten yang punya snapshot di kedua platform; tidak ada angka gabungan", () => {
    const rows = comparePlatforms(
      [
        post({ contentId: "a", platform: "TIKTOK", views: 111 }),
        post({ contentId: "a", platform: "INSTAGRAM", views: 222 }),
        post({ contentId: "satu", platform: "TIKTOK" }),
        post({ contentId: "kosong", platform: "TIKTOK" }),
        post({ contentId: "kosong", platform: "INSTAGRAM", score: null }),
      ],
      always,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tiktok.views).toBe(111);
    expect(rows[0].instagram.views).toBe(222);
    expect(Object.keys(rows[0]).sort()).toEqual(["contentId", "instagram", "tiktok", "title"]);
  });

  it("masuk rentang jika salah satu versi tayang dalam rentang", () => {
    const from = new Date("2026-10-15T00:00:00Z");
    const inRange = (p: ComparablePost) => p.postedAt >= from;
    const rows = comparePlatforms(
      [
        post({ contentId: "lama", platform: "TIKTOK", postedAt: new Date("2026-09-01T00:00:00Z") }),
        post({ contentId: "lama", platform: "INSTAGRAM", postedAt: new Date("2026-09-02T00:00:00Z") }),
        post({ contentId: "tepi", platform: "TIKTOK", postedAt: new Date("2026-10-10T00:00:00Z") }),
        post({ contentId: "tepi", platform: "INSTAGRAM", postedAt: new Date("2026-10-20T00:00:00Z") }),
      ],
      inRange,
    );
    expect(rows.map((r) => r.contentId)).toEqual(["tepi"]);
  });

  it("urut terbaru lebih dulu", () => {
    const rows = comparePlatforms(
      [
        post({ contentId: "lama", platform: "TIKTOK", postedAt: new Date("2026-10-01T00:00:00Z") }),
        post({ contentId: "lama", platform: "INSTAGRAM", postedAt: new Date("2026-10-01T00:00:00Z") }),
        post({ contentId: "baru", platform: "TIKTOK", postedAt: new Date("2026-10-05T00:00:00Z") }),
        post({ contentId: "baru", platform: "INSTAGRAM", postedAt: new Date("2026-10-06T00:00:00Z") }),
      ],
      always,
    );
    expect(rows.map((r) => r.contentId)).toEqual(["baru", "lama"]);
  });

  it("skor relatif null dan views 0 tetap ikut, tanpa NaN", () => {
    const rows = comparePlatforms(
      [
        post({ contentId: "a", platform: "TIKTOK", relativeScore: null, views: 0, er: 0, score: 0 }),
        post({ contentId: "a", platform: "INSTAGRAM" }),
      ],
      always,
    );
    expect(rows[0].tiktok).toMatchObject({ relativeScore: null, views: 0, er: 0, score: 0 });
  });
});
