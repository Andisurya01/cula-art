"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  AiAssistButton,
  AiAssistPanel,
  AiOptionCard,
  AiText,
} from "@/features/ai/components/ai-assist-panel";
import { useAiAssist } from "@/features/ai/components/use-ai-assist";
import { contentAiDisabledReason, toContentAiInput } from "../ai-input";
import type { ContentDetailFormValues, ContentDetailInput } from "../schema";

// Tombol Bantu AI di form detail konten. Input = isi form saat ini (boleh belum disimpan);
// Pakai hanya mengisi field form (dirty), simpan tetap lewat tombol "Simpan perubahan".

type ContentForm = UseFormReturn<ContentDetailFormValues, unknown, ContentDetailInput>;

const FILL = { shouldDirty: true, shouldValidate: true } as const;
const SAVE_HINT = "Pakai hanya mengisi form; tekan Simpan perubahan untuk menyimpan.";

/** Hook: 5 opsi teks hook sesuai tipe hook terpilih → field Teks hook. */
export function HookAssist({
  form,
  contentId,
  hookTypes,
}: {
  form: ContentForm;
  contentId: string;
  hookTypes: { id: string; name: string }[];
}) {
  const assist = useAiAssist("hook");
  const [title, hookTypeId] = useWatch({ control: form.control, name: ["title", "hookTypeId"] });
  const hookType = hookTypes.find((h) => h.id === hookTypeId)?.name;
  const hooks = assist.view?.hooks ?? [];

  function applyHook(text: string) {
    assist.apply(() => form.setValue("hookText", text, FILL));
  }

  return (
    <>
      <AiAssistButton onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        description={
          hookType
            ? `5 opsi teks hook untuk tipe hook "${hookType}". ${SAVE_HINT}`
            : `Tipe hook belum dipilih, jadi AI memvariasikan tipenya. ${SAVE_HINT}`
        }
        generateDisabledReason={contentAiDisabledReason(title)}
        onGenerate={(instruction) =>
          assist.generate(toContentAiInput(contentId, form.getValues()), { instruction })
        }
      >
        {hooks.map((hook, i) => {
          const text = hook?.text;
          return (
            <AiOptionCard
              key={i}
              label={`Opsi ${i + 1}`}
              disabled={!assist.final || !text}
              onUse={() => text && applyHook(text)}
            >
              <AiText className="font-medium">{text}</AiText>
              {hook?.note && <p className="text-xs text-muted-foreground">{hook.note}</p>}
            </AiOptionCard>
          );
        })}
      </AiAssistPanel>
    </>
  );
}

/** Script & shot list: draf script, shot list, dan target durasi (streaming) → tiga field form. */
export function ScriptAssist({ form, contentId }: { form: ContentForm; contentId: string }) {
  const assist = useAiAssist("script");
  const title = useWatch({ control: form.control, name: "title" });
  const script = assist.view?.script;
  const shotList = assist.view?.shotList;
  const duration = assist.view?.targetDurationSec;
  const ready = assist.final;

  function applyAll() {
    assist.apply(() => {
      if (script) form.setValue("script", script, FILL);
      if (shotList) form.setValue("shotList", shotList, FILL);
      if (duration) form.setValue("targetDurationSec", String(duration), FILL);
    });
  }

  // Pakai sebagian: panel tetap terbuka supaya bagian lain bisa dipakai juga.
  function applyOne(field: "script" | "shotList", value: string) {
    assist.apply(() => form.setValue(field, value, FILL), { close: false });
  }

  return (
    <>
      <AiAssistButton onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        description={`Draf script/storyboard, shot list, dan target durasi dari isi form saat ini. ${SAVE_HINT}`}
        generateDisabledReason={contentAiDisabledReason(title)}
        onGenerate={(instruction) =>
          assist.generate(toContentAiInput(contentId, form.getValues()), { instruction })
        }
      >
        <AiOptionCard
          useLabel="Pakai semua"
          disabled={!ready}
          onUse={applyAll}
          actions={
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!ready || !script}
                onClick={() => script && applyOne("script", script)}
              >
                Pakai script
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!ready || !shotList}
                onClick={() => shotList && applyOne("shotList", shotList)}
              >
                Pakai shot list
              </Button>
            </>
          }
        >
          <ResultSection label="Script / storyboard" text={script} />
          <ResultSection label="Shot list" text={shotList} />
          {typeof duration === "number" && duration > 0 && (
            <p>
              <span className="text-xs font-medium text-muted-foreground">Target durasi:</span>{" "}
              {duration} detik
            </p>
          )}
        </AiOptionCard>
      </AiAssistPanel>
    </>
  );
}

function ResultSection({ label, text }: { label: string; text: string | undefined }) {
  if (!text) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <AiText>{text}</AiText>
    </div>
  );
}
