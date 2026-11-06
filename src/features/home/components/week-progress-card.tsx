import Link from "next/link";
import { CalendarDays, CheckCircle2, Flame } from "lucide-react";
import { PillarBadge } from "@/components/pillar-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWib } from "@/lib/date";
import { PLATFORM_LABELS } from "@/lib/labels";
import { routes } from "@/lib/routes";
import { weekProgressNote, type WeekItem, type WeekProgress } from "../derive";

/** Progres minggu ini (per konten) terhadap target + streak (D9). */
export function WeekProgressCard({
  target,
  progress,
  streak,
  items,
}: {
  target: number;
  progress: WeekProgress;
  streak: number;
  items: readonly WeekItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Post minggu ini</CardTitle>
        <CardAction>
          <Badge variant="secondary" title="Minggu berturut-turut dengan post tayang memenuhi target">
            <Flame />
            Streak {streak} minggu
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold">
          {progress.posted}
          <span className="text-base font-normal text-muted-foreground"> dari {target} post tayang</span>
        </p>
        {/* Tayang = penuh, terjadwal = pudar. Angkanya tertulis di bawah, jadi bilah ini hanya hiasan. */}
        <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${progress.postedRatio * 100}%` }} />
          <div className="h-full bg-primary/35" style={{ width: `${progress.scheduledRatio * 100}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {progress.scheduled} terjadwal · {weekProgressNote(progress, target)}
        </p>
        {items.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {items.map((item) => (
              <li key={item.contentId}>
                <Link
                  href={routes.studio.content(item.contentId)}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  {item.posted ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <PillarBadge name={item.pillar.name} color={item.pillar.color} />
                      {item.platforms.map((p) => PLATFORM_LABELS[p]).join(" + ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatWib(item.at, "EEE HH.mm")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={routes.studio.calendar}>Jadwalkan di Kalender</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
