"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAY_LABELS, type IsoDay } from "@/lib/date";
import { updatePostingSlots } from "../actions";
import { slotKey, timeSchema, type PostingSlot } from "../schema";
import { addSlot, removeSlot } from "../utils";
import { useRunAction } from "./use-run-action";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly IsoDay[];

/** Slot posting default (hari + jam WIB). Setiap perubahan langsung disimpan. */
export function PostingSlotsCard({ slots }: { slots: PostingSlot[] }) {
  const { pending, run } = useRunAction();
  const [day, setDay] = useState<IsoDay>(2);
  const [time, setTime] = useState("19:00");

  function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const parsedTime = timeSchema.safeParse(time);
    if (!parsedTime.success) {
      toast.error("Isi jam dengan format HH:mm");
      return;
    }
    const result = addSlot(slots, { day, time: parsedTime.data });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    run(() => updatePostingSlots(result.slots), { success: "Slot ditambahkan" });
  }

  function onRemove(slot: PostingSlot) {
    run(() => updatePostingSlots(removeSlot(slots, slot)), { success: "Slot dihapus" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slot posting</CardTitle>
        <CardDescription>
          Jam dalam WIB. Slot tampil sebagai kotak kosong di Kalender.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada slot. Kalender tidak akan menampilkan slot kosong.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <li
                key={slotKey(slot)}
                className="inline-flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-3 text-sm"
              >
                <span>
                  {DAY_LABELS[slot.day as IsoDay]}{" "}
                  <span className="tabular-nums text-muted-foreground">{slot.time}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded-full"
                  aria-label={`Hapus slot ${DAY_LABELS[slot.day as IsoDay]} ${slot.time}`}
                  disabled={pending}
                  onClick={() => onRemove(slot)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="slot-day" className="text-xs">
              Hari
            </Label>
            <Select value={String(day)} onValueChange={(v) => setDay(Number(v) as IsoDay)}>
              <SelectTrigger id="slot-day" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {DAY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="slot-time" className="text-xs">
              Jam (WIB)
            </Label>
            <Input
              id="slot-time"
              type="time"
              className="w-28"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            <Plus />
            Tambah slot
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
