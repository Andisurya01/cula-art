import { describe, expect, it } from "vitest";
import { weeklySummary, type ReviewPost } from "@/lib/analytics/review";
import { addWibDays, wibToUtc } from "@/lib/date";
import {
  FROZEN_SUMMARY_VERSION,
  freezeSummary,
  parseFrozenSummary,
  platformData,
  summaryNumbersDiffer,
  toSummaryData,
  type ReviewSummaryData,
} from "./summary";

const WEEK = wibToUtc("2026-11-02");
const FROZEN_AT = wibToUtc("2026-11-08", "19:30");

function post(id: string, contentId: string, platform: ReviewPost["platform"], day: number, relativeScore: number | null): ReviewPost {
  return { id, contentId, title: `Judul ${id}`, platform, postedAt: addWibDays(wibToUtc("2026-11-02", "19:00"), day), relativeScore };
}

function sample(): ReviewSummaryData {
  const summary = weeklySummary({
    weekStart: WEEK,
    target: 3,
    posts: [
      post("t1", "a", "TIKTOK", 1, 1.5),
      post("t2", "b", "TIKTOK", 3, 0.8),
      post("i1", "a", "INSTAGRAM", 1, null),
      post("old", "c", "TIKTOK", -3, 2),
    ],
    followers: [
      { platform: "TIKTOK", date: wibToUtc("2026-11-01"), followers: 1000 },
      { platform: "TIKTOK", date: wibToUtc("2026-11-08"), followers: 1120 },
      { platform: "INSTAGRAM", date: wibToUtc("2026-11-08"), followers: 500 },
    ],
  });
  return toSummaryData(summary, ["Ritme terancam: kurang 1 konten"]);
}

describe("toSummaryData", () => {
  it("angka per platform terpisah, tanggal jadi string", () => {
    const data = sample();
    expect(data).toMatchObject({ weekStart: "2026-11-02", target: 3, postedCount: 2, targetMet: false });
    expect(platformData(data, "TIKTOK")).toEqual({
      platform: "TIKTOK",
      postCount: 2,
      scoredCount: 2,
      followersStart: 1000,
      followersEnd: 1120,
      followersGained: 120,
      best: { id: "t1", title: "Judul t1", relativeScore: 1.5 },
      worst: { id: "t2", title: "Judul t2", relativeScore: 0.8 },
    });
    expect(platformData(data, "INSTAGRAM")).toMatchObject({
      postCount: 1,
      scoredCount: 0,
      followersGained: null,
      best: null,
      worst: null,
    });
    expect(data.suggestions).toEqual(["Ritme terancam: kurang 1 konten"]);
  });

  it("data kosong: nol dan null, tanpa NaN", () => {
    const data = toSummaryData(weeklySummary({ weekStart: WEEK, target: 0, posts: [], followers: [] }), []);
    expect(data).toEqual({
      weekStart: "2026-11-02",
      target: 0,
      postedCount: 0,
      targetMet: false,
      platforms: ["TIKTOK", "INSTAGRAM"].map((platform) => ({
        platform,
        postCount: 0,
        scoredCount: 0,
        followersStart: null,
        followersEnd: null,
        followersGained: null,
        best: null,
        worst: null,
      })),
      suggestions: [],
    });
    expect(parseFrozenSummary(freezeSummary(data, FROZEN_AT))).toMatchObject(data);
  });
});

describe("freezeSummary / parseFrozenSummary", () => {
  it("bolak-balik utuh dengan versi dan waktu dibekukan", () => {
    const data = sample();
    const json = freezeSummary(data, FROZEN_AT);
    const parsed = parseFrozenSummary(json);
    expect(parsed).toEqual({ version: FROZEN_SUMMARY_VERSION, frozenAt: FROZEN_AT.toISOString(), ...data });
    expect(JSON.parse(json).frozenAt).toBe("2026-11-08T12:30:00.000Z");
  });

  it("kosong, JSON rusak, bentuk salah, atau versi lain → null", () => {
    const valid = JSON.parse(freezeSummary(sample(), FROZEN_AT));
    const broken = [
      null,
      undefined,
      "",
      "{",
      "[]",
      "null",
      JSON.stringify({ ...valid, version: 2 }),
      JSON.stringify({ ...valid, frozenAt: "kemarin" }),
      JSON.stringify({ ...valid, weekStart: "2026-02-31" }),
      JSON.stringify({ ...valid, postedCount: -1 }),
      JSON.stringify({ ...valid, target: undefined }),
      JSON.stringify({ ...valid, platforms: [{ ...valid.platforms[0], platform: "FACEBOOK" }] }),
      JSON.stringify({ ...valid, platforms: [{ ...valid.platforms[0], best: { id: "x", title: "y" } }] }),
    ];
    for (const json of broken) expect(parseFrozenSummary(json)).toBeNull();
  });
});

describe("summaryNumbersDiffer", () => {
  it("sama → false; judul dan saran tidak dihitung", () => {
    const frozen = sample();
    expect(summaryNumbersDiffer(frozen, sample())).toBe(false);
    const renamed = sample();
    renamed.platforms[0]!.best!.title = "Judul baru";
    renamed.suggestions = [];
    expect(summaryNumbersDiffer(frozen, renamed)).toBe(false);
  });

  it("followers, jumlah post, target, atau terbaik berubah → true", () => {
    const frozen = sample();
    const followers = sample();
    followers.platforms[1]!.followersGained = 12;
    expect(summaryNumbersDiffer(frozen, followers)).toBe(true);
    expect(summaryNumbersDiffer(frozen, { ...sample(), postedCount: 3 })).toBe(true);
    expect(summaryNumbersDiffer(frozen, { ...sample(), target: 2 })).toBe(true);
    const best = sample();
    best.platforms[0]!.best = { id: "t9", title: "Judul t1", relativeScore: 1.5 };
    expect(summaryNumbersDiffer(frozen, best)).toBe(true);
  });

  it("urutan platform di JSON tidak berpengaruh", () => {
    const frozen = sample();
    expect(summaryNumbersDiffer({ ...frozen, platforms: [...frozen.platforms].reverse() }, sample())).toBe(false);
  });
});
