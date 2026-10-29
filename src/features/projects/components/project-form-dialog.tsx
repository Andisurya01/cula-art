"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Medium, ProjectStage } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toWibDateString } from "@/lib/date";
import { MEDIUMS, MEDIUM_LABELS, PROJECT_STAGES, PROJECT_STAGE_LABELS } from "@/lib/labels";
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { createProject, updateProject } from "../actions";
import { projectSchema, type ProjectInput } from "../schema";
import { ChipButton, FieldError } from "./chip-button";

export type EditableProject = {
  id: string;
  title: string;
  medium: Medium;
  stage: ProjectStage;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
};

function toFormValues(project?: EditableProject): Partial<ProjectInput> {
  return {
    title: project?.title ?? "",
    medium: project?.medium,
    stage: project?.stage ?? "PLANNING",
    startDate: project?.startDate ? toWibDateString(project.startDate) : "",
    endDate: project?.endDate ? toWibDateString(project.endDate) : "",
    notes: project?.notes ?? "",
  };
}

/** Dialog tambah/ubah proyek. Tanpa `project` = proyek baru (lalu buka detailnya). */
export function ProjectFormDialog({
  project,
  trigger,
}: {
  project?: EditableProject;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!project;

  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: toFormValues(project),
  });
  const medium = useWatch({ control: form.control, name: "medium" });
  const stage = useWatch({ control: form.control, name: "stage" });
  const errors = form.formState.errors;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(toFormValues(project));
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (project) {
        const result = await callAction(() => updateProject(project.id, values));
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Proyek diperbarui");
        setOpen(false);
        router.refresh();
        return;
      }
      const result = await callAction(() => createProject(values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Proyek dibuat");
      setOpen(false);
      router.push(routes.studio.project(result.data.id));
    });
  });

  const idPrefix = project ? `project-${project.id}` : "project-new";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah proyek" : "Proyek baru"}</DialogTitle>
            <DialogDescription>
              Satu proyek = satu karya, mis. &quot;Patung kepala naga&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-title`}>Judul</Label>
            <Input
              id={`${idPrefix}-title`}
              autoComplete="off"
              placeholder="mis. Patung kepala naga"
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div className="grid gap-2">
            <Label>Medium</Label>
            <div className="flex flex-wrap gap-1.5">
              {MEDIUMS.map((m) => (
                <ChipButton
                  key={m}
                  active={medium === m}
                  invalid={!!errors.medium}
                  onClick={() => form.setValue("medium", m, { shouldValidate: true })}
                >
                  {MEDIUM_LABELS[m]}
                </ChipButton>
              ))}
            </div>
            <FieldError message={errors.medium?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-stage`}>Tahap</Label>
            <Select
              value={stage}
              onValueChange={(v) => form.setValue("stage", v as ProjectStage)}
            >
              <SelectTrigger id={`${idPrefix}-stage`} className="w-full">
                <SelectValue placeholder="Pilih tahap" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-start`}>Mulai</Label>
              <Input
                id={`${idPrefix}-start`}
                type="date"
                aria-invalid={!!errors.startDate}
                {...form.register("startDate")}
              />
              <FieldError message={errors.startDate?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-end`}>Selesai</Label>
              <Input
                id={`${idPrefix}-end`}
                type="date"
                aria-invalid={!!errors.endDate}
                {...form.register("endDate")}
              />
            </div>
          </div>
          <FieldError message={errors.endDate?.message} />

          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-notes`}>Catatan</Label>
            <Textarea
              id={`${idPrefix}-notes`}
              rows={3}
              placeholder="Bahan, referensi, rencana tiap part…"
              aria-invalid={!!errors.notes}
              {...form.register("notes")}
            />
            <FieldError message={errors.notes?.message} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Buat proyek"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
