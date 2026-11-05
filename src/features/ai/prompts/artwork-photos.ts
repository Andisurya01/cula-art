import { z } from "zod";
import { MEDIUMS } from "@/lib/labels";
import { MAX_ARTWORK_AI_PHOTOS } from "../features";
import { dataLines, excerpt, notesSchema, type FeaturePrompt, type PromptPhoto } from "./types";

export { MAX_ARTWORK_AI_PHOTOS };

export const artworkPhotosInput = z.object({
  artworkId: z.string().min(1),
  imageIds: z
    .array(z.string().min(1))
    .min(1, "Pilih minimal 1 foto")
    .max(MAX_ARTWORK_AI_PHOTOS, `Pilih maksimal ${MAX_ARTWORK_AI_PHOTOS} foto`),
  /** Catatan tambahan dari kreator untuk permintaan ini. */
  notes: z.string().trim().max(2000).nullable().optional(),
  // Nilai form karya yang sedang dibuka (boleh belum disimpan).
  title: z.string().trim().max(200).nullable().optional(),
  medium: z.enum(MEDIUMS).nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  materials: z.string().max(300).nullable().optional(),
  widthCm: z.number().min(0).max(100_000).nullable().optional(),
  heightCm: z.number().min(0).max(100_000).nullable().optional(),
  depthCm: z.number().min(0).max(100_000).nullable().optional(),
  summary: z.string().max(300).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
});
export type ArtworkPhotosInput = z.output<typeof artworkPhotosInput>;

export type ArtworkPhotosContext = {
  title: string | null;
  medium: string | null;
  year: number | null;
  materials: string | null;
  size: string | null;
  userNotes: string | null;
  summary: string | null;
  description: string | null;
  project: { title: string; notes: string | null } | null;
  /** Urutan sama dengan pilihan pengguna; `id` = ArtworkImage.id. */
  photos: (PromptPhoto & { id: string; isProcess: boolean; currentAlt: string })[];
};

export type ArtworkAlt = { imageId: string; alt: string };
export type ArtworkPhotosOutput = {
  alts: ArtworkAlt[];
  summary: string;
  description: string;
  notes: string | null;
};

const PHOTO_NUMBERS = ["1", "2", "3", "4"] as const satisfies readonly string[];

/** Jawaban model: nomor foto, bukan id (lihat `output`). */
export type ArtworkPhotosRaw = Omit<ArtworkPhotosOutput, "alts"> & {
  alts: { photo: (typeof PHOTO_NUMBERS)[number]; alt: string }[];
};

export const artworkPhotosPrompt: FeaturePrompt<
  ArtworkPhotosInput,
  ArtworkPhotosContext,
  ArtworkPhotosOutput,
  ArtworkPhotosRaw
> = {
  feature: "artwork-photos",
  version: "artwork-photos@1",
  targetType: "ARTWORK",
  effort: "medium",
  maxTokens: 12000,
  initialEstimateUsd: 0.07,
  input: artworkPhotosInput,
  task: `Dari foto karya terlampir dan datanya, tulis teks untuk Galeri publik:

- alts: teks alternatif untuk setiap foto; isi photo dengan nomor foto dari daftar foto. Deskripsi visual yang singkat dan faktual untuk pembaca layar: subjek, pose atau bentuk, warna, dan bahan yang tampak. Maks. ±150 karakter, tanpa awalan "foto dari" atau "gambar dari".
- summary: ringkasan satu kalimat untuk kartu katalog.
- description: cerita karya 2-4 paragraf untuk halaman detail: apa karyanya, proses dan tantangannya, dan apa yang ingin disampaikan.

Teks Galeri dibaca pengunjung dan calon kolektor, jadi gayanya sedikit lebih rapi daripada caption media sosial, tetapi tetap dengan suara kreator. Jangan menyebut ukuran, bahan, tahun, atau proses yang tidak ada di data; tulis yang kurang di notes.`,
  // Skema tetap (nomor foto "1"-"4", bukan id foto), supaya grammar structured output dan cache prompt tidak
  // berganti setiap pilihan foto berubah. Nomor diterjemahkan ke ArtworkImage.id di normalize.
  output: () =>
    z.object({
      alts: z
        .array(
          z.object({
            photo: z.enum(PHOTO_NUMBERS).describe("Nomor foto di daftar foto"),
            alt: z.string().max(300).describe("Maks. ±150 karakter"),
          }),
        )
        .max(MAX_ARTWORK_AI_PHOTOS),
      summary: z.string().max(300).describe("Satu kalimat"),
      description: z.string().max(10_000),
      notes: notesSchema,
    }),
  render: (ctx) =>
    [
      dataLines([
        ["Judul", ctx.title],
        ["Medium", ctx.medium],
        ["Tahun selesai", ctx.year],
        ["Bahan", ctx.materials],
        ["Ukuran", ctx.size],
        ["Proyek asal", ctx.project?.title],
        ["Catatan proyek", excerpt(ctx.project?.notes, 1500)],
        ["Catatan dari kreator", ctx.userNotes],
        ["Ringkasan saat ini", ctx.summary],
        ["Cerita saat ini", excerpt(ctx.description, 4000)],
      ]),
      `Daftar foto (urutan sama dengan lampiran):\n${ctx.photos
        .map(
          (p, i) =>
            `- ${p.label}: photo=${i + 1}${p.isProcess ? " (foto proses)" : " (foto karya jadi)"}${
              p.currentAlt ? `, teks alternatif saat ini: "${p.currentAlt}"` : ""
            }`,
        )
        .join("\n")}`,
    ].join("\n\n"),
  photos: (ctx) => ctx.photos,
  // Nomor foto → ArtworkImage.id. Nomor di luar foto yang dikirim dan nomor ganda dibuang (yang pertama dipakai).
  normalize: (out, ctx) => {
    const alts: ArtworkAlt[] = [];
    for (const item of out.alts) {
      const photo = ctx.photos[Number(item.photo) - 1];
      if (photo && !alts.some((a) => a.imageId === photo.id)) alts.push({ imageId: photo.id, alt: item.alt });
    }
    return { ...out, alts };
  },
};
