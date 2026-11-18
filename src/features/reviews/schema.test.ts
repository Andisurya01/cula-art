import { describe, expect, it } from "vitest";
import { REVIEW_TEXT_MAX, reviewDraftInput } from "@/features/ai/prompts/review-draft";
import { focusExcerpt, focusListText, toReviewDraftInput } from "./draft";
import { REVIEW_FIELD_MAX, REVIEW_PLAN_MAX, reviewFormSchema, saveWeeklyReviewSchema } from "./schema";

const EMPTY = { wins: "", repeat: "", stop: "", focusNext: "", plannedContentIds: [] };

describe("schema review", () => {
  it("batas field sama dengan batas draf AI", () => {
    expect(REVIEW_FIELD_MAX).toBe(REVIEW_TEXT_MAX);
    expect(REVIEW_PLAN_MAX).toBe(3);
  });

  it("form kosong sah; teks terlalu panjang ditolak", () => {
    expect(reviewFormSchema.safeParse(EMPTY).success).toBe(true);
    expect(reviewFormSchema.safeParse({ ...EMPTY, wins: "x".repeat(REVIEW_FIELD_MAX) }).success).toBe(true);
    expect(reviewFormSchema.safeParse({ ...EMPTY, stop: "x".repeat(REVIEW_FIELD_MAX + 1) }).success).toBe(false);
  });

  it("rencana maks. 3 konten dan tanpa duplikat", () => {
    expect(reviewFormSchema.safeParse({ ...EMPTY, plannedContentIds: ["a", "b", "c"] }).success).toBe(true);
    expect(reviewFormSchema.safeParse({ ...EMPTY, plannedContentIds: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(reviewFormSchema.safeParse({ ...EMPTY, plannedContentIds: ["a", "a"] }).success).toBe(false);
    expect(reviewFormSchema.safeParse({ ...EMPTY, plannedContentIds: [""] }).success).toBe(false);
  });

  it("aksi butuh tanggal minggu yang valid", () => {
    expect(saveWeeklyReviewSchema.safeParse({ ...EMPTY, weekStart: "2026-11-02" }).success).toBe(true);
    for (const weekStart of ["", "2026-02-31", "02-11-2026", undefined]) {
      expect(saveWeeklyReviewSchema.safeParse({ ...EMPTY, weekStart }).success).toBe(false);
    }
  });
});

describe("draft", () => {
  it("input Draf ringkasan lolos skema input fitur AI", () => {
    const input = toReviewDraftInput("2026-11-02", { ...EMPTY, wins: "Clay ramai", focusNext: "- Seri naga" });
    expect(input).toEqual({ weekStart: "2026-11-02", wins: "Clay ramai", repeat: "", stop: "", focusNext: "- Seri naga" });
    expect(reviewDraftInput.safeParse(input).success).toBe(true);
    expect(reviewDraftInput.safeParse(toReviewDraftInput("2026-11-02", EMPTY)).success).toBe(true);
  });

  it("3 fokus → satu poin per baris; item kosong dibuang", () => {
    expect(focusListText([" Seri naga ", "Hook hari ke-N", "Jam 19.00"])).toBe("- Seri naga\n- Hook hari ke-N\n- Jam 19.00");
    expect(focusListText(["", undefined, null, "Satu"])).toBe("- Satu");
    expect(focusListText([])).toBe("");
  });

  it("potongan fokus: baris pertama berisi tanpa penanda poin", () => {
    expect(focusExcerpt("\n- Seri naga\n- Hook")).toBe("Seri naga");
    expect(focusExcerpt("1. Jam 19.00")).toBe("Jam 19.00");
    expect(focusExcerpt("Tulis bebas")).toBe("Tulis bebas");
    expect(focusExcerpt("  \n - \n")).toBeNull();
    expect(focusExcerpt(null)).toBeNull();
    expect(focusExcerpt("")).toBeNull();
  });
});
