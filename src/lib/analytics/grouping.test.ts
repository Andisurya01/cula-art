import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { durationBucket, groupScores, type GroupingPost } from "./grouping";

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
    expect(groupScores([], "TIKTOK")).toEqual({
      pillar: [],
      format: [],
      hookType: [],
      day: [],
      hour: [],
      dayHour: [],
      duration: [],
    });
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

describe("groupScores: hari+jam dan durasi", () => {
  it("hari+jam WIB per kombinasi, urut hari lalu jam; dekat tengah malam ikut hari WIB", () => {
    const rows = groupScores(
      [
        post({ score: 1, postedAt: wibToUtc("2026-11-07", "19:10") }), // Sabtu
        post({ score: 3, postedAt: wibToUtc("2026-11-14", "19:40") }), // Sabtu
        post({ score: 2, postedAt: wibToUtc("2026-11-03", "19:00") }), // Selasa
        post({ score: 5, postedAt: wibToUtc("2026-11-03", "23:50") }), // Selasa 23.50 WIB = 16.50 UTC
        post({ score: 9, postedAt: new Date("2026-11-03T17:10:00.000Z") }), // Rabu 00.10 WIB
      ],
      "TIKTOK",
    ).dayHour;
    expect(rows.map((r) => [r.key, r.label, r.postCount, r.medianScore])).toEqual([
      ["2-19", "Selasa 19.00", 1, 2],
      ["2-23", "Selasa 23.00", 1, 5],
      ["3-0", "Rabu 00.00", 1, 9],
      ["6-19", "Sabtu 19.00", 2, 2],
    ]);
  });

  it("durasi per kelompok, post tanpa durasi tidak ikut", () => {
    const rows = groupScores(
      [
        post({ score: 1, durationSec: 12 }),
        post({ score: 3, durationSec: 45 }),
        post({ score: 5, durationSec: 30 }),
        post({ score: 7, durationSec: 59 }),
        post({ score: 9, durationSec: null }),
        post({ score: 9 }),
      ],
      "TIKTOK",
    ).duration;
    expect(rows.map((r) => [r.key, r.postCount, r.medianScore, r.enoughData])).toEqual([
      ["d15", 1, 1, false],
      ["d60", 3, 5, true],
    ]);
  });

  it("durationBucket: batas kelompok, 0/negatif/null → null", () => {
    expect(durationBucket(14.9)?.key).toBe("d15");
    expect(durationBucket(15)?.key).toBe("d30");
    expect(durationBucket(60)?.label).toBe("≥ 60 dtk");
    expect(durationBucket(0)).toBeNull();
    expect(durationBucket(-3)).toBeNull();
    expect(durationBucket(null)).toBeNull();
    expect(durationBucket(Number.NaN)).toBeNull();
  });
});
