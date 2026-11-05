import { z } from "zod";
import { MEDIUMS } from "@/lib/labels";
import { dataLines, enumOrNull, notesSchema, optionalId, type FeaturePrompt } from "./types";

export const ideaExpandInput = z.object({
  ideaId: optionalId,
  title: z.string().trim().min(1, "Isi judul ide dulu").max(200),
  notes: z.string().trim().max(2000).nullable().optional(),
  medium: z.enum(MEDIUMS).nullable().optional(),
  pillarId: optionalId,
});
export type IdeaExpandInput = z.output<typeof ideaExpandInput>;

export type IdeaExpandContext = {
  title: string;
  notes: string | null;
  medium: string | null;
  pillar: string | null;
};

export type IdeaVariation = {
  title: string;
  angle: string;
  pillar: string | null;
  format: string | null;
  hookType: string | null;
  reason: string;
};
export type IdeaExpandOutput = { variations: IdeaVariation[]; notes: string | null };

export const ideaExpandPrompt: FeaturePrompt<IdeaExpandInput, IdeaExpandContext, IdeaExpandOutput> = {
  feature: "idea-expand",
  version: "idea-expand@1",
  targetType: "IDEA",
  effort: "medium",
  maxTokens: 8000,
  initialEstimateUsd: 0.04,
  input: ideaExpandInput,
  task: `Kembangkan ide konten di bawah menjadi 3 variasi dengan sudut pandang yang berbeda satu sama lain.

Untuk setiap variasi:
- title: judul singkat yang bisa langsung menjadi judul konten.
- angle: apa yang ditunjukkan di video dan kenapa menarik ditonton (1-3 kalimat).
- pillar, format, hookType: saran dari daftar kategori di Panduan AI.
- reason: alasan singkat kenapa variasi ini layak dicoba (1 kalimat).

Setiap variasi harus realistis dikerjakan satu orang dalam satu malam atau satu akhir pekan, dengan alat dan bahan yang dimiliki kreator.`,
  output: (names) =>
    z.object({
      variations: z
        .array(
          z.object({
            title: z.string().max(200).describe("Judul konten, maks. ±80 karakter"),
            angle: z.string().max(1000),
            pillar: enumOrNull(names.pillars),
            format: enumOrNull(names.formats),
            hookType: enumOrNull(names.hookTypes),
            reason: z.string().max(500),
          }),
        )
        .length(3),
      notes: notesSchema,
    }),
  render: (ctx) =>
    dataLines([
      ["Judul ide", ctx.title],
      ["Catatan", ctx.notes],
      ["Medium", ctx.medium],
      ["Pilar", ctx.pillar],
    ]),
};
