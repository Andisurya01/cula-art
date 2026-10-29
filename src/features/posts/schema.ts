import { z } from "zod";
import type { Platform, PostType } from "@prisma/client";
import { isValidWibInputValue } from "@/lib/date";
import { PLATFORMS, POST_TYPES } from "@/lib/labels";
import { nullableInt, nullableText } from "@/features/contents/fields";

/** Tipe post yang masuk akal per platform (Reel hanya Instagram, Video hanya TikTok). */
export const POST_TYPES_BY_PLATFORM: Record<Platform, readonly PostType[]> = {
  TIKTOK: ["VIDEO", "CAROUSEL", "STORY"],
  INSTAGRAM: ["REEL", "CAROUSEL", "STORY"],
};

export function isPostTypeAllowed(platform: Platform, postType: PostType): boolean {
  return POST_TYPES_BY_PLATFORM[platform].includes(postType);
}

/** Nilai `<input type="datetime-local">` (diartikan sebagai WIB), mis. `2026-10-28T19:00`. */
export const wibDateTimeSchema = z
  .string()
  .trim()
  .refine(isValidWibInputValue, "Isi tanggal dan jam dengan benar");

/** Tanggal-jam WIB opsional: string kosong → `null`. */
export const nullableWibDateTime = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed === "" ? null : trimmed;
  })
  .pipe(wibDateTimeSchema.nullable());

export const postUrlSchema = z
  .string()
  .trim()
  .min(1, "URL wajib diisi")
  .max(500, "URL maksimal 500 karakter")
  .pipe(z.url({ protocol: /^https?$/, error: "URL harus diawali http:// atau https://" }));

/** URL opsional: string kosong → `null`. */
export const nullablePostUrl = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed === "" ? null : trimmed;
  })
  .pipe(postUrlSchema.nullable());

/** Satu versi platform yang sudah diposting (dialog Pindah ke Posted). */
export const postedEntrySchema = z.object({
  platform: z.enum(PLATFORMS),
  url: postUrlSchema,
  postedAt: wibDateTimeSchema,
});
export type PostedEntryInput = z.infer<typeof postedEntrySchema>;

/** Form dialog Pindah ke Posted: satu baris per platform, centang = ikut disimpan. */
export const postedFormSchema = z
  .object({
    entries: z.array(
      z.object({
        platform: z.enum(PLATFORMS),
        enabled: z.boolean(),
        url: z.string(),
        postedAt: z.string(),
      }),
    ),
  })
  .superRefine((value, ctx) => {
    const enabled = value.entries.filter((e) => e.enabled);
    if (enabled.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Pilih minimal satu platform yang sudah diposting",
      });
      return;
    }
    value.entries.forEach((entry, index) => {
      if (!entry.enabled) return;
      const url = postUrlSchema.safeParse(entry.url);
      if (!url.success) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "url"],
          message: url.error.issues[0]?.message ?? "URL tidak valid",
        });
      }
      const postedAt = wibDateTimeSchema.safeParse(entry.postedAt);
      if (!postedAt.success) {
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "postedAt"],
          message: "Isi waktu posting",
        });
      }
    });
  });
export type PostedFormValues = z.infer<typeof postedFormSchema>;

/** Ubah nilai form dialog Posted menjadi entri untuk Server Action. */
export function toPostedEntries(values: PostedFormValues): PostedEntryInput[] {
  return values.entries
    .filter((e) => e.enabled)
    .map((e) => ({ platform: e.platform, url: e.url.trim(), postedAt: e.postedAt.trim() }));
}

export const createPostSchema = z.object({
  contentId: z.string().min(1),
  platform: z.enum(PLATFORMS),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** Form versi platform di detail konten. */
export const postFormSchema = z.object({
  postType: z.enum(POST_TYPES),
  caption: nullableText(4000, "Caption"),
  hashtags: nullableText(1000, "Hashtag"),
  scheduledAt: nullableWibDateTime,
  url: nullablePostUrl,
  postedAt: nullableWibDateTime,
  durationSec: nullableInt(1, 3600, "Durasi"),
});
export type PostFormValues = z.input<typeof postFormSchema>;
export type PostFormOutput = z.output<typeof postFormSchema>;

export const updatePostSchema = postFormSchema.extend({
  id: z.string().min(1),
});
export type UpdatePostInput = z.input<typeof updatePostSchema>;

export const postIdSchema = z.object({ id: z.string().min(1) });
