import { describe, expect, it } from "vitest";
import { wibToUtc } from "@/lib/date";
import { itemsByDate } from "./day-items";
import type { CalendarPost } from "./schedule";
import type { CalendarSlot } from "./slots";

function post(id: string, date: string, time: string): CalendarPost {
  return {
    id,
    contentId: id,
    title: id,
    platform: "TIKTOK",
    pillarName: "P",
    pillarColor: "#000",
    at: wibToUtc(date, time),
    posted: false,
  };
}

function slot(date: string, time: string, filled: boolean): CalendarSlot {
  return { key: `${date}T${time}`, date, time, at: wibToUtc(date, time), filled, urgency: "none" };
}

describe("itemsByDate", () => {
  it("mengelompokkan per tanggal WIB, urut jam, slot terisi tidak ditampilkan", () => {
    const map = itemsByDate(
      [post("b", "2026-10-29", "19:00"), post("a", "2026-10-29", "06:00")],
      [slot("2026-10-29", "19:00", false), slot("2026-10-29", "12:00", true), slot("2026-10-30", "19:00", false)],
    );
    expect(map.get("2026-10-29")?.map((i) => `${i.kind}@${i.time}`)).toEqual([
      "post@06:00",
      "post@19:00",
      "slot@19:00",
    ]);
    expect(map.get("2026-10-30")?.length).toBe(1);
  });

  it("data kosong", () => {
    expect(itemsByDate([], []).size).toBe(0);
  });
});
