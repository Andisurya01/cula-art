"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { createPillar, updatePillar } from "../actions";
import type { PillarRow } from "../queries";
import { pillarInputSchema, type PillarInput, type PillarValues } from "../schema";
import { useRunAction } from "./use-run-action";

const EMPTY: PillarInput = { name: "", description: "", color: "#3b82f6", targetShare: 0 };

function toFormValues(pillar: PillarRow | null): PillarInput {
  if (!pillar) return EMPTY;
  return {
    name: pillar.name,
    description: pillar.description ?? "",
    color: pillar.color,
    targetShare: pillar.targetShare,
  };
}

/**
 * Dialog tambah/ubah pilar. `pillar = null` → mode tambah.
 * Parent me-mount dialog hanya saat dibuka, jadi `defaultValues` selalu segar.
 */
export function PillarFormDialog({
  onClose,
  pillar,
}: {
  onClose: () => void;
  pillar: PillarRow | null;
}) {
  const { pending, run } = useRunAction();
  const form = useForm<PillarInput, unknown, PillarValues>({
    resolver: zodResolver(pillarInputSchema),
    defaultValues: toFormValues(pillar),
  });
  const color = useWatch({ control: form.control, name: "color" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    run(() => (pillar ? updatePillar({ id: pillar.id, ...values }) : createPillar(values)), {
      success: pillar ? "Pilar diperbarui" : "Pilar ditambahkan",
      onOk: onClose,
    });
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{pillar ? "Ubah pilar" : "Pilar baru"}</DialogTitle>
            <DialogDescription>
              Porsi target dipakai untuk melihat keseimbangan konten antar pilar.
            </DialogDescription>
          </DialogHeader>

          <Field id="pillar-name" label="Nama" error={errors.name?.message}>
            <Input
              id="pillar-name"
              autoComplete="off"
              maxLength={60}
              aria-invalid={!!errors.name}
              {...form.register("name")}
            />
          </Field>

          <Field id="pillar-description" label="Deskripsi (opsional)" error={errors.description?.message}>
            <Textarea
              id="pillar-description"
              rows={2}
              maxLength={300}
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="pillar-color" label="Warna" error={errors.color?.message}>
              <div className="flex items-center gap-2">
                <Input
                  id="pillar-color"
                  type="color"
                  className="h-8 w-12 shrink-0 cursor-pointer p-1"
                  aria-invalid={!!errors.color}
                  {...form.register("color")}
                />
                <span className="font-mono text-xs text-muted-foreground uppercase">{color}</span>
              </div>
            </Field>
            <Field id="pillar-share" label="Porsi target (%)" error={errors.targetShare?.message}>
              <Input
                id="pillar-share"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                aria-invalid={!!errors.targetShare}
                {...form.register("targetShare", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
