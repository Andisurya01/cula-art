import { describe, expect, it } from "vitest";
import { erTargetNote, followerTargetNote, platformTarget } from "./targets";

describe("platformTarget", () => {
  const target = { tiktokFollowers: 5000, igFollowers: 2000, tiktokEr: 8, igEr: 4.5 };

  it("hanya mengambil target platform aktif", () => {
    expect(platformTarget(target, "TIKTOK")).toEqual({ followers: 5000, er: 8 });
    expect(platformTarget(target, "INSTAGRAM")).toEqual({ followers: 2000, er: 4.5 });
  });

  it("D11: target yang belum diisi menjadi `null`, juga saat kosong sama sekali", () => {
    expect(platformTarget({}, "TIKTOK")).toEqual({ followers: null, er: null });
    expect(platformTarget({ tiktokFollowers: 5000 }, "INSTAGRAM")).toEqual({ followers: null, er: null });
    expect(platformTarget({ igEr: 3 }, "INSTAGRAM")).toEqual({ followers: null, er: 3 });
  });
});

describe("followerTargetNote", () => {
  it("tanpa target tidak ada catatan", () => {
    expect(followerTargetNote(null, 3400)).toBeNull();
  });

  it("menyebut target dan angka sekarang", () => {
    expect(followerTargetNote(5000, 3400)).toBe("Target 3 bulan: 5.000 (sekarang 3.400)");
    expect(followerTargetNote(5000, 0)).toBe("Target 3 bulan: 5.000 (sekarang 0)");
  });

  it("belum ada snapshot: hanya menyebut target", () => {
    expect(followerTargetNote(5000, null)).toBe("Target 3 bulan: 5.000");
  });
});

describe("erTargetNote", () => {
  it("tanpa target tidak ada catatan", () => {
    expect(erTargetNote(null)).toBeNull();
  });

  it("memakai format persen", () => {
    expect(erTargetNote(8)).toBe("Target 3 bulan: 8,0%");
  });
});
