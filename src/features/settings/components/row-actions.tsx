"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Tombol naik/turun + menu (ubah, nonaktifkan/aktifkan, hapus dengan konfirmasi). */
export function RowActions({
  itemName,
  editLabel = "Ubah",
  isActive,
  usageCount,
  isFirst,
  isLast,
  disabled,
  onMove,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  itemName: string;
  editLabel?: string;
  isActive: boolean;
  usageCount: number;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onMove: (direction: "up" | "down") => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inUse = usageCount > 0;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Naikkan ${itemName}`}
        disabled={disabled || isFirst}
        onClick={() => onMove("up")}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Turunkan ${itemName}`}
        disabled={disabled || isLast}
        onClick={() => onMove("down")}
      >
        <ArrowDown />
      </Button>

      {/* modal={false} supaya dialog yang dibuka dari menu tidak mengunci pointer-events. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Aksi untuk ${itemName}`}
            disabled={disabled}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            {editLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleActive}>
            {isActive ? <EyeOff /> : <Eye />}
            {isActive ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={inUse}
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 />
            {inUse ? "Hapus (sudah dipakai)" : "Hapus"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus &quot;{itemName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Data ini belum dipakai sehingga aman dihapus. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
