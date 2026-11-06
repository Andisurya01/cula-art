import { describe, expect, it } from "vitest";
import { engagementRate } from "./metrics";
import { wibToUtc } from "@/lib/date";
import { computeKpi, followerSeries, followersGained, rangeStart, type FollowerPoint } from "./kpi";

const point = (platform: FollowerPoint["platform"], date: string, followers: number): FollowerPoint => ({
  platform,
  date: wibToUtc(date),
  followers,
});

describe("rangeStart", () => {
  it("hari ini dihitung sebagai hari ke-N, batas bawah 00.00 WIB", () => {
    const now = wibToUtc("2026-11-05", "23:30");
    expect(rangeStart(now, 7)).toEqual(wibToUtc("2026-10-30"));
    expect(rangeStart(now, 1)).toEqual(wibToUtc("2026-11-05"));
    expect(rangeStart(now, 30)).toEqual(wibToUtc("2026-10-07"));
  });

  it("mengikuti tanggal WIB, bukan UTC, saat dekat tengah malam", () => {
    // 00.30 WIB tanggal 5 = 17.30 UTC tanggal 4.
    const now = wibToUtc("2026-11-05", "00:30");
    expect(now.toISOString().startsWith("2026-11-04")).toBe(true);
    expect(rangeStart(now, 1)).toEqual(wibToUtc("2026-11-05"));
  });
});

describe("followersGained (D10)", () => {
  it("data kosong dan satu snapshot → null", () => {
    expect(followersGained([], "TIKTOK")).toBeNull();
    expect(followersGained([point("TIKTOK", "2026-11-01", 100)], "TIKTOK")).toBeNull();
  });

  it("terakhir dikurangi pertama, urutan input tidak berpengaruh", () => {
    const points = [
      point("TIKTOK", "2026-11-03", 130),
      point("TIKTOK", "2026-11-01", 100),
      point("TIKTOK", "2026-11-02", 500),
    ];
    expect(followersGained(points, "TIKTOK")).toBe(30);
  });

  it("boleh negatif", () => {
    const points = [point("TIKTOK", "2026-11-01", 100), point("TIKTOK", "2026-11-02", 90)];
    expect(followersGained(points, "TIKTOK")).toBe(-10);
  });

  it("per platform: dua snapshot beda platform bukan pasangan", () => {
    const points = [point("TIKTOK", "2026-11-01", 100), point("INSTAGRAM", "2026-11-02", 5000)];
    expect(followersGained(points, "TIKTOK")).toBeNull();
    expect(followersGained(points, "INSTAGRAM")).toBeNull();
    expect(followerSeries(points, "INSTAGRAM")).toHaveLength(1);
  });
});

describe("computeKpi", () => {
  it("data kosong → nol dan null, bukan NaN", () => {
    expect(computeKpi({ platform: "TIKTOK", days: 30, posts: [], followers: [] })).toEqual({
      totalPosts: 0,
      measuredPosts: 0,
      averageEr: null,
      followersGained: null,
      latestFollowers: null,
      postsPerWeek: 0,
    });
  });

  it("rata-rata ER hanya dari post yang punya snapshot; post per minggu dari semua post", () => {
    const kpi = computeKpi({
      platform: "TIKTOK",
      days: 14,
      posts: [
        { platform: "TIKTOK", er: 4 },
        { platform: "TIKTOK", er: 8 },
        { platform: "TIKTOK", er: null },
        { platform: "TIKTOK", er: null },
      ],
      followers: [],
    });
    expect(kpi).toMatchObject({ totalPosts: 4, measuredPosts: 2, averageEr: 6, postsPerWeek: 2 });
  });

  it("post views = 0 masuk rata-rata sebagai 0", () => {
    const zero = engagementRate({ views: 0, likes: 0, comments: 0, shares: 0, saves: 0, follows: 0 });
    const kpi = computeKpi({
      platform: "TIKTOK",
      days: 7,
      posts: [
        { platform: "TIKTOK", er: zero },
        { platform: "TIKTOK", er: 10 },
      ],
      followers: [],
    });
    expect(kpi.averageEr).toBe(5);
  });

  it("tidak mencampur TikTok dan Instagram", () => {
    const input = {
      days: 7,
      posts: [
        { platform: "TIKTOK" as const, er: 2 },
        { platform: "INSTAGRAM" as const, er: 50 },
        { platform: "INSTAGRAM" as const, er: 70 },
      ],
      followers: [
        point("TIKTOK", "2026-11-01", 10),
        point("TIKTOK", "2026-11-02", 15),
        point("INSTAGRAM", "2026-11-01", 1000),
        point("INSTAGRAM", "2026-11-02", 1100),
      ],
    };
    expect(computeKpi({ ...input, platform: "TIKTOK" })).toMatchObject({
      totalPosts: 1,
      averageEr: 2,
      followersGained: 5,
      latestFollowers: 15,
    });
    expect(computeKpi({ ...input, platform: "INSTAGRAM" })).toMatchObject({
      totalPosts: 2,
      averageEr: 60,
      followersGained: 100,
      latestFollowers: 1100,
    });
  });

  it("days tidak valid tidak membuat Infinity", () => {
    const kpi = computeKpi({ platform: "TIKTOK", days: 0, posts: [{ platform: "TIKTOK", er: 1 }], followers: [] });
    expect(kpi.postsPerWeek).toBe(0);
  });
});
