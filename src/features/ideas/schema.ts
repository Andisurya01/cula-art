import { z } from "zod";
import { MEDIUMS } from "@/lib/labels";

/** Tambah ide cepat (dialog + Ide global): cukup judul, pilar & medium opsional. */
export const quickIdeaSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  pillarId: z.string().min(1).optional(),
  medium: z.enum(MEDIUMS).optional(),
});
export type QuickIdeaInput = z.infer<typeof quickIdeaSchema>;

const rating = z
  .number({ error: "Pilih angka 1-5" })
  .int("Pilih angka 1-5")
  .min(1, "Pilih angka 1-5")
  .max(5, "Pilih angka 1-5")
  .nullable();

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Form lengkap ide (tambah & edit). String kosong = tidak diisi (disimpan `null`). */
export const ideaSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  pillarId: z.string().min(1).nullable(),
  medium: z.enum(MEDIUMS).nullable(),
  notes: z.string().trim().max(2000, "Catatan maksimal 2000 karakter"),
  refUrl: z
    .string()
    .trim()
    .max(500, "Link maksimal 500 karakter")
    .refine((v) => v === "" || isHttpUrl(v), "Link harus URL valid (diawali http:// atau https://)"),
  potential: rating,
  effort: rating,
});
export type IdeaInput = z.infer<typeof ideaSchema>;

export const ideaIdSchema = z.object({ id: z.string().min(1, "Ide tidak valid") });

export const updateIdeaSchema = ideaSchema.extend(ideaIdSchema.shape);
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

export const setIdeaArchivedSchema = ideaIdSchema.extend({ archived: z.boolean() });

/** Jadikan Konten: pilar wajib, format & tipe hook opsional. */
export const convertIdeaSchema = z.object({
  ideaId: z.string().min(1, "Ide tidak valid"),
  pillarId: z.string({ error: "Pilih pilar" }).min(1, "Pilih pilar"),
  formatId: z.string().min(1).nullable(),
  hookTypeId: z.string().min(1).nullable(),
});
export type ConvertIdeaInput = z.infer<typeof convertIdeaSchema>;

// ---- Filter daftar ide (disimpan di search params URL) ----

export const IDEA_SORTS = ["newest", "score"] as const;
export const IDEA_SORT_LABELS: Record<(typeof IDEA_SORTS)[number], string> = {
  newest: "Terbaru",
  score: "Skor gabungan",
};

/** `ALL` = semua status. Default `NEW`. */
export const IDEA_STATUS_FILTERS = ["NEW", "PICKED", "ARCHIVED", "ALL"] as const;
export type IdeaStatusFilter = (typeof IDEA_STATUS_FILTERS)[number];

export type IdeaFilters = {
  pillarId: string | null;
  medium: (typeof MEDIUMS)[number] | null;
  status: IdeaStatusFilter;
  sort: (typeof IDEA_SORTS)[number];
};

export const DEFAULT_IDEA_FILTERS: IdeaFilters = {
  pillarId: null,
  medium: null,
  status: "NEW",
  sort: "newest",
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(list: readonly T[], value: string | undefined): T | null {
  return value !== undefined && (list as readonly string[]).includes(value) ? (value as T) : null;
}

/** Search params → filter. Nilai tidak dikenal diabaikan (pakai default). */
export function parseIdeaFilters(params: RawSearchParams): IdeaFilters {
  const pillarId = first(params.pillar)?.trim();
  return {
    pillarId: pillarId ? pillarId : null,
    medium: oneOf(MEDIUMS, first(params.medium)),
    status: oneOf(IDEA_STATUS_FILTERS, first(params.status)) ?? DEFAULT_IDEA_FILTERS.status,
    sort: oneOf(IDEA_SORTS, first(params.sort)) ?? DEFAULT_IDEA_FILTERS.sort,
  };
}

/** Filter → query string (nilai default tidak ditulis). Tanpa "?" di depan. */
export function ideaFiltersToQuery(filters: IdeaFilters): string {
  const params = new URLSearchParams();
  if (filters.pillarId) params.set("pillar", filters.pillarId);
  if (filters.medium) params.set("medium", filters.medium);
  if (filters.status !== DEFAULT_IDEA_FILTERS.status) params.set("status", filters.status);
  if (filters.sort !== DEFAULT_IDEA_FILTERS.sort) params.set("sort", filters.sort);
  return params.toString();
}
