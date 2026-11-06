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
import { deleteMetricSnapshot } from "../actions";

export function DeleteSnapshotButton({
  snapshotId,
  kindLabel,
  postTitle,
}: {
  snapshotId: string;
  /** "H+1" atau "H+7". */
  kindLabel: string;
  postTitle: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteMetricSnapshot({ id: snapshotId }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Snapshot ${kindLabel} dihapus`);
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} aria-label={`Hapus snapshot ${kindLabel}`}>
          <Trash2 />
          Hapus
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus snapshot {kindLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            Angka {kindLabel} untuk &quot;{postTitle}&quot; dihapus. Status metrik dan skor post ini dihitung ulang,
            begitu juga skor relatif post berikutnya di platform yang sama. Tindakan ini tidak bisa dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={pending}>
            Hapus snapshot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
