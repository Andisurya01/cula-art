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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/action-client";
import { formatWib } from "@/lib/date";
import { deleteAccountSnapshot } from "@/features/metrics/actions";
import { formatCount } from "@/features/metrics/format";
import type { FollowerSnapshotRow } from "@/features/metrics/queries";

type Snapshot = Pick<FollowerSnapshotRow, "id" | "date" | "followers">;

const dateLabel = (date: Date) => formatWib(date, "d MMM yyyy");

/** Riwayat snapshot followers satu platform di rentang aktif, terbaru dulu, dengan tombol hapus. */
export function FollowerHistory({
  snapshots,
  platformLabel,
}: {
  snapshots: readonly Snapshot[];
  platformLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Terpisah dari `open`, supaya teks dialog tidak hilang selama animasi tutup.
  const [target, setTarget] = useState<Snapshot | null>(null);

  function onConfirm() {
    if (!target) return;
    const { id } = target;
    startTransition(async () => {
      const result = await callAction(() => deleteAccountSnapshot({ id }));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Snapshot followers dihapus");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">
          Riwayat snapshot ({formatCount(snapshots.length)})
        </summary>
        <ul className="mt-2 divide-y">
          {[...snapshots].reverse().map((snapshot) => (
            <li key={snapshot.id} className="flex items-center justify-between gap-3 py-1">
              <span>{dateLabel(snapshot.date)}</span>
              <span className="ml-auto tabular-nums">{formatCount(snapshot.followers)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Hapus snapshot ${dateLabel(snapshot.date)}`}
                onClick={() => {
                  setTarget(snapshot);
                  setOpen(true);
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </details>

      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus snapshot followers?</AlertDialogTitle>
            <AlertDialogDescription>
              {target &&
                `Snapshot ${platformLabel} ${dateLabel(target.date)} (${formatCount(target.followers)} followers) akan dihapus permanen. Grafik dan followers bertambah ikut berubah.`}
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
    </>
  );
}
