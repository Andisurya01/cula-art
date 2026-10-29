// Fungsi murni untuk tampilan & rentang kalender (search params `?view=week|month&date=yyyy-MM-dd`).

import {
  addWibDays,
  formatWib,
  toWibDateString,
  wibMonthGrid,
  wibToUtc,
  wibWeekDays,
} from "@/lib/date";
import { routes } from "@/lib/routes";

export const CALENDAR_VIEWS = ["week", "month"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export type CalendarParams = { view: CalendarView; date: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Tanggal `yyyy-MM-dd` yang benar-benar ada (menolak mis. 2026-02-31). */
export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const at = wibToUtc(value, "12:00");
  return !Number.isNaN(at.getTime()) && toWibDateString(at) === value;
}

/** Baca search params; default tampilan minggu dan tanggal hari ini (WIB). */
export function parseCalendarParams(
  params: { view?: string | string[]; date?: string | string[] },
  now: Date,
): CalendarParams {
  const view = first(params.view) === "month" ? "month" : "week";
  const rawDate = first(params.date);
  const date = rawDate && isValidDateString(rawDate) ? rawDate : toWibDateString(now);
  return { view, date };
}

/** Hari-hari (awal hari WIB, sebagai instant UTC) yang ditampilkan. */
export function calendarDays({ view, date }: CalendarParams): Date[] {
  const anchor = wibToUtc(date, "12:00");
  return view === "week" ? wibWeekDays(anchor) : wibMonthGrid(anchor);
}

/** Rentang query `[start, end)` dari daftar hari. */
export function daysRange(days: Date[]): { start: Date; end: Date } {
  return { start: days[0], end: addWibDays(days[days.length - 1], 1) };
}

/** Tanggal acuan sebelumnya/berikutnya: ±7 hari, atau tanggal 1 bulan sebelumnya/berikutnya. */
export function shiftDate({ view, date }: CalendarParams, direction: -1 | 1): string {
  if (view === "week") {
    return toWibDateString(addWibDays(wibToUtc(date, "12:00"), 7 * direction));
  }
  const [year, month] = date.split("-").map(Number);
  const index = year * 12 + (month - 1) + direction;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

/** Judul rentang, mis. "26 Okt – 1 Nov 2026" atau "Oktober 2026". */
export function rangeLabel(params: CalendarParams): string {
  const anchor = wibToUtc(params.date, "12:00");
  if (params.view === "month") return formatWib(anchor, "MMMM yyyy");
  const days = wibWeekDays(anchor);
  const start = days[0];
  const end = days[6];
  const sameYear = formatWib(start, "yyyy") === formatWib(end, "yyyy");
  return `${formatWib(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${formatWib(end, "d MMM yyyy")}`;
}

/** URL halaman kalender. `date` kosong = hari ini. */
export function calendarHref(view: CalendarView, date?: string): string {
  const search = new URLSearchParams({ view });
  if (date) search.set("date", date);
  return `${routes.studio.calendar}?${search.toString()}`;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
