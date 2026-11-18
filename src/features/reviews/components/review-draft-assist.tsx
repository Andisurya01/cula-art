"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  AiAssistButton,
  AiAssistPanel,
  AiOptionCard,
  AiText,
} from "@/features/ai/components/ai-assist-panel";
import { useAiAssist } from "@/features/ai/components/use-ai-assist";
import { focusListText, toReviewDraftInput } from "../draft";
import { REVIEW_FIELD_LABELS, type ReviewFormValues, type ReviewTextField } from "../schema";

// Tombol "Draf ringkasan" (E9). Input = minggu + isi form saat ini (boleh belum disimpan). Pakai hanya
// mengisi field form (dirty, toast "belum tersimpan"); menyimpan tetap lewat tombol Simpan review.

const FILL = { shouldDirty: true, shouldValidate: true } as const;
const REFLECTION_FIELDS = ["wins", "repeat", "stop"] as const satisfies readonly ReviewTextField[];

export function ReviewDraftAssist({ form, weekKey }: { form: UseFormReturn<ReviewFormValues>; weekKey: string }) {
  const assist = useAiAssist("review-draft");
  const view = assist.view;
  const ready = assist.final;
  const focusItems = (view?.focusNext ?? []).flatMap((item) => (item?.trim() ? [item.trim()] : []));
  const focus = focusListText(focusItems);
  const drafts: Record<(typeof REFLECTION_FIELDS)[number], string | undefined> = {
    wins: view?.wins?.trim(),
    repeat: view?.repeat?.trim(),
    stop: view?.stop?.trim(),
  };

  function applyAll() {
    assist.apply(() => {
      for (const field of REFLECTION_FIELDS) {
        const text = drafts[field];
        if (text) form.setValue(field, text, FILL);
      }
      if (focus) form.setValue("focusNext", focus, FILL);
    });
  }

  // Pakai satu field: panel tetap terbuka supaya bagian lain bisa dipakai juga.
  function applyOne(field: ReviewTextField, text: string) {
    assist.apply(() => form.setValue(field, text, FILL), { close: false });
  }

  return (
    <>
      <AiAssistButton
        label="Draf ringkasan"
        ariaLabel="Bantu AI: Draf ringkasan review"
        onClick={() => assist.setOpen(true)}
      />
      <AiAssistPanel
        assist={assist}
        description="Narasi minggu ini, draf refleksi, dan 3 usulan fokus dari angka minggu ini dan isi form saat ini. Pakai hanya mengisi form; tekan Simpan review untuk menyimpan."
        onGenerate={(instruction) =>
          assist.generate(toReviewDraftInput(weekKey, form.getValues()), { instruction })
        }
      >
        <AiOptionCard label="Narasi minggu ini" useLabel="Pakai semua" disabled={!ready} onUse={applyAll}>
          <AiText>{view?.narrative}</AiText>
          <p className="text-xs text-muted-foreground">
            Pakai semua mengisi tiga refleksi dan fokus minggu depan. Narasi hanya untuk dibaca.
          </p>
        </AiOptionCard>
        {REFLECTION_FIELDS.map((field) => {
          const text = drafts[field];
          if (!text) return null;
          return (
            <AiOptionCard
              key={field}
              label={REVIEW_FIELD_LABELS[field]}
              disabled={!ready}
              onUse={() => applyOne(field, text)}
            >
              <AiText>{text}</AiText>
            </AiOptionCard>
          );
        })}
        {focusItems.length > 0 && (
          <AiOptionCard label="3 fokus minggu depan" disabled={!ready} onUse={() => applyOne("focusNext", focus)}>
            <ol className="list-decimal space-y-1 pl-5">
              {focusItems.map((item, i) => (
                <li key={i} className="break-words">
                  {item}
                </li>
              ))}
            </ol>
          </AiOptionCard>
        )}
      </AiAssistPanel>
    </>
  );
}
