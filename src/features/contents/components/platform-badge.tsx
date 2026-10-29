import type { Platform } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const SHORT: Record<Platform, string> = { TIKTOK: "TT", INSTAGRAM: "IG" };

const STYLE: Record<Platform, string> = {
  TIKTOK: "bg-foreground text-background",
  INSTAGRAM: "bg-pink-600 text-white",
};

/** Label singkat platform (lucide tidak punya ikon merek). */
export function PlatformBadge({
  platform,
  full = false,
  className,
}: {
  platform: Platform;
  full?: boolean;
  className?: string;
}) {
  return (
    <Badge
      title={PLATFORM_LABELS[platform]}
      aria-label={PLATFORM_LABELS[platform]}
      className={cn(STYLE[platform], className)}
    >
      {full ? PLATFORM_LABELS[platform] : SHORT[platform]}
    </Badge>
  );
}
