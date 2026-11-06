import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { weeklyStreak, type StreakPost } from "./streak";

// Kamis 5 Nov 2026; minggu berjalan mulai Senin 2 Nov.
const NOW = wibToUtc("2026-11-05", "12:00");

const post = (contentId: string, date: string, time = "19:00"): StreakPost => ({
  contentId,
  postedAt: wibToUtc(date, time),
});

/** Satu konten per tanggal. */
const posts = (...dates: string[]) => dates.map((date, i) => post(`c${i}-${date}`, date));

describe("weeklyStreak (D9)", () => {
  it("data kosong → 0", () => {
    expect(weeklyStreak([], 2, NOW)).toEqual({ current: 0, thisWeekCount: 0, thisWeekMet: false });
  });

  it("minggu berjalan belum memenuhi target tidak memutus streak", () => {
    const result = weeklyStreak(
      posts("2026-10-27", "2026-10-29", "2026-10-20", "2026-10-22", "2026-11-03"),
      2,
      NOW,
    );
    expect(result).toEqual({ current: 2, thisWeekCount: 1, thisWeekMet: false });
  });

  it("minggu berjalan yang sudah memenuhi target menambah streak", () => {
    const result = weeklyStreak(
      posts("2026-10-27", "2026-10-29", "2026-11-03", "2026-11-04"),
      2,
      NOW,
    );
    expect(result).toEqual({ current: 2, thisWeekCount: 2, thisWeekMet: true });
  });

  it("minggu lalu yang tidak memenuhi target memutus streak", () => {
    const result = weeklyStreak(
      posts("2026-10-13", "2026-10-15", "2026-10-27", "2026-11-03", "2026-11-04"),
      2,
      NOW,
    );
    expect(result.current).toBe(1);
  });

  it("satu konten di TikTok + Instagram dihitung satu post", () => {
    const result = weeklyStreak(
      [post("a", "2026-10-27"), post("a", "2026-10-28"), post("b", "2026-10-29")],
      2,
      NOW,
    );
    expect(result.current).toBe(1);
    expect(weeklyStreak([post("a", "2026-10-27"), post("a", "2026-10-28")], 2, NOW).current).toBe(0);
  });

  it("minggu mengikuti WIB dan dimulai Senin, termasuk dekat tengah malam", () => {
    // 00.10 WIB Senin 2 Nov = 17.10 UTC Minggu 1 Nov, tetapi sudah masuk minggu berjalan.
    const monday = [post("a", "2026-11-02", "00:10"), post("b", "2026-11-02", "00:20")];
    expect(weeklyStreak(monday, 2, NOW)).toMatchObject({ thisWeekCount: 2, current: 1 });
    // 23.50 WIB Minggu 1 Nov masih minggu lalu.
    const sunday = [post("a", "2026-11-01", "23:50"), post("b", "2026-11-01", "23:55")];
    expect(weeklyStreak(sunday, 2, NOW)).toMatchObject({ thisWeekCount: 0, current: 1 });
  });

  it("post dengan waktu di masa depan tidak dihitung", () => {
    const result = weeklyStreak(posts("2026-11-06", "2026-11-07"), 2, NOW);
    expect(result).toEqual({ current: 0, thisWeekCount: 0, thisWeekMet: false });
  });

  it("target 0 tidak membuat perulangan tanpa akhir", () => {
    expect(weeklyStreak(posts("2026-10-27"), 0, NOW)).toEqual({
      current: 0,
      thisWeekCount: 0,
      thisWeekMet: false,
    });
  });

  it("memakai target saat ini untuk semua minggu lampau", () => {
    const history = posts("2026-10-27", "2026-10-29", "2026-10-20", "2026-10-22", "2026-10-13");
    expect(weeklyStreak(history, 2, NOW).current).toBe(2);
    expect(weeklyStreak(history, 1, NOW).current).toBe(3);
    expect(weeklyStreak(history, 3, NOW).current).toBe(0);
  });
});
