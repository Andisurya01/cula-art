import { describe, expect, it } from "vitest";
import {
  DEFAULT_IDEA_FILTERS,
  ideaFiltersToQuery,
  ideaSchema,
  parseIdeaFilters,
} from "./schema";

describe("parseIdeaFilters", () => {
  it("default: status Baru, urut terbaru", () => {
    expect(parseIdeaFilters({})).toEqual(DEFAULT_IDEA_FILTERS);
  });

  it("membaca nilai valid dan mengabaikan yang tidak dikenal", () => {
    expect(
      parseIdeaFilters({ pillar: "p1", medium: "CLAY", status: "ALL", sort: "score" }),
    ).toEqual({ pillarId: "p1", medium: "CLAY", status: "ALL", sort: "score" });
    expect(parseIdeaFilters({ medium: "PAINT", status: "x", sort: "y", pillar: "" })).toEqual(
      DEFAULT_IDEA_FILTERS,
    );
    expect(parseIdeaFilters({ medium: ["DRAWING", "CLAY"] }).medium).toBe("DRAWING");
  });

  it("query string bolak-balik; default tidak ditulis", () => {
    expect(ideaFiltersToQuery(DEFAULT_IDEA_FILTERS)).toBe("");
    const filters = { pillarId: "p1", medium: "MIXED", status: "ARCHIVED", sort: "score" } as const;
    const query = ideaFiltersToQuery(filters);
    expect(parseIdeaFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
  });
});

describe("ideaSchema", () => {
  const base = {
    title: "Ide",
    pillarId: null,
    medium: null,
    notes: "",
    refUrl: "",
    potential: null,
    effort: null,
  };

  it("link referensi boleh kosong atau URL http(s) valid", () => {
    expect(ideaSchema.safeParse(base).success).toBe(true);
    expect(ideaSchema.safeParse({ ...base, refUrl: "https://tiktok.com/@a" }).success).toBe(true);
    expect(ideaSchema.safeParse({ ...base, refUrl: "bukan url" }).success).toBe(false);
    expect(ideaSchema.safeParse({ ...base, refUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("potensi dan effort 1-5 atau kosong", () => {
    expect(ideaSchema.safeParse({ ...base, potential: 5, effort: 1 }).success).toBe(true);
    expect(ideaSchema.safeParse({ ...base, potential: 0 }).success).toBe(false);
    expect(ideaSchema.safeParse({ ...base, effort: 6 }).success).toBe(false);
  });
});
