import Link from "next/link";
import { AlarmClock, CalendarClock, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PillarBadge } from "@/components/pillar-badge";
import { daysSince, formatWib, isStale } from "@/lib/date";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import { cardPlatforms, getCardSchedule, type PipelineCard } from "../board";
import { PlatformBadge } from "./platform-badge";

/**
 * Isi kartu konten (dipakai di kanban desktop, tab HP, dan drag overlay). Garis pendek di kiri =
 * warna pilar (data pengguna). `tone`: `muted` untuk kartu di dalam kolom kanban (kartu bertingkat
 * abu di kartu putih), `card` untuk kartu yang langsung di latar halaman (HP).
 */
export function ContentCardBody({
  card,
  now,
  linked = true,
  action,
  tone = "card",
}: {
  card: PipelineCard;
  now: Date;
  /** Judul menjadi stretched link ke detail. */
  linked?: boolean;
  /** Slot di kanan atas (mis. menu "Pindah ke…"); dirender di atas stretched link. */
  action?: React.ReactNode;
  tone?: "card" | "muted";
}) {
  const schedule = getCardSchedule(card.stage, card.posts, now);
  const platforms = cardPlatforms(card.posts);
  const stale = card.stage !== "POSTED" && isStale(card.stageChangedAt, now);

  return (
    <div
      className={cn(
        "relative rounded-card-nested py-3.5 pr-3.5 pl-5",
        tone === "muted" ? "bg-muted text-foreground" : "bg-card text-card-foreground ring-1 ring-border/70",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-4 left-2 w-1 rounded-full"
        style={{ backgroundColor: card.pillar.color }}
      />
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-medium">
          {linked ? (
            <Link
              href={routes.studio.content(card.id)}
              draggable={false}
              className="line-clamp-3 outline-hidden after:absolute after:inset-0 after:rounded-card-nested focus-visible:after:ring-3 focus-visible:after:ring-ring"
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
          {card.seriesPart && <Badge variant="outline" className="border-foreground/20">Part {card.seriesPart}</Badge>}
          {stale && (
            <Badge variant="warning">
              <AlarmClock />
              Macet {daysSince(card.stageChangedAt, now)} hari
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
