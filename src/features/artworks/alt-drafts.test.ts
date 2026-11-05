import { describe, expect, it } from "vitest";
import {
  countAltDrafts,
  mergeAltDrafts,
  normalizeAlt,
  removeAltDraft,
  setAltDraft,
  type AltDrafts,
} from "./alt-drafts";
import { ALT_MAX_LENGTH } from "./schema";

const photos = [
  { id: "a", alt: "" },
  { id: "b", alt: "Patung naga dari samping" },
  { id: "c", alt: "Lama" },
];

describe("normalizeAlt", () => {
  it("satu baris, spasi dirapikan, dipotong ke batas", () => {
    expect(normalizeAlt("  Patung\nnaga   hijau ")).toBe("Patung naga hijau");
    expect(normalizeAlt("x".repeat(ALT_MAX_LENGTH + 20))).toHaveLength(ALT_MAX_LENGTH);
    expect(normalizeAlt(null)).toBe("");
    expect(normalizeAlt(undefined)).toBe("");
  });
});

describe("mergeAltDrafts", () => {
  it("saran AI menjadi draf per foto (tidak menyentuh teks tersimpan)", () => {
    const result = mergeAltDrafts({}, [
      { imageId: "a", alt: "Patung naga hijau dari depan" },
      { imageId: "c", alt: "Detail sisik naga" },
    ], photos);
    expect(result.drafts).toEqual({ a: "Patung naga hijau dari depan", c: "Detail sisik naga" });
    expect(result.applied).toEqual(["a", "c"]);
    expect(photos[0].alt).toBe("");
  });

  it("foto yang tidak ada, imageId kosong, dan teks kosong diabaikan", () => {
    const result = mergeAltDrafts({}, [
      { imageId: "hilang", alt: "x" },
      { imageId: null, alt: "y" },
      { alt: "z" },
      { imageId: "a", alt: "   " },
    ], photos);
    expect(result.drafts).toEqual({});
    expect(result.applied).toEqual([]);
  });

  it("imageId ganda → saran pertama yang dipakai", () => {
    const result = mergeAltDrafts({}, [
      { imageId: "a", alt: "Pertama" },
      { imageId: "a", alt: "Kedua" },
    ], photos);
    expect(result.drafts).toEqual({ a: "Pertama" });
    expect(result.applied).toEqual(["a"]);
  });

  it("saran sama dengan teks tersimpan → draf foto itu dihapus, tidak dihitung", () => {
    const before: AltDrafts = { b: "Draf lama", c: "Draf lain" };
    const result = mergeAltDrafts(before, [{ imageId: "b", alt: " Patung naga dari samping " }], photos);
    expect(result.drafts).toEqual({ c: "Draf lain" });
    expect(result.applied).toEqual([]);
  });

  it("draf lama foto lain tetap, draf foto yang sama ditimpa", () => {
    const result = mergeAltDrafts({ a: "Lama", c: "Tetap" }, [{ imageId: "a", alt: "Baru" }], photos);
    expect(result.drafts).toEqual({ a: "Baru", c: "Tetap" });
  });

  it("tidak mengubah objek draf asal", () => {
    const before: AltDrafts = { a: "Lama" };
    mergeAltDrafts(before, [{ imageId: "a", alt: "Baru" }], photos);
    expect(before).toEqual({ a: "Lama" });
  });

  it("tanpa saran → draf tetap", () => {
    const before: AltDrafts = { a: "Lama" };
    expect(mergeAltDrafts(before, [], photos)).toEqual({ drafts: before, applied: [] });
  });
});

describe("setAltDraft / removeAltDraft", () => {
  it("mengubah satu draf tanpa mutasi", () => {
    const before: AltDrafts = { a: "x" };
    const after = setAltDraft(before, "b", "y");
    expect(after).toEqual({ a: "x", b: "y" });
    expect(before).toEqual({ a: "x" });
    expect(removeAltDraft(after, "a")).toEqual({ b: "y" });
  });

  it("menghapus draf yang tidak ada → objek yang sama", () => {
    const drafts: AltDrafts = { a: "x" };
    expect(removeAltDraft(drafts, "z")).toBe(drafts);
  });
});

describe("countAltDrafts", () => {
  it("hanya menghitung draf untuk foto yang masih ada", () => {
    expect(countAltDrafts({ a: "x", hilang: "y" }, ["a", "b"])).toBe(1);
    expect(countAltDrafts({}, [])).toBe(0);
  });
});
