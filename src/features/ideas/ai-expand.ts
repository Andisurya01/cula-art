// "Kembangkan ide" (Bantu AI) di dialog ide: fungsi murni penyusun input dan pengisi form.
import { idByName } from "@/features/ai/format";
import type { IdeaExpandInput, IdeaVariation } from "@/features/ai/prompts/idea-expand";
import type { IdeaInput } from "./schema";

export const IDEA_TITLE_MAX = 200;
export const IDEA_NOTES_MAX = 2000;

/**
 * Nilai form ide saat ini (boleh belum disimpan) → input "Kembangkan ide".
 * String kosong → null; teks dipotong ke batas schema supaya tidak ditolak server.
 */
export function ideaExpandInputFromForm(
  values: Pick<IdeaInput, "title" | "notes" | "medium" | "pillarId">,
  ideaId?: string | null,
): IdeaExpandInput {
  const notes = values.notes.trim().slice(0, IDEA_NOTES_MAX);
  return {
    ideaId: ideaId || null,
    title: values.title.trim().slice(0, IDEA_TITLE_MAX),
    notes: notes || null,
    medium: values.medium,
    pillarId: values.pillarId,
  };
}

/**
 * Catatan ide dari satu variasi: sudut pandang, saran format/tipe hook (Idea tidak punya kolom itu),
 * lalu alasan. Bagian kosong dilewati; hasil maks. 2000 karakter (batas catatan ide).
 */
export function variationNotes(
  variation: Pick<IdeaVariation, "angle" | "format" | "hookType" | "reason">,
): string {
  const format = variation.format?.trim();
  const hookType = variation.hookType?.trim();
  const suggestions = [format && `format ${format}`, hookType && `tipe hook ${hookType}`]
    .filter(Boolean)
    .join(", ");
  return [variation.angle.trim(), suggestions && `Saran AI: ${suggestions}.`, variation.reason.trim()]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, IDEA_NOTES_MAX)
    .trimEnd();
}

export type IdeaFieldsFromVariation = { title: string; notes: string; pillarId: string | null };

/**
 * Variasi → field form ide (judul, catatan, pilar).
 * Pilar dicocokkan dari nama (`idByName`); jika tidak cocok/kosong, `fallback.pillarId` dipakai.
 * Judul kosong dari AI → judul lama.
 */
export function variationToIdeaFields(
  variation: IdeaVariation,
  pillars: readonly { id: string; name: string }[],
  fallback: { title: string; pillarId: string | null },
): IdeaFieldsFromVariation {
  const title = variation.title.trim().slice(0, IDEA_TITLE_MAX);
  return {
    title: title || fallback.title,
    notes: variationNotes(variation),
    pillarId: idByName(pillars, variation.pillar) ?? fallback.pillarId,
  };
}
