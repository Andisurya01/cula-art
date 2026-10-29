import { z } from "zod";
import { isValidWibDateString } from "@/lib/date";
import { MEDIUMS, PROJECT_STAGES } from "@/lib/labels";

/** Tanggal dari `<input type="date">`: `yyyy-MM-dd` atau kosong. */
const optionalDate = z
  .string()
  .refine((v) => v === "" || isValidWibDateString(v), "Tanggal tidak valid");

export const projectSchema = z
  .object({
    title: z.string().trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
    medium: z.enum(MEDIUMS, { error: "Medium wajib dipilih" }),
    stage: z.enum(PROJECT_STAGES, { error: "Tahap tidak valid" }),
    startDate: optionalDate,
    endDate: optionalDate,
    notes: z.string().trim().max(5000, "Catatan maksimal 5000 karakter"),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
  });
export type ProjectInput = z.infer<typeof projectSchema>;

export const PHOTO_CAPTION_MAX = 300;
const photoCaption = z
  .string()
  .trim()
  .max(PHOTO_CAPTION_MAX, `Caption maksimal ${PHOTO_CAPTION_MAX} karakter`);

/** Foto progres lewat tautan URL (perilaku Fase 1). */
export const projectPhotoSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL foto wajib diisi")
    .pipe(z.url({ protocol: /^https?$/, error: "URL harus diawali http:// atau https://" })),
  caption: photoCaption,
  takenAt: optionalDate,
});
export type ProjectPhotoInput = z.infer<typeof projectPhotoSchema>;

/** Field form yang ikut file unggahan (Route Handler `proyek/[id]/foto`). Keduanya opsional. */
export const projectPhotoUploadSchema = z.object({
  caption: photoCaption,
  takenAt: optionalDate,
});
export type ProjectPhotoUploadInput = z.infer<typeof projectPhotoUploadSchema>;

export const MAX_SERIES_PARTS = 12;

export const seriesSchema = z.object({
  count: z
    .number({ error: "Jumlah part wajib diisi" })
    .int("Jumlah part harus bilangan bulat")
    .min(1, "Minimal 1 part")
    .max(MAX_SERIES_PARTS, `Maksimal ${MAX_SERIES_PARTS} part`),
  baseTitle: z
    .string()
    .trim()
    .min(1, "Judul dasar wajib diisi")
    .max(180, "Judul dasar maksimal 180 karakter"),
  pillarId: z.string().min(1, "Pilar wajib dipilih"),
  /** Kosong = tanpa format. */
  formatId: z.string(),
});
export type SeriesInput = z.infer<typeof seriesSchema>;

export const idSchema = z.string().min(1, "ID tidak valid");
