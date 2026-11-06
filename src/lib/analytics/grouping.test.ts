import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { groupScores, type GroupingPost } from "./grouping";

const clay = { id: "p-clay", name: "Proses Clay" };
const gambar = { id: "p-gambar", name: "Progres Gambar" };
const timelapse = { id: "f-time", name: "Time-lapse" };
const reveal = { id: "f-reveal", name: "Reveal" };
const hookN = { id: "h-n", name: "Hari ke-N" };

function post(partial: Partial<GroupingPost> & { score: number }): GroupingPost {
  return {
    platform: "TIKTOK",
    postedAt: wibToUtc("2026-11-03", "19:00"), // Selasa
    pillar: clay,
    format: timelapse,
    hookType: hookN,
    ...partial,
  };
}

describe("groupScores", () => {
  it("data kosong → semua dimensi kosong", () => {
    expect(groupScores([], "TIKTOK")).toEqual({ pillar: [], format: [], hookType: [], day: [], hour: [] });
  });

  it("median per pilar dengan penanda enoughData (≥ 3 post)", () => {
    const rows = groupScores(
      [
        post({ score: 10 }),
        post({ score: 20 }),
        post({ score: 90 }),
        post({ score: 500, pillar: gambar }),
        post({ score: 700, pillar: gambar }),
      ],
      "TIKTOK",
    ).pillar;
    expect(rows).toEqual([
      { key: "p-clay", label: "Proses Clay", postCount: 3, medianScore: 20, enoughData: true },
      { key: "p-gambar", label: "Progres Gambar", postCount: 2, medianScore: 600, enoughData: false },
    ]);
  });

  it("grup berdata cukup diurutkan median tertinggi", () => {
    const rows = groupScores(
      [
        post({ score: 10 }),
        post({ score: 10 }),
        post({ score: 10 }),
        post({ score: 30, pillar: gambar }),
        post({ score: 30, pillar: gambar }),
        post({ score: 30, pillar: gambar }),
      ],
      "TIKTOK",
    ).pillar;
    expect(rows.map((r) => r.key)).toEqual(["p-gambar", "p-clay"]);
  });

  it("tidak pernah mencampur platform", () => {
    const posts = [
      post({ score: 10 }),
      post({ score: 1000, platform: "INSTAGRAM" }),
      post({ score: 2000, platform: "INSTAGRAM" }),
    ];
    expect(groupScores(posts, "TIKTOK").pillar).toEqual([
      expect.objectContaining({ postCount: 1, medianScore: 10 }),
    ]);
    expect(groupScores(posts, "INSTAGRAM").pillar).toEqual([
      expect.objectContaining({ postCount: 2, medianScore: 1500 }),
    ]);
  });

  it("format dan tipe hook kosong tidak membuat grup, tetapi tetap masuk pilar", () => {
    const grouped = groupScores(
      [post({ score: 10, format: null, hookType: null }), post({ score: 20, format: reveal })],
      "TIKTOK",
    );
    expect(grouped.format.map((r) => r.key)).toEqual(["f-reveal"]);
    expect(grouped.hookType).toEqual([expect.objectContaining({ key: "h-n", postCount: 1 })]);
    expect(grouped.pillar[0].postCount).toBe(2);
  });

  it("skor 0 (views = 0) tetap median 0, bukan NaN", () => {
    const rows = groupScores([post({ score: 0 })], "TIKTOK").pillar;
    expect(rows[0].medianScore).toBe(0);
  });

  it("hari dan jam mengikuti WIB, termasuk dekat tengah malam", () => {
    // 23.50 WIB Senin = 16.50 UTC Senin; 00.10 WIB Selasa = 17.10 UTC Senin (tanggal UTC sama).
    const posts = [
      post({ score: 10, postedAt: wibToUtc("2026-11-02", "23:50") }),
      post({ score: 20, postedAt: wibToUtc("2026-11-03", "00:10") }),
    ];
    const { day, hour } = groupScores(posts, "TIKTOK");
    expect(day.map((r) => [r.label, r.medianScore])).toEqual([
      ["Senin", 10],
      ["Selasa", 20],
    ]);
    expect(hour.map((r) => [r.label, r.medianScore])).toEqual([
      ["00.00", 20],
      ["23.00", 10],
    ]);
  });

  it("hari dan jam urut waktu, bukan peringkat", () => {
    const posts = [
      post({ score: 900, postedAt: wibToUtc("2026-11-08", "21:00") }), // Minggu
      post({ score: 1, postedAt: wibToUtc("2026-11-02", "07:00") }), // Senin
      post({ score: 50, postedAt: wibToUtc("2026-11-04", "09:30") }), // Rabu
    ];
    const { day, hour } = groupScores(posts, "TIKTOK");
    expect(day.map((r) => r.label)).toEqual(["Senin", "Rabu", "Minggu"]);
    expect(hour.map((r) => r.label)).toEqual(["07.00", "09.00", "21.00"]);
  });
});
