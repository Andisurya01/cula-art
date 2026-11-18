// Schema Review Mingguan: sama untuk form (zodResolver) dan Server Action. Aman di client.

import { z } from "zod";
import { isValidWibDateString } from "@/lib/date";

/**
 * Batas tiap field refleksi. Sama dengan `REVIEW_TEXT_MAX` di `@/features/ai/prompts/review-draft`
 * (dijaga test), tetapi ditulis di sini supaya bundle client tidak memuat teks prompt AI.
 */
export const REVIEW_FIELD_MAX = 2000;

/** Maks. konten yang direncanakan untuk minggu depan (PRD: pilih 2-3 konten). */
export const REVIEW_PLAN_MAX = 3;

const reviewText = z.string().max(REVIEW_FIELD_MAX, `Maksimal ${REVIEW_FIELD_MAX} karakter`);

export const REVIEW_TEXT_FIELDS = ["wins", "repeat", "stop", "focusNext"] as const;
export type ReviewTextField = (typeof REVIEW_TEXT_FIELDS)[number];

export const REVIEW_FIELD_LABELS: Record<ReviewTextField, string> = {
  wins: "Apa yang berhasil?",
  repeat: "Apa yang diulang?",
  stop: "Apa yang dihentikan?",
  focusNext: "Fokus minggu depan",
};

export const reviewFormSchema = z.object({
  wins: reviewText,
  repeat: reviewText,
  stop: reviewText,
  focusNext: reviewText,
  plannedContentIds: z
    .array(z.string().min(1, "Konten tidak valid").max(64, "Konten tidak valid"))
    .max(REVIEW_PLAN_MAX, `Pilih maksimal ${REVIEW_PLAN_MAX} konten`)
    .refine((ids) => new Set(ids).size === ids.length, "Konten rencana duplikat"),
});
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

/** Input aksi Simpan. Ringkasan tidak ikut: server selalu menghitungnya sendiri. */
export const saveWeeklyReviewSchema = reviewFormSchema.extend({
  /** Senin minggu yang di-review, `yyyy-MM-dd` WIB. */
  weekStart: z.string().refine(isValidWibDateString, "Minggu tidak valid"),
});
export type SaveWeeklyReviewInput = z.infer<typeof saveWeeklyReviewSchema>;
