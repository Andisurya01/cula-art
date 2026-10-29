import { describe, expect, it } from "vitest";
import { isValidSlug, SLUG_MAX_LENGTH, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Patung Kepala Naga", "patung-kepala-naga"],
    ["Patung Kepala Naga (2026)", "patung-kepala-naga-2026"],
    ["  Tangan   Kiri — Studi #3  ", "tangan-kiri-studi-3"],
    ["Jum'at Sore", "jumat-sore"],
    ["Kopi & Senja", "kopi-dan-senja"],
    ["Café Tua", "cafe-tua"],
    ["Gambar_tangan.v2", "gambar-tangan-v2"],
    ["???", "karya"],
    ["", "karya"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("dipotong maksimal 80 karakter tanpa tanda hubung di akhir", () => {
    const slug = slugify(`${"a".repeat(79)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("hasil slugify selalu valid", () => {
    for (const text of ["Naga", "Studi 1/30", "A--B", "ÀÉÎ", "x".repeat(200)]) {
      expect(isValidSlug(slugify(text))).toBe(true);
    }
  });
});

describe("isValidSlug", () => {
  it.each(["naga", "naga-merah", "studi-30-hari", "a1"])("valid: %s", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["", "Naga", "naga merah", "-naga", "naga-", "naga--merah", "naga_merah", "naga/merah", "x".repeat(81)])(
    "tidak valid: %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe("uniqueSlug", () => {
  it("memakai slug dasar jika belum dipakai", async () => {
    expect(await uniqueSlug("naga", () => false)).toBe("naga");
  });

  it("akhiran -2, -3 untuk slug yang sudah dipakai", async () => {
    const taken = new Set(["naga", "naga-2"]);
    expect(await uniqueSlug("naga", (s) => taken.has(s))).toBe("naga-3");
  });

  it("menerima pengecekan async dan teks bebas", async () => {
    const taken = new Set(["kepala-naga"]);
    expect(await uniqueSlug("Kepala Naga", async (s) => taken.has(s))).toBe("kepala-naga-2");
  });

  it("akhiran tetap muat dalam 80 karakter", async () => {
    const base = "a".repeat(SLUG_MAX_LENGTH);
    const slug = await uniqueSlug(base, (s) => s === base);
    expect(slug.length).toBe(SLUG_MAX_LENGTH);
    expect(slug.endsWith("-2")).toBe(true);
  });
});
