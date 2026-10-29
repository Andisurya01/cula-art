"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Frame, Link2 } from "lucide-react";
import { toast } from "sonner";
import { createArtworkFromProject } from "@/features/artworks/actions";
import { MAX_ARTWORK_IMAGES } from "@/features/artworks/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { artworkPhotoIds, isUploadedPhoto } from "../photo";
import type { GalleryPhoto } from "./photo-gallery";
import { ProgressPhotoImage } from "./progress-photo-image";

/**
 * Jadikan Karya: buat karya Draft dari proyek (judul, medium, tahun, proyek asal) dan salin foto
 * progres unggahan yang dipilih sebagai foto proses, lalu buka form karya.
 */
export function CreateArtworkDialog({
  projectId,
  photos,
  artworkCount,
}: {
  projectId: string;
  /** Foto progres proyek (urutan tampilan: terbaru dulu). */
  photos: GalleryPhoto[];
  artworkCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const uploaded = photos.filter(isUploadedPhoto);
  const externalCount = photos.length - uploaded.length;
  const selectableIds = uploaded.slice(0, MAX_ARTWORK_IMAGES).map((p) => p.id);
  const allSelected =
    selectableIds.length > 0 && selected.size >= selectableIds.length;

  function onOpenChange(next: boolean) {
    if (!next && pending) return;
    setOpen(next);
    if (next) setSelected(new Set());
  }

  function toggle(id: string, checked: boolean) {
    if (checked && !selected.has(id) && selected.size >= MAX_ARTWORK_IMAGES) {
      toast.error(`Maksimal ${MAX_ARTWORK_IMAGES} foto per karya`);
      return;
    }
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function onCreate() {
    const photoIds = artworkPhotoIds(photos, selected);
    startTransition(async () => {
      const result = await callAction(() => createArtworkFromProject({ projectId, photoIds }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Karya Draft dibuat. Lengkapi datanya lalu terbitkan.");
      router.push(routes.studio.artwork(result.data.id));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Frame />
          Jadikan Karya
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Jadikan Karya</DialogTitle>
          <DialogDescription>
            Membuat karya Draft dengan judul, medium, dan tahun dari proyek ini. Setelah itu kamu
            diarahkan ke form karya untuk menambah foto karya jadi, ukuran, dan cerita.
          </DialogDescription>
        </DialogHeader>

        {artworkCount > 0 && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Proyek ini sudah punya {artworkCount} karya. Karya baru dibuat terpisah.
          </p>
        )}

        {photos.length > 0 ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Salin foto progres sebagai foto proses</p>
              {uploaded.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(selectableIds))}
                >
                  {allSelected
                    ? "Kosongkan"
                    : uploaded.length > MAX_ARTWORK_IMAGES
                      ? `Pilih ${MAX_ARTWORK_IMAGES} terbaru`
                      : "Pilih semua"}
                </Button>
              )}
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <PhotoOption
                  key={photo.id}
                  photo={photo}
                  checked={selected.has(photo.id)}
                  disabled={pending}
                  onCheckedChange={(checked) => toggle(photo.id, checked)}
                />
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size} foto dipilih. ` : "Opsional. "}
              {externalCount > 0 &&
                `${externalCount} foto dari tautan URL tidak bisa disalin; Galeri hanya menampilkan foto unggahan.`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Proyek ini belum punya foto progres. Foto karya bisa diunggah di form karya.
          </p>
        )}

        <DialogFooter>
          <Button type="button" onClick={onCreate} disabled={pending}>
            {pending ? "Membuat karya…" : "Buat karya Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PhotoOption({
  photo,
  checked,
  disabled,
  onCheckedChange,
}: {
  photo: GalleryPhoto;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const uploaded = isUploadedPhoto(photo);
  const id = `artwork-photo-${photo.id}`;
  const label = photo.caption ?? "Foto progres";

  return (
    <li>
      <label
        htmlFor={id}
        title={uploaded ? label : "Foto dari tautan URL tidak bisa disalin ke karya"}
        className={cn(
          "relative block aspect-square overflow-hidden rounded-md border bg-muted",
          uploaded ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          checked && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        )}
      >
        <ProgressPhotoImage
          photo={photo}
          alt={label}
          sizes="(min-width: 640px) 120px, 30vw"
        />
        <span className="absolute top-1 left-1 rounded-[5px] bg-background/90 p-0.5 shadow-sm">
          <Checkbox
            id={id}
            checked={checked}
            disabled={disabled || !uploaded}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            aria-label={uploaded ? `Salin ${label}` : `${label} (tautan URL, tidak bisa disalin)`}
          />
        </span>
        {!uploaded && (
          <span className="absolute right-1 bottom-1 inline-flex items-center gap-0.5 rounded bg-background/90 px-1 text-[10px] font-medium">
            <Link2 className="size-3" aria-hidden />
            URL
          </span>
        )}
      </label>
    </li>
  );
}
