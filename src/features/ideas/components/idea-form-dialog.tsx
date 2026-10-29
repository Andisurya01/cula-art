"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MEDIUMS, MEDIUM_LABELS } from "@/lib/labels";
import { createIdea, updateIdea } from "../actions";
import { ideaSchema, type IdeaInput } from "../schema";
import { ideaScore, MAX_IDEA_SCORE } from "../score";
import type { IdeaListItem } from "../queries";
import { ChipButton } from "./chip-button";
import { RatingPicker } from "./rating-picker";
import type { PillarOption } from "./types";
import { callAction } from "@/lib/action-client";

const EMPTY_VALUES: IdeaInput = {
  title: "",
  pillarId: null,
  medium: null,
  notes: "",
  refUrl: "",
  potential: null,
  effort: null,
};

function toFormValues(idea: IdeaListItem | undefined): IdeaInput {
  if (!idea) return EMPTY_VALUES;
  return {
    title: idea.title,
    pillarId: idea.pillarId,
    medium: idea.medium,
    notes: idea.notes ?? "",
    refUrl: idea.refUrl ?? "",
    potential: idea.potential,
    effort: idea.effort,
  };
}

/** Form lengkap ide. Tanpa `idea` = tambah baru; dengan `idea` = edit. */
export function IdeaFormDialog({
  idea,
  pillars,
  open,
  onOpenChange,
}: {
  idea?: IdeaListItem;
  pillars: PillarOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* Dirender ulang setiap dibuka supaya nilai awal selalu segar. */}
        {open && (
          <IdeaForm idea={idea} pillars={pillars} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IdeaForm({
  idea,
  pillars,
  onDone,
}: {
  idea?: IdeaListItem;
  pillars: PillarOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = !!idea;

  const form = useForm<IdeaInput>({
    resolver: zodResolver(ideaSchema),
    defaultValues: toFormValues(idea),
  });
  const { errors } = form.formState;
  const [pillarId, medium, potential, effort] = useWatch({
    control: form.control,
    name: ["pillarId", "medium", "potential", "effort"],
  });
  const score = ideaScore(potential, effort);

  // Pilar ide yang sudah nonaktif tetap ditampilkan agar tidak hilang saat edit.
  const pillarOptions =
    idea?.pillar && !pillars.some((p) => p.id === idea.pillar?.id)
      ? [...pillars, idea.pillar]
      : pillars;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = idea
        ? await callAction(() => updateIdea({ ...values, id: idea.id }))
        : await callAction(() => createIdea(values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Ide diperbarui" : "Ide tersimpan di Bank Ide");
      onDone();
      router.refresh();
    });
  });

  const setOpt = { shouldDirty: true, shouldValidate: true } as const;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit ide" : "Ide baru"}</DialogTitle>
        <DialogDescription>Hanya judul yang wajib. Sisanya boleh diisi nanti.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="idea-title">Judul</Label>
        <Input
          id="idea-title"
          autoComplete="off"
          placeholder="mis. Clay kucing tidur dalam 60 detik"
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {pillarOptions.length > 0 && (
        <div className="grid gap-2">
          <Label>Pilar</Label>
          <div className="flex flex-wrap gap-1.5">
            {pillarOptions.map((p) => (
              <ChipButton
                key={p.id}
                active={pillarId === p.id}
                onClick={() => form.setValue("pillarId", pillarId === p.id ? null : p.id, setOpt)}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </ChipButton>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label>Medium</Label>
        <div className="flex flex-wrap gap-1.5">
          {MEDIUMS.map((m) => (
            <ChipButton
              key={m}
              active={medium === m}
              onClick={() => form.setValue("medium", medium === m ? null : m, setOpt)}
            >
              {MEDIUM_LABELS[m]}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Potensi</Label>
          <RatingPicker
            label="Potensi"
            hint="1 = kecil, 5 = berpotensi besar"
            value={potential}
            onChange={(v) => form.setValue("potential", v, setOpt)}
          />
          <p className="text-xs text-muted-foreground">1 kecil · 5 berpotensi besar</p>
        </div>
        <div className="grid gap-2">
          <Label>Effort</Label>
          <RatingPicker
            label="Effort"
            hint="1 = ringan, 5 = berat"
            value={effort}
            onChange={(v) => form.setValue("effort", v, setOpt)}
          />
          <p className="text-xs text-muted-foreground">1 ringan · 5 berat</p>
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Skor gabungan:{" "}
        <span className="font-medium text-foreground">
          {score === null ? "isi potensi dan effort" : `${score}/${MAX_IDEA_SCORE}`}
        </span>
      </p>

      <div className="grid gap-2">
        <Label htmlFor="idea-notes">Catatan</Label>
        <Textarea
          id="idea-notes"
          rows={3}
          placeholder="Konsep, angle, bahan yang dibutuhkan…"
          aria-invalid={!!errors.notes}
          {...form.register("notes")}
        />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="idea-ref">Link referensi</Label>
        <Input
          id="idea-ref"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          aria-invalid={!!errors.refUrl}
          {...form.register("refUrl")}
        />
        {errors.refUrl && <p className="text-xs text-destructive">{errors.refUrl.message}</p>}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : isEdit ? "Simpan perubahan" : "Simpan ide"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Tombol "Form lengkap" di header halaman. */
export function NewIdeaButton({
  pillars,
  children,
  variant = "outline",
}: {
  pillars: PillarOption[];
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <IdeaFormDialog pillars={pillars} open={open} onOpenChange={setOpen} />
    </>
  );
}
