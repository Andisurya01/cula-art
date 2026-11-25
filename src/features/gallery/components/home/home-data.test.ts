import { describe, expect, it } from "vitest";
import { galleryCopy } from "../../copy";
import { HERO_TAGLINE_MAX, hasProfileSummary, heroHeading, numberSections, yearsActive } from "./home-data";

describe("heroHeading", () => {
  it("tagline pendek menjadi baris kedua judul, tanpa paragraf", () => {
    expect(heroHeading("Patung kecil dari tanah liat")).toEqual({ second: "Patung kecil dari tanah liat", lead: null });
  });

  it("tagline panjang tampil sebagai paragraf; judul memakai teks bawaan", () => {
    const long = "x".repeat(HERO_TAGLINE_MAX + 1);
    expect(heroHeading(long)).toEqual({ second: galleryCopy.home.heroSecond, lead: long });
  });

  it("tanpa tagline: teks bawaan, tanpa paragraf", () => {
    expect(heroHeading(null)).toEqual({ second: galleryCopy.home.heroSecond, lead: null });
  });
});

describe("yearsActive", () => {
  it("rentang inklusif", () => {
    expect(yearsActive({ firstYear: 2024, lastYear: 2026 })).toBe(3);
    expect(yearsActive({ firstYear: 2026, lastYear: 2026 })).toBe(1);
  });

  it("tanpa tahun atau rentang tidak masuk akal → null", () => {
    expect(yearsActive({ firstYear: null, lastYear: null })).toBeNull();
    expect(yearsActive({ firstYear: 2026, lastYear: 2025 })).toBeNull();
  });
});

describe("hasProfileSummary", () => {
  const empty = { avatarSrc: null, bio: null, instagramUrl: null, tiktokUrl: null };
  it("kosong semua → tidak tampil; salah satu terisi → tampil", () => {
    expect(hasProfileSummary(empty)).toBe(false);
    expect(hasProfileSummary({ ...empty, bio: "Halo" })).toBe(true);
    expect(hasProfileSummary({ ...empty, tiktokUrl: "https://www.tiktok.com/@a" })).toBe(true);
  });
});

describe("numberSections", () => {
  it("bagian tersembunyi dilewati, nomor tetap urut", () => {
    expect(numberSections({ stats: true, featured: false, latest: true, medium: true, profile: false })).toEqual({
      stats: 1,
      latest: 2,
      medium: 3,
    });
  });
});

describe("label meta hero", () => {
  it("medium dari karya Terbit + tahun pertama", () => {
    expect(galleryCopy.home.metaLine(["DRAWING", "CLAY"], 2024)).toBe("Karya gambar & clay · Sejak 2024");
    expect(galleryCopy.home.metaLine(["DRAWING", "CLAY", "MIXED"], null)).toBe("Karya gambar, clay & campuran");
    expect(galleryCopy.home.metaLine([], null)).toBe("Galeri karya");
  });
});
