import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import {
  DEFAULT_ANALYTICS_FILTERS,
  analyticsFiltersToQuery,
  analyticsHref,
  parseAnalyticsFilters,
} from "./schema";

describe("parseAnalyticsFilters", () => {
  it("tanpa parameter memakai default: TikTok, 30 hari, semua medium", () => {
    expect(parseAnalyticsFilters({})).toEqual({ platform: "TIKTOK", days: 30, medium: null });
  });

  it("membaca nilai yang valid", () => {
    expect(parseAnalyticsFilters({ platform: "INSTAGRAM", rentang: "90", medium: "CLAY" })).toEqual({
      platform: "INSTAGRAM",
      days: 90,
      medium: "CLAY",
    });
    expect(parseAnalyticsFilters({ rentang: "7" }).days).toBe(7);
  });

  it("D1: tidak ada pilihan Semua, platform tidak dikenal jatuh ke TikTok", () => {
    for (const platform of ["ALL", "Semua", "", "tiktok", "instagram"]) {
      expect(parseAnalyticsFilters({ platform }).platform).toBe("TIKTOK");
    }
  });

  it("rentang di luar 7/30/90 jatuh ke 30", () => {
    for (const rentang of ["0", "14", "30.0", "030", " 7", "-7", "abc", ""]) {
      expect(parseAnalyticsFilters({ rentang }).days).toBe(30);
    }
  });

  it("medium tidak dikenal jatuh ke semua medium", () => {
    for (const medium of ["PHOTO", "clay", "", "ALL"]) {
      expect(parseAnalyticsFilters({ medium }).medium).toBeNull();
    }
  });

  it("parameter ganda memakai nilai pertama", () => {
    expect(
      parseAnalyticsFilters({ platform: ["INSTAGRAM", "TIKTOK"], rentang: ["7", "90"], medium: ["MIXED", "CLAY"] }),
    ).toEqual({ platform: "INSTAGRAM", days: 7, medium: "MIXED" });
  });
});

describe("analyticsFiltersToQuery dan analyticsHref", () => {
  it("nilai default tidak ditulis", () => {
    expect(analyticsFiltersToQuery(DEFAULT_ANALYTICS_FILTERS)).toBe("");
    expect(analyticsHref(DEFAULT_ANALYTICS_FILTERS)).toBe(routes.studio.analytics);
  });

  it("nilai lain ditulis dengan nama parameter yang disepakati", () => {
    const filters = { platform: "INSTAGRAM", days: 7, medium: "DRAWING" } as const;
    expect(analyticsFiltersToQuery(filters)).toBe("platform=INSTAGRAM&rentang=7&medium=DRAWING");
    expect(analyticsHref(filters)).toBe(`${routes.studio.analytics}?platform=INSTAGRAM&rentang=7&medium=DRAWING`);
  });

  it("hasil query kembali ke filter yang sama lewat parser", () => {
    const filters = { platform: "INSTAGRAM", days: 90, medium: "CLAY" } as const;
    const parsed = parseAnalyticsFilters(Object.fromEntries(new URLSearchParams(analyticsFiltersToQuery(filters))));
    expect(parsed).toEqual(filters);
  });
});
