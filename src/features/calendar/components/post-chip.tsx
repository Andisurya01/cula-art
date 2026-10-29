import Link from "next/link";
import { CircleCheck } from "lucide-react";
import type { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import type { CalendarPost } from "../schedule";

const PLATFORM_SHORT: Record<Platform, string> = { TIKTOK: "TT", INSTAGRAM: "IG" };

/** Post di kalender: jam WIB, platform, judul; garis kiri warna pilar. Klik → detail konten. */
export function PostChip({
  post,
  time,
  compact = false,
}: {
  post: CalendarPost;
  time: string;
  compact?: boolean;
}) {
  const optimistic = post.id.startsWith("optimistic-");
  const label = `${time.replace(":", ".")} ${PLATFORM_LABELS[post.platform]} · ${post.title}${
    post.posted ? " (sudah diposting)" : ""
  } · ${post.pillarName}`;

  return (
    <Link
      href={routes.studio.content(post.contentId)}
      title={label}
      aria-label={label}
      className={cn(
        "block min-w-0 rounded-md border border-l-4 bg-card transition-colors hover:bg-muted",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1.5 text-xs",
        optimistic && "animate-pulse opacity-60",
      )}
      style={{ borderLeftColor: post.pillarColor }}
    >
      <span className="flex items-center gap-1 text-muted-foreground">
        <span className="tabular-nums">{time.replace(":", ".")}</span>
        <span className="rounded bg-muted px-1 text-[10px] font-medium text-foreground">
          {PLATFORM_SHORT[post.platform]}
        </span>
        {post.posted && <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
      </span>
      <span className={cn("block truncate font-medium", post.posted && "text-muted-foreground")}>
        {post.title}
      </span>
    </Link>
  );
}
