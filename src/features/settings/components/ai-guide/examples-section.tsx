"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useFormState,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_LABELS } from "@/lib/labels";
import {
  AI_EXAMPLE_KIND_LABELS,
  AI_EXAMPLE_KINDS,
  MAX_AI_EXAMPLES,
  type AiExampleKind,
  type AiGuideContent,
} from "@/features/ai/guide-schema";
import { firstErrorMessage, type AiGuideFormValues } from "../../ai-guide";
import { NullableSelect, SectionTitle } from "./guide-field";

type GuideControl = Control<AiGuideFormValues, unknown, AiGuideContent>;

/** Contoh hook/caption terbaik (maks. 10) sebagai contoh gaya untuk AI. */
export function ExamplesSection({
  control,
  register,
}: {
  control: GuideControl;
  register: UseFormRegister<AiGuideFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "examples" });
  const { errors } = useFormState({ control, name: "examples" });
  const full = fields.length >= MAX_AI_EXAMPLES;
  const listError = errors.examples?.root?.message ?? errors.examples?.message;

  return (
    <section className="grid gap-4" aria-labelledby="ai-examples">
      <SectionTitle
        id="ai-examples"
        title="Contoh terbaik"
        description="Hook atau caption yang paling kamu suka. AI meniru gayanya, bukan isinya."
      />

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada contoh.</p>
      ) : (
        <ol className="grid gap-3">
          {fields.map((item, index) => {
            const itemErrors = errors.examples?.[index];
            const textError = itemErrors?.text?.message ?? firstErrorMessage(itemErrors);
            return (
              <li key={item.id} className="grid gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Controller
                    control={control}
                    name={`examples.${index}.kind`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as AiExampleKind)}>
                        <SelectTrigger
                          className="w-26"
                          aria-label={`Jenis contoh ${index + 1}`}
                          onBlur={field.onBlur}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_EXAMPLE_KINDS.map((kind) => (
                            <SelectItem key={kind} value={kind}>
                              {AI_EXAMPLE_KIND_LABELS[kind]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`examples.${index}.platform`}
                    render={({ field }) => (
                      <NullableSelect
                        id={`ai-example-${index}-platform`}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={PLATFORM_LABELS}
                        emptyLabel="Semua"
                        ariaLabel={`Platform contoh ${index + 1}`}
                        className="w-30"
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label={`Hapus contoh ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Label htmlFor={`ai-example-${index}-text`} className="sr-only">
                  Teks contoh {index + 1}
                </Label>
                <Textarea
                  id={`ai-example-${index}-text`}
                  rows={3}
                  maxLength={2200}
                  aria-invalid={!!textError}
                  {...register(`examples.${index}.text`)}
                />
                {textError && <p className="text-xs text-destructive">{textError}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {listError && <p className="text-xs text-destructive">{listError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() =>
            append(
              { kind: "HOOK", platform: null, text: "" },
              { focusName: `examples.${fields.length}.text` },
            )
          }
        >
          <Plus />
          Tambah contoh
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {fields.length}/{MAX_AI_EXAMPLES}
          {full && " · batas tercapai"}
        </span>
      </div>
    </section>
  );
}
