"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { callAction } from "@/lib/action-client";
import { routes } from "@/lib/routes";
import { deleteArtwork } from "../actions";

/** Hapus karya + semua file fotonya. Karya Terjual tidak bisa dihapus (tombol nonaktif + alasan). */
export function DeleteArtworkButton({
  artworkId,
  title,
  photoCount,
  blockedReason,
}: {
  artworkId: string;
  title: string;
  photoCount: number;
  blockedReason: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteArtwork(artworkId));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Karya dihapus");
      router.push(routes.studio.artworks);
    });
  }

  if (blockedReason) {
    return (
      <Button variant="outline" size="sm" disabled title={blockedReason} aria-label={`Hapus: ${blockedReason}`}>
        <Trash2 />
        Hapus
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          <Trash2 />
          Hapus
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus karya &quot;{title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            {photoCount > 0 ? `${photoCount} foto beserta filenya ikut terhapus. ` : ""}
            Tautan Galeri karya ini (termasuk slug lama) tidak bisa dibuka lagi. Jika hanya ingin
            menyembunyikannya, pakai Arsipkan. Tindakan ini tidak bisa dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={pending}>
            Hapus karya
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
