import { describe, expect, it } from "vitest";
import {
  aiGuideContentSchema,
  aiTechnicalSettingsSchema,
  EMPTY_HASHTAG_SETS,
  EMPTY_VOICE,
  parseAiGuideRow,
  parseHashtags,
  type AiGuideRow,
} from "./guide-schema";

const ROW: AiGuideRow = {
  isEnabled: true,
  model: "claude-opus-5-5",
  voiceJson: "{}",
  voiceNotes: null,
  examplesJson: "[]",
  creatorFacts: null,
  hashtagSetsJson: "{}",
  avoidNotes: null,
  monthlyBudgetUsd: 10,
  dailyCallLimit: 100,
};

describe("parseHashtags", () => {
  it("menambah #, membuang tanda baca, unik tanpa peduli huruf besar", () => {
    expect(parseHashtags("gambar, #Clay  #clay ##tutorial;seni-rupa #")).toEqual([
      "#gambar",
      "#Clay",
      "#tutorial",
      "#senirupa",
    ]);
  });

  it("teks kosong → daftar kosong", () => {
    expect(parseHashtags("   ")).toEqual([]);
  });
});

describe("parseAiGuideRow", () => {
  it("kolom JSON rusak atau tidak lengkap → default", () => {
    const guide = parseAiGuideRow({ ...ROW, voiceJson: "{rusak", hashtagSetsJson: "{}", examplesJson: '[{"kind":"X"}]' });
    expect(guide.voice).toEqual(EMPTY_VOICE);
    expect(guide.hashtagSets).toEqual(EMPTY_HASHTAG_SETS);
    expect(guide.examples).toEqual([]);
  });

  it("model yang tidak ada di daftar → default Opus 5.5", () => {
    expect(parseAiGuideRow({ ...ROW, model: "gpt-x" }).model).toBe("claude-opus-5-5");
  });
});

describe("schema form", () => {
  it("maks. 10 contoh dan hashtag harus berformat #kata", () => {
    const base = {
      voice: EMPTY_VOICE,
      examples: [],
      hashtagSets: EMPTY_HASHTAG_SETS,
    };
    const tooMany = Array.from({ length: 11 }, () => ({ kind: "HOOK", platform: null, text: "x" }));
    expect(aiGuideContentSchema.safeParse({ ...base, examples: tooMany }).success).toBe(false);
    const badTag = { general: { TIKTOK: ["tanpa-pagar"], INSTAGRAM: [] }, pillars: {} };
    expect(aiGuideContentSchema.safeParse({ ...base, hashtagSets: badTag }).success).toBe(false);
    expect(aiGuideContentSchema.safeParse({ ...base, voiceNotes: "  " }).data?.voiceNotes).toBeNull();
  });

  it("batas teknis divalidasi", () => {
    const ok = { isEnabled: true, model: "claude-sonnet-5-5", monthlyBudgetUsd: 10, dailyCallLimit: 100 };
    expect(aiTechnicalSettingsSchema.safeParse(ok).success).toBe(true);
    expect(aiTechnicalSettingsSchema.safeParse({ ...ok, monthlyBudgetUsd: 0 }).success).toBe(false);
    expect(aiTechnicalSettingsSchema.safeParse({ ...ok, dailyCallLimit: 1.5 }).success).toBe(false);
    expect(aiTechnicalSettingsSchema.safeParse({ ...ok, model: "gpt-x" }).success).toBe(false);
  });
});
