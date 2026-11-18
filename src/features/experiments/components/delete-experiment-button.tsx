"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
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
import { deleteExperiment } from "../actions";

/** Hapus eksperimen dengan konfirmasi. Post dan metriknya tidak ikut terhapus. */
export function DeleteExperimentButton({
  experimentId,
  hypothesis,
  postCount,
}: {
  experimentId: string;
  hypothesis: string;
  postCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteExperiment({ id: experimentId }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Eksperimen dihapus");
      setOpen(false);
      router.push(routes.studio.experiments);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 />
          Hapus
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus eksperimen ini?</AlertDialogTitle>
          <AlertDialogDescription className="[overflow-wrap:anywhere]">
            “{hypothesis}” beserta kesimpulan dan catatannya akan dihapus permanen.
            {postCount > 0 && ` ${postCount} post dilepas dari eksperimen, tetapi post dan metriknya tetap ada.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Menghapus…" : "Hapus eksperimen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
