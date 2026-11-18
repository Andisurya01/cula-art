import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import type { FollowerPoint } from "./kpi";
import {
  isReviewableWeek,
  reviewReminder,
  reviewWeekStart,
  weeklySummary,
  type ReviewPost,
} from "./review";

// Minggu WIB 9-15 Nov 2026 (Senin 9 Nov).
const WEEK = wibToUtc("2026-11-09");
const LAST_WEEK = wibToUtc("2026-11-02");
const NEXT_WEEK = wibToUtc("2026-11-16");

describe("reviewWeekStart", () => {
  it("Minggu 18.00 WIB → minggu berjalan; Minggu 17.59 → minggu lalu", () => {
    expect(reviewWeekStart(wibToUtc("2026-11-15", "18:00"))).toEqual(WEEK);
    expect(reviewWeekStart(wibToUtc("2026-11-15", "17:59"))).toEqual(LAST_WEEK);
  });

  it("Senin dini hari WIB (masih Minggu malam di UTC) → minggu lalu yang baru selesai", () => {
    expect(reviewWeekStart(wibToUtc("2026-11-16", "00:30"))).toEqual(WEEK);
    expect(reviewWeekStart(wibToUtc("2026-11-12", "12:00"))).toEqual(LAST_WEEK);
  });
});

describe("reviewReminder (E8)", () => {
  it("Minggu 18.00 sampai review minggu ini tersimpan", () => {
    expect(reviewReminder(wibToUtc("2026-11-15", "17:59"), [])).toBeNull();
    expect(reviewReminder(wibToUtc("2026-11-15", "18:00"), [])).toEqual({ weekStart: WEEK, kind: "THIS_WEEK" });
    expect(reviewReminder(wibToUtc("2026-11-15", "23:59"), [WEEK])).toBeNull();
  });

  it("Senin-Selasa: review minggu lalu belum diisi; Rabu tidak ada pengingat", () => {
    expect(reviewReminder(wibToUtc("2026-11-16", "07:00"), [])).toEqual({ weekStart: WEEK, kind: "LAST_WEEK" });
    expect(reviewReminder(wibToUtc("2026-11-17", "23:59"), [])).toEqual({ weekStart: WEEK, kind: "LAST_WEEK" });
    expect(reviewReminder(wibToUtc("2026-11-17", "08:00"), [WEEK])).toBeNull();
    expect(reviewReminder(wibToUtc("2026-11-18", "00:00"), [])).toBeNull();
  });
});

describe("isReviewableWeek", () => {
  const now = wibToUtc("2026-11-12", "12:00");
  it("Senin 00.00 WIB minggu berjalan atau lampau", () => {
    expect(isReviewableWeek(WEEK, now)).toBe(true);
    expect(isReviewableWeek(LAST_WEEK, now)).toBe(true);
    expect(isReviewableWeek(NEXT_WEEK, now)).toBe(false);
    expect(isReviewableWeek(wibToUtc("2026-11-10"), now)).toBe(false);
    expect(isReviewableWeek(new Date("2026-11-09T00:00:00.000Z"), now)).toBe(false);
  });
});

let seq = 0;
function post(partial: Partial<ReviewPost>): ReviewPost {
  seq += 1;
  return {
    id: `p${seq}`,
    contentId: `c${seq}`,
    title: `Post ${seq}`,
    platform: "TIKTOK",
    postedAt: wibToUtc("2026-11-10", "19:00"),
    relativeScore: 1,
    ...partial,
  };
}

const snap = (platform: FollowerPoint["platform"], date: string, followers: number): FollowerPoint => ({
  platform,
  date: wibToUtc(date),
  followers,
});

describe("weeklySummary", () => {
  it("data kosong → 0 post, tanpa followers, tanpa terbaik/terburuk, kedua platform tetap ada", () => {
    const s = weeklySummary({ weekStart: WEEK, target: 3, posts: [], followers: [] });
    expect(s).toMatchObject({ weekStart: WEEK, weekEnd: NEXT_WEEK, target: 3, postedCount: 0, targetMet: false });
    expect(s.platforms.map((p) => p.platform)).toEqual(["TIKTOK", "INSTAGRAM"]);
    expect(s.platforms[0]).toEqual({
      platform: "TIKTOK",
      postCount: 0,
      scoredCount: 0,
      followersStart: null,
      followersEnd: null,
      followersGained: null,
      best: null,
      worst: null,
    });
  });

  it("post vs target dihitung per konten; batas minggu WIB", () => {
    const posts = [
      post({ contentId: "k1" }),
      post({ contentId: "k1", platform: "INSTAGRAM" }),
      post({ contentId: "k2", postedAt: wibToUtc("2026-11-15", "23:59") }),
      post({ contentId: "k3", postedAt: wibToUtc("2026-11-16", "00:00") }), // minggu depan
      post({ contentId: "k4", postedAt: wibToUtc("2026-11-08", "23:59") }), // minggu lalu
    ];
    const s = weeklySummary({ weekStart: WEEK, target: 2, posts, followers: [] });
    expect(s.postedCount).toBe(2);
    expect(s.targetMet).toBe(true);
    expect(s.platforms.map((p) => p.postCount)).toEqual([2, 1]);
  });

  it("terbaik dan terburuk per platform dari skor relatif; tidak mencampur platform", () => {
    const posts = [
      post({ title: "A", relativeScore: 1.6 }),
      post({ title: "B", relativeScore: 0.4 }),
      post({ title: "C", relativeScore: null }),
      post({ title: "IG", platform: "INSTAGRAM", relativeScore: 3 }),
    ];
    const [tiktok, instagram] = weeklySummary({ weekStart: WEEK, target: 3, posts, followers: [] }).platforms;
    expect(tiktok).toMatchObject({ postCount: 3, scoredCount: 2, best: { title: "A", relativeScore: 1.6 }, worst: { title: "B" } });
    // Satu post saja: hanya terbaik, tidak sekaligus terburuk.
    expect(instagram).toMatchObject({ best: { title: "IG" }, worst: null });
  });

  it("views = 0 (skor relatif 0) tetap terhitung sebagai terburuk, bukan NaN", () => {
    const posts = [post({ relativeScore: 0 }), post({ relativeScore: 1.1 })];
    const [tiktok] = weeklySummary({ weekStart: WEEK, target: 1, posts, followers: [] }).platforms;
    expect(tiktok!.worst?.relativeScore).toBe(0);
  });

  it("followers: snapshot terakhir minggu ini − snapshot terakhir sebelum minggu ini, per platform", () => {
    const followers = [
      snap("TIKTOK", "2026-11-01", 1000),
      snap("TIKTOK", "2026-11-08", 1100),
      snap("TIKTOK", "2026-11-12", 1150),
      snap("TIKTOK", "2026-11-15", 1180),
      snap("TIKTOK", "2026-11-16", 1300), // minggu depan, tidak dipakai
      snap("INSTAGRAM", "2026-11-15", 500),
    ];
    const [tiktok, instagram] = weeklySummary({ weekStart: WEEK, target: 3, posts: [], followers }).platforms;
    expect(tiktok).toMatchObject({ followersStart: 1100, followersEnd: 1180, followersGained: 80 });
    // Hanya satu snapshot: tidak bisa dibandingkan.
    expect(instagram).toMatchObject({ followersStart: 500, followersEnd: 500, followersGained: null });
  });

  it("followers: tanpa snapshot sebelumnya → snapshot pertama minggu ini; tanpa snapshot minggu ini → —", () => {
    const first = weeklySummary({
      weekStart: WEEK,
      target: 3,
      posts: [],
      followers: [snap("TIKTOK", "2026-11-10", 200), snap("TIKTOK", "2026-11-14", 260)],
    }).platforms[0];
    expect(first).toMatchObject({ followersStart: 200, followersEnd: 260, followersGained: 60 });
    const stale = weeklySummary({ weekStart: WEEK, target: 3, posts: [], followers: [snap("TIKTOK", "2026-11-01", 900)] })
      .platforms[0];
    expect(stale?.followersGained).toBeNull();
  });

  it("weekStart yang bukan Senin dibulatkan ke Senin WIB", () => {
    expect(weeklySummary({ weekStart: wibToUtc("2026-11-12", "10:00"), target: 0, posts: [], followers: [] })).toMatchObject({
      weekStart: WEEK,
      targetMet: false,
    });
  });
});
