import type { ContentFormInput } from "@/features/ai/prompts/content-common";
import type { ContentDetailFormValues } from "./schema";

// Nilai form detail konten (boleh belum disimpan) → input Bantu AI (Hook, Script & shot list,
// dan bagian konten untuk Caption & hashtag). Murni: dipakai tombol Bantu AI di client dan halaman
// detail (nilai tersimpan) di server. Nilai yang tidak valid untuk AI tidak dikirim (jadi null/dipotong),
// supaya panggilan tidak gagal karena isi form yang belum rapi.

export const CONTENT_TITLE_REQUIRED = "Isi judul konten dulu.";

/** Batas panjang sama dengan schema form dan schema input AI (`contentFormInput`). */
const TITLE_MAX = 200;
const HOOK_TEXT_MAX = 300;
const SCRIPT_MAX = 10_000;
const SHOT_LIST_MAX = 10_000;

/** Teks form → `null` jika kosong/spasi; dipotong ke `max` karakter. */
export function textOrNull(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed.slice(0, max);
}

/** Angka dari `<input type="number">` (string) atau angka tersimpan → bilangan bulat dalam rentang, selain itu `null`. */
export function intOrNull(value: string | number | null | undefined, min: number, max: number): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : value.trim() === "" ? Number.NaN : Number(value.trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function idOrNull(value: string | null | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

/** Field yang dibaca dari form detail konten (atau dari data konten tersimpan, bentuknya kompatibel). */
export type ContentAiSource = Pick<
  ContentDetailFormValues,
  | "title"
  | "pillarId"
  | "formatId"
  | "hookTypeId"
  | "hookText"
  | "script"
  | "shotList"
  | "targetDurationSec"
  | "projectId"
  | "seriesPart"
>;

export function toContentAiInput(contentId: string | null, values: ContentAiSource): ContentFormInput {
  return {
    contentId,
    title: values.title.trim().slice(0, TITLE_MAX),
    pillarId: idOrNull(values.pillarId),
    formatId: idOrNull(values.formatId),
    hookTypeId: idOrNull(values.hookTypeId),
    hookText: textOrNull(values.hookText, HOOK_TEXT_MAX),
    script: textOrNull(values.script, SCRIPT_MAX),
    shotList: textOrNull(values.shotList, SHOT_LIST_MAX),
    targetDurationSec: intOrNull(values.targetDurationSec, 1, 3600),
    projectId: idOrNull(values.projectId),
    seriesPart: intOrNull(values.seriesPart, 1, 99),
  };
}

/** Alasan tombol Buat dimatikan (judul wajib untuk semua fitur detail konten), atau `null`. */
export function contentAiDisabledReason(title: string | null | undefined): string | null {
  return title?.trim() ? null : CONTENT_TITLE_REQUIRED;
}
