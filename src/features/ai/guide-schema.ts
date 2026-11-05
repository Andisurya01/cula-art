import { z } from "zod";
import { PLATFORMS } from "@/lib/labels";
import { nullableText } from "@/features/contents/fields";
import { formatUsd } from "./format";
import { AI_MODEL_IDS, DEFAULT_AI_MODEL, isAiModelId, type AiModelId } from "./models";

// Panduan AI (tab Pengaturan): schema form/aksi + parse kolom JSON AiGuide. Dipakai client dan server.

// ---- Gaya bahasa terstruktur (AiGuide.voiceJson) ----

export const FORMALITY_LEVELS = ["CASUAL", "SEMI_FORMAL", "FORMAL"] as const;
export const ENGLISH_MIX_LEVELS = ["NONE", "SOME", "OFTEN"] as const;
export const EMOJI_LEVELS = ["NONE", "FEW", "MANY"] as const;
export const CAPTION_LENGTHS = ["SHORT", "MEDIUM", "LONG"] as const;

export const FORMALITY_LABELS: Record<(typeof FORMALITY_LEVELS)[number], string> = {
  CASUAL: "Santai",
  SEMI_FORMAL: "Semi-formal",
  FORMAL: "Formal",
};
export const ENGLISH_MIX_LABELS: Record<(typeof ENGLISH_MIX_LEVELS)[number], string> = {
  NONE: "Tidak (Indonesia penuh)",
  SOME: "Sedikit",
  OFTEN: "Sering",
};
export const EMOJI_LABELS: Record<(typeof EMOJI_LEVELS)[number], string> = {
  NONE: "Tanpa emoji",
  FEW: "Sedikit",
  MANY: "Banyak",
};
export const CAPTION_LENGTH_LABELS: Record<(typeof CAPTION_LENGTHS)[number], string> = {
  SHORT: "Pendek (1-2 kalimat)",
  MEDIUM: "Sedang (1 paragraf)",
  LONG: "Panjang (cerita + CTA)",
};

export const voiceSchema = z.object({
  formality: z.enum(FORMALITY_LEVELS).nullable(),
  englishMix: z.enum(ENGLISH_MIX_LEVELS).nullable(),
  greeting: nullableText(60, "Sapaan"),
  emoji: z.enum(EMOJI_LEVELS).nullable(),
  captionLength: z.enum(CAPTION_LENGTHS).nullable(),
  ctas: nullableText(500, "CTA favorit"),
});
export type AiVoice = z.output<typeof voiceSchema>;

export const EMPTY_VOICE: AiVoice = {
  formality: null,
  englishMix: null,
  greeting: null,
  emoji: null,
  captionLength: null,
  ctas: null,
};

// ---- Contoh terbaik (AiGuide.examplesJson) ----

export const MAX_AI_EXAMPLES = 10;
export const AI_EXAMPLE_KINDS = ["HOOK", "CAPTION"] as const;
export type AiExampleKind = (typeof AI_EXAMPLE_KINDS)[number];
export const AI_EXAMPLE_KIND_LABELS: Record<AiExampleKind, string> = { HOOK: "Hook", CAPTION: "Caption" };

export const exampleSchema = z.object({
  kind: z.enum(AI_EXAMPLE_KINDS),
  platform: z.enum(PLATFORMS).nullable(),
  text: z.string().trim().min(1, "Isi contoh").max(2200, "Contoh maksimal 2200 karakter"),
});
export type AiExample = z.output<typeof exampleSchema>;

export const examplesSchema = z
  .array(exampleSchema)
  .max(MAX_AI_EXAMPLES, `Maksimal ${MAX_AI_EXAMPLES} contoh`);

// ---- Hashtag per pilar dan platform (AiGuide.hashtagSetsJson) ----

export const MAX_HASHTAGS_PER_SET = 30;
const HASHTAG_PATTERN = /^#[\p{L}\p{N}_]{1,100}$/u;

export const hashtagListSchema = z
  .array(z.string().regex(HASHTAG_PATTERN, "Hashtag hanya huruf, angka, dan garis bawah"))
  .max(MAX_HASHTAGS_PER_SET, `Maksimal ${MAX_HASHTAGS_PER_SET} hashtag per set`);

export const platformHashtagsSchema = z.object({
  TIKTOK: hashtagListSchema,
  INSTAGRAM: hashtagListSchema,
});
export type PlatformHashtags = z.output<typeof platformHashtagsSchema>;

export const hashtagSetsSchema = z.object({
  /** Dipakai di semua pilar. */
  general: platformHashtagsSchema,
  /** Kunci = Pillar.id (nama pilar bisa berubah). Pilar yang sudah dihapus diabaikan. */
  pillars: z.record(z.string(), platformHashtagsSchema),
});
export type HashtagSets = z.output<typeof hashtagSetsSchema>;

export const EMPTY_PLATFORM_HASHTAGS: PlatformHashtags = { TIKTOK: [], INSTAGRAM: [] };
export const EMPTY_HASHTAG_SETS: HashtagSets = { general: EMPTY_PLATFORM_HASHTAGS, pillars: {} };

/**
 * Teks bebas dari form ("#gambar, clay  #tutorial") → daftar hashtag unik berawalan `#`.
 * Karakter selain huruf/angka/garis bawah dibuang; urutan pertama dipertahankan.
 */
export function parseHashtags(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const body = raw.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!body) continue;
    const tag = `#${body.slice(0, 100)}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export function formatHashtags(tags: string[]): string {
  return tags.join(" ");
}

// ---- Form Pengaturan → aksi ----

/** Isi Panduan AI (bagian awal prompt yang di-cache). */
export const aiGuideContentSchema = z.object({
  voice: voiceSchema,
  voiceNotes: nullableText(2000, "Catatan gaya bahasa"),
  examples: examplesSchema,
  creatorFacts: nullableText(5000, "Fakta kreator dan karya"),
  hashtagSets: hashtagSetsSchema,
  avoidNotes: nullableText(2000, "Kata atau topik yang dihindari"),
});
export type AiGuideContentInput = z.input<typeof aiGuideContentSchema>;
export type AiGuideContent = z.output<typeof aiGuideContentSchema>;

export const MIN_MONTHLY_BUDGET_USD = 0.5;
export const MAX_MONTHLY_BUDGET_USD = 500;
export const MAX_DAILY_CALL_LIMIT = 1000;

/** Pengaturan teknis (bukan bagian prompt). */
export const aiTechnicalSettingsSchema = z.object({
  isEnabled: z.boolean(),
  model: z.enum(AI_MODEL_IDS, { error: "Pilih model" }),
  monthlyBudgetUsd: z
    .number({ error: "Batas biaya harus berupa angka" })
    .min(MIN_MONTHLY_BUDGET_USD, `Batas biaya minimal ${formatUsd(MIN_MONTHLY_BUDGET_USD)}`)
    .max(MAX_MONTHLY_BUDGET_USD, `Batas biaya maksimal ${formatUsd(MAX_MONTHLY_BUDGET_USD)}`),
  dailyCallLimit: z
    .number({ error: "Batas panggilan harus berupa angka" })
    .int("Batas panggilan harus bilangan bulat")
    .min(1, "Batas panggilan minimal 1")
    .max(MAX_DAILY_CALL_LIMIT, `Batas panggilan maksimal ${MAX_DAILY_CALL_LIMIT}`),
});
export type AiTechnicalSettings = z.output<typeof aiTechnicalSettingsSchema>;

export const markAiRunAcceptedSchema = z.object({ runId: z.string().min(1, "Run tidak valid") });

// ---- Parse baris AiGuide (kolom JSON rusak/kosong → default) ----

export type AiGuideRow = {
  isEnabled: boolean;
  model: string;
  voiceJson: string;
  voiceNotes: string | null;
  examplesJson: string;
  creatorFacts: string | null;
  hashtagSetsJson: string;
  avoidNotes: string | null;
  monthlyBudgetUsd: number;
  dailyCallLimit: number;
};

export type AiGuideData = AiGuideContent & {
  isEnabled: boolean;
  model: AiModelId;
  monthlyBudgetUsd: number;
  dailyCallLimit: number;
};

export function parseAiGuideRow(row: AiGuideRow): AiGuideData {
  return {
    isEnabled: row.isEnabled,
    model: isAiModelId(row.model) ? row.model : DEFAULT_AI_MODEL,
    voice: parseJson(voiceSchema, row.voiceJson, EMPTY_VOICE),
    voiceNotes: row.voiceNotes,
    examples: parseJson(examplesSchema, row.examplesJson, []),
    creatorFacts: row.creatorFacts,
    hashtagSets: parseJson(hashtagSetsSchema, row.hashtagSetsJson, EMPTY_HASHTAG_SETS),
    avoidNotes: row.avoidNotes,
    monthlyBudgetUsd: row.monthlyBudgetUsd,
    dailyCallLimit: row.dailyCallLimit,
  };
}

function parseJson<T>(schema: z.ZodType<T>, json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}
