"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatWib } from "@/lib/date";
import { callAction } from "@/lib/action-client";
import { deleteProjectPhoto } from "../actions";
import { isUploadedPhoto, photoSrc } from "../photo";
import { ProgressPhotoImage } from "./progress-photo-image";

export type GalleryPhoto = {
  id: string;
  url: string | null;
  storageKey: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  takenAt: Date | null;
  createdAt: Date;
};

/** Grid 2 kolom di HP, 3-4 di layar lebar (perkiraan lebar untuk `sizes`). */
const GRID_SIZES = "(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 50vw";

/** Galeri foto progres (terbaru dulu). Grid 2 kolom di HP, 3-4 di layar lebar. */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <PhotoItem key={photo.id} photo={photo} />
      ))}
    </ul>
  );
}

function PhotoItem({ photo }: { photo: GalleryPhoto }) {
  const uploaded = isUploadedPhoto(photo);
  return (
    <li className="group relative overflow-hidden rounded-lg border bg-card">
      <a href={photoSrc(photo)} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-square bg-muted">
          <ProgressPhotoImage photo={photo} alt={photo.caption ?? "Foto progres"} sizes={GRID_SIZES} />
        </div>
      </a>
      <div className="grid gap-0.5 p-2 pr-9">
        {photo.caption && <p className="line-clamp-2 text-xs">{photo.caption}</p>}
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {!uploaded && (
            <span className="inline-flex items-center gap-0.5" title="Foto dari tautan URL">
              <Link2 className="size-3" aria-hidden />
              URL
              {photo.takenAt && <span aria-hidden> · </span>}
            </span>
          )}
          {photo.takenAt && formatWib(photo.takenAt, "d MMM yyyy")}
        </p>
      </div>
      <DeletePhotoButton photoId={photo.id} uploaded={uploaded} />
    </li>
  );
}

function DeletePhotoButton({ photoId, uploaded }: { photoId: string; uploaded: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteProjectPhoto(photoId));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Foto dihapus");
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Hapus foto"
          disabled={pending}
          className="absolute right-1 bottom-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus foto ini?</AlertDialogTitle>
          <AlertDialogDescription>
            {uploaded
              ? "Foto dan filenya dihapus permanen dari proyek. Karya yang sudah dibuat dari proyek ini tidak terpengaruh."
              : "Foto dihapus dari galeri proyek. Gambar di tautan asalnya tidak terpengaruh."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
