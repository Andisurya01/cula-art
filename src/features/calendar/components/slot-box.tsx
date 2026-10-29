"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { CalendarSlot, SlotUrgency } from "../slots";

export type SlotDropData = { slot: CalendarSlot };

const URGENCY_CLASS: Record<SlotUrgency, string> = {
  none: "border-muted-foreground/30 text-muted-foreground",
  soon: "border-amber-500/70 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  overdue: "border-destructive/60 bg-destructive/5 text-destructive",
};

const URGENCY_TEXT: Record<SlotUrgency, string> = {
  none: "Slot kosong",
  soon: "Slot kosong, segera",
  overdue: "Slot terlewat",
};

/**
 * Slot posting kosong (kotak putus-putus). Bisa jadi target drop dari panel Siap Posting,
 * kecuali sudah lewat. `dropId` harus unik per tata letak (grid/daftar dirender bersamaan).
 */
export function SlotBox({
  slot,
  dropId,
  droppable = true,
  compact = false,
}: {
  slot: CalendarSlot;
  dropId: string;
  droppable?: boolean;
  compact?: boolean;
}) {
  const disabled = !droppable || slot.urgency === "overdue";
  const { setNodeRef, isOver, active } = useDroppable({
    id: dropId,
    data: { slot } satisfies SlotDropData,
    disabled,
  });
  const time = slot.time.replace(":", ".");

  return (
    <div
      ref={setNodeRef}
      title={`${time} WIB · ${URGENCY_TEXT[slot.urgency]}`}
      className={cn(
        "rounded-md border border-dashed transition-colors",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1.5 text-xs",
        URGENCY_CLASS[slot.urgency],
        !disabled && active && "border-primary/60",
        isOver && "border-solid border-primary bg-primary/10 text-primary",
      )}
    >
      <span className="tabular-nums">{time}</span>{" "}
      <span className={cn(compact && "sr-only")}>· {isOver ? "Lepas di sini" : URGENCY_TEXT[slot.urgency]}</span>
    </div>
  );
}
