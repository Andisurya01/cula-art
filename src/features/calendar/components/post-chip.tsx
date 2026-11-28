import Link from "next/link";
import { CircleCheck } from "lucide-react";
import type { Platform } from "@prisma/client";
import { PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/routes";
import type { CalendarPost } from "../schedule";

const PLATFORM_SHORT: Record<Platform, string> = { TIKTOK: "TT", INSTAGRAM: "IG" };

/** Post di kalender: jam WIB, platform, judul; garis pendek di kiri = warna pilar. Klik → detail konten. */
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
        "flex min-w-0 gap-1.5 rounded-lg bg-card text-card-foreground ring-1 ring-border/70 transition-colors outline-hidden hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring",
        compact ? "px-1.5 py-0.5 text-caption" : "px-2 py-1.5 text-xs",
        // Belum dikonfirmasi server: redup + shimmer token (diam saat animasi Mati / kurangi gerakan).
        optimistic && "motion-shimmer opacity-60",
      )}
    >
      <span
        aria-hidden
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: post.pillarColor }}
      />
      <span className="grid min-w-0 flex-1">
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="tabular-nums">{time.replace(":", ".")}</span>
          <span className="type-label rounded-sm bg-muted px-1 text-foreground">
            {PLATFORM_SHORT[post.platform]}
          </span>
          {post.posted && <CircleCheck className="size-3.5 text-success" />}
        </span>
        <span className={cn("block truncate font-medium", post.posted && "text-muted-foreground")}>
          {post.title}
        </span>
      </span>
    </Link>
  );
}
