"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Platform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DECIDING_METRICS,
  EXPERIMENT_VARIABLES,
  type DecidingMetric,
  type ExperimentVariable,
} from "@/lib/analytics/experiments";
import { callAction } from "@/lib/action-client";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { createExperiment, updateExperiment } from "../actions";
import {
  decidingMetricLabel,
  experimentSchema,
  EXPERIMENT_VARIABLE_LABELS,
  HYPOTHESIS_READING,
  VARIANT_ROLE_LABELS,
  type ExperimentInput,
} from "../schema";
import { ChipButton, FieldError } from "./chip-button";

export type EditableExperiment = {
  id: string;
  hypothesis: string;
  platform: Platform;
  variable: ExperimentVariable;
  variantA: string;
  variantB: string;
  decidingMetric: DecidingMetric;
};

function toFormValues(experiment?: EditableExperiment): Partial<ExperimentInput> {
  return {
    hypothesis: experiment?.hypothesis ?? "",
    platform: experiment?.platform,
    variable: experiment?.variable,
    variantA: experiment?.variantA ?? "",
    variantB: experiment?.variantB ?? "",
    decidingMetric: experiment?.decidingMetric ?? "SCORE",
  };
}

/**
 * Dialog buat/ubah eksperimen. Tanpa `experiment` = baru (lalu buka detailnya).
 * `postCount > 0` mengunci platform: satu eksperimen satu platform, dan post-nya sudah terikat (E7).
 */
export function ExperimentFormDialog({
  experiment,
  postCount = 0,
  trigger,
}: {
  experiment?: EditableExperiment;
  postCount?: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* Dirender ulang setiap dibuka supaya nilai awal selalu segar. */}
        {open && <ExperimentForm experiment={experiment} postCount={postCount} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ExperimentForm({
  experiment,
  postCount,
  onDone,
}: {
  experiment?: EditableExperiment;
  postCount: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = !!experiment;
  const platformLocked = isEdit && postCount > 0;
  const idPrefix = experiment ? `experiment-${experiment.id}` : "experiment-new";

  const form = useForm<ExperimentInput>({
    resolver: zodResolver(experimentSchema),
    defaultValues: toFormValues(experiment),
  });
  const { errors } = form.formState;
  const [platform, variable, decidingMetric, variantA, variantB] = useWatch({
    control: form.control,
    name: ["platform", "variable", "decidingMetric", "variantA", "variantB"],
  });

  const setOpt = { shouldDirty: true, shouldValidate: true } as const;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (experiment) {
        const result = await callAction(() => updateExperiment({ ...values, id: experiment.id }));
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Eksperimen diperbarui");
        onDone();
        router.refresh();
        return;
      }
      const result = await callAction(() => createExperiment(values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Eksperimen dibuat. Sekarang hubungkan post varian A dan B.");
      onDone();
      router.push(routes.studio.experiment(result.data.id));
    });
  });

  const metricText = decidingMetric ? decidingMetricLabel(decidingMetric, platform) : "metrik penentu";

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Ubah eksperimen" : "Eksperimen baru"}</DialogTitle>
        <DialogDescription>
          Uji satu hal dalam satu platform. Hipotesis selalu dibaca &quot;{HYPOTHESIS_READING}&quot;.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-hypothesis`}>Hipotesis</Label>
        <Textarea
          id={`${idPrefix}-hypothesis`}
          rows={2}
          placeholder="mis. Hook hasil jadi di detik pertama membuat lebih banyak orang menyimpan video"
          aria-invalid={!!errors.hypothesis}
          {...form.register("hypothesis")}
        />
        <FieldError message={errors.hypothesis?.message} />
      </div>

      <div className="grid gap-2">
        <Label>Platform</Label>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <ChipButton
              key={p}
              active={platform === p}
              invalid={!!errors.platform}
              disabled={platformLocked && platform !== p}
              onClick={() => form.setValue("platform", p, setOpt)}
            >
              {PLATFORM_LABELS[p]}
            </ChipButton>
          ))}
        </div>
        {platformLocked && (
          <p className="text-xs text-muted-foreground">
            Platform terkunci karena eksperimen ini sudah punya {postCount} post. Lepas semua post untuk menggantinya.
          </p>
        )}
        <FieldError message={errors.platform?.message} />
      </div>

      <div className="grid gap-2">
        <Label>Variabel yang diuji</Label>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIMENT_VARIABLES.map((v) => (
            <ChipButton
              key={v}
              active={variable === v}
              invalid={!!errors.variable}
              onClick={() => form.setValue("variable", v, setOpt)}
            >
              {EXPERIMENT_VARIABLE_LABELS[v]}
            </ChipButton>
          ))}
        </div>
        <FieldError message={errors.variable?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor={`${idPrefix}-a`}>Varian A ({VARIANT_ROLE_LABELS.A})</Label>
          <Input
            id={`${idPrefix}-a`}
            autoComplete="off"
            placeholder="mis. Hook proses di awal"
            aria-invalid={!!errors.variantA}
            {...form.register("variantA")}
          />
          <FieldError message={errors.variantA?.message} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor={`${idPrefix}-b`}>Varian B ({VARIANT_ROLE_LABELS.B})</Label>
          <Input
            id={`${idPrefix}-b`}
            autoComplete="off"
            placeholder="mis. Hook hasil jadi di awal"
            aria-invalid={!!errors.variantB}
            {...form.register("variantB")}
          />
          <FieldError message={errors.variantB?.message} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Metrik penentu</Label>
        <div className="flex flex-wrap gap-1.5">
          {DECIDING_METRICS.map((m) => (
            <ChipButton
              key={m}
              active={decidingMetric === m}
              invalid={!!errors.decidingMetric}
              onClick={() => form.setValue("decidingMetric", m, setOpt)}
            >
              {decidingMetricLabel(m, platform)}
            </ChipButton>
          ))}
        </div>
        <FieldError message={errors.decidingMetric?.message} />
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
        Dibaca: <span className="font-medium text-foreground">B</span> ({variantB?.trim() || "…"}) lebih baik dari{" "}
        <span className="font-medium text-foreground">A</span> ({variantA?.trim() || "…"}), diukur dari {metricText}{" "}
        H+7.
      </p>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Buat eksperimen"}
        </Button>
      </DialogFooter>
    </form>
  );
}
