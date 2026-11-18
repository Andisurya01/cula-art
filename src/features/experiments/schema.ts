// Schema Zod Eksperimen (dipakai form client dan Server Action) + label UI (E7 di docs/FASE-5.md).
// Aman dipakai di client: tanpa Prisma runtime, hanya tipe.

import { z } from "zod";
import type { Platform } from "@prisma/client";
import {
  DECIDING_METRICS,
  EXPERIMENT_VARIABLES,
  type DecidingMetric,
  type ExperimentResultValue,
  type ExperimentVariable,
  type ExperimentVariant,
} from "@/lib/analytics/experiments";
import { PLATFORMS, VIEWS_LABELS } from "@/lib/labels";

export const EXPERIMENT_VARIANTS = ["A", "B"] as const satisfies readonly ExperimentVariant[];
export const EXPERIMENT_RESULTS = [
  "SUPPORTED",
  "REJECTED",
  "INCONCLUSIVE",
] as const satisfies readonly ExperimentResultValue[];

export const HYPOTHESIS_MAX = 300;
export const VARIANT_DESCRIPTION_MAX = 200;
export const EXPERIMENT_NOTES_MAX = 2000;

// ---- Label ----

export const EXPERIMENT_VARIABLE_LABELS: Record<ExperimentVariable, string> = {
  HOOK: "Hook",
  FORMAT: "Format",
  TIME: "Jam posting",
  DURATION: "Durasi",
  COVER: "Cover",
  OTHER: "Lainnya",
};

/** Label metrik penentu. VIEWS mengikuti platform (Views TikTok, Reach Instagram). */
export const DECIDING_METRIC_LABELS: Record<DecidingMetric, string> = {
  SCORE: "Skor",
  ER: "ER",
  SAVE_RATE: "Save rate",
  SHARE_RATE: "Share rate",
  FOLLOW_RATE: "Follow rate",
  VIEWS: "Views/Reach",
};

export function decidingMetricLabel(metric: DecidingMetric, platform?: Platform | null): string {
  if (metric === "VIEWS" && platform) return VIEWS_LABELS[platform];
  return DECIDING_METRIC_LABELS[metric];
}

export const EXPERIMENT_RESULT_LABELS: Record<ExperimentResultValue, string> = {
  SUPPORTED: "Terbukti",
  REJECTED: "Tidak terbukti",
  INCONCLUSIVE: "Belum jelas",
};

/** Peran varian. Hipotesis selalu dibaca "B lebih baik dari A". */
export const VARIANT_ROLE_LABELS: Record<ExperimentVariant, string> = {
  A: "pembanding",
  B: "yang diuji",
};
export const HYPOTHESIS_READING = "B lebih baik dari A";

// ---- Form buat / ubah ----

const variantDescription = (variant: ExperimentVariant) =>
  z
    .string()
    .trim()
    .min(1, `Deskripsi varian ${variant} wajib diisi`)
    .max(VARIANT_DESCRIPTION_MAX, `Deskripsi varian ${variant} maksimal ${VARIANT_DESCRIPTION_MAX} karakter`);

const experimentFields = z.object({
  hypothesis: z
    .string()
    .trim()
    .min(1, "Hipotesis wajib diisi")
    .max(HYPOTHESIS_MAX, `Hipotesis maksimal ${HYPOTHESIS_MAX} karakter`),
  platform: z.enum(PLATFORMS, { error: "Pilih platform" }),
  variable: z.enum(EXPERIMENT_VARIABLES, { error: "Pilih variabel yang diuji" }),
  variantA: variantDescription("A"),
  variantB: variantDescription("B"),
  decidingMetric: z.enum(DECIDING_METRICS, { error: "Pilih metrik penentu" }),
});

const distinctVariants = {
  check: (v: { variantA: string; variantB: string }) =>
    v.variantA.toLocaleLowerCase("id") !== v.variantB.toLocaleLowerCase("id"),
  params: { message: "Varian A dan B harus berbeda", path: ["variantB"] },
};

export const experimentSchema = experimentFields.refine(distinctVariants.check, distinctVariants.params);
export type ExperimentInput = z.infer<typeof experimentSchema>;

export const experimentIdSchema = z.object({ id: z.string().min(1, "Eksperimen tidak valid") });

export const updateExperimentSchema = experimentFields
  .extend(experimentIdSchema.shape)
  .refine(distinctVariants.check, distinctVariants.params);
export type UpdateExperimentInput = z.infer<typeof updateExperimentSchema>;

// ---- Post per varian ----

const experimentPostKey = z.object({
  experimentId: z.string().min(1, "Eksperimen tidak valid"),
  postId: z.string().min(1, "Post tidak valid"),
});

/** Tambah post ke varian, atau pindahkan ke varian lain (satu post satu varian per eksperimen). */
export const setExperimentPostSchema = experimentPostKey.extend({
  variant: z.enum(EXPERIMENT_VARIANTS, { error: "Pilih varian A atau B" }),
});
export type SetExperimentPostInput = z.infer<typeof setExperimentPostSchema>;

export const removeExperimentPostSchema = experimentPostKey;

// ---- Kesimpulan ----

export const concludeExperimentSchema = experimentIdSchema.extend({
  result: z.enum(EXPERIMENT_RESULTS, { error: "Pilih kesimpulan" }),
  notes: z.string().trim().max(EXPERIMENT_NOTES_MAX, `Catatan maksimal ${EXPERIMENT_NOTES_MAX} karakter`),
});
export type ConcludeExperimentInput = z.infer<typeof concludeExperimentSchema>;

// ---- Filter daftar (`?status=berjalan|selesai`) ----

export const EXPERIMENT_STATUS_FILTERS = ["berjalan", "selesai"] as const;
export type ExperimentStatusFilter = (typeof EXPERIMENT_STATUS_FILTERS)[number];

export const EXPERIMENT_STATUS_FILTER_LABELS: Record<ExperimentStatusFilter, string> = {
  berjalan: "Berjalan",
  selesai: "Selesai",
};

/** `?status=` → filter; nilai lain (atau tidak ada) = semua. */
export function parseExperimentStatusFilter(
  value: string | string[] | undefined,
): ExperimentStatusFilter | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return EXPERIMENT_STATUS_FILTERS.find((s) => s === raw) ?? null;
}
