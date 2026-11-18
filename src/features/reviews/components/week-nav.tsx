import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wibToUtc } from "@/lib/date";
import { routes } from "@/lib/routes";
import { weekRangeLabel, type ReviewWeekNav } from "../week";

/** Pindah minggu (tidak melewati minggu berjalan) + tautan ke minggu yang perlu di-review. */
export function WeekNav({ nav }: { nav: ReviewWeekNav }) {
  const prevLabel = weekRangeLabel(wibToUtc(nav.prev), { short: true });
  const nextLabel = nav.next ? weekRangeLabel(wibToUtc(nav.next), { short: true }) : null;
  return (
    <nav aria-label="Pilih minggu" className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={routes.studio.reviewWeek(nav.prev)} aria-label={`Minggu sebelumnya, ${prevLabel}`}>
          <ChevronLeft />
          Sebelumnya
        </Link>
      </Button>
      {nav.next ? (
        <Button asChild variant="outline" size="sm">
          <Link href={routes.studio.reviewWeek(nav.next)} aria-label={`Minggu berikutnya, ${nextLabel}`}>
            Berikutnya
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled aria-label="Minggu berikutnya belum dimulai">
          Berikutnya
          <ChevronRight />
        </Button>
      )}
      {!nav.isDue && (
        <Button asChild variant="ghost" size="sm">
          <Link href={routes.studio.reviewWeek(nav.due)}>
            <CalendarCheck />
            Minggu yang perlu di-review
          </Link>
        </Button>
      )}
    </nav>
  );
}
