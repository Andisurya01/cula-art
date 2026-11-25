import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calendarHref, rangeLabel, shiftDate, type CalendarParams, type CalendarView } from "../range";

const VIEW_LABELS: Record<CalendarView, string> = { week: "Minggu", month: "Bulan" };

/** Judul rentang, navigasi Sebelumnya / Hari ini / Berikutnya, dan pilihan tampilan. */
export function CalendarToolbar({ params }: { params: CalendarParams }) {
  const { view, date } = params;
  const unit = view === "week" ? "minggu" : "bulan";

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon">
          <Link href={calendarHref(view, shiftDate(params, -1))} aria-label={`${unit} sebelumnya`}>
            <ChevronLeft />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={calendarHref(view)}>Hari ini</Link>
        </Button>
        <Button asChild variant="outline" size="icon">
          <Link href={calendarHref(view, shiftDate(params, 1))} aria-label={`${unit} berikutnya`}>
            <ChevronRight />
          </Link>
        </Button>
        <h2 className="ml-2 text-h5 capitalize">{rangeLabel(params)}</h2>
      </div>

      {/* Lintasan abu + pil aktif putih (sama dengan TabsList default). */}
      <nav aria-label="Tampilan kalender" className="inline-flex h-10 items-center rounded-button bg-muted p-1">
        {(["week", "month"] as const).map((v) => (
          <Link
            key={v}
            href={calendarHref(v, date)}
            aria-current={v === view ? "page" : undefined}
            className={cn(
              "inline-flex h-full items-center rounded-button px-4 text-sm font-medium transition-colors outline-hidden focus-visible:ring-3 focus-visible:ring-ring",
              v === view
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {VIEW_LABELS[v]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Keterangan warna slot kosong. */
export function CalendarLegend() {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <LegendItem className="border-muted-foreground/40">Slot kosong</LegendItem>
      <LegendItem className="border-warning">≤ 2 hari lagi</LegendItem>
      <LegendItem className="border-destructive">Terlewat</LegendItem>
    </div>
  );
}

function LegendItem({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-4 rounded-sm border border-dashed", className)} />
      {children}
    </span>
  );
}
