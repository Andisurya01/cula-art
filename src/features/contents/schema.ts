import { z } from "zod";
import { CONTENT_STAGES } from "@/lib/labels";
import { postedEntrySchema } from "@/features/posts/schema";
import { nullableId, nullableInt, nullableText } from "./fields";

export const contentTitleSchema = z
  .string()
  .trim()
  .min(1, "Judul wajib diisi")
  .max(200, "Judul maksimal 200 karakter");

/** Dialog "Konten baru": judul + pilar wajib. */
export const createContentSchema = z.object({
  title: contentTitleSchema,
  pillarId: z.string().min(1, "Pilih pilar"),
});
export type CreateContentInput = z.infer<typeof createContentSchema>;

/** Form detail konten (tanpa stage — stage diubah lewat kontrol terpisah). */
export const contentDetailSchema = z.object({
  title: contentTitleSchema,
  pillarId: z.string().min(1, "Pilih pilar"),
  formatId: nullableId,
  hookTypeId: nullableId,
  hookText: nullableText(300, "Teks hook"),
  script: nullableText(10_000, "Script"),
  shotList: nullableText(10_000, "Shot list"),
  targetDurationSec: nullableInt(1, 3600, "Target durasi"),
  projectId: nullableId,
  seriesPart: nullableInt(1, 99, "Nomor part"),
});
export type ContentDetailFormValues = z.input<typeof contentDetailSchema>;
export type ContentDetailInput = z.output<typeof contentDetailSchema>;

export const updateContentSchema = contentDetailSchema.extend({
  id: z.string().min(1),
});

export const contentIdSchema = z.object({ id: z.string().min(1) });

export const moveStageSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(CONTENT_STAGES),
});
export type MoveStageInput = z.infer<typeof moveStageSchema>;

/** Pindah ke Posted: minimal satu versi platform dengan URL + waktu posting. */
export const markPostedSchema = z.object({
  contentId: z.string().min(1),
  entries: z
    .array(postedEntrySchema)
    .min(1, "Isi URL dan waktu posting untuk minimal satu platform")
    .max(2)
    .refine(
      (entries) => new Set(entries.map((e) => e.platform)).size === entries.length,
      "Platform tidak boleh ganda",
    ),
});
export type MarkPostedInput = z.infer<typeof markPostedSchema>;

// Checklist
export const checklistToggleSchema = z.object({
  id: z.string().min(1),
  done: z.boolean(),
});

export const checklistAddSchema = z.object({
  contentId: z.string().min(1),
  label: z
    .string()
    .trim()
    .min(1, "Isi nama item")
    .max(120, "Nama item maksimal 120 karakter"),
});
export type ChecklistAddInput = z.infer<typeof checklistAddSchema>;
