import { z } from "zod";
import { PLATFORMS, POST_TYPES } from "@/lib/labels";
import { parseHashtags } from "../guide-schema";
import { contentFormInput, renderContent, type ContentContext } from "./content-common";
import { dataLines, notesSchema, optionalId, type FeaturePrompt } from "./types";

export const captionInput = contentFormInput.extend({
  postId: optionalId,
  platform: z.enum(PLATFORMS),
  postType: z.enum(POST_TYPES).nullable().optional(),
  caption: z.string().max(4000).nullable().optional(),
  hashtags: z.string().max(1000).nullable().optional(),
});
export type CaptionInput = z.output<typeof captionInput>;

export type CaptionContext = ContentContext & {
  platform: string;
  postType: string | null;
  caption: string | null;
  hashtags: string | null;
};

export type CaptionOption = { caption: string; hashtags: string[] };
export type CaptionOutput = { options: CaptionOption[]; notes: string | null };

export const captionPrompt: FeaturePrompt<CaptionInput, CaptionContext, CaptionOutput> = {
  feature: "caption",
  version: "caption@1",
  targetType: "POST",
  effort: "medium",
  maxTokens: 8000,
  initialEstimateUsd: 0.05,
  input: captionInput,
  task: `Tulis 2 opsi caption untuk versi platform yang diminta, masing-masing dengan hashtag.

- TikTok: singkat (1-2 kalimat) dan 3-5 hashtag.
- Instagram: lebih panjang (cerita singkat proses dalam 2-4 paragraf pendek), diakhiri CTA, dengan 5-15 hashtag.
- Kedua opsi harus berbeda pendekatannya (mis. satu bercerita, satu mengajak penonton berdiskusi).
- Hashtag ditulis di daftar hashtags (dengan awalan #), tidak di dalam caption. Utamakan set hashtag pilar dan platform ini, lalu set umum.
- Jika caption sudah ada, jadikan bahan; jangan sekadar mengulanginya.`,
  output: () =>
    z.object({
      options: z
        .array(
          z.object({
            caption: z.string().max(4000),
            hashtags: z.array(z.string().max(101)).max(30),
          }),
        )
        .length(2),
      notes: notesSchema,
    }),
  render: (ctx) =>
    [
      dataLines([
        ["Platform", ctx.platform],
        ["Tipe post", ctx.postType],
        ["Caption saat ini", ctx.caption],
        ["Hashtag saat ini", ctx.hashtags],
      ]),
      renderContent(ctx, { scriptMax: 2000, shotListMax: 0 }),
    ].join("\n"),
  normalize: (out) => ({
    ...out,
    options: out.options.map((o) => ({ ...o, hashtags: parseHashtags(o.hashtags.join(" ")) })),
  }),
};
