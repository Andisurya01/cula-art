"use client";

import { cn } from "cn";
import { Controller, type Control } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_LABELS, PLATFORMS } from "@/lib/labels";
import { MAX_HASHTAGS_PER_SET, type AiGuideContent } from "@/features/ai/guide-schema";
import { countHashtags, firstErrorMessage, type AiGuideFormValues } from "../../ai-guide";
import type { PillarRow } from "../../queries";
import { GuideField, SectionTitle } from "./guide-field";

type GuideControl = Control<AiGuideFormValues, unknown, AiGuideContent>;
type SetPrefix = "hashtagSets.general" | `hashtagSets.pillars.${string}`;

/** Hashtag umum + per pilar aktif, masing-masing untuk TikTok dan Instagram. */
export function HashtagSection({ control, pillars }: { control: GuideControl; pillars: PillarRow[] }) {
  const activePillars = pillars.filter((pillar) => pillar.isActive);
  const hasInactive = pillars.some((pillar) => !pillar.isActive);

  return (
    <section className="grid gap-4" aria-labelledby="ai-hashtags">
      <SectionTitle
        id="ai-hashtags"
        title="Hashtag"
        description={`Ketik dipisah spasi atau koma; tanda # boleh tidak ditulis. Maks. ${MAX_HASHTAGS_PER_SET} per platform. AI memilih hashtag dari set ini.`}
      />
      <HashtagSet control={control} prefix="hashtagSets.general" idPrefix="ai-tags-general" title="Umum" note="Dipakai di semua pilar." />
      {activePillars.map((pillar) => (
        <HashtagSet
          key={pillar.id}
          control={control}
          prefix={`hashtagSets.pillars.${pillar.id}`}
          idPrefix={`ai-tags-${pillar.id}`}
          title={`Pilar ${pillar.name}`}
          color={pillar.color}
        />
      ))}
      {activePillars.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada pilar aktif. Tambahkan di tab Pilar.</p>
      )}
      {hasInactive && (
        <p className="text-xs text-muted-foreground">
          Hashtag pilar nonaktif tetap tersimpan dan muncul lagi saat pilarnya diaktifkan.
        </p>
      )}
    </section>
  );
}

function HashtagSet({
  control,
  prefix,
  idPrefix,
  title,
  note,
  color,
}: {
  control: GuideControl;
  prefix: SetPrefix;
  idPrefix: string;
  title: string;
  note?: string;
  color?: string;
}) {
  return (
    <fieldset className="grid gap-3 rounded-lg border p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-medium">
        {color && <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />}
        {title}
        {note && <span className="text-xs font-normal text-muted-foreground">{note}</span>}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <HashtagField
            key={platform}
            control={control}
            name={`${prefix}.${platform}`}
            id={`${idPrefix}-${platform.toLowerCase()}`}
            label={PLATFORM_LABELS[platform]}
          />
        ))}
      </div>
    </fieldset>
  );
}

function HashtagField({
  control,
  name,
  id,
  label,
}: {
  control: GuideControl;
  name: `${SetPrefix}.${(typeof PLATFORMS)[number]}`;
  id: string;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const count = countHashtags(value);
        const over = count > MAX_HASHTAGS_PER_SET;
        // Error item (mis. hashtag ke-n) bisa bersarang di bawah field ini; ambil pesan pertamanya.
        const error = firstErrorMessage(fieldState.error);
        return (
          <GuideField
            id={id}
            label={label}
            error={error}
            aside={
              <span
                className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}
                aria-live="polite"
              >
                {count}/{MAX_HASHTAGS_PER_SET}
              </span>
            }
          >
            <Textarea
              id={id}
              rows={2}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="#gambar #clay"
              aria-invalid={!!error || over}
              name={field.name}
              ref={field.ref}
              value={value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          </GuideField>
        );
      }}
    />
  );
}
