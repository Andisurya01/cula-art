import { describe, expect, it } from "vitest";
import { wibToUtc, wibWeekDays } from "@/lib/date";
import { buildSlots, slotUrgency, upcomingEmptySlots } from "./slots";

// Rabu 28 Okt 2026, 10.00 WIB. Minggu ini: Senin 26 Okt – Minggu 1 Nov.
const now = wibToUtc("2026-10-28", "10:00");
const week = wibWeekDays(now);
const slots = [
  { day: 2, time: "19:00" }, // Selasa 27 Okt (lewat)
  { day: 4, time: "19:00" }, // Kamis 29 Okt (besok)
  { day: 6, time: "19:00" }, // Sabtu 31 Okt (3 hari lagi)
];

describe("buildSlots", () => {
  it("membuat slot per hari ISO dalam WIB dengan urgensi", () => {
    const result = buildSlots(week, slots, [], now);
    expect(result.map((s) => s.key)).toEqual([
      "2026-10-27T19:00",
      "2026-10-29T19:00",
      "2026-10-31T19:00",
    ]);
    expect(result.map((s) => s.urgency)).toEqual(["overdue", "soon", "none"]);
    expect(result.every((s) => !s.filled)).toBe(true);
    expect(result[0].at.toISOString()).toBe("2026-10-27T12:00:00.000Z");
  });

  it("slot terisi oleh post pada tanggal WIB sama dalam ± 2 jam", () => {
    const posts = [
      { contentId: "a", at: wibToUtc("2026-10-27", "21:00") }, // tepat +2 jam
      { contentId: "b", at: wibToUtc("2026-10-29", "16:59") }, // -2 jam 1 menit
    ];
    const result = buildSlots(week, slots, posts, now);
    expect(result.map((s) => s.filled)).toEqual([true, false, false]);
    expect(result[0].urgency).toBe("none");
  });

  it("post beda tanggal WIB tidak mengisi slot walau selisih < 2 jam", () => {
    const sundaySlot = [{ day: 7, time: "23:00" }];
    const posts = [{ contentId: "a", at: wibToUtc("2026-11-02", "00:30") }]; // Senin
    const result = buildSlots(week, sundaySlot, posts, now);
    expect(result[0].filled).toBe(false);
  });

  it("memakai tanggal WIB, bukan UTC (post 05.00 WIB = 22.00 UTC hari sebelumnya)", () => {
    const morning = [{ day: 4, time: "06:00" }];
    const posts = [{ contentId: "a", at: wibToUtc("2026-10-29", "05:00") }];
    expect(buildSlots(week, morning, posts, now)[0].filled).toBe(true);
  });

  it("satu konten (TikTok + IG) hanya mengisi satu slot per hari", () => {
    const twoSlots = [
      { day: 4, time: "18:00" },
      { day: 4, time: "19:00" },
    ];
    const sameContent = [
      { contentId: "a", at: wibToUtc("2026-10-29", "19:00") },
      { contentId: "a", at: wibToUtc("2026-10-29", "19:00") },
    ];
    const result = buildSlots(week, twoSlots, sameContent, now);
    expect(result.map((s) => s.filled)).toEqual([false, true]);

    const twoContents = [...sameContent, { contentId: "b", at: wibToUtc("2026-10-29", "18:30") }];
    expect(buildSlots(week, twoSlots, twoContents, now).map((s) => s.filled)).toEqual([true, true]);
  });

  it("pencocokan memilih selisih terkecil", () => {
    const twoSlots = [
      { day: 4, time: "17:00" },
      { day: 4, time: "19:00" },
    ];
    const posts = [{ contentId: "a", at: wibToUtc("2026-10-29", "18:45") }];
    expect(buildSlots(week, twoSlots, posts, now).map((s) => s.filled)).toEqual([false, true]);
  });

  it("tanpa slot atau tanpa hari menghasilkan daftar kosong", () => {
    expect(buildSlots(week, [], [], now)).toEqual([]);
    expect(buildSlots([], slots, [], now)).toEqual([]);
  });
});

describe("slotUrgency", () => {
  it("lewat = overdue, ≤ 2 hari kalender = soon, lebih = none", () => {
    expect(slotUrgency(wibToUtc("2026-10-28", "09:59"), now)).toBe("overdue");
    expect(slotUrgency(wibToUtc("2026-10-28", "19:00"), now)).toBe("soon");
    expect(slotUrgency(wibToUtc("2026-10-30", "23:59"), now)).toBe("soon");
    expect(slotUrgency(wibToUtc("2026-10-31", "00:00"), now)).toBe("none");
  });
});

describe("upcomingEmptySlots", () => {
  it("hanya slot kosong yang belum lewat dalam 14 hari", () => {
    const daily = [{ day: 3, time: "08:00" }, { day: 3, time: "20:00" }]; // Rabu
    const posts = [{ contentId: "a", at: wibToUtc("2026-11-04", "20:00") }];
    const result = upcomingEmptySlots(daily, posts, now);
    expect(result.map((s) => s.key)).toEqual([
      "2026-10-28T20:00", // 08.00 hari ini sudah lewat
      "2026-11-04T08:00", // 20.00 terisi
    ]);
  });
});
