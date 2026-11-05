import { z } from "zod";
import { dataLines, enumOrNull, notesSchema, type FeaturePrompt, type PromptPhoto } from "./types";

export const MAX_PROJECT_PHOTOS = 4;

export const projectIdeasInput = z.object({
  projectId: z.string().min(1, "Pilih proyek"),
  includePhotos: z.boolean().default(true),
});
export type ProjectIdeasInput = z.output<typeof projectIdeasInput>;

export type ProjectIdeasContext = {
  title: string;
  medium: string;
  stage: string;
  startDate: string | null;
  notes: string | null;
  /** Foto progres terbaru (tanggal WIB + caption), maks. 20. */
  photoLog: { date: string | null; caption: string | null }[];
  /** Konten yang sudah ada dari proyek ini, supaya tidak diulang. */
  contents: { title: string; seriesPart: number | null; stage: string }[];
  photos: PromptPhoto[];
};

export type ProjectIdea = {
  title: string;
  angle: string;
  seriesPart: number | null;
  pillar: string | null;
  format: string | null;
  hookType: string | null;
  reason: string;
};
export type ProjectIdeasOutput = { ideas: ProjectIdea[]; notes: string | null };

export const projectIdeasPrompt: FeaturePrompt<ProjectIdeasInput, ProjectIdeasContext, ProjectIdeasOutput> = {
  feature: "project-ideas",
  version: "project-ideas@1",
  targetType: "PROJECT",
  effort: "medium",
  maxTokens: 10000,
  initialEstimateUsd: 0.07,
  input: projectIdeasInput,
  task: `Usulkan 3-5 ide konten dari proyek yang sedang berjalan di bawah. Pakai tahap, catatan, riwayat foto progres, dan foto (jika ada) untuk menemukan momen yang layak direkam, mis. armature, bentuk dasar, detail, kesalahan dan perbaikannya, atau reveal.

Untuk setiap ide:
- title: judul konten.
- angle: apa yang direkam dan kenapa menarik (1-3 kalimat).
- seriesPart: nomor part jika ide ini cocok sebagai bagian seri proyek (lanjutkan dari part yang sudah ada), atau null.
- pillar, format, hookType: saran dari daftar kategori di Panduan AI.
- reason: alasan singkat (1 kalimat).

Jangan mengulang konten yang sudah ada. Utamakan ide yang bisa direkam dari tahap proyek saat ini atau tahap berikutnya.`,
  output: (names) =>
    z.object({
      ideas: z
        .array(
          z.object({
            title: z.string().max(200).describe("Judul konten, maks. ±80 karakter"),
            angle: z.string().max(1000),
            seriesPart: z.number().int().nullable().describe("1-99, atau null"),
            pillar: enumOrNull(names.pillars),
            format: enumOrNull(names.formats),
            hookType: enumOrNull(names.hookTypes),
            reason: z.string().max(500),
          }),
        )
        .min(3)
        .max(5),
      notes: notesSchema,
    }),
  render: (ctx) =>
    [
      dataLines([
        ["Proyek", ctx.title],
        ["Medium", ctx.medium],
        ["Tahap", ctx.stage],
        ["Mulai", ctx.startDate],
        ["Catatan", ctx.notes],
      ]),
      ctx.photoLog.length
        ? `Riwayat foto progres (terbaru dulu):\n${ctx.photoLog
            .map((p) => `- ${p.date ?? "tanpa tanggal"}: ${p.caption ?? "(tanpa caption)"}`)
            .join("\n")}`
        : "Riwayat foto progres: belum ada",
      ctx.contents.length
        ? `Konten yang sudah ada:\n${ctx.contents
            .map((c) => `- ${c.seriesPart ? `Part ${c.seriesPart}: ` : ""}${c.title} (${c.stage})`)
            .join("\n")}`
        : "Konten yang sudah ada: belum ada",
      ctx.photos.length ? `Foto terlampir: ${ctx.photos.map((p) => p.label).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  photos: (ctx) => ctx.photos,
  // Nomor part di luar 1-99 tidak bisa disimpan di form; dibuang daripada menggagalkan seluruh hasil.
  normalize: (out) => ({
    ...out,
    ideas: out.ideas.map((idea) => ({
      ...idea,
      seriesPart: idea.seriesPart !== null && idea.seriesPart >= 1 && idea.seriesPart <= 99 ? idea.seriesPart : null,
    })),
  }),
};
