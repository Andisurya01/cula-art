"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
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
import { createSeries } from "../actions";
import { MAX_SERIES_PARTS, seriesSchema, type SeriesInput } from "../schema";
import { buildSeriesItems } from "../series";
import { FieldError } from "./chip-button";
import { callAction } from "@/lib/action-client";

export type SeriesPillarOption = { id: string; name: string; color: string };
export type SeriesFormatOption = { id: string; name: string };

/** Nilai Select untuk "tanpa format" (Radix Select tidak menerima value kosong). */
const NO_FORMAT = "__none__";

/**
 * Dialog Buat Seri: N konten "Judul dasar — Part i" di PLANNING.
 * `nextPart` = part terbesar yang sudah ada + 1 (dihitung ulang di server saat simpan).
 */
export function CreateSeriesDialog({
  projectId,
  projectTitle,
  nextPart,
  pillars,
  formats,
}: {
  projectId: string;
  projectTitle: string;
  nextPart: number;
  pillars: SeriesPillarOption[];
  formats: SeriesFormatOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const defaults: SeriesInput = {
    count: 4,
    baseTitle: projectTitle,
    pillarId: "",
    formatId: "",
  };
  const form = useForm<SeriesInput>({
    resolver: zodResolver(seriesSchema),
    defaultValues: defaults,
  });
  const [count, baseTitle, pillarId, formatId] = useWatch({
    control: form.control,
    name: ["count", "baseTitle", "pillarId", "formatId"],
  });
  const errors = form.formState.errors;
  const validCount =
    Number.isInteger(count) && count >= 1 && count <= MAX_SERIES_PARTS ? count : 0;
  const preview = buildSeriesItems(baseTitle ?? "", nextPart, validCount);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(defaults);
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => createSeries(projectId, values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { count: made, firstPart, lastPart } = result.data;
      toast.success(
        made === 1
          ? `Part ${firstPart} masuk Pipeline`
          : `${made} konten (Part ${firstPart}–${lastPart}) masuk Pipeline`,
      );
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ListPlus />
          Buat Seri
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Buat Seri</DialogTitle>
            <DialogDescription>
              Membuat beberapa konten sekaligus di Pipeline (tahap Perencanaan, lengkap dengan
              checklist).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="series-count">Jumlah</Label>
              <Input
                id="series-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_SERIES_PARTS}
                aria-invalid={!!errors.count}
                {...form.register("count", { valueAsNumber: true })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="series-title">Judul dasar</Label>
              <Input
                id="series-title"
                autoComplete="off"
                aria-invalid={!!errors.baseTitle}
                {...form.register("baseTitle")}
              />
            </div>
          </div>
          <FieldError message={errors.count?.message ?? errors.baseTitle?.message} />

          <div className="grid gap-2">
            <Label htmlFor="series-pillar">Pilar</Label>
            <Select
              value={pillarId || undefined}
              onValueChange={(v) => form.setValue("pillarId", v, { shouldValidate: true })}
            >
              <SelectTrigger
                id="series-pillar"
                className="w-full"
                aria-invalid={!!errors.pillarId}
              >
                <SelectValue placeholder="Pilih pilar" />
              </SelectTrigger>
              <SelectContent>
                {pillars.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.pillarId?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="series-format">Format (opsional)</Label>
            <Select
              value={formatId || NO_FORMAT}
              onValueChange={(v) => form.setValue("formatId", v === NO_FORMAT ? "" : v)}
            >
              <SelectTrigger id="series-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FORMAT}>Tanpa format</SelectItem>
                {formats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Pratinjau</p>
            {preview.length > 0 ? (
              <ol className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border bg-muted/40 p-2 text-xs">
                {preview.map((item) => (
                  <li key={item.part} className="truncate">
                    {item.title}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">
                Isi judul dasar dan jumlah part 1-{MAX_SERIES_PARTS}.
              </p>
            )}
            {nextPart > 1 && (
              <p className="text-xs text-muted-foreground">
                Proyek ini sudah punya sampai Part {nextPart - 1}; seri baru dilanjutkan dari Part{" "}
                {nextPart}.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending || pillars.length === 0}>
              {pending
                ? "Membuat…"
                : preview.length > 0
                  ? `Buat ${preview.length} konten`
                  : "Buat konten"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
