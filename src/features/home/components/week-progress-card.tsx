import Link from "next/link";
import { CalendarCheck, CalendarDays, CheckCircle2 } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { weekProgressNote, type WeekItem, type WeekProgress } from "../derive";

/**
 * Progres minggu ini (per konten) terhadap target: kartu bento biru dengan angka besar. Daftar konten
 * minggu ini memakai baris putih (permukaan kartu) supaya warna status dan pilar tetap terbaca.
 * Streak (D9) ada di kartu sendiri (`StreakCard`).
 */
export function WeekProgressCard({
  target,
  progress,
  items,
  className,
}: {
  target: number;
  progress: WeekProgress;
  items: readonly WeekItem[];
  className?: string;
}) {
  return (
    <Card variant="blue" className={cn("justify-between", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-4" aria-hidden />
          Post minggu ini
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-heading text-h1">{progress.posted}</span>
            <span className="text-body">dari {target} post tayang</span>
          </p>
          {/* Tayang = penuh, terjadwal = pudar. Angkanya tertulis di bawah, jadi bilah ini hanya hiasan. */}
          <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-current/20">
            <div className="h-full bg-current" style={{ width: `${progress.postedRatio * 100}%` }} />
            <div className="h-full bg-current/50" style={{ width: `${progress.scheduledRatio * 100}%` }} />
          </div>
          <p className="text-sm">
            {progress.scheduled} terjadwal · {weekProgressNote(progress, target)}
          </p>
        </div>
        {items.length > 0 ? (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li key={item.contentId}>
                <Link
                  href={routes.studio.content(item.contentId)}
                  className="flex items-center gap-3 rounded-card-nested bg-card px-4 py-3 text-sm text-card-foreground transition-colors outline-hidden hover:bg-muted focus-visible:ring-3 focus-visible:ring-bento-blue-foreground/60"
                >
                  {item.posted ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                  ) : (
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="sr-only">{item.posted ? "Tayang:" : "Terjadwal:"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                      <PillarBadge name={item.pillar.name} color={item.pillar.color} />
                      {item.platforms.map((p) => PLATFORM_LABELS[p]).join(" + ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-muted-foreground">{formatWib(item.at, "EEE HH.mm")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Button asChild variant="outline" size="sm" className="border-transparent">
            <Link href={routes.studio.calendar}>Jadwalkan di Kalender</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
