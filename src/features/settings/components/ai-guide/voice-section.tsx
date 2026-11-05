"use client";

import { Controller, useFormState, type Control, type UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CAPTION_LENGTH_LABELS,
  EMOJI_LABELS,
  ENGLISH_MIX_LABELS,
  FORMALITY_LABELS,
  type AiGuideContent,
} from "@/features/ai/guide-schema";
import type { AiGuideFormValues } from "../../ai-guide";
import { GuideField, NullableSelect, SectionTitle } from "./guide-field";

type VoiceSelectName = "voice.formality" | "voice.englishMix" | "voice.emoji" | "voice.captionLength";

const VOICE_SELECTS: { name: VoiceSelectName; id: string; label: string; options: Record<string, string> }[] = [
  { name: "voice.formality", id: "ai-formality", label: "Nada bahasa", options: FORMALITY_LABELS },
  { name: "voice.englishMix", id: "ai-english-mix", label: "Campuran bahasa Inggris", options: ENGLISH_MIX_LABELS },
  { name: "voice.emoji", id: "ai-emoji", label: "Emoji", options: EMOJI_LABELS },
  { name: "voice.captionLength", id: "ai-caption-length", label: "Panjang caption", options: CAPTION_LENGTH_LABELS },
];

/** Gaya bahasa terstruktur (pilihan tetap) + sapaan, CTA favorit, dan catatan bebas. */
export function VoiceSection({
  control,
  register,
}: {
  control: Control<AiGuideFormValues, unknown, AiGuideContent>;
  register: UseFormRegister<AiGuideFormValues>;
}) {
  const { errors } = useFormState({ control, name: ["voice", "voiceNotes"] });

  return (
    <section className="grid gap-4" aria-labelledby="ai-voice">
      <SectionTitle
        id="ai-voice"
        title="Gaya bahasa"
        description="Pilihan yang belum diatur tidak dikirim ke AI."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {VOICE_SELECTS.map(({ name, id, label, options }) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <GuideField id={id} label={label} error={fieldState.error?.message}>
                <NullableSelect
                  id={id}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={options}
                  emptyLabel="Belum diatur"
                  invalid={fieldState.invalid}
                />
              </GuideField>
            )}
          />
        ))}
        <GuideField
          id="ai-greeting"
          label="Sapaan ke penonton"
          hint="Mis. “kalian” atau “teman-teman”."
          error={errors.voice?.greeting?.message}
        >
          <Input
            id="ai-greeting"
            autoComplete="off"
            maxLength={60}
            placeholder="kalian"
            aria-invalid={!!errors.voice?.greeting}
            {...register("voice.greeting")}
          />
        </GuideField>
        <GuideField
          id="ai-ctas"
          label="CTA favorit"
          hint="Ajakan di akhir caption. Pisahkan beberapa CTA dengan baris baru."
          error={errors.voice?.ctas?.message}
        >
          <Textarea
            id="ai-ctas"
            rows={2}
            maxLength={500}
            placeholder="Simpan dulu biar nggak lupa"
            aria-invalid={!!errors.voice?.ctas}
            {...register("voice.ctas")}
          />
        </GuideField>
      </div>
      <GuideField
        id="ai-voice-notes"
        label="Catatan gaya"
        hint="Hal lain tentang cara kamu bicara, mis. kata khas atau hal yang tidak cocok."
        error={errors.voiceNotes?.message}
      >
        <Textarea
          id="ai-voice-notes"
          rows={3}
          maxLength={2000}
          aria-invalid={!!errors.voiceNotes}
          {...register("voiceNotes")}
        />
      </GuideField>
    </section>
  );
}
