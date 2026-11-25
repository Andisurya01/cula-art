"use client";

import { Badge } from "@/components/ui/badge";
import { DAY_LABELS, DAY_SHORT_LABELS, formatWib, toWibDateString, wibIsoDay } from "@/lib/date";
import type { DayItem } from "../day-items";
import { DayItemsList } from "./day-items-list";
import { DayNumber } from "./day-number";

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
            <li key={key} className="rounded-card-nested bg-background p-3">
              <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                {DAY_LABELS[wibIsoDay(day)]}
                <span className="text-xs font-normal text-muted-foreground">
                  {formatWib(day, "d MMM")}
                </span>
                {isToday && <Badge className="h-5">Hari ini</Badge>}
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
              className="flex min-h-48 min-w-0 flex-col gap-2 rounded-card-nested bg-background p-1.5"
            >
              <p className="flex items-center justify-center gap-1 pt-1 text-xs text-muted-foreground">
                {DAY_SHORT_LABELS[wibIsoDay(day)]}
                <span className="font-semibold text-foreground">
                  <DayNumber today={isToday}>{formatWib(day, "d")}</DayNumber>
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
