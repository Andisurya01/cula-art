import { z } from "zod";
import { contentFormInput, renderContent, type ContentContext, type ContentFormInput } from "./content-common";
import { notesSchema, type FeaturePrompt } from "./types";

export type ScriptOutput = {
  script: string;
  shotList: string;
  targetDurationSec: number;
  notes: string | null;
};

export const scriptPrompt: FeaturePrompt<ContentFormInput, ContentContext, ScriptOutput> = {
  feature: "script",
  version: "script@1",
  targetType: "CONTENT",
  effort: "medium",
  maxTokens: 16000,
  initialEstimateUsd: 0.09,
  input: contentFormInput,
  task: `Susun draf script/storyboard dan shot list untuk video ini sesuai formatnya.

- script: dibagi per bagian dengan perkiraan detik (mis. "0-3 dtk: …"). Mulai dari teks hook saat ini jika ada, dan akhiri dengan CTA yang sesuai gaya bahasa. Tulis apa yang tampil di layar dan apa yang diucapkan/ditulis sebagai teks.
- shotList: daftar shot yang perlu direkam, satu baris per shot (sudut kamera, apa yang direkam, catatan singkat). Shot harus bisa direkam sendiri di meja kerja.
- targetDurationSec: durasi realistis dalam detik untuk format dan platformnya (umumnya 15-60 detik).
- Jika script atau shot list sudah ada, perbaiki dan lengkapi; pertahankan idenya.`,
  output: () =>
    z.object({
      script: z.string().max(10_000),
      shotList: z.string().max(10_000),
      targetDurationSec: z.number().int().min(1).max(3600).describe("Detik, umumnya 15-60"),
      notes: notesSchema,
    }),
  render: (ctx) => renderContent(ctx, { scriptMax: 6000, shotListMax: 4000 }),
};
