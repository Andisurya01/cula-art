"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { createArtwork } from "../actions";
import { createArtworkSchema, type CreateArtworkInput } from "../schema";

/** "Karya baru": cukup judul → Draft dibuat → buka form detail. */
export function NewArtworkDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const form = useForm<CreateArtworkInput>({
    resolver: zodResolver(createArtworkSchema),
    defaultValues: { title: "" },
  });
  const error = form.formState.errors.title?.message;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset({ title: "" });
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => createArtwork(values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft karya dibuat");
      setOpen(false);
      router.push(routes.studio.artwork(result.data.id));
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Karya baru</DialogTitle>
            <DialogDescription>
              Cukup judul dulu. Foto, ukuran, dan detail lain diisi di halaman berikutnya.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="artwork-new-title">Judul</Label>
            <Input
              id="artwork-new-title"
              autoComplete="off"
              placeholder="mis. Patung kepala naga"
              aria-invalid={!!error}
              {...form.register("title")}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Membuat…" : "Buat draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
