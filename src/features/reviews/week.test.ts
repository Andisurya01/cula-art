import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { parseReviewWeek, reviewWeekNav, weekRangeLabel } from "./week";

// Rabu 11 Nov 2026 10.00 WIB: minggu berjalan mulai Senin 9 Nov, minggu yang perlu di-review = 2 Nov.
const WEDNESDAY = wibToUtc("2026-11-11", "10:00");
// Minggu 15 Nov 2026 18.30 WIB: yang perlu di-review = minggu berjalan (9 Nov).
const SUNDAY_EVENING = wibToUtc("2026-11-15", "18:30");
const week = (date: string) => wibToUtc(date);

describe("parseReviewWeek", () => {
  it("tanpa parameter → minggu yang perlu di-review", () => {
    expect(parseReviewWeek(undefined, WEDNESDAY)).toEqual(week("2026-11-02"));
    expect(parseReviewWeek(undefined, SUNDAY_EVENING)).toEqual(week("2026-11-09"));
  });

  it("Senin yang sudah lewat dan minggu berjalan diterima", () => {
    expect(parseReviewWeek("2026-10-26", WEDNESDAY)).toEqual(week("2026-10-26"));
    expect(parseReviewWeek("2026-11-09", WEDNESDAY)).toEqual(week("2026-11-09"));
  });

  it("tanggal selain Senin diarahkan ke Senin minggunya", () => {
    expect(parseReviewWeek("2026-11-04", WEDNESDAY)).toEqual(week("2026-11-02"));
    expect(parseReviewWeek("2026-11-08", WEDNESDAY)).toEqual(week("2026-11-02"));
    // Hari yang belum tiba di minggu berjalan tetap minggu berjalan.
    expect(parseReviewWeek("2026-11-12", WEDNESDAY)).toEqual(week("2026-11-09"));
  });

  it("tidak valid atau masa depan → default", () => {
    for (const value of ["", "abc", "2026-02-31", "2026-11-16", "2027-01-04", "09-11-2026"]) {
      expect(parseReviewWeek(value, WEDNESDAY)).toEqual(week("2026-11-02"));
    }
  });

  it("parameter berulang memakai nilai pertama", () => {
    expect(parseReviewWeek(["2026-10-19", "2026-11-09"], WEDNESDAY)).toEqual(week("2026-10-19"));
    expect(parseReviewWeek([], WEDNESDAY)).toEqual(week("2026-11-02"));
  });
});

describe("reviewWeekNav", () => {
  it("minggu lalu: bisa maju ke minggu berjalan, dan inilah minggu yang perlu di-review", () => {
    expect(reviewWeekNav(week("2026-11-02"), WEDNESDAY)).toMatchObject({
      key: "2026-11-02",
      prev: "2026-10-26",
      next: "2026-11-09",
      due: "2026-11-02",
      isDue: true,
      isCurrentWeek: false,
    });
  });

  it("minggu berjalan: tidak bisa maju lagi", () => {
    expect(reviewWeekNav(week("2026-11-09"), WEDNESDAY)).toMatchObject({
      next: null,
      isDue: false,
      isCurrentWeek: true,
    });
    expect(reviewWeekNav(week("2026-11-09"), SUNDAY_EVENING)).toMatchObject({ next: null, isDue: true });
  });

  it("minggu lama: tautan ke minggu yang perlu di-review", () => {
    expect(reviewWeekNav(week("2026-10-05"), WEDNESDAY)).toMatchObject({
      prev: "2026-09-28",
      next: "2026-10-12",
      due: "2026-11-02",
      isDue: false,
    });
  });
});

describe("weekRangeLabel", () => {
  it("bulan sama, beda bulan, dan beda tahun", () => {
    expect(weekRangeLabel(week("2026-11-09"))).toBe("9-15 November 2026");
    expect(weekRangeLabel(week("2026-11-30"))).toBe("30 November-6 Desember 2026");
    expect(weekRangeLabel(week("2025-12-29"))).toBe("29 Desember 2025-4 Januari 2026");
  });

  it("versi singkat", () => {
    expect(weekRangeLabel(week("2026-11-09"), { short: true })).toBe("9-15 Nov 2026");
    expect(weekRangeLabel(week("2026-11-30"), { short: true })).toBe("30 Nov-6 Des 2026");
  });
});
