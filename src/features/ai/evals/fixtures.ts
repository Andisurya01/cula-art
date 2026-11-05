import type { GuideTaxonomy } from "../guide";
import type { AiGuideContent } from "../guide-schema";
import type { TaxonomyNames } from "../prompts/types";

// Panduan AI dan kategori contoh untuk set uji. Tetap (tidak membaca database), supaya hasil antar-run
// bisa dibandingkan saat prompt atau model diganti. `--panduan-db` memakai Panduan AI asli.

export const EVAL_TAXONOMY: GuideTaxonomy = {
  pillars: [
    { id: "p-gambar", name: "Progres Gambar", description: "Perjalanan belajar menggambar, latihan, before/after" },
    { id: "p-clay", name: "Proses Clay", description: "Proses patung dari armature sampai finishing" },
    { id: "p-showcase", name: "Showcase", description: "Hasil akhir gambar atau patung, reveal" },
    { id: "p-tips", name: "Tips dan Tutorial", description: "Pelajaran, alat, kesalahan pemula" },
    { id: "p-bts", name: "Behind the Scenes", description: "Meja kerja, alat, kegagalan, cerita personal" },
  ],
  formats: ["Time-lapse", "Before/After", "Tutorial singkat", "Voice-over cerita", "Carousel foto (IG)", "Reveal"],
  hookTypes: ["Hasil di depan", "Hari ke-N", "Pertanyaan", "Kesalahan atau gagal", "Transformasi", "Tantangan"],
};

export const EVAL_NAMES: TaxonomyNames = {
  pillars: EVAL_TAXONOMY.pillars.map((p) => p.name),
  formats: EVAL_TAXONOMY.formats,
  hookTypes: EVAL_TAXONOMY.hookTypes,
};

export const EVAL_GUIDE: AiGuideContent = {
  voice: {
    formality: "CASUAL",
    englishMix: "SOME",
    greeting: "kalian",
    emoji: "FEW",
    captionLength: "MEDIUM",
    ctas: "Simpan buat latihan nanti; follow buat lihat part berikutnya",
  },
  voiceNotes: "Jujur soal proses belajar, tidak sok jago. Boleh menertawakan kegagalan sendiri.",
  examples: [
    { kind: "HOOK", platform: "TIKTOK", text: "Hari ke-21 belajar gambar tangan, dan jempolnya masih kayak sosis." },
    { kind: "HOOK", platform: null, text: "Ini yang terjadi kalau armature-nya kurang kuat." },
    { kind: "HOOK", platform: "TIKTOK", text: "Tebak ini clay atau gambar?" },
    {
      kind: "CAPTION",
      platform: "INSTAGRAM",
      text: "Tiga minggu lalu aku bahkan nggak bisa gambar jari dengan proporsi yang benar.\n\nSekarang masih jauh dari sempurna, tapi setidaknya jarinya sudah lima 😅\n\nSimpan buat latihan kalian juga ya.",
    },
    { kind: "CAPTION", platform: "TIKTOK", text: "Part 2: dari kawat jadi kepala naga. Part 3 minggu depan." },
  ],
  creatorFacts:
    "Belajar menggambar anatomi sejak Juli 2026, dimulai dari tangan; pakai pensil 2B dan 4B di sketchbook A5.\nPatung memakai clay polimer (Sculpey) dengan armature kawat aluminium, dipanggang di oven listrik kecil.\nBekerja kantoran; berkarya malam hari dan akhir pekan di meja kerja kecil di kamar.",
  hashtagSets: {
    general: {
      TIKTOK: ["#belajargambar", "#seni"],
      INSTAGRAM: ["#belajargambar", "#karyaseni", "#senirupa"],
    },
    pillars: {
      "p-gambar": { TIKTOK: ["#gambartangan", "#latihangambar"], INSTAGRAM: ["#gambartangan", "#sketchbook", "#anatomi"] },
      "p-clay": { TIKTOK: ["#clay", "#polymerclay"], INSTAGRAM: ["#polymerclay", "#sculpey", "#sculpting", "#clayart"] },
      "p-showcase": { TIKTOK: ["#reveal"], INSTAGRAM: ["#artwork", "#karyaseni"] },
      "p-tips": { TIKTOK: ["#tipsgambar", "#tutorialclay"], INSTAGRAM: ["#tipsgambar", "#tutorialclay"] },
      "p-bts": { TIKTOK: ["#behindthescenes"], INSTAGRAM: ["#artiststudio", "#prosesberkarya"] },
    },
  },
  avoidNotes: "Hindari kata \"guys\" dan \"viral\", janji hasil instan, dan topik politik.",
};

/** Kata yang dicek otomatis (dari bagian "hindari" Panduan AI contoh). */
export const EVAL_AVOID_WORDS = ["guys", "viral"];
