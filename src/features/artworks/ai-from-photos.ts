import { MAX_ARTWORK_AI_PHOTOS } from "@/features/ai/features";
import type { ArtworkPhotosInput } from "@/features/ai/prompts/artwork-photos";
import { resolveCoverId, type CoverCandidate } from "./rules";
import type { ArtworkDetailFormValues } from "./schema";

// Logika murni tombol Bantu AI "Dari foto" di menu Karya: pemilihan foto dan nilai form → input AI.
// Tanpa React/Prisma, supaya bisa diuji langsung.

export { MAX_ARTWORK_AI_PHOTOS };

/** Batas panjang sama dengan schema input `artwork-photos` (src/features/ai/prompts/artwork-photos.ts). */
export const AI_NOTES_MAX = 2000;
const TEXT_MAX = { title: 200, materials: 300, summary: 300, description: 10_000 } as const;
const YEAR_RANGE = { min: 1900, max: 2100 } as const;
const DIMENSION_MAX = 100_000;

// ---- Pemilihan foto ----

/** Urutan foto di pemilih: cover, foto karya jadi lain (menurut urutan), lalu foto proses. */
export function aiPhotoOrder<T extends CoverCandidate>(photos: readonly T[]): T[] {
  const sorted = [...photos].sort((a, b) => a.order - b.order);
  const coverId = resolveCoverId(sorted);
  return [
    ...sorted.filter((p) => p.id === coverId),
    ...sorted.filter((p) => !p.isProcess && p.id !== coverId),
    ...sorted.filter((p) => p.isProcess),
  ];
}

/** Pilihan awal: cover + 3 foto berikutnya, foto karya jadi didahulukan. */
export function defaultAiPhotoIds(photos: readonly CoverCandidate[], max = MAX_ARTWORK_AI_PHOTOS): string[] {
  return aiPhotoOrder(photos)
    .slice(0, max)
    .map((p) => p.id);
}

/**
 * Foto yang terpilih, dalam urutan pemilih (urutan ini juga urutan lampiran ke AI).
 * `selected = null` berarti pengguna belum mengubah pilihan → pilihan awal (ikut foto yang baru diunggah).
 * Id foto yang sudah dihapus dibuang; maksimal `max` foto.
 */
export function resolveAiPhotoSelection(
  photos: readonly CoverCandidate[],
  selected: readonly string[] | null,
  max = MAX_ARTWORK_AI_PHOTOS,
): string[] {
  if (selected === null) return defaultAiPhotoIds(photos, max);
  const chosen = new Set(selected);
  return aiPhotoOrder(photos)
    .filter((p) => chosen.has(p.id))
    .slice(0, max)
    .map((p) => p.id);
}

/** Centang/hapus centang satu foto. Foto baru tidak ditambahkan jika sudah `max` foto. */
export function toggleAiPhoto(selected: readonly string[], id: string, max = MAX_ARTWORK_AI_PHOTOS): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  if (selected.length >= max) return [...selected];
  return [...selected, id];
}

/** Alasan tombol Buat dimatikan, atau null jika boleh membuat. */
export function aiPhotosBlockedReason(photoCount: number, selectedCount: number): string | null {
  if (photoCount === 0) return "Unggah foto karya dulu.";
  if (selectedCount === 0) return "Pilih minimal 1 foto.";
  return null;
}

// ---- Pakai hasil ----

/** Bagian hasil AI yang bisa dipakai terpisah. */
export type ArtworkAiPart = "summary" | "description" | "alts";

/** Bagian hasil yang ada isinya (bagian kosong tidak ditawarkan, supaya tidak mengosongkan field). */
export function usableAiParts(output: {
  summary?: string | null;
  description?: string | null;
  alts?: readonly unknown[] | null;
}): ArtworkAiPart[] {
  const parts: ArtworkAiPart[] = [];
  if (output.summary?.trim()) parts.push("summary");
  if (output.description?.trim()) parts.push("description");
  if (output.alts?.length) parts.push("alts");
  return parts;
}

const FORM_PART_LABELS = { summary: "ringkasan", description: "cerita" } as const;
const NOT_SAVED_FORM = "Belum tersimpan sampai kamu menekan Simpan perubahan.";
const ALTS_UNCHANGED = "Teks alternatif dari AI sama dengan yang sudah tersimpan.";

/** Pesan toast setelah Pakai: apa yang masuk ke mana, dan bahwa belum ada yang tersimpan. */
export function appliedMessage(parts: readonly ArtworkAiPart[], altDraftCount: number): string {
  const formLabels = (["summary", "description"] as const)
    .filter((part) => parts.includes(part))
    .map((part) => FORM_PART_LABELS[part])
    .join(" dan ");
  const formText = formLabels && `${formLabels.charAt(0).toUpperCase()}${formLabels.slice(1)} masuk ke form.`;
  const altText = `Teks alternatif masuk sebagai draf di ${altDraftCount} foto.`;

  if (!parts.includes("alts")) return [formText, NOT_SAVED_FORM].filter(Boolean).join(" ");
  if (altDraftCount === 0) return [formText, formText && NOT_SAVED_FORM, ALTS_UNCHANGED].filter(Boolean).join(" ");
  return formText
    ? `${formText} ${altText} Belum tersimpan: tekan Simpan perubahan dan Simpan di setiap foto.`
    : `${altText} Periksa lalu tekan Simpan di setiap foto.`;
}

// ---- Nilai form → input AI ----

/** Field form karya yang ikut dikirim ke AI (nilai mentah form, boleh belum disimpan). */
export type ArtworkAiFormValues = Pick<
  ArtworkDetailFormValues,
  "title" | "medium" | "year" | "materials" | "widthCm" | "heightCm" | "depthCm" | "summary" | "description"
>;

/** Teks: spasi di ujung dibuang, kosong → null, dipotong ke batas schema AI. */
function text(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed.slice(0, max);
}

/** Angka dari input teks ("12,5" atau "12.5"); kosong atau bukan angka → null. */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Tahun yang belum valid (mis. masih diketik "20") dikirim null, supaya permintaan tidak ditolak. */
function toYear(value: string | number | null | undefined): number | null {
  const n = toNumber(value);
  return n !== null && Number.isInteger(n) && n >= YEAR_RANGE.min && n <= YEAR_RANGE.max ? n : null;
}

function toDimension(value: string | number | null | undefined): number | null {
  const n = toNumber(value);
  return n !== null && n > 0 && n <= DIMENSION_MAX ? n : null;
}

/** Susun input `artwork-photos` dari nilai form SAAT INI + foto terpilih + catatan untuk AI. */
export function toArtworkPhotosInput({
  artworkId,
  imageIds,
  notes,
  values,
}: {
  artworkId: string;
  imageIds: readonly string[];
  notes: string;
  values: ArtworkAiFormValues;
}): ArtworkPhotosInput {
  return {
    artworkId,
    imageIds: imageIds.slice(0, MAX_ARTWORK_AI_PHOTOS),
    notes: text(notes, AI_NOTES_MAX),
    title: text(values.title, TEXT_MAX.title),
    medium: values.medium ?? null,
    year: toYear(values.year),
    materials: text(values.materials, TEXT_MAX.materials),
    widthCm: toDimension(values.widthCm),
    heightCm: toDimension(values.heightCm),
    depthCm: toDimension(values.depthCm),
    summary: text(values.summary, TEXT_MAX.summary),
    description: text(values.description, TEXT_MAX.description),
  };
}
