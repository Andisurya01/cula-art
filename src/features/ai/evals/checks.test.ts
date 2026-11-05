import { describe, expect, it } from "vitest";
import { AI_FEATURES } from "../features";
import { mockOutput } from "../mock";
import { FEATURE_PROMPTS, type AiContext } from "../prompts";
import { EVAL_CASES } from "./cases";
import { checkOutput, type EvalRules } from "./checks";
import { EVAL_AVOID_WORDS, EVAL_GUIDE, EVAL_NAMES, EVAL_TAXONOMY } from "./fixtures";

const RULES: EvalRules = {
  avoidWords: EVAL_AVOID_WORDS,
  hashtagSets: EVAL_GUIDE.hashtagSets,
  pillarIds: new Map(EVAL_TAXONOMY.pillars.map((p) => [p.name, p.id])),
};

const ARTWORK_CTX: AiContext<"artwork-photos"> = {
  title: "Kepala naga",
  medium: "Clay",
  year: null,
  materials: null,
  size: null,
  userNotes: null,
  summary: null,
  description: null,
  project: null,
  photos: [
    { id: "a", label: "Foto 1", storageKey: "a.webp", isProcess: false, currentAlt: "" },
    { id: "b", label: "Foto 2", storageKey: "b.webp", isProcess: false, currentAlt: "" },
  ],
};

describe("kasus set uji", () => {
  it("10 kasus per fitur teks, id unik, konteks lolos render dan skema mode uji", () => {
    for (const [feature, cases] of Object.entries(EVAL_CASES)) {
      expect(cases, feature).toHaveLength(10);
      expect(new Set(cases.map((c) => c.id)).size).toBe(10);
      const def = FEATURE_PROMPTS[feature as keyof typeof EVAL_CASES];
      for (const c of cases) {
        expect(def.render(c.context as never)).toContain(c.context.title);
        const schema = def.output(EVAL_NAMES, c.context as never);
        expect(schema.safeParse(mockOutput(feature as never, EVAL_NAMES, c.context as never)).success).toBe(true);
      }
    }
  });

  it("pilar/format/tipe hook di kasus ada di kategori contoh", () => {
    const contexts = [...EVAL_CASES.hook, ...EVAL_CASES["idea-expand"]].map((c) => c.context as { pillar: string | null });
    for (const ctx of contexts) {
      if (ctx.pillar) expect(EVAL_NAMES.pillars).toContain(ctx.pillar);
    }
    expect(AI_FEATURES.filter((f) => !(f in EVAL_CASES))).toEqual(["artwork-photos"]);
  });
});

describe("checkOutput", () => {
  it("kata yang dihindari dan hook kembar → error", () => {
    const issues = checkOutput(
      "hook",
      {
        hooks: [
          { text: "Halo guys, lihat ini", note: "" },
          { text: "Sama", note: "" },
          { text: "sama ", note: "" },
          { text: "x".repeat(120), note: "" },
          { text: "Ok", note: "" },
        ],
        notes: null,
      },
      EVAL_CASES.hook[0]!.context,
      RULES,
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        { level: "error", message: 'Memakai kata yang dihindari: "guys"' },
        { level: "error", message: "Hook kembar: sama " },
        { level: "warn", message: "1 hook lebih dari 100 karakter" },
      ]),
    );
  });

  it("kata dihindari dicocokkan per kata, bukan potongan kata", () => {
    const issues = checkOutput("idea-expand", mockOutput("idea-expand", EVAL_NAMES, EVAL_CASES["idea-expand"][0]!.context), EVAL_CASES["idea-expand"][0]!.context, {
      ...RULES,
      avoidWords: ["tim"], // "time-lapse" tidak boleh terhitung
    });
    expect(issues.filter((i) => i.message.includes("dihindari"))).toEqual([]);
  });

  it("caption: hashtag di luar set dan jumlah hashtag per platform", () => {
    const ctx = EVAL_CASES.caption[0]!.context; // TikTok, Progres Gambar
    const issues = checkOutput(
      "caption",
      {
        options: [
          { caption: "Hari ke-30 #gambar", hashtags: ["#gambartangan", "#acak"] },
          { caption: "Opsi dua", hashtags: ["#belajargambar", "#seni", "#latihangambar"] },
        ],
        notes: null,
      },
      ctx,
      RULES,
    );
    expect(issues.map((i) => i.message)).toEqual([
      "Opsi 1: 2 hashtag (disarankan 3-5 untuk TikTok)",
      "Opsi 1: ada hashtag di dalam caption",
      "Opsi 1: hashtag di luar set: #acak",
    ]);
  });

  it("karya: foto tanpa alt dan ukuran yang dikarang → error", () => {
    const issues = checkOutput(
      "artwork-photos",
      { alts: [{ imageId: "a", alt: "Kepala naga hijau" }], summary: "Naga.", description: "Tinggi 25 cm.\n\nDibuat malam hari.", notes: null },
      ARTWORK_CTX,
      RULES,
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        { level: "error", message: "1 foto tanpa teks alternatif" },
        { level: "error", message: "Menyebut ukuran padahal data ukuran kosong" },
      ]),
    );
  });

  it("jawaban mode uji untuk semua kasus tidak punya error", () => {
    for (const feature of ["idea-expand", "project-ideas", "hook", "script"] as const) {
      for (const c of EVAL_CASES[feature]) {
        const out = mockOutput(feature, EVAL_NAMES, c.context as never);
        const errors = checkOutput(feature, out as never, c.context as never, RULES).filter((i) => i.level === "error");
        expect(errors, `${feature} ${c.id}`).toEqual([]);
      }
    }
  });
});
