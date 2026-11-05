import { ALT_MAX_LENGTH } from "./schema";

// Draf teks alternatif per foto dari Bantu AI "Dari foto" (murni, tanpa React).
// Draf hanya ada di browser; teks baru tersimpan saat pengguna menekan Simpan di foto itu.

/** imageId → teks alternatif draf yang belum disimpan. */
export type AltDrafts = Readonly<Record<string, string>>;

/** Saran AI (boleh parsial selama streaming). */
export type AltSuggestion = { imageId?: string | null; alt?: string | null };

/** Foto yang ada sekarang + teks alternatif yang sudah tersimpan. */
export type SavedAlt = { id: string; alt: string };

/** Satu baris, tanpa spasi berlebih, maks. ALT_MAX_LENGTH karakter. */
export function normalizeAlt(alt: string | null | undefined): string {
  return (alt ?? "").replace(/\s+/g, " ").trim().slice(0, ALT_MAX_LENGTH);
}

export function setAltDraft(drafts: AltDrafts, imageId: string, alt: string): AltDrafts {
  return { ...drafts, [imageId]: alt };
}

export function removeAltDraft(drafts: AltDrafts, imageId: string): AltDrafts {
  if (!(imageId in drafts)) return drafts;
  return Object.fromEntries(Object.entries(drafts).filter(([id]) => id !== imageId));
}

/**
 * Masukkan saran AI sebagai draf. Saran untuk foto yang tidak ada (mis. sudah dihapus) atau kosong diabaikan;
 * imageId ganda → saran pertama yang dipakai. Saran yang sama dengan teks tersimpan menghapus draf foto itu
 * (editor kembali ke teks tersimpan). `applied` = foto yang sekarang punya draf baru, urutan sesuai saran.
 */
export function mergeAltDrafts(
  drafts: AltDrafts,
  suggestions: readonly AltSuggestion[],
  photos: readonly SavedAlt[],
): { drafts: AltDrafts; applied: string[] } {
  const saved = new Map(photos.map((p) => [p.id, p.alt]));
  const seen = new Set<string>();
  const applied: string[] = [];
  let next = drafts;
  for (const suggestion of suggestions) {
    const id = suggestion.imageId;
    if (!id || seen.has(id) || !saved.has(id)) continue;
    seen.add(id);
    const alt = normalizeAlt(suggestion.alt);
    if (alt === "") continue;
    if (alt === saved.get(id)) {
      next = removeAltDraft(next, id);
      continue;
    }
    next = setAltDraft(next, id, alt);
    applied.push(id);
  }
  return { drafts: next, applied };
}

/** Jumlah draf untuk foto yang masih ada (draf foto yang sudah dihapus tidak dihitung). */
export function countAltDrafts(drafts: AltDrafts, photoIds: readonly string[]): number {
  return photoIds.filter((id) => id in drafts).length;
}
