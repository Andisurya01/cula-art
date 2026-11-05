import { describe, expect, it } from "vitest";
import {
  EMPTY_HASHTAG_SETS,
  EMPTY_VOICE,
  MAX_HASHTAGS_PER_SET,
  type AiGuideContent,
} from "@/features/ai/guide-schema";
import {
  aiGuideFormSchema,
  aiRunFeatureLabel,
  aiRunModelLabel,
  budgetLevel,
  countHashtags,
  firstErrorMessage,
  formatPercent,
  toAiGuideContentInput,
  toAiGuideFormValues,
  type AiGuideFormValues,
} from "./ai-guide";

const EMPTY_GUIDE: AiGuideContent = {
  voice: EMPTY_VOICE,
  voiceNotes: null,
  examples: [],
  creatorFacts: null,
  hashtagSets: EMPTY_HASHTAG_SETS,
  avoidNotes: null,
};

const GUIDE: AiGuideContent = {
  voice: {
    formality: "CASUAL",
    englishMix: "SOME",
    greeting: "kalian",
    emoji: null,
    captionLength: "MEDIUM",
    ctas: "Simpan dulu biar nggak lupa",
  },
  voiceNotes: "Hangat, tidak lebay.",
  examples: [{ kind: "HOOK", platform: "TIKTOK", text: "Dari gumpalan clay jadi kucing." }],
  creatorFacts: "Belajar clay sejak 2024.",
  hashtagSets: {
    general: { TIKTOK: ["#clay", "#seni"], INSTAGRAM: [] },
    pillars: {
      aktif: { TIKTOK: ["#proses"], INSTAGRAM: ["#prosesberkarya"] },
      nonaktif: { TIKTOK: ["#lama"], INSTAGRAM: [] },
      dihapus: { TIKTOK: ["#hilang"], INSTAGRAM: [] },
    },
  },
  avoidNotes: "Politik",
};

const PILLARS = [
  { id: "aktif", isActive: true },
  { id: "baru", isActive: true },
  { id: "nonaktif", isActive: false },
  { id: "kosong-nonaktif", isActive: false },
];

function parse(values: AiGuideFormValues) {
  return aiGuideFormSchema.safeParse(values);
}

describe("toAiGuideFormValues", () => {
  it("null → string kosong, hashtag → teks", () => {
    const values = toAiGuideFormValues(GUIDE, PILLARS);
    expect(values.voice).toEqual(GUIDE.voice);
    expect(values.hashtagSets.general).toEqual({ TIKTOK: "#clay #seni", INSTAGRAM: "" });
    expect(toAiGuideFormValues(EMPTY_GUIDE, []).voiceNotes).toBe("");
    expect(toAiGuideFormValues(EMPTY_GUIDE, []).voice.greeting).toBe("");
  });

  it("pilar aktif selalu ada, pilar nonaktif hanya jika punya hashtag, pilar terhapus dibuang", () => {
    const { pillars } = toAiGuideFormValues(GUIDE, PILLARS).hashtagSets;
    expect(Object.keys(pillars).sort()).toEqual(["aktif", "baru", "nonaktif"]);
    expect(pillars.baru).toEqual({ TIKTOK: "", INSTAGRAM: "" });
    expect(pillars.nonaktif).toEqual({ TIKTOK: "#lama", INSTAGRAM: "" });
  });

  it("contoh disalin, bukan dibagi referensinya", () => {
    const values = toAiGuideFormValues(GUIDE, PILLARS);
    values.examples[0].text = "ubah";
    expect(GUIDE.examples[0].text).toBe("Dari gumpalan clay jadi kucing.");
  });
});

describe("toAiGuideContentInput / aiGuideFormSchema", () => {
  it("bolak-balik menghasilkan panduan yang sama (tanpa pilar terhapus)", () => {
    const result = parse(toAiGuideFormValues(GUIDE, PILLARS));
    expect(result.success).toBe(true);
    const { aktif, nonaktif } = GUIDE.hashtagSets.pillars;
    expect(result.data).toEqual({ ...GUIDE, hashtagSets: { ...GUIDE.hashtagSets, pillars: { aktif, nonaktif } } });
  });

  it("teks hashtag bebas dirapikan; set pilar yang kosong tidak dikirim", () => {
    const values = toAiGuideFormValues(EMPTY_GUIDE, PILLARS);
    values.hashtagSets.general.TIKTOK = "gambar, #Clay  clay";
    values.hashtagSets.pillars.aktif = { TIKTOK: "", INSTAGRAM: "proses-karya" };
    const input = toAiGuideContentInput(values);
    expect(input.hashtagSets.general).toEqual({ TIKTOK: ["#gambar", "#Clay"], INSTAGRAM: [] });
    expect(input.hashtagSets.pillars).toEqual({ aktif: { TIKTOK: [], INSTAGRAM: ["#proseskarya"] } });
  });

  it("teks kosong/spasi → null", () => {
    const values = toAiGuideFormValues(EMPTY_GUIDE, []);
    values.voice.greeting = "   ";
    values.creatorFacts = "  Fakta  ";
    const result = parse(values);
    expect(result.success && result.data.voice.greeting).toBeNull();
    expect(result.success && result.data.creatorFacts).toBe("Fakta");
  });

  it("path error sama dengan nama field form", () => {
    const values = toAiGuideFormValues(EMPTY_GUIDE, PILLARS);
    values.examples = [{ kind: "CAPTION", platform: null, text: "  " }];
    values.hashtagSets.pillars.aktif.TIKTOK = Array.from({ length: MAX_HASHTAGS_PER_SET + 1 }, (_, i) => `t${i}`).join(" ");
    values.avoidNotes = "x".repeat(2001);
    const result = parse(values);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining(["examples.0.text", "hashtagSets.pillars.aktif.TIKTOK", "avoidNotes"]),
    );
  });
});

describe("countHashtags", () => {
  it("menghitung hashtag unik yang akan tersimpan", () => {
    expect(countHashtags("#a a, b ;; #")).toBe(2);
    expect(countHashtags("")).toBe(0);
  });
});

describe("firstErrorMessage", () => {
  it("mencari pesan pertama di objek bersarang/array dan melewati ref", () => {
    const ref = { message: "elemen DOM", parent: null as unknown };
    ref.parent = ref;
    expect(
      firstErrorMessage({ hashtagSets: { general: { TIKTOK: [undefined, { ref, message: "Hashtag tidak valid" }] } } }),
    ).toBe("Hashtag tidak valid");
    expect(firstErrorMessage({ field: { ref } })).toBeNull();
    expect(firstErrorMessage({ examples: { root: { message: "Maksimal 10 contoh" } } })).toBe("Maksimal 10 contoh");
  });

  it("null jika tidak ada pesan", () => {
    expect(firstErrorMessage({})).toBeNull();
    expect(firstErrorMessage(undefined)).toBeNull();
    expect(firstErrorMessage({ a: { message: "" } })).toBeNull();
  });
});

describe("label log AI", () => {
  it("fitur dan model dikenal → label; tak dikenal → apa adanya", () => {
    expect(aiRunFeatureLabel("hook")).toBe("Hook");
    expect(aiRunFeatureLabel("fitur-lama")).toBe("fitur-lama");
    expect(aiRunModelLabel("claude-opus-5-5")).toBe("Claude Opus 5.5");
    expect(aiRunModelLabel("mock")).toBe("Mode uji");
    expect(aiRunModelLabel("claude-opus-5")).toBe("claude-opus-5");
  });
});

describe("budgetLevel / formatPercent", () => {
  it("tingkat bar batas bulanan", () => {
    expect(budgetLevel(0)).toBe("normal");
    expect(budgetLevel(79.9)).toBe("normal");
    expect(budgetLevel(80)).toBe("warning");
    expect(budgetLevel(100)).toBe("over");
    expect(budgetLevel(140)).toBe("over");
  });

  it("persen format Indonesia, tanpa NaN", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.44)).toBe("0,4%");
    expect(formatPercent(45.6)).toBe("46%");
    expect(formatPercent(100)).toBe("100%");
    expect(formatPercent(Number.NaN)).toBe("0%");
  });
});
