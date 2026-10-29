import { z } from "zod";
import { DEFAULT_SCORE_WEIGHTS, type ScoreWeights } from "@/lib/analytics/metrics";
import { normalizeWhatsapp } from "@/features/gallery/format";

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:mm");

export const postingSlotSchema = z.object({
  day: z.number().int().min(1).max(7), // ISO: 1 = Senin
  time: timeSchema,
});
export type PostingSlot = z.infer<typeof postingSlotSchema>;

export const postingSlotsSchema = z.array(postingSlotSchema).max(21);

export const DEFAULT_POSTING_SLOTS: PostingSlot[] = [
  { day: 2, time: "19:00" },
  { day: 4, time: "19:00" },
  { day: 6, time: "19:00" },
];

const weight = z.number().min(0).max(100);
export const scoreWeightsSchema = z.object({
  likes: weight,
  comments: weight,
  shares: weight,
  saves: weight,
  follows: weight,
}) satisfies z.ZodType<ScoreWeights>;

export const followerTargetSchema = z.object({
  tiktokFollowers: z.number().int().min(0).optional(),
  igFollowers: z.number().int().min(0).optional(),
  tiktokEr: z.number().min(0).max(100).optional(),
  igEr: z.number().min(0).max(100).optional(),
});
export type FollowerTarget = z.infer<typeof followerTargetSchema>;

/** Parse kolom JSON Setting dengan fallback ke default jika rusak/kosong. */
export function parsePostingSlots(json: string | null | undefined): PostingSlot[] {
  const parsed = postingSlotsSchema.safeParse(safeJson(json));
  return parsed.success ? sortSlots(parsed.data) : [];
}

export function parseScoreWeights(json: string | null | undefined): ScoreWeights {
  const parsed = scoreWeightsSchema.safeParse(safeJson(json));
  return parsed.success ? parsed.data : DEFAULT_SCORE_WEIGHTS;
}

export function parseFollowerTarget(json: string | null | undefined): FollowerTarget {
  const parsed = followerTargetSchema.safeParse(safeJson(json));
  return parsed.success ? parsed.data : {};
}

export function sortSlots(slots: PostingSlot[]): PostingSlot[] {
  return [...slots].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}

function safeJson(json: string | null | undefined): unknown {
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Input form/action menu Pengaturan
// ---------------------------------------------------------------------------

export const idSchema = z.string().min(1, "ID tidak valid");

/** Jenis daftar master yang dikelola di Pengaturan. */
export const MASTER_KINDS = ["pillar", "format", "hookType", "checklist"] as const;
export type MasterKind = (typeof MASTER_KINDS)[number];

/** Daftar sederhana (cukup nama/label): format, tipe hook, item checklist. */
export const SIMPLE_LIST_KINDS = ["format", "hookType", "checklist"] as const;
export type SimpleListKind = (typeof SIMPLE_LIST_KINDS)[number];

export const pillarInputSchema = z.object({
  name: z.string().trim().min(1, "Nama pilar wajib diisi").max(60, "Nama maksimal 60 karakter"),
  description: z
    .string()
    .trim()
    .max(300, "Deskripsi maksimal 300 karakter")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus kode hex, mis. #3b82f6"),
  targetShare: z
    .number({ error: "Porsi wajib angka" })
    .int("Porsi harus bilangan bulat")
    .min(0, "Porsi minimal 0%")
    .max(100, "Porsi maksimal 100%"),
});
export type PillarInput = z.input<typeof pillarInputSchema>;
export type PillarValues = z.output<typeof pillarInputSchema>;

export const updatePillarSchema = pillarInputSchema.extend({ id: idSchema });

export const simpleItemNameSchema = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi")
  .max(120, "Maksimal 120 karakter");

export const createSimpleItemSchema = z.object({
  kind: z.enum(SIMPLE_LIST_KINDS),
  name: simpleItemNameSchema,
});

export const renameSimpleItemSchema = createSimpleItemSchema.extend({ id: idSchema });

export const setActiveSchema = z.object({
  kind: z.enum(MASTER_KINDS),
  id: idSchema,
  isActive: z.boolean(),
});

export const moveItemSchema = z.object({
  kind: z.enum(MASTER_KINDS),
  id: idSchema,
  direction: z.enum(["up", "down"]),
});

export const deleteItemSchema = z.object({
  kind: z.enum(MASTER_KINDS),
  id: idSchema,
});

/**
 * Target mingguan. Handle TikTok/Instagram pindah ke profil publik (`publicProfileSchema`);
 * key lain yang terkirim diabaikan Zod, jadi handle yang tersimpan tidak ikut terhapus.
 */
export const generalSettingsSchema = z.object({
  weeklyPostTarget: z
    .number({ error: "Target wajib angka" })
    .int("Target harus bilangan bulat")
    .min(1, "Target minimal 1 post per minggu")
    .max(14, "Target maksimal 14 post per minggu"),
});
export type GeneralSettingsInput = z.input<typeof generalSettingsSchema>;
export type GeneralSettingsValues = z.output<typeof generalSettingsSchema>;

// ---------------------------------------------------------------------------
// Profil publik Galeri (tab "Profil publik"). Field kosong disimpan null dan tidak tampil.
// ---------------------------------------------------------------------------

export const PROFILE_LIMITS = {
  siteName: 80,
  tagline: 160,
  bio: 500,
  aboutText: 5000,
  city: 80,
  contactEmail: 254,
  handle: 30,
} as const;

/** Satu baris: spasi/baris baru beruntun jadi satu spasi. */
function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Paragraf: baris baru dipertahankan (maks. satu baris kosong antar paragraf), spasi ujung dibuang. */
function paragraphs(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Teks opsional: dirapikan, dibatasi panjangnya; kosong → null. */
function optionalText(max: number, label: string, clean: (value: string) => string = singleLine) {
  return z
    .string()
    .nullish()
    .transform((v) => clean(v ?? ""))
    .pipe(z.string().max(max, `${label} maksimal ${max} karakter`))
    .transform((v) => (v === "" ? null : v));
}

const PROFILE_URL = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|tiktok\.com)\/+@?([^/?#]*)/i;

/** "@nama", "nama", atau tautan profil (instagram.com/nama/, tiktok.com/@nama) → "nama". */
export function cleanHandleInput(input: string | null | undefined): string {
  const value = (input ?? "").trim();
  const fromUrl = PROFILE_URL.exec(value);
  return (fromUrl ? fromUrl[1] : value).replace(/^@+/, "");
}

/** Handle akun: boleh diketik dengan "@" atau ditempel sebagai tautan profil; kosong → null. */
const handleSchema = z
  .string()
  .nullish()
  .transform(cleanHandleInput)
  .pipe(
    z
      .string()
      .max(PROFILE_LIMITS.handle, `Handle maksimal ${PROFILE_LIMITS.handle} karakter`)
      .regex(/^[A-Za-z0-9._]*$/, "Handle hanya boleh huruf, angka, titik, dan garis bawah"),
  )
  .transform((v) => (v === "" ? null : v));

/**
 * Nomor WhatsApp dari input bebas ("0812-3456-7890", "+62 812 …", "+62 (0)812 …", "62812…")
 * ke format `62…` lewat `normalizeWhatsapp` Galeri. Null jika kosong atau tidak valid
 * (huruf, terlalu pendek/panjang, bukan nomor Indonesia).
 */
export function normalizeWhatsappInput(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  // "+62 0812…" / "+62 (0)812…": angka 0 setelah kode negara dibuang.
  return normalizeWhatsapp(digits.startsWith("620") ? digits.slice(2) : digits);
}

export const WHATSAPP_ERROR = "Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890 atau +62 812 3456 7890";

const whatsappSchema = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    if (!v?.trim()) return null;
    const normalized = normalizeWhatsappInput(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: WHATSAPP_ERROR });
      return z.NEVER;
    }
    return normalized;
  });

const emailFormat = z.email();

const contactEmailSchema = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    const value = (v ?? "").trim();
    if (value === "") return null;
    if (value.length > PROFILE_LIMITS.contactEmail || !emailFormat.safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "Email tidak valid, mis. nama@contoh.com" });
      return z.NEVER;
    }
    return value;
  });

/** Dipakai bersama form (zodResolver) dan aksi `updatePublicProfile`. Hasilnya idempoten. */
export const publicProfileSchema = z.object({
  siteName: z
    .string({ error: "Nama situs wajib diisi" })
    .transform(singleLine)
    .pipe(
      z
        .string()
        .min(1, "Nama situs wajib diisi")
        .max(PROFILE_LIMITS.siteName, `Nama situs maksimal ${PROFILE_LIMITS.siteName} karakter`),
    ),
  tagline: optionalText(PROFILE_LIMITS.tagline, "Tagline"),
  bio: optionalText(PROFILE_LIMITS.bio, "Bio singkat"),
  aboutText: optionalText(PROFILE_LIMITS.aboutText, "Cerita Tentang", paragraphs),
  city: optionalText(PROFILE_LIMITS.city, "Kota"),
  whatsapp: whatsappSchema,
  contactEmail: contactEmailSchema,
  igHandle: handleSchema,
  tiktokHandle: handleSchema,
});
export type PublicProfileInput = z.input<typeof publicProfileSchema>;
export type PublicProfileValues = z.output<typeof publicProfileSchema>;

/** Slot posting dari form Pengaturan: tidak boleh ada hari+jam yang sama. */
export const postingSlotsInputSchema = postingSlotsSchema
  .max(21, "Maksimal 21 slot")
  .refine((slots) => !hasDuplicateSlot(slots), "Slot hari dan jam yang sama sudah ada");

export function slotKey(slot: PostingSlot): string {
  return `${slot.day}-${slot.time}`;
}

export function hasDuplicateSlot(slots: PostingSlot[]): boolean {
  return new Set(slots.map(slotKey)).size !== slots.length;
}

const weightInput = z
  .number({ error: "Bobot wajib angka" })
  .min(0, "Bobot minimal 0")
  .max(100, "Bobot maksimal 100");
export const scoreWeightsInputSchema = z.object({
  likes: weightInput,
  comments: weightInput,
  shares: weightInput,
  saves: weightInput,
  follows: weightInput,
}) satisfies z.ZodType<ScoreWeights>;
