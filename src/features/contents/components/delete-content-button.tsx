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
import { deleteContent } from "../actions";

/** Hapus konten dengan konfirmasi, lalu kembali ke /pipeline. */
export function DeleteContentButton({
  contentId,
  title,
  fromIdea,
}: {
  contentId: string;
  title: string;
  fromIdea: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onConfirm(event: React.MouseEvent) {
    event.preventDefault(); // tetap buka sampai selesai
    startTransition(async () => {
      const result = await callAction(() => deleteContent({ id: contentId }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Konten dihapus");
      router.push(routes.studio.pipeline);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 />
          Hapus
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus konten ini?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” beserta versi platform dan checklist-nya akan dihapus permanen.
            {fromIdea && " Ide asalnya dikembalikan ke status Baru di Bank Ide."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Menghapus…" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
