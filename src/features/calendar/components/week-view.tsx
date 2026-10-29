"use client";

import { DAY_LABELS, DAY_SHORT_LABELS, formatWib, toWibDateString, wibIsoDay } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DayItem } from "../day-items";
import { DayItemsList } from "./day-items-list";

/** Tampilan minggu: grid 7 kolom di layar lebar (≥ lg), daftar vertikal per hari di bawahnya. */
export function WeekView({
  days,
  items,
  todayKey,
}: {
  days: Date[];
  items: Map<string, DayItem[]>;
  todayKey: string;
}) {
  return (
    <>
      <ol className="grid gap-2 lg:hidden">
        {days.map((day) => {
          const key = toWibDateString(day);
          const isToday = key === todayKey;
          return (
            <li
              key={key}
              className={cn("rounded-xl border p-3", isToday && "border-primary/60 bg-primary/5")}
            >
              <p className="mb-2 flex items-baseline gap-2 text-sm font-medium">
                {DAY_LABELS[wibIsoDay(day)]}
                <span className="text-xs font-normal text-muted-foreground">
                  {formatWib(day, "d MMM")}
                </span>
                {isToday && <span className="text-xs font-normal text-primary">Hari ini</span>}
              </p>
              <DayItemsList items={items.get(key) ?? []} layout="week-list" emptyText="Tidak ada jadwal" />
            </li>
          );
        })}
      </ol>

      <div className="hidden grid-cols-7 gap-1.5 lg:grid">
        {days.map((day) => {
          const key = toWibDateString(day);
          const isToday = key === todayKey;
          return (
            <section
              key={key}
              aria-label={formatWib(day, "EEEE, d MMMM")}
              className={cn(
                "flex min-h-48 min-w-0 flex-col gap-2 rounded-xl border p-1.5",
                isToday && "border-primary/60 bg-primary/5",
              )}
            >
              <p className="px-0.5 text-center text-xs text-muted-foreground">
                {DAY_SHORT_LABELS[wibIsoDay(day)]}{" "}
                <span className={cn("font-semibold text-foreground", isToday && "text-primary")}>
                  {formatWib(day, "d")}
                </span>
              </p>
              <DayItemsList items={items.get(key) ?? []} layout="week-grid" />
            </section>
          );
        })}
      </div>
    </>
  );
}
