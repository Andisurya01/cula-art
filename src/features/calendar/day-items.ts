// Gabungkan post dan slot kosong per tanggal WIB, diurutkan menurut jam (fungsi murni).

import { toWibDateString, toWibTimeString } from "@/lib/date";
import type { CalendarPost } from "./schedule";
import type { CalendarSlot } from "./slots";

export type DayItem =
  | { kind: "post"; time: string; post: CalendarPost }
  | { kind: "slot"; time: string; slot: CalendarSlot };

/** Map tanggal WIB → item (post + slot kosong), urut jam; post sebelum slot pada jam yang sama. */
export function itemsByDate(posts: CalendarPost[], slots: CalendarSlot[]): Map<string, DayItem[]> {
  const map = new Map<string, DayItem[]>();
  const push = (date: string, item: DayItem) => {
    const list = map.get(date);
    if (list) list.push(item);
    else map.set(date, [item]);
  };
  for (const post of posts) {
    push(toWibDateString(post.at), { kind: "post", time: toWibTimeString(post.at), post });
  }
  for (const slot of slots) {
    if (!slot.filled) push(slot.date, { kind: "slot", time: slot.time, slot });
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        a.time.localeCompare(b.time) ||
        (a.kind === b.kind ? 0 : a.kind === "post" ? -1 : 1) ||
        (a.kind === "post" && b.kind === "post"
          ? a.post.title.localeCompare(b.post.title) || a.post.platform.localeCompare(b.post.platform)
          : 0),
    );
  }
  return map;
}
