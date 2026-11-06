// Schema metrik: sama untuk form (zodResolver) dan Server Action. Idempoten: menerima string dari
// form maupun angka hasil parse sebelumnya, karena client mengirim nilai yang sudah diubah.

import { z } from "zod";
import { isValidWibDateString, toWibDateString } from "@/lib/date";
import { MAX_COUNT, parseCount, parsePercent, parseWatchSeconds } from "./parse-count";

export const METRIC_KINDS = ["H1", "H7"] as const;

export const METRIC_KIND_LABELS: Record<(typeof METRIC_KINDS)[number], string> = {
  H1: "H+1",
  H7: "H+7",
};

const COUNT_ERROR = "Isi angka, mis. 12.345 atau 12,3K";

/**
 * String lewat `parseCount`; angka harus sudah bilangan bulat. Angka tidak boleh diubah ke string
 * dulu, karena `12.345` akan terbaca sebagai dua belas ribu.
 */
function toCount(value: string | number): number | null {
  if (typeof value === "string") return parseCount(value);
  return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null;
}

/** Jumlah wajib: kosong ditolak. */
const requiredCount = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const parsed = toCount(value);
  if (parsed === null) {
    const empty = typeof value === "string" && value.trim() === "";
    ctx.addIssue({ code: "custom", message: empty ? "Wajib diisi" : COUNT_ERROR });
    return z.NEVER;
  }
  return parsed;
});

/** Jumlah di form metrik: kosong berarti 0, supaya tidak perlu mengetik nol di HP. */
const countOrZero = z.union([z.string(), z.number()]).transform((value, ctx) => {
  if (typeof value === "string" && value.trim() === "") return 0;
  const parsed = toCount(value);
  if (parsed === null) {
    ctx.addIssue({ code: "custom", message: COUNT_ERROR });
    return z.NEVER;
  }
  return parsed;
});

/** Jumlah opsional: kosong berarti `null` (platform tidak diisi). */
const nullableCount = z.union([z.string(), z.number(), z.null()]).transform((value, ctx) => {
  if (value === null || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = toCount(value);
  if (parsed === null) {
    ctx.addIssue({ code: "custom", message: COUNT_ERROR });
    return z.NEVER;
  }
  return parsed;
});

function nullableDecimal(
  parse: (value: string) => number | null,
  max: number,
  messages: { invalid: string; tooLarge: string },
) {
  return z.union([z.string(), z.number(), z.null()]).transform((value, ctx) => {
    if (value === null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const parsed = typeof value === "number" ? (value >= 0 ? value : null) : parse(value);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: messages.invalid });
      return z.NEVER;
    }
    if (parsed > max) {
      ctx.addIssue({ code: "custom", message: messages.tooLarge });
      return z.NEVER;
    }
    return parsed;
  });
}

/** Waktu tonton maksimum yang masuk akal: 1 jam (video terpanjang di aplikasi ini 3.600 detik). */
const MAX_WATCH_SECONDS = 3600;

/** Enam field inti + dua opsional. Nama field mengikuti kolom `MetricSnapshot`. */
export const metricValuesSchema = z.object({
  views: requiredCount,
  likes: countOrZero,
  comments: countOrZero,
  shares: countOrZero,
  saves: countOrZero,
  follows: countOrZero,
  avgWatchSec: nullableDecimal(parseWatchSeconds, MAX_WATCH_SECONDS, {
    invalid: "Isi detik, mis. 8,3 atau 1:23",
    tooLarge: `Waktu tonton maksimal ${MAX_WATCH_SECONDS} detik`,
  }),
  completionRate: nullableDecimal(parsePercent, 100, {
    invalid: "Isi persen, mis. 45,5",
    tooLarge: "Completion rate maksimal 100%",
  }),
});
export type MetricFormValues = z.input<typeof metricValuesSchema>;
export type MetricValues = z.output<typeof metricValuesSchema>;

export const saveMetricSnapshotSchema = metricValuesSchema.extend({
  postId: z.string().min(1),
  kind: z.enum(METRIC_KINDS),
});
export type SaveMetricSnapshotInput = z.input<typeof saveMetricSnapshotSchema>;

export const snapshotIdSchema = z.object({ id: z.string().min(1) });

/** Peringatan yang tidak menolak simpan, mis. likes lebih besar dari views. */
export function metricWarnings(values: { views: number | null; likes: number | null }, viewsLabel: string): string[] {
  const { views, likes } = values;
  if (views !== null && likes !== null && likes > views) {
    return [`Likes lebih besar dari ${viewsLabel}. Periksa lagi; angka tetap bisa disimpan.`];
  }
  return [];
}

/** Tanggal WIB `yyyy-MM-dd` yang valid dan bukan masa depan. `today` dievaluasi saat validasi. */
const snapshotDateSchema = z
  .string()
  .trim()
  .refine(isValidWibDateString, "Isi tanggal dengan benar")
  .refine((value) => value <= toWibDateString(new Date()), "Tanggal tidak boleh di masa depan");

export const accountSnapshotsSchema = z
  .object({
    date: snapshotDateSchema,
    TIKTOK: nullableCount,
    INSTAGRAM: nullableCount,
  })
  .refine((value) => value.TIKTOK !== null || value.INSTAGRAM !== null, {
    path: ["TIKTOK"],
    message: "Isi followers minimal satu platform",
  });
export type AccountSnapshotsFormValues = z.input<typeof accountSnapshotsSchema>;
export type AccountSnapshotsValues = z.output<typeof accountSnapshotsSchema>;
