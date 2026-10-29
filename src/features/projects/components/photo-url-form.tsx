"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callAction } from "@/lib/action-client";
import { toWibDateString } from "@/lib/date";
import { addProjectPhoto } from "../actions";
import { PHOTO_CAPTION_MAX, projectPhotoSchema, type ProjectPhotoInput } from "../schema";
import { FieldError } from "./chip-button";

function emptyValues(): ProjectPhotoInput {
  return { url: "", caption: "", takenAt: toWibDateString(new Date()) };
}

/** Tambah foto progres lewat tautan URL (perilaku Fase 1). */
export function PhotoUrlForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<ProjectPhotoInput>({
    resolver: zodResolver(projectPhotoSchema),
    defaultValues: emptyValues(),
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await callAction(() => addProjectPhoto(projectId, values));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Foto progres ditambahkan");
      onDone();
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Tempel URL gambar (mis. dari Google Photos atau Drive yang bisa diakses publik). Foto dari
        tautan tidak bisa disalin ke karya.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="photo-url">URL foto</Label>
        <Input
          id="photo-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          aria-invalid={!!errors.url}
          {...form.register("url")}
        />
        <FieldError message={errors.url?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="photo-caption">Caption (opsional)</Label>
        <Input
          id="photo-caption"
          autoComplete="off"
          maxLength={PHOTO_CAPTION_MAX}
          placeholder="mis. Armature selesai"
          aria-invalid={!!errors.caption}
          {...form.register("caption")}
        />
        <FieldError message={errors.caption?.message} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="photo-taken-at">Tanggal (opsional)</Label>
        <Input
          id="photo-taken-at"
          type="date"
          aria-invalid={!!errors.takenAt}
          {...form.register("takenAt")}
        />
        <FieldError message={errors.takenAt?.message} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan foto"}
        </Button>
      </div>
    </form>
  );
}
