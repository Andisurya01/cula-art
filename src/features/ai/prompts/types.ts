import { z } from "zod";
import type { AiFeature, AiTargetType } from "../features";

/** Nama kategori aktif (urutan Pengaturan). Output memakai enum dari sini supaya AI tidak mengarang kategori. */
export type TaxonomyNames = { pillars: string[]; formats: string[]; hookTypes: string[] };

/** Foto yang ikut dikirim. `storageKey` dibaca dan diperkecil oleh run.ts (src/features/ai/photos.ts). */
export type PromptPhoto = { label: string; storageKey: string };

/**
 * Definisi satu fitur. Murni (tanpa DB), supaya bisa dipakai set uji dengan konteks contoh.
 * Mengubah `task` atau skema → naikkan `version` (dicek test hash).
 * `Raw` = bentuk jawaban model (skema output); `normalize` mengubahnya menjadi `Output` untuk form.
 */
export type FeaturePrompt<Input, Context, Output, Raw = Output> = {
  feature: AiFeature;
  version: string;
  targetType: AiTargetType;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  /** Perkiraan biaya awal (US$, Opus 5.5) sebelum ada riwayat AiRun untuk fitur ini. */
  initialEstimateUsd: number;
  /** Payload dari client (nilai form yang sedang dibuka, belum tentu tersimpan). */
  input: z.ZodType<Input, unknown>;
  /** Instruksi tugas (stabil, tanpa data). */
  task: string;
  output(names: TaxonomyNames, context: Context): z.ZodType<Raw, unknown>;
  /** Isi blok <data>: hanya field yang diizinkan untuk fitur ini. */
  render(context: Context): string;
  photos?(context: Context): PromptPhoto[];
  /** Rapikan hasil setelah lolos validasi (mis. format hashtag, nomor foto → id foto). */
  normalize?(output: Raw, context: Context): Output;
};

/** Enum nama kategori, atau null jika daftar kosong. */
export function enumOrNull(names: string[]) {
  const [first, ...rest] = names;
  if (first === undefined) return z.null();
  return z.enum([first, ...rest]).nullable();
}

/** Baris "Label: nilai" untuk blok data; nilai kosong dilewati. */
export function dataLines(entries: [label: string, value: string | number | null | undefined][]): string {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => {
      const text = String(value).trim();
      return text.includes("\n") ? `${label}:\n${text}` : `${label}: ${text}`;
    })
    .join("\n");
}

/** Potong teks panjang yang hanya menjadi konteks (bukan untuk diperbaiki AI). `max` 0 = tidak dikirim. */
export function excerpt(text: string | null | undefined, max: number): string | null {
  if (!text || max <= 0) return null;
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export const notesSchema = z
  .string()
  .max(1000)
  .nullable()
  .describe("Catatan singkat untuk kreator: data yang kurang atau asumsi. null jika tidak ada.");

export const optionalId = z.string().min(1).nullable().optional();
