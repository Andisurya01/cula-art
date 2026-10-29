import { z } from "zod";
import { nullableId, nullableInt, nullableText } from "@/features/contents/fields";
import { ARTWORK_VISIBILITIES, AVAILABILITIES, MEDIUMS } from "@/lib/labels";
import { isValidSlug } from "@/lib/slug";
import { SLUG_ERRORS } from "./rules";

export const MAX_ARTWORK_IMAGES = 40;
export const MAX_ARTWORK_CONTENTS = 10;
export const MAX_PRICE_IDR = 2_000_000_000; // kolom Int (32-bit)
export const ALT_MAX_LENGTH = 300;

export const idSchema = z.string().trim().min(1, "ID tidak valid");

export const artworkTitleSchema = z
  .string()
  .trim()
  .min(1, "Judul wajib diisi")
  .max(200, "Judul maksimal 200 karakter");

/** "Karya baru": cukup judul. */
export const createArtworkSchema = z.object({ title: artworkTitleSchema });
export type CreateArtworkInput = z.infer<typeof createArtworkSchema>;

/** Desimal opsional dari input teks ("12,5" atau "12.5"); string kosong → null. */
function nullableDecimal(label: string, max: number) {
  return z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "number") return v;
      const trimmed = v.trim().replace(",", ".");
      return trimmed === "" ? null : Number(trimmed);
    })
    .pipe(
      z
        .number({ error: `${label} harus berupa angka` })
        .positive(`${label} harus lebih dari 0`)
        .max(max, `${label} maksimal ${max}`)
        .nullable(),
    );
}

/** Harga Rupiah bulat dari input teks ("1500000", "1.500.000", "Rp 1.500.000"); kosong → null. */
const nullablePrice = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === "number") return v;
    const cleaned = v.trim().replace(/^rp\.?\s*/i, "").replace(/[.\s]/g, "");
    return cleaned === "" ? null : Number(cleaned);
  })
  .pipe(
    z
      .number({ error: "Harga harus berupa angka Rupiah bulat, mis. 1500000" })
      .int("Harga harus Rupiah bulat (tanpa sen)")
      .min(0, "Harga tidak boleh negatif")
      .max(MAX_PRICE_IDR, "Harga maksimal Rp 2.000.000.000")
      .nullable(),
  );

/** Form detail karya (semua field PRD menu 11 selain foto, video proses, dan status). */
export const artworkDetailSchema = z
  .object({
    title: artworkTitleSchema,
    /** true = slug dibuat ulang dari judul saat disimpan (hanya berlaku jika karya belum pernah terbit). */
    autoSlug: z.boolean(),
    slug: z.string().trim(),
    summary: nullableText(300, "Ringkasan"),
    description: nullableText(10_000, "Cerita"),
    medium: z.enum(MEDIUMS, { error: "Medium tidak valid" }).nullable(),
    year: nullableInt(1900, 2100, "Tahun"),
    widthCm: nullableDecimal("Lebar", 10_000),
    heightCm: nullableDecimal("Tinggi", 10_000),
    depthCm: nullableDecimal("Tebal", 10_000),
    materials: nullableText(300, "Bahan"),
    weightGram: nullableInt(1, 1_000_000, "Berat"),
    projectId: nullableId,
    availability: z.enum(AVAILABILITIES, { error: "Ketersediaan tidak valid" }),
    priceIdr: nullablePrice,
    showPrice: z.boolean(),
    isFeatured: z.boolean(),
    featuredOrder: nullableInt(0, 999, "Urutan unggulan").transform((v) => v ?? 0),
  })
  .superRefine((d, ctx) => {
    if (!d.autoSlug && !isValidSlug(d.slug)) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: SLUG_ERRORS.format });
    }
    if (d.showPrice && d.priceIdr === null) {
      ctx.addIssue({ code: "custom", path: ["priceIdr"], message: "Isi harga jika ingin ditampilkan" });
    }
  });
export type ArtworkDetailFormValues = z.input<typeof artworkDetailSchema>;
export type ArtworkDetailInput = z.output<typeof artworkDetailSchema>;

export const visibilitySchema = z.object({
  id: idSchema,
  visibility: z.enum(ARTWORK_VISIBILITIES, { error: "Status tidak valid" }),
});

export const imageAltSchema = z.object({
  id: idSchema,
  alt: z.string().trim().max(ALT_MAX_LENGTH, `Teks alternatif maksimal ${ALT_MAX_LENGTH} karakter`),
});

export const imageProcessSchema = z.object({ id: idSchema, isProcess: z.boolean() });

export const reorderImagesSchema = z.object({
  artworkId: idSchema,
  imageIds: z.array(idSchema).max(MAX_ARTWORK_IMAGES, `Maksimal ${MAX_ARTWORK_IMAGES} foto per karya`),
});

export const artworkContentsSchema = z.object({
  artworkId: idSchema,
  contentIds: z
    .array(idSchema)
    .max(MAX_ARTWORK_CONTENTS, `Maksimal ${MAX_ARTWORK_CONTENTS} video proses`)
    .refine((ids) => new Set(ids).size === ids.length, "Konten tidak boleh dipilih dua kali"),
});

export const fromProjectSchema = z.object({
  projectId: idSchema,
  photoIds: z.array(idSchema).max(MAX_ARTWORK_IMAGES, `Maksimal ${MAX_ARTWORK_IMAGES} foto per karya`).optional(),
});
