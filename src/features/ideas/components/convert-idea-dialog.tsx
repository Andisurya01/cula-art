"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { convertIdeaToContent } from "../actions";
import { convertIdeaSchema } from "../schema";
import type { IdeaListItem } from "../queries";
import type { PillarOption, TaxonomyOption } from "./types";

const NONE = "none";

export type ConvertOptions = {
  pillars: PillarOption[];
  formats: TaxonomyOption[];
  hookTypes: TaxonomyOption[];
};

/** Jadikan Konten: pilih pilar (wajib), format & tipe hook (opsional). */
export function ConvertIdeaDialog({
  idea,
  options,
  open,
  onOpenChange,
}: {
  idea: IdeaListItem;
  options: ConvertOptions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <ConvertForm idea={idea} options={options} />}
      </DialogContent>
    </Dialog>
  );
}

function ConvertForm({ idea, options }: { idea: IdeaListItem; options: ConvertOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialPillar = options.pillars.some((p) => p.id === idea.pillarId) ? idea.pillarId : null;
  const [pillarId, setPillarId] = useState<string | null>(initialPillar);
  const [formatId, setFormatId] = useState<string | null>(null);
  const [hookTypeId, setHookTypeId] = useState<string | null>(null);
  const [pillarError, setPillarError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = convertIdeaSchema.safeParse({ ideaId: idea.id, pillarId, formatId, hookTypeId });
    if (!parsed.success) {
      setPillarError(parsed.error.issues[0]?.message ?? "Pilih pilar");
      return;
    }
    startTransition(async () => {
      const result = await callAction(() => convertIdeaToContent(parsed.data));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Konten dibuat di kolom Perencanaan");
      router.push(routes.studio.content(result.data.contentId));
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Jadikan Konten</DialogTitle>
        <DialogDescription>
          “{idea.title}” masuk Pipeline di kolom Perencanaan, lengkap dengan checklist.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="convert-pillar">Pilar</Label>
        <Select
          value={pillarId ?? ""}
          onValueChange={(v) => {
            setPillarId(v);
            setPillarError(null);
          }}
        >
          <SelectTrigger id="convert-pillar" className="w-full" aria-invalid={!!pillarError}>
            <SelectValue placeholder="Pilih pilar" />
          </SelectTrigger>
          <SelectContent>
            {options.pillars.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pillarError && <p className="text-xs text-destructive">{pillarError}</p>}
        {options.pillars.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Belum ada pilar aktif. Tambahkan di Pengaturan.
          </p>
        )}
      </div>

      <OptionalSelect
        id="convert-format"
        label="Format"
        items={options.formats}
        value={formatId}
        onChange={setFormatId}
      />
      <OptionalSelect
        id="convert-hook"
        label="Tipe hook"
        items={options.hookTypes}
        value={hookTypeId}
        onChange={setHookTypeId}
      />

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Membuat konten…" : "Jadikan Konten"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function OptionalSelect({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: TaxonomyOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label} <span className="font-normal text-muted-foreground">(opsional)</span>
      </Label>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Nanti saja</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
