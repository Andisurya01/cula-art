"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { createContent } from "../actions";
import { createContentSchema, type CreateContentInput } from "../schema";

type PillarOption = { id: string; name: string; color: string };

/** Tombol + dialog "Konten baru" (judul + pilar) → buat konten di Perencanaan → buka detail. */
export function NewContentDialog({ pillars }: { pillars: PillarOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<CreateContentInput>({
    resolver: zodResolver(createContentSchema),
    defaultValues: { title: "", pillarId: "" },
  });
  const errors = form.formState.errors;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset({ title: "", pillarId: "" });
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => createContent(values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Konten dibuat di Perencanaan");
      setOpen(false);
      router.push(routes.studio.content(result.data.id));
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Konten baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Konten baru</DialogTitle>
            <DialogDescription>
              Masuk ke kolom Perencanaan beserta checklist bawaan. Detail lain diisi setelahnya.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="new-content-title">Judul</Label>
            <Input
              id="new-content-title"
              autoFocus
              autoComplete="off"
              placeholder="mis. Reveal patung kepala naga"
              aria-invalid={!!errors.title}
              {...form.register("title")}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-content-pillar">Pilar</Label>
            <Controller
              control={form.control}
              name="pillarId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="new-content-pillar"
                    className="w-full"
                    aria-invalid={!!errors.pillarId}
                  >
                    <SelectValue placeholder="Pilih pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.pillarId && (
              <p className="text-xs text-destructive">{errors.pillarId.message}</p>
            )}
            {pillars.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada pilar aktif. Tambahkan di Pengaturan.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Membuat…" : "Buat & buka detail"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
