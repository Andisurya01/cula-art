import { z } from "zod";
import { dataLines, excerpt, optionalId } from "./types";

// Input dan blok data bersama fitur detail konten (Hook, Script & shot list, Caption & hashtag).
// Nilai diambil dari form yang sedang dibuka (boleh belum disimpan); nama kategori dicari server dari id.

export const contentFormInput = z.object({
  contentId: optionalId,
  title: z.string().trim().min(1, "Isi judul konten dulu").max(200),
  pillarId: optionalId,
  formatId: optionalId,
  hookTypeId: optionalId,
  hookText: z.string().max(300).nullable().optional(),
  script: z.string().max(10_000).nullable().optional(),
  shotList: z.string().max(10_000).nullable().optional(),
  targetDurationSec: z.number().int().min(1).max(3600).nullable().optional(),
  projectId: optionalId,
  seriesPart: z.number().int().min(1).max(99).nullable().optional(),
});
export type ContentFormInput = z.output<typeof contentFormInput>;

export type ContentContext = {
  title: string;
  pillar: string | null;
  format: string | null;
  hookType: string | null;
  hookText: string | null;
  script: string | null;
  shotList: string | null;
  targetDurationSec: number | null;
  project: { title: string; medium: string; stage: string } | null;
  seriesPart: number | null;
  /** Catatan ide asal (jika konten dibuat dari ide). */
  ideaNotes: string | null;
};

export function renderContent(ctx: ContentContext, options: { scriptMax: number; shotListMax: number }): string {
  return dataLines([
    ["Judul konten", ctx.title],
    ["Pilar", ctx.pillar],
    ["Format", ctx.format],
    ["Tipe hook", ctx.hookType ?? "belum dipilih"],
    ["Teks hook saat ini", ctx.hookText],
    ["Target durasi (detik)", ctx.targetDurationSec],
    ["Proyek", ctx.project && `${ctx.project.title} (${ctx.project.medium}, tahap ${ctx.project.stage})`],
    ["Part seri", ctx.seriesPart],
    ["Catatan ide asal", excerpt(ctx.ideaNotes, 1000)],
    ["Script saat ini", excerpt(ctx.script, options.scriptMax)],
    ["Shot list saat ini", excerpt(ctx.shotList, options.shotListMax)],
  ]);
}
