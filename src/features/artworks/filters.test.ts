import { describe, expect, it } from "vitest";
import { artworkListHref, hasActiveFilter, parseArtworkFilters } from "./filters";

describe("filter daftar karya Studio", () => {
  it("tanpa parameter → semua null", () => {
    const filters = parseArtworkFilters({});
    expect(filters).toEqual({ visibility: null, medium: null, availability: null });
    expect(hasActiveFilter(filters)).toBe(false);
  });

  it("membaca nilai enum yang valid (array → elemen pertama)", () => {
    expect(
      parseArtworkFilters({ publikasi: "PUBLISHED", medium: ["CLAY", "DRAWING"], ketersediaan: "SOLD" }),
    ).toEqual({ visibility: "PUBLISHED", medium: "CLAY", availability: "SOLD" });
  });

  it("nilai tidak dikenal diabaikan", () => {
    expect(parseArtworkFilters({ publikasi: "published", medium: "KAYU", ketersediaan: "" })).toEqual({
      visibility: null,
      medium: null,
      availability: null,
    });
  });

  it("href hanya menulis filter yang aktif dan bisa dibaca balik", () => {
    expect(artworkListHref({ visibility: null, medium: null, availability: null })).toBe("/studio/karya");
    const href = artworkListHref({ visibility: "DRAFT", medium: null, availability: "AVAILABLE" });
    expect(href).toBe("/studio/karya?publikasi=DRAFT&ketersediaan=AVAILABLE");
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseArtworkFilters(params)).toEqual({ visibility: "DRAFT", medium: null, availability: "AVAILABLE" });
  });
});
