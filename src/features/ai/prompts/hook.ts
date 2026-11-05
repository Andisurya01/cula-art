import { z } from "zod";
import { contentFormInput, renderContent, type ContentContext, type ContentFormInput } from "./content-common";
import { notesSchema, type FeaturePrompt } from "./types";

export type HookOption = { text: string; note: string };
export type HookOutput = { hooks: HookOption[]; notes: string | null };

export const hookPrompt: FeaturePrompt<ContentFormInput, ContentContext, HookOutput> = {
  feature: "hook",
  version: "hook@1",
  targetType: "CONTENT",
  effort: "medium",
  maxTokens: 6000,
  initialEstimateUsd: 0.04,
  input: contentFormInput,
  task: `Tulis 5 opsi teks hook untuk 3 detik pertama video ini.

- Ikuti tipe hook yang dipilih. Jika tipe hook belum dipilih, variasikan tipenya dan sebutkan tipe tiap opsi di note.
- Hook diucapkan atau tampil sebagai teks di layar: singkat (±12 kata), langsung ke inti, tanpa salam pembuka.
- Kelima opsi harus berbeda satu sama lain, bukan variasi kata dari kalimat yang sama.
- note: cara membawakannya dalam 1 kalimat (teks di layar, voice-over, atau visual pembuka apa).`,
  output: () =>
    z.object({
      hooks: z
        .array(
          z.object({
            text: z.string().max(300).describe("Teks hook, maks. ±100 karakter"),
            note: z.string().max(300),
          }),
        )
        .length(5),
      notes: notesSchema,
    }),
  render: (ctx) => renderContent(ctx, { scriptMax: 1500, shotListMax: 0 }),
};
