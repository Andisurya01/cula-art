import { describe, expect, it } from "vitest";
import { contentFormInput } from "@/features/ai/prompts/content-common";
import {
  CONTENT_TITLE_REQUIRED,
  contentAiDisabledReason,
  intOrNull,
  textOrNull,
  toContentAiInput,
  type ContentAiSource,
} from "./ai-input";

const formValues: ContentAiSource = {
  title: "  Time-lapse gambar tangan hari ke-30 ",
  pillarId: "pillar-1",
  formatId: "format-1",
  hookTypeId: null,
  hookText: "",
  script: "  0-3 dtk: tangan mulai menggambar  ",
  shotList: "   ",
  targetDurationSec: "45",
  projectId: null,
  seriesPart: "",
};

describe("textOrNull", () => {
  it("string kosong, spasi, null, dan undefined menjadi null", () => {
    expect(textOrNull("", 10)).toBeNull();
    expect(textOrNull("   ", 10)).toBeNull();
    expect(textOrNull(null, 10)).toBeNull();
    expect(textOrNull(undefined, 10)).toBeNull();
  });

  it("memangkas spasi dan memotong ke batas", () => {
    expect(textOrNull("  halo  ", 10)).toBe("halo");
    expect(textOrNull("abcdefghij-lebih", 10)).toBe("abcdefghij");
  });
});

describe("intOrNull", () => {
  it("angka dari input string dan angka tersimpan", () => {
    expect(intOrNull("45", 1, 3600)).toBe(45);
    expect(intOrNull(" 30 ", 1, 3600)).toBe(30);
    expect(intOrNull(60, 1, 3600)).toBe(60);
  });

  it("kosong atau tidak valid menjadi null, bukan NaN", () => {
    expect(intOrNull("", 1, 3600)).toBeNull();
    expect(intOrNull("  ", 1, 3600)).toBeNull();
    expect(intOrNull(null, 1, 3600)).toBeNull();
    expect(intOrNull(undefined, 1, 3600)).toBeNull();
    expect(intOrNull("abc", 1, 3600)).toBeNull();
    expect(intOrNull("1.5", 1, 3600)).toBeNull();
    expect(intOrNull("0", 1, 3600)).toBeNull();
    expect(intOrNull("3601", 1, 3600)).toBeNull();
    expect(intOrNull(100, 1, 99)).toBeNull();
  });
});

describe("toContentAiInput", () => {
  it("nilai form (string) → input AI: kosong → null, angka → number", () => {
    expect(toContentAiInput("content-1", formValues)).toEqual({
      contentId: "content-1",
      title: "Time-lapse gambar tangan hari ke-30",
      pillarId: "pillar-1",
      formatId: "format-1",
      hookTypeId: null,
      hookText: null,
      script: "0-3 dtk: tangan mulai menggambar",
      shotList: null,
      targetDurationSec: 45,
      projectId: null,
      seriesPart: null,
    });
  });

  it("hasilnya lolos schema input AI (hook/script)", () => {
    const parsed = contentFormInput.safeParse(toContentAiInput("content-1", formValues));
    expect(parsed.success).toBe(true);
  });

  it("nilai tersimpan (number/null) juga diterima", () => {
    const saved = {
      ...formValues,
      title: "Reveal patung naga",
      hookText: "Hari ke-30!",
      targetDurationSec: 30,
      seriesPart: 2,
      projectId: "project-1",
    } satisfies ContentAiSource;
    const input = toContentAiInput("content-1", saved);
    expect(input).toMatchObject({ hookText: "Hari ke-30!", targetDurationSec: 30, seriesPart: 2, projectId: "project-1" });
    expect(contentFormInput.safeParse(input).success).toBe(true);
  });

  it("angka di luar rentang dan teks terlalu panjang tidak membuat input ditolak", () => {
    const input = toContentAiInput(null, {
      ...formValues,
      title: "x".repeat(250),
      hookText: "h".repeat(400),
      script: "s".repeat(12_000),
      targetDurationSec: "0",
      seriesPart: "120",
    });
    expect(input.title).toHaveLength(200);
    expect(input.hookText).toHaveLength(300);
    expect(input.script).toHaveLength(10_000);
    expect(input.targetDurationSec).toBeNull();
    expect(input.seriesPart).toBeNull();
    expect(input.contentId).toBeNull();
    expect(contentFormInput.safeParse(input).success).toBe(true);
  });
});

describe("contentAiDisabledReason", () => {
  it("judul kosong mematikan tombol Buat", () => {
    expect(contentAiDisabledReason("")).toBe(CONTENT_TITLE_REQUIRED);
    expect(contentAiDisabledReason("   ")).toBe(CONTENT_TITLE_REQUIRED);
    expect(contentAiDisabledReason(undefined)).toBe(CONTENT_TITLE_REQUIRED);
    expect(contentAiDisabledReason("Judul")).toBeNull();
  });
});
