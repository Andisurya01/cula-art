"use client";

import { useState } from "react";
import { DAY_SHORT_LABELS, formatWib, toWibDateString, type IsoDay } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DayItem } from "../day-items";
import type { SlotUrgency } from "../slots";
import { DayItemsList } from "./day-items-list";
import { DayNumber } from "./day-number";

const ISO_DAYS: IsoDay[] = [1, 2, 3, 4, 5, 6, 7];

// `none` mengikuti warna teks sel, supaya tetap terlihat di sel terpilih (pil primer).
const SLOT_DOT_CLASS: Record<SlotUrgency, string> = {
  none: "border-current/50",
  soon: "border-warning",
  overdue: "border-destructive",
};

/** Tampilan bulan: grid berisi chip di layar ≥ md; grid ringkas bertitik + daftar hari terpilih di HP. */
export function MonthView({
  days,
  items,
  todayKey,
  anchorKey,
}: {
  days: Date[];
  items: Map<string, DayItem[]>;
  todayKey: string;
  /** Tanggal acuan `yyyy-MM-dd`; bulannya adalah bulan yang ditampilkan. */
  anchorKey: string;
}) {
  const monthKey = anchorKey.slice(0, 7);
  const keys = days.map(toWibDateString);
  const fallback = todayKey.startsWith(monthKey) ? todayKey : anchorKey;
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked && keys.includes(picked) ? picked : fallback;
  const selectedDay = days[keys.indexOf(selected)];

  return (
    <>
      {/* HP: grid ringkas + daftar hari terpilih */}
      <div className="md:hidden">
        <WeekdayHeader />
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const key = keys[i];
            const dayItems = items.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={key === selected}
                aria-label={`${formatWib(day, "EEEE, d MMMM")}, ${dayItems.length} item`}
                onClick={() => setPicked(key)}
                className={cn(
                  "flex h-12 flex-col items-center justify-start gap-1 rounded-button pt-1.5 text-xs tabular-nums transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring",
                  !key.startsWith(monthKey) && "opacity-40",
                  key === todayKey && "font-semibold",
                  key === selected
                    ? "bg-primary text-primary-foreground"
                    : cn("hover:bg-muted", key === todayKey && "ring-1 ring-foreground/40"),
                )}
              >
                {formatWib(day, "d")}
                <DayDots items={dayItems} />
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <div className="mt-3 rounded-card-nested bg-background p-3">
            <p className="mb-2 text-sm font-medium">{formatWib(selectedDay, "EEEE, d MMMM")}</p>
            <DayItemsList
              items={items.get(selected) ?? []}
              layout="month-mobile"
              droppable={false}
              emptyText="Tidak ada jadwal"
            />
          </div>
        )}
      </div>

      {/* Desktop: grid dengan chip */}
      <div className="hidden md:block">
        <WeekdayHeader />
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const key = keys[i];
            return (
              <section
                key={key}
                aria-label={formatWib(day, "EEEE, d MMMM")}
                className={cn(
                  "flex min-h-28 min-w-0 flex-col gap-1 rounded-card-nested bg-background p-1.5",
                  !key.startsWith(monthKey) && "opacity-50",
                )}
              >
                <p className="flex justify-end text-xs text-muted-foreground">
                  <DayNumber today={key === todayKey}>{formatWib(day, "d")}</DayNumber>
                </p>
                <DayItemsList items={items.get(key) ?? []} layout="month-grid" compact />
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

function WeekdayHeader() {
  return (
    <div className="type-label mb-2 grid grid-cols-7 gap-1 text-center text-muted-foreground">
      {ISO_DAYS.map((d) => (
        <span key={d}>{DAY_SHORT_LABELS[d]}</span>
      ))}
    </div>
  );
}

/** Titik warna pilar untuk post, lingkaran kosong (warna urgensi) untuk slot kosong (maks. 4). */
function DayDots({ items }: { items: DayItem[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 4);
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {shown.map((item) =>
        item.kind === "post" ? (
          <span
            key={item.post.id}
            className="size-2 rounded-full"
            style={{ backgroundColor: item.post.pillarColor }}
          />
        ) : (
          <span
            key={item.slot.key}
            className={cn("size-2 rounded-full border-[1.5px]", SLOT_DOT_CLASS[item.slot.urgency])}
          />
        ),
      )}
    </span>
  );
}
