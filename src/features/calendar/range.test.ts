import { describe, expect, it } from "vitest";
import { toWibDateString, wibToUtc } from "@/lib/date";
import {
  calendarDays,
  calendarHref,
  daysRange,
  isValidDateString,
  parseCalendarParams,
  rangeLabel,
  shiftDate,
} from "./range";

const now = wibToUtc("2026-10-28", "23:30"); // 16.30 UTC

describe("parseCalendarParams", () => {
  it("default minggu dan hari ini dalam WIB", () => {
    expect(parseCalendarParams({}, now)).toEqual({ view: "week", date: "2026-10-28" });
  });

  it("menerima view month dan tanggal valid; menolak tanggal tidak ada", () => {
    expect(parseCalendarParams({ view: "month", date: "2026-02-10" }, now)).toEqual({
      view: "month",
      date: "2026-02-10",
    });
    expect(parseCalendarParams({ view: "x", date: "2026-02-31" }, now)).toEqual({
      view: "week",
      date: "2026-10-28",
    });
    expect(parseCalendarParams({ view: ["month", "week"], date: ["2026-01-05"] }, now).date).toBe(
      "2026-01-05",
    );
  });

  it("isValidDateString", () => {
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2026-1-01")).toBe(false);
  });
});

describe("calendarDays + daysRange", () => {
  it("minggu: Senin–Minggu", () => {
    const days = calendarDays({ view: "week", date: "2026-10-28" });
    expect(days.map(toWibDateString)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    const { start, end } = daysRange(days);
    expect(start.toISOString()).toBe("2026-10-25T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T17:00:00.000Z");
  });

  it("bulan: grid penuh dari Senin sampai Minggu", () => {
    const days = calendarDays({ view: "month", date: "2026-10-15" });
    expect(toWibDateString(days[0])).toBe("2026-09-28");
    expect(toWibDateString(days[days.length - 1])).toBe("2026-11-01");
    expect(days.length % 7).toBe(0);
  });
});

describe("shiftDate", () => {
  it("minggu ±7 hari", () => {
    expect(shiftDate({ view: "week", date: "2026-10-28" }, 1)).toBe("2026-11-04");
    expect(shiftDate({ view: "week", date: "2026-10-28" }, -1)).toBe("2026-10-21");
  });

  it("bulan ke tanggal 1, melewati batas tahun", () => {
    expect(shiftDate({ view: "month", date: "2026-12-31" }, 1)).toBe("2027-01-01");
    expect(shiftDate({ view: "month", date: "2026-01-15" }, -1)).toBe("2025-12-01");
  });
});

describe("rangeLabel + calendarHref", () => {
  it("label minggu dan bulan dalam bahasa Indonesia", () => {
    expect(rangeLabel({ view: "week", date: "2026-10-28" })).toBe("26 Okt – 1 Nov 2026");
    expect(rangeLabel({ view: "week", date: "2026-12-30" })).toBe("28 Des 2026 – 3 Jan 2027");
    expect(rangeLabel({ view: "month", date: "2026-10-28" })).toBe("Oktober 2026");
  });

  it("href", () => {
    expect(calendarHref("week")).toBe("/studio/kalender?view=week");
    expect(calendarHref("month", "2026-10-01")).toBe("/studio/kalender?view=month&date=2026-10-01");
  });
});
