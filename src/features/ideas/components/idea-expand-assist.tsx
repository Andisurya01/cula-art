"use client";

import { useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiAssistButton, AiAssistPanel, AiOptionCard, AiText } from "@/features/ai/components/ai-assist-panel";
import { useAiAssist } from "@/features/ai/components/use-ai-assist";
import { idByName } from "@/features/ai/format";
import type { IdeaVariation } from "@/features/ai/prompts/idea-expand";
import { callAction } from "@/lib/action-client";
import { createIdea } from "../actions";
import { ideaExpandInputFromForm, variationToIdeaFields } from "../ai-expand";
import type { IdeaInput } from "../schema";
import type { PillarOption } from "./types";

const setOpt = { shouldDirty: true, shouldValidate: true } as const;

/**
 * Bantu AI "Kembangkan ide" di dialog ide: 3 variasi dari isi form saat ini (boleh belum disimpan).
 * Pakai → mengisi form yang sedang dibuka (belum tersimpan). Simpan sebagai ide baru → `createIdea`.
 * Panel (Sheet) dirender di dalam pohon React dialog, jadi Radix menumpuknya di atas dialog:
 * fokus/Escape/klik luar hanya menutup panel, dan isi form tetap ada.
 */
export function IdeaExpandAssist({
  form,
  ideaId,
  pillars,
}: {
  form: UseFormReturn<IdeaInput>;
  /** Diisi saat edit ide. */
  ideaId?: string;
  /** Pilar aktif (nama hasil AI dicocokkan ke sini). */
  pillars: PillarOption[];
}) {
  const assist = useAiAssist("idea-expand");
  const title = useWatch({ control: form.control, name: "title" });
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState<string | null>(null);

  const variations = assist.view?.variations ?? [];
  // Pakai/Simpan hanya untuk hasil final (sudah lolos validasi skema di server).
  const finalVariations = assist.final ? assist.result?.data.variations : undefined;
  const runId = assist.result?.runId ?? "";

  function use(variation: IdeaVariation) {
    const values = form.getValues();
    const fields = variationToIdeaFields(variation, pillars, { title: values.title, pillarId: values.pillarId });
    assist.apply(() => {
      form.setValue("title", fields.title, setOpt);
      form.setValue("notes", fields.notes, setOpt);
      form.setValue("pillarId", fields.pillarId, setOpt);
    });
  }

  async function saveAsNew(variation: IdeaVariation, key: string) {
    const values = form.getValues();
    // Ide baru tidak mewarisi pilar yang sudah nonaktif (mungkin saat edit ide lama).
    const formPillarId = pillars.some((p) => p.id === values.pillarId) ? values.pillarId : null;
    const fields = variationToIdeaFields(variation, pillars, { title: values.title.trim(), pillarId: formPillarId });
    setSaving(key);
    const result = await callAction(() =>
      createIdea({
        title: fields.title,
        pillarId: fields.pillarId,
        medium: values.medium,
        notes: fields.notes,
        refUrl: "",
        potential: null,
        effort: null,
      }),
    );
    setSaving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSaved((prev) => new Set(prev).add(key));
    assist.markAccepted();
    toast.success("Ide baru tersimpan di Bank Ide. Form ini tidak berubah.");
  }

  return (
    <>
      <AiAssistButton label="Kembangkan ide" onClick={() => assist.setOpen(true)} />
      <AiAssistPanel
        assist={assist}
        title="Kembangkan ide"
        description="3 variasi dari judul dan catatan di form. Pakai mengisi form ini (belum tersimpan); Simpan sebagai ide baru menyimpan variasi itu ke Bank Ide."
        generateDisabledReason={title.trim() ? null : "Isi judul ide dulu."}
        onGenerate={(instruction) =>
          assist.generate(ideaExpandInputFromForm(form.getValues(), ideaId), { instruction })
        }
      >
        {variations.map((variation, i) => {
          const key = `${runId}:${i}`;
          const finalVariation = finalVariations?.[i];
          const isSaved = saved.has(key);
          const matchedPillarId = idByName(pillars, variation.pillar);
          const pillarColor = pillars.find((p) => p.id === matchedPillarId)?.color;
          const tags = [
            { label: "Format", value: variation.format },
            { label: "Hook", value: variation.hookType },
          ];
          return (
            <AiOptionCard
              key={i}
              label={`Variasi ${i + 1}`}
              onUse={() => finalVariation && use(finalVariation)}
              disabled={!finalVariation}
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!finalVariation || isSaved || saving !== null}
                  onClick={() => finalVariation && saveAsNew(finalVariation, key)}
                >
                  {isSaved ? "Tersimpan" : saving === key ? "Menyimpan…" : "Simpan sebagai ide baru"}
                </Button>
              }
            >
              {variation.title && <p className="font-medium break-words">{variation.title}</p>}
              {variation.angle && <AiText>{variation.angle}</AiText>}
              <div className="flex flex-wrap gap-1">
                {variation.pillar && (
                  <SuggestionBadge label="Pilar" value={variation.pillar} color={pillarColor} />
                )}
                {tags.map(
                  (tag) => tag.value && <SuggestionBadge key={tag.label} label={tag.label} value={tag.value} />,
                )}
              </div>
              {variation.reason && <p className="text-xs text-muted-foreground">{variation.reason}</p>}
            </AiOptionCard>
          );
        })}
      </AiAssistPanel>
    </>
  );
}

/** Chip saran AI: "Pilar Proses Clay", "Format Time-lapse", "Hook Hasil di depan". */
function SuggestionBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Badge variant="outline" className="max-w-full">
      {color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate">{value}</span>
    </Badge>
  );
}
