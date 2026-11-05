// Fungsi murni tab Panduan AI di Pengaturan (tanpa Prisma/React) — diuji di ai-guide.test.ts.
// Form memakai bentuk yang sama dengan `aiGuideContentSchema` (jadi path error cocok dengan field),
// kecuali hashtag: di form berupa teks bebas, di schema berupa daftar.

import { z } from "zod";
import { PLATFORMS } from "@/lib/labels";
import type { AiRunStatusValue } from "@/lib/analytics/ai-usage";
import { AI_FEATURE_LABELS, isAiFeature } from "@/features/ai/features";
import {
  aiGuideContentSchema,
  EMPTY_PLATFORM_HASHTAGS,
  formatHashtags,
  parseHashtags,
  type AiExample,
  type AiGuideContent,
  type AiGuideContentInput,
  type AiVoice,
  type PlatformHashtags,
} from "@/features/ai/guide-schema";
import { AI_MODELS, isAiModelId, MOCK_MODEL } from "@/features/ai/models";

type Platform = (typeof PLATFORMS)[number];

/** Teks hashtag per platform di form (bebas: dipisah spasi/koma, `#` boleh tidak ditulis). */
export type PlatformHashtagText = Record<Platform, string>;

export type AiGuideFormValues = {
  voice: Omit<AiVoice, "greeting" | "ctas"> & { greeting: string; ctas: string };
  voiceNotes: string;
  examples: AiExample[];
  creatorFacts: string;
  hashtagSets: {
    general: PlatformHashtagText;
    /** Kunci = Pillar.id. Berisi pilar aktif + pilar nonaktif yang punya hashtag tersimpan. */
    pillars: Record<string, PlatformHashtagText>;
  };
  avoidNotes: string;
};

export type GuidePillar = { id: string; isActive: boolean };

function toHashtagText(tags: PlatformHashtags): PlatformHashtagText {
  return { TIKTOK: formatHashtags(tags.TIKTOK), INSTAGRAM: formatHashtags(tags.INSTAGRAM) };
}

function parseHashtagText(text: PlatformHashtagText): PlatformHashtags {
  return { TIKTOK: parseHashtags(text.TIKTOK), INSTAGRAM: parseHashtags(text.INSTAGRAM) };
}

/**
 * Panduan tersimpan → nilai form (null → ""). Hashtag pilar nonaktif ikut disimpan di form (tidak
 * ditampilkan) supaya tidak hilang saat disimpan; hashtag pilar yang sudah dihapus dibuang.
 */
export function toAiGuideFormValues(guide: AiGuideContent, pillars: readonly GuidePillar[]): AiGuideFormValues {
  const pillarTexts: Record<string, PlatformHashtagText> = {};
  for (const pillar of pillars) {
    const stored = guide.hashtagSets.pillars[pillar.id];
    if (pillar.isActive || stored) pillarTexts[pillar.id] = toHashtagText(stored ?? EMPTY_PLATFORM_HASHTAGS);
  }
  return {
    voice: { ...guide.voice, greeting: guide.voice.greeting ?? "", ctas: guide.voice.ctas ?? "" },
    voiceNotes: guide.voiceNotes ?? "",
    examples: guide.examples.map((example) => ({ ...example })),
    creatorFacts: guide.creatorFacts ?? "",
    hashtagSets: { general: toHashtagText(guide.hashtagSets.general), pillars: pillarTexts },
    avoidNotes: guide.avoidNotes ?? "",
  };
}

/** Nilai form → input `aiGuideContentSchema`. Set hashtag pilar yang kosong di kedua platform tidak dikirim. */
export function toAiGuideContentInput(values: AiGuideFormValues): AiGuideContentInput {
  const pillars: Record<string, PlatformHashtags> = {};
  for (const [id, text] of Object.entries(values.hashtagSets.pillars)) {
    const tags = parseHashtagText(text);
    if (PLATFORMS.some((platform) => tags[platform].length > 0)) pillars[id] = tags;
  }
  return {
    voice: values.voice,
    voiceNotes: values.voiceNotes,
    examples: values.examples,
    creatorFacts: values.creatorFacts,
    hashtagSets: { general: parseHashtagText(values.hashtagSets.general), pillars },
    avoidNotes: values.avoidNotes,
  };
}

/** Schema untuk zodResolver: nilai form → `aiGuideContentSchema`. Path error sama dengan nama field form. */
export const aiGuideFormSchema = z
  .custom<AiGuideFormValues>()
  .transform(toAiGuideContentInput)
  .pipe(aiGuideContentSchema);

/** Jumlah hashtag yang akan tersimpan dari teks bebas (untuk penghitung "n/30"). */
export function countHashtags(text: string): number {
  return parseHashtags(text).length;
}

/**
 * Pesan pertama di objek error react-hook-form (bersarang/array), untuk toast saat form tidak valid
 * atau error yang tidak menempel ke satu field. `ref` (elemen DOM) dilewati.
 */
export function firstErrorMessage(errors: unknown, depth = 0): string | null {
  if (!errors || typeof errors !== "object" || depth > 8) return null;
  const message = (errors as { message?: unknown }).message;
  if (typeof message === "string" && message) return message;
  for (const [key, value] of Object.entries(errors)) {
    if (key === "ref" || key === "message") continue;
    const found = firstErrorMessage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

// ---- Pemakaian dan 20 run terakhir ----

export const AI_RUN_STATUS_LABELS: Record<AiRunStatusValue, string> = {
  RUNNING: "Berjalan",
  OK: "OK",
  ERROR: "Gagal",
  REFUSED: "Ditolak",
};

/** Label fitur di log; nama fitur lama/tak dikenal ditampilkan apa adanya. */
export function aiRunFeatureLabel(feature: string): string {
  return isAiFeature(feature) ? AI_FEATURE_LABELS[feature] : feature;
}

/** Label model di log: mode uji, model pilihan, atau id mentah (mis. model fallback). */
export function aiRunModelLabel(model: string): string {
  if (model === MOCK_MODEL) return "Mode uji";
  return isAiModelId(model) ? AI_MODELS[model].label : model;
}

export type BudgetLevel = "normal" | "warning" | "over";

/** Warna bar batas bulanan: kuning mulai 80%, merah saat batas tercapai (panggilan baru ditolak). */
export function budgetLevel(usedPercent: number): BudgetLevel {
  if (usedPercent >= 100) return "over";
  if (usedPercent >= 80) return "warning";
  return "normal";
}

/** Persen format Indonesia: di bawah 10% satu desimal (0,4%), selebihnya bulat (46%). */
export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const digits = safe > 0 && safe < 10 ? 1 : 0;
  return `${safe.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;
}
