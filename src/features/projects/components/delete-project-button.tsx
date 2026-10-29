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
import { deleteProject } from "../actions";

export function DeleteProjectButton({
  projectId,
  title,
  contentCount,
  photoCount,
  artworkCount = 0,
}: {
  projectId: string;
  title: string;
  contentCount: number;
  photoCount: number;
  artworkCount?: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteProject(projectId));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Proyek dihapus");
      router.push(routes.studio.projects);
    });
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
          <AlertDialogTitle>Hapus proyek &quot;{title}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            {photoCount > 0 ? `${photoCount} foto progres (beserta file unggahannya) ikut terhapus. ` : ""}
            {contentCount > 0
              ? `${contentCount} konten tetap ada di Pipeline, tetapi tidak lagi terhubung ke proyek ini. `
              : ""}
            {artworkCount > 0
              ? `${artworkCount} karya tetap ada di menu Karya (beserta fotonya), tanpa proyek asal. `
              : ""}
            Tindakan ini tidak bisa dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={pending}>
            Hapus proyek
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
