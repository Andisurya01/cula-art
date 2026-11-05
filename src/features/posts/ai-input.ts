import type { Platform } from "@prisma/client";
import type { CaptionInput } from "@/features/ai/prompts/caption";
import type { ContentFormInput } from "@/features/ai/prompts/content-common";
import { textOrNull } from "@/features/contents/ai-input";
import type { PostFormValues } from "./schema";

// Input Bantu AI "Caption & hashtag" untuk satu versi platform: data konten (draf detail konten atau
// nilai tersimpan) + tipe post, caption, dan hashtag saat ini dari form versi itu (boleh belum disimpan).

const CAPTION_MAX = 4000;
const HASHTAGS_MAX = 1000;

export function toCaptionAiInput({
  content,
  postId,
  platform,
  values,
}: {
  content: ContentFormInput;
  postId: string | null;
  platform: Platform;
  values: Pick<PostFormValues, "postType" | "caption" | "hashtags">;
}): CaptionInput {
  return {
    ...content,
    postId,
    platform,
    postType: values.postType ?? null,
    caption: textOrNull(values.caption, CAPTION_MAX),
    hashtags: textOrNull(values.hashtags, HASHTAGS_MAX),
  };
}
