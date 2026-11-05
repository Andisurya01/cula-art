"use client";

import type { UseFormReturn } from "react-hook-form";
import type { Platform } from "@prisma/client";
import {
  AiAssistButton,
  AiAssistPanel,
  AiOptionCard,
  AiText,
} from "@/features/ai/components/ai-assist-panel";
import { useAiAssist } from "@/features/ai/components/use-ai-assist";
import { formatHashtags } from "@/features/ai/guide-schema";
import type { ContentFormInput } from "@/features/ai/prompts/content-common";
import { resolveContentDraft } from "@/features/contents/content-draft";
import { useContentDraft } from "@/features/contents/components/content-draft-provider";
import { PLATFORM_LABELS } from "@/lib/labels";
import { toCaptionAiInput } from "../ai-input";
import type { PostFormOutput, PostFormValues } from "../schema";

type PostForm = UseFormReturn<PostFormValues, unknown, PostFormOutput>;

const FILL = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Caption & hashtag untuk satu versi platform: 2 opsi → field Caption dan Hashtag versi ini.
 * Data konten = isi form detail konten saat ini (lewat ContentDraftProvider), atau nilai tersimpan.
 */
export function CaptionAssist({
  form,
  postId,
  platform,
  content,
}: {
  form: PostForm;
  postId: string;
  platform: Platform;
  /** Data konten tersimpan (cadangan jika form detail konten tidak ada di halaman). */
  content: ContentFormInput;
}) {
  const assist = useAiAssist("caption");
  const draft = useContentDraft();
  const options = assist.view?.options ?? [];
  const label = PLATFORM_LABELS[platform];

  function buildInput() {
    return toCaptionAiInput({
      content: resolveContentDraft(draft?.read() ?? null, content),
      postId,
      platform,
      values: form.getValues(),
    });
  }

  function applyOption(caption: string, hashtags: string[]) {
    assist.apply(() => {
      form.setValue("caption", caption, FILL);
      form.setValue("hashtags", formatHashtags(hashtags), FILL);
    });
  }

  return (
    <>
      <AiAssistButton ariaLabel={`Bantu AI: caption ${label}`} onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        title={`Caption & hashtag ${label}`}
        description={`2 opsi caption + hashtag untuk ${label}, dari isi detail konten saat ini (termasuk yang belum disimpan). Pakai hanya mengisi Caption dan Hashtag versi ini; tekan Simpan versi ${label} untuk menyimpan.`}
        onGenerate={(instruction) => assist.generate(buildInput(), { instruction })}
      >
        {options.map((option, i) => {
          const caption = option?.caption;
          const hashtags = (option?.hashtags ?? []).filter((tag): tag is string => Boolean(tag));
          return (
            <AiOptionCard
              key={i}
              label={`Opsi ${i + 1}`}
              disabled={!assist.final || !caption}
              onUse={() => caption && applyOption(caption, hashtags)}
            >
              <AiText>{caption}</AiText>
              {hashtags.length > 0 && (
                <p className="text-xs break-words text-muted-foreground">{formatHashtags(hashtags)}</p>
              )}
            </AiOptionCard>
          );
        })}
      </AiAssistPanel>
    </>
  );
}
