import { describe, expect, it } from "vitest";
import { hasDuplicateSlot, postingSlotsInputSchema } from "./schema";
import { activeShareTotal, addSlot, moveId, removeSlot } from "./utils";

describe("moveId", () => {
  const ids = ["a", "b", "c"];

  it("memindah ke atas dan ke bawah", () => {
    expect(moveId(ids, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveId(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("null jika sudah di ujung atau id tidak ada", () => {
    expect(moveId(ids, "a", "up")).toBeNull();
    expect(moveId(ids, "c", "down")).toBeNull();
    expect(moveId(ids, "x", "up")).toBeNull();
    expect(moveId([], "a", "down")).toBeNull();
  });

  it("tidak mengubah array asli", () => {
    moveId(ids, "b", "up");
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("activeShareTotal", () => {
  it("hanya menjumlah pilar aktif", () => {
    expect(
      activeShareTotal([
        { targetShare: 30, isActive: true },
        { targetShare: 30, isActive: true },
        { targetShare: 40, isActive: false },
      ]),
    ).toBe(60);
  });

  it("0 untuk daftar kosong", () => {
    expect(activeShareTotal([])).toBe(0);
  });
});

describe("addSlot / removeSlot", () => {
  const slots = [
    { day: 2, time: "19:00" },
    { day: 6, time: "19:00" },
  ];

  it("menambah dan mengurutkan", () => {
    const result = addSlot(slots, { day: 4, time: "12:00" });
    expect(result).toEqual({
      ok: true,
      slots: [
        { day: 2, time: "19:00" },
        { day: 4, time: "12:00" },
        { day: 6, time: "19:00" },
      ],
    });
  });

  it("hari sama jam beda boleh, urut berdasarkan jam", () => {
    const result = addSlot(slots, { day: 2, time: "08:00" });
    expect(result.ok && result.slots[0]).toEqual({ day: 2, time: "08:00" });
  });

  it("menolak duplikat", () => {
    expect(addSlot(slots, { day: 2, time: "19:00" }).ok).toBe(false);
  });

  it("menolak jika melebihi batas", () => {
    expect(addSlot(slots, { day: 1, time: "10:00" }, 2).ok).toBe(false);
  });

  it("menghapus slot yang cocok saja", () => {
    expect(removeSlot(slots, { day: 2, time: "19:00" })).toEqual([{ day: 6, time: "19:00" }]);
    expect(removeSlot(slots, { day: 3, time: "19:00" })).toEqual(slots);
  });
});

describe("validasi slot", () => {
  it("mendeteksi duplikat", () => {
    expect(hasDuplicateSlot([{ day: 1, time: "10:00" }, { day: 1, time: "10:00" }])).toBe(true);
    expect(hasDuplicateSlot([{ day: 1, time: "10:00" }, { day: 2, time: "10:00" }])).toBe(false);
    expect(hasDuplicateSlot([])).toBe(false);
  });

  it("schema menolak duplikat dan jam tidak valid", () => {
    expect(postingSlotsInputSchema.safeParse([{ day: 1, time: "10:00" }]).success).toBe(true);
    expect(
      postingSlotsInputSchema.safeParse([
        { day: 1, time: "10:00" },
        { day: 1, time: "10:00" },
      ]).success,
    ).toBe(false);
    expect(postingSlotsInputSchema.safeParse([{ day: 1, time: "24:00" }]).success).toBe(false);
    expect(postingSlotsInputSchema.safeParse([{ day: 8, time: "10:00" }]).success).toBe(false);
  });
});
