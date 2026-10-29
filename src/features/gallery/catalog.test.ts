import { describe, expect, it } from "vitest";
import {
  CATALOG_MAX_PAGE,
  catalogHref,
  catalogHrefFromForm,
  hasActiveFilters,
  parseCatalogParams,
} from "./catalog";

describe("filter katalog di URL", () => {
  it("parse: nilai tidak dikenal/kosong jadi default", () => {
    expect(parseCatalogParams({})).toEqual({ medium: null, status: null, year: null, q: "", sort: "terbaru", page: 1 });
    expect(
      parseCatalogParams({ medium: "clay", status: "SOLD", tahun: "abc", urut: "harga", halaman: "-1", q: "" }),
    ).toEqual({ medium: null, status: null, year: null, q: "", sort: "terbaru", page: 1 });
    expect(parseCatalogParams({ halaman: String(CATALOG_MAX_PAGE + 1) }).page).toBe(1);
  });

  it("parse: nilai valid (array → nilai pertama, pencarian dipangkas)", () => {
    expect(
      parseCatalogParams({ medium: ["CLAY", "DRAWING"], status: "AVAILABLE", tahun: "2026", q: "  naga ", urut: "unggulan", halaman: "3" }),
    ).toEqual({ medium: "CLAY", status: "AVAILABLE", year: 2026, q: "naga", sort: "unggulan", page: 3 });
    expect(parseCatalogParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("href: default tidak ditulis; bolak-balik parse → href stabil", () => {
    expect(catalogHref({})).toBe("/karya");
    expect(catalogHref({ medium: "DRAWING" })).toBe("/karya?medium=DRAWING");
    const href = catalogHref({ medium: "CLAY", status: "UNAVAILABLE", year: 2025, q: "naga merah", sort: "unggulan", page: 2 });
    expect(href).toBe("/karya?medium=CLAY&status=UNAVAILABLE&tahun=2025&q=naga+merah&urut=unggulan&halaman=2");
    const params = Object.fromEntries(new URL(href, "https://x").searchParams);
    expect(catalogHref(parseCatalogParams(params))).toBe(href);
  });

  it("form → href: field kosong dibuang dan halaman kembali ke 1", () => {
    const form = new FormData();
    form.set("q", "  ");
    form.set("medium", "");
    form.set("status", "AVAILABLE");
    form.set("tahun", "");
    form.set("urut", "terbaru");
    form.set("halaman", "4");
    expect(catalogHrefFromForm(form.entries())).toBe("/karya?status=AVAILABLE");
    expect(catalogHrefFromForm([["medium", "CLAY"], ["q", "naga"]])).toBe("/karya?medium=CLAY&q=naga");
    expect(catalogHrefFromForm([])).toBe("/karya");
  });

  it("hasActiveFilters: urutan dan halaman tidak dihitung", () => {
    expect(hasActiveFilters(parseCatalogParams({ urut: "unggulan", halaman: "2" }))).toBe(false);
    expect(hasActiveFilters(parseCatalogParams({ q: "naga" }))).toBe(true);
    expect(hasActiveFilters(parseCatalogParams({ tahun: "2026" }))).toBe(true);
  });
});
