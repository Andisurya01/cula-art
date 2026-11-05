import { describe, expect, it } from "vitest";
import { renderGuide, type GuideTaxonomy } from "./guide";
import { EMPTY_HASHTAG_SETS, EMPTY_VOICE, type AiGuideContent } from "./guide-schema";

const TAXONOMY: GuideTaxonomy = {
  pillars: [
    { id: "p1", name: "Proses Clay", description: "Proses patung dari armature" },
    { id: "p2", name: "Showcase", description: null },
  ],
  formats: ["Time-lapse", "Reveal"],
  hookTypes: ["Hari ke-N"],
};

const FULL: AiGuideContent = {
  voice: {
    formality: "CASUAL",
    englishMix: "SOME",
    greeting: "kalian",
    emoji: "FEW",
    captionLength: "MEDIUM",
    ctas: "Simpan untuk latihan",
  },
  voiceNotes: "Tanpa kata 'guys'.",
  examples: [{ kind: "HOOK", platform: "TIKTOK", text: "Hari ke-30 gambar tangan" }],
  creatorFacts: "Memakai clay polimer Sculpey.",
  hashtagSets: {
    general: { TIKTOK: ["#belajargambar"], INSTAGRAM: [] },
    pillars: { p1: { TIKTOK: [], INSTAGRAM: ["#clayart", "#sculpting"] }, hilang: { TIKTOK: ["#x"], INSTAGRAM: [] } },
  },
  avoidNotes: "Politik",
};

describe("renderGuide", () => {
  it("deterministik: input sama → teks sama (syarat prompt caching)", () => {
    expect(renderGuide(FULL, TAXONOMY)).toBe(renderGuide(structuredClone(FULL), structuredClone(TAXONOMY)));
  });

  it("memuat semua bagian dan mengabaikan hashtag pilar yang sudah dihapus", () => {
    const text = renderGuide(FULL, TAXONOMY);
    expect(text).toContain("- Nada: Santai");
    expect(text).toContain('- Sapaan ke penonton: "kalian"');
    expect(text).toContain('<contoh jenis="Hook" platform="TikTok">');
    expect(text).toContain("Memakai clay polimer Sculpey.");
    expect(text).toContain("Pilar Proses Clay:\n- Instagram: #clayart #sculpting");
    expect(text).toContain("Umum (semua pilar):\n- TikTok: #belajargambar");
    expect(text).not.toContain("#x");
    expect(text).toContain("- Proses Clay: Proses patung dari armature");
    expect(text).toContain("Format: Time-lapse, Reveal");
  });

  it("panduan kosong → setiap bagian ditandai belum diisi", () => {
    const text = renderGuide(
      { voice: EMPTY_VOICE, voiceNotes: null, examples: [], creatorFacts: null, hashtagSets: EMPTY_HASHTAG_SETS, avoidNotes: null },
      { pillars: [], formats: [], hookTypes: [] },
    );
    expect(text.match(/\(belum diisi\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/); // tanpa tanggal
  });
});
