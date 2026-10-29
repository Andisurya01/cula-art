"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteIdea } from "../actions";
import { callAction } from "@/lib/action-client";

/** Konfirmasi hapus permanen. Hanya ditawarkan untuk ide yang belum jadi konten. */
export function DeleteIdeaDialog({
  ideaId,
  title,
  open,
  onOpenChange,
}: {
  ideaId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteIdea({ id: ideaId }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ide dihapus");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus ide ini?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” akan dihapus permanen. Kalau mungkin dipakai lagi, pilih Arsipkan saja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Menghapus…" : "Hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
