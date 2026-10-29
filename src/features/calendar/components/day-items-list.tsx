"use client";

import type { DayItem } from "../day-items";
import { PostChip } from "./post-chip";
import { SlotBox } from "./slot-box";

/** Daftar item satu hari (post + slot kosong). `layout` membuat id drop unik per tata letak. */
export function DayItemsList({
  items,
  layout,
  droppable = true,
  compact = false,
  emptyText,
}: {
  items: DayItem[];
  layout: string;
  droppable?: boolean;
  compact?: boolean;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return emptyText ? <p className="text-xs text-muted-foreground">{emptyText}</p> : null;
  }
  return (
    <ul className={compact ? "grid gap-0.5" : "grid gap-1.5"}>
      {items.map((item) => (
        <li key={item.kind === "post" ? item.post.id : item.slot.key} className="min-w-0">
          {item.kind === "post" ? (
            <PostChip post={item.post} time={item.time} compact={compact} />
          ) : (
            <SlotBox
              slot={item.slot}
              dropId={`${layout}:${item.slot.key}`}
              droppable={droppable}
              compact={compact}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
