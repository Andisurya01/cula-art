import Link from "next/link";
import { AlarmClock, CalendarClock, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PillarBadge } from "@/components/pillar-badge";
import { daysSince, formatWib, isStale } from "@/lib/date";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { cardPlatforms, getCardSchedule, type PipelineCard } from "../board";
import { PlatformBadge } from "./platform-badge";

/** Isi kartu konten (dipakai di kanban desktop, tab HP, dan drag overlay). */
export function ContentCardBody({
  card,
  now,
  linked = true,
  action,
}: {
  card: PipelineCard;
  now: Date;
  /** Judul menjadi stretched link ke detail. */
  linked?: boolean;
  /** Slot di kanan atas (mis. menu "Pindah ke…"); dirender di atas stretched link. */
  action?: React.ReactNode;
}) {
  const schedule = getCardSchedule(card.stage, card.posts, now);
  const platforms = cardPlatforms(card.posts);
  const stale = card.stage !== "POSTED" && isStale(card.stageChangedAt, now);

  return (
    <div
      className="relative rounded-lg border border-l-4 bg-card p-3 text-card-foreground shadow-xs"
      style={{ borderLeftColor: card.pillar.color }}
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-medium">
          {linked ? (
            <Link
              href={routes.studio.content(card.id)}
              draggable={false}
              className="line-clamp-3 outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {card.title}
            </Link>
          ) : (
            <span className="line-clamp-3">{card.title}</span>
          )}
        </h3>
        {action && <div className="relative z-10 -mt-1 -mr-1 shrink-0">{action}</div>}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <PillarBadge name={card.pillar.name} color={card.pillar.color} className="max-w-full" />
        {card.format && <span className="truncate">· {card.format.name}</span>}
      </div>

      {schedule && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs",
            schedule.kind === "overdue" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {schedule.kind === "posted" ? (
            <CircleCheck className="size-3.5" />
          ) : (
            <CalendarClock className="size-3.5" />
          )}
          {schedule.kind === "posted" && "Diposting "}
          {schedule.kind === "overdue" && "Lewat jadwal "}
          {formatWib(schedule.at, "EEE, d MMM HH.mm")}
        </p>
      )}

      {(platforms.length > 0 || card.seriesPart || stale) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
          {card.seriesPart && <Badge variant="secondary">Part {card.seriesPart}</Badge>}
          {stale && (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <AlarmClock />
              Macet {daysSince(card.stageChangedAt, now)} hari
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
