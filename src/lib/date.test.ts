import { describe, expect, it } from "vitest";
import {
  addWibDays,
  daysSince,
  endOfWibWeek,
  formatWib,
  isStale,
  isValidWibDateString,
  isValidWibInputValue,
  parseWibInputValue,
  startOfWibDay,
  startOfWibWeek,
  toWibDateString,
  toWibInputValue,
  toWibTimeString,
  wibDaysBetween,
  wibIsoDay,
  wibMonthGrid,
  wibToUtc,
  wibWeekDays,
} from "./date";

describe("konversi WIB ↔ UTC", () => {
  it("19.00 WIB = 12.00 UTC", () => {
    expect(wibToUtc("2026-10-27", "19:00").toISOString()).toBe("2026-10-27T12:00:00.000Z");
  });

  it("00.00 WIB = 17.00 UTC hari sebelumnya", () => {
    expect(wibToUtc("2026-10-28").toISOString()).toBe("2026-10-27T17:00:00.000Z");
  });

  it("round-trip datetime-local", () => {
    const d = parseWibInputValue("2026-10-29T19:00");
    expect(d.toISOString()).toBe("2026-10-29T12:00:00.000Z");
    expect(toWibInputValue(d)).toBe("2026-10-29T19:00");
    expect(toWibDateString(d)).toBe("2026-10-29");
    expect(toWibTimeString(d)).toBe("19:00");
  });

  it("instant malam UTC sudah hari berikutnya di WIB", () => {
    expect(toWibDateString(new Date("2026-10-27T18:30:00Z"))).toBe("2026-10-28");
  });
});

describe("minggu mulai Senin (WIB)", () => {
  it("Rabu → Senin 00.00 WIB", () => {
    const wed = wibToUtc("2026-10-28", "10:00");
    expect(startOfWibWeek(wed).toISOString()).toBe(wibToUtc("2026-10-26").toISOString());
    expect(endOfWibWeek(wed).toISOString()).toBe(wibToUtc("2026-11-02").toISOString());
  });

  it("Minggu malam masih minggu yang sama", () => {
    const sun = wibToUtc("2026-11-01", "23:30");
    expect(toWibDateString(startOfWibWeek(sun))).toBe("2026-10-26");
  });

  it("Senin 00.30 WIB (Minggu 17.30 UTC) masuk minggu baru", () => {
    const mon = new Date("2026-11-01T17:30:00Z");
    expect(toWibDateString(startOfWibWeek(mon))).toBe("2026-11-02");
  });

  it("wibWeekDays memberi 7 hari Senin…Minggu", () => {
    const days = wibWeekDays(wibToUtc("2026-10-28"));
    expect(days.map(toWibDateString)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(days.map(wibIsoDay)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("startOfWibDay", () => {
    const d = wibToUtc("2026-10-28", "21:15");
    expect(startOfWibDay(d).toISOString()).toBe(wibToUtc("2026-10-28").toISOString());
  });
});

describe("grid bulan", () => {
  it("Oktober 2026 dimulai Senin 28 Sep dan habis kelipatan 7", () => {
    const grid = wibMonthGrid(wibToUtc("2026-10-15"));
    expect(toWibDateString(grid[0])).toBe("2026-09-28");
    expect(grid.length % 7).toBe(0);
    expect(toWibDateString(grid[grid.length - 1])).toBe("2026-11-01");
  });
});

describe("format locale id", () => {
  it("nama hari dan bulan bahasa Indonesia", () => {
    expect(formatWib(wibToUtc("2026-10-27", "19:00"), "EEEE, d MMMM yyyy HH.mm")).toBe(
      "Selasa, 27 Oktober 2026 19.00",
    );
  });
});

describe("selisih hari dan macet", () => {
  it("wibDaysBetween memakai hari kalender WIB", () => {
    expect(wibDaysBetween(wibToUtc("2026-10-27", "23:00"), wibToUtc("2026-10-28", "01:00"))).toBe(1);
  });

  it("isStale setelah lebih dari 7 hari", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    expect(isStale(new Date("2026-10-21T12:00:00Z"), now)).toBe(false);
    expect(isStale(new Date("2026-10-21T11:00:00Z"), now)).toBe(true);
    expect(daysSince(new Date("2026-10-19T12:00:00Z"), now)).toBe(9);
  });
});

describe("validasi input WIB", () => {
  it("isValidWibDateString menolak tanggal yang tidak ada", () => {
    expect(isValidWibDateString("2026-10-29")).toBe(true);
    expect(isValidWibDateString("2026-02-31")).toBe(false);
    expect(isValidWibDateString("2026-13-01")).toBe(false);
    expect(isValidWibDateString("29-10-2026")).toBe(false);
    expect(isValidWibDateString("")).toBe(false);
  });

  it("isValidWibInputValue menolak jam/tanggal di luar rentang", () => {
    expect(isValidWibInputValue("2026-10-29T19:00")).toBe(true);
    expect(isValidWibInputValue("2026-10-29T24:00")).toBe(false);
    expect(isValidWibInputValue("2026-10-29T19:60")).toBe(false);
    expect(isValidWibInputValue("2026-02-31T10:00")).toBe(false);
    expect(isValidWibInputValue("2026-10-29 19:00")).toBe(false);
  });
});

describe("addWibDays", () => {
  it("menambah tepat 24 jam per hari", () => {
    const start = wibToUtc("2027-03-25");
    expect(toWibDateString(addWibDays(start, 4))).toBe("2027-03-29");
    expect(addWibDays(start, -1).toISOString()).toBe(wibToUtc("2027-03-24").toISOString());
  });
});
