"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateContent } from "../actions";
import type { ContentDetail, ContentDetailOptions } from "../queries";
import {
  contentDetailSchema,
  type ContentDetailFormValues,
  type ContentDetailInput,
} from "../schema";
import { callAction } from "@/lib/action-client";

const NONE = "__none__";

type Option = { id: string; name: string; isActive?: boolean; color?: string };

function toDefaults(content: ContentDetail): ContentDetailFormValues {
  return {
    title: content.title,
    pillarId: content.pillarId,
    formatId: content.formatId,
    hookTypeId: content.hookTypeId,
    hookText: content.hookText ?? "",
    script: content.script ?? "",
    shotList: content.shotList ?? "",
    targetDurationSec: content.targetDurationSec?.toString() ?? "",
    projectId: content.projectId,
    seriesPart: content.seriesPart?.toString() ?? "",
  };
}

/** Form semua field konten (selain stage). */
export function ContentDetailForm({
  content,
  options,
}: {
  content: ContentDetail;
  options: ContentDetailOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ContentDetailFormValues, unknown, ContentDetailInput>({
    resolver: zodResolver(contentDetailSchema),
    defaultValues: toDefaults(content),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => updateContent({ id: content.id, ...values }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Konten tersimpan");
      form.reset(form.getValues());
      router.refresh();
    });
  });

  const projectOptions = options.projects.map((p) => ({ id: p.id, name: p.title }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detail konten</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field id="content-title" label="Judul" error={errors.title?.message}>
            <Input id="content-title" aria-invalid={!!errors.title} {...form.register("title")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="content-pillar" label="Pilar" error={errors.pillarId?.message}>
              <OptionSelect
                id="content-pillar"
                control={form.control}
                name="pillarId"
                options={options.pillars}
                required
              />
            </Field>
            <Field id="content-format" label="Format" error={errors.formatId?.message}>
              <OptionSelect
                id="content-format"
                control={form.control}
                name="formatId"
                options={options.formats}
              />
            </Field>
            <Field id="content-hook-type" label="Tipe hook" error={errors.hookTypeId?.message}>
              <OptionSelect
                id="content-hook-type"
                control={form.control}
                name="hookTypeId"
                options={options.hookTypes}
              />
            </Field>
          </div>

          <Field
            id="content-hook-text"
            label="Teks hook (3 detik pertama)"
            error={errors.hookText?.message}
          >
            <Textarea
              id="content-hook-text"
              rows={2}
              placeholder="Kalimat/visual pembuka yang menahan scroll"
              aria-invalid={!!errors.hookText}
              {...form.register("hookText")}
            />
          </Field>

          <Field id="content-script" label="Script / storyboard" error={errors.script?.message}>
            <Textarea
              id="content-script"
              rows={5}
              aria-invalid={!!errors.script}
              {...form.register("script")}
            />
          </Field>

          <Field id="content-shot-list" label="Shot list" error={errors.shotList?.message}>
            <Textarea
              id="content-shot-list"
              rows={4}
              placeholder="Satu shot per baris"
              aria-invalid={!!errors.shotList}
              {...form.register("shotList")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-[10rem_1fr_7rem]">
            <Field
              id="content-duration"
              label="Target durasi (detik)"
              error={errors.targetDurationSec?.message}
            >
              <Input
                id="content-duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={3600}
                aria-invalid={!!errors.targetDurationSec}
                {...form.register("targetDurationSec")}
              />
            </Field>
            <Field id="content-project" label="Proyek" error={errors.projectId?.message}>
              <OptionSelect
                id="content-project"
                control={form.control}
                name="projectId"
                options={projectOptions}
                emptyLabel="Tanpa proyek"
              />
            </Field>
            <Field id="content-part" label="Part seri" error={errors.seriesPart?.message}>
              <Input
                id="content-part"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                aria-invalid={!!errors.seriesPart}
                {...form.register("seriesPart")}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !isDirty} className="w-full sm:w-auto">
              {pending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type SelectFieldName = "pillarId" | "formatId" | "hookTypeId" | "projectId";

/** Select relasi; opsi nonaktif (yang sedang terpilih) diberi label. `NONE` → `null`. */
function OptionSelect({
  id,
  control,
  name,
  options,
  required = false,
  emptyLabel = "—",
}: {
  id: string;
  control: Control<ContentDetailFormValues, unknown, ContentDetailInput>;
  name: SelectFieldName;
  options: Option[];
  required?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          value={field.value ?? (required ? "" : NONE)}
          onValueChange={(value) => field.onChange(value === NONE ? null : value)}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            aria-invalid={fieldState.invalid}
            onBlur={field.onBlur}
          >
            <SelectValue placeholder="Pilih" />
          </SelectTrigger>
          <SelectContent>
            {!required && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.color && (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                {option.name}
                {option.isActive === false && " (nonaktif)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}
